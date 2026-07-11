/**
 * ARIES RP UI MANAGER - PRO VERSION (COMPLETE)
 * Система отрисовки интерфейса: форум, профиль, теги, ответы, админка.
 */

const UIManager = {
    // 1. Отрисовка списка категорий
    renderCategories(categories) {
        const container = document.getElementById('forum-container');
        if (!container) return;
        container.innerHTML = '';
        Object.keys(categories).forEach(catId => {
            const cat = categories[catId];
            const div = document.createElement('div');
            div.className = 'category-card';
            div.innerHTML = `
                <div class="cat-header">
                    <h3>${cat.title}</h3>
                    <p>${cat.desc}</p>
                </div>
                <div class="cat-threads">
                    <button onclick="UIManager.openCategory('${catId}')">Открыть раздел</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    // 2. Адаптивная отрисовка темы
    renderThread(threadData, threadId) {
        const threadEl = document.createElement('div');
        threadEl.className = 'thread-item';
        threadEl.innerHTML = `
            <div class="thread-info">
                <h4>${threadData.title}</h4>
                <small>Автор: ${threadData.author} | Статус: ${TagUI.renderTag(threadData.status)}</small>
            </div>
        `;
        return threadEl;
    },

    initResponsiveStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .category-card { background: #1a1a1a; padding: 20px; margin-bottom: 15px; border-left: 4px solid #b71c1c; border-radius: 5px; }
            .thread-item { padding: 10px; border-bottom: 1px solid #333; }
            @media (max-width: 600px) { .category-card { padding: 10px; } h3 { font-size: 18px; } }
        `;
        document.head.appendChild(style);
    }
};

const ProfileUI = {
    async renderUserWidget(userData) {
        const container = document.getElementById('user-profile-corner');
        if (!container) return;
        const isOwner = (userData.role === 'owner');
        container.innerHTML = `
            <div class="user-widget">
                <img src="${userData.avatar || 'default-avatar.png'}" class="avatar-img">
                <span id="user-nick-display" class="${isOwner ? 'rainbow-text' : ''}">${userData.nickname}</span>
                <button onclick="ProfileUI.openSettings()">⚙️</button>
            </div>
        `;
        if (userData.role === 'admin' || isOwner) ModerationEngine.applyAdminVisuals('user-nick-display', true);
    },

    openSettings() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Настройки профиля</h3>
                <input type="text" id="new-nick" placeholder="Новый ник">
                <input type="text" id="new-avatar" placeholder="Ссылка на аватар/GIF">
                <button onclick="ProfileUI.saveSettings()">Сохранить</button>
                <button onclick="this.parentElement.parentElement.remove()">Закрыть</button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async saveSettings() {
        const nick = document.getElementById('new-nick').value;
        const avatar = document.getElementById('new-avatar').value;
        if (nick) await ProfileManager.updateProfile(nick);
        if (avatar) await ProfileManager.setAvatar(avatar);
        location.reload();
    }
};

const TagUI = {
    getTagStyle(status) {
        const styles = {
            'open': { text: 'ОТКРЫТО', color: '#4caf50' },
            'closed': { text: 'ЗАКРЫТО', color: '#f44336' },
            'review': { text: 'НА РАССМОТРЕНИИ', color: '#ff9800' },
            'important': { text: 'ВАЖНО', color: '#2196f3' }
        };
        return styles[status] || { text: status.toUpperCase(), color: '#757575' };
    },
    renderTag(status) {
        const style = this.getTagStyle(status);
        return `<span class="forum-tag" style="background: ${style.color};">${style.text}</span>`;
    }
};

const ReplyUI = {
    renderReplyForm(categoryId, threadId) {
        const container = document.getElementById('thread-view-container');
        if (!container) return;
        const form = document.createElement('div');
        form.className = 'reply-form';
        form.innerHTML = `
            <h3>Ваш ответ</h3>
            <textarea id="reply-text" placeholder="Введите ваше сообщение..."></textarea>
            <input type="text" id="media-url" placeholder="Ссылка на фото/видео (URL)">
            <button onclick="ReplyUI.submitReply('${categoryId}', '${threadId}')">Отправить</button>
        `;
        container.appendChild(form);
    },

    async submitReply(catId, threadId) {
        const message = document.getElementById('reply-text').value;
        const media = document.getElementById('media-url').value;
        if (!message) return alert("Введите сообщение!");
        await attemptReply(catId, threadId, message);
        location.reload();
    }
};

const AdminDashboard = {
    renderDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'admin-dashboard';
        dashboard.className = 'admin-panel';
        dashboard.innerHTML = `
            <h2>Панель Руководства</h2>
            <div class="admin-controls">
                <button onclick="AdminDashboard.showUserEditor()">Пользователи</button>
                <button onclick="AdminDashboard.showCategoryEditor()">Разделы</button>
                <button onclick="AdminUtilities.exportAuditLogs()">Экспорт логов</button>
            </div>
        `;
        document.body.prepend(dashboard);
    },
    showUserEditor() {
        const uid = prompt("UID пользователя:");
        const role = prompt("Роль (admin/user/owner):");
        if (uid && role) { ForumManager.setAdminPrivileges(uid, role, '#ffffff'); alert("Обновлено!"); }
    },
    showCategoryEditor() {
        const title = prompt("Название раздела:");
        if (title) { ForumManager.createCategory(title, 'Описание', 'all'); alert("Создано!"); }
    }
};

const UIManagerFinal = {
    init() {
        UIManager.initResponsiveStyles();
        const header = document.querySelector('header') || document.body;
        const bell = document.createElement('div');
        bell.id = 'notify-bell';
        bell.style.cssText = 'position: fixed; top: 20px; right: 20px; cursor: pointer;';
        bell.innerHTML = '🔔 <span id="notify-count">0</span>';
        header.appendChild(bell);
    },
    async boot() {
        this.init();
        if (await ForumManager.checkAccess('admin')) AdminDashboard.renderDashboard();
    }
};

document.addEventListener('DOMContentLoaded', () => UIManagerFinal.boot());
