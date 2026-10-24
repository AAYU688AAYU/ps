"""
MindHue Production PyTorch Inference Engine
-------------------------------------------
Thread-safe, singleton clinical classifier for Diabetic Retinopathy grading.
Supports both:
1. Legacy EfficientNetV2-S single-head checkpoints (280x280).
2. Advanced MindHueMultiTaskEfficientNetV2 dual-head checkpoints (448x448, Joint ICDR + Referable DR).
Compatible with Django REST Framework, background workers, and standalone evaluation.
"""

import io
import os
import logging
from typing import Union, Dict, Any
import numpy as np
from PIL import Image
import cv2

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import efficientnet_v2_s
import torchvision.transforms as T

logger = logging.getLogger("MindHueInference")

CLASS_NAMES = [
    "Grade 0: Normal / Healthy",
    "Grade 1: Mild Non-Proliferative DR",
    "Grade 2: Moderate Non-Proliferative DR",
    "Grade 3: Severe Non-Proliferative DR",
    "Grade 4: Proliferative Diabetic Retinopathy"
]

DEFAULT_CHECKPOINT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "media", "models", "mindhue_efficientnet_v2_clinical_best.pth"
)


class MultiTaskHeadModel(nn.Module):
    """Dual-head model wrapper for inference."""
    def __init__(self, in_features=1280):
        super().__init__()
        base = efficientnet_v2_s(weights=None)
        self.features = base.features
        self.avgpool = base.avgpool
        self.head_5class = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, 5)
        )
        self.head_binary = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, 1)
        )

    def forward(self, x):
        feat = self.features(x)
        feat = self.avgpool(feat)
        feat = torch.flatten(feat, 1)
        return self.head_5class(feat), self.head_binary(feat)


