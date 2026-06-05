import os
import sqlite3
import shutil
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI()

if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


def init_db():
    conn = sqlite3.connect('forum.db')
    c = conn.cursor()
    c.execute(
        'CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, text TEXT, media_url TEXT, media_type TEXT, likes INTEGER DEFAULT 0)')
    c.execute(
        'CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id TEXT, text TEXT)')
    conn.commit()
    conn.close()


init_db()


@app.get("/")
def read_root():
    return FileResponse("index.html")


@app.get("/styles.css")
def read_css():
    return FileResponse("styles.css")


@app.get("/app.js")
def read_js():
    return FileResponse("app.js")


@app.get("/api/posts")
def get_posts(q: str = ""):
    conn = sqlite3.connect('forum.db')
    c = conn.cursor()
    if q:
        c.execute(
            'SELECT id, user_id, text, media_url, media_type, likes FROM posts WHERE text LIKE ? ORDER BY id DESC',
            ('%' + q + '%',))
    else:
        c.execute('SELECT id, user_id, text, media_url, media_type, likes FROM posts ORDER BY id DESC')
    posts = [{"id": r[0], "user_id": r[1], "text": r[2], "media_url": r[3], "media_type": r[4], "likes": r[5]} for r in
             c.fetchall()]
    conn.close()
    return posts


@app.post("/api/posts")
def create_post(user_id: str = Form(...), text: str = Form(""), file: UploadFile = File(None)):
    media_url = ""
    media_type = ""
    if file and file.filename:
        filepath = f"uploads/{file.filename}"
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        media_url = f"/{filepath}"
        if file.content_type.startswith("video/"):
            media_type = "video"
        elif file.content_type.startswith("image/"):
            media_type = "image"

    conn = sqlite3.connect('forum.db')
    c = conn.cursor()
    c.execute('INSERT INTO posts (user_id, text, media_url, media_type, likes) VALUES (?, ?, ?, ?, 0)',
              (user_id, text, media_url, media_type))
    conn.commit()
    conn.close()
    return {"status": "success"}


@app.post("/api/posts/{post_id}/like")
def like_post(post_id: int):
    conn = sqlite3.connect('forum.db')
    c = conn.cursor()
    c.execute('UPDATE posts SET likes = likes + 1 WHERE id = ?', (post_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}


@app.delete("/api/posts/{post_id}")
def delete_post(post_id: int, user_id: str):
    conn = sqlite3.connect('forum.db')
    c = conn.cursor()
    c.execute('DELETE FROM posts WHERE id = ? AND user_id = ?', (post_id, user_id))
    c.execute('DELETE FROM comments WHERE post_id = ?', (post_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}


@app.get("/api/posts/{post_id}/comments")
def get_comments(post_id: int):
    conn = sqlite3.connect('forum.db')
    c = conn.cursor()
    c.execute('SELECT id, user_id, text FROM comments WHERE post_id = ? ORDER BY id ASC', (post_id,))
    comments = [{"id": r[0], "user_id": r[1], "text": r[2]} for r in c.fetchall()]
    conn.close()
    return comments


@app.post("/api/posts/{post_id}/comments")
def create_comment(post_id: int, user_id: str = Form(...), text: str = Form(...)):
    conn = sqlite3.connect('forum.db')
    c = conn.cursor()
    c.execute('INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)', (post_id, user_id, text))
    conn.commit()
    conn.close()
    return {"status": "success"}


if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)