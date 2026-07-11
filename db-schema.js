/**
 * ARIES RP DATABASE SCHEMA - PRO VERSION (COMPLETE)
 * Структуры данных для пользователей, форума, логов и конфигураций.
 */

const DatabaseSchema = {
    get userTemplate() {
        return {
            nickname: "New_Player",
            role: "user",
            avatar: "",
            isBanned: false,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            stats: { messagesCount: 0, reputation: 0 },
            settings: { theme: "dark", notifications: true }
        };
    },
    get rolePermissions() {
        return {
            owner: { canBan: true, canDeleteThreads: true, canCreateCategories: true, canEditRoles: true },
            admin: { canBan: true, canDeleteThreads: true, canCreateCategories: false, canEditRoles: false },
            user: { canBan: false, canDeleteThreads: false, canCreateCategories: false, canEditRoles: false }
        };
    }
};

const ForumSchema = {
    get categoryTemplate() {
        return { title: "", description: "", order: 0, accessLevel: "all", threadsCount: 0, createdAt: firebase.database.ServerValue.TIMESTAMP };
    },
    get threadTemplate() {
        return { title: "", content: "", authorId: "", authorName: "", status: "open", tags: [], repliesCount: 0, lastActivity: firebase.database.ServerValue.TIMESTAMP, createdAt: firebase.database.ServerValue.TIMESTAMP };
    }
};

const ReplySchema = {
    get replyTemplate() {
        return { authorId: "", authorName: "", message: "", attachments: [], timestamp: firebase.database.ServerValue.TIMESTAMP, isEdited: false, likes: 0 };
    },
    validateMedia(url) {
        const allowed = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm'];
        return allowed.includes(url.split('.').pop().toLowerCase());
    }
};

const AuditSchema = {
    get logTemplate() {
        return { adminId: "", actionType: "", targetId: "", details: "", timestamp: firebase.database.ServerValue.TIMESTAMP };
    },
    get sanctionTemplate() {
        return { type: "mute", reason: "", duration: 0, expiry: 0, adminId: "", timestamp: firebase.database.ServerValue.TIMESTAMP };
    }
};

const NotificationSchema = {
    get notifyTemplate() {
        return { type: "reply", threadId: "", message: "", isRead: false, timestamp: firebase.database.ServerValue.TIMESTAMP };
    }
};

const GlobalConfigSchema = {
    get configTemplate() {
        return { forumName: "Aries RP Forum", status: "online", maintenanceMessage: "Технические работы.", rulesUrl: "/rules", contactEmail: "admin@aries-rp.com", version: "1.0.0" };
    }
};

// Вспомогательные функции (обращаются к глобальной db из engine.js)
async function updateCategoryCounter(categoryId, increment = true) {
    if (typeof db === 'undefined') return;
    const catRef = db.ref(`categories/${categoryId}/threadsCount`);
    catRef.transaction((current) => (increment ? (current || 0) + 1 : (current || 1) - 1));
}

async function recordAudit(adminId, action, target, details) {
    if (typeof db === 'undefined') return;
    await db.ref('audit_logs').push({ ...AuditSchema.logTemplate, adminId, actionType: action, targetId: target, details });
}

async function sendNotification(targetUserId, type, threadId, text) {
    if (typeof db === 'undefined') return;
    await db.ref(`notifications/${targetUserId}`).push({ ...NotificationSchema.notifyTemplate, type, threadId, message: text });
}

async function initDatabaseSchema() {
    console.log("DATABASE SCHEMA: INITIALIZED.");
    if (typeof db === 'undefined') return;
    
    const configRef = db.ref('config');
    const snap = await configRef.once('value');
    if (!snap.exists()) {
        await configRef.set(GlobalConfigSchema.configTemplate);
    }
}

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', initDatabaseSchema);
