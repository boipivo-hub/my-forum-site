/**
 * ARIES RP PROFILE CORE - FIREBASE VERSION
 * Синхронизирует профиль с базой данных Firebase.
 */

const ProfileCore = {
    // Открытие окна профиля
    open: async function() {
        const modal = document.getElementById('m-profile');
        if (!modal) return;
        modal.style.display = 'flex';
        
        // Получаем данные из Firebase
        const snapshot = await db.ref('users/' + Engine.user.uid).once('value');
        const userData = snapshot.val();
        
        if (userData && userData.avatar) {
            document.getElementById('my-profile-avatar-view').src = userData.avatar;
        }
    },

    close: function() {
        document.getElementById('m-profile').style.display = 'none';
    },

    // Загрузка файла и конвертация в Base64
    upload: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('my-profile-avatar-view').src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    // Сохранение данных в Firebase
    saveData: async function() {
        const newNick = document.getElementById('new-profile-nick').value.trim();
        const base64Img = document.getElementById('my-profile-avatar-view').src;

        if (!Engine.user) return alert("Ошибка авторизации!");

        try {
            // Обновление ника в БД
            if (newNick) {
                await db.ref('users/' + Engine.user.uid).update({
                    nickname: newNick
                });
                // Обновляем дисплейное имя в Firebase Auth
                await Engine.user.updateProfile({ displayName: newNick });
            }

            // Обновление аватарки
            await db.ref('users/' + Engine.user.uid).update({
                avatar: base64Img
            });

            alert("Профиль успешно обновлен!");
            this.close();
            window.location.reload();
        } catch (error) {
            console.error("Ошибка сохранения профиля:", error);
            alert("Не удалось сохранить данные.");
        }
    }
};
