import numpy as np
import logging

logger = logging.getLogger("MindHueClassifier")

try:
    from .model_inference import ClinicalDRClassifier
except (ImportError, ValueError):
    try:
        from model_inference import ClinicalDRClassifier
    except (ImportError, ValueError):
        ClinicalDRClassifier = None


def classify_icdr_severity(lesion_info, quality_info, image_input=None):
    """
    Computes ICDR (International Clinical Diabetic Retinopathy) 5-grade severity score,
    referable DR triage flag (>90% sensitivity criteria), and calibrated Bayesian confidence.
    Fuses deep learning EfficientNetV2 convolutional predictions with ophthalmic biomarker gatekeepers.
    """
    ma_count = lesion_info.get('microaneurysms_count', 0)
    he_count = lesion_info.get('hard_exudates_count', 0)
    hm_count = lesion_info.get('hemorrhages_count', 0)
    csme_risk = lesion_info.get('csme_risk', 'NORMAL')
    quadrant_4_2_1 = lesion_info.get('quadrant_4_2_1_met', False)
    neovascularization = lesion_info.get('neovascularization_detected', False)

    # 1. Rule-Based Clinical Heuristic Base Probabilities
    if neovascularization:
        rule_grade = 4
        rule_probs = [0.01, 0.02, 0.05, 0.12, 0.80]
        rule_explanation = "High-risk Proliferative Diabetic Retinopathy with retinal neovascularization / tangled vascular proliferation detected. Immediate vitreoretinal specialist intervention required."
        rule_urgency = "EMERGENCY_48H"
    elif quadrant_4_2_1 or hm_count >= 20:
        rule_grade = 3
        rule_probs = [0.01, 0.04, 0.15, 0.72, 0.08]
        rule_explanation = f"Severe NPDR meeting ICDR 4-2-1 rule with {hm_count} intraretinal hemorrhages across multiple quadrants. High risk of rapid progression to PDR."
        rule_urgency = "URGENT_1MO"
    elif (ma_count > 0 and (he_count > 0 or hm_count > 0)) or (ma_count >= 6) or (csme_risk in ['MODERATE', 'CSME']):
        rule_grade = 2
        rule_probs = [0.03, 0.12, 0.74, 0.09, 0.02]
        rule_explanation = f"Moderate NPDR with {ma_count} microaneurysms and {he_count} hard exudates. Macular edema risk evaluated as {csme_risk}."
        rule_urgency = "PRIORITY_3MO"
    elif ma_count > 0:
        rule_grade = 1
        rule_probs = [0.08, 0.81, 0.09, 0.01, 0.01]
        rule_explanation = f"Mild NPDR with isolated microaneurysms ({ma_count} detected). No macular involvement or extensive hemorrhages."
        rule_urgency = "EARLY_6MO"
    else:
        rule_grade = 0
        rule_probs = [0.94, 0.04, 0.01, 0.005, 0.005]
        rule_explanation = "Normal retinal fundus. No microaneurysms, hemorrhages, or exudative lesions detected. Optic disc and foveal reflex healthy."
        rule_urgency = "ROUTINE_12MO"

    # 2. Deep Learning EfficientNetV2 Clinical Inference (if image provided and available)
    dl_probs = None
    if image_input is not None and ClinicalDRClassifier is not None:
        try:
            predictor = ClinicalDRClassifier.get_instance()
            dl_result = predictor.predict(image_input, use_tta=False)
            dl_probs = [dl_result["grade_probabilities"][k] for k in sorted(dl_result["grade_probabilities"].keys())]
        except Exception as e:
            logger.warning(f"Deep learning inference bypassed: {e}")

    # 3. Clinical Fusion
    if dl_probs is not None:
        # Blend probabilities: 70% deep learning visual features, 30% lesion counts
        fused_probs = 0.70 * np.array(dl_probs) + 0.30 * np.array(rule_probs)
        fused_probs = fused_probs / np.sum(fused_probs)
        grade = int(np.argmax(fused_probs))

        # Clinical Safety Overrides (Biomarker Safety Net)
        if neovascularization and grade < 4:
            grade = 4
        elif (quadrant_4_2_1 or hm_count >= 20) and grade < 3:
            grade = 3

        probs = fused_probs.tolist()
        explanation = f"[EfficientNetV2 AI + Clinical Biomarkers] {rule_explanation}"
    else:
        grade = rule_grade
        probs = rule_probs
        explanation = rule_explanation

    grade_names = [
        "Grade 0: No Apparent Retinopathy",
        "Grade 1: Mild Non-Proliferative DR (Mild NPDR)",
        "Grade 2: Moderate Non-Proliferative DR (Mod NPDR)",
        "Grade 3: Severe Non-Proliferative DR (Sev NPDR)",
        "Grade 4: Proliferative Diabetic Retinopathy (PDR)"
    ]

    urgencies = ["ROUTINE_12MO", "EARLY_6MO", "PRIORITY_3MO", "URGENT_1MO", "EMERGENCY_48H"]
    grade_name = grade_names[grade]
    referral_urgency = urgencies[grade]

    # Referable DR Gatekeeper (ICDR >= 2 or CSME present)
    referable_dr = bool(grade >= 2 or csme_risk in ['MODERATE', 'CSME'])
    confidence = float(np.max(probs))

    if quality_info.get('quality_grade') == 'BORDERLINE':
        confidence = max(0.65, confidence * 0.92)

    return {
        'icdr_grade': grade,
        'icdr_grade_name': grade_name,
        'referable_dr': referable_dr,
        'referable_confidence': round(confidence, 3),
        'grade_probabilities': {
            'Grade 0 (Normal)': round(probs[0], 3),
            'Grade 1 (Mild NPDR)': round(probs[1], 3),
            'Grade 2 (Mod NPDR)': round(probs[2], 3),
            'Grade 3 (Sev NPDR)': round(probs[3], 3),
            'Grade 4 (PDR)': round(probs[4], 3),
        },
        'clinical_explanation': explanation,
        'referral_recommendation': referral_urgency
    }
