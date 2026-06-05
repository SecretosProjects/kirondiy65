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
    renderPosts();
    updateLanguageUI();
});

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

    // Настройки
    document.getElementById("label-settings-title").textContent = t.settingsTitle;
    document.getElementById("label-compact-mode").textContent = t.compactMode;
    document.getElementById("btn-close-settings").textContent = t.close;

    renderPosts();
}

// Настройки
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
        comments: []
    };

    posts.unshift(newPost);
    savePostsToStorage();
    renderPosts();

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
        renderPosts();
    }
}

function savePostsToStorage() { localStorage.setItem("dischan_posts", JSON.stringify(posts)); }

function renderPosts() {
    const container = document.getElementById("posts-container");
    container.innerHTML = "";
    const t = i18n[currentLang];

    posts.forEach(post => {
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
            commentsHtml += `<div class="comment-item"><span class="comment-author">${c.author}:</span> <span class="comment-text">${c.text}</span></div>`;
        });

        card.innerHTML = `
            <div class="post-header">
                <span class="post-author">${post.author}</span>
                <span class="post-uid">${post.uid}</span>
                <span class="post-time">${post.time}</span>
            </div>
            ${post.text ? `<div class="post-body">${post.text}</div>` : ""}
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
}