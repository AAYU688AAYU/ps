from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DistrictCenterViewSet,
    PatientViewSet,
    ScreeningSessionViewSet,
    RetinalImageViewSet,
    get_analytics_overview,
    run_simulation,
    seed_benchmark_dataset,
    register_hospital,
    login_hospital,
    get_hospital_me
)

router = DefaultRouter()
router.register(r'centers', DistrictCenterViewSet, basename='center')
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'screenings', ScreeningSessionViewSet, basename='screening')
router.register(r'images', RetinalImageViewSet, basename='image')

urlpatterns = [
    path('', include(router.urls)),
    
    # Hospital Multi-Tenant Authentication
    path('auth/register/', register_hospital, name='hospital-register'),
    path('auth/login/', login_hospital, name='hospital-login'),
    path('auth/me/', get_hospital_me, name='hospital-me'),
    
    # Analytics & Tele-Simulation
    path('analytics/overview/', get_analytics_overview, name='analytics-overview'),
    path('simulation/run/', run_simulation, name='run-simulation'),
    path('seed-benchmark/', seed_benchmark_dataset, name='seed-benchmark'),
]

