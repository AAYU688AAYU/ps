"""
EfficientNet-B4 Clinical Training Hub for Retinal Diabetic Retinopathy.
Trains an EfficientNet-B4 vision backbone on 'build-for-bharat/augmented_resized_V2'
directly streamed from MinIO object storage.
"""

import io
import os
import sys
import time
import random
import logging
from collections import Counter
from PIL import Image

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
from torchvision.models import efficientnet_b4, EfficientNet_B4_Weights
from minio import Minio

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TrainB4")

CLASS_NAMES = [
    "Grade 0: Normal / No DR",
    "Grade 1: Mild NPDR",
    "Grade 2: Moderate NPDR",
    "Grade 3: Severe NPDR",
    "Grade 4: Proliferative DR (PDR)"
]


class MinIOStratifiedDataset(Dataset):
    """
    Direct-streaming dataset loader from MinIO bucket with balanced stratified sampling.
    """
    def __init__(self, bucket, prefix, samples_per_class=None, transform=None, seed=42):
        self.bucket = bucket
        self.prefix = prefix
        self.transform = transform
        
        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        if "://" in endpoint:
            endpoint = endpoint.split("://")[-1]
            
        self.client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)
        self.samples = []
        
        # Scan and stratify
        self._index_and_sample(samples_per_class, seed)

    def _index_and_sample(self, samples_per_class, seed):
        class_samples = {i: [] for i in range(5)}
        valid_exts = ('.jpg', '.jpeg', '.png', '.bmp')
        
        for cls_idx in range(5):
            cls_prefix = f"{self.prefix.rstrip('/')}/{cls_idx}/"
            objs = self.client.list_objects(self.bucket, prefix=cls_prefix, recursive=True)
            for o in objs:
                if any(o.object_name.lower().endswith(ext) for ext in valid_exts):
                    class_samples[cls_idx].append(o.object_name)

        rng = random.Random(seed)
        for cls_idx in range(5):
            objs = class_samples[cls_idx]
            rng.shuffle(objs)
            if samples_per_class and len(objs) > samples_per_class:
                selected = objs[:samples_per_class]
            else:
                selected = objs
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


