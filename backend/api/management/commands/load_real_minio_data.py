from django.core.management.base import BaseCommand
from api.seed_helper import seed_real_minio_cases
from api.models import Patient, ScreeningSession, RetinalImage, AIAnalysis


class Command(BaseCommand):
    help = "Uploads and seeds real retinal fundus dataset from MinIO into the clinical dashboard."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count-per-class",
            type=int,
            default=4,
            help="Number of real patient cases to seed per ICDR class (default: 4, total 20)"
        )
        parser.add_argument(
            "--bucket",
            type=str,
            default="mindhue",
            help="MinIO bucket name containing retinal fundus images (default: 'mindhue')"
        )
        parser.add_argument(
            "--prefix",
            type=str,
            default="archive/",
            help="MinIO prefix for dataset (default: 'archive/')"
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear previously seeded real patient screening cases before loading new ones"
        )

    def handle(self, *args, **options):
        count_per_class = options["count_per_class"]
        bucket = options["bucket"]
        prefix = options["prefix"]

        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing previous real screening cases..."))
            real_patients = Patient.objects.filter(mrn__startswith="MRN-REAL-")
            count = real_patients.count()
            real_patients.delete()
            self.stdout.write(self.style.SUCCESS(f"Removed {count} previous real patient cases."))

        self.stdout.write(self.style.NOTICE(
            f"Streaming real fundus images from MinIO ({bucket}/{prefix}) and executing clinical AI pipeline..."
        ))

        total_seeded = seed_real_minio_cases(
            limit_per_class=count_per_class,
            bucket=bucket,
            prefix=prefix
        )

        self.stdout.write(self.style.SUCCESS(
            f"\n[SUCCESS] Uploaded {total_seeded} real clinical screening cases to the dashboard!\n"
            f"  • Total Patients in DB: {Patient.objects.count()}\n"
            f"  • Total Screening Sessions: {ScreeningSession.objects.count()}\n"
            f"  • Total Analyzed Fundus Images: {AIAnalysis.objects.count()}\n"
            f"All cases are now live on the WHO-GDRIS surveillance dashboard and patient triage view."
        ))
