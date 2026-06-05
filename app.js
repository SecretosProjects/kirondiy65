const i18n = {
    ru: {
        online: "Онлайн:", authTitle: "Регистрация", registerBtn: "Создать аккаунт",
        createPost: "Создать пост", chooseFile: "Выбрать фото/видео", sendPost: "Опубликовать",
        logout: "Выйти", anon: "Аноним", placeholderText: "Что у вас нового?",
        commentPlaceholder: "Написать комментарий...", commentBtn: "Отправить",
        alertAuth: "Пожалуйста, зарегистрируйтесь, чтобы совершить это действие.",
        settingsTitle: "Настройки", compactMode: "Компактный режим (Скрыть медиа)", close: "Закрыть"
    },
    en: {
        online: "Online:", authTitle: "Registration", registerBtn: "Create Account",
        createPost: "Create Post", chooseFile: "Choose Photo/Video", sendPost: "Publish",
        logout: "Log out", anon: "Anonymous", placeholderText: "What's new?",
        commentPlaceholder: "Write a comment...", commentBtn: "Send",
        alertAuth: "Please register to perform this action.",
        settingsTitle: "Settings", compactMode: "Compact Mode (Hide Media)", close: "Close"
    }
};

let currentLang = 'ru';
let currentUser = null;
let currentAttachedFileBase64 = null;
let posts = [];
let isCompactMode = false;

// Пагинация
const POSTS_PER_PAGE = 10;
let currentlyDisplayed = 0;

document.addEventListener("DOMContentLoaded", () => {
    const savedPosts = localStorage.getItem("dischan_posts");
    if (savedPosts) posts = JSON.parse(savedPosts);

    const savedUser = localStorage.getItem("dischan_user");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserUI();
    }

    const savedCompact = localStorage.getItem("dischan_compact");
    if (savedCompact === "true") {
        isCompactMode = true;
        document.getElementById("toggle-compact").checked = true;
        document.body.classList.add("compact-mode");
    }

    startOnlineCounter();
    renderPosts(true);
    updateLanguageUI();
    setupIntersectionObserver();
});

// Открытие скрытой админ-панели (OSINT) по нажатию Ctrl + Shift + O
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyO') {
        const adminPanel = document.getElementById('admin-panel');
        adminPanel.classList.toggle('hidden');
        renderOsintLogs();
    }
});

// Парсер Markdown и защита от XSS
function parseMarkdown(text) {
    let safeText = text.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));

    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    safeText = safeText.replace(/\|\|(.*?)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    safeText = safeText.replace(/^&gt; (.*?)$/gm, '<blockquote class="quote">$1</blockquote>');

    return safeText;
}

function startOnlineCounter() {
    const counterEl = document.getElementById("online-counter");
    let baseOnline = 144;
    setInterval(() => {
        const fluctuation = Math.floor(Math.random() * 7) - 3;
        let currentOnline = baseOnline + fluctuation;
        if (currentOnline < 10) currentOnline = 10;
        counterEl.textContent = currentOnline;
    }, 4000);
}

function setLanguage(lang) {
    currentLang = lang;
    updateLanguageUI();
    if (lang === 'ru') {
        document.getElementById("disclaimer-text-ru").classList.remove("hidden");
        document.getElementById("disclaimer-text-en").classList.add("hidden");
    } else {
        document.getElementById("disclaimer-text-ru").classList.add("hidden");
        document.getElementById("disclaimer-text-en").classList.remove("hidden");
    }
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

    renderPosts(true);
}

function openSettings() { document.getElementById("settings-overlay").classList.remove("hidden"); }
function closeSettings() { document.getElementById("settings-overlay").classList.add("hidden"); }
function toggleCompactMode() {
    isCompactMode = document.getElementById("toggle-compact").checked;
    localStorage.setItem("dischan_compact", isCompactMode);
    if (isCompactMode) {
        document.body.classList.add("compact-mode");
    } else {
        document.body.classList.remove("compact-mode");
    }
}

function exitSite() { window.location.href = "https://www.google.com"; }
function acceptDisclaimer() {
    document.getElementById("disclaimer-overlay").classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");
}

