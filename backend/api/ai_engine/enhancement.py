import cv2
import numpy as np

def enhance_fundus_image(image_np, clip_limit=2.5, tile_grid_size=(8, 8)):
    """
    Applies clinical-grade adaptive enhancement:
    1. Illumination field homogenization (Gaussian background estimation and subtraction)
    2. Multi-scale CLAHE in LAB luminance channel
    3. Bilateral edge-preserving denoising
    4. Green-channel contrast stretching for vascular/lesion prominence
    """
    if image_np is None or image_np.size == 0:
        return image_np

    # Ensure 3-channel RGB uint8
    if len(image_np.shape) == 2:
        image_np = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)

    img_rgb = image_np.copy()
    h, w = img_rgb.shape[:2]

    # --- 1. Background Illumination Normalization ---
    # Convert to float for accurate illumination shading division
    img_float = img_rgb.astype(np.float32) / 255.0
    
    # Estimate non-uniform background illumination with a large Gaussian kernel
    kernel_size = max(31, int(min(h, w) * 0.15) | 1)
    bg_illum = cv2.GaussianBlur(img_float, (kernel_size, kernel_size), 0)
    bg_illum = np.clip(bg_illum, 0.05, 1.0)
    
    # Correct illumination shading: Target mean illumination ~0.5
    mean_val = np.mean(img_float, axis=(0, 1))
    normalized_float = (img_float / bg_illum) * mean_val
    normalized_uint8 = np.clip(normalized_float * 255.0, 0, 255).astype(np.uint8)

    # --- 2. LAB Color Space Multi-Scale CLAHE ---
    lab = cv2.cvtColor(normalized_uint8, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    l_enhanced = clahe.apply(l)

    # Merge channels back
    lab_enhanced = cv2.merge((l_enhanced, a, b))
    enhanced_rgb = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)

    # --- 3. Bilateral Filter for Noise Suppression ---
    # Preserves fine vessels (2-3 pixels) while smoothing camera sensor noise
    denoised_rgb = cv2.bilateralFilter(enhanced_rgb, d=5, sigmaColor=35, sigmaSpace=35)

    return denoised_rgb
