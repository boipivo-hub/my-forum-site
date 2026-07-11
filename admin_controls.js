/**
 * ARIES RP - ADMIN CONTROLS MODULE
 * Handles: Advanced Role Management, Thread Tags, and Visual Effects
 */

const AdminControls = {
    // 1. Управление правами других админов
    async changeAdminLevel(targetUid, newLevel) {
        if (!AppState.isAdmin) return;

        try {
            await db.ref('admins/' + targetUid).update({
                level: newLevel,
                updatedBy: AppState.currentUser.email,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });
            console.log("Уровень админа изменен до: " + newLevel);
        } catch (e) {
            console.error("Ошибка прав:", e);
        }
    },

    // 2. Установка тегов на темы (Важное/Закрыто/Review)
    async setThreadTag(categoryId, threadId, tag) {
        if (!AppState.isAdmin) return;

        const tagsAllowed = ['important', 'closed', 'review', 'open'];
        if (!tagsAllowed.includes(tag)) return;

        await db.ref('threads/' + categoryId + '/' + threadId).update({
            tag: tag,
            taggedBy: AppState.currentUser.email
        });
    },

    // 3. Анимация ника (Rainbow Effect для администрации)
    applyRainbowNick(uid) {
        const userRef = db.ref('users/' + uid);
        userRef.update({
            style: 'rainbow-animated',
            isPremiumAdmin: true
        });
    },

    // 4. Оповещения для всех (Админ-сообщение в чат)
    async sendGlobalNotification(message) {
        if (!AppState.isAdmin) return;

        await db.ref('global_notifications').push({
            msg: message,
            sender: AppState.currentUser.email,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // 5. Просмотр списка нарушителей (активные баны)
    async fetchBannedUsers() {
        if (!AppState.isAdmin) return;
        
        const snapshot = await db.ref('users').orderByChild('status/isBanned').equalTo(true).once('value');
        return snapshot.val();
    },

    // 6. Блокировка доступа к разделу
    async lockCategory(categoryId, reason) {
        await db.ref('categories/' + categoryId).update({
            locked: true,
            lockReason: reason
        });
    },

    // 7. Функция сброса пароля (через админку)
    async resetUserPassword(email) {
        // Требует интеграции Firebase Admin SDK
        console.log("Запрос на сброс пароля для:", email);
    }
};

// Интеграция с интерфейсом: кнопки в панели руководителя
function initAdminPanelButtons() {
    // Привязка обработчиков для всех кнопок в admin-dashboard
    document.querySelectorAll('.tool-item button').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("Инструмент активирован: " + btn.innerText);
        });
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initAdminPanelButtons);

/** 
 * Дальнейшее расширение:
 * - Система выдачи баллов (warn points)
 * - Управление модераторами
 * - Интерактивная карта действий (кто, где и что удалил)
 */
