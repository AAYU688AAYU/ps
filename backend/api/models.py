from django.db import models
import uuid
from django.contrib.auth.hashers import make_password, check_password
import secrets

class HospitalAccount(models.Model):
    HOSPITAL_TYPES = [
        ('PHC', 'Primary Health Centre (PHC)'),
        ('CHC', 'Community Health Centre (CHC)'),
        ('DH', 'District Hospital (DH)'),
        ('MED_COLLEGE', 'Government Medical College & Hospital'),
        ('APEX_TELE', 'Apex Tele-Ophthalmology Hub (AIIMS / Regional Eye Center)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital_id = models.CharField(max_length=50, unique=True, help_text="Unique Hospital ID (e.g. HOSP-AIIMS-01, PHC-MH-01)")
    name = models.CharField(max_length=250, help_text="Hospital / Health Facility Name")
    email = models.EmailField(unique=True, help_text="Official Institutional Email")
    contact_number = models.CharField(max_length=20, help_text="Official Contact / Mobile Number")
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100, default='Maharashtra')
    hospital_type = models.CharField(max_length=20, choices=HOSPITAL_TYPES, default='PHC')
    password_hash = models.CharField(max_length=256)
    auth_token = models.CharField(max_length=128, blank=True, null=True, unique=True)
    is_active = models.BooleanField(default=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)
        if self.pk:
            self.save(update_fields=['password_hash'])

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)

    def generate_token(self):
        token = f"hosp_tk_{secrets.token_hex(24)}"
        self.auth_token = token
        self.save(update_fields=['auth_token'])
        return token

    def __str__(self):
        return f"{self.name} [{self.hospital_id}] ({self.district}, {self.state})"


class DistrictCenter(models.Model):
    CENTER_LEVELS = [
        ('PHC', 'Primary Health Centre (PHC)'),
        ('CHC', 'Community Health Centre (CHC)'),
        ('DH', 'District Hospital (DH)'),
        ('VAN', 'Mobile Screening Van'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital_account = models.ForeignKey(HospitalAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='centers')
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100, default='Maharashtra')
    level = models.CharField(max_length=10, choices=CENTER_LEVELS, default='PHC')
    catchment_population = models.IntegerField(default=50000)
    bandwidth_kbps = models.IntegerField(default=2048, help_text="Average uplink bandwidth in kbps")
    camera_model = models.CharField(max_length=150, default='Forus 3nethra Classic HD')
    operator_name = models.CharField(max_length=150, default='Dr. R. Verma / Health Worker')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.district}, {self.state})"



