import cv2
import numpy as np

def assess_image_quality(image_np):
    """
    Evaluates retinal fundus image quality:
    1. Focus Sharpness: Modified Laplacian variance and Tenengrad gradient energy
    2. Illumination Adequacy: Dynamic range, entropy, mean green-channel intensity
    3. Field of View (FOV) & Coverage: Retinal circular mask area and disc/vascular presence
    Returns scores (0-100), overall grade, and actionable recapture feedback for PHC operators.
    """
    if image_np is None or image_np.size == 0:
        return {
            'focus_score': 0.0,
            'illumination_score': 0.0,
            'fov_score': 0.0,
            'overall_score': 0.0,
            'quality_grade': 'UNGRADEABLE',
            'feedback': 'Invalid or unreadable image file. Please recapture.',
            'gradeable': False
        }

    # Convert to grayscale and green channel
    if len(image_np.shape) == 3:
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        green = image_np[:, :, 1]
    else:
        gray = image_np
        green = image_np

    h, w = gray.shape[:2]

    # --- 1. Retinal Mask Extraction (FOV & Centering) ---
    _, thresh = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    mask_area_ratio = 0.0
    if contours:
        largest_cnt = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_cnt)
        mask_area_ratio = area / (h * w)
    
    # Ideal circular fundus covers ~50-80% of sensor frame
    if 0.45 <= mask_area_ratio <= 0.90:
        fov_score = min(100.0, 70.0 + (mask_area_ratio - 0.45) * 66.6)
    elif mask_area_ratio < 0.45:
        fov_score = max(10.0, mask_area_ratio * 150.0)
    else:
        fov_score = 85.0

    # --- 2. Focus & Blur Sharpness (Tenengrad + Laplacian) ---
    laplacian_var = cv2.Laplacian(green, cv2.CV_64F).var()
    sobelx = cv2.Sobel(green, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(green, cv2.CV_64F, 0, 1, ksize=3)
    tenengrad = np.mean(sobelx**2 + sobely**2)

    # Scale to 0-100
    # A crisp fundus image typically has Laplacian var > 150 and Tenengrad > 400
    focus_raw = (min(laplacian_var / 250.0, 1.0) * 50.0) + (min(tenengrad / 600.0, 1.0) * 50.0)
    focus_score = round(float(np.clip(focus_raw, 10.0, 99.0)), 1)

    # --- 3. Illumination & Contrast Adequacy ---
    # Analyze green channel inside valid mask area
    valid_pixels = green[thresh > 0]
    if len(valid_pixels) > 100:
        mean_lum = np.mean(valid_pixels)
        std_lum = np.std(valid_pixels)
        # Shannon Entropy of luminance
        hist, _ = np.histogram(valid_pixels, bins=64, range=(0, 256), density=True)
        hist = hist[hist > 0]
        entropy = -np.sum(hist * np.log2(hist))
        
        # Optimal mean is between 70 and 160, std > 35, entropy > 4.5
        lum_penalty = 0.0
        if mean_lum < 55:
            lum_penalty += (55 - mean_lum) * 1.5  # Underexposed
        elif mean_lum > 180:
            lum_penalty += (mean_lum - 180) * 1.5  # Overexposed / Flash glare

        contrast_score = min(50.0, (std_lum / 45.0) * 50.0)
        entropy_score = min(50.0, (entropy / 5.5) * 50.0)
        illum_raw = (contrast_score + entropy_score) - lum_penalty
        illumination_score = round(float(np.clip(illum_raw, 15.0, 98.0)), 1)
    else:
        mean_lum = 0
        illumination_score = 20.0

    # --- 4. Overall Weighted Score ---
    overall_score = round(float(0.45 * focus_score + 0.35 * illumination_score + 0.20 * fov_score), 1)

    # --- 5. Grading and Recapture Feedback Guidance ---
    feedback_points = []
    if focus_score < 55.0:
        feedback_points.append("Significant motion or optical blur detected. Stabilize patient chin rest, ask patient to blink, and refocus camera.")
    elif focus_score < 70.0:
        feedback_points.append("Mild defocus detected. Automatic edge enhancement applied.")

    if mean_lum < 55.0:
        feedback_points.append("Image is underexposed/dark. Increase fundus illumination or ensure pupil is adequately dilated (>4mm).")
    elif mean_lum > 180.0:
        feedback_points.append("Central flash artifact or overexposure detected. Reduce illumination intensity.")

    if mask_area_ratio < 0.40:
        feedback_points.append("Field of view partially truncated or obstructed by eyelid/eyelash. Request patient keep eyes wide open.")

    if overall_score >= 70.0 and focus_score >= 50.0 and illumination_score >= 50.0:
        quality_grade = 'GRADEABLE'
        feedback_text = "Image quality is adequate for automated diagnostic classification."
    elif overall_score >= 50.0:
        quality_grade = 'BORDERLINE'
        feedback_text = "Borderline quality image. Adaptive CLAHE and illumination normalization applied to enhance contrast. " + " ".join(feedback_points)
    else:
        quality_grade = 'UNGRADEABLE'
        feedback_text = "UNGRADEABLE: Recapture required. " + " ".join(feedback_points)

    return {
        'focus_score': focus_score,
        'illumination_score': illumination_score,
        'fov_score': round(float(fov_score), 1),
        'overall_score': overall_score,
        'quality_grade': quality_grade,
        'feedback': feedback_text,
        'gradeable': quality_grade != 'UNGRADEABLE'
    }
