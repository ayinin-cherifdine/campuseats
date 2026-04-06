FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create migrations directories and bake initial migrations into the image
RUN mkdir -p apps/accounts/migrations apps/content/migrations && \
    touch apps/accounts/migrations/__init__.py apps/content/migrations/__init__.py && \
    python manage.py makemigrations accounts content --noinput

# Collect static files for Django admin UI
RUN python manage.py collectstatic --noinput 2>/dev/null || true

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "campuseats.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "60"]
