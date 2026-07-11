/**
 * ARIES RP CORE ENGINE - PRO VERSION (PART 2 - FORUM MANAGEMENT)
 * Реализация системы разделов, тем и контроля доступа
 */

const ForumManager = {
    // 1. Создание нового раздела (только для владельца и администрации с доступом)
    async createCategory(title, description, permissions) {
        if (!Engine.isOwner) { alert("Нет прав доступа!"); return; }
        
        const catRef = db.ref('categories').push();
        await catRef.set({
            title: title,
            desc: description,
            permissions: permissions, // Например: "all", "admin_only"
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // 2. Создание темы в разделе
    async createThread(categoryId, title, content) {
        if (!Engine.user) { alert("Авторизуйтесь для создания темы!"); return; }
        
        const threadRef = db.ref('threads/' + categoryId).push();
        await threadRef.set({
            title: title,
            author: Engine.user.displayName || "User",
            content: content,
            status: "open", // open, closed, review
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // 3. Выдача прав (Админка, цвета ников)
    async setAdminPrivileges(uid, role, color) {
        if (!Engine.isOwner) return;
        
        await db.ref('admins/' + uid).set({
            role: role,
            color: color,
            rainbow: (role === 'owner'), // Твой радужный ник
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // 4. Логика удаления тем (Админ-функция)
    async deleteThread(categoryId, threadId) {
        // Проверка прав через базу
        const isAdmin = await this.checkAccess('admin');
        if (isAdmin) {
            await db.ref(`threads/${categoryId}/${threadId}`).remove();
        }
    },

    async checkAccess(level) {
        const snap = await db.ref('admins/' + Engine.user.uid).once('value');
        const data = snap.val();
        return data && (data.role === level || data.role === 'owner');
    }
};

// Интеграция с UI (показываем кнопки админа, если юзер админ)
Engine.renderAdminTools = async function() {
    if (!this.user) return;
    const snap = await db.ref('admins/' + this.user.uid).once('value');
    if (snap.exists()) {
        const adminPanel = document.getElementById('admin-dashboard');
        if (adminPanel) adminPanel.style.display = 'block';
    }
};
/**
 * ARIES RP CORE ENGINE - PRO VERSION (PART 2.2 - MODERATION & VISUALS)
 * Модуль банов, мутов и визуализации прав администратора
 */

const ModerationEngine = {
    // 1. Система наказаний (Бан/Мут аккаунта)
    async applySanction(targetUid, type, reason, duration) {
        if (!await ForumManager.checkAccess('admin')) return;

        const sanctionRef = db.ref('users/' + targetUid + '/sanctions').push();
        await sanctionRef.set({
            type: type, // 'ban', 'mute', 'warn'
            reason: reason,
            duration: duration,
            admin: Engine.user.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // Блокировка доступа, если это бан
        if (type === 'ban') {
            await db.ref('users/' + targetUid + '/isBanned').set(true);
        }
    },

    // 2. Радужный ник для админов (CSS Injection)
    applyAdminVisuals(elementId, isAdmin) {
        const el = document.getElementById(elementId);
        if (isAdmin && el) {
            el.style.backgroundImage = "linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)";
            el.style.webkitBackgroundClip = "text";
            el.style.color = "transparent";
            el.style.animation = "rainbow 5s linear infinite";
            el.style.fontWeight = "bold";
        }
    },

    // 3. Логирование действий администратора (Полный аудит)
    async logAction(action, target, details) {
        const logRef = db.ref('audit_logs').push();
        await logRef.set({
            adminId: Engine.user.uid,
            action: action,
            target: target,
            details: details,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
};

// Добавляем глобальные стили для радужных ников
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes rainbow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
`;
document.head.appendChild(styleSheet);

/**
 * Инициализация дополнительных событий форума
 */
document.addEventListener('DOMContentLoaded', () => {
    // Слушатель для кнопок управления темами
    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-thread-btn')) {
            const threadId = e.target.getAttribute('data-id');
            const catId = e.target.getAttribute('data-cat');
            await ForumManager.deleteThread(catId, threadId);
            alert("Тема удалена.");
        }
    });
});
/**
 * ARIES RP CORE ENGINE - PRO VERSION (PART 2.3 - USER PROFILE & SETTINGS)
 * Модуль настроек аккаунта, аватарок и хранения профиля
 */

const ProfileManager = {
    // 1. Обновление ника и данных профиля
    async updateProfile(newNickname) {
        if (!Engine.user) return;
        
        await db.ref('users/' + Engine.user.uid).update({
            nickname: newNickname,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Обновляем дисплейное имя в Firebase Auth
        await Engine.user.updateProfile({ displayName: newNickname });
        alert("Никнейм обновлен!");
    },

    // 2. Установка аватара (ссылка на фото/гиф)
    async setAvatar(avatarUrl) {
        if (!Engine.user) return;
        
        await db.ref('users/' + Engine.user.uid).update({
            avatar: avatarUrl
        });
        alert("Аватар успешно установлен!");
    },

    // 3. Безопасная смена почты (Firebase Auth standard)
    async updateEmail(newEmail) {
        try {
            await Engine.user.updateEmail(newEmail);
            await Engine.user.sendEmailVerification();
            alert("Почта изменена! Подтвердите новый адрес по ссылке в письме.");
        } catch (e) {
            alert("Ошибка смены почты: " + e.message);
        }
    },

    // 4. Получение данных профиля для отображения
    async getProfileData(uid) {
        const snap = await db.ref('users/' + uid).once('value');
        return snap.val();
    }
};

/**
 * Система оповещений (Иконка с уведомлением)
 * Добавляем в UI при загрузке страницы
 */
function initNotifications() {
    const notifyIcon = document.createElement('div');
    notifyIcon.id = "notify-bell";
    notifyIcon.innerHTML = "🔔 <span id='notify-count'>0</span>";
    document.body.appendChild(notifyIcon);
    
    // Подписываемся на изменения в базе (новые сообщения)
    db.ref('notifications/' + Engine.user.uid).on('value', (snap) => {
        const count = snap.numChildren();
        document.getElementById('notify-count').innerText = count;
    });
}

// Запуск модуля профиля при инициализации Engine
Engine.init();
/**
 * ARIES RP CORE ENGINE - PRO VERSION (PART 4 - THREAD MANAGEMENT)
 * Модуль управления темами, тегами и жизненным циклом обсуждений
 */

const ThreadManager = {
    // 1. Установка тегов (статусов) темы
    async setThreadStatus(categoryId, threadId, status) {
        // Статусы: 'open', 'closed', 'review', 'important'
        if (!await ForumManager.checkAccess('admin')) return;

        await db.ref(`threads/${categoryId}/${threadId}/metadata`).update({
            status: status,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        await ModerationEngine.logAction('update_status', threadId, `Status changed to ${status}`);
    },

    // 2. Добавление ответа в тему (Post system)
    async postReply(categoryId, threadId, message, attachments = []) {
        if (!Engine.user) return;

        const replyRef = db.ref(`threads/${categoryId}/${threadId}/replies`).push();
        await replyRef.set({
            authorId: Engine.user.uid,
            authorName: Engine.user.displayName,
            message: message,
            attachments: attachments, // Массив ссылок на фото/видео
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // 3. Форматирование/Редактирование сообщений (Админ-функция)
    async editPost(categoryId, threadId, replyId, newContent) {
        if (!await ForumManager.checkAccess('admin')) return;

        await db.ref(`threads/${categoryId}/${threadId}/replies/${replyId}`).update({
            message: newContent,
            editedAt: firebase.database.ServerValue.TIMESTAMP,
            editedBy: Engine.user.uid
        });
    },

    // 4. Поиск и фильтрация тем
    async getThreadsByCategory(categoryId) {
        const snap = await db.ref(`threads/${categoryId}`).once('value');
        return snap.exists() ? snap.val() : {};
    }
};

/**
 * Инициализация интерактивных элементов UI для тем
 */
function attachThreadEvents() {
    const threadContainer = document.querySelector('.thread-list');
    if (threadContainer) {
        // Логика отрисовки ярлыков (Статусов)
        db.ref('threads').on('child_added', (snap) => {
            console.log("Новая тема в системе:", snap.key);
        });
    }
}

// Запуск прослушивателя
attachThreadEvents();
/**
 * ARIES RP CORE ENGINE - PRO VERSION (PART 5 - SANCTION SYSTEM)
 * Реализация логики проверки на мут/бан перед действиями пользователя
 */

const SanctionManager = {
    // 1. Проверка пользователя на активные ограничения
    async isUserRestricted(uid) {
        const snap = await db.ref(`users/${uid}/sanctions`).once('value');
        if (!snap.exists()) return { restricted: false };

        const sanctions = snap.val();
        const now = Date.now();
        let restricted = false;
        let reason = "";

        for (let key in sanctions) {
            const s = sanctions[key];
            if (s.expiry > now) {
                restricted = true;
                reason = s.reason;
                break;
            }
        }
        return { restricted, reason };
    },

    // 2. Глобальная блокировка действий (Wrapper)
    async executeProtectedAction(actionCallback) {
        if (!Engine.user) return;
        
        const status = await this.isUserRestricted(Engine.user.uid);
        if (status.restricted) {
            alert("Ваш аккаунт ограничен: " + status.reason);
            return;
        }
        
        await actionCallback();
    },

    // 3. Выдача мута (для использования админами в панели)
    async issueMute(targetUid, minutes, reason) {
        if (!await ForumManager.checkAccess('admin')) return;

        const expiry = Date.now() + (minutes * 60 * 1000);
        await db.ref(`users/${targetUid}/sanctions`).push({
            type: 'mute',
            reason: reason,
            expiry: expiry,
            admin: Engine.user.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        await ModerationEngine.logAction('mute', targetUid, `Duration: ${minutes}m`);
    }
};

/**
 * Интеграция: блокировка кнопки отправки сообщений, если юзер в муте
 */
async function attemptReply(categoryId, threadId, message) {
    await SanctionManager.executeProtectedAction(async () => {
        await ThreadManager.postReply(categoryId, threadId, message);
        alert("Ответ отправлен!");
    });
}
/**
 * ARIES RP CORE ENGINE - PRO VERSION (PART 6 - FINAL ADMIN TOOLS)
 * Модуль массовой очистки, импорта данных и административного контроля
 */

const AdminUtilities = {
    // 1. Полное удаление сообщения (Админ-функция)
    async deleteMessage(categoryId, threadId, replyId) {
        if (!await ForumManager.checkAccess('admin')) return;
        
        await db.ref(`threads/${categoryId}/${threadId}/replies/${replyId}`).remove();
        await ModerationEngine.logAction('delete_message', replyId, `Deleted by Admin: ${Engine.user.uid}`);
    },

    // 2. Очистка старых тем (Авто-архивирование или удаление)
    async pruneOldThreads(categoryId, olderThanDays) {
        if (!await ForumManager.checkAccess('owner')) return;

        const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        const snap = await db.ref(`threads/${categoryId}`).once('value');
        
        snap.forEach((child) => {
            if (child.val().createdAt < cutoff) {
                child.ref.remove();
            }
        });
        await ModerationEngine.logAction('prune_threads', categoryId, `Removed topics older than ${olderThanDays} days`);
    },

    // 3. Выгрузка логов админа (Экспорт)
    async exportAuditLogs() {
        if (!await ForumManager.checkAccess('owner')) return;
        
        const snap = await db.ref('audit_logs').once('value');
        const data = JSON.stringify(snap.val(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit_logs.json';
        a.click();
    }
};

/**
 * Инициализация всех систем при старте (Финишная сборка)
 */
Engine.init();
Engine.completeAuth();
Engine.renderAdminTools();

console.log("ARIES RP CORE ENGINE: INITIALIZED SUCCESSFULLY.");
