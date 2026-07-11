/**
 * ARIES RP AUTH MODULE - FULL VERSION
 * Реализация Passwordless (Email Link) авторизации
 */

const AuthModule = {
    // 1. Инициализация (проверка состояния при загрузке страницы)
    init() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log("Пользователь авторизован:", user.email);
                this.updateUI(true);
            } else {
                this.finishSignIn(); // Пытаемся завершить вход по ссылке
            }
        });
    },

    // 2. Отправка письма для входа/регистрации (Passwordless)
    async sendEmailCode() {
        const emailInput = document.getElementById('login-input');
        const email = emailInput ? emailInput.value : null;

        if (!email) {
            alert("Введите Email!");
            return;
        }

        const actionCodeSettings = {
            url: window.location.origin + window.location.pathname, // Ссылка на текущую страницу
            handleCodeInApp: true
        };

        try {
            await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            alert("Письмо с кодом доступа отправлено на ваш Email. Проверьте папку 'Спам'!");
        } catch (e) {
            console.error("Auth Error:", e);
            alert("Ошибка отправки письма: " + e.message);
        }
    },

    // 3. Завершение входа по ссылке из письма
    async finishSignIn() {
        if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            
            // Если почта потерялась в кэше, запрашиваем вручную
            if (!email) {
                email = window.prompt('Для завершения входа введите ваш Email:');
            }

            try {
                const result = await firebase.auth().signInWithEmailLink(email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                
                // Дополнительная логика: сохранение профиля в базе данных
                if (result.additionalUserInfo.isNewUser) {
                    await db.ref('users/' + result.user.uid).set({
                        email: email,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        role: 'user'
                    });
                }
                
                alert("Успешный вход!");
                window.location.replace(window.location.origin + window.location.pathname);
            } catch (e) {
                alert("Ошибка завершения входа: " + e.message);
            }
        }
    },

    // 4. Логика обновления интерфейса
    updateUI(isLoggedIn) {
        const authContainer = document.getElementById('auth-container');
        if (isLoggedIn) {
            authContainer.innerHTML = "<h3>Добро пожаловать, вы авторизованы!</h3><button onclick='AuthModule.logout()'>Выйти</button>";
            document.getElementById('admin-link').style.display = 'block';
        }
    },

    // 5. Выход
    async logout() {
        await firebase.auth().signOut();
        location.reload();
    }
};

// Запуск модуля
AuthModule.init();
