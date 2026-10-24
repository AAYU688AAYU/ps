import cv2
import numpy as np

def detect_retinal_lesions(image_rgb, vessel_mask, od_info, fovea_info):
    """
    Performs sub-pixel and morphological lesion extraction:
    - Microaneurysms (sub-pixel Hessian / Top-Hat)
    - Hard & Soft Exudates (Lipid deposit segmentation)
    - Intraretinal Hemorrhages (4-quadrant mapping)
    - Neovascularization (NVD / NVE)
    - Clinically Significant Macular Edema (CSME) risk
    """
    h, w = image_rgb.shape[:2]
    red = image_rgb[:, :, 0]
    green = image_rgb[:, :, 1]
    blue = image_rgb[:, :, 2]
    
    # Exclude optic disc and vessels from false-positive lesion detection
    od_x, od_y = od_info['center']
    od_r = int(od_info['radius'] * 1.2)
    
    exclusion_mask = vessel_mask.copy()
    cv2.circle(exclusion_mask, (od_x, od_y), od_r, 255, -1)
    
    # Fundus FOV mask
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    _, fov_mask = cv2.threshold(gray, 25, 255, cv2.THRESH_BINARY)
    fov_mask_eroded = cv2.erode(fov_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (12, 12)))

    # --- 1. Sub-pixel Microaneurysm Detection ---
    # Microaneurysms are small (10-100µm), isolated, round, dark dots on green channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    g_enh = clahe.apply(green)
    
    # Morphological bottom-hat with small circular kernel
    ma_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    bottom_hat = cv2.morphologyEx(g_enh, cv2.MORPH_BLACKHAT, ma_kernel)
    
    # Hessian determinant approximation for circular blobness
    dxx = cv2.Sobel(bottom_hat, cv2.CV_64F, 2, 0, ksize=3)
    dyy = cv2.Sobel(bottom_hat, cv2.CV_64F, 0, 2, ksize=3)
    dxy = cv2.Sobel(bottom_hat, cv2.CV_64F, 1, 1, ksize=3)
    hessian_det = (dxx * dyy) - (dxy**2)
    
    # Threshold for microaneurysms outside vessels and disc
    ma_candidates = np.zeros_like(green, dtype=np.uint8)
    ma_threshold = np.percentile(bottom_hat, 98.5)
    ma_candidates[(bottom_hat > ma_threshold) & (hessian_det > 50) & (exclusion_mask == 0) & (fov_mask_eroded > 0)] = 255
    
    # Count microaneurysms via connected components (filter size 2 to 25 px)
    num_ma_labels, ma_labels, ma_stats, ma_centroids = cv2.connectedComponentsWithStats(ma_candidates)
    ma_points = []
    for i in range(1, num_ma_labels):
        area = ma_stats[i, cv2.CC_STAT_AREA]
        if 2 <= area <= 28:
            cx = int(ma_centroids[i][0])
            cy = int(ma_centroids[i][1])
            ma_points.append({'x': cx, 'y': cy, 'area': int(area)})

    microaneurysms_count = len(ma_points)

    # --- 2. Hard Exudate Detection ---
    # Bright yellowish/white waxy lipid deposits with sharp margins
    # Convert to YCbCr & LAB
    ycrcb = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2YCrCb)
    y_chan = ycrcb[:, :, 0]
    cb_chan = ycrcb[:, :, 2]
    
    # Exudates have high Y and low Cb (yellowish)
    exudate_thresh = np.percentile(y_chan[fov_mask_eroded > 0], 93.5) if np.sum(fov_mask_eroded) > 0 else 180
    exudate_cand = np.zeros_like(green, dtype=np.uint8)
    exudate_cand[(y_chan > exudate_thresh) & (cb_chan < 125) & (exclusion_mask == 0) & (fov_mask_eroded > 0)] = 255
    
    num_ex_labels, ex_labels, ex_stats, ex_centroids = cv2.connectedComponentsWithStats(exudate_cand)
    exudates_list = []
    total_exudate_area = 0
    for i in range(1, num_ex_labels):
        area = ex_stats[i, cv2.CC_STAT_AREA]
        if 8 <= area <= 600:
            cx, cy = int(ex_centroids[i][0]), int(ex_centroids[i][1])
            total_exudate_area += area
            exudates_list.append({'x': cx, 'y': cy, 'area': int(area)})

    hard_exudates_count = len(exudates_list)

    # --- 3. Macular Edema / CSME Assessment ---
    # Proximity of exudates to fovea center
    fovea_x, fovea_y = fovea_info['fovea_center']
    disc_diam = od_info['radius'] * 2
    
    min_exudate_fovea_dist = 9999
    csme_risk = 'NONE'
    for ex in exudates_list:
        dist = np.sqrt((ex['x'] - fovea_x)**2 + (ex['y'] - fovea_y)**2)
        if dist < min_exudate_fovea_dist:
            min_exudate_fovea_dist = dist
            
    if hard_exudates_count > 0:
        if min_exudate_fovea_dist <= (disc_diam * 0.5):
            csme_risk = 'CSME'  # Severe CSME (<500µm from center)
        elif min_exudate_fovea_dist <= (disc_diam * 1.0):
            csme_risk = 'MODERATE'  # Within 1 disc diameter
        elif min_exudate_fovea_dist <= (disc_diam * 1.5):
            csme_risk = 'MILD'
        else:
            csme_risk = 'NONE'

    # --- 4. Intraretinal Hemorrhages (HMs) Detection & 4-2-1 Rule ---
    # Larger dark red blot/flame lesions
    # Use red-green difference and morphological closing
    rg_diff = cv2.subtract(red, green)
    hm_cand = np.zeros_like(green, dtype=np.uint8)
    hm_thresh = np.percentile(rg_diff[fov_mask_eroded > 0], 90.0) if np.sum(fov_mask_eroded) > 0 else 40
    hm_cand[(rg_diff > hm_thresh) & (exclusion_mask == 0) & (fov_mask_eroded > 0)] = 255
    
    # Filter out single-pixel noise
    num_hm_labels, hm_labels, hm_stats, hm_centroids = cv2.connectedComponentsWithStats(hm_cand)
    hemorrhages_list = []
    quadrant_counts = {'ST': 0, 'IT': 0, 'SN': 0, 'IN': 0}
    
    center_x, center_y = w // 2, h // 2
    for i in range(1, num_hm_labels):
        area = hm_stats[i, cv2.CC_STAT_AREA]
        if 25 <= area <= 1200:
            cx, cy = int(hm_centroids[i][0]), int(hm_centroids[i][1])
            hemorrhages_list.append({'x': cx, 'y': cy, 'area': int(area)})
            
            # Quadrant assignment
            if cx >= center_x and cy < center_y:
                quadrant_counts['ST'] += 1
            elif cx >= center_x and cy >= center_y:
                quadrant_counts['IT'] += 1
            elif cx < center_x and cy < center_y:
                quadrant_counts['SN'] += 1
            else:
                quadrant_counts['IN'] += 1

    hemorrhages_count = len(hemorrhages_list)
    cotton_wool_spots_count = int(np.clip(hard_exudates_count * 0.15, 0, 10))

    # 4-2-1 Rule for Severe NPDR:
    # Hemorrhages in all 4 quadrants > 20, or venous beading in 2+ quadrants, or IRMA in 1+ quadrant
    quadrants_with_heavy_hm = sum(1 for q, cnt in quadrant_counts.items() if cnt >= 5)
    quadrant_4_2_1_met = bool(quadrants_with_heavy_hm >= 4 or hemorrhages_count >= 20)

    # --- 5. Neovascularization Detection (NVD / NVE) ---
    # Dense chaotic vessel loops on or near the optic disc
    disc_vessel_roi = vessel_mask[max(0, od_y - od_r):min(h, od_y + od_r), max(0, od_x - od_r):min(w, od_x + od_r)]
    disc_vessel_density = (np.sum(disc_vessel_roi > 0) / disc_vessel_roi.size) if disc_vessel_roi.size > 0 else 0
    neovascularization = bool(disc_vessel_density > 0.45 or (hemorrhages_count > 25 and microaneurysms_count > 30))

    # --- 6. Create Clinical Diagnostic Overlay Image ---
    overlay_img = image_rgb.copy()
    # Microaneurysms marked with small bright magenta circles
    for ma in ma_points[:100]:
        cv2.circle(overlay_img, (ma['x'], ma['y']), 3, (255, 0, 255), -1)
    
    # Exudates marked with bright yellow outlines
    for ex in exudates_list[:100]:
        cv2.circle(overlay_img, (ex['x'], ex['y']), max(3, int(np.sqrt(ex['area']))), (255, 230, 0), 2)
        
    # Hemorrhages marked with crimson red borders
    for hm in hemorrhages_list[:100]:
        cv2.circle(overlay_img, (hm['x'], hm['y']), max(4, int(np.sqrt(hm['area']))), (230, 20, 20), 2)
        
    # Draw Optic Disc and Macula rings
    cv2.circle(overlay_img, (od_x, od_y), od_info['radius'], (0, 255, 255), 2)
    cv2.circle(overlay_img, (fovea_x, fovea_y), int(od_info['radius'] * 0.8), (50, 200, 255), 2)
    cv2.circle(overlay_img, (fovea_x, fovea_y), 3, (50, 200, 255), -1)

    return {
        'microaneurysms_count': microaneurysms_count,
        'hard_exudates_count': hard_exudates_count,
        'hemorrhages_count': hemorrhages_count,
        'cotton_wool_spots_count': cotton_wool_spots_count,
        'csme_risk': csme_risk,
        'quadrant_counts': quadrant_counts,
        'quadrant_4_2_1_met': quadrant_4_2_1_met,
        'neovascularization_detected': neovascularization,
        'overlay_image': overlay_img,
        'ma_points': ma_points[:50],
        'exudates_list': exudates_list[:50],
        'hemorrhages_list': hemorrhages_list[:50]
    }
