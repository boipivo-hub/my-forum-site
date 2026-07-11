/**
 * ARIES RP CORE ENGINE - FULL VERSION
 * Собрано для ARIES RP. Все модули интегрированы.
 */

// 1. Инициализация базы данных
const db = firebase.database();

// 2. Объект Engine (Ядро)
const Engine = {
    user: null,
    isOwner: false,

    init: function() {
        firebase.auth().onAuthStateChanged((user) => {
            this.user = user;
            if (user) {
                db.ref('admins/' + user.uid).once('value', (snap) => {
                    const data = snap.val();
                    this.isOwner = (data && data.role === 'owner');
                    this.renderAdminTools();
                });
            }
        });
    },

    renderAdminTools: async function() {
        if (!this.user) return;
        const snap = await db.ref('admins/' + this.user.uid).once('value');
        if (snap.exists()) {
            const adminPanel = document.getElementById('admin-panel');
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
        if (!Engine.isOwner) return;
        const catRef = db.ref('categories').push();
        await catRef.set({ title, desc: description, permissions, createdAt: firebase.database.ServerValue.TIMESTAMP });
    },

    async createThread(categoryId, title, content) {
        if (!Engine.user) return;
        const threadRef = db.ref('threads/' + categoryId).push();
        await threadRef.set({ title, author: Engine.user.displayName, content, status: "open", createdAt: firebase.database.ServerValue.TIMESTAMP });
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
        await db.ref('users/' + targetUid + '/sanctions').push({ type, reason, duration, admin: Engine.user.uid, timestamp: firebase.database.ServerValue.TIMESTAMP });
        if (type === 'ban') await db.ref('users/' + targetUid + '/isBanned').set(true);
    },

    async logAction(action, target, details) {
        await db.ref('audit_logs').push({ adminId: Engine.user.uid, action, target, details, timestamp: firebase.database.ServerValue.TIMESTAMP });
    }
};

// 5. Управление темами и ответами
const ThreadManager = {
    async postReply(categoryId, threadId, message) {
        if (!Engine.user) return;
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

    // Слушатель удаления тем
    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-thread-btn')) {
            const threadId = e.target.getAttribute('data-id');
            const catId = e.target.getAttribute('data-cat');
            await ForumManager.deleteThread(catId, threadId);
        }
    });
});

console.log("ARIES RP CORE ENGINE: INITIALIZED SUCCESSFULLY.");
