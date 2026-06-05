const SERVER_URL = 'http://127.0.0.1:5000/api';

const i18n = {
    ru: {
        online: "Онлайн:", authTitle: "Регистрация", registerBtn: "Создать аккаунт",
        createPost: "Создать пост", chooseFile: "Выбрать фото/видео", sendPost: "Опубликовать",
        logout: "Выйти", anon: "Аноним", placeholderText: "Что у вас нового?",
        commentPlaceholder: "Написать комментарий...", commentBtn: "Отправить",
        alertAuth: "Зарегистрируйтесь для этого действия.", settingsTitle: "Настройки",
        compactMode: "Компактный режим", close: "Закрыть",
        navFeed: "Лента", navPost: "Пост", navProfile: "Профиль", navSettings: "Настройки", navAdmin: "Админка"
    },
    en: {
        online: "Online:", authTitle: "Registration", registerBtn: "Create Account",
        createPost: "Create Post", chooseFile: "Choose Photo/Video", sendPost: "Publish",
        logout: "Log out", anon: "Anonymous", placeholderText: "What's new?",
        commentPlaceholder: "Write a comment...", commentBtn: "Send",
        alertAuth: "Please register for this action.", settingsTitle: "Settings",
        compactMode: "Compact Mode", close: "Close",
        navFeed: "Feed", navPost: "Post", navProfile: "Profile", navSettings: "Settings", navAdmin: "Admin"
    }
};

let currentLang = 'ru';
let currentUser = null;
let currentAttachedFileBase64 = null;
let posts = [];
let isCompactMode = false;
let currentlyDisplayed = 0;
const POSTS_PER_PAGE = 10;

// Уникальная сессия для анонимов, чтобы сервер считал их онлайн
let localSessionId = 'anon_' + Date.now() + Math.floor(Math.random() * 1000);
let adminToken = ""; // Хранилище пароля в памяти браузера

document.addEventListener("DOMContentLoaded", () => {
    const savedUser = localStorage.getItem("dischan_user");
    if (savedUser) { currentUser = JSON.parse(savedUser); updateUserUI(); }

    const savedCompact = localStorage.getItem("dischan_compact");
    if (savedCompact === "true") {
        isCompactMode = true;
        document.getElementById("toggle-compact").checked = true;
        document.body.classList.add("compact-mode");
    }

    startRealOnlineCounter();
    updateLanguageUI();
    setupIntersectionObserver();

    fetchPostsFromServer();
    setInterval(fetchPostsFromServer, 3000);
});

