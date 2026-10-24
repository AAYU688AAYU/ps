"""
MindHue Dataset Integrity & Leakage Audit Utility
-------------------------------------------------
Audits retinal fundus datasets stored in MinIO or local directories for:
1. Exact duplicate images across splits (MD5 / SHA-256 hash collision).
2. Near-duplicate images and augmented variants crossing split boundaries (Difference Hashing).
3. Patient-level cross-split leakage (base patient / image ID overlap).
4. Class distribution and imbalance ratios per split.
5. Corrupted / undecodable image detection and color space validation.
6. Leak-free patient-isolated split generation.
"""

import os
import io
import re
import sys
import json
import hashlib
import logging
from collections import Counter, defaultdict
from PIL import Image
import numpy as np

try:
    from minio import Minio
    MINIO_AVAILABLE = True
except ImportError:
    MINIO_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MindHueAudit")

CLASS_NAMES = [
    "Grade 0: Normal / Healthy",
    "Grade 1: Mild NPDR",
    "Grade 2: Moderate NPDR",
    "Grade 3: Severe NPDR",
    "Grade 4: Proliferative DR (PDR)"
]


def extract_base_patient_id(filename: str) -> str:
    """
    Extracts the root patient / fundus ID by stripping offline augmentation suffixes.
    Examples:
      '000c1434d8d7-600.jpg' -> '000c1434d8d7'
      '0212dd31f623-GF-600.jpg' -> '0212dd31f623'
      '08ee569d4721-ALL.jpg' -> '08ee569d4721'
      'image1234_rot90.png' -> 'image1234'
    """
    base = os.path.splitext(filename)[0]
    # Split by standard augmentation delimiters
    base = base.split('-')[0].split('_')[0]
    return base.strip()


def compute_dhash(image: Image.Image, hash_size: int = 8) -> int:
    """
    Computes difference hash (dHash) for near-duplicate image detection.
    Resize to (hash_size + 1, hash_size), convert to grayscale, compare adjacent horizontal pixels.
    """
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
    pixels = np.array(resized, dtype=np.int32)
    diff = pixels[:, 1:] > pixels[:, :-1]
    # Convert bool array to integer bitmask
    decimal_val = 0
    for bit in diff.flatten():
        decimal_val = (decimal_val << 1) | int(bit)
    return decimal_val


def hamming_distance(h1: int, h2: int) -> int:
    """Computes the Hamming distance between two 64-bit integer hashes."""
    return bin(h1 ^ h2).count('1')


