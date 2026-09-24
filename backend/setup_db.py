import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from django.contrib.auth import get_user_model

print("Running migrations...")
call_command('migrate')

User = get_user_model()
print("Creating test users...")

if not User.objects.filter(email='admin@example.com').exists():
    User.objects.create_superuser(email='admin@example.com', username='admin', password='password123', name='Admin User', role='ADMIN')
    print("Created admin@example.com (password: password123)")

if not User.objects.filter(email='student@example.com').exists():
    User.objects.create_user(email='student@example.com', username='student', password='password123', name='Student User', role='STUDENT')
    print("Created student@example.com (password: password123)")

print("Done!")
