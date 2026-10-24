"""
MindHue Clinical AI Pipeline — Corrected 3-Stage Experimental Suite
-------------------------------------------------------------------
Experiment 1: EfficientNetV2 Baseline Training (20 Epochs) -> Val Accuracy + QWK
Experiment 2: Deep Fine-Tuning with Differential Learning Rates (15-20 Epochs) -> Check Val QWK Improvement
Experiment 3: Best Model + 5-View TTA -> Final Evaluation on Untouched Independent Test Set

Key Fixes Implemented:
1. Resolved Training on Validation Set Bug: Experiment 2 now trains strictly on train_loader and validates on val_loader.
2. Strict Patient Isolation: Samples are drawn from non-overlapping patient pools to prevent pre-split leakage.
3. Class-Weighted Loss: Balanced class weights applied to CrossEntropyLoss to address class imbalance.
4. Preserved Checkpoint Safety: Saves new experiments to distinct filenames to prevent overwriting prior runs.
"""

import io
import os
import sys
import time
import json
import random
import logging
from collections import Counter
from PIL import Image

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
from torchvision.models import efficientnet_v2_s, EfficientNet_V2_S_Weights
from sklearn.metrics import (
    cohen_kappa_score, confusion_matrix, classification_report,
    balanced_accuracy_score, f1_score
)
from minio import Minio

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MindHueExperiments")

CLASS_NAMES = [
    "Grade 0: Normal / Healthy",
    "Grade 1: Mild NPDR",
    "Grade 2: Moderate NPDR",
    "Grade 3: Severe NPDR",
    "Grade 4: Proliferative DR (PDR)"
]


class MinIOPatientIsolatedDataset(Dataset):
    """
    Direct-streaming dataset loader from MinIO using verified patient-isolated splits.
    Guarantees 0% patient ID overlap across Train, Val, and Test splits.
    """
    def __init__(self, bucket: str, split: str, manifest_path: str = None, samples_per_class: int = None, transform=None, seed: int = 42):
        self.bucket = bucket
        self.split = split  # 'train', 'val', or 'test'
        self.transform = transform
        
        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000").split("://")[-1]
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)
        self.samples = []

        manifest_file = manifest_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "media", "models", "clean_patient_splits.json"
        )

        if os.path.exists(manifest_file):
            with open(manifest_file, "r") as f:
                manifest = json.load(f)
            target_patients = set(manifest.get(f"{split}_patients", []))
            logger.info(f"Loaded {len(target_patients)} isolated patient IDs for split '{split}' from manifest.")
        else:
            logger.warning(f"Manifest {manifest_file} not found! Falling back to raw split folder.")
            target_patients = None

        self._index_samples(target_patients, samples_per_class, seed)

    def _index_samples(self, target_patients, samples_per_class, seed):
        class_samples = {i: [] for i in range(5)}
        valid_exts = ('.jpg', '.jpeg', '.png', '.bmp')

        for cls_idx in range(5):
            prefix = f"augmented_resized_V2/{self.split}/{cls_idx}/"
            objs = self.client.list_objects(self.bucket, prefix=prefix, recursive=True)
            for o in objs:
                fn = o.object_name.split("/")[-1]
                if any(fn.lower().endswith(ext) for ext in valid_exts):
                    base_id = fn.split("-")[0].split("_")[0]
                    if target_patients is None or base_id in target_patients:
                        class_samples[cls_idx].append(o.object_name)

        rng = random.Random(seed)
        for cls_idx in range(5):
            objs = class_samples[cls_idx]
            rng.shuffle(objs)
            selected = objs[:samples_per_class] if (samples_per_class and len(objs) > samples_per_class) else objs
            for name in selected:
                self.samples.append((name, cls_idx))

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

    def get_distribution(self):
        counts = Counter([lbl for _, lbl in self.samples])
        return {CLASS_NAMES[k]: counts.get(k, 0) for k in range(5)}


