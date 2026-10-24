#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

echo "📁 Ensuring static and media directories exist..."
mkdir -p staticfiles media

echo "🎨 Collecting static files for WhiteNoise..."
python manage.py collectstatic --no-input

echo "🔄 Applying database migrations..."
python manage.py migrate --no-input

echo "🌱 Seeding benchmark cases and hospital nodes..."
python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
try:
    from api.seed_helper import seed_clinical_cases
    seed_clinical_cases()
    print('✅ Seed completed successfully.')
except Exception as e:
    print('Seed notice:', e)
"

echo "✨ Render Build Completed Successfully!"
