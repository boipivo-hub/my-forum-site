/**
 * ARIES RP DATABASE SCHEMA - PRO VERSION (PART 1 - USERS & ROLES)
 * Определение структуры профилей, ролей и прав доступа в Firebase
 */

const DatabaseSchema = {
    // Структура базы данных для администраторов и обычных игроков
    get userTemplate() {
        return {
            nickname: "New_Player", // Базовый ник
            role: "user",           // user, admin, owner
            avatar: "",             // URL картинки или GIF
            isBanned: false,        // Статус блокировки
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            stats: {
                messagesCount: 0,
                reputation: 0
            },
            settings: {
                theme: "dark",
                notifications: true
            }
        };
    },

    // Определение прав доступа для каждой роли
    get rolePermissions() {
        return {
            owner: {
                canBan: true,
                canDeleteThreads: true,
                canCreateCategories: true,
                canEditRoles: true
            },
            admin: {
                canBan: true,
                canDeleteThreads: true,
                canCreateCategories: false,
                canEditRoles: false
            },
            user: {
                canBan: false,
                canDeleteThreads: false,
                canCreateCategories: false,
                canEditRoles: false
            }
        };
    }
};

/**
 * Инициализация проверки структуры базы данных (для безопасности)
 */
async function validateDatabaseIntegrity() {
    console.log("Database Schema Loaded: Initializing integrity check...");
    // Здесь можно добавить проверку правил безопасности Firebase (Firebase Rules)
}
/**
 * ARIES RP DATABASE SCHEMA - PART 2 (FORUM CATEGORIES & THREADS)
 * Определение структуры разделов и иерархии тем
 */

const ForumSchema = {
    // Шаблон категории (Раздел)
    get categoryTemplate() {
        return {
            title: "",
            description: "",
            order: 0,
            accessLevel: "all", // "all", "admin", "owner"
            threadsCount: 0,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
    },

    // Шаблон темы (Обсуждение)
    get threadTemplate() {
        return {
            title: "",
            content: "",
            authorId: "",
            authorName: "",
            status: "open", // open, closed, review
            tags: [],       // Важно, Проверено, и т.д.
            repliesCount: 0,
            lastActivity: firebase.database.ServerValue.TIMESTAMP,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
    }
};

/**
 * Логика синхронизации счетчиков разделов
 * Чтобы всегда было видно, сколько тем в каждом разделе
 */
function updateCategoryCounter(categoryId, increment = true) {
    const catRef = db.ref(`categories/${categoryId}/threadsCount`);
    catRef.transaction((current) => {
        return increment ? (current || 0) + 1 : (current || 1) - 1;
    });
}
/**
 * ARIES RP DATABASE SCHEMA - PART 3 (REPLIES & MEDIA)
 * Структура ответов в темах и система прикрепленных файлов
 */

const ReplySchema = {
    // Шаблон сообщения (Ответ в теме)
    get replyTemplate() {
        return {
            authorId: "",
            authorName: "",
            message: "",
            attachments: [],      // Массив ссылок на картинки/видео
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isEdited: false,      // Флаг редактирования
            likes: 0              // Счетчик реакций
        };
    },

    // Структура для проверки медиа-файлов
    validateMedia(url) {
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm'];
        const ext = url.split('.').pop().toLowerCase();
        return allowedExtensions.includes(ext);
    }
};

/**
 * Логика связки ответа с темой
 */
const ReplySystem = {
    // Подготовка данных перед отправкой
    prepareReply(authorId, authorName, text, mediaArray = []) {
        return {
            ...ReplySchema.replyTemplate,
            authorId,
            authorName,
            message: text,
            attachments: mediaArray.filter(url => ReplySchema.validateMedia(url))
        };
    }
};
/**
 * ARIES RP DATABASE SCHEMA - PART 4 (AUDIT LOGS & SANCTIONS)
 * Структура журналов действий администраторов и истории наказаний
 */

const AuditSchema = {
    // Шаблон лога действия
    get logTemplate() {
        return {
            adminId: "",
            actionType: "",     // 'ban', 'delete_thread', 'edit_role', etc.
            targetId: "",       // ID того, над кем совершили действие
            details: "",        // Описание (причина или доп. инфо)
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    },

    // Шаблон записи наказания (Мут/Бан)
    get sanctionTemplate() {
        return {
            type: "mute",       // 'mute', 'ban', 'warn'
            reason: "",
            duration: 0,        // Время в миллисекундах или 0 для перманента
            expiry: 0,          // Timestamp истечения наказания
            adminId: "",
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    }
};

/**
 * Логика записи действия в Audit Log
 */
async function recordAudit(adminId, action, target, details) {
    const logRef = db.ref('audit_logs').push();
    await logRef.set({
        ...AuditSchema.logTemplate,
        adminId,
        actionType: action,
        targetId: target,
        details
    });
}
/**
 * ARIES RP DATABASE SCHEMA - PART 5 (NOTIFICATIONS)
 * Структура оповещений для пользователей в реальном времени
 */

const NotificationSchema = {
    // Шаблон уведомления
    get notifyTemplate() {
        return {
            type: "reply",      // 'reply', 'mention', 'admin_action'
            threadId: "",       // Ссылка на тему, где произошло событие
            message: "",        // Текст оповещения
            isRead: false,      // Флаг прочтения
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    }
};

/**
 * Логика отправки уведомления
 */
async function sendNotification(targetUserId, type, threadId, text) {
    const notifyRef = db.ref(`notifications/${targetUserId}`).push();
    await notifyRef.set({
        ...NotificationSchema.notifyTemplate,
        type,
        threadId,
        message: text
    });
}

/**
 * Очистка прочитанных уведомлений (оптимизация базы)
 */
async function clearReadNotifications(userId) {
    const ref = db.ref(`notifications/${userId}`);
    const snapshot = await ref.orderByChild('isRead').equalTo(true).once('value');
    snapshot.forEach(child => {
        child.ref.remove();
    });
}
/**
 * ARIES RP DATABASE SCHEMA - PART 6 (SITE CONFIGURATION)
 * Финальная структура глобальных настроек проекта
 */

const GlobalConfigSchema = {
    // Структура конфигурации сайта
    get configTemplate() {
        return {
            forumName: "Aries RP Forum",
            status: "online",          // online, maintenance
            maintenanceMessage: "Мы проводим технические работы. Скоро вернемся!",
            rulesUrl: "/rules",
            contactEmail: "admin@aries-rp.com",
            version: "1.0.0"
        };
    }
};

/**
 * Инициализация всех систем БД (Финишная сборка)
 */
async function initDatabaseSchema() {
    console.log("DATABASE SCHEMA: INITIALIZED AND READY.");
    
    // Проверка существования конфига, если нет — создаем дефолтный
    const configRef = db.ref('config');
    const snap = await configRef.once('value');
    if (!snap.exists()) {
        await configRef.set(GlobalConfigSchema.configTemplate);
        console.log("Default configuration applied.");
    }
}

// Запуск инициализации
initDatabaseSchema();
validateDatabaseIntegrity();
