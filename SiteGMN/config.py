import os

class Config:
    SECRET_KEY = 'super-secret-key-change-it'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///forum.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'static/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # Лимит 16 МБ для файлов
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'txt', 'pdf'}
    ADMIN_PASSWORD = 'admin'  # Твой пароль для админки