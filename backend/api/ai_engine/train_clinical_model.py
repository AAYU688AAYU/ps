"""
MindHue Advanced Clinical Training Pipeline
-------------------------------------------
Implements the 6 clinical accuracy upgrades:
1. Patient-Isolated Manifest Streaming (zero cross-split leakage).
2. Scaled dataset support (500 to 2,500+ samples per class).
3. Higher resolution input (448x448 or 512x512) to capture microaneurysms.
4. Ben Graham color & illumination normalization.
5. Multi-Task Architecture: Joint 5-Class Severity + Binary Referable DR heads.
6. Ordinal Severity Penalty (Quadratic distance penalty) + Binary BCE loss.
"""

import io
import os
import sys
import time
import json
import argparse
import logging
from collections import Counter
from PIL import Image

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
from torchvision.models import efficientnet_v2_s, EfficientNet_V2_S_Weights
from sklearn.metrics import (
    cohen_kappa_score, confusion_matrix, classification_report,
    balanced_accuracy_score, f1_score
)
from minio import Minio

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MindHueClinicalTrain")

CLASS_NAMES = [
    "Grade 0: Normal / Healthy",
    "Grade 1: Mild NPDR",
    "Grade 2: Moderate NPDR",
    "Grade 3: Severe NPDR",
    "Grade 4: Proliferative DR (PDR)"
]


def ben_graham_enhancement(img_pil: Image.Image, sigma: float = 10.0) -> Image.Image:
    """
    Applies Ben Graham's illumination normalization to eliminate camera sensor and lighting bias.
    Subtracts local average color and rescales contrast.
    """
    img_np = np.array(img_pil)
    blurred = cv2.GaussianBlur(img_np, (0, 0), sigma)
    enhanced = cv2.addWeighted(img_np, 4.0, blurred, -4.0, 128)
    return Image.fromarray(enhanced)


class MindHueMultiTaskEfficientNetV2(nn.Module):
    """
    Dual-head clinical deep learning architecture:
    - Backbone: EfficientNetV2-S (ImageNet-pretrained)
    - Head A: 5-Class Softmax for exact ICDR severity grading
    - Head B: Binary Logit for Referable DR triage (Grade >= 2)
    """
    def __init__(self, pretrained: bool = True, dropout: float = 0.3):
        super().__init__()
        weights = EfficientNet_V2_S_Weights.DEFAULT if pretrained else None
        base = efficientnet_v2_s(weights=weights)
        self.features = base.features
        self.avgpool = base.avgpool
        in_features = base.classifier[1].in_features  # 1280

        # Head 1: 5-Class ICDR Severity
        self.head_5class = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(in_features, 5)
        )
        # Head 2: Binary Referable DR Gatekeeper
        self.head_binary = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(in_features, 1)
        )

    def forward(self, x: torch.Tensor):
        feat = self.features(x)
        feat = self.avgpool(feat)
        feat = torch.flatten(feat, 1)
        logits_5class = self.head_5class(feat)
        logits_binary = self.head_binary(feat)
        return logits_5class, logits_binary


class MultiTaskOrdinalLoss(nn.Module):
    """
    Compound clinical loss function:
    1. Cross-Entropy on 5-class predictions with label smoothing.
    2. Expected-Value Ordinal Penalty: Penalizes square distance (E[y_pred] - y_true)^2 to maximize QWK.
    3. Binary BCE on Referable DR classification.
    """
    def __init__(self, class_weights: torch.Tensor = None, ordinal_weight: float = 0.6,
                 binary_weight: float = 1.0, label_smoothing: float = 0.05):
        super().__init__()
        self.ce = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=label_smoothing)
        self.bce = nn.BCEWithLogitsLoss()
        self.ordinal_weight = ordinal_weight
        self.binary_weight = binary_weight
        self.register_buffer("grade_values", torch.tensor([0.0, 1.0, 2.0, 3.0, 4.0]))

    def forward(self, logits_5class: torch.Tensor, logits_binary: torch.Tensor, targets: torch.Tensor):
        ce_loss = self.ce(logits_5class, targets)

        # Expected grade: sum(P_k * k)
        probs = F.softmax(logits_5class, dim=1)
        expected_grades = torch.sum(probs * self.grade_values.to(logits_5class.device), dim=1)
        ordinal_loss = F.mse_loss(expected_grades, targets.float())

        # Binary targets: 1 if target >= 2 else 0
        binary_targets = (targets >= 2).float().unsqueeze(1)
        binary_loss = self.bce(logits_binary, binary_targets)

        total_loss = ce_loss + self.ordinal_weight * ordinal_loss + self.binary_weight * binary_loss
        return total_loss, ce_loss, ordinal_loss, binary_loss


