from django.core.management.base import BaseCommand
from api.seed_helper import seed_clinical_cases, seed_real_minio_cases


class Command(BaseCommand):
    help = 'Seeds initial clinical benchmark retinal cases for ICDR validation using real MinIO data or synthetic benchmarks.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--synthetic',
            action='store_true',
            help='Force use of synthetic fundus image generator instead of MinIO real data'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=4,
            help='Number of real cases per ICDR class (default: 4, total 20)'
        )

    def handle(self, *args, **options):
        if options['synthetic']:
            self.stdout.write("Generating and analyzing synthetic benchmark cases...")
            count = seed_clinical_cases()
        else:
            self.stdout.write("Connecting to MinIO and loading real retinal fundus cases...")
            count = seed_real_minio_cases(limit_per_class=options['count'])

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded and analyzed {count} clinical cases!"))
