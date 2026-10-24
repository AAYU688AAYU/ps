"""
MinIO Dataset Loader & Streamer for Retinal Fundus Classification.
Streams training and validation fundus images directly from MinIO object storage
into TensorFlow/Keras, PyTorch, or raw NumPy arrays without saving local disk datasets.
"""

import io
import os
import random
import logging
from PIL import Image
import numpy as np

try:
    from minio import Minio
    MINIO_INSTALLED = True
except ImportError:
    MINIO_INSTALLED = False

logger = logging.getLogger(__name__)

# Class labels conforming to clinical ICDR standards
CLASS_NAMES = [
    "Healthy",
    "Mild DR",
    "Moderate DR",
    "Severe DR",
    "Proliferate DR"
]

CLASS_KEYWORD_MAP = {
    'healthy': 0, 'normal': 0, 'no_dr': 0, 'grade_0': 0,
    'mild': 1, 'mild dr': 1, 'grade_1': 1,
    'moderate': 2, 'moderate dr': 2, 'mod_npdr': 2, 'grade_2': 2,
    'severe': 3, 'severe dr': 3, 'sev_npdr': 3, 'grade_3': 3,
    'proliferate': 4, 'proliferative': 4, 'pdr': 4, 'grade_4': 4,
}


def get_default_minio_client(endpoint=None, access_key=None, secret_key=None):
    """Initializes MinIO client using environment variables or localhost defaults."""
    if not MINIO_INSTALLED:
        raise ImportError("minio package is required. Install via: pip install minio")

    endpoint = endpoint or os.getenv("MINIO_ENDPOINT", "localhost:9000")
    access_key = access_key or os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = secret_key or os.getenv("MINIO_SECRET_KEY", "minioadmin")

    # Clean endpoint format
    if "://" in endpoint:
        endpoint = endpoint.split("://")[-1]

    return Minio(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=False
    )


class MinIOFundusDataLoader:
    """
    Direct-from-MinIO dataset streamer.
    Enables training deep learning models (like EfficientNetB0) directly from MinIO object storage.
    """

    def __init__(self, bucket="mindhue", prefix="archive/", endpoint=None, img_size=(224, 224), cache_memory=True):
        self.bucket = bucket
        self.prefix = prefix
        self.img_size = img_size
        self.cache_memory = cache_memory
        self._memory_cache = {}

        self.client = get_default_minio_client(endpoint=endpoint)
        self.samples = []  # List of tuples: (object_name, class_idx)
        self._scan()

    def _determine_label(self, object_name):
        path_lower = object_name.lower()
        parts = path_lower.replace('\\', '/').split('/')
        for part in parts[:-1]:
            if part in ('0', '1', '2', '3', '4'):
                return int(part)
        for keyword in sorted(CLASS_KEYWORD_MAP.keys(), key=len, reverse=True):
            if keyword in path_lower:
                return CLASS_KEYWORD_MAP[keyword]
        return 0

    def _scan(self):
        if not self.client.bucket_exists(self.bucket):
            raise ValueError(f"MinIO bucket '{self.bucket}' does not exist.")

        objects = self.client.list_objects(self.bucket, prefix=self.prefix, recursive=True)
        valid_exts = ('.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp')
        for obj in objects:
            name = obj.object_name
            if any(name.lower().endswith(ext) for ext in valid_exts):
                label = self._determine_label(name)
                self.samples.append((name, label))

        logger.info("Indexed %d images from MinIO (%s/%s)", len(self.samples), self.bucket, self.prefix)

    def __len__(self):
        return len(self.samples)

    def get_class_distribution(self):
        dist = {i: 0 for i in range(5)}
        for _, label in self.samples:
            dist[label] += 1
        return {CLASS_NAMES[k]: v for k, v in dist.items()}

    def load_image(self, object_name):
        """Loads and resizes image directly from MinIO into RGB PIL Image."""
        if self.cache_memory and object_name in self._memory_cache:
            raw_bytes = self._memory_cache[object_name]
        else:
            response = self.client.get_object(self.bucket, object_name)
            try:
                raw_bytes = response.read()
                if self.cache_memory and len(self._memory_cache) < 2500:
                    self._memory_cache[object_name] = raw_bytes
            finally:
                response.close()
                response.release_conn()

        img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        if self.img_size:
            img = img.resize(self.img_size, Image.Resampling.BILINEAR)
        return img

    def get_train_val_indices(self, val_split=0.2, seed=42):
        """Splits sample indices with stratification across the 5 classes."""
        rng = random.Random(seed)
        class_buckets = {i: [] for i in range(5)}
        for idx, (_, label) in enumerate(self.samples):
            class_buckets[label].append(idx)

        train_indices, val_indices = [], []
        for label, idxs in class_buckets.items():
            rng.shuffle(idxs)
            split_point = int(len(idxs) * (1.0 - val_split))
            train_indices.extend(idxs[:split_point])
            val_indices.extend(idxs[split_point:])

        rng.shuffle(train_indices)
        rng.shuffle(val_indices)
        return train_indices, val_indices

    def stream_batches(self, indices=None, batch_size=16, shuffle=True, normalize=False):
        """
        Yields batches of (X_batch, y_batch) numpy arrays.
        X_batch: (batch_size, H, W, 3) float32
        y_batch: (batch_size,) int64
        """
        active_indices = list(indices) if indices is not None else list(range(len(self.samples)))

        while True:
            if shuffle:
                random.shuffle(active_indices)

            for i in range(0, len(active_indices), batch_size):
                batch_slice = active_indices[i:i + batch_size]
                if len(batch_slice) == 0:
                    continue

                imgs, labels = [], []
                for idx in batch_slice:
                    obj_name, label = self.samples[idx]
                    pil_img = self.load_image(obj_name)
                    arr = np.array(pil_img, dtype=np.float32)
                    if normalize:
                        arr /= 255.0
                    imgs.append(arr)
                    labels.append(label)

                yield np.stack(imgs, axis=0), np.array(labels, dtype=np.int64)

            if indices is not None:
                # If doing a single epoch pass through a specific split, break
                break

    def to_tf_dataset(self, indices=None, batch_size=16, shuffle=True, normalize=False):
        """
        Builds a tf.data.Dataset streaming directly from MinIO.
        Requires tensorflow to be installed.
        """
        import tensorflow as tf

        active_indices = list(indices) if indices is not None else list(range(len(self.samples)))

        def gen():
            for X, y in self.stream_batches(indices=active_indices, batch_size=batch_size, shuffle=shuffle, normalize=normalize):
                for i in range(len(y)):
                    yield X[i], y[i]

        output_signature = (
            tf.TensorSpec(shape=(self.img_size[0], self.img_size[1], 3), dtype=tf.float32),
            tf.TensorSpec(shape=(), dtype=tf.int64)
        )

        dataset = tf.data.Dataset.from_generator(gen, output_signature=output_signature)
        if shuffle:
            dataset = dataset.shuffle(buffer_size=batch_size * 4)
        dataset = dataset.batch(batch_size).prefetch(tf.data.AUTOTUNE)
        return dataset