// НОВОЕ: Настоящий онлайн счетчик
function startRealOnlineCounter() {
    setInterval(async () => {
        try {
            let pingId = currentUser ? currentUser.uid : localSessionId;
            let res = await fetch(`${SERVER_URL}/ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: pingId })
            });
            let data = await res.json();
            document.getElementById("online-counter").textContent = data.online;
        } catch (e) {
            document.getElementById("online-counter").textContent = "ошибка";
        }
    }, 3000);
}

function navAction(action) {
    if (action === 'feed') {
        document.getElementById('feed-area').scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'post') {
        document.getElementById('sidebar-area').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('post-text').focus();
    } else if (action === 'profile') {
        document.getElementById('sidebar-area').scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'settings') {
        document.getElementById("settings-overlay").classList.remove("hidden");
    } else if (action === 'admin') {
        // Запрос пароля администратора
        if (!adminToken) {
            adminToken = prompt("Введите пароль администратора (По умолчанию: admin123):");
        }
        if (adminToken) {
            document.getElementById('admin-panel').classList.remove('hidden');
            renderOsintLogs();
        }
    }
}

async function fetchPostsFromServer() {
    try {
        const response = await fetch(`${SERVER_URL}/posts`);
        const data = await response.json();
        if (JSON.stringify(posts) !== JSON.stringify(data)) {
            posts = data;
            renderPosts(true);

            // Если админка открыта, обновляем логи на лету
            if (!document.getElementById('admin-panel').classList.contains('hidden')) {
                // Только если открыта вкладка постов
                if (document.getElementById("admin-content").innerHTML.includes("УДАЛИТЬ")) {
                    renderOsintLogs();
                }
            }
        }
    } catch (e) { }
}

async function createNewPost() {
    const textEl = document.getElementById("post-text");
    const contentText = textEl.value.trim();
    if (!contentText && !currentAttachedFileBase64) return;

    const newPost = {
        author: currentUser ? currentUser.username : i18n[currentLang].anon,
        uid: currentUser ? currentUser.uid : "#0000",
        text: contentText,
        media: currentAttachedFileBase64,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        osint: getOsintData()
    };

    try {
        await fetch(`${SERVER_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPost)
        });

        textEl.value = "";
        document.getElementById("post-file").value = "";
        document.getElementById("file-preview-name").textContent = "";
        currentAttachedFileBase64 = null;
        fetchPostsFromServer();
    } catch (e) { alert("Ошибка подключения!"); }
}

async function addComment(postId) {
    if (!currentUser) { alert(i18n[currentLang].alertAuth); return; }
    const inputEl = document.getElementById(`comment-input-${postId}`);
    const commentText = inputEl.value.trim();
    if (!commentText) return;

    try {
        await fetch(`${SERVER_URL}/posts/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: currentUser.username, text: commentText })
        });
        fetchPostsFromServer();
    } catch (e) { alert("Ошибка сервера."); }
}

// НОВОЕ: Регистрация с отправкой на сервер
async function registerUser() {
    const name = document.getElementById("auth-username").value.trim();
    if (!name) return;

    currentUser = { username: name, uid: `#${Math.floor(1000 + Math.random() * 9000)}` };
    localStorage.setItem("dischan_user", JSON.stringify(currentUser));
    updateUserUI();
    document.getElementById("auth-username").value = "";

    // Отправляем данные на сервер
    try {
        await fetch(`${SERVER_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentUser)
        });
    } catch (e) { console.error("Не удалось сохранить юзера на сервере"); }
}

function updateUserUI() {
    if (currentUser) {
        document.getElementById("auth-box").classList.add("hidden");
        document.getElementById("profile-box").classList.remove("hidden");
        document.getElementById("btn-logout").classList.remove("hidden");
        document.getElementById("profile-name").textContent = currentUser.username;
        document.getElementById("profile-id").textContent = currentUser.uid;
    } else {
        document.getElementById("auth-box").classList.remove("hidden");
        document.getElementById("profile-box").classList.add("hidden");
        document.getElementById("btn-logout").classList.add("hidden");
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem("dischan_user");
    updateUserUI();
}

function parseMarkdown(text) {
    let safeText = text.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    safeText = safeText.replace(/\|\|(.*?)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    safeText = safeText.replace(/^&gt; (.*?)$/gm, '<blockquote class="quote">$1</blockquote>');
    return safeText;
}

function setLanguage(lang) {
    currentLang = lang;
    updateLanguageUI();
    document.getElementById("disclaimer-text-ru").classList.toggle("hidden", lang !== 'ru');
    document.getElementById("disclaimer-text-en").classList.toggle("hidden", lang !== 'en');
}

function toggleLanguage() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    updateLanguageUI();
}

function updateLanguageUI() {
    const t = i18n[currentLang];
    document.getElementById("text-online").textContent = t.online;
    document.getElementById("label-auth-title").textContent = t.authTitle;
    document.getElementById("btn-register").textContent = t.registerBtn;
    document.getElementById("label-create-post").textContent = t.createPost;
    document.getElementById("label-choose-file").textContent = t.chooseFile;
    document.getElementById("btn-send-post").textContent = t.sendPost;
    document.getElementById("btn-logout").textContent = t.logout;
    document.getElementById("post-text").placeholder = t.placeholderText;
    document.getElementById("btn-lang-toggle").textContent = currentLang === 'ru' ? 'EN' : 'RU';
    document.getElementById("label-settings-title").textContent = t.settingsTitle;
    document.getElementById("label-compact-mode").textContent = t.compactMode;
    document.getElementById("btn-close-settings").textContent = t.close;

    document.getElementById("nav-feed").textContent = t.navFeed;
    document.getElementById("nav-post").textContent = t.navPost;
    document.getElementById("nav-profile").textContent = t.navProfile;
    document.getElementById("nav-settings").textContent = t.navSettings;
    document.getElementById("nav-admin").textContent = t.navAdmin;

    renderPosts(true);
}

function closeSettings() { document.getElementById("settings-overlay").classList.add("hidden"); }
function toggleCompactMode() {
    isCompactMode = document.getElementById("toggle-compact").checked;
    localStorage.setItem("dischan_compact", isCompactMode);
    document.body.classList.toggle("compact-mode", isCompactMode);
}

function exitSite() { window.location.href = "https://www.google.com"; }
function acceptDisclaimer() {
    document.getElementById("disclaimer-overlay").classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");
}

function handleFileSelect() {
    const file = document.getElementById("post-file").files[0];
    const previewName = document.getElementById("file-preview-name");
    if (file) {
        previewName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = e => currentAttachedFileBase64 = { data: e.target.result, type: file.type };
        reader.readAsDataURL(file);
    } else {
        previewName.textContent = "";
        currentAttachedFileBase64 = null;
    }
}

function getOsintData() {
    return { userAgent: navigator.userAgent, screen: `${window.screen.width}x${window.screen.height}`, language: navigator.language, time: new Date().toISOString() };
}

function renderPosts(reset = false) {
    const container = document.getElementById("posts-container");
    const t = i18n[currentLang];

    if (reset) {
        container.innerHTML = "";
        currentlyDisplayed = 0;
    }

    const postsToRender = posts.slice(currentlyDisplayed, currentlyDisplayed + POSTS_PER_PAGE);

    postsToRender.forEach(post => {
        const card = document.createElement("div");
        card.className = "post-card";
        let mediaHtml = "";
        if (post.media) {
            if (post.media.type.startsWith("image/")) mediaHtml = `<div class="post-media"><img src="${post.media.data}" alt="media"></div>`;
            else if (post.media.type.startsWith("video/")) mediaHtml = `<div class="post-media"><video src="${post.media.data}" controls></video></div>`;
        }
        let commentsHtml = post.comments.map(c => `<div class="comment-item"><span class="comment-author">${c.author}:</span> <span class="comment-text">${parseMarkdown(c.text)}</span></div>`).join('');
        const parsedBody = post.text ? parseMarkdown(post.text) : "";

        card.innerHTML = `
            <div class="post-header"><span class="post-author">${post.author}</span><span class="post-uid">${post.uid}</span><span class="post-time">${post.time}</span></div>
            ${parsedBody ? `<div class="post-body">${parsedBody}</div>` : ""}
            ${mediaHtml}
            <div class="comments-section">
                <div class="comments-list">${commentsHtml}</div>
                <div class="comment-input-block">
                    <input type="text" id="comment-input-${post.id}" placeholder="${t.commentPlaceholder}">
                    <button class="btn-success" onclick="addComment(${post.id})">${t.commentBtn}</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    currentlyDisplayed += postsToRender.length;
    document.getElementById("load-more-trigger").style.display = currentlyDisplayed >= posts.length ? "none" : "block";
}

function setupIntersectionObserver() {
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && currentlyDisplayed < posts.length) renderPosts();
    }, { root: document.getElementById("feed-area"), threshold: 1.0 });
    observer.observe(document.getElementById("load-more-trigger"));
}

// --- АДМИНСКИЕ ФУНКЦИИ ---
function renderOsintLogs() {
    const content = document.getElementById("admin-content");
    content.innerHTML = posts.map(p => {
        let ip = p.osint?.server_ip || "Неизвестно";
        return `
        <div style="margin-bottom: 10px; border-bottom: 1px dashed #555; padding-bottom: 10px;">
            <strong style="color: #fff;">${p.author} ${p.uid}</strong> (ID: ${p.id})<br>
            Time: ${p.time}<br>
            IP: <span style="color: #f39c12;">${ip}</span><br>
            Screen: ${p.osint?.screen || '?'}<br>
            UA: ${p.osint?.server_user_agent ? p.osint.server_user_agent.substring(0, 30) : '...'}...<br>
            <button onclick="deletePost(${p.id})" style="background: #a14e4e; color: white; padding: 4px; font-weight: bold; border: none; cursor: pointer; width: 100%; margin-top: 5px;">УДАЛИТЬ ПОСТ</button>
        </div>
    `}).join('');
}

async function renderUsersList() {
    const content = document.getElementById("admin-content");
    content.innerHTML = "Загрузка...";
    try {
        const res = await fetch(`${SERVER_URL}/admin/users`, {
            headers: { 'X-Admin-Token': adminToken }
        });
        if (res.status === 403) {
            content.innerHTML = "❌ Неверный пароль!";
            adminToken = ""; // Сбрасываем пароль
            return;
        }
        const users = await res.json();

        if(users.length === 0) {
            content.innerHTML = "Пока никто не зарегистрировался.";
            return;
        }

        content.innerHTML = users.map(u => `
            <div style="margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                <strong style="color: #00aff4;">${u.username}</strong> <span style="color:#888">${u.uid}</span><br>
                Reg: ${u.reg_time}<br>
                IP: <span style="color: #f39c12;">${u.ip || '?'}</span>
            </div>
        `).join('');
    } catch (e) {
        content.innerHTML = "Ошибка сети.";
    }
}

async function deletePost(postId) {
    if(!confirm("Точно удалить пост?")) return;
    try {
        const res = await fetch(`${SERVER_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Token': adminToken }
        });

        if (res.status === 403) {
            alert("❌ Ошибка: Неверный пароль администратора!");
            adminToken = ""; // Сбрасываем неверный пароль
            return;
        }

        fetchPostsFromServer();
        setTimeout(renderOsintLogs, 500); // Обновляем админку после удаления
    } catch (e) { alert("Ошибка при удалении"); }
}