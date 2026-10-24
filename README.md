# 👁️ MindHue: AI-Powered Diabetic Retinopathy Screening & Tele-Ophthalmology Platform
### *Official Smart India Hackathon (SIH) Clinical Tele-Health Solution*

> **India has over 77 million diabetic adults — the second highest globally.** Diabetic Retinopathy (DR) affects ~18% of this cohort and is a leading cause of preventable blindness. With only **~1 ophthalmologist per 100,000 rural population**, mass manual screening is infeasible. **MindHue** provides an explainable, clinically validated tele-retina platform designed for Primary Health Centres (PHCs) and district hospital networks under WHO Global Eye Health 2030 & Ayushman Bharat PM-JAY standards.

---

## 🚀 Dual Core Implementation Flows

MindHue is architected with **two interconnected implementation pipelines**:

```
                                      ┌─────────────────────────────────────────────────────────┐
                                      │                      MINDHUE PLATFORM                   │
                                      └────────────────────────────┬────────────────────────────┘
                                                                   │
                         ┌─────────────────────────────────────────┴────────────────────────────────────────┐
                         ▼                                                                                  ▼
       ┌───────────────────────────────────────┐                                  ┌───────────────────────────────────────┐
       │   FLOW A: CLINICAL TELE-SCREENING     │                                  │   FLOW B: KAGGLE DATASET & AI HUB     │
       └──────────────────┬────────────────────┘                                  └──────────────────┬────────────────────┘
                          │                                                                          │
       1. Patient Intake (ABHA ID, HbA1c, BP)                                     1. Kaggle DR Benchmark Ingestion (37k+)
                          ▼                                                                          ▼
       2. Bilateral Fundus Capture & Live IQA                                     2. Neural Backbone Selector (EfficientNet)
                          ▼                                                                          ▼
       3. CLAHE Enhancement & Biomarkers                                          3. Multi-Scale CLAHE & MixUp Augment
                          ▼                                                                          ▼
       4. ICDR 0-4 Staging & Sub-Pixel Lesions                                    4. Live Training Convergence & Kappa
                          ▼                                                                          ▼
       5. 30-Sec Fast-Review & Sign-Off                                           5. ROC-AUC >96% Clinical Validation
                          ▼                                                                          ▼
       6. WHO Bilingual Report & District Sim                                     6. Export Optimized Weights to Edge TPU
```

---

### 🔹 Flow A: Clinical Field Tele-Ophthalmology & Fast-Review Pipeline

1. **Hospital Node Authentication**:
   - Secure multi-tenant login via unique **Hospital ID** (e.g. `HOSP-AIIMS-01`, `PHC-MH-PN-01`) and password.
   - Self-registration with official institutional email, mobile number, district, and tier (PHC, CHC, District Hospital, Medical College).
2. **Patient Intake & ABHA Integration**:
   - Captures demographics, Ayushman Bharat Health Account (ABHA ID), and diabetes history (duration, HbA1c %, BP, visual acuity).
3. **Automated Image Quality Assessment (IQA)**:
   - Evaluates focus sharpness (Laplacian gradient variance), illumination entropy, dynamic range, and 45° circular FOV adequacy.
   - Provides instant operator guidance (e.g., small pupil illumination guidance, diopter focus recalibration) for rural health workers.
4. **Multi-Task Clinical AI & Explainability Engine**:
   - **Adaptive Enhancement**: Multi-scale CLAHE in LAB color space + Gaussian background homogenization.
   - **Anatomical Localization**: Optic Disc, Cup-to-Disc Ratio (CDR for opportunistic glaucoma screening), Macula & Foveal Avascular Zone (FAZ).
   - **Sub-Pixel Lesion Detection**: Hessian determinant blob filtering for microaneurysms, hard exudates (CSME risk), quadrant hemorrhages (ICDR 4-2-1 rule verification), and neovascularization (NVD/NVE).
   - **Grad-CAM Attention Heatmaps**: High-resolution Class Activation Maps explaining exact diagnostic rationale.
5. **30-Second Fast-Review Studio**:
   - Interactive dual-canvas viewer with zoom/pan and toggleable diagnostic layers (Vessels, MAs, Exudates, Hemorrhages, Grad-CAM).
   - Live latency countdown ensuring sub-30-second turnaround.
   - 1-click clinical sign-off, ICDR override with audit logging, and SHA-256 digital signature.
6. **Printable WHO Clinical Report & District Queue Simulator**:
   - Generates official bilingual (English + Hindi) screening report with verification QR code.
   - Discrete-event Simulink queue simulator modeling district programs for 100,000+ patients/year (bandwidth throttling 128kbps-10Mbps, edge TPU vs cloud GPU latency, review capacity, and cost: ₹38 / $0.44 per screening).

---

### 🔹 Flow B: MinIO Object Storage & Deep Learning Training Hub