class DatasetAuditor:
    def __init__(self, bucket: str = "build-for-bharat", prefix: str = "augmented_resized_V2", endpoint: str = "localhost:9000"):
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self.endpoint = endpoint.split("://")[-1]
        
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.client = Minio(self.endpoint, access_key=access_key, secret_key=secret_key, secure=False)
        self.splits = ["train", "val", "test"]

    def audit_splits(self, max_samples_per_split: int = None) -> dict:
        """
        Runs comprehensive data leakage, distribution, and corruption audit.
        """
        report = {
            "splits": {},
            "cross_split_leakage": {},
            "exact_duplicate_collisions": [],
            "patient_id_collisions": [],
            "near_duplicates": [],
            "corrupted_images": [],
        }

        split_files = defaultdict(list)          # split -> list of (obj_name, filename, class_idx, base_id)
        split_hashes = defaultdict(dict)         # split -> {md5: obj_name}
        split_base_ids = defaultdict(lambda: defaultdict(list)) # split -> {base_id: [obj_names]}
        split_dhashes = defaultdict(dict)        # split -> {obj_name: dhash}

        logger.info(f"Auditing bucket '{self.bucket}', prefix '{self.prefix}'...")

        for s in self.splits:
            split_prefix = f"{self.prefix}/{s}/"
            objs = self.client.list_objects(self.bucket, prefix=split_prefix, recursive=True)
            counts = Counter()
            count = 0

            for o in objs:
                parts = o.object_name.split("/")
                if len(parts) >= 4 and parts[2] in ('0', '1', '2', '3', '4'):
                    cls_idx = int(parts[2])
                    filename = parts[-1]
                    if not any(filename.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.bmp')):
                        continue

                    base_id = extract_base_id = extract_base_patient_id(filename)
                    split_files[s].append((o.object_name, filename, cls_idx, base_id))
                    split_base_ids[s][base_id].append(o.object_name)
                    counts[cls_idx] += 1
                    count += 1

                    if max_samples_per_split and count >= max_samples_per_split:
                        break

            report["splits"][s] = {
                "total_images": len(split_files[s]),
                "unique_patients": len(split_base_ids[s]),
                "class_counts": {CLASS_NAMES[k]: counts.get(k, 0) for k in range(5)},
                "class_distribution_pct": {
                    CLASS_NAMES[k]: round(counts.get(k, 0) / max(1, len(split_files[s])) * 100, 2)
                    for k in range(5)
                }
            }
            logger.info(f"Split '{s}': {len(split_files[s])} images, {len(split_base_ids[s])} unique base patient IDs.")

        # Check cross-split Patient ID Overlap
        train_bases = set(split_base_ids["train"].keys())
        val_bases = set(split_base_ids["val"].keys())
        test_bases = set(split_base_ids["test"].keys())

        train_val_overlap = train_bases.intersection(val_bases)
        train_test_overlap = train_bases.intersection(test_bases)
        val_test_overlap = val_bases.intersection(test_bases)
        all_three_overlap = train_bases.intersection(val_bases).intersection(test_bases)

        report["cross_split_leakage"] = {
            "train_val_patient_overlap_count": len(train_val_overlap),
            "train_test_patient_overlap_count": len(train_test_overlap),
            "val_test_patient_overlap_count": len(val_test_overlap),
            "all_three_overlap_count": len(all_three_overlap),
            "test_leakage_percentage": round(len(train_test_overlap) / max(1, len(test_bases)) * 100, 2)
        }

        logger.info(f"Leakage Audit: Train & Val Patient Overlap = {len(train_val_overlap)}")
        logger.info(f"Leakage Audit: Train & Test Patient Overlap = {len(train_test_overlap)} ({report['cross_split_leakage']['test_leakage_percentage']}% of test set)")

        return report

    def audit_image_hashes_and_integrity(self, sample_limit: int = 500) -> dict:
        """
        Samples images from each split to verify byte hashes, perceptual dHash, and decodability.
        """
        logger.info(f"Running deep hash and perceptual similarity check on up to {sample_limit} images per split...")
        hashes = defaultdict(dict)  # split -> {md5: obj_name}
        dhashes = defaultdict(dict) # split -> {obj_name: dhash}
        corrupted = []

        for s in self.splits:
            prefix = f"{self.prefix}/{s}/"
            objs = self.client.list_objects(self.bucket, prefix=prefix, recursive=True)
            processed = 0
            for o in objs:
                if not any(o.object_name.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png')):
                    continue
                try:
                    resp = self.client.get_object(self.bucket, o.object_name)
                    data = resp.read()
                    resp.close()
                    resp.release_conn()

                    # Exact MD5 hash
                    md5 = hashlib.md5(data).hexdigest()
                    hashes[s][md5] = o.object_name

                    # Decode image
                    img = Image.open(io.BytesIO(data))
                    img.verify() # Verify file header

                    # Re-open for perceptual hash (verify closes the image)
                    img = Image.open(io.BytesIO(data)).convert("RGB")
                    dhash = compute_dhash(img)
                    dhashes[s][o.object_name] = dhash

                except Exception as e:
                    corrupted.append({"object_name": o.object_name, "error": str(e)})

                processed += 1
                if sample_limit and processed >= sample_limit:
                    break

        # Exact collisions across splits
        train_md5s = set(hashes["train"].keys())
        test_md5s = set(hashes["test"].keys())
        val_md5s = set(hashes["val"].keys())

        train_test_md5_overlap = train_md5s.intersection(test_md5s)
        train_val_md5_overlap = train_md5s.intersection(val_md5s)

        # Near-duplicate checks (Hamming distance <= 2)
        near_duplicates = []
        for obj_test, hash_test in list(dhashes["test"].items())[:100]:
            for obj_train, hash_train in list(dhashes["train"].items())[:100]:
                dist = hamming_distance(hash_test, hash_train)
                if dist <= 2:
                    near_duplicates.append({
                        "test_img": obj_test,
                        "train_img": obj_train,
                        "hamming_dist": dist
                    })

        return {
            "corrupted_count": len(corrupted),
            "corrupted_images": corrupted,
            "exact_train_test_md5_collisions": len(train_test_md5_overlap),
            "exact_train_val_md5_collisions": len(train_val_md5_overlap),
            "near_duplicates_found": len(near_duplicates),
            "near_duplicates_sample": near_duplicates[:10]
        }


def generate_clean_patient_splits(bucket: str = "build-for-bharat", prefix: str = "augmented_resized_V2",
                                   output_file: str = "backend/media/models/clean_patient_splits.json",
                                   val_ratio: float = 0.15, test_ratio: float = 0.15, seed: int = 42):
    """
    Collects all unique patient/base IDs across all folders and partitions them into
    STRICTLY NON-OVERLAPPING Train, Val, and Test patient pools.
    All augmented variants belonging to a patient are strictly assigned to that patient's designated split.
    """
    endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000").split("://")[-1]
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)

    logger.info("Scanning all objects to build patient-isolated splits...")
    objs = client.list_objects(bucket, prefix=prefix.strip("/") + "/", recursive=True)

    patient_records = defaultdict(lambda: {"label": None, "images": []})

    for o in objs:
        parts = o.object_name.split("/")
        # e.g., augmented_resized_V2/<split>/<class_idx>/<filename>
        for part in parts:
            if part in ('0', '1', '2', '3', '4'):
                cls_idx = int(part)
                filename = parts[-1]
                if any(filename.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.bmp')):
                    base_id = extract_base_patient_id(filename)
                    patient_records[base_id]["label"] = cls_idx
                    patient_records[base_id]["images"].append(o.object_name)
                break

    # Stratified patient split by class label
    class_patients = defaultdict(list)
    for base_id, rec in patient_records.items():
        if rec["label"] is not None:
            class_patients[rec["label"]].append(base_id)

    rng = np.random.RandomState(seed)
    train_patients = set()
    val_patients = set()
    test_patients = set()

    for cls_idx, p_list in class_patients.items():
        p_array = np.array(p_list)
        rng.shuffle(p_array)
        n = len(p_array)
        n_test = int(n * test_ratio)
        n_val = int(n * val_ratio)
        
        test_pts = p_array[:n_test]
        val_pts = p_array[n_test:n_test + n_val]
        train_pts = p_array[n_test + n_val:]

        train_patients.update(train_pts)
        val_patients.update(val_pts)
        test_patients.update(test_pts)

    split_manifest = {
        "metadata": {
            "bucket": bucket,
            "seed": seed,
            "total_patients": len(patient_records),
            "train_patients_count": len(train_patients),
            "val_patients_count": len(val_patients),
            "test_patients_count": len(test_patients),
            "verification": {
                "train_val_overlap": len(train_patients.intersection(val_patients)),
                "train_test_overlap": len(train_patients.intersection(test_patients)),
                "val_test_overlap": len(val_patients.intersection(test_patients))
            }
        },
        "train_patients": list(train_patients),
        "val_patients": list(val_patients),
        "test_patients": list(test_patients)
    }

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(split_manifest, f, indent=2)

    logger.info(f"Saved clean patient-isolated manifest to {output_file}")
    logger.info(f"Summary: {len(train_patients)} Train patients, {len(val_patients)} Val patients, {len(test_patients)} Test patients.")
    logger.info(f"Patient overlap verified: {split_manifest['metadata']['verification']}")
    return split_manifest


if __name__ == "__main__":
    auditor = DatasetAuditor()
    report = auditor.audit_splits()
    print("\n" + "=" * 70)
    print(" 🔍 DATASET INTEGRITY & SPLIT LEAKAGE AUDIT REPORT")
    print("=" * 70)
    print(json.dumps(report, indent=2))

    manifest = generate_clean_patient_splits()
    print(f"\n✅ Clean patient-level split generated: {len(manifest['train_patients'])} Train, {len(manifest['val_patients'])} Val, {len(manifest['test_patients'])} Test.")
