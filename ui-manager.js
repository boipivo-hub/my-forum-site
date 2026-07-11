/**
 * ARIES RP UI MANAGER - PRO VERSION (PART 1 - FORUM STRUCTURE)
 * Отрисовка категорий, тем и адаптивной сетки
 */

const UIManager = {
    // 1. Отрисовка списка категорий форума
    renderCategories(categories) {
        const container = document.getElementById('forum-container');
        container.innerHTML = ''; // Очистка перед отрисовкой

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
                <small>Автор: ${threadData.author} | Статус: <span class="tag-${threadData.status}">${threadData.status}</span></small>
            </div>
        `;
        return threadEl;
    },

    // 3. Базовая настройка стилей для телефонов (Mobile First)
    initResponsiveStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .category-card { 
                background: #1a1a1a; 
                padding: 20px; 
                margin-bottom: 15px; 
                border-left: 4px solid #b71c1c; 
                border-radius: 5px;
            }
            .thread-item { 
                padding: 10px; 
                border-bottom: 1px solid #333; 
            }
            @media (max-width: 600px) {
                .category-card { padding: 10px; }
                h3 { font-size: 18px; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Инициализация стилей при загрузке
/**
 * ARIES RP UI MANAGER - PRO VERSION (PART 2 - USER PROFILE & SETTINGS)
 * Отрисовка профиля, аватарки и меню настроек пользователя
 */

const ProfileUI = {
    // 1. Отрисовка виджета пользователя в углу (Header)
    async renderUserWidget(userData) {
        const container = document.getElementById('user-profile-corner');
        if (!container) return;

        const isOwner = (userData.role === 'owner');
        
        container.innerHTML = `
            <div class="user-widget">
                <img src="${userData.avatar || 'default-avatar.png'}" class="avatar-img">
                <span id="user-nick-display" class="${isOwner ? 'rainbow-text' : ''}">
                    ${userData.nickname}
                </span>
                <button onclick="ProfileUI.openSettings()">⚙️</button>
            </div>
        `;
        
        // Применяем радужный эффект, если админ
        if (userData.role === 'admin' || isOwner) {
            ModerationEngine.applyAdminVisuals('user-nick-display', true);
        }
    },

    // 2. Модальное окно настроек (Смена авы, ника)
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

    // 3. Сохранение настроек
    async saveSettings() {
        const nick = document.getElementById('new-nick').value;
        const avatar = document.getElementById('new-avatar').value;
        
        if (nick) await ProfileManager.updateProfile(nick);
        if (avatar) await ProfileManager.setAvatar(avatar);
        
        location.reload();
    }
};

// Дополнительные стили для виджета
const profileStyles = document.createElement("style");
profileStyles.innerHTML = `
    .user-widget { display: flex; align-items: center; gap: 10px; background: #000; padding: 5px 15px; border-radius: 20px; }
    .avatar-img { width: 35px; height: 35px; border-radius: 50%; object-fit: cover; }
    .settings-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 9999; }
    .modal-content { background: #1a1a1a; padding: 30px; border: 1px solid #b71c1c; border-radius: 10px; }
`;
document.head.appendChild(profileStyles);
UIManager.initResponsiveStyles();
/**
 * ARIES RP UI MANAGER - PRO VERSION (PART 3 - TAG SYSTEM)
 * Визуальное отображение статусов тем (Открыто/Закрыто/На рассмотрении)
 */

const TagUI = {
    // 1. Получение стиля тега по его названию
    getTagStyle(status) {
        const styles = {
            'open': { text: 'ОТКРЫТО', color: '#4caf50' },
            'closed': { text: 'ЗАКРЫТО', color: '#f44336' },
            'review': { text: 'НА РАССМОТРЕНИИ', color: '#ff9800' },
            'important': { text: 'ВАЖНО', color: '#2196f3' }
        };
        return styles[status] || { text: status.toUpperCase(), color: '#757575' };
    },

    // 2. Отрисовка тега в элементе темы
    renderTag(status) {
        const style = this.getTagStyle(status);
        return `
            <span class="forum-tag" style="background: ${style.color};">
                ${style.text}
            </span>
        `;
    }
};

// Стили для тегов
const tagStyles = document.createElement("style");
tagStyles.innerHTML = `
    .forum-tag { 
        padding: 2px 8px; 
        border-radius: 4px; 
        font-size: 10px; 
        font-weight: bold; 
        color: white; 
        margin-left: 5px; 
        text-transform: uppercase;
        vertical-align: middle;
    }
`;
document.head.appendChild(tagStyles);
/**
 * ARIES RP UI MANAGER - PRO VERSION (PART 4 - REPLY INTERFACE)
 * Интерфейс отправки сообщений и прикрепления медиа
 */

const ReplyUI = {
    // 1. Отрисовка формы ответа
    renderReplyForm(categoryId, threadId) {
        const container = document.getElementById('thread-view-container');
        if (!container) return;

        const form = document.createElement('div');
        form.className = 'reply-form';
        form.innerHTML = `
            <h3>Ваш ответ</h3>
            <textarea id="reply-text" placeholder="Введите ваше сообщение..."></textarea>
            <div class="media-inputs">
                <input type="text" id="media-url" placeholder="Ссылка на фото/видео (URL)">
            </div>
            <button onclick="ReplyUI.submitReply('${categoryId}', '${threadId}')">Отправить ответ</button>
        `;
        container.appendChild(form);
    },

    // 2. Обработка отправки через Engine
    async submitReply(catId, threadId) {
        const message = document.getElementById('reply-text').value;
        const media = document.getElementById('media-url').value;
        
        if (!message) { alert("Сообщение не может быть пустым!"); return; }
        
        const attachments = media ? [media] : [];
        await attemptReply(catId, threadId, message, attachments);
        
        document.getElementById('reply-text').value = '';
        location.reload(); // Обновляем страницу, чтобы увидеть ответ
    }
};

// Стили для формы ответа
const replyStyles = document.createElement("style");
replyStyles.innerHTML = `
    .reply-form { margin-top: 30px; padding: 20px; background: #1a1a1a; border-radius: 5px; }
    textarea { width: 100%; height: 100px; background: #000; color: #fff; border: 1px solid #333; padding: 10px; margin-bottom: 10px; }
    .media-inputs { margin-bottom: 10px; }
    .media-inputs input { width: 100%; padding: 8px; background: #000; color: #fff; border: 1px solid #333; }
`;
document.head.appendChild(replyStyles);
/**
 * ARIES RP UI MANAGER - PRO VERSION (PART 5 - ADMIN DASHBOARD)
 * Интерфейс управления для администрации и владельца
 */

const AdminDashboard = {
    // 1. Отрисовка панели (только для админов)
    renderDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'admin-dashboard';
        dashboard.className = 'admin-panel';
        dashboard.innerHTML = `
            <h2>Панель Руководства</h2>
            <div class="admin-controls">
                <button onclick="AdminDashboard.showUserEditor()">Управление пользователями</button>
                <button onclick="AdminDashboard.showCategoryEditor()">Управление разделами</button>
                <button onclick="AdminUtilities.exportAuditLogs()">Экспорт логов</button>
            </div>
        `;
        document.body.prepend(dashboard);
    },

    // 2. Интерфейс назначения прав
    showUserEditor() {
        const uid = prompt("Введите UID пользователя:");
        const role = prompt("Введите роль (admin/user/owner):");
        const color = prompt("Введите цвет ника (hex):");
        
        if (uid && role) {
            ForumManager.setAdminPrivileges(uid, role, color);
            alert("Права обновлены!");
        }
    },

    // 3. Управление категориями (Создание новых разделов)
    showCategoryEditor() {
        const title = prompt("Название раздела:");
        const desc = prompt("Описание:");
        if (title) {
            ForumManager.createCategory(title, desc, 'all');
            alert("Раздел создан!");
        }
    }
};

// Стили админ-панели
const adminPanelStyles = document.createElement("style");
adminPanelStyles.innerHTML = `
    .admin-panel { 
        background: #2b0000; 
        padding: 20px; 
        border-bottom: 3px solid #b71c1c; 
        margin-bottom: 20px; 
    }
    .admin-controls { display: flex; gap: 10px; margin-top: 10px; }
    .admin-controls button { background: #b71c1c; color: white; border: none; padding: 10px; cursor: pointer; }
`;
document.head.appendChild(adminPanelStyles);
/**
 * ARIES RP UI MANAGER - PRO VERSION (PART 6 - FINAL UI INTEGRATION)
 * Система уведомлений и итоговая инициализация интерфейса
 */

const UIManagerFinal = {
    // 1. Инициализация глобального счетчика уведомлений
    initNotificationsUI() {
        const header = document.querySelector('header') || document.body;
        const bell = document.createElement('div');
        bell.id = 'notify-bell';
        bell.style.cssText = 'position: fixed; top: 20px; right: 20px; cursor: pointer; font-size: 24px; z-index: 1000;';
        bell.innerHTML = '🔔 <span id="notify-count" style="background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 12px;">0</span>';
        header.appendChild(bell);
    },

    // 2. Итоговая сборка форума
    async boot() {
        this.initNotificationsUI();
        
        // Автоматически рендерим панель админа, если юзер админ
        const isAdmin = await ForumManager.checkAccess('admin');
        if (isAdmin) {
            AdminDashboard.renderDashboard();
        }

        console.log("ARIES RP UI MANAGER: SYSTEM FULLY LOADED.");
    }
};

// Запуск финальной сборки при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
    UIManagerFinal.boot();
});

/**
 * Глобальный обработчик ошибок интерфейса для защиты от вылетов
 */
window.onerror = function(msg, url, line) {
    console.error("UI Error: " + msg + " at " + line);
    return false;
};
