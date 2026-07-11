/**
 * Aries RP Forum - Forum Module
 * Handles threads, posts, tags, and notifications.
 */

const Forum = {
    // 1. Создание темы с тегами
    async createThread(categoryId, title, content) {
        const threadRef = firebase.database().ref('threads/' + categoryId).push();
        threadRef.set({
            title: title,
            content: content,
            author: ForumEngine.currentUser.displayName,
            status: 'open', // Тег: Открыто
            timestamp: Date.now()
        });
    },

    // 2. Ярлыки тем (Смена статуса)
    async updateThreadTag(threadId, categoryId, newStatus) {
        // Статусы: open, closed, review
        firebase.database().ref('threads/' + categoryId + '/' + threadId + '/status').set(newStatus);
    },

    // 3. Ответы в теме
    async replyToThread(threadId, categoryId, message) {
        const replyRef = firebase.database().ref('posts/' + threadId).push();
        replyRef.set({
            text: message,
            author: ForumEngine.currentUser.displayName,
            timestamp: Date.now()
        });
        // 4. Оповещение (Иконка)
        this.sendNotification(threadId, "Новый ответ в теме!");
    },

    // 5. Система оповещений
    sendNotification(threadId, message) {
        firebase.database().ref('notifications/' + ForumEngine.currentUser.uid).push({
            message: message,
            threadId: threadId,
            read: false,
            timestamp: Date.now()
        });
    },

    // 6. Бан/Мут (Интеграция с админкой)
    async toggleUserRestriction(uid, type, active) {
        // type: 'ban', 'mute'
        firebase.database().ref('users/' + uid + '/restrictions/' + type).set(active);
    },

    // 7. Работа с медиа (фото/видео ссылки)
    async postMedia(threadId, mediaUrl) {
        firebase.database().ref('posts/' + threadId).push({
            type: 'media',
            url: mediaUrl,
            timestamp: Date.now()
        });
    }
};

// Инициализация слушателя уведомлений
firebase.database().ref('notifications/' + ForumEngine.currentUser.uid).on('child_added', (snap) => {
    const notify = snap.val();
    console.log("Новое оповещение:", notify.message);
    // Тут можно добавить визуальное появление иконки-колокольчика
});
