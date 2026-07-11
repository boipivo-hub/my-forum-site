/**
 * ARIES RP CORE ENGINE - PRO VERSION
 * Управление авторизацией, правами, модерацией и потоками данных.
 */

// 1. Инициализация базы данных
const db = firebase.database();

// 2. Ядро системы (Engine)
const Engine = {
    user: null,
    isOwner: false,

    init: function() {
        firebase.auth().onAuthStateChanged((user) => {
            this.user = user;
            if (user) {
                // Проверка прав при логине
                db.ref('admins/' + user.uid).once('value', (snap) => {
                    const data = snap.val();
                    this.isOwner = (data && data.role === 'owner');
                    this.renderAdminTools();
                    console.log("ARIES RP: Auth session initialized for", user.displayName);
                });
            }
        });
    },

    renderAdminTools: async function() {
        if (!this.user) return;
        const snap = await db.ref('admins/' + this.user.uid).once('value');
        if (snap.exists()) {
            const adminPanel = document.getElementById('admin-dashboard');
            if (adminPanel) adminPanel.classList.remove('hidden');
        }
    },

    completeAuth: function() {
        console.log("ARIES RP: Core System Active.");
    }
};

// 3. Менеджер форума
const ForumManager = {
    async createCategory(title, description, permissions) {
        if (!Engine.isOwner) return alert("Ошибка: Недостаточно прав.");
        const catRef = db.ref('categories').push();
        await catRef.set({ title, desc: description, permissions, createdAt: firebase.database.ServerValue.TIMESTAMP });
    },

    async setAdminPrivileges(uid, role, color) {
        if (!Engine.isOwner) return;
        await db.ref('admins/' + uid).set({ role, color });
    },

    async deleteThread(categoryId, threadId) {
        if (await this.checkAccess('admin')) {
            await db.ref(`threads/${categoryId}/${threadId}`).remove();
        }
    },

    async checkAccess(level) {
        if (!Engine.user) return false;
        const snap = await db.ref('admins/' + Engine.user.uid).once('value');
        const data = snap.val();
        return data && (data.role === level || data.role === 'owner');
    }
};

// 4. Модерация
const ModerationEngine = {
    async applySanction(targetUid, type, reason, duration) {
        if (!await ForumManager.checkAccess('admin')) return;
        await db.ref('users/' + targetUid + '/sanctions').push({ 
            type, reason, duration, admin: Engine.user.uid, timestamp: firebase.database.ServerValue.TIMESTAMP 
        });
        if (type === 'ban') await db.ref('users/' + targetUid + '/isBanned').set(true);
    },

    async applyAdminVisuals(elementId, isAdmin) {
        const el = document.getElementById(elementId);
        if (el && isAdmin) el.classList.add('nick-admin');
    }
};

// 5. Управление темами
const ThreadManager = {
    async postReply(categoryId, threadId, message) {
        if (!Engine.user) return alert("Войдите для ответа");
        await db.ref(`threads/${categoryId}/${threadId}/replies`).push({
            authorId: Engine.user.uid,
            authorName: Engine.user.displayName,
            message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
};

// 6. Инициализация событий
document.addEventListener('DOMContentLoaded', () => {
    Engine.init();
    Engine.completeAuth();

    // Делегирование событий для кнопок удаления (защита)
    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-thread-btn')) {
            const threadId = e.target.getAttribute('data-id');
            const catId = e.target.getAttribute('data-cat');
            if (confirm("Удалить тему?")) await ForumManager.deleteThread(catId, threadId);
        }
    });
});

console.log("ARIES RP CORE ENGINE: INITIALIZED SUCCESSFULLY.");