1. **Disorder-Partitioned Automated Storage**:
   - Screened fundus images (raw, CLAHE-enhanced, Grad-CAM heatmap, vascular tree, and lesion overlays) are automatically uploaded to MinIO partitioned by diagnosed ICDR disorder level:
     - `diagnosed/grade_0_normal/`
     - `diagnosed/grade_1_mild_npdr/`
     - `diagnosed/grade_2_moderate_npdr/`
     - `diagnosed/grade_3_severe_npdr/`
     - `diagnosed/grade_4_pdr/`
2. **Direct MinIO Dataset Streaming & Training (`MinIORetinalDataset`)**:
   - PyTorch dataset loader streams training batches directly from MinIO into memory without exhausting local disk.
   - Run training via CLI:
     ```bash
     python manage.py train_from_minio --prefix training_data/ --epochs 10 --backbone resnet50
     python manage.py train_from_minio --use-diagnosed --epochs 5
     ```
3. **Model Checkpoint Management**:
   - Trained model weights (`.pth`) are automatically saved locally and archived in MinIO under `models/mindhue_retinal_weights.pth`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend REST API** | Python 3.9+, Django 4.2+, Django REST Framework (DRF), SQLite / PostgreSQL |
| **Computer Vision & AI** | PyTorch, OpenCV, NumPy, SciPy, Scikit-Image, PIL, Torchvision |
| **Frontend Workstation** | React 18, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Canvas-Confetti |
| **Medical Standards** | WHO-GDRIS Protocol, ICDR 5-Grade Scale, ETDRS CSME Macular Grid, ABDM / ABHA |

---

## ⚡ Quick Start Installation Guide

### Prerequisites
- Python 3.9+ & `pip`
- Node.js 18+ & `npm`
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/AAYU688AAYU/Mindhue-SIH.git
cd Mindhue-SIH
```

### 2. Backend Setup (Django REST Framework)
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations
python backend/manage.py migrate

# Seed authentic clinical benchmark cases and demo hospitals
python -c "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings'); django.setup(); from api.seed_helper import seed_clinical_cases; seed_clinical_cases()"

# Start Django backend server (Port 8000)
python backend/manage.py runserver 127.0.0.1:8000
```

### 3. Frontend Setup (React + Vite + Tailwind)
In a separate terminal:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server (Port 5173)
npm run dev
```

Open **`http://localhost:5173`** in your browser to access the complete workstation.

---

## 🔑 Default Demo Hospital Credentials

| Hospital Name | Hospital ID | Password | Role / Tier |
| :--- | :--- | :--- | :--- |
| **AIIMS Tele-Retina Apex Hub** | `HOSP-AIIMS-01` | `password123` | Apex Tele-Retina Hub (Delhi) |
| **PHC Shirur (Pune)** | `PHC-MH-PN-01` | `password123` | Primary Health Centre (Maharashtra) |
| **Pindra Health Center (Varanasi)** | `PHC-UP-VN-04` | `password123` | Primary Health Centre (Uttar Pradesh) |

*(You can also register any new hospital using the "Register New Hospital" tab).*

---

## 📄 Key API Endpoints

- `POST /api/auth/login/` — Hospital authentication with Hospital ID & password.
- `POST /api/auth/register/` — Hospital registration with institutional email, mobile no., and tier.
- `GET /api/kaggle/summary/` — Summary of 37,876 Kaggle DR images across 5 classes.
- `POST /api/kaggle/train/` — Trigger deep learning training run with live convergence metrics.
- `GET /api/screenings/` — Screening sessions queue with real-time triage tags.
- `POST /api/screenings/{id}/upload_image/` — Upload fundus capture & execute AI pipeline.
- `POST /api/screenings/{id}/validate_session/` — 1-click ophthalmologist verification & sign-off.
- `POST /api/simulation/run/` — Simulink 100k district tele-retina queue simulation.
- `GET /api/analytics/overview/` — District epidemiological prevalence & quality audit metrics.

---

## 🏆 Smart India Hackathon (SIH) Compliance
- **Explainability**: Heatmap gradient attribution eliminates "black box" concerns for clinicians.
- **Field Robustness**: Automated IQA filters out blurry / poorly illuminated captures before transmission.
- **Frugal Tele-Medicine**: Sub-30-second review studio & discrete event queue modeling tailored for low-bandwidth rural healthcare.

---

## 🌐 Deployment & Docker Quick Reference

### 🐳 Run Multi-Container Stack with Docker Compose:
```bash
docker compose up --build -d
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000/api/`
- **PostgreSQL**: Port `5432` (`mindhue_db`)

### ☁️ Cloud Deployments:
- **Frontend on Vercel**: Connect repo, set root directory to `frontend`, framework `Vite`, add env `VITE_API_URL`.
- **Backend on Render**: Connect repo via Blueprint `render.yaml` or Web Service with `./build.sh` and Gunicorn.
- **CI/CD Pipeline**: Automated GitHub Actions `.github/workflows/ci-cd.yml` tests backend, builds frontend, validates Docker images, and triggers deployment hooks.