class ClinicalDRClassifier:
    """
    Production-grade model wrapper for Diabetic Retinopathy grading.
    Provides single-pass inference and 5-view Test-Time Augmentation (TTA).
    """
    _instance = None

    def __init__(self, checkpoint_path: str = DEFAULT_CHECKPOINT_PATH, device: str = None):
        if device is None:
            if torch.backends.mps.is_available():
                self.device = torch.device("mps")
            elif torch.cuda.is_available():
                self.device = torch.device("cuda")
            else:
                self.device = torch.device("cpu")
        else:
            self.device = torch.device(device)

        self.checkpoint_path = checkpoint_path
        self.is_multitask = False
        self.img_size = (280, 280)

        self.model = self._load_model()

        # Transformation pipeline
        self.transform = T.Compose([
            T.Resize(self.img_size),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        logger.info(f"ClinicalDRClassifier initialized on {self.device} (Multi-Task: {self.is_multitask}, Res: {self.img_size})")

    @classmethod
    def get_instance(cls, checkpoint_path: str = DEFAULT_CHECKPOINT_PATH):
        """Singleton accessor to prevent reloading weights on every HTTP request."""
        if cls._instance is None or cls._instance.checkpoint_path != checkpoint_path:
            cls._instance = cls(checkpoint_path=checkpoint_path)
        return cls._instance

    def _load_model(self) -> nn.Module:
        if not os.path.exists(self.checkpoint_path):
            logger.warning(f"Checkpoint not found at {self.checkpoint_path}. Using standard single-head baseline.")
            model = efficientnet_v2_s()
            in_features = model.classifier[1].in_features
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.4, inplace=True),
                nn.Linear(in_features, 5)
            )
            return model.to(self.device).eval()

        state_dict = torch.load(self.checkpoint_path, map_location=self.device)

        # Detect model type from state_dict keys
        if "head_binary.1.weight" in state_dict or "head_5class.1.weight" in state_dict:
            self.is_multitask = True
            self.img_size = (448, 448)
            model = MultiTaskHeadModel()
            model.load_state_dict(state_dict)
            logger.info("Loaded Multi-Task Dual-Head Checkpoint (5-Class + Binary Referable DR).")
        else:
            self.is_multitask = False
            self.img_size = (280, 280)
            model = efficientnet_v2_s()
            in_features = model.classifier[1].in_features
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.4, inplace=True),
                nn.Linear(in_features, 5)
            )
            model.load_state_dict(state_dict)
            logger.info("Loaded Standard Single-Head Checkpoint.")

        model = model.to(self.device)
        model.eval()
        return model

    def preprocess_image(self, image_input: Union[str, bytes, np.ndarray, Image.Image]) -> torch.Tensor:
        """
        Standardizes any image input to an RGB PyTorch tensor with exact normalization.
        """
        if isinstance(image_input, str):
            pil_img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, (bytes, bytearray)):
            pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, Image.Image):
            pil_img = image_input.convert("RGB")
        elif isinstance(image_input, np.ndarray):
            if image_input.ndim == 3 and image_input.shape[2] == 3:
                # If OpenCV array, convert BGR to RGB
                pil_img = Image.fromarray(image_input[:, :, ::-1] if image_input.dtype == np.uint8 else image_input)
            else:
                pil_img = Image.fromarray(image_input)
            pil_img = pil_img.convert("RGB")
        else:
            raise TypeError(f"Unsupported image input type: {type(image_input)}")

        tensor = self.transform(pil_img)
        return tensor.unsqueeze(0)  # Shape: [1, 3, H, W]

    def predict(self, image_input: Union[str, bytes, np.ndarray, Image.Image], use_tta: bool = False) -> Dict[str, Any]:
        """
        Runs clinical inference and returns structured diagnosis.
        """
        tensor = self.preprocess_image(image_input).to(self.device)

        with torch.no_grad():
            if not self.is_multitask:
                # Standard Single-Head Forward Pass
                if not use_tta:
                    logits = self.model(tensor)
                    probs = torch.softmax(logits, dim=1)[0].cpu().numpy()
                else:
                    p_orig = torch.softmax(self.model(tensor), dim=1)
                    p_hflip = torch.softmax(self.model(torch.flip(tensor, dims=[3])), dim=1)
                    p_vflip = torch.softmax(self.model(torch.flip(tensor, dims=[2])), dim=1)
                    p_rot90 = torch.softmax(self.model(torch.rot90(tensor, k=1, dims=[2, 3])), dim=1)
                    p_rot270 = torch.softmax(self.model(torch.rot90(tensor, k=3, dims=[2, 3])), dim=1)
                    ensemble_prob = torch.stack([p_orig, p_hflip, p_vflip, p_rot90, p_rot270]).mean(dim=0)
                    probs = ensemble_prob[0].cpu().numpy()

                pred_grade = int(np.argmax(probs))
                referable_prob = float(np.sum(probs[2:]))
            else:
                # Multi-Task Dual-Head Forward Pass
                if not use_tta:
                    l5, lb = self.model(tensor)
                    probs = torch.softmax(l5, dim=1)[0].cpu().numpy()
                    bin_prob = float(torch.sigmoid(lb)[0, 0].cpu().item())
                else:
                    # TTA with dual heads
                    p5_list = []
                    pb_list = []
                    views = [
                        tensor,
                        torch.flip(tensor, dims=[3]),
                        torch.flip(tensor, dims=[2]),
                        torch.rot90(tensor, k=1, dims=[2, 3]),
                        torch.rot90(tensor, k=3, dims=[2, 3])
                    ]
                    for v in views:
                        l5_v, lb_v = self.model(v)
                        p5_list.append(torch.softmax(l5_v, dim=1))
                        pb_list.append(torch.sigmoid(lb_v))

                    probs = torch.stack(p5_list).mean(dim=0)[0].cpu().numpy()
                    bin_prob = float(torch.stack(pb_list).mean(dim=0)[0, 0].cpu().item())

                pred_grade = int(np.argmax(probs))
                # Joint referable probability (50% direct binary head + 50% 5-class summation)
                referable_prob = 0.5 * float(np.sum(probs[2:])) + 0.5 * bin_prob

        is_referable = bool(referable_prob >= 0.5 or pred_grade >= 2)

        triage_urgencies = {
            0: "ROUTINE_12MO",
            1: "EARLY_6MO",
            2: "PRIORITY_3MO",
            3: "URGENT_1MO",
            4: "EMERGENCY_48H"
        }

        return {
            "icdr_grade": pred_grade,
            "icdr_grade_name": CLASS_NAMES[pred_grade],
            "referable_dr": is_referable,
            "referable_probability": round(referable_prob, 4),
            "confidence": round(float(probs[pred_grade]), 4),
            "grade_probabilities": {
                CLASS_NAMES[i]: round(float(probs[i]), 4) for i in range(5)
            },
            "referral_recommendation": triage_urgencies.get(pred_grade, "ROUTINE_12MO"),
            "inference_mode": "5-view TTA" if use_tta else "Single-Pass",
            "model_architecture": "Multi-Task Dual-Head" if self.is_multitask else "EfficientNetV2 Single-Head"
        }


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="MindHue Clinical ML Model Inference Engine")
    parser.add_argument("--image", type=str, default=None, help="Path to fundus image file")
    parser.add_argument("--model", type=str, default=DEFAULT_CHECKPOINT_PATH, help="Path to .pth checkpoint file")
    parser.add_argument("--tta", action="store_true", help="Enable 5-view Test-Time Augmentation")
    parser.add_argument("--device", type=str, default=None, help="Device to run on (cpu, mps, cuda)")
    args = parser.parse_args()

    image_path = args.image
    if not image_path:
        # Pick default sample image if none provided
        sample_candidates = [
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "media", "fundus", "raw", "2026", "09", "10", "real_MRN-REAL-002_OD.png"
            ),
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "media", "fundus", "raw", "2026", "09", "10", "real_MRN-REAL-010_OD.png"
            )
        ]
        for c in sample_candidates:
            if os.path.exists(c):
                image_path = c
                break

    if not image_path or not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        print("Please supply an image via --image <path_to_fundus_image>")
        sys.exit(1)

    print(f"Loading MindHue Clinical DR Model from: {args.model}")
    print(f"Running inference on: {image_path}")
    print(f"TTA Enabled: {args.tta}")

    classifier = ClinicalDRClassifier(checkpoint_path=args.model, device=args.device)
    result = classifier.predict(image_path, use_tta=args.tta)

    print("\n" + "=" * 55)
    print("  MINDHUE CLINICAL AI INFERENCE RESULTS")
    print("=" * 55)
    print(f"  Predicted Diagnosis   : {result['icdr_grade_name']}")
    print(f"  ICDR Grade (0-4)      : {result['icdr_grade']}")
    print(f"  Referable DR Status   : {'YES (Refer to Ophthalmologist)' if result['referable_dr'] else 'NO (Routine 12-Month Follow-Up)'}")
    print(f"  Referral Probability  : {result['referable_probability'] * 100:.2f}%")
    print(f"  Confidence Score      : {result['confidence'] * 100:.2f}%")
    print(f"  Triage Urgency        : {result['referral_recommendation']}")
    print(f"  Inference Mode        : {result['inference_mode']}")
    print(f"  Backbone Architecture : {result['model_architecture']}")
    print("-" * 55)
    print("  Class Probabilities:")
    for grade_name, prob in result['grade_probabilities'].items():
        bar = "█" * int(prob * 25)
        print(f"    {grade_name:<42} : {prob * 100:5.2f}% | {bar}")
    print("=" * 55 + "\n")

