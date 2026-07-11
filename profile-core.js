/**
 * PROFILE CORE
 * Обработка ававарок, ников и личных данных
 */

const ProfileCore = {
    currentBase64: null,

    handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            UIManager.toast("Максимальный размер файла 2MB!", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            this.currentBase64 = event.target.result;
            document.getElementById('pe-preview').src = event.target.result;
        };
        reader.readAsDataURL(file);
    },

    async commit() {
        if (!Engine.user) return;

        const nick = document.getElementById('pe-nickname').value;
        const bio = document.getElementById('pe-bio').value;
        
        const updates = {};
        if (nick) updates.nickname = nick;
        if (bio) updates.bio = bio;
        if (this.currentBase64) updates.avatar = this.currentBase64;

        try {
            UIManager.toast("Сохранение...", "info");
            await Engine.db.ref(`users/${Engine.user.uid}`).update(updates);
            UIManager.toast("Профиль успешно обновлен!", "success");
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            UIManager.toast("Ошибка сохранения: " + error.message, "error");
        }
    }
};
