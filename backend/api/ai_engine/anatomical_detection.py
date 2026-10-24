"""
Anatomical Landmark Detection & Clinical Validity Assessment
Verifies the presence of the Optic Disc, Blood Vessels, and Macula.
Based on: '#anatomical detection.py' (Fixed and enhanced).
"""

import cv2
import numpy as np


def assess_fundus_landmarks(img, fov_mask=None, fov_center=None, fov_radius=None):
    """
    Verifies the presence and readability of the 3 primary anatomical structures:
    1. Retinal Blood Vessels (Green Channel Top-Hat Morphology & Otsu Density)
    2. Optic Disc (Red Channel Peak Gaussian Localization)
    3. Macula / Fovea Centralis (Temporal Dark Depression ROI)

    Parameters:
        img (np.ndarray): Input RGB fundus image.
        fov_mask (np.ndarray): Optional binary mask of valid retina.
        fov_center (tuple): Optional (cx, cy) tuple.
        fov_radius (int): Optional retina radius.

    Returns:
        dict: {
            'decision': 'KEEP' or 'REJECT',
            'reason': str,
            'details': {
                'vessels': bool,
                'optic_disc': bool,
                'macula': bool,
                'vessel_density_pct': float,
                'od_loc': tuple,
                'macula_loc': tuple
            }
        }
    """
    if img is None or not isinstance(img, np.ndarray) or img.size == 0:
        return {
            'decision': 'REJECT',
            'reason': 'Invalid or empty image array',
            'details': {
                'vessels': False,
                'optic_disc': False,
                'macula': False,
                'vessel_density_pct': 0.0
            }
        }

    h, w = img.shape[:2]

    # In RGB: channel 0 is Red, 1 is Green, 2 is Blue
    if len(img.shape) == 3:
        red = img[:, :, 0]
        green = img[:, :, 1]
    else:
        red = img
        green = img

    # --- Step 1: Field of View (FOV) Mask ---
    if fov_mask is None or fov_center is None or fov_radius is None:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) if len(img.shape) == 3 else img
        _, binary = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return {
                'decision': 'REJECT',
                'reason': 'Retina boundary not found',
                'details': {'vessels': False, 'optic_disc': False, 'macula': False, 'vessel_density_pct': 0.0}
            }

        retinal_contour = max(contours, key=cv2.contourArea)
        (cx, cy), radius = cv2.minEnclosingCircle(retinal_contour)
        cx, cy, radius = int(cx), int(cy), int(radius)
        
        # Inset mask by 10% to prevent edge artifacts
        fov_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(fov_mask, (cx, cy), max(10, int(radius * 0.90)), 255, thickness=-1)
    else:
        cx, cy = fov_center
        radius = fov_radius

    # --- Step 2: Blood Vessel Density Check (Top-Hat on Green Channel) ---
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_green = clahe.apply(green)

    kernel_size = max(9, int(radius * 0.05) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    vessels_raw = cv2.morphologyEx(enhanced_green, cv2.MORPH_BLACKHAT, kernel)
    vessels_raw = cv2.bitwise_and(vessels_raw, vessels_raw, mask=fov_mask)

    _, vessel_bin = cv2.threshold(vessels_raw, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask_pixels = np.count_nonzero(fov_mask)
    vessel_pixels = np.count_nonzero(vessel_bin & fov_mask)
    vessel_density = (vessel_pixels / mask_pixels * 100.0) if mask_pixels > 0 else 0.0
    
    # Healthy retina captures have at least ~1.8% to 4% vessel pixel coverage
    vessels_found = bool(vessel_density >= 1.5)

    # --- Step 3: Optic Disc Detection (Peak in Red Channel) ---
    ksize_od = max(15, int(radius * 0.15) | 1)
    blurred_red = cv2.GaussianBlur(
        cv2.bitwise_and(red, red, mask=fov_mask), (ksize_od, ksize_od), 0
    )
    _, max_val, _, od_loc = cv2.minMaxLoc(blurred_red, mask=fov_mask)
    mean_red = cv2.mean(red, mask=fov_mask)[0]
    mean_green = cv2.mean(green, mask=fov_mask)[0]

    # OD must exhibit a distinct bright peak relative to the eye background illumination
    od_found = bool(max_val > (mean_red * 1.15) and max_val > 75)

    # --- Step 4: Macula Detection (Dark Region on Temporal Side of OD) ---
    macula_found = False
    macula_loc = (cx, cy)

    if od_found:
        od_x, od_y = od_loc
        # If OD is on right half (Right Eye), macula is to its left (-1); vice versa
        direction = -1 if od_x > cx else 1

        # Distance between OD and macula is approximately 2 to 2.5 disc diameters (~0.35-0.5 of radius)
        expected_macula_x = int(cx + (direction * radius * 0.30))
        expected_macula_y = cy

        # Search bounding box
        box_r = int(radius * 0.22)
        x1 = max(0, expected_macula_x - box_r)
        x2 = min(w, expected_macula_x + box_r)
        y1 = max(0, expected_macula_y - box_r)
        y2 = min(h, expected_macula_y + box_r)

        macula_roi_green = green[y1:y2, x1:x2]
        if macula_roi_green.size > 0:
            macula_min_val = np.min(macula_roi_green)
            # Macula is darker than average eye fundus green background
            macula_found = bool(macula_min_val < (mean_green * 0.90) or macula_min_val < 65)
            min_loc_roi = np.unravel_index(np.argmin(macula_roi_green), macula_roi_green.shape)
            macula_loc = (int(x1 + min_loc_roi[1]), int(y1 + min_loc_roi[0]))
    else:
        # Fallback: Check central area
        central_roi = green[max(0, cy - 30):min(h, cy + 30), max(0, cx - 30):min(w, cx + 30)]
        if central_roi.size > 0:
            macula_found = bool(np.mean(central_roi) > 20)

    # --- Step 5: Decision Compilation ---
    landmarks_status = {
        'vessels': vessels_found,
        'optic_disc': od_found,
        'macula': macula_found,
        'vessel_density_pct': round(float(vessel_density), 2),
        'od_loc': (int(od_loc[0]), int(od_loc[1])) if od_found else None,
        'macula_loc': (int(macula_loc[0]), int(macula_loc[1])) if macula_found else None
    }

    if vessels_found and od_found and macula_found:
        return {
            'decision': 'KEEP',
            'reason': 'All critical retinal landmarks present and readable.',
            'details': landmarks_status
        }
    else:
        missing = [k for k in ['vessels', 'optic_disc', 'macula'] if not landmarks_status[k]]
        return {
            'decision': 'REJECT',
            'reason': f"Insufficient quality: missing or obscured {', '.join(missing)}.",
            'details': landmarks_status
        }
