document.addEventListener('DOMContentLoaded', () => {
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

                    let deleteBtnHtml = '';
                    if (post.user_id === userId) {
                        deleteBtnHtml = `<button class="action-btn delete-btn" onclick="deletePost(${post.id})">Удалить пост</button>`;
                    }

                    postDiv.innerHTML = `
                        <div class="post-info">
                            <span>Автор: ${post.user_id}</span>
                        </div>
                        <div>${post.text}</div>
                        ${mediaHtml}
                        <div class="post-actions">
                            <button class="action-btn" onclick="likePost(${post.id})">Лайк (${post.likes})</button>
                            <button class="action-btn" onclick="toggleComments(${post.id})">Комментарии</button>
                            ${deleteBtnHtml}
                        </div>
                        <div class="comments-section" id="comments-${post.id}">
                            <div id="comments-list-${post.id}"></div>
                            <form class="comment-form" onsubmit="submitComment(event, ${post.id})">
                                <input type="text" id="comment-text-${post.id}" placeholder="Написать комментарий..." required>
                                <button type="submit">Отправить</button>
                            </form>
                        </div>
                    `;
                    feed.appendChild(postDiv);
                    loadComments(post.id);
                });
            });
    }

    window.likePost = function(postId) {
        fetch(`/api/posts/${postId}/like`, { method: 'POST' })
            .then(() => loadPosts(document.getElementById('searchInput').value));
    };

    window.deletePost = function(postId) {
        if (confirm("Точно удалить пост?")) {
            fetch(`/api/posts/${postId}?user_id=${userId}`, { method: 'DELETE' })
                .then(() => loadPosts(document.getElementById('searchInput').value));
        }
    };

    window.toggleComments = function(postId) {
        const section = document.getElementById(`comments-${postId}`);
        section.style.display = section.style.display === 'block' ? 'none' : 'block';
    };

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
                const commentsListDiv = document.getElementById(`comments-list-${postId}`);
                if (commentsListDiv) {
                    commentsListDiv.innerHTML = '';
                    comments.forEach(c => {
                        const cDiv = document.createElement('div');
                        cDiv.className = 'comment';
                        cDiv.textContent = `${c.user_id}: ${c.text}`;
                        commentsListDiv.appendChild(cDiv);
                    });
                }
            });
    }
});