/**
 * Aries RP Forum - Admin Module
 * Handles bans, mutes, thread management, and permission levels.
 */

const Admin = {
    // Проверка прав админа перед действием
    async verifyAdminRights(uid) {
        const snapshot = await firebase.database().ref('admins/' + uid).once('value');
        return snapshot.exists();
    },

    // 1. Система банов
    async banUser(targetUid, reason) {
        const isAdmin = await this.verifyAdminRights(ForumEngine.currentUser.uid);
        if (!isAdmin) return alert("Доступ запрещен!");
        
        firebase.database().ref('users/' + targetUid + '/status').set({
            isBanned: true,
            reason: reason,
            bannedAt: Date.now()
        });
        console.log("Пользователь " + targetUid + " был успешно забанен.");
    },

    // 2. Система мутов
    async muteUser(targetUid, duration) {
        const isAdmin = await this.verifyAdminRights(ForumEngine.currentUser.uid);
        if (!isAdmin) return;
        
        firebase.database().ref('users/' + targetUid + '/muted').set({
            until: Date.now() + duration,
            mutedBy: ForumEngine.currentUser.uid
        });
    },

    // 3. Управление темами (Удаление/Редактирование)
    async manageThread(threadId, action) {
        const isAdmin = await this.verifyAdminRights(ForumEngine.currentUser.uid);
        if (!isAdmin) return;

        if (action === 'delete') {
            firebase.database().ref('threads/' + threadId).remove();
        } else if (action === 'lock') {
            firebase.database().ref('threads/' + threadId + '/status').set('closed');
        }
    },

    // 4. Назначение админов
    async appointAdmin(targetUid, level) {
        if (!ForumEngine.isDeveloper) return alert("Только Qumestlies_Shawty может назначать админов!");
        
        firebase.database().ref('admins/' + targetUid).set({
            level: level,
            appointedAt: Date.now(),
            color: 'rainbow' // Переливающийся ник
        });
    },

    // 5. Создание разделов
    async createCategory(categoryName, description) {
        if (!ForumEngine.isAdmin) return;
        
        const newCategory = firebase.database().ref('categories').push();
        newCategory.set({
            title: categoryName,
            desc: description,
            createdAt: Date.now()
        });
    },

    // 6. Управление цветами ников (Анимация)
    async applyAdminStyle(uid) {
        firebase.database().ref('users/' + uid + '/style').set('animated-rainbow');
    },

    // Инициализация логов администрирования
    initAdminLogs() {
        firebase.database().ref('adminLogs').limitToLast(50).on('child_added', (snap) => {
            console.log("Admin Action: ", snap.val());
        });
    }
};

// ... (сюда ты будешь дописывать функции для иконок оповещения, удаления сообщений и т.д.)