function registerUser() {
    const usernameInput = document.getElementById("auth-username");
    const name = usernameInput.value.trim();
    if (!name) return;
    const randomId = Math.floor(1000 + Math.random() * 9000);
    currentUser = { username: name, uid: `#${randomId}` };
    localStorage.setItem("dischan_user", JSON.stringify(currentUser));
    updateUserUI();
    usernameInput.value = "";
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

function handleFileSelect() {
    const fileInput = document.getElementById("post-file");
    const previewName = document.getElementById("file-preview-name");
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        previewName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            currentAttachedFileBase64 = { data: e.target.result, type: file.type };
        };
        reader.readAsDataURL(file);
    } else {
        previewName.textContent = "";
        currentAttachedFileBase64 = null;
    }
}

// OSINT данные
function getOsintData() {
    return {
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        time: new Date().toISOString()
    };
}

function createNewPost() {
    const textEl = document.getElementById("post-text");
    const contentText = textEl.value.trim();
    if (!contentText && !currentAttachedFileBase64) return;

    const authorName = currentUser ? currentUser.username : i18n[currentLang].anon;
    const authorUid = currentUser ? currentUser.uid : "#0000";

    const newPost = {
        id: Date.now(),
        author: authorName,
        uid: authorUid,
        text: contentText,
        media: currentAttachedFileBase64,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        comments: [],
        osint: getOsintData()
    };

    posts.unshift(newPost);
    savePostsToStorage();
    renderPosts(true);
    sendToTelegramBot(newPost);

    textEl.value = "";
    document.getElementById("post-file").value = "";
    document.getElementById("file-preview-name").textContent = "";
    currentAttachedFileBase64 = null;
}

function addComment(postId) {
    if (!currentUser) { alert(i18n[currentLang].alertAuth); return; }
    const inputEl = document.getElementById(`comment-input-${postId}`);
    const commentText = inputEl.value.trim();
    if (!commentText) return;

    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
        posts[postIndex].comments.push({ author: currentUser.username, text: commentText });
        savePostsToStorage();
        renderPosts(true);
    }
}

function savePostsToStorage() { localStorage.setItem("dischan_posts", JSON.stringify(posts)); }

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
            if (post.media.type.startsWith("image/")) {
                mediaHtml = `<div class="post-media"><img src="${post.media.data}" alt="media"></div>`;
            } else if (post.media.type.startsWith("video/")) {
                mediaHtml = `<div class="post-media"><video src="${post.media.data}" controls></video></div>`;
            }
        }

        let commentsHtml = "";
        post.comments.forEach(c => {
            commentsHtml += `<div class="comment-item"><span class="comment-author">${c.author}:</span> <span class="comment-text">${parseMarkdown(c.text)}</span></div>`;
        });

        const parsedBody = post.text ? parseMarkdown(post.text) : "";

        card.innerHTML = `
            <div class="post-header">
                <span class="post-author">${post.author}</span>
                <span class="post-uid">${post.uid}</span>
                <span class="post-time">${post.time}</span>
            </div>
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

    const trigger = document.getElementById("load-more-trigger");
    if (currentlyDisplayed >= posts.length) {
        trigger.style.display = "none";
    } else {
        trigger.style.display = "block";
    }
}

// Ленивая загрузка
function setupIntersectionObserver() {
    const trigger = document.getElementById("load-more-trigger");
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && currentlyDisplayed < posts.length) {
            renderPosts();
        }
    }, { root: document.getElementById("feed-area"), threshold: 1.0 });

    observer.observe(trigger);
}

// Отрисовка логов в админке
function renderOsintLogs() {
    const logsContainer = document.getElementById("osint-logs");
    logsContainer.innerHTML = "";
    posts.forEach(p => {
        if (p.osint) {
            logsContainer.innerHTML += `
                <div style="margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                    <strong>${p.author} ${p.uid}</strong> (${p.time})<br>
                    Lang: ${p.osint.language} | Screen: ${p.osint.screen}<br>
                    UA: ${p.osint.userAgent.substring(0, 50)}...
                </div>
            `;
        }
    });
}

// Заглушка отправки в ТГ
function sendToTelegramBot(postData) {
    console.log("[Telegram API Stub] Отправка поста в канал:", postData.text);
}