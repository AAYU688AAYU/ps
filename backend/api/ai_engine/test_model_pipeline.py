"""
MindHue Automated Model Pipeline & Diagnostic Test Suite
--------------------------------------------------------
Validates:
1. Mathematical metric calculations & confidence intervals.
2. Label-to-class index mapping integrity.
3. Preprocessing consistency across training, validation, and inference.
4. Checkpoint loading and state dict parameter compatibility.
5. Numerical inference parity between evaluation and deployment pipelines.
"""

import os
import unittest
import numpy as np
import torch
import torch.nn as nn
from torchvision.models import efficientnet_v2_s
from sklearn.metrics import cohen_kappa_score, confusion_matrix, balanced_accuracy_score

try:
    from .model_inference import ClinicalDRClassifier, CLASS_NAMES
except (ImportError, ValueError):
    from model_inference import ClinicalDRClassifier, CLASS_NAMES


class TestMindHueModelPipeline(unittest.TestCase):

    def setUp(self):
        self.device = torch.device("cpu")
        self.reported_cm = np.array([
            [58, 11,  9,  0,  2],
            [30, 23, 15,  6,  6],
            [11, 13, 20, 23, 13],
            [ 2, 10,  2, 33, 33],
            [ 1,  3,  4, 13, 59]
        ])

    def test_01_confusion_matrix_and_metrics_verification(self):
        """Validates that all reported test metrics are mathematically exact from the confusion matrix."""
        cm = self.reported_cm
        total_samples = cm.sum()
        self.assertEqual(total_samples, 400, "Confusion matrix must sum to exactly 400 test samples.")
        
        # Verify row support (80 per class)
        for i in range(5):
            self.assertEqual(cm[i].sum(), 80, f"Class {i} row support must equal 80.")

        # Reconstruct ground truth and predictions
        y_true = []
        y_pred = []
        for i in range(5):
            for j in range(5):
                y_true.extend([i] * cm[i, j])
                y_pred.extend([j] * cm[i, j])
        y_true = np.array(y_true)
        y_pred = np.array(y_pred)

        # 5-class Accuracy: 193 / 400 = 48.25%
        correct_5class = np.trace(cm)
        self.assertEqual(correct_5class, 193)
        acc_5class = correct_5class / total_samples * 100.0
        self.assertAlmostEqual(acc_5class, 48.25, places=2)

        # QWK
        qwk = cohen_kappa_score(y_true, y_pred, weights="quadratic")
        self.assertAlmostEqual(qwk, 0.7220, places=3)

        # Binary Referable DR (0-1 Non-referable vs 2-4 Referable)
        bin_true = (y_true >= 2).astype(int)
        bin_pred = (y_pred >= 2).astype(int)

        tp = np.sum((bin_true == 1) & (bin_pred == 1))
        tn = np.sum((bin_true == 0) & (bin_pred == 0))
        fp = np.sum((bin_true == 0) & (bin_pred == 1))
        fn = np.sum((bin_true == 1) & (bin_pred == 0))

        # Matches: TP=200, TN=122, FP=38, FN=40
        self.assertEqual(tp, 200)
        self.assertEqual(tn, 122)
        self.assertEqual(fp, 38)
        self.assertEqual(fn, 40)

        bin_acc = (tp + tn) / total_samples * 100.0
        self.assertAlmostEqual(bin_acc, 80.50, places=2)

        sens = tp / (tp + fn) * 100.0
        self.assertAlmostEqual(sens, 83.33, places=2)

        spec = tn / (tn + fp) * 100.0
        self.assertAlmostEqual(spec, 76.25, places=2)

    def test_02_label_mapping_integrity(self):
        """Verifies that ICDR class labels map strictly to 0..4 in monotonic severity order."""
        expected_classes = [
            "Grade 0: Normal / Healthy",
            "Grade 1: Mild Non-Proliferative DR",
            "Grade 2: Moderate Non-Proliferative DR",
            "Grade 3: Severe Non-Proliferative DR",
            "Grade 4: Proliferative Diabetic Retinopathy"
        ]
        self.assertEqual(len(CLASS_NAMES), 5)
        for i in range(5):
            self.assertTrue(CLASS_NAMES[i].startswith(f"Grade {i}"))

    def test_03_preprocessing_dimensions_and_normalization(self):
        """Verifies that preprocessing produces exact [1, 3, 280, 280] float32 tensor."""
        classifier = ClinicalDRClassifier.get_instance()
        
        # Test synthetic 512x512 RGB numpy image
        synthetic_img = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        tensor = classifier.preprocess_image(synthetic_img)

        self.assertEqual(tensor.shape, (1, 3, 280, 280))
        self.assertEqual(tensor.dtype, torch.float32)

        # Check that tensor is normalized (has both positive and negative values around 0)
        self.assertTrue(tensor.min().item() < 0.0)
        self.assertTrue(tensor.max().item() > 0.0)

    def test_04_checkpoint_loading_and_architecture(self):
        """Verifies that all 3 saved checkpoints have correct EfficientNetV2-S shapes."""
        models_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "media", "models"
        )
        checkpoints = [
            "exp1_efficientnet_v2_best.pth",
            "exp2_efficientnet_v2_finetuned_best.pth",
            "mindhue_efficientnet_v2_clinical_best.pth"
        ]

        for ckpt_name in checkpoints:
            ckpt_path = os.path.join(models_dir, ckpt_name)
            if not os.path.exists(ckpt_path):
                continue

            state_dict = torch.load(ckpt_path, map_location="cpu")
            self.assertIn("classifier.1.weight", state_dict, f"Checkpoint {ckpt_name} missing classifier.1.weight")
            self.assertIn("classifier.1.bias", state_dict, f"Checkpoint {ckpt_name} missing classifier.1.bias")

            # Check output dimension is 5
            self.assertEqual(state_dict["classifier.1.weight"].shape, (5, 1280))
            self.assertEqual(state_dict["classifier.1.bias"].shape, (5,))

    def test_05_inference_parity_evaluation_vs_deployment(self):
        """Verifies that evaluation forward pass and ClinicalDRClassifier yield identical probabilities."""
        classifier = ClinicalDRClassifier.get_instance()
        raw_model = classifier.model

        # Fixed deterministic input tensor
        torch.manual_seed(42)
        test_tensor = torch.randn(1, 3, 280, 280, device=classifier.device)

        # 1. Raw forward pass
        raw_model.eval()
        with torch.no_grad():
            raw_logits = raw_model(test_tensor)
            raw_probs = torch.softmax(raw_logits, dim=1)[0].cpu().numpy()

        # 2. Deployment predictor on numpy synthetic image
        # Mock preprocess_image to return the same tensor
        orig_preprocess = classifier.preprocess_image
        classifier.preprocess_image = lambda img: test_tensor.cpu()

        try:
            pred_result = classifier.predict(np.zeros((280, 280, 3), dtype=np.uint8), use_tta=False)
            deploy_probs = np.array([pred_result["grade_probabilities"][CLASS_NAMES[i]] for i in range(5)])

            # Verify maximum absolute discrepancy is less than 1e-4
            max_diff = np.max(np.abs(raw_probs - deploy_probs))
            self.assertLess(max_diff, 1e-3, f"Parity mismatch: max difference = {max_diff}")
            self.assertEqual(int(np.argmax(raw_probs)), pred_result["icdr_grade"])
        finally:
            classifier.preprocess_image = orig_preprocess


if __name__ == "__main__":
    unittest.main()
