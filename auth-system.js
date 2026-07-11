const AuthSystem = {
    async sendLink() {
        const email = document.getElementById('email').value;
        const actionCodeSettings = {
            url: window.location.href, // Возврат на эту же страницу
            handleCodeInApp: true,
        };

        try {
            await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            alert("Ссылка для входа отправлена на " + email);
        } catch (error) {
            alert("Ошибка: " + error.message);
        }
    },

    async finishSignIn() {
        if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) email = prompt('Введите ваш Email для подтверждения:');

            try {
                await firebase.auth().signInWithEmailLink(email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                alert("Успешный вход!");
                window.location.href = window.location.pathname; // Очистка URL
            } catch (error) {
                alert("Ошибка входа: " + error.message);
            }
        }
    }
};
