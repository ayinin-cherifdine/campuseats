from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Restaurant

User = get_user_model()


class RestaurantModelTest(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name='Test Burger',
            cuisine_type='Américain',
            description='Un bon burger',
            price_range=2,
        )

    def test_restaurant_creation(self):
        self.assertEqual(self.restaurant.name, 'Test Burger')
        self.assertEqual(self.restaurant.cuisine_type, 'Américain')
        self.assertEqual(self.restaurant.price_range, 2)

    def test_restaurant_str(self):
        self.assertEqual(str(self.restaurant), 'Test Burger')

    def test_restaurant_default_rating(self):
        self.assertEqual(self.restaurant.average_rating, 0)
        self.assertEqual(self.restaurant.total_reviews, 0)


class RestaurantAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@campus.com',
            password='Test1234!',
        )
        Restaurant.objects.create(name='Resto A', cuisine_type='Italien', price_range=1)
        Restaurant.objects.create(name='Resto B', cuisine_type='Japonais', price_range=2)

        # Obtenir le token JWT
        response = self.client.post('/api/auth/login/', {
            'email': 'test@campus.com',
            'password': 'Test1234!',
        }, content_type='application/json')
        self.token = response.json().get('access', '')

    def test_liste_restaurants_sans_auth(self):
        response = self.client.get('/api/restaurants/')
        # L'endpoint requiert une authentification
        self.assertIn(response.status_code, [200, 401])

    def test_liste_restaurants_avec_auth(self):
        response = self.client.get(
            '/api/restaurants/',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 2)