class MinIOPatientDataset(Dataset):
    """
    Streams patient-isolated retinal fundus images directly from MinIO.
    """
    def __init__(self, bucket: str, split: str, manifest_path: str, samples_per_class: int = None,
                 transform=None, use_ben_graham: bool = True, seed: int = 42):
        self.bucket = bucket
        self.split = split
        self.transform = transform
        self.use_ben_graham = use_ben_graham

        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000").split("://")[-1]
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)

        with open(manifest_path, "r") as f:
            manifest = json.load(f)

        target_patients = set(manifest[f"{split}_patients"])
        self.samples = []
        class_samples = {i: [] for i in range(5)}

        for cls_idx in range(5):
            prefix = f"augmented_resized_V2/{split}/{cls_idx}/"
            objs = self.client.list_objects(bucket, prefix=prefix, recursive=True)
            for o in objs:
                fn = o.object_name.split("/")[-1]
                if any(fn.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png')):
                    base_id = fn.split("-")[0].split("_")[0]
                    if base_id in target_patients:
                        class_samples[cls_idx].append(o.object_name)

        rng = np.random.RandomState(seed)
        for cls_idx in range(5):
            pool = class_samples[cls_idx]
            rng.shuffle(pool)
            selected = pool[:samples_per_class] if (samples_per_class and len(pool) > samples_per_class) else pool
            for name in selected:
                self.samples.append((name, cls_idx))

        rng.shuffle(self.samples)
        logger.info(f"Loaded {len(self.samples)} patient-isolated images for '{split}' (Target/class: {samples_per_class}).")

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

        if self.use_ben_graham:
            img = ben_graham_enhancement(img)

        if self.transform:
            img = self.transform(img)

        return img, label


def evaluate_multitask(model: nn.Module, dataloader: DataLoader, device: torch.device):
    """Evaluates multi-task model on both 5-class severity and binary referable DR."""
    model.eval()
    all_targets = []
    preds_5class = []
    preds_binary = []

    with torch.no_grad():
        for images, targets in dataloader:
            images = images.to(device)
            all_targets.extend(targets.numpy())

            l5, lb = model(images)
            _, p5 = l5.max(1)
            p_bin = (torch.sigmoid(lb) >= 0.5).squeeze(1).long()

            preds_5class.extend(p5.cpu().numpy())
            preds_binary.extend(p_bin.cpu().numpy())

    all_targets = np.array(all_targets)
    preds_5class = np.array(preds_5class)
    preds_binary = np.array(preds_binary)

    acc_5class = np.mean(preds_5class == all_targets) * 100.0
    qwk = cohen_kappa_score(all_targets, preds_5class, weights="quadratic")

    # Binary metrics
    bin_targets = (all_targets >= 2).astype(int)
    bin_acc = np.mean(preds_binary == bin_targets) * 100.0

    tp = np.sum((bin_targets == 1) & (preds_binary == 1))
    tn = np.sum((bin_targets == 0) & (preds_binary == 0))
    fp = np.sum((bin_targets == 0) & (preds_binary == 1))
    fn = np.sum((bin_targets == 1) & (preds_binary == 0))

    sensitivity = tp / (tp + fn) * 100.0 if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) * 100.0 if (tn + fp) > 0 else 0.0

    return acc_5class, qwk, bin_acc, sensitivity, specificity