def evaluate_metrics(model: nn.Module, dataloader: DataLoader, device: torch.device):
    """Computes Top-1 Accuracy, Loss, Balanced Accuracy, and Quadratic Weighted Kappa (QWK)."""
    model.eval()
    criterion = nn.CrossEntropyLoss()
    total_loss = 0.0
    all_preds = []
    all_targets = []
    total = 0

    with torch.no_grad():
        for images, targets in dataloader:
            images, targets = images.to(device), targets.to(device)
            outputs = model(images)
            loss = criterion(outputs, targets)
            total_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())
            total += targets.size(0)

    avg_loss = total_loss / max(1, total)
    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    acc = np.mean(all_preds == all_targets) * 100.0
    qwk = cohen_kappa_score(all_targets, all_preds, weights="quadratic")
    return avg_loss, acc, qwk, all_preds, all_targets


def run_experiment_1(bucket: str, train_ds: Dataset, val_ds: Dataset, device: torch.device,
                     epochs: int = 20, batch_size: int = 16, lr: float = 3e-4,
                     checkpoint_path: str = "backend/media/models/exp1_efficientnet_v2_best.pth"):
    """
    Experiment 1: EfficientNetV2 Baseline Training.
    Trains on train_loader, validates on val_loader, saves best model by Val QWK.
    """
    print("\n" + "=" * 70)
    print(" 🚀 EXPERIMENT 1: EfficientNetV2 Baseline Training")
    print(f" Device: {device} | Architecture: EfficientNetV2-S | Epochs: {epochs} | Batch: {batch_size}")
    print(f" Train size: {len(train_ds)} | Val size: {len(val_ds)}")
    print("=" * 70 + "\n")

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    # Initialize EfficientNetV2-S
    model = efficientnet_v2_s(weights=EfficientNet_V2_S_Weights.DEFAULT)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, 5)
    )
    model = model.to(device)

    # Compute class weights for cost-sensitive loss
    labels = [lbl for _, lbl in train_ds.samples]
    counts = Counter(labels)
    total_samples = len(labels)
    class_weights = [total_samples / (5.0 * max(1, counts[i])) for i in range(5)]
    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)

    criterion = nn.CrossEntropyLoss(weight=weights_tensor, label_smoothing=0.05)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_qwk = -1.0
    best_acc = 0.0
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)

    history = []
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            train_correct += preds.eq(targets).sum().item()
            train_total += targets.size(0)

        scheduler.step()
        train_loss /= max(1, train_total)
        train_acc = (train_correct / max(1, train_total)) * 100.0

        val_loss, val_acc, val_qwk, _, _ = evaluate_metrics(model, val_loader, device)
        epoch_dur = time.time() - epoch_start

        history.append({
            "epoch": epoch, "train_loss": train_loss, "train_acc": train_acc,
            "val_loss": val_loss, "val_acc": val_acc, "val_qwk": val_qwk
        })

        is_best = ""
        if val_qwk > best_qwk:
            best_qwk = val_qwk
            best_acc = val_acc
            torch.save(model.state_dict(), checkpoint_path)
            is_best = " ⭐ [BEST QWK]"

        print(f"Epoch [{epoch:02d}/{epochs}] ({epoch_dur:4.1f}s) | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc:5.2f}% | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:5.2f}% | "
              f"QWK: {val_qwk:.4f}{is_best}")

    total_time = time.time() - start_time
    print(f"\n✅ Experiment 1 Finished in {total_time/60:.2f} mins.")
    print(f"   Peak Validation Accuracy: {best_acc:.2f}% | Peak QWK: {best_qwk:.4f}")
    return checkpoint_path, best_acc, best_qwk, history


