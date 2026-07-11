/**
 * ==========================================================================================
 * ARIES ROLEPLAY - ADVANCED FORUM ENGINE (PRO VERSION)
 * ==========================================================================================
 * @author: Qumestlies_Shawty (Lead Developer / Owner)
 * @version: 2.5.0
 * @description: Глобальное ядро управления данными, безопасностью и сессиями.
 * ==========================================================================================
 */

const Engine = {
    // Конфигурация системы
    CONFIG: {
        OWNER_EMAIL: "ponkc29@gamil.com",
        OWNER_NICK: "Qumestlies_Shawty",
        VERSION: "2.5.0-STABLE",
        DEBUG: true,
        MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
        DEFAULT_AVATAR: "https://i.imgur.com/6EOnf8A.png"
    },

    // Глобальное состояние (State)
    State: {
        user: null,
        profile: null,
        currentCategory: null,
        currentThread: null,
        isLoaded: false,
        notifications: 0
    },

    // Инициализация Firebase ссылок
    db: firebase.database(),
    auth: firebase.auth(),

    /**
     * ГЛАВНЫЙ ЗАПУСК СИСТЕМЫ
     */
    async boot() {
        this.log("System initialization started...");
        
        // 1. Слушатель авторизации
        this.auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                this.State.user = firebaseUser;
                await this.syncProfile();
                this.log(`Session established for: ${this.State.profile.nickname}`);
            } else {
                this.clearSession();
                this.log("No active session found.");
            }
            
            // 2. Роутинг и рендер
            Router.handle(window.location.hash);
            UIManager.hidePreloader();
        });

        // 2. Обработка входящих ссылок (Magic Link)
        if (this.auth.isSignInWithEmailLink(window.location.href)) {
            await AuthManager.finalizeSignIn();
        }

        this.State.isLoaded = true;
    },

    /**
     * СИНХРОНИЗАЦИЯ ПРОФИЛЯ С БАЗОЙ ДАННЫХ
     */
    async syncProfile() {
        try {
            const uid = this.State.user.uid;
            const ref = this.db.ref(`users/${uid}`);
            const snapshot = await ref.once('value');
            
            let data = snapshot.val();

            if (!data) {
                // Создание профиля для нового игрока
                data = {
                    uid: uid,
                    nickname: this.State.user.email.split('@')[0],
                    email: this.State.user.email,
                    avatar: this.CONFIG.DEFAULT_AVATAR,
                    role: "user",
                    status: "Новичок Aries RP",
                    isRainbow: false,
                    isBanned: false,
                    isMuted: false,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    stats: { posts: 0, likes: 0, reputation: 0 }
                };

                // ПРИВЯЗКА ВЛАДЕЛЬЦА ПО EMAIL
                if (data.email === this.CONFIG.OWNER_EMAIL) {
                    data.nickname = this.CONFIG.OWNER_NICK;
                    data.role = "owner";
                    data.isRainbow = true;
                    data.status = "Основатель проекта";
                }

                await ref.set(data);
            }

            this.State.profile = data;

            // Глобальная проверка на БАН
            if (this.State.profile.isBanned) {
                this.lockInterface("ACCESS DENIED: Ваш аккаунт заблокирован.");
            }

            UIManager.updateUserInterface();

        } catch (error) {
            this.error("Profile sync failed", error);
        }
    },

    /**
     * СИСТЕМА ПРАВ ДОСТУПА (ACL)
     * @param {string} action - Действие (delete_thread, ban_user etc)
     */
    hasAccess(action) {
        if (!this.State.profile) return false;
        const role = this.State.profile.role;

        const permissions = {
            owner: ["all"],
            admin: ["delete_thread", "close_thread", "ban_user", "edit_user"],
            moderator: ["close_thread", "delete_reply"],
            user: ["create_thread", "reply"]
        };

        if (role === 'owner') return true;
        return permissions[role] ? permissions[role].includes(action) : false;
    },

    /**
     * БЕЗОПАСНОСТЬ: Очистка текста от XSS
     */
    sanitize(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * ЛОГИРОВАНИЕ ДЛЯ ДЕБАГА
     */
    log(msg) {
        if (this.CONFIG.DEBUG) {
            console.log(`%c[ARIES-ENGINE]%c ${msg}`, "color: #b71c1c; font-weight: bold", "color: #fff");
        }
    },

    error(msg, err) {
        console.error(`[ARIES-ERROR] ${msg}`, err);
        UIManager.toast(`Ошибка системы: ${msg}`, "error");
    },

    clearSession() {
        this.State.user = null;
        this.State.profile = null;
        UIManager.updateUserInterface();
    },

    lockInterface(msg) {
        document.body.innerHTML = `
            <div class="lock-screen">
                <img src="https://i.imgur.com/8YyX29k.png" class="lock-logo">
                <h1>${msg}</h1>
                <p>Если вы считаете, что это ошибка, обратитесь в тех. поддержку.</p>
            </div>
        `;
    }
};

/**
 * ==========================================================================================
 * FORUM DATABASE MANAGER (API)
 * Работа с категориями, темами и ответами
 * ==========================================================================================
 */
const ForumAPI = {
    // Получение всех разделов
    async getCategories() {
        const snap = await Engine.db.ref('categories').orderByChild('order').once('value');
        return snap.val() || {};
    },

    // Создание темы
    async createThread(catId, title, content) {
        if (!Engine.hasAccess('create_thread')) return false;

        const threadData = {
            title: Engine.sanitize(title),
            content: Engine.sanitize(content),
            authorId: Engine.State.user.uid,
            authorName: Engine.State.profile.nickname,
            authorAva: Engine.State.profile.avatar,
            authorRole: Engine.State.profile.role,
            status: "Открыто",
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastActivity: firebase.database.ServerValue.TIMESTAMP,
            repliesCount: 0,
            views: 0
        };

        const newPostRef = Engine.db.ref(`threads/${catId}`).push();
        await newPostRef.set(threadData);
        
        // Логирование действия
        await AdminManager.logAction(`Создал тему: ${title}`);
        return newPostRef.key;
    },

    // Удаление темы (Только для Админов)
    async deleteThread(catId, threadId) {
        if (!Engine.hasAccess('delete_thread')) return alert("Нет прав!");
        
        if (confirm("Вы точно хотите удалить эту тему навсегда?")) {
            await Engine.db.ref(`threads/${catId}/${threadId}`).remove();
            await Engine.db.ref(`replies/${threadId}`).remove();
            UIManager.toast("Тема успешно удалена", "success");
            Router.handle('#home');
        }
    },

    // Изменение статуса темы
    async setThreadStatus(catId, threadId, status) {
        if (!Engine.hasAccess('close_thread')) return;
        await Engine.db.ref(`threads/${catId}/${threadId}`).update({ status: status });
        UIManager.toast(`Тема переведена в статус: ${status}`, "info");
    }
};

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => Engine.boot());
