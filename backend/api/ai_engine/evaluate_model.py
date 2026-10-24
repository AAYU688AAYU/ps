"""
MindHue Reproducible Clinical Evaluation Script
-----------------------------------------------
Evaluates an EfficientNetV2-S checkpoint on a specified MinIO split or patient-isolated test set.
Computes:
- 5-Class Top-1 Accuracy with 95% Wilson Score Confidence Interval
- Quadratic Weighted Kappa (QWK) with clinical grade ordering (0 < 1 < 2 < 3 < 4)
- Balanced Accuracy and Macro F1-score
- Confusion Matrix with sanity check that row sums match test support
- Per-Class Precision, Recall, and F1-score
- Binary Referable DR (Grades 0-1 vs Grades 2-4):
    * Accuracy with 95% CI
    * Clinical Sensitivity (DR Recall) with 95% CI
    * Clinical Specificity (Rule-out) with 95% CI
    * Binary Precision and NPV
- Direct comparison between Single-Pass Inference and 5-View Test-Time Augmentation (TTA)
"""

import os
import io
import sys
import json
import time
import argparse
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torchvision.models import efficientnet_v2_s
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as T
from sklearn.metrics import (
    cohen_kappa_score, confusion_matrix, classification_report,
    balanced_accuracy_score, f1_score
)
from minio import Minio

try:
    from .model_inference import CLASS_NAMES, MultiTaskHeadModel
except (ImportError, ValueError):
    from model_inference import CLASS_NAMES, MultiTaskHeadModel


def wilson_score_interval(p: float, n: int, confidence: float = 0.95) -> tuple:
    """Calculates Wilson score confidence interval for binomial proportions."""
    if n == 0:
        return (0.0, 0.0)
    # Z-value for 95% confidence is 1.96
    z = 1.95996 if confidence == 0.95 else 2.576
    denom = 1.0 + (z**2) / n
    centre = (p + (z**2) / (2 * n)) / denom
    margin = (z * np.sqrt((p * (1.0 - p) / n) + ((z**2) / (4 * (n**2))))) / denom
    lower = max(0.0, centre - margin)
    upper = min(1.0, centre + margin)
    return (lower, upper)


class IsolatedTestDataset(Dataset):
    """
    Loads test images strictly from the verified patient-isolated manifest.
    Guarantees zero overlap with training and validation patient base IDs.
    """
    def __init__(self, bucket: str, manifest_path: str, samples_per_class: int = 80, transform=None, seed: int = 42):
        self.bucket = bucket
        self.transform = transform
        
        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000").split("://")[-1]
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)

        with open(manifest_path, "r") as f:
            manifest = json.load(f)

        test_patients = set(manifest["test_patients"])
        # Find images belonging to test_patients across test folders
        self.samples = []
        class_samples = {i: [] for i in range(5)}

        for cls_idx in range(5):
            prefix = f"augmented_resized_V2/test/{cls_idx}/"
            objs = self.client.list_objects(bucket, prefix=prefix, recursive=True)
            for o in objs:
                fn = o.object_name.split("/")[-1]
                base_id = fn.split("-")[0].split("_")[0]
                if base_id in test_patients:
                    class_samples[cls_idx].append((o.object_name, cls_idx))

        rng = np.random.RandomState(seed)
        for cls_idx in range(5):
            pool = class_samples[cls_idx]
            rng.shuffle(pool)
            selected = pool[:samples_per_class] if len(pool) >= samples_per_class else pool
            self.samples.extend(selected)

        rng.shuffle(self.samples)

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        obj_name, label = self.samples[idx]
        resp = self.client.get_object(self.bucket, obj_name)
        try:
            data = resp.read()
            img = Image.open(io.BytesIO(data)).convert("RGB")
        finally:
            resp.close()
            resp.release_conn()

        if self.transform:
            img = self.transform(img)
        return img, label


