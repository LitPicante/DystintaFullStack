from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# =========================
# LOAD ENV
# =========================
load_dotenv(BASE_DIR / '.env')


def env_list(name, default=''):
    return [item.strip() for item in os.getenv(name, default).split(',') if item.strip()]


# =========================
# SECURITY
# =========================
SECRET_KEY = os.getenv('SECRET_KEY')

DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = env_list('ALLOWED_HOSTS')

CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS')

# =========================
# APPS
# =========================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # third party
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'django_filters',

    # apps
    'accounts',
    'orders',
    'core',
    'site_content',
    'media_library',
    'whatsapp_admin',
]

# =========================
# MIDDLEWARE
# =========================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',

    'django.middleware.common.CommonMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',

    'django.contrib.messages.middleware.MessageMiddleware',

    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

# =========================
# TEMPLATES
# =========================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# =========================
# DATABASE
# =========================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',

        'NAME': os.getenv('DB_NAME'),

        'USER': os.getenv('DB_USER'),

        'PASSWORD': os.getenv('DB_PASSWORD'),

        'HOST': os.getenv('DB_HOST'),

        'PORT': os.getenv('DB_PORT'),
    }
}

# =========================
# PASSWORD VALIDATION
# =========================
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# =========================
# LANGUAGE
# =========================
LANGUAGE_CODE = 'es-py'

TIME_ZONE = 'America/Asuncion'

USE_I18N = True

USE_TZ = True

# =========================
# STATIC
# =========================
STATIC_URL = '/static/'

STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'

MEDIA_ROOT = BASE_DIR / 'media'

SERVE_MEDIA_FILES = os.getenv(
    'SERVE_MEDIA_FILES',
    'False'
) == 'True'

MEDIA_PUBLIC_BASE_URL = os.getenv(
    'MEDIA_PUBLIC_BASE_URL',
    ''
)

DATA_UPLOAD_MAX_MEMORY_SIZE = None

FILE_UPLOAD_MAX_MEMORY_SIZE = 0

# =========================
# DEFAULT PK
# =========================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'

# =========================
# REST FRAMEWORK
# =========================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),

    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
}

# =========================
# JWT
# =========================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=int(os.getenv('JWT_ACCESS_MINUTES', '30'))
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        hours=int(os.getenv('JWT_REFRESH_HOURS', '8'))
    ),
}

# =========================
# CORS
# =========================
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS')

CORS_ALLOW_CREDENTIALS = True

# =========================
# HTTPS / NGINX
# =========================
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SESSION_COOKIE_SECURE = True

CSRF_COOKIE_SECURE = True

SECURE_BROWSER_XSS_FILTER = True

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = 'DENY'

# =========================
# EVOLUTION API / WHATSAPP
# =========================
EVOLUTION_API_URL = os.getenv(
    'EVOLUTION_API_URL',
    'http://127.0.0.1:8012'
)

EVOLUTION_API_KEY = os.getenv(
    'EVOLUTION_API_KEY',
    ''
)

EVOLUTION_INSTANCE_NAME = os.getenv(
    'EVOLUTION_INSTANCE_NAME',
    'dystinta-main'
)

EVOLUTION_API_TIMEOUT = int(
    os.getenv('EVOLUTION_API_TIMEOUT', '15')
)

FRONTEND_PUBLIC_URL = os.getenv('FRONTEND_PUBLIC_URL', 'http://localhost:3000')

ADMIN_WHATSAPP_ENABLED = os.getenv(
    'ADMIN_WHATSAPP_ENABLED',
    'False'
).lower() == 'true'

ADMIN_WHATSAPP_NUMBER = os.getenv(
    'ADMIN_WHATSAPP_NUMBER',
    ''
)
