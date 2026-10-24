"""
Retinal Eye Laterality Detection (Left Eye vs. Right Eye Classification)
Module for Automatic OD (Right Eye) / OS (Left Eye) Determination.
Based on: 'left_right.py' (Completed and fixed).
"""

import cv2
import numpy as np


def detect_eye_laterality(img, fov_center=None, fov_radius=None):
    """
    Classifies a retinal fundus image as 'Right Eye (OD)' or 'Left Eye (OS)'
    using optical intensity localization of the Optic Nerve Head (Optic Disc).

    Anatomical Principle:
    - The Optic Disc is located on the nasal side (toward the nose).
    - The Macula / Fovea is located on the temporal side (toward the ear).
    - In standard fundus photography:
        * Right Eye (OD): Optic Disc appears on the right half of the image.
        * Left Eye (OS): Optic Disc appears on the left half of the image.

    Parameters:
        img (np.ndarray): RGB or BGR fundus image.
        fov_center (tuple): Optional pre-calculated (cx, cy).
        fov_radius (int): Optional pre-calculated radius.

    Returns:
        dict: {
            'laterality': str,         # 'Right Eye (OD)' or 'Left Eye (OS)'
            'eye_code': str,           # 'OD' or 'OS'
            'confidence': float,       # 0.50 to 1.00
            'od_loc': tuple,           # (x, y) coordinates of detected disc
            'retina_center': tuple,    # (cx, cy) of retina
            'offset_ratio': float      # displacement ratio from center
        }
    """
    if img is None or not isinstance(img, np.ndarray) or img.size == 0:
        return {
            'laterality': 'Unknown',
            'eye_code': 'OD',
            'confidence': 0.50,
            'od_loc': None,
            'retina_center': None,
            'offset_ratio': 0.0
        }

    h, w = img.shape[:2]

    # Convert to grayscale for border/FOV detection
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        # Red channel is best for Optic Disc luminance
        red = img[:, :, 0]
    else:
        gray = img
        red = img

    # Step 1: Detect retina boundary if not supplied
    if fov_center is None or fov_radius is None:
        _, binary = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if contours:
            retinal_contour = max(contours, key=cv2.contourArea)
            (cx, cy), radius = cv2.minEnclosingCircle(retinal_contour)
            cx, cy, radius = int(cx), int(cy), int(radius)
        else:
            cx, cy = w // 2, h // 2
            radius = min(h, w) // 2
    else:
        cx, cy = fov_center
        radius = fov_radius

    # Step 2: Create an eroded circular mask (shrink by 12% to exclude bright border glare)
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, (cx, cy), max(10, int(radius * 0.88)), 255, thickness=-1)

    # Step 3: Gaussian blur on Red channel to smooth fine vessels and isolate disc peak
    ksize_od = max(15, int(radius * 0.15) | 1)
    blurred_red = cv2.GaussianBlur(red, (ksize_od, ksize_od), 0)

    # Step 4: Find maximum brightness within valid mask
    _, max_val, _, od_loc = cv2.minMaxLoc(blurred_red, mask=mask)
    od_x, od_y = od_loc

    # Step 5: Classify Laterality based on horizontal position relative to center
    delta_x = od_x - cx
    offset_ratio = abs(delta_x) / max(1, radius)

    # Confidence scales with the anatomical offset (OD is usually ~0.3 - 0.6 radius away from center)
    confidence = float(np.clip(0.55 + (offset_ratio * 0.8), 0.50, 0.98))

    if delta_x >= 0:
        laterality = 'Right Eye (OD)'
        eye_code = 'OD'
    else:
        laterality = 'Left Eye (OS)'
        eye_code = 'OS'

    return {
        'laterality': laterality,
        'eye_code': eye_code,
        'confidence': round(confidence, 2),
        'od_loc': (int(od_x), int(od_y)),
        'retina_center': (int(cx), int(cy)),
        'offset_ratio': round(float(offset_ratio), 3)
    }
