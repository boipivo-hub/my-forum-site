const AdminPanel = {
    async appoint(targetUid, role) {
        // Запись админа в базу
        await firebase.database().ref('admins/' + targetUid).set({ role: role });
        alert("Администратор назначен!");
    },
    
    async createSection(title) {
        await firebase.database().ref('categories').push({ title: title, status: 'open' });
    },

    async deleteThread(threadId) {
        if(confirm("Удалить тему?")) {
            await firebase.database().ref('threads/' + threadId).remove();
        }
    }
};
// ... (Расширяется функциями удаления сообщений, банов, логов и форматирования)
