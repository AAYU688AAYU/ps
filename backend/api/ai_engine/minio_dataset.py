"""
MinIO Retinal Dataset Streaming & Batch Loader.
Streams retinal fundus images directly from MinIO object storage into ML training pipelines.
Supports PyTorch DataLoader integration, on-the-fly byte streaming, and caching.
"""

import io
import os
import logging
from PIL import Image
from .minio_client import get_minio_client, get_minio_config

logger = logging.getLogger(__name__)

# Try importing torch; if not present, provide standalone generator support
try:
    import torch
    from torch.utils.data import Dataset
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    class Dataset:
        pass


class MinIORetinalDataset(Dataset):
    """
    Direct-streaming dataset loader from MinIO bucket.
    Indexes all image objects under a specified bucket prefix.
    
    Expected prefix layout (either training_data or diagnosed):
      training_data/grade_0_normal/*.jpg
      training_data/grade_1_mild_npdr/*.jpg
      training_data/grade_2_moderate_npdr/*.jpg
      training_data/grade_3_severe_npdr/*.jpg
      training_data/grade_4_pdr/*.jpg
    """

    CLASS_KEYWORD_MAP = {
        'grade_0': 0, 'normal': 0, 'no_dr': 0, 'healthy': 0,
        'grade_1': 1, 'mild': 1, 'mild dr': 1,
        'grade_2': 2, 'moderate': 2, 'mod_npdr': 2, 'moderate dr': 2,
        'grade_3': 3, 'severe': 3, 'sev_npdr': 3, 'severe dr': 3,
        'grade_4': 4, 'pdr': 4, 'proliferative': 4, 'proliferate': 4, 'proliferate dr': 4,
    }

    CLASS_NAMES = [
        "Grade 0: Normal / Healthy",
        "Grade 1: Mild Non-Proliferative DR",
        "Grade 2: Moderate Non-Proliferative DR",
        "Grade 3: Severe Non-Proliferative DR",
        "Grade 4: Proliferative Diabetic Retinopathy",
    ]

    def __init__(self, prefix="archive/", bucket=None, transform=None, cache_memory=True):
        self.cfg = get_minio_config()
        self.client = get_minio_client()
        
        # Determine active bucket: explicit > 'mindhue' (if exists) > configured bucket
        if bucket:
            self.bucket = bucket
        else:
            default_bucket = self.cfg.get("bucket_name", "mindhue")
            try:
                if self.client.bucket_exists("mindhue"):
                    self.bucket = "mindhue"
                elif self.client.bucket_exists(default_bucket):
                    self.bucket = default_bucket
                else:
                    self.bucket = default_bucket
            except Exception:
                self.bucket = default_bucket

        self.prefix = prefix
        self.transform = transform
        self.cache_memory = cache_memory
        self._memory_cache = {}

        self.samples = []  # List of tuples: (object_name, class_idx)
        self._scan_minio_bucket()

    def _determine_label(self, object_name):
        """Extracts numerical ICDR label (0-4) from object path."""
        path_lower = object_name.lower()
        # First check path segments for direct numerical folder names '0', '1', '2', '3', '4'
        parts = path_lower.replace('\\', '/').split('/')
        for part in parts[:-1]:  # check directory segments only
            if part in ('0', '1', '2', '3', '4'):
                return int(part)
        # Sort keys by length descending to match 'grade_0' before '0'
        for keyword in sorted(self.CLASS_KEYWORD_MAP.keys(), key=len, reverse=True):
            if keyword in path_lower:
                return self.CLASS_KEYWORD_MAP[keyword]
        return None

    def _scan_minio_bucket(self):
        """Scans MinIO bucket and indexes all fundus image files."""
        try:
            if not self.client.bucket_exists(self.bucket):
                logger.warning("MinIO bucket '%s' does not exist.", self.bucket)
                return

            objects = self.client.list_objects(self.bucket, prefix=self.prefix, recursive=True)
            valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff')
            for obj in objects:
                name = obj.object_name
                if any(name.lower().endswith(ext) for ext in valid_extensions):
                    label = self._determine_label(name)
                    if label is not None:
                        self.samples.append((name, label))
                    else:
                        # If label cannot be determined from subfolder, default to Grade 0
                        self.samples.append((name, 0))

            logger.info("MinIORetinalDataset: Indexed %d images from %s/%s", len(self.samples), self.bucket, self.prefix)
        except Exception as e:
            logger.error("Failed to index MinIO bucket '%s': %s", self.bucket, e)

    def __len__(self):
        return len(self.samples)

    def get_class_distribution(self):
        """Returns the count of samples per ICDR class."""
        dist = {i: 0 for i in range(5)}
        for _, label in self.samples:
            dist[label] += 1
        return {self.CLASS_NAMES[k]: v for k, v in dist.items()}

    def load_image_bytes(self, object_name):
        """Streams image bytes from MinIO with optional in-memory caching."""
        if self.cache_memory and object_name in self._memory_cache:
            return self._memory_cache[object_name]

        response = self.client.get_object(self.bucket, object_name)
        try:
            raw_bytes = response.read()
            if self.cache_memory and len(self._memory_cache) < 2000:
                self._memory_cache[object_name] = raw_bytes
            return raw_bytes
        finally:
            response.close()
            response.release_conn()

    def __getitem__(self, idx):
        """
        Returns (image, label) for training.
        If PyTorch is available and transform is applied, returns transformed Tensor.
        """
        object_name, label = self.samples[idx]
        raw_bytes = self.load_image_bytes(object_name)

        image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")

        if self.transform:
            image = self.transform(image)
        elif TORCH_AVAILABLE:
            import torchvision.transforms as T
            default_t = T.Compose([
                T.Resize((512, 512)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            image = default_t(image)

        if TORCH_AVAILABLE:
            label_tensor = torch.tensor(label, dtype=torch.long)
            return image, label_tensor

        return image, label

    def stream_batches(self, batch_size=16, target_size=(224, 224), shuffle=True, normalize=False):
        """
        Yields batches of (images_np, labels_np) directly streamed from MinIO without local files.
        images_np: shape (batch_size, H, W, 3) float32
        labels_np: shape (batch_size,) int64
        """
        import numpy as np
        import random

        indices = list(range(len(self.samples)))
        if shuffle:
            random.shuffle(indices)

        for i in range(0, len(indices), batch_size):
            batch_idx = indices[i:i + batch_size]
            batch_imgs = []
            batch_labels = []

            for idx in batch_idx:
                obj_name, label = self.samples[idx]
                raw_bytes = self.load_image_bytes(obj_name)
                pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
                if target_size:
                    pil_img = pil_img.resize(target_size, Image.Resampling.BILINEAR)
                arr = np.array(pil_img, dtype=np.float32)
                if normalize:
                    arr /= 255.0
                batch_imgs.append(arr)
                batch_labels.append(label)

            yield np.stack(batch_imgs, axis=0), np.array(batch_labels, dtype=np.int64)