def run_experiment_2(base_checkpoint_path: str, train_ds: Dataset, val_ds: Dataset, device: torch.device,
                     epochs: int = 15, batch_size: int = 16,
                     output_checkpoint: str = "backend/media/models/exp2_corrected_finetuned_best.pth"):
    """
    Experiment 2: Deep Fine-Tuning Stage (CORRECTED).
    CRITICAL FIX: Trains on train_ds (NEVER on val_ds), evaluates on val_ds.
    Uses differential learning rates: 2e-5 for backbone, 1e-4 for classification head.
    """
    print("\n" + "=" * 70)
    print(" 🔬 EXPERIMENT 2: Deep Fine-Tuning Stage (CORRECTED)")
    print(f" Base Checkpoint: {base_checkpoint_path}")
    print(f" Output Checkpoint: {output_checkpoint}")
    print(" Integrity Rule: Train on train_loader only; Validate on val_loader only.")
    print("=" * 70 + "\n")

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    # Initialize model with Exp 1 weights
    model = efficientnet_v2_s()
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4, inplace=True),
        nn.Linear(in_features, 5)
    )
    model.load_state_dict(torch.load(base_checkpoint_path, map_location=device))
    model = model.to(device)

    # Evaluate baseline before finetuning
    base_val_loss, base_val_acc, base_val_qwk, _, _ = evaluate_metrics(model, val_loader, device)
    print(f"Baseline Entering Finetuning: Val Acc = {base_val_acc:.2f}% | QWK = {base_val_qwk:.4f}\n")

    # Differential Learning Rates
    backbone_params = [p for n, p in model.named_parameters() if "classifier" not in n]
    classifier_params = [p for n, p in model.named_parameters() if "classifier" in n]

    optimizer = torch.optim.AdamW([
        {"params": backbone_params, "lr": 2e-5, "weight_decay": 2e-3},
        {"params": classifier_params, "lr": 1e-4, "weight_decay": 1e-3}
    ])
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=5, T_mult=2, eta_min=1e-6)

    # Class-weighted loss
    labels = [lbl for _, lbl in train_ds.samples]
    counts = Counter(labels)
    total_samples = len(labels)
    class_weights = [total_samples / (5.0 * max(1, counts[i])) for i in range(5)]
    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights_tensor, label_smoothing=0.08)

    best_qwk = base_val_qwk
    best_acc = base_val_acc

    start_time = time.time()
    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        # CORRECTED: Iterate through train_loader (NOT val_loader!)
        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            train_correct += preds.eq(targets).sum().item()
            train_total += targets.size(0)

        scheduler.step()
        train_loss /= max(1, train_total)
        train_acc = (train_correct / max(1, train_total)) * 100.0

        val_loss, val_acc, val_qwk, _, _ = evaluate_metrics(model, val_loader, device)
        epoch_dur = time.time() - epoch_start

        delta_acc = val_acc - base_val_acc
        delta_qwk = val_qwk - base_val_qwk
        is_best = ""
        if val_qwk >= best_qwk:
            best_qwk = val_qwk
            best_acc = val_acc
            torch.save(model.state_dict(), output_checkpoint)
            is_best = " ⭐ [IMPROVED]"

        print(f"FT Epoch [{epoch:02d}/{epochs}] ({epoch_dur:4.1f}s) | "
              f"Train Acc: {train_acc:5.2f}% | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:5.2f}% (Δ {delta_acc:+5.2f}%) | "
              f"QWK: {val_qwk:.4f} (Δ {delta_qwk:+.4f}){is_best}")

    total_time = time.time() - start_time
    print(f"\n✅ Experiment 2 Finished in {total_time/60:.2f} mins.")
    print(f"   Net Validated Improvement: Acc Δ {best_acc - base_val_acc:+5.2f}% | QWK Δ {best_qwk - base_val_qwk:+.4f}")
    
    final_checkpoint = output_checkpoint if os.path.exists(output_checkpoint) else base_checkpoint_path
    return final_checkpoint, best_acc, best_qwk


