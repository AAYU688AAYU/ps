import io
import os
import logging
from PIL import Image
from minio import Minio
from minio.error import S3Error
from django.conf import settings

logger = logging.getLogger(__name__)

# Map ICDR Grades (0 to 4) to partitioned MinIO storage folders
DISORDER_FOLDER_MAP = {
    0: "diagnosed/grade_0_normal",
    1: "diagnosed/grade_1_mild_npdr",
    2: "diagnosed/grade_2_moderate_npdr",
    3: "diagnosed/grade_3_severe_npdr",
    4: "diagnosed/grade_4_pdr",
}

DISORDER_NAME_MAP = {
    0: "No Apparent Retinopathy",
    1: "Mild Non-Proliferative DR",
    2: "Moderate Non-Proliferative DR",
    3: "Severe Non-Proliferative DR",
    4: "Proliferative Diabetic Retinopathy",
}


def get_minio_config():
    return {
        "endpoint": getattr(settings, "MINIO_ENDPOINT", os.getenv("MINIO_ENDPOINT", "localhost:9000")),
        "access_key": getattr(settings, "MINIO_ACCESS_KEY", os.getenv("MINIO_ACCESS_KEY", "minioadmin")),
        "secret_key": getattr(settings, "MINIO_SECRET_KEY", os.getenv("MINIO_SECRET_KEY", "minioadmin123")),
        "secure": getattr(settings, "MINIO_USE_SSL", os.getenv("MINIO_USE_SSL", "False").lower() in ("true", "1", "t")),
        "bucket_name": getattr(settings, "MINIO_BUCKET_NAME", os.getenv("MINIO_BUCKET_NAME", "mindhue-data")),
    }


def get_minio_client():
    cfg = get_minio_config()
    return Minio(
        cfg["endpoint"],
        access_key=cfg["access_key"],
        secret_key=cfg["secret_key"],
        secure=cfg["secure"],
    )


def ensure_bucket_exists(client=None, bucket=None):
    """
    Checks if target MinIO bucket exists, creating it if needed.
    """
    cfg = get_minio_config()
    client = client or get_minio_client()
    bucket = bucket or cfg["bucket_name"]
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info("MinIO bucket '%s' initialized successfully.", bucket)
            print(f"MinIO bucket '{bucket}' initialized.")
    except Exception as e:
        logger.warning("MinIO bucket check/create failed for '%s': %s", bucket, e)
        raise


def upload_diagnosed_fundus_to_minio(
    raw_img_bytes,
    enhanced_np,
    gradcam_np,
    icdr_grade,
    session_code,
    eye,
    image_id,
    vessel_np=None,
    lesion_np=None
):
    """
    Uploads screened fundus images & diagnostic overlays to MinIO partitioned by disorder level.

    Destination hierarchy:
      {bucket}/diagnosed/grade_{N}_{name}/raw/{session_code}_{eye}_{id}.jpg
      {bucket}/diagnosed/grade_{N}_{name}/enhanced/{session_code}_{eye}_{id}_enh.jpg
      {bucket}/diagnosed/grade_{N}_{name}/gradcam/{session_code}_{eye}_{id}_gradcam.jpg
      {bucket}/diagnosed/grade_{N}_{name}/vessels/{session_code}_{eye}_{id}_vessels.jpg (optional)
      {bucket}/diagnosed/grade_{N}_{name}/lesions/{session_code}_{eye}_{id}_lesions.jpg (optional)
    """
    cfg = get_minio_config()
    bucket = cfg["bucket_name"]
    client = get_minio_client()

    # Ensure bucket exists
    ensure_bucket_exists(client, bucket)

    folder = DISORDER_FOLDER_MAP.get(icdr_grade, "diagnosed/unknown")
    base_stem = f"{session_code}_{eye}_{str(image_id)[:8]}"

    uploaded_paths = {
        "disorder_folder": folder,
        "disorder_name": DISORDER_NAME_MAP.get(icdr_grade, "Unknown"),
        "raw_path": None,
        "enhanced_path": None,
        "gradcam_path": None,
        "vessels_path": None,
        "lesions_path": None,
    }

    # 1. Upload Raw Fundus Image
    if raw_img_bytes:
        raw_key = f"{folder}/raw/{base_stem}.jpg"
        client.put_object(
            bucket,
            raw_key,
            io.BytesIO(raw_img_bytes),
            length=len(raw_img_bytes),
            content_type="image/jpeg",
            metadata={"icdr_grade": str(icdr_grade), "session": session_code, "eye": eye}
        )
        uploaded_paths["raw_path"] = f"{bucket}/{raw_key}"

    # 2. Upload Enhanced Fundus Image
    if enhanced_np is not None:
        enh_buf = io.BytesIO()
        Image.fromarray(enhanced_np).save(enh_buf, format="JPEG", quality=95)
        enh_bytes = enh_buf.getvalue()
        enh_key = f"{folder}/enhanced/{base_stem}_enh.jpg"
        client.put_object(
            bucket,
            enh_key,
            io.BytesIO(enh_bytes),
            length=len(enh_bytes),
            content_type="image/jpeg",
            metadata={"icdr_grade": str(icdr_grade), "session": session_code}
        )
        uploaded_paths["enhanced_path"] = f"{bucket}/{enh_key}"

    # 3. Upload Grad-CAM Explainability Heatmap
    if gradcam_np is not None:
        grad_buf = io.BytesIO()
        Image.fromarray(gradcam_np).save(grad_buf, format="JPEG", quality=95)
        grad_bytes = grad_buf.getvalue()
        grad_key = f"{folder}/gradcam/{base_stem}_gradcam.jpg"
        client.put_object(
            bucket,
            grad_key,
            io.BytesIO(grad_bytes),
            length=len(grad_bytes),
            content_type="image/jpeg",
            metadata={"icdr_grade": str(icdr_grade), "session": session_code}
        )
        uploaded_paths["gradcam_path"] = f"{bucket}/{grad_key}"

    # 4. Upload Vessels overlay (if provided)
    if vessel_np is not None:
        vess_buf = io.BytesIO()
        Image.fromarray(vessel_np).save(vess_buf, format="JPEG", quality=92)
        vess_bytes = vess_buf.getvalue()
        vess_key = f"{folder}/vessels/{base_stem}_vessels.jpg"
        client.put_object(
            bucket,
            vess_key,
            io.BytesIO(vess_bytes),
            length=len(vess_bytes),
            content_type="image/jpeg"
        )
        uploaded_paths["vessels_path"] = f"{bucket}/{vess_key}"

    # 5. Upload Lesions overlay (if provided)
    if lesion_np is not None:
        les_buf = io.BytesIO()
        Image.fromarray(lesion_np).save(les_buf, format="JPEG", quality=92)
        les_bytes = les_buf.getvalue()
        les_key = f"{folder}/lesions/{base_stem}_lesions.jpg"
        client.put_object(
            bucket,
            les_key,
            io.BytesIO(les_bytes),
            length=len(les_bytes),
            content_type="image/jpeg"
        )
        uploaded_paths["lesions_path"] = f"{bucket}/{les_key}"

    logger.info("Fundus image %s successfully stored in MinIO under %s", base_stem, folder)
    return uploaded_paths
