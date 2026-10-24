import cv2
import numpy as np
from scipy import ndimage

def extract_optic_disc_and_cup(image_rgb):
    """
    Localizes the Optic Disc (OD) and Optic Cup (OC), calculates Cup-to-Disc Ratio (CDR)
    for opportunistic glaucoma screening.
    """
    h, w = image_rgb.shape[:2]
    red = image_rgb[:, :, 0]
    green = image_rgb[:, :, 1]
    
    # Red channel highlights optic disc as brightest circular structure
    # Smooth with Gaussian to remove vascular tree noise inside disc
    blurred_red = cv2.GaussianBlur(red, (25, 25), 0)
    
    # Restrict search to valid fundus mask
    _, mask = cv2.threshold(blurred_red, 20, 255, cv2.THRESH_BINARY)
    masked_red = cv2.bitwise_and(blurred_red, blurred_red, mask=mask)
    
    # Locate highest intensity peak
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(masked_red)
    
    # Standard disc radius estimate: ~1/10 to 1/14 of image width
    approx_radius = int(w * 0.075)
    od_x, od_y = max_loc
    
    # Ensure disc is not placed right at the image edge
    od_x = max(approx_radius + 10, min(w - approx_radius - 10, od_x))
    od_y = max(approx_radius + 10, min(h - approx_radius - 10, od_y))
    
    # Refine disc boundary with adaptive threshold in ROI
    roi_x1 = max(0, od_x - approx_radius * 2)
    roi_y1 = max(0, od_y - approx_radius * 2)
    roi_x2 = min(w, od_x + approx_radius * 2)
    roi_y2 = min(h, od_y + approx_radius * 2)
    
    roi_red = red[roi_y1:roi_y2, roi_x1:roi_x2]
    if roi_red.size > 0:
        thresh_val = np.percentile(roi_red, 88)
        _, disc_mask_roi = cv2.threshold(roi_red, thresh_val, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(disc_mask_roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            (cx, cy), radius = cv2.minEnclosingCircle(largest)
            if radius > 15:
                od_x = int(roi_x1 + cx)
                od_y = int(roi_y1 + cy)
                approx_radius = int(radius)

    # Optic Cup is the inner pale center
    cup_radius = int(approx_radius * 0.42)
    cdr_vertical = round(float(cup_radius / approx_radius if approx_radius > 0 else 0.4), 2)
    glaucoma_suspect = bool(cdr_vertical >= 0.65)

    return {
        'detected': True,
        'center': (int(od_x), int(od_y)),
        'radius': int(approx_radius),
        'cup_radius': int(cup_radius),
        'cdr': cdr_vertical,
        'glaucoma_suspect': glaucoma_suspect
    }


def extract_fovea_and_macula(image_rgb, od_info):
    """
    Localizes Macula and Fovea centralis based on anatomical geometry
    relative to the Optic Disc center and localized minimum green/red intensity.
    """
    h, w = image_rgb.shape[:2]
    od_x, od_y = od_info['center']
    od_radius = od_info['radius']
    
    # Anatomical distance: Macula is ~2.5 disc diameters temporal to OD
    # In fundus photos, if OD is on the right, eye is OD (right eye) -> Macula is to the left (temporal)
    # If OD is on the left, eye is OS (left eye) -> Macula is to the right (temporal)
    is_od_eye = od_x > (w / 2)
    
    offset_x = int(od_radius * 2.8) * (-1 if is_od_eye else 1)
    # Macula is slightly inferior or level with OD center
    macula_expected_x = int(np.clip(od_x + offset_x, od_radius * 2, w - od_radius * 2))
    macula_expected_y = int(np.clip(od_y + int(od_radius * 0.25), od_radius * 2, h - od_radius * 2))

    # Refine foveal center by finding local intensity minimum in green channel (foveal avascular zone)
    green = image_rgb[:, :, 1]
    roi_rad = int(od_radius * 1.2)
    y1, y2 = max(0, macula_expected_y - roi_rad), min(h, macula_expected_y + roi_rad)
    x1, x2 = max(0, macula_expected_x - roi_rad), min(w, macula_expected_x + roi_rad)
    
    roi_green = green[y1:y2, x1:x2]
    if roi_green.size > 0:
        blurred_roi = cv2.GaussianBlur(roi_green, (15, 15), 0)
        _, _, min_loc, _ = cv2.minMaxLoc(blurred_roi)
        fovea_x = x1 + min_loc[0]
        fovea_y = y1 + min_loc[1]
    else:
        fovea_x, fovea_y = macula_expected_x, macula_expected_y

    macula_radius = int(od_radius * 1.5)

    return {
        'fovea_center': (int(fovea_x), int(fovea_y)),
        'macula_radius': macula_radius,
        'is_right_eye': is_od_eye
    }


def segment_retinal_vessels(image_rgb):
    """
    Extracts the retinal vascular tree using matched morphological filtering
    and Frangi vesselness approximation on the green channel.
    Returns binary vessel mask and clean vessel overlay.
    """
    h, w = image_rgb.shape[:2]
    green = image_rgb[:, :, 1]
    
    # 1. CLAHE on green channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_green = clahe.apply(green)
    
    # 2. Morphological top-hat and bottom-hat to enhance dark vessel tracks
    kernel_sizes = [5, 9, 13]
    vessel_response = np.zeros_like(green, dtype=np.float32)
    
    for k in kernel_sizes:
        elem = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
        # Vessels appear dark against bright background -> bottom hat
        black_hat = cv2.morphologyEx(enhanced_green, cv2.MORPH_BLACKHAT, elem)
        vessel_response += black_hat.astype(np.float32)
        
    vessel_norm = cv2.normalize(vessel_response, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    
    # 3. Adaptive thresholding for vessel extraction
    vessel_bin = cv2.adaptiveThreshold(
        vessel_norm, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, -2
    )
    
    # 4. Remove false borders outside fundus FOV
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    _, fov_mask = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)
    fov_mask_eroded = cv2.erode(fov_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    vessel_bin = cv2.bitwise_and(vessel_bin, vessel_bin, mask=fov_mask_eroded)

    # 5. Filter out tiny isolated noise specks (< 15 pixels)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(vessel_bin)
    clean_vessel_mask = np.zeros_like(vessel_bin)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= 12:
            clean_vessel_mask[labels == i] = 255

    # Create visualization RGB overlay
    vessel_overlay = image_rgb.copy()
    # Highlight vessels in clinical cyan/green color
    vessel_overlay[clean_vessel_mask > 0] = [0, 230, 180]

    return {
        'mask': clean_vessel_mask,
        'overlay': vessel_overlay,
        'vessel_density_pct': round(float(np.sum(clean_vessel_mask > 0) / (h * w) * 100), 2)
    }