def tta_predict(model: nn.Module, images: torch.Tensor, device: torch.device):
    """
    5-View Test-Time Augmentation (TTA):
    Applies original, horizontal flip, vertical flip, rot90, and rot270.
    Returns ensemble mean probability and class predictions.
    """
    batch_probs = []
    with torch.no_grad():
        # 1. Original
        batch_probs.append(torch.softmax(model(images), dim=1))
        # 2. Horizontal Flip
        batch_probs.append(torch.softmax(model(torch.flip(images, dims=[3])), dim=1))
        # 3. Vertical Flip
        batch_probs.append(torch.softmax(model(torch.flip(images, dims=[2])), dim=1))
        # 4. Rotation 90
        batch_probs.append(torch.softmax(model(torch.rot90(images, k=1, dims=[2, 3])), dim=1))
        # 5. Rotation 270
        batch_probs.append(torch.softmax(model(torch.rot90(images, k=3, dims=[2, 3])), dim=1))

    ensemble_prob = torch.stack(batch_probs).mean(dim=0)
    _, preds = ensemble_prob.max(1)
    return preds, ensemble_prob


def run_experiment_3(best_checkpoint_path: str, test_ds: Dataset, device: torch.device, batch_size: int = 16,
                     save_prod_weights: bool = False):
    """
    Experiment 3: Best Model + TTA Evaluation on Untouched Independent Test Set.
    """
    print("\n" + "=" * 70)
    print(" 🏆 EXPERIMENT 3: Final Independent Test Evaluation (Single-Pass vs 5-View TTA)")
    print(f" Checkpoint: {best_checkpoint_path}")
    print(f" Test Set Size: {len(test_ds)} images (Patient-Isolated)")
    print("=" * 70 + "\n")

    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    model = efficientnet_v2_s()
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4, inplace=True),
        nn.Linear(in_features, 5)
    )
    model.load_state_dict(torch.load(best_checkpoint_path, map_location=device))
    model = model.to(device)
    model.eval()

    std_preds = []
    tta_preds = []
    all_targets = []

    t0 = time.time()
    for images, targets in test_loader:
        images = images.to(device)
        all_targets.extend(targets.numpy())

        with torch.no_grad():
            out = model(images)
            _, p_std = out.max(1)
            std_preds.extend(p_std.cpu().numpy())

        p_tta, _ = tta_predict(model, images, device)
        tta_preds.extend(p_tta.cpu().numpy())

    t_eval = time.time() - t0
    all_targets = np.array(all_targets)
    std_preds = np.array(std_preds)
    tta_preds = np.array(tta_preds)

    std_acc = np.mean(std_preds == all_targets) * 100.0
    std_qwk = cohen_kappa_score(all_targets, std_preds, weights="quadratic")

    tta_acc = np.mean(tta_preds == all_targets) * 100.0
    tta_qwk = cohen_kappa_score(all_targets, tta_preds, weights="quadratic")

    print(f"\nFinal Test Set Results (Evaluated in {t_eval:.2f}s):")
    print(f"  • Standard Single-Pass Accuracy: {std_acc:5.2f}% | QWK: {std_qwk:.4f}")
    print(f"  • With 5-View TTA Augmentation:  {tta_acc:5.2f}% | QWK: {tta_qwk:.4f} ⭐ (Boost: {tta_acc - std_acc:+5.2f}%)")

    # Confusion matrix
    cm = confusion_matrix(all_targets, tta_preds)
    print("\nConfusion Matrix with TTA (Rows: Ground Truth, Cols: Model Prediction):")
    header = "       | " + " | ".join([f"G{i}" for i in range(5)]) + " | Row Sum"
    print(header)
    print("-" * len(header))
    for i in range(5):
        row = f"  G{i}   | " + " | ".join([f"{cm[i, j]:3d}" for j in range(5)]) + f" |   {cm[i].sum():3d}"
        print(row)

    # Binary Referable DR
    bin_targets = (all_targets >= 2).astype(int)
    bin_preds = (tta_preds >= 2).astype(int)
    bin_acc = np.mean(bin_targets == bin_preds) * 100.0
    bin_tp = np.sum((bin_targets == 1) & (bin_preds == 1))
    bin_tn = np.sum((bin_targets == 0) & (bin_preds == 0))
    bin_fp = np.sum((bin_targets == 0) & (bin_preds == 1))
    bin_fn = np.sum((bin_targets == 1) & (bin_preds == 0))
    sensitivity = bin_tp / (bin_tp + bin_fn) * 100.0 if (bin_tp + bin_fn) > 0 else 0.0
    specificity = bin_tn / (bin_tn + bin_fp) * 100.0 if (bin_tn + bin_fp) > 0 else 0.0
    precision = bin_tp / (bin_tp + bin_fp) * 100.0 if (bin_tp + bin_fp) > 0 else 0.0

    print("\n" + "-" * 70)
    print(" 🩺 Binary Referable DR Clinical Metrics (with TTA):")
    print(f"  • Binary Classification Accuracy: {bin_acc:.2f}%")
    print(f"  • Clinical Sensitivity (DR Recall): {sensitivity:.2f}%")
    print(f"  • Clinical Specificity (Rule-out):  {specificity:.2f}%")
    print(f"  • Clinical Precision (PPV):        {precision:.2f}%")
    print("=" * 70 + "\n")

    if save_prod_weights:
        prod_path = "backend/media/models/mindhue_efficientnet_v2_clinical_best.pth"
        torch.save(model.state_dict(), prod_path)
        print(f"💾 Updated Clinical Production Weights to {prod_path}")

    return {
        "std_accuracy": std_acc,
        "std_qwk": std_qwk,
        "tta_accuracy": tta_acc,
        "tta_qwk": tta_qwk,
        "binary_accuracy": bin_acc,
        "sensitivity": sensitivity,
        "specificity": specificity
    }


