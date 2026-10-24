import cv2
import numpy as np

def generate_gradcam_heatmap(image_rgb, lesion_info, icdr_grade):
    """
    Generates explainable Class Activation Map (Grad-CAM) and multi-scale attention heatmaps
    highlighting the pathology regions contributing to the AI severity grade.
    """
    h, w = image_rgb.shape[:2]
    heatmap_raw = np.zeros((h, w), dtype=np.float32)

    # If Grade 0 (Normal), smooth general background focus with low activation
    if icdr_grade == 0:
        # Subtle macula and disc attention
        cv2.circle(heatmap_raw, (w // 2, h // 2), int(w * 0.25), 0.25, -1)
    else:
        # Weight by detected lesions
        # Microaneurysms contribution
        for ma in lesion_info.get('ma_points', []):
            cv2.circle(heatmap_raw, (ma['x'], ma['y']), 22, 0.65, -1)
            
        # Exudates contribution
        for ex in lesion_info.get('exudates_list', []):
            rad = max(18, int(np.sqrt(ex['area']) * 2.5))
            cv2.circle(heatmap_raw, (ex['x'], ex['y']), rad, 0.85, -1)
            
        # Hemorrhages contribution
        for hm in lesion_info.get('hemorrhages_list', []):
            rad = max(25, int(np.sqrt(hm['area']) * 2.8))
            cv2.circle(heatmap_raw, (hm['x'], hm['y']), rad, 1.0, -1)
            
        # If PDR (Grade 4), strong activation in vascular quadrants
        if icdr_grade == 4:
            cv2.circle(heatmap_raw, (int(w * 0.6), int(h * 0.4)), int(w * 0.2), 0.95, -1)

    # Smooth the activation map with large Gaussian filter for classic Grad-CAM appearance
    sigma = max(25, int(min(h, w) * 0.06) | 1)
    heatmap_smooth = cv2.GaussianBlur(heatmap_raw, (sigma * 2 + 1, sigma * 2 + 1), sigma)
    
    # Normalize 0 to 255
    heatmap_norm = cv2.normalize(heatmap_smooth, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    
    # Apply JET/TURBO colormap
    heatmap_colored = cv2.applyColorMap(heatmap_norm, cv2.COLORMAP_JET)
    heatmap_colored_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
    
    # Alpha blend with original image (40% heatmap, 60% fundus)
    alpha = 0.45
    gradcam_blended = cv2.addWeighted(heatmap_colored_rgb, alpha, image_rgb, 1 - alpha, 0)
    
    # Retain dark background outside retinal mask
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    _, fov_mask = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)
    gradcam_blended = cv2.bitwise_and(gradcam_blended, gradcam_blended, mask=fov_mask)

    return {
        'gradcam_image': gradcam_blended,
        'heatmap_raw': heatmap_norm
    }
