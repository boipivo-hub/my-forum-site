const AuthModule = {
    // 1. Отправляем письмо с кодом
    async sendEmailCode() {
        const email = document.getElementById('email').value;
        const actionCodeSettings = {
            url: window.location.href, // Вернет юзера на эту же страницу
            handleCodeInApp: true
        };
        try {
            await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email); // Сохраняем почту
            alert("Письмо отправлено! Проверь почту (папка Спам тоже).");
        } catch(e) { alert("Ошибка: " + e.message); }
    },

    // 2. Завершаем вход (вызывается автоматически при открытии ссылки из письма)
    async finishSignIn() {
        if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) email = window.prompt('Пожалуйста, введи свою почту для подтверждения:');
            
            try {
                await firebase.auth().signInWithEmailLink(email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                alert("Успешный вход!");
                location.reload();
            } catch(e) { alert("Ошибка входа: " + e.message); }
        }
    }
};