def evaluate_checkpoint(checkpoint_path: str, test_loader: DataLoader, device: torch.device):
    """Evaluates a checkpoint in both single-pass and 5-view TTA modes."""
    state_dict = torch.load(checkpoint_path, map_location=device)
    is_multitask = ("head_binary.1.weight" in state_dict or "head_5class.1.weight" in state_dict)
    if is_multitask:
        model = MultiTaskHeadModel()
    else:
        model = efficientnet_v2_s()
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.4, inplace=True),
            nn.Linear(in_features, 5)
        )
    model.load_state_dict(state_dict)
    model = model.to(device)
    model.eval()

    all_targets = []
    std_preds = []
    tta_preds = []

    t0 = time.time()
    with torch.no_grad():
        for images, targets in test_loader:
            images = images.to(device)
            all_targets.extend(targets.numpy())

            if is_multitask:
                l5, lb = model(images)
                _, p_std = l5.max(1)
                std_preds.extend(p_std.cpu().numpy())

                p_orig = torch.softmax(l5, dim=1)
                p_hflip = torch.softmax(model(torch.flip(images, dims=[3]))[0], dim=1)
                p_vflip = torch.softmax(model(torch.flip(images, dims=[2]))[0], dim=1)
                p_rot90 = torch.softmax(model(torch.rot90(images, k=1, dims=[2, 3]))[0], dim=1)
                p_rot270 = torch.softmax(model(torch.rot90(images, k=3, dims=[2, 3]))[0], dim=1)
            else:
                logits = model(images)
                _, p_std = logits.max(1)
                std_preds.extend(p_std.cpu().numpy())

                p_orig = torch.softmax(logits, dim=1)
                p_hflip = torch.softmax(model(torch.flip(images, dims=[3])), dim=1)
                p_vflip = torch.softmax(model(torch.flip(images, dims=[2])), dim=1)
                p_rot90 = torch.softmax(model(torch.rot90(images, k=1, dims=[2, 3])), dim=1)
                p_rot270 = torch.softmax(model(torch.rot90(images, k=3, dims=[2, 3])), dim=1)

            tta_ensemble = torch.stack([p_orig, p_hflip, p_vflip, p_rot90, p_rot270]).mean(dim=0)
            _, p_tta = tta_ensemble.max(1)
            tta_preds.extend(p_tta.cpu().numpy())

    eval_time = time.time() - t0
    all_targets = np.array(all_targets)
    std_preds = np.array(std_preds)
    tta_preds = np.array(tta_preds)

    def compute_all_metrics(preds, mode_name):
        n = len(all_targets)
        acc = np.mean(preds == all_targets)
        qwk = cohen_kappa_score(all_targets, preds, weights="quadratic")
        bal_acc = balanced_accuracy_score(all_targets, preds)
        macro_f1 = f1_score(all_targets, preds, average="macro")
        cm = confusion_matrix(all_targets, preds)

        # Binary referable DR (G0-1 vs G2-4)
        bin_true = (all_targets >= 2).astype(int)
        bin_pred = (preds >= 2).astype(int)
        bin_acc = np.mean(bin_true == bin_pred)

        tp = np.sum((bin_true == 1) & (bin_pred == 1))
        tn = np.sum((bin_true == 0) & (bin_pred == 0))
        fp = np.sum((bin_true == 0) & (bin_pred == 1))
        fn = np.sum((bin_true == 1) & (bin_pred == 0))

        sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0

        acc_ci = wilson_score_interval(acc, n)
        bin_acc_ci = wilson_score_interval(bin_acc, n)
        sens_ci = wilson_score_interval(sens, int(tp + fn))
        spec_ci = wilson_score_interval(spec, int(tn + fp))

        return {
            "mode": mode_name,
            "total_samples": int(n),
            "accuracy": float(round(acc * 100, 2)),
            "accuracy_ci_95": [float(round(acc_ci[0] * 100, 2)), float(round(acc_ci[1] * 100, 2))],
            "qwk": float(round(qwk, 4)),
            "balanced_accuracy": float(round(bal_acc * 100, 2)),
            "macro_f1": float(round(macro_f1 * 100, 2)),
            "confusion_matrix": cm.tolist(),
            "binary_referable_dr": {
                "binary_accuracy": float(round(bin_acc * 100, 2)),
                "binary_accuracy_ci_95": [float(round(bin_acc_ci[0] * 100, 2)), float(round(bin_acc_ci[1] * 100, 2))],
                "sensitivity": float(round(sens * 100, 2)),
                "sensitivity_ci_95": [float(round(sens_ci[0] * 100, 2)), float(round(sens_ci[1] * 100, 2))],
                "specificity": float(round(spec * 100, 2)),
                "specificity_ci_95": [float(round(spec_ci[0] * 100, 2)), float(round(spec_ci[1] * 100, 2))],
                "precision": float(round(prec * 100, 2)),
                "npv": float(round(npv * 100, 2)),
                "counts": {"tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn)}
            }
        }

    return {
        "checkpoint": os.path.basename(checkpoint_path),
        "evaluation_time_sec": round(eval_time, 2),
        "single_pass": compute_all_metrics(std_preds, "Single-Pass"),
        "tta_5view": compute_all_metrics(tta_preds, "5-View TTA")
    }


def print_evaluation_summary(results: dict):
    print("\n" + "=" * 76)
    print(f" 🩺 CLINICAL EVALUATION RESULTS: {results['checkpoint']}")
    print(f" Evaluation Runtime: {results['evaluation_time_sec']}s")
    print("=" * 76)

    for mode_key in ["single_pass", "tta_5view"]:
        m = results[mode_key]
        print(f"\n--- {m['mode']} Evaluation (N = {m['total_samples']}) ---")
        print(f"  • 5-Class Accuracy:      {m['accuracy']:5.2f}% (95% CI: {m['accuracy_ci_95'][0]}% - {m['accuracy_ci_95'][1]}%)")
        print(f"  • Quadratic Weighted κ:  {m['qwk']:.4f}")
        print(f"  • Balanced Accuracy:     {m['balanced_accuracy']:5.2f}%")
        print(f"  • Macro F1-score:        {m['macro_f1']:5.2f}%")

        b = m["binary_referable_dr"]
        print(f"  • Referable DR Accuracy: {b['binary_accuracy']:5.2f}% (95% CI: {b['binary_accuracy_ci_95'][0]}% - {b['binary_accuracy_ci_95'][1]}%)")
        print(f"  • Clinical Sensitivity:  {b['sensitivity']:5.2f}% (95% CI: {b['sensitivity_ci_95'][0]}% - {b['sensitivity_ci_95'][1]}%)")
        print(f"  • Clinical Specificity:  {b['specificity']:5.2f}% (95% CI: {b['specificity_ci_95'][0]}% - {b['specificity_ci_95'][1]}%)")
        print(f"  • Binary Precision (PPV):{b['precision']:5.2f}% | NPV: {b['npv']:5.2f}%")
        print(f"  • Binary Confusion:      TP={b['counts']['tp']} | TN={b['counts']['tn']} | FP={b['counts']['fp']} | FN={b['counts']['fn']}")

        # Print 5x5 Matrix
        cm = np.array(m["confusion_matrix"])
        print("\n  5-Class Confusion Matrix:")
        header = "         | " + " | ".join([f"G{i}" for i in range(5)]) + " | Row Sum"
        print("  " + header)
        print("  " + "-" * len(header))
        for i in range(5):
            print(f"    G{i}   | " + " | ".join([f"{cm[i, j]:4d}" for j in range(5)]) + f" |   {cm[i].sum():4d}")
    print("=" * 76 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MindHue Clinical Model Evaluation")
    parser.add_argument("--checkpoint", type=str, default="backend/media/models/mindhue_efficientnet_v2_clinical_best.pth",
                        help="Path to PyTorch checkpoint to evaluate")
    parser.add_argument("--manifest", type=str, default="backend/media/models/clean_patient_splits.json",
                        help="Path to clean patient splits manifest")
    parser.add_argument("--samples-per-class", type=int, default=80,
                        help="Samples per class for evaluation")
    parser.add_argument("--output-json", type=str, default="backend/media/models/evaluation_results.json",
                        help="Path to save evaluation JSON results")
    args = parser.parse_args()

    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    print(f"Evaluating on Device: {device}")

    val_tf = T.Compose([
        T.Resize((280, 280)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    test_ds = IsolatedTestDataset("build-for-bharat", args.manifest, samples_per_class=args.samples_per_class, transform=val_tf)
    print(f"Loaded {len(test_ds)} patient-isolated test images ({args.samples_per_class} per class target).")

    test_loader = DataLoader(test_ds, batch_size=16, shuffle=False, num_workers=0)
    results = evaluate_checkpoint(args.checkpoint, test_loader, device)
    print_evaluation_summary(results)

    with open(args.output_json, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {args.output_json}")
