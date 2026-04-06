#!/bin/sh
set -e

echo "Applying migrations…"
python manage.py migrate --noinput

echo "Seeding demo data…"
python manage.py seed_demo_data --skip-if-exists

exec "$@"
