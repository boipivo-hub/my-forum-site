/**
 * ==========================================================================================
 * ARIES ROLEPLAY - APPLICATION LAYER
 * ==========================================================================================
 * Обработка UI, рендеринг компонентов и взаимодействие с пользователем.
 * ==========================================================================================
 */

const UIManager = {
    
    /**
     * СИСТЕМА УВЕДОМЛЕНИЙ (TOAST)
     */
    toast(text, type = 'info') {
        const container = document.getElementById('alert-container');
        const alert = document.createElement('div');
        alert.className = `aries-alert ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        alert.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${text}</span>
        `;
        
        container.appendChild(alert);
        setTimeout(() => alert.classList.add('active'), 10);
        
        setTimeout(() => {
            alert.classList.remove('active');
            setTimeout(() => alert.remove(), 500);
        }, 4000);
    },

    /**
     * ОБНОВЛЕНИЕ ШАПКИ И ВИДЖЕТОВ ПОЛЬЗОВАТЕЛЯ
     */
    updateUserInterface() {
        const nav = document.getElementById('top-user-panel');
        const profile = Engine.State.profile;

        if (profile) {
            nav.innerHTML = `
                <div class="notif-wrapper" onclick="UIManager.showNotifs()">
                    <i class="fas fa-bell"></i>
                    <span class="bell-count" id="notif-count">${Engine.State.notifications}</span>
                </div>
                <div class="user-pill" onclick="UI.showModal('settings')">
                    <div class="pill-text">
                        <span class="pill-nick ${profile.isRainbow ? 'rainbow-text' : ''}" style="color: ${profile.tagColor}">
                            ${profile.nickname}
                        </span>
                        <span class="pill-rank">${profile.role.toUpperCase()}</span>
                    </div>
                    <img src="${profile.avatar}" class="pill-avatar">
                </div>
                <button class="btn-logout" onclick="Engine.auth.signOut()"><i class="fas fa-sign-out-alt"></i></button>
            `;
        } else {
            nav.innerHTML = `<button class="btn-auth-glow" onclick="UI.showModal('auth')">ВХОД / РЕГИСТРАЦИЯ</button>`;
        }
    },

    /**
     * ГЛАВНЫЙ РЕНДЕРЕР ФОРУМА
     */
    async renderHome() {
        const view = document.getElementById('forum-view');
        view.innerHTML = `<div class="skeleton-loader"></div>`;

        const categories = await ForumAPI.getCategories();
        view.innerHTML = "";

        for (const [id, cat] of Object.entries(categories)) {
            const section = document.createElement('div');
            section.className = "forum-category-block";
            section.innerHTML = `
                <div class="cat-header-main">
                    <div class="cat-title-info">
                        <i class="fas fa-folder"></i>
                        <h3>${cat.title}</h3>
                    </div>
                    <div class="cat-actions">
                        ${Engine.hasAccess('create_thread') ? `<button onclick="UI.openCreateThread('${id}')">НОВАЯ ТЕМА</button>` : ''}
                    </div>
                </div>
                <div class="threads-list" id="threads-container-${id}">
                    <div class="mini-loader">Загрузка тем...</div>
                </div>
            `;
            view.appendChild(section);
            this.loadThreadsForCategory(id);
        }
    },

    /**
     * ЗАГРУЗКА ТЕМ ДЛЯ КОНКРЕТНОГО РАЗДЕЛА
     */
    async loadThreadsForCategory(catId) {
        const container = document.getElementById(`threads-container-${catId}`);
        const snap = await Engine.db.ref(`threads/${catId}`).orderByChild('lastActivity').limitToLast(15).once('value');
        
        container.innerHTML = "";
        
        if (!snap.exists()) {
            container.innerHTML = `<div class="empty-notif">В этом разделе еще нет тем. Будьте первым!</div>`;
            return;
        }

        snap.forEach(child => {
            const t = child.val();
            const tid = child.key;
            
            const threadRow = document.createElement('div');
            threadRow.className = "thread-row-item";
            threadRow.innerHTML = `
                <div class="t-status-icon">
                    <i class="fas ${t.status === 'Закрыто' ? 'fa-lock' : 'fa-comments'}"></i>
                </div>
                <div class="t-main-info" onclick="Router.goThread('${catId}', '${tid}')">
                    <div class="t-title-row">
                        <span class="tag tag-${this.getTagSlug(t.status)}">${t.status}</span>
                        <span class="t-name">${t.title}</span>
                    </div>
                    <div class="t-meta">
                        <span class="t-author">${t.authorName}</span>
                        <span class="t-date">${new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="t-stats">
                    <div class="stat"><i class="fas fa-eye"></i> ${t.views || 0}</div>
                    <div class="stat"><i class="fas fa-reply"></i> ${t.repliesCount || 0}</div>
                </div>
            `;
            container.prepend(threadRow); // Новые темы сверху
        });
    },

    getTagSlug(status) {
        if (status === "Открыто") return "open";
        if (status === "Закрыто") return "closed";
        return "review";
    },

    hidePreloader() {
        const pre = document.getElementById('loader-wrapper');
        if (pre) {
            pre.style.opacity = '0';
            setTimeout(() => pre.style.display = 'none', 500);
        }
    }
};