class Patient(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    DIABETES_CHOICES = [
        ('TYPE1', 'Type 1 Diabetes Mellitus'),
        ('TYPE2', 'Type 2 Diabetes Mellitus'),
        ('GESTATIONAL', 'Gestational Diabetes'),
        ('PRE', 'Pre-Diabetes'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    abha_id = models.CharField(max_length=30, blank=True, null=True, help_text="Ayushman Bharat Health Account ID (e.g. 14-digit ABHA)")
    mrn = models.CharField(max_length=50, unique=True, help_text="Medical Record Number / Screening ID")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    age = models.IntegerField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    contact_number = models.CharField(max_length=20, blank=True)
    village_or_city = models.CharField(max_length=150, default='Rural Block')
    district_center = models.ForeignKey(DistrictCenter, on_delete=models.SET_NULL, null=True, related_name='patients')
    hospital_account = models.ForeignKey(HospitalAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    
    # Clinical History
    diabetes_type = models.CharField(max_length=20, choices=DIABETES_CHOICES, default='TYPE2')
    diabetes_duration_years = models.FloatField(default=5.0)
    hba1c_level = models.FloatField(default=8.2, help_text="Latest HbA1c in %")
    systolic_bp = models.IntegerField(default=130)
    diastolic_bp = models.IntegerField(default=85)
    known_hypertension = models.BooleanField(default=True)
    known_nephropathy = models.BooleanField(default=False)
    visual_acuity_od = models.CharField(max_length=20, default='6/9', help_text="Right Eye Snellen Acuity")
    visual_acuity_os = models.CharField(max_length=20, default='6/12', help_text="Left Eye Snellen Acuity")
    registered_at = models.DateTimeField(auto_now_add=True)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return f"{self.full_name} ({self.mrn})"


class ScreeningSession(models.Model):
    STATUS_CHOICES = [
        ('PENDING_AI', 'Pending AI Analysis'),
        ('AI_GRADED', 'AI Graded - Pending Verification'),
        ('VERIFIED', 'Ophthalmologist Verified'),
        ('REFERRED_URGENT', 'Referred - Priority Tele-Consult'),
        ('COMPLETED', 'Screening Completed'),
    ]
    REFERRAL_CHOICES = [
        ('ROUTINE_12MO', 'Routine Annual Screening (12 Months)'),
        ('EARLY_6MO', 'Early Follow-up (6 Months)'),
        ('PRIORITY_3MO', 'Priority Specialist Review (3 Months)'),
        ('URGENT_1MO', 'Urgent Retina Referral (1 Month)'),
        ('EMERGENCY_48H', 'Emergency Vitreoretinal Intervention (48-72h)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital_account = models.ForeignKey(HospitalAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='screenings')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='screenings')
    session_code = models.CharField(max_length=50, unique=True)
    district_center = models.ForeignKey(DistrictCenter, on_delete=models.SET_NULL, null=True)
    screener_name = models.CharField(max_length=150, default='ASHA / Community Health Officer')

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING_AI')
    referral_recommendation = models.CharField(max_length=30, choices=REFERRAL_CHOICES, default='ROUTINE_12MO')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session {self.session_code} - {self.patient.full_name}"


class RetinalImage(models.Model):
    EYE_CHOICES = [
        ('OD', 'OD - Right Eye (Oculus Dexter)'),
        ('OS', 'OS - Left Eye (Oculus Sinister)'),
    ]
    QUALITY_CHOICES = [
        ('GRADEABLE', 'Adequate / Gradeable'),
        ('BORDERLINE', 'Borderline Quality (Enhanced)'),
        ('UNGRADEABLE', 'Ungradeable (Recapture Required)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ScreeningSession, on_delete=models.CASCADE, related_name='images')
    eye = models.CharField(max_length=2, choices=EYE_CHOICES, default='OD')
    raw_image = models.ImageField(upload_to='fundus/raw/%Y/%m/%d/')
    enhanced_image = models.ImageField(upload_to='fundus/enhanced/%Y/%m/%d/', blank=True, null=True)
    
    # Image Quality Assessment Metrics
    iqa_focus_score = models.FloatField(default=85.0, help_text="Laplacian gradient sharpness 0-100")
    iqa_illumination_score = models.FloatField(default=88.0, help_text="Histogram uniformity and dynamic range 0-100")
    iqa_fov_score = models.FloatField(default=92.0, help_text="Field of View and optic disc visibility 0-100")
    iqa_overall_score = models.FloatField(default=88.3, help_text="Combined quality score 0-100")
    quality_grade = models.CharField(max_length=20, choices=QUALITY_CHOICES, default='GRADEABLE')
    recapture_feedback_text = models.TextField(blank=True, default="Image quality adequate for diagnostic grading.")
    
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.session.session_code} - {self.eye} ({self.quality_grade})"


class AIAnalysis(models.Model):
    ICDR_GRADES = [
        (0, 'Grade 0: No Apparent Retinopathy'),
        (1, 'Grade 1: Mild Non-Proliferative DR (Mild NPDR)'),
        (2, 'Grade 2: Moderate Non-Proliferative DR (Mod NPDR)'),
        (3, 'Grade 3: Severe Non-Proliferative DR (Sev NPDR)'),
        (4, 'Grade 4: Proliferative Diabetic Retinopathy (PDR)'),
    ]
    CSME_LEVELS = [
        ('NONE', 'No Macular Edema'),
        ('MILD', 'Mild DME Risk'),
        ('MODERATE', 'Moderate DME (Exudates near Fovea)'),
        ('CSME', 'Clinically Significant Macular Edema (CSME)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    retinal_image = models.OneToOneField(RetinalImage, on_delete=models.CASCADE, related_name='ai_analysis')
    icdr_grade = models.IntegerField(choices=ICDR_GRADES, default=0)
    icdr_grade_name = models.CharField(max_length=100, default='No Apparent Retinopathy')
    referable_dr = models.BooleanField(default=False, help_text="True if ICDR >= 2 or DME present")
    referable_confidence = models.FloatField(default=0.95, help_text="Calibrated Bayesian confidence score 0.0-1.0")
    grade_probabilities = models.JSONField(default=dict, help_text="Probability vector for all 5 ICDR classes")
    
    # Anatomical & Clinical Biomarkers
    optic_disc_detected = models.BooleanField(default=True)
    optic_cup_disc_ratio = models.FloatField(default=0.35, help_text="Vertical CDR for glaucoma risk")
    glaucoma_suspect = models.BooleanField(default=False)
    fovea_located = models.BooleanField(default=True)
    macular_edema_risk = models.CharField(max_length=20, choices=CSME_LEVELS, default='NONE')
    
    # Lesion Counts & Statistics
    microaneurysms_count = models.IntegerField(default=0)
    hard_exudates_count = models.IntegerField(default=0)
    hemorrhages_count = models.IntegerField(default=0)
    cotton_wool_spots_count = models.IntegerField(default=0)
    neovascularization_detected = models.BooleanField(default=False)
    quadrant_4_2_1_rule_met = models.BooleanField(default=False, help_text="Meets ICDR 4-2-1 criteria for Severe NPDR")
    
    # Visual Explainability Artifacts
    gradcam_heatmap_image = models.ImageField(upload_to='fundus/gradcam/%Y/%m/%d/', blank=True, null=True)
    vessel_map_image = models.ImageField(upload_to='fundus/vessels/%Y/%m/%d/', blank=True, null=True)
    lesions_map_image = models.ImageField(upload_to='fundus/lesions/%Y/%m/%d/', blank=True, null=True)

    # MinIO Object Storage Reference (Disorder-partitioned storage)
    minio_raw_path = models.CharField(max_length=500, blank=True, null=True, help_text="MinIO URI for raw fundus image")
    minio_enhanced_path = models.CharField(max_length=500, blank=True, null=True, help_text="MinIO URI for enhanced image")
    minio_gradcam_path = models.CharField(max_length=500, blank=True, null=True, help_text="MinIO URI for Grad-CAM overlay")
    minio_disorder_folder = models.CharField(max_length=200, blank=True, null=True, help_text="MinIO disorder phase folder")
    
    # Clinical Explanation Summary
    clinical_explanation = models.TextField(default="No microaneurysms, hemorrhages or exudates detected. Retinal vasculature healthy.")
    analyzed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI: Grade {self.icdr_grade} - {self.icdr_grade_name} (Conf: {self.referable_confidence:.1%})"


class ClinicalValidation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ai_analysis = models.OneToOneField(AIAnalysis, on_delete=models.CASCADE, related_name='validation')
    ophthalmologist_name = models.CharField(max_length=150, default='Dr. Ananya Sharma, MD, DNB (Retina)')
    license_number = models.CharField(max_length=100, default='MCI-78452-OPHTH')
    hospital_affiliation = models.CharField(max_length=200, default='All India Institute of Medical Sciences (AIIMS) Tele-Retina Hub')
    confirmed_icdr_grade = models.IntegerField(choices=AIAnalysis.ICDR_GRADES, default=0)
    agrees_with_ai = models.BooleanField(default=True)
    validation_duration_seconds = models.FloatField(default=18.5, help_text="Ophthalmologist review time in seconds")
    clinical_notes = models.TextField(blank=True, default="Verified AI findings. Macular center clear. Follow standard screening interval.")
    treatment_plan = models.TextField(blank=True, default="Strict glycemic and BP control. Annual fundus screening.")
    digital_signature_hash = models.CharField(max_length=128, default='SHA256:8f9a2b1c4e6d3f7a8c9e0b1d2e3f4a5b6c7d8e9f')
    validated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Validated by {self.ophthalmologist_name} -> Grade {self.confirmed_icdr_grade}"


class DistrictSimulationRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run_name = models.CharField(max_length=200, default='District Tele-Retina Annual Capacity Model')
    annual_patient_target = models.IntegerField(default=100000)
    active_phcs = models.IntegerField(default=40)
    tele_ophthalmologists = models.IntegerField(default=3)
    avg_bandwidth_kbps = models.IntegerField(default=2048)
    edge_ai_enabled = models.BooleanField(default=True)
    simulation_results = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.run_name} ({self.annual_patient_target} patients)"
