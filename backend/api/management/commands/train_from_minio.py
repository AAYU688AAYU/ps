from django.core.management.base import BaseCommand
from api.ai_engine.train_minio_model import train_from_minio
from api.ai_engine.minio_dataset import MinIORetinalDataset


class Command(BaseCommand):
    help = "Train MindHue Diabetic Retinopathy deep learning model directly from MinIO object storage datasets."

    def add_arguments(self, parser):
        parser.add_argument(
            "--bucket",
            type=str,
            default="mindhue",
            help="MinIO bucket name (default: 'mindhue')"
        )
        parser.add_argument(
            "--prefix",
            type=str,
            default="archive/",
            help="MinIO prefix for dataset (default: 'archive/')"
        )
        parser.add_argument(
            "--archive",
            action="store_true",
            help="Shortcut to train on archive dataset in MinIO (bucket: mindhue, prefix: archive/)"
        )
        parser.add_argument(
            "--use-diagnosed",
            action="store_true",
            help="Train using diagnosed images partitioned by disorder level (bucket: mindhue-data, prefix: diagnosed/)"
        )
        parser.add_argument(
            "--epochs",
            type=int,
            default=5,
            help="Number of training epochs (default: 5)"
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=16,
            help="Batch size (default: 16)"
        )
        parser.add_argument(
            "--backbone",
            type=str,
            default="efficientnet_b0",
            choices=["efficientnet_b0", "resnet50", "mobilenet", "efficientnet_b4"],
            help="Deep learning backbone architecture (default: efficientnet_b0)"
        )
        parser.add_argument(
            "--inspect-only",
            action="store_true",
            help="Scan and display dataset counts from MinIO without starting training"
        )

    def handle(self, *args, **options):
        if options["use_diagnosed"]:
            bucket = "mindhue-data"
            prefix = "diagnosed/"
        elif options["archive"]:
            bucket = "mindhue"
            prefix = "archive/"
        else:
            bucket = options["bucket"]
            prefix = options["prefix"]

        self.stdout.write(self.style.NOTICE(f"Connecting to MinIO bucket '{bucket}' and scanning dataset prefix '{prefix}'..."))

        dataset = MinIORetinalDataset(bucket=bucket, prefix=prefix)
        self.stdout.write(self.style.SUCCESS(f"Found {len(dataset)} images in MinIO ({bucket}/{prefix})."))

        distribution = dataset.get_class_distribution()
        self.stdout.write("Dataset Class Breakdown:")
        for name, count in distribution.items():
            self.stdout.write(f"  • {name}: {count}")

        if options["inspect_only"]:
            self.stdout.write(self.style.SUCCESS("Inspection complete."))
            return

        if len(dataset) == 0:
            self.stdout.write(self.style.WARNING(
                f"No images found in bucket '{bucket}' under prefix '{prefix}'.\n"
                "Verify bucket contents or upload training data via MinIO console."
            ))
            return

        self.stdout.write(self.style.NOTICE(f"Starting training with backbone {options['backbone']} for {options['epochs']} epochs..."))
        result = train_from_minio(
            bucket=bucket,
            prefix=prefix,
            epochs=options["epochs"],
            batch_size=options["batch_size"],
            backbone=options["backbone"],
            save_to_minio=True
        )

        if result.get("success"):
            self.stdout.write(self.style.SUCCESS(
                f"Training complete! Local weights: {result.get('local_weights')}\n"
                f"MinIO weights: {result.get('minio_weights')}"
            ))
        else:
            self.stdout.write(self.style.ERROR(f"Training could not proceed: {result.get('error')}"))

