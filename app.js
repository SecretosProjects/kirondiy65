document.addEventListener('DOMContentLoaded', () => {
    let currentLang = 'ru';

    const translations = {
        ru: {
            search: "Поиск...",
            placeholder: "Напиши что-нибудь...",
            btn: "Опубликовать",
            commentBtn: "Ответить",
            commentPlaceholder: "Ваш комментарий..."
        },
        en: {
            search: "Search...",
            placeholder: "Write something...",
            btn: "Publish",
            commentBtn: "Reply",
            commentPlaceholder: "Your comment..."
        }
    };

    if (!localStorage.getItem('userId')) {
        localStorage.setItem('userId', 'ID_' + Math.random().toString(36).substr(2, 9));
    }
    const userId = localStorage.getItem('userId');

    const ageModal = document.getElementById('ageModal');
    const mainContent = document.getElementById('mainContent');

    if (localStorage.getItem('ageVerified') === 'true') {
        ageModal.style.display = 'none';
        mainContent.style.display = 'block';
        loadPosts();
    }

    document.getElementById('btnYes').addEventListener('click', () => {
        localStorage.setItem('ageVerified', 'true');
        ageModal.style.display = 'none';
        mainContent.style.display = 'block';
        loadPosts();
    });

    document.getElementById('btnNo').addEventListener('click', () => {
        window.location.href = "https://google.com";
    });

    const langBtn = document.getElementById('langBtn');
    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'ru' ? 'en' : 'ru';
        langBtn.textContent = currentLang === 'ru' ? 'EN' : 'RU';
        updateLanguage();
        loadPosts();
    });

    function updateLanguage() {
        document.getElementById('searchInput').placeholder = translations[currentLang].search;
        document.getElementById('postText').placeholder = translations[currentLang].placeholder;
        document.getElementById('submitPost').textContent = translations[currentLang].btn;
    }

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        loadPosts(searchInput.value);
    });

    const form = document.getElementById('postForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('postText').value;
        const fileInput = document.getElementById('postFile');
        const file = fileInput.files[0];

        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('text', text);
        if (file) formData.append('file', file);

        fetch('/api/posts', {
            method: 'POST',
            body: formData
        }).then(() => {
            document.getElementById('postText').value = '';
            fileInput.value = '';
            loadPosts();
        });
    });

    function loadPosts(query = "") {
        fetch(`/api/posts?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(posts => {
                const feed = document.getElementById('feed');
                feed.innerHTML = '';
                posts.forEach(post => {
                    const postDiv = document.createElement('div');
                    postDiv.className = 'post';

                    let mediaHtml = '';
                    if (post.media_url) {
                        if (post.media_type === 'image') {
                            mediaHtml = `<img src="${post.media_url}" class="media-content">`;
                        } else if (post.media_type === 'video') {
                            mediaHtml = `<video src="${post.media_url}" controls class="media-content"></video>`;
                        }
                    }

                    postDiv.innerHTML = `
                        <div class="post-info">${post.user_id}</div>
                        <div>${post.text}</div>
                        ${mediaHtml}
                        <div class="comments-section" id="comments-${post.id}"></div>
                        <form class="comment-form" onsubmit="submitComment(event, ${post.id})">
                            <input type="text" id="comment-text-${post.id}" placeholder="${translations[currentLang].commentPlaceholder}" required>
                            <button type="submit">${translations[currentLang].commentBtn}</button>
                        </form>
                    `;
                    feed.appendChild(postDiv);
                    loadComments(post.id);
                });
            });
    }

    window.submitComment = function(e, postId) {
        e.preventDefault();
        const textInput = document.getElementById(`comment-text-${postId}`);
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('text', textInput.value);

        fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            body: formData
        }).then(() => {
            textInput.value = '';
            loadComments(postId);
        });
    };

    function loadComments(postId) {
        fetch(`/api/posts/${postId}/comments`)
            .then(response => response.json())
            .then(comments => {
                const commentsDiv = document.getElementById(`comments-${postId}`);
                commentsDiv.innerHTML = '';
                comments.forEach(c => {
                    const cDiv = document.createElement('div');
                    cDiv.className = 'comment';
                    cDiv.textContent = `${c.user_id}: ${c.text}`;
                    commentsDiv.appendChild(cDiv);
                });
            });
    }

    updateLanguage();
});