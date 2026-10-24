# ==============================================================================
# MindHue Django REST API Dockerfile
# ==============================================================================
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000

WORKDIR /app

# Install system dependencies for OpenCV and Pillow image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app/

# Create media and static directories
RUN mkdir -p /app/staticfiles /app/media

# Collect static files for WhiteNoise
RUN python manage.py collectstatic --no-input

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/analytics/overview/ || exit 1

# Start gunicorn server
CMD ["sh", "-c", "python manage.py migrate --no-input && gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT} --workers 1 --threads 2 --timeout 120"]
