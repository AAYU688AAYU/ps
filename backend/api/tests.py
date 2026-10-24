from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from api.models import DistrictCenter, Patient, ScreeningSession, RetinalImage, AIAnalysis
from api.ai_engine.simulink_simulator import simulate_district_teleophthalmology
from api.ai_engine.iqa import assess_image_quality
from api.seed_helper import generate_synthetic_fundus

class RetinalAIPipelineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.center = DistrictCenter.objects.create(
            name='Primary Health Centre Baramati',
            code='PHC-MH-BR-01',
            district='Pune',
            state='Maharashtra',
            catchment_population=75000,
            bandwidth_kbps=2048
        )
        self.patient = Patient.objects.create(
            mrn='MRN-TEST-999',
            first_name='Aarav',
            last_name='Sharma',
            age=52,
            gender='M',
            district_center=self.center,
            hba1c_level=8.4,
            systolic_bp=135,
            diastolic_bp=88
        )
        self.session = ScreeningSession.objects.create(
            session_code='SESS-TEST-999',
            patient=self.patient,
            district_center=self.center
        )

    def test_iqa_assessment(self):
        # Generate clear synthetic fundus
        img_np = generate_synthetic_fundus(icdr_grade=0, blur_level=0, illumination_level=1.0)
        iqa = assess_image_quality(img_np)
        self.assertTrue(iqa['gradeable'])
        self.assertGreaterEqual(iqa['overall_score'], 70.0)

        # Generate blurry fundus
        blurry_np = generate_synthetic_fundus(icdr_grade=0, blur_level=6, illumination_level=1.0)
        blurry_iqa = assess_image_quality(blurry_np)
        self.assertLess(blurry_iqa['focus_score'], 55.0)

    def test_simulink_queue_simulation(self):
        results = simulate_district_teleophthalmology(
            annual_target=100000,
            active_phcs=40,
            ophthalmologist_count=3,
            doctor_hours_per_day=4.0,
            avg_bandwidth_kbps=2048,
            use_edge_ai=True,
            enable_30s_fast_review=True
        )
        self.assertEqual(results['parameters']['annual_target'], 100000)
        self.assertIn('daily_patients_district', results['throughput_metrics'])
        self.assertIn('doctor_utilization_pct', results['doctor_workload'])
        self.assertIn('cost_per_patient_inr', results['economic_impact'])
        self.assertEqual(len(results['timeline']['months']), 12)

    def test_api_analytics_overview(self):
        response = self.client.get('/api/analytics/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('summary', response.data)
        self.assertIn('icdr_distribution', response.data)
        self.assertIn('quality_control', response.data)

    def test_api_simulation_run(self):
        response = self.client.post('/api/simulation/run/', {
            'annual_target': 120000,
            'active_phcs': 50,
            'ophthalmologist_count': 4
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['parameters']['annual_target'], 120000)

    def test_minio_dataset_indexing(self):
        from api.ai_engine.minio_dataset import MinIORetinalDataset
        dataset = MinIORetinalDataset(bucket="mindhue", prefix="archive/")
        self.assertEqual(len(dataset), 2750)
        distribution = dataset.get_class_distribution()
        self.assertEqual(distribution['Grade 0: Normal / Healthy'], 1000)
        self.assertEqual(distribution['Grade 1: Mild Non-Proliferative DR'], 370)
        self.assertEqual(distribution['Grade 2: Moderate Non-Proliferative DR'], 900)
        self.assertEqual(distribution['Grade 3: Severe Non-Proliferative DR'], 190)
        self.assertEqual(distribution['Grade 4: Proliferative Diabetic Retinopathy'], 290)

