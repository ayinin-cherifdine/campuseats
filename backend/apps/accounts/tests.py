from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class UserModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@campus.com',
            password='Test1234!',
            full_name='Test User',
        )

    def test_user_creation(self):
        self.assertEqual(self.user.email, 'test@campus.com')
        self.assertEqual(self.user.username, 'testuser')
        self.assertTrue(self.user.check_password('Test1234!'))

    def test_user_str(self):
        self.assertIsNotNone(str(self.user))

    def test_user_defaults(self):
        self.assertEqual(self.user.followers_count, 0)
        self.assertEqual(self.user.following_count, 0)
        self.assertEqual(self.user.full_name, 'Test User')


class AuthAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='apiuser',
            email='api@campus.com',
            password='Test1234!',
        )

    def test_login_succes(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'api@campus.com',
            'password': 'Test1234!',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_login_mauvais_mot_de_passe(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'api@campus.com',
            'password': 'MauvaisMotDePasse',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 401)

    def test_inscription(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'nouveau',
            'email': 'nouveau@campus.com',
            'password': 'Test1234!',
            'full_name': 'Nouveau User',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(email='nouveau@campus.com').exists())