def train_clinical_model(args):
    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    print("\n" + "=" * 76)
    print(" 🏥 MINDHUE ADVANCED CLINICAL TRAINING PIPELINE")
    print(f" Device: {device} | Image Resolution: {args.img_size}x{args.img_size} | Ben Graham: {args.ben_graham}")
    print(f" Architecture: MindHueMultiTaskEfficientNetV2 | Epochs: {args.epochs}")
    print(f" Train Samples/Class: {args.train_samples} | Val Samples/Class: {args.val_samples}")
    print("=" * 76 + "\n")

    # Augmentations designed specifically for retinal fundus images
    train_tf = T.Compose([
        T.Resize((args.img_size, args.img_size)),
        T.RandomHorizontalFlip(p=0.5),
        T.RandomVerticalFlip(p=0.5),
        T.RandomRotation(degrees=15),
        T.ColorJitter(brightness=0.1, contrast=0.15, saturation=0.1),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_tf = T.Compose([
        T.Resize((args.img_size, args.img_size)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    manifest_path = args.manifest
    train_ds = MinIOPatientDataset(
        args.bucket, "train", manifest_path, samples_per_class=args.train_samples,
        transform=train_tf, use_ben_graham=args.ben_graham
    )
    val_ds = MinIOPatientDataset(
        args.bucket, "val", manifest_path, samples_per_class=args.val_samples,
        transform=val_tf, use_ben_graham=args.ben_graham
    )

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    # Multi-Task Model
    model = MindHueMultiTaskEfficientNetV2(pretrained=True, dropout=0.3).to(device)

    # Class Weights for 5-Class Head
    labels = [lbl for _, lbl in train_ds.samples]
    counts = Counter(labels)
    total_samples = len(labels)
    class_weights = [total_samples / (5.0 * max(1, counts[i])) for i in range(5)]
    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)

    loss_fn = MultiTaskOrdinalLoss(class_weights=weights_tensor, ordinal_weight=0.6, binary_weight=1.0).to(device)

    # Differential Learning Rates
    backbone_params = [p for n, p in model.named_parameters() if "head" not in n]
    head_params = [p for n, p in model.named_parameters() if "head" in n]

    optimizer = torch.optim.AdamW([
        {"params": backbone_params, "lr": args.lr_backbone, "weight_decay": 1e-3},
        {"params": head_params, "lr": args.lr_head, "weight_decay": 5e-4}
    ])
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    best_val_score = -1.0
    best_epoch_metrics = {}
    os.makedirs(os.path.dirname(args.checkpoint_out), exist_ok=True)

    start_train_time = time.time()
    for epoch in range(1, args.epochs + 1):
        epoch_start = time.time()
        model.train()
        total_loss_accum = 0.0
        n_batches = 0
        total_batches = len(train_loader)
        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()

            logits_5, logits_bin = model(images)
            tot_loss, ce_l, ord_l, bin_l = loss_fn(logits_5, logits_bin, targets)

            tot_loss.backward()
            optimizer.step()

            total_loss_accum += tot_loss.item()
            n_batches += 1

            if n_batches % 100 == 0 or n_batches == total_batches:
                print(f"  [Epoch {epoch:02d} | Batch {n_batches:04d}/{total_batches:04d}] Loss: {total_loss_accum/n_batches:.4f} (CE: {ce_l:.3f}, Ord: {ord_l:.3f}, Bin: {bin_l:.3f})", flush=True)

        scheduler.step()
        avg_train_loss = total_loss_accum / max(1, n_batches)

        # Validation
        val_acc5, val_qwk, val_bin_acc, val_sens, val_spec = evaluate_multitask(model, val_loader, device)
        epoch_dur = time.time() - epoch_start

        # Composite Clinical Score: Balanced QWK + Binary Sensitivity
        clinical_score = 0.5 * val_qwk + 0.5 * (val_sens / 100.0)

        is_best = ""
        if clinical_score > best_val_score:
            best_val_score = clinical_score
            best_epoch_metrics = {
                "epoch": epoch, "val_acc5": val_acc5, "val_qwk": val_qwk,
                "val_bin_acc": val_bin_acc, "val_sens": val_sens, "val_spec": val_spec
            }
            torch.save(model.state_dict(), args.checkpoint_out)
            is_best = " ⭐ [BEST CLINICAL MODEL]"

        print(f"Epoch [{epoch:02d}/{args.epochs}] ({epoch_dur:4.1f}s) | "
              f"Train Loss: {avg_train_loss:.4f} | "
              f"Val 5-Class: {val_acc5:5.2f}% (QWK: {val_qwk:.4f}) | "
              f"Referable DR Acc: {val_bin_acc:5.2f}% (Sens: {val_sens:5.1f}%, Spec: {val_spec:5.1f}%){is_best}")

    train_total_min = (time.time() - start_train_time) / 60.0
    print("\n" + "=" * 76)
    print(f"✅ Training Finished in {train_total_min:.2f} mins.")
    print(f"   Best Val Epoch: {best_epoch_metrics.get('epoch')}")
    print(f"   Peak Val 5-Class Acc: {best_epoch_metrics.get('val_acc5', 0):.2f}% | Peak QWK: {best_epoch_metrics.get('val_qwk', 0):.4f}")
    print(f"   Peak Referable DR Acc: {best_epoch_metrics.get('val_bin_acc', 0):.2f}% | Sensitivity: {best_epoch_metrics.get('val_sens', 0):.1f}%")
    print(f"   Best Weights Saved: {args.checkpoint_out}")
    print("=" * 76 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MindHue Advanced Clinical Retinal Training")
    parser.add_argument("--bucket", type=str, default="build-for-bharat")
    parser.add_argument("--manifest", type=str, default="backend/media/models/clean_patient_splits.json")
    parser.add_argument("--img-size", type=int, default=448, help="Input resolution (448 or 512)")
    parser.add_argument("--train-samples", type=int, default=1000, help="Samples per class for training")
    parser.add_argument("--val-samples", type=int, default=150, help="Samples per class for validation")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size (8 or 16)")
    parser.add_argument("--lr-backbone", type=float, default=2e-5, help="Backbone learning rate")
    parser.add_argument("--lr-head", type=float, default=1.5e-4, help="Classifier heads learning rate")
    parser.add_argument("--ben-graham", action="store_true", default=True, help="Apply Ben Graham illumination normalization")
    parser.add_argument("--checkpoint-out", type=str, default="backend/media/models/mindhue_multitask_clinical_best.pth",
                        help="Path to save best multi-task clinical checkpoint")
    args = parser.parse_args()

    train_clinical_model(args)
