import os
from flask import Flask, render_template, request, redirect, url_for, session
from werkzeug.utils import secure_filename
from models import db, Post
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    db.create_all()

translations = {
    'ru': {
        'title': 'Борд',
        'disclaimer': 'Отказ от ответственности: Администрация не несет ответственности за публикуемый контент. Все материалы принадлежат их авторам.',
        'post_btn': 'Опубликовать',
        'name_placeholder': 'Твой ник (необязательно)',
        'text_placeholder': 'Текст сообщения',
        'file_label': 'Прикрепить файл (до 16 МБ):',
        'delete_btn': 'Удалить',
        'lang_switch': 'English'
    },
    'en': {
        'title': 'Board',
        'disclaimer': 'Disclaimer: Administration is not responsible for published content. All materials belong to their authors.',
        'post_btn': 'Publish',
        'name_placeholder': 'Your nickname (optional)',
        'text_placeholder': 'Message text',
        'file_label': 'Attach file (up to 16 MB):',
        'delete_btn': 'Delete',
        'lang_switch': 'Русский'
    }
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/', methods=['GET', 'POST'])
def index():
    lang = session.get('lang', 'ru')
    t = translations[lang]

    if request.method == 'POST':
        nickname = request.form.get('nickname')
        if not nickname:
            nickname = 'Anonymous' if lang == 'en' else 'Аноним'

        content = request.form.get('content')
        file = request.files.get('file')
        filename = None

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        if content or filename:
            new_post = Post(nickname=nickname, content=content, filename=filename)
            db.session.add(new_post)
            db.session.commit()

        return redirect(url_for('index'))

    posts = Post.query.order_by(Post.id.desc()).all()
    is_admin = session.get('is_admin', False)
    return render_template('index.html', posts=posts, t=t, lang=lang, is_admin=is_admin)


@app.route('/lang')
def toggle_lang():
    current_lang = session.get('lang', 'ru')
    session['lang'] = 'en' if current_lang == 'ru' else 'ru'
    return redirect(url_for('index'))


@app.route('/admin_login/<password>')
def admin_login(password):
    if password == app.config['ADMIN_PASSWORD']:
        session['is_admin'] = True
    return redirect(url_for('index'))


@app.route('/admin_logout')
def admin_logout():
    session['is_admin'] = False
    return redirect(url_for('index'))


@app.route('/delete/<int:post_id>')
def delete_post(post_id):
    if session.get('is_admin'):
        post = Post.query.get_or_404(post_id)
        if post.filename:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], post.filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        db.session.delete(post)
        db.session.commit()
    return redirect(url_for('index'))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)