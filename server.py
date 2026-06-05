from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import json
import os

app = Flask(__name__)
CORS(app)

DB_FILE = 'posts_db.json'
USERS_FILE = 'users_db.json'
ADMIN_PASSWORD = "admin123"  # Твой пароль для удаления постов и просмотра юзеров

posts_db = []
users_db = []
active_users = {}  # Словарь для хранения времени последнего пинга: { ip_или_id: timestamp }

# Загрузка баз данных при старте
if os.path.exists(DB_FILE):
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            posts_db = json.load(f)
    except Exception:
        pass

if os.path.exists(USERS_FILE):
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            users_db = json.load(f)
    except Exception:
        pass


def save_db(data, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


# --- АВТОРИЗАЦИЯ И ЮЗЕРЫ ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    # Проверяем, нет ли уже такого юзера
    if not any(u['uid'] == data['uid'] for u in users_db):
        data['reg_time'] = time.strftime('%Y-%m-%d %H:%M:%S')
        data['ip'] = request.headers.get('X-Forwarded-For', request.remote_addr)
        users_db.append(data)
        save_db(users_db, USERS_FILE)
    return jsonify({"status": "success"})


# --- РЕАЛЬНЫЙ ОНЛАЙН (HEARTBEAT) ---
@app.route('/api/ping', methods=['POST'])
def ping():
    data = request.json or {}
    # Если юзер не вошел в аккаунт, считаем его по IP + случайной сессии
    user_id = data.get('uid', request.remote_addr)

    # Обновляем время активности
    active_users[user_id] = time.time()

    # Считаем тех, кто был активен последние 10 секунд
    current_time = time.time()
    online_count = sum(1 for t in active_users.values() if current_time - t < 10)

    # Очистка старых сессий для экономии памяти
    keys_to_delete = [k for k, t in active_users.items() if current_time - t > 60]
    for k in keys_to_delete:
        del active_users[k]

    return jsonify({"online": online_count})


# --- ПОСТЫ И КОММЕНТАРИИ ---
@app.route('/api/posts', methods=['GET'])
def get_posts():
    return jsonify(posts_db)


@app.route('/api/posts', methods=['POST'])
def add_post():
    data = request.json
    data['id'] = int(time.time() * 1000)
    if 'comments' not in data: data['comments'] = []

    client_ip = request.remote_addr
    forwarded_ip = request.headers.get('X-Forwarded-For', '')
    if 'osint' not in data: data['osint'] = {}
    data['osint']['server_ip'] = forwarded_ip if forwarded_ip else client_ip
    data['osint']['server_user_agent'] = request.headers.get('User-Agent')

    posts_db.insert(0, data)
    save_db(posts_db, DB_FILE)
    return jsonify({"status": "success"})


@app.route('/api/posts/<int:post_id>/comment', methods=['POST'])
def add_comment(post_id):
    comment_data = request.json
    for post in posts_db:
        if post['id'] == post_id:
            post['comments'].append(comment_data)
            save_db(posts_db, DB_FILE)
            return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 404


# --- АДМИНКА (Защищенные маршруты) ---
def check_admin():
    return request.headers.get('X-Admin-Token') == ADMIN_PASSWORD


@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    if not check_admin(): return jsonify({"error": "Wrong password"}), 403
    return jsonify(users_db)


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    if not check_admin(): return jsonify({"error": "Wrong password"}), 403
    global posts_db
    posts_db = [p for p in posts_db if p['id'] != post_id]
    save_db(posts_db, DB_FILE)
    return jsonify({"status": "success"})


if __name__ == '__main__':
    print("🚀 Сервер запущен на http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000)