def train_model(
    bucket="build-for-bharat",
    prefix_train="augmented_resized_V2/train/",
    prefix_val="augmented_resized_V2/val/",
    prefix_test="augmented_resized_V2/test/",
    train_samples_per_class=400,  # 400 * 5 = 2000 balanced train images
    val_samples_per_class=100,    # 100 * 5 = 500 balanced val images
    test_samples_per_class=100,   # 100 * 5 = 500 balanced test images
    img_size=(380, 380),
    batch_size=16,
    epochs=3,
    lr=2e-4,
    output_path="backend/media/models/efficientnet_b4_trained.pth"
):
    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    print("\n" + "=" * 65)
    print(" 🏥 MindHue Clinical AI Engine — EfficientNet-B4 Training Hub")
    print(f" Target Device:   {device}")
    print(f" Architecture:    EfficientNet-B4 (Pretrained ImageNet Weights)")
    print(f" Input Size:      {img_size}")
    print(f" MinIO Bucket:    {bucket}")
    print(f" Batches/Epoch:   Train Batch Size = {batch_size}")
    print("=" * 65 + "\n")

    # Data Augmentation & Normalization
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

    # 1. Datasets
    print("Loading and indexing datasets from MinIO...")
    t0 = time.time()
    train_ds = MinIOStratifiedDataset(bucket, prefix_train, samples_per_class=train_samples_per_class, transform=train_tf)
    val_ds = MinIOStratifiedDataset(bucket, prefix_val, samples_per_class=val_samples_per_class, transform=val_tf)
    test_ds = MinIOStratifiedDataset(bucket, prefix_test, samples_per_class=test_samples_per_class, transform=val_tf)
    t1 = time.time()
    print(f"Indexed in {t1 - t0:.2f}s:")
    print(f"  • Training Samples:   {len(train_ds)} {train_ds.get_distribution()}")
    print(f"  • Validation Samples: {len(val_ds)} {val_ds.get_distribution()}")
    print(f"  • Test Samples:       {len(test_ds)} {test_ds.get_distribution()}\n")

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    # 2. Build EfficientNet-B4 Model
    print("Initializing EfficientNet-B4 backbone...")
    weights = EfficientNet_B4_Weights.DEFAULT
    model = efficientnet_b4(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4, inplace=True),
        nn.Linear(in_features, 5)
    )
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    # 3. Training Loop
    best_val_acc = 0.0
    training_start = time.time()

    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        print(f"\n--- Epoch {epoch}/{epochs} (lr: {scheduler.get_last_lr()[0]:.6f}) ---")
        for batch_idx, (images, targets) in enumerate(train_loader):
            images, targets = images.to(device), targets.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            correct += preds.eq(targets).sum().item()
            total += targets.size(0)

            if (batch_idx + 1) % 25 == 0 or (batch_idx + 1) == len(train_loader):
                batch_acc = (correct / total) * 100.0
                batch_loss = running_loss / total
                print(f"  Batch [{batch_idx+1}/{len(train_loader)}] Loss: {batch_loss:.4f} | Accuracy: {batch_acc:.2f}%")

        scheduler.step()
        train_loss = running_loss / total
        train_acc = (correct / total) * 100.0

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, targets in val_loader:
                images, targets = images.to(device), targets.to(device)
                outputs = model(images)
                loss = criterion(outputs, targets)

                val_loss += loss.item() * images.size(0)
                _, preds = outputs.max(1)
                val_correct += preds.eq(targets).sum().item()
                val_total += targets.size(0)

        val_loss /= val_total
        val_acc = (val_correct / val_total) * 100.0
        epoch_time = time.time() - epoch_start

        print(f"Epoch {epoch} Summary ({epoch_time:.1f}s):")
        print(f"  Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"  Val Loss:   {val_loss:.4f} | Val Acc:   {val_acc:.2f}%")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            torch.save(model.state_dict(), output_path)
            print(f"  ⭐ New Best Validation Accuracy! Weights saved to {output_path}")

    total_train_time = time.time() - training_start
    print(f"\nTraining completed in {total_train_time/60:.2f} minutes.")

    # 4. Final Evaluation on Independent Test Split
    print("\n" + "=" * 65)
    print(" 📊 FINAL EVALUATION ON INDEPENDENT TEST SET")
    print("=" * 65)
    
    if os.path.exists(output_path):
        model.load_state_dict(torch.load(output_path, map_location=device))

    model.eval()
    all_preds = []
    all_targets = []

    with torch.no_grad():
        for images, targets in test_loader:
            images, targets = images.to(device), targets.to(device)
            outputs = model(images)
            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    # 5-class accuracy
    test_acc = np.mean(all_preds == all_targets) * 100.0

    # Confusion Matrix
    cm = np.zeros((5, 5), dtype=int)
    for t, p in zip(all_targets, all_preds):
        cm[t, p] += 1

    print(f"\nFinal Test Top-1 Accuracy (5-Class): {test_acc:.2f}%\n")
    print("Confusion Matrix (Rows: Ground Truth, Cols: Prediction):")
    header = "       | " + " | ".join([f"G{i}" for i in range(5)]) + " |"
    print(header)
    print("-" * len(header))
    for i in range(5):
        row = f"  G{i}   | " + " | ".join([f"{cm[i, j]:3d}" for j in range(5)]) + " |"
        print(row)

    # Per-Class Metrics
    print("\nPer-Class Performance:")
    for i in range(5):
        tp = cm[i, i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0.0
        print(f"  {CLASS_NAMES[i]:<40} Precision: {prec*100:5.1f}% | Recall: {rec*100:5.1f}% | F1: {f1*100:5.1f}%")

    # Binary Referable DR Metrics (Non-referable: 0,1 vs Referable: 2,3,4)
    bin_targets = (all_targets >= 2).astype(int)
    bin_preds = (all_preds >= 2).astype(int)
    bin_acc = np.mean(bin_targets == bin_preds) * 100.0
    bin_tp = np.sum((bin_targets == 1) & (bin_preds == 1))
    bin_tn = np.sum((bin_targets == 0) & (bin_preds == 0))
    bin_fp = np.sum((bin_targets == 0) & (bin_preds == 1))
    bin_fn = np.sum((bin_targets == 1) & (bin_preds == 0))
    sensitivity = bin_tp / (bin_tp + bin_fn) * 100.0 if (bin_tp + bin_fn) > 0 else 0.0
    specificity = bin_tn / (bin_tn + bin_fp) * 100.0 if (bin_tn + bin_fp) > 0 else 0.0

    print("\n" + "-" * 65)
    print(" 🩺 Binary Referable DR Clinical Metrics (Grade 0-1 vs Grade 2-4):")
    print(f"  • Binary Accuracy:    {bin_acc:.2f}%")
    print(f"  • Clinical Sensitivity (Recall for DR): {sensitivity:.2f}%")
    print(f"  • Clinical Specificity:                {specificity:.2f}%")
    print("=" * 65 + "\n")

    return {
        "test_accuracy_5class": test_acc,
        "binary_accuracy": bin_acc,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "best_val_acc": best_val_acc,
        "weights_path": output_path
    }


if __name__ == "__main__":
    train_model(
        bucket="build-for-bharat",
        train_samples_per_class=300,  # 300 * 5 = 1500 train images
        val_samples_per_class=80,     # 80 * 5 = 400 val images
        test_samples_per_class=80,    # 80 * 5 = 400 test images
        img_size=(280, 280),
        batch_size=16,
        epochs=3,
        lr=2e-4
    )
