from django.core.management.base import BaseCommand
from apps.content.models import Restaurant

RESTAURANTS = [
    {
        'name': 'Campus Burger Joint',
        'description': 'Best burgers near campus with student discounts',
        'address': '123 University Ave',
        'latitude': 40.7128,
        'longitude': -74.0060,
        'cuisine_type': 'American',
        'price_range': 2,
        'photo_url': 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg',
        'average_rating': 4.5,
    },
    {
        'name': 'Taco Express',
        'description': 'Quick and delicious tacos, perfect for students on a budget',
        'address': '456 College St',
        'latitude': 40.7138,
        'longitude': -74.0070,
        'cuisine_type': 'Mexican',
        'price_range': 1,
        'photo_url': 'https://images.pexels.com/photos/4958792/pexels-photo-4958792.jpeg',
        'average_rating': 4.2,
    },
    {
        'name': 'Pasta Paradise',
        'description': 'Authentic Italian pasta made fresh daily',
        'address': '789 Campus Rd',
        'latitude': 40.7148,
        'longitude': -74.0080,
        'cuisine_type': 'Italian',
        'price_range': 3,
        'photo_url': 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
        'average_rating': 4.7,
    },
    {
        'name': 'Sushi Station',
        'description': 'Fresh sushi and poke bowls',
        'address': '321 Student Way',
        'latitude': 40.7118,
        'longitude': -74.0050,
        'cuisine_type': 'Japanese',
        'price_range': 2,
        'photo_url': 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg',
        'average_rating': 4.4,
    },
    {
        'name': 'The Coffee Lab',
        'description': 'Artisan coffee and study-friendly atmosphere',
        'address': '654 Library Lane',
        'latitude': 40.7158,
        'longitude': -74.0090,
        'cuisine_type': 'Cafe',
        'price_range': 2,
        'photo_url': 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
        'average_rating': 4.6,
    },
    {
        'name': 'Noodle House',
        'description': 'Asian fusion noodles and bowls',
        'address': '987 Dormitory Dr',
        'latitude': 40.7108,
        'longitude': -74.0040,
        'cuisine_type': 'Asian',
        'price_range': 1,
        'photo_url': 'https://images.pexels.com/photos/1907244/pexels-photo-1907244.jpeg',
        'average_rating': 4.3,
    },
    {
        'name': 'Pizza Palace',
        'description': 'New York style pizza by the slice',
        'address': '147 Campus Circle',
        'latitude': 40.7168,
        'longitude': -74.0100,
        'cuisine_type': 'Italian',
        'price_range': 1,
        'photo_url': 'https://images.pexels.com/photos/1653877/pexels-photo-1653877.jpeg',
        'average_rating': 4.1,
    },
    {
        'name': 'Smoothie Station',
        'description': 'Healthy smoothies and acai bowls',
        'address': '258 Gym Avenue',
        'latitude': 40.7098,
        'longitude': -74.0030,
        'cuisine_type': 'Healthy',
        'price_range': 2,
        'photo_url': 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg',
        'average_rating': 4.8,
    },
    {
        'name': 'BBQ Spot',
        'description': 'Smoked meats and southern comfort food',
        'address': '369 Food Court Blvd',
        'latitude': 40.7178,
        'longitude': -74.0110,
        'cuisine_type': 'BBQ',
        'price_range': 3,
        'photo_url': 'https://images.pexels.com/photos/1633525/pexels-photo-1633525.jpeg',
        'average_rating': 4.5,
    },
    {
        'name': 'Vegan Garden',
        'description': 'Plant-based comfort food for every student',
        'address': '741 Green Street',
        'latitude': 40.7088,
        'longitude': -74.0020,
        'cuisine_type': 'Vegan',
        'price_range': 2,
        'photo_url': 'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg',
        'average_rating': 4.6,
    },
]


class Command(BaseCommand):
    help = 'Seed demo restaurant data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-if-exists',
            action='store_true',
            help='Skip seeding if restaurants already exist',
        )

    def handle(self, *args, **options):
        if options['skip_if_exists'] and Restaurant.objects.exists():
            self.stdout.write(self.style.WARNING('Demo data already exists — skipping.'))
            return

        created = 0
        for data in RESTAURANTS:
            _, was_created = Restaurant.objects.get_or_create(name=data['name'], defaults=data)
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Seeded {created} restaurants.'))