/**
 * ==========================================================================================
 * ADMIN & MODERATION MANAGER
 * ==========================================================================================
 */
const AdminManager = {
    // Выдача прав пользователю
    async setUserRole(uid, newRole) {
        if (!Engine.hasAccess('edit_user')) return;
        await Engine.db.ref(`users/${uid}`).update({ role: newRole });
        UIManager.toast(`Роль пользователя изменена на ${newRole}`, "success");
    },

    // Бан аккаунта
    async toggleBan(uid, status) {
        if (!Engine.hasAccess('ban_user')) return;
        await Engine.db.ref(`users/${uid}`).update({ isBanned: status });
        UIManager.toast(status ? "Пользователь забанен" : "Пользователь разбанен", "info");
    },

    // Логирование админ действий
    async logAction(details) {
        if (!Engine.State.profile) return;
        const logData = {
            admin: Engine.State.profile.nickname,
            action: details,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        await Engine.db.ref('admin_logs').push(logData);
    }
};

/**
 * ==========================================================================================
 * ROUTER SYSTEM
 * ==========================================================================================
 */
const Router = {
    handle(hash) {
        if (!hash || hash === '#home') {
            UIManager.renderHome();
        }
    },
    goThread(catId, tid) {
        window.location.hash = `thread/${catId}/${tid}`;
        // Здесь будет логика отрисовки самой темы (постов)
        this.renderThreadView(catId, tid);
    },

    async renderThreadView(catId, tid) {
        const view = document.getElementById('forum-view');
        const snap = await Engine.db.ref(`threads/${catId}/${tid}`).once('value');
        const t = snap.val();
        
        // Увеличение просмотров
        Engine.db.ref(`threads/${catId}/${tid}`).update({ views: (t.views || 0) + 1 });

        view.innerHTML = `
            <div class="thread-full-view">
                <div class="thread-header-title">
                    <button class="btn-back" onclick="Router.handle('#home')"><i class="fas fa-arrow-left"></i> Назад</button>
                    <h2>${t.title}</h2>
                    <div class="admin-thread-tools">
                        ${Engine.hasAccess('delete_thread') ? `<button onclick="ForumAPI.deleteThread('${catId}','${tid}')">УДАЛИТЬ</button>` : ''}
                    </div>
                </div>

                <div class="posts-container">
                    <!-- Главный пост (Автор) -->
                    <div class="post-card">
                        <div class="post-sidebar">
                            <img src="${t.authorAva}" class="post-ava">
                            <div class="post-nick ${t.authorRole === 'owner' ? 'rainbow-text' : ''}">${t.authorName}</div>
                            <div class="post-rank">${t.authorRole.toUpperCase()}</div>
                        </div>
                        <div class="post-main">
                            <div class="post-date">${new Date(t.createdAt).toLocaleString()}</div>
                            <div class="post-content">${t.content}</div>
                        </div>
                    </div>
                    
                    <div id="replies-list">
                        <!-- Тут будут ответы игроков -->
                    </div>
                </div>

                <div class="reply-editor-box">
                    <h3>Ваш ответ</h3>
                    <textarea id="reply-textarea" placeholder="Введите сообщение..."></textarea>
                    <div class="editor-btns">
                        <button class="btn-main-red" onclick="ForumAPI.sendReply('${tid}')">ОТПРАВИТЬ ОТВЕТ</button>
                    </div>
                </div>
            </div>
        `;
    }
};

/**
 * ==========================================================================================
 * AUTH & SESSION MANAGEMENT
 * ==========================================================================================
 */
const AuthManager = {
    async finalizeSignIn() {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) email = prompt('Введите ваш Email для верификации:');
        
        try {
            await Engine.auth.signInWithEmailLink(email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            UIManager.toast("Успешная авторизация!", "success");
            window.history.replaceState({}, null, window.location.pathname);
        } catch (e) {
            Engine.error("Auth failed", e);
        }
    }
};
