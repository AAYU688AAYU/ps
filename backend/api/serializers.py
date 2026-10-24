from rest_framework import serializers
from .models import (
    HospitalAccount,
    DistrictCenter,
    Patient,
    ScreeningSession,
    RetinalImage,
    AIAnalysis,
    ClinicalValidation,
    DistrictSimulationRun
)

class HospitalAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalAccount
        fields = [
            'id', 'hospital_id', 'name', 'email', 'contact_number',
            'district', 'state', 'hospital_type', 'is_active', 'registered_at'
        ]


class HospitalRegisterSerializer(serializers.Serializer):
    hospital_id = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=250)
    email = serializers.EmailField()
    contact_number = serializers.CharField(max_length=20)
    district = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100, default='Maharashtra')
    hospital_type = serializers.CharField(max_length=20, default='PHC')
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_hospital_id(self, value):
        if HospitalAccount.objects.filter(hospital_id__iexact=value).exists():
            raise serializers.ValidationError("Hospital ID already registered. Please choose another or login.")
        return value

    def validate_email(self, value):
        if HospitalAccount.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered with another hospital.")
        return value


class HospitalLoginSerializer(serializers.Serializer):
    hospital_id = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True)


class DistrictCenterSerializer(serializers.ModelSerializer):
    hospital_account_details = HospitalAccountSerializer(source='hospital_account', read_only=True)

    class Meta:
        model = DistrictCenter
        fields = '__all__'



class ClinicalValidationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalValidation
        fields = '__all__'


class AIAnalysisSerializer(serializers.ModelSerializer):
    validation = ClinicalValidationSerializer(read_only=True)

    class Meta:
        model = AIAnalysis
        fields = '__all__'


class RetinalImageSerializer(serializers.ModelSerializer):
    ai_analysis = AIAnalysisSerializer(read_only=True)
    raw_image_url = serializers.SerializerMethodField()
    enhanced_image_url = serializers.SerializerMethodField()

    class Meta:
        model = RetinalImage
        fields = '__all__'

    def get_raw_image_url(self, obj):
        if obj.raw_image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.raw_image.url) if request else obj.raw_image.url
        return None

    def get_enhanced_image_url(self, obj):
        if obj.enhanced_image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.enhanced_image.url) if request else obj.enhanced_image.url
        return None


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    district_center_name = serializers.CharField(source='district_center.name', read_only=True)
    screenings_count = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = '__all__'

    def get_screenings_count(self, obj):
        return obj.screenings.count()


class ScreeningSessionSerializer(serializers.ModelSerializer):
    patient_details = PatientSerializer(source='patient', read_only=True)
    district_center_name = serializers.CharField(source='district_center.name', read_only=True)
    images_count = serializers.SerializerMethodField()
    highest_icdr_grade = serializers.SerializerMethodField()
    referable_flag = serializers.SerializerMethodField()

    class Meta:
        model = ScreeningSession
        fields = '__all__'

    def get_images_count(self, obj):
        return obj.images.count()

    def get_highest_icdr_grade(self, obj):
        grades = [img.ai_analysis.icdr_grade for img in obj.images.all() if hasattr(img, 'ai_analysis')]
        return max(grades) if grades else 0

    def get_referable_flag(self, obj):
        for img in obj.images.all():
            if hasattr(img, 'ai_analysis') and img.ai_analysis.referable_dr:
                return True
        return False


class ScreeningSessionDetailSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    district_center = DistrictCenterSerializer(read_only=True)
    images = RetinalImageSerializer(many=True, read_only=True)

    class Meta:
        model = ScreeningSession
        fields = '__all__'


class DistrictSimulationRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistrictSimulationRun
        fields = '__all__'
