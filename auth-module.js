/**
 * ARIES RP AUTH MODULE - FIXED VERSION (EMAIL + PASSWORD)
 * Метод: Классическая почта и пароль
 */

const AuthModule = {
    // 1. Инициализация (следит за тем, залогинен юзер или нет)
    init() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log("Пользователь в системе:", user.email);
                this.updateUI(true);
            } else {
                this.updateUI(false);
            }
        });
    },

    // 2. Регистрация (Создает юзера в Firebase Auth)
    async registerUser() {
        const email = document.getElementById('login-input').value;
        const pass = document.getElementById('pass-input').value;

        if (!email || !pass) { alert("Заполни оба поля!"); return; }

        try {
            const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
            await cred.user.sendEmailVerification();
            alert("Регистрация успешна! Письмо с верификацией отправлено на почту.");
        } catch (e) {
            alert("Ошибка регистрации: " + e.message);
        }
    },

    // 3. Вход (Email + Пароль)
    async loginUser() {
        const email = document.getElementById('login-input').value;
        const pass = document.getElementById('pass-input').value;

        try {
            const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
            if (!cred.user.emailVerified) {
                alert("Ошибка: Сначала подтверди почту по ссылке из письма!");
                await firebase.auth().signOut();
                return;
            }
            alert("Вход выполнен!");
            location.reload();
        } catch (e) {
            alert("Ошибка входа: " + e.message);
        }
    },

    // 4. Обновление интерфейса (показ/скрытие админки)
    updateUI(isLoggedIn) {
        const adminLink = document.getElementById('admin-link');
        const adminDashboard = document.getElementById('admin-dashboard');
        
        if (isLoggedIn && adminLink && adminDashboard) {
            adminLink.style.display = 'block';
            adminDashboard.style.display = 'block';
        } else if (adminLink) {
            adminLink.style.display = 'none';
        }
    },

    // 5. Выход
    async logout() {
        await firebase.auth().signOut();
        location.reload();
    }
};

// Запуск
AuthModule.init();