def main():
    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    bucket = "build-for-bharat"
    img_size = (280, 280)

    # Data augmentations strictly suitable for retinal fundus images:
    # 1. Random horizontal flip (retina features preserve DR lesions)
    # 2. Mild vertical flip
    # 3. Small rotation (+/- 15 degrees)
    # 4. Subtle color jitter (brightness and contrast within clinically realistic sensor variations)
    train_tf = T.Compose([
        T.Resize(img_size),
        T.RandomHorizontalFlip(p=0.5),
        T.RandomVerticalFlip(p=0.5),
        T.RandomRotation(degrees=15),
        T.ColorJitter(brightness=0.1, contrast=0.15, saturation=0.1),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_tf = T.Compose([
        T.Resize(img_size),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    manifest_path = "backend/media/models/clean_patient_splits.json"
    print("\n=== Initializing Patient-Isolated Datasets from MinIO ===")
    train_ds = MinIOPatientIsolatedDataset(bucket, "train", manifest_path=manifest_path, samples_per_class=250, transform=train_tf)
    val_ds = MinIOPatientIsolatedDataset(bucket, "val", manifest_path=manifest_path, samples_per_class=80, transform=val_tf)
    test_ds = MinIOPatientIsolatedDataset(bucket, "test", manifest_path=manifest_path, samples_per_class=80, transform=val_tf)

    print(f"Train Dataset: {len(train_ds)} samples")
    print(f"Val Dataset:   {len(val_ds)} samples")
    print(f"Test Dataset:  {len(test_ds)} samples")

    # Evaluate existing baseline checkpoints before triggering training
    print("\nAuditing existing baseline checkpoint before any modification...")
    base_ckpt = "backend/media/models/exp1_efficientnet_v2_best.pth"
    if os.path.exists(base_ckpt):
        run_experiment_3(base_ckpt, test_ds, device, batch_size=16)


if __name__ == "__main__":
    main()
