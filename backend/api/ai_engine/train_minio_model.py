"""
End-to-End Deep Learning Training Hub for MinIO Retinal Datasets.
Supports streaming ingestion from MinIO, data augmentation, transfer learning,
and automatic upload of trained weights back to MinIO object storage.
"""

import io
import os
import sys
import time
import argparse
import logging
from PIL import Image

from .minio_client import get_minio_client, get_minio_config, ensure_bucket_exists
from .minio_dataset import MinIORetinalDataset, TORCH_AVAILABLE

logger = logging.getLogger(__name__)


def build_backbone(model_name="resnet50", num_classes=5, pretrained=True):
    """Initializes PyTorch deep learning vision backbone."""
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch is required for model training. Please run: pip install torch torchvision")

    import torch.nn as nn
    from torchvision import models

    model_name = model_name.lower().replace("-", "_")
    if "b0" in model_name or model_name == "efficientnet":
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = models.efficientnet_b0(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(in_features, num_classes)
        )
    elif "efficientnet_b4" in model_name or "b4" in model_name:
        weights = models.EfficientNet_B4_Weights.DEFAULT if pretrained else None
        model = models.efficientnet_b4(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.4, inplace=True),
            nn.Linear(in_features, num_classes)
        )
    elif "mobilenet" in model_name:
        weights = models.MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
        model = models.mobilenet_v3_large(weights=weights)
        in_features = model.classifier[3].in_features
        model.classifier[3] = nn.Linear(in_features, num_classes)
    else:  # Default: ResNet50
        weights = models.ResNet50_Weights.DEFAULT if pretrained else None
        model = models.resnet50(weights=weights)
        in_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, num_classes)
        )

    return model


def get_transforms(image_size=(224, 224)):
    """Returns training and validation transforms tailored for retinal fundus images."""
    if not TORCH_AVAILABLE:
        return None, None

    import torchvision.transforms as T

    train_transform = T.Compose([
        T.Resize(image_size),
        T.RandomHorizontalFlip(p=0.5),
        T.RandomVerticalFlip(p=0.5),
        T.RandomRotation(degrees=20),
        T.ColorJitter(brightness=0.15, contrast=0.2, saturation=0.1),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = T.Compose([
        T.Resize(image_size),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return train_transform, val_transform


def train_from_minio(
    bucket=None,
    prefix="archive/",
    epochs=10,
    batch_size=16,
    learning_rate=1e-4,
    backbone="efficientnet_b0",
    val_split=0.15,
    save_to_minio=True,
    output_filename="mindhue_retinal_weights.pth"
):
    """
    Executes deep learning training directly streaming from MinIO.
    """
    if not TORCH_AVAILABLE:
        print("[ERROR] PyTorch is not installed in the current environment.")
        print("To train models, install PyTorch: pip install torch torchvision")
        return {"success": False, "error": "PyTorch not installed"}

    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, random_split

    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"\n========================================================")
    print(f" MindHue MinIO ML Training Engine")
    print(f" Device: {device} | Backbone: {backbone} | Epochs: {epochs}")
    print(f" Bucket: {bucket or 'mindhue'} | Source Prefix: {prefix}")
    print(f"========================================================\n")

    img_size = (224, 224) if ("b0" in backbone.lower() or "mobilenet" in backbone.lower()) else (512, 512)
    train_transform, val_transform = get_transforms(image_size=img_size)

    # 1. Load dataset from MinIO
    full_dataset = MinIORetinalDataset(prefix=prefix, bucket=bucket, transform=train_transform)
    total_images = len(full_dataset)

    if total_images == 0:
        msg = f"No fundus images found in MinIO under prefix '{prefix}'."
        print(f"[WARNING] {msg}")
        print("Class distribution:", full_dataset.get_class_distribution())
        return {"success": False, "error": msg, "total_images": 0}

    print(f"Total dataset images found: {total_images}")
    dist = full_dataset.get_class_distribution()
    for cname, count in dist.items():
        print(f"  • {cname}: {count} images")

    # 2. Train / Val Split
    val_size = int(total_images * val_split)
    train_size = total_images - val_size
    train_set, val_set = random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False, num_workers=0) if val_size > 0 else None

    # 3. Model, Loss, Optimizer
    model = build_backbone(model_name=backbone, num_classes=5, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    history = []
    best_acc = 0.0

    # 4. Training Loop
    start_time = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            train_correct += (preds == labels).sum().item()
            train_total += labels.size(0)

        scheduler.step()

        epoch_loss = train_loss / max(1, train_total)
        epoch_acc = train_correct / max(1, train_total)

        # Validation
        val_acc = 0.0
        if val_loader:
            model.eval()
            val_correct = 0
            val_total = 0
            with torch.no_grad():
                for images, labels in val_loader:
                    images, labels = images.to(device), labels.to(device)
                    outputs = model(images)
                    _, preds = torch.max(outputs, 1)
                    val_correct += (preds == labels).sum().item()
                    val_total += labels.size(0)
            val_acc = val_correct / max(1, val_total)

        history.append({
            "epoch": epoch,
            "train_loss": round(epoch_loss, 4),
            "train_acc": round(epoch_acc, 4),
            "val_acc": round(val_acc, 4),
        })

        print(f"Epoch [{epoch:02d}/{epochs:02d}] - Loss: {epoch_loss:.4f} | Train Acc: {epoch_acc*100:.1f}% | Val Acc: {val_acc*100:.1f}%")

    elapsed_time = round(time.time() - start_time, 1)
    print(f"\nTraining completed in {elapsed_time}s.")

    # 5. Save local weights
    torch.save(model.state_dict(), output_filename)
    print(f"Saved weights locally to '{output_filename}'.")

    # 6. Upload trained weights back to MinIO (models/)
    minio_model_path = None
    if save_to_minio:
        try:
            cfg = get_minio_config()
            client = get_minio_client()
            bucket = cfg["bucket_name"]
            ensure_bucket_exists(client, bucket)

            with open(output_filename, "rb") as f:
                weight_bytes = f.read()

            minio_key = f"models/{output_filename}"
            client.put_object(
                bucket,
                minio_key,
                io.BytesIO(weight_bytes),
                length=len(weight_bytes),
                content_type="application/octet-stream",
                metadata={"backbone": backbone, "epochs": str(epochs), "classes": "5"}
            )
            minio_model_path = f"{bucket}/{minio_key}"
            print(f"[MinIO] Uploaded trained weights to '{minio_model_path}'.")
        except Exception as e:
            print(f"[MinIO] Failed to upload weights to MinIO: {e}")

    return {
        "success": True,
        "total_images": total_images,
        "epochs": epochs,
        "elapsed_seconds": elapsed_time,
        "history": history,
        "local_weights": output_filename,
        "minio_weights": minio_model_path
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train MindHue Retinal Model from MinIO")
    parser.add_argument("--bucket", type=str, default=None, help="MinIO bucket name (default: mindhue)")
    parser.add_argument("--prefix", type=str, default="archive/", help="MinIO object prefix (default: 'archive/')")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--backbone", type=str, default="efficientnet_b0", help="Backbone: efficientnet_b0, resnet50, mobilenet")
    parser.add_argument("--save-minio", action="store_true", default=True, help="Save trained model back to MinIO")

    args = parser.parse_args()
    train_from_minio(
        bucket=args.bucket,
        prefix=args.prefix,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        backbone=args.backbone,
        save_to_minio=args.save_minio
    )

