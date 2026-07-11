const AuthModule = {
    // 1. Отправка SMS
    async sendSMS(phoneNumber) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size': 'invisible' });
        const appVerifier = window.recaptchaVerifier;
        
        try {
            const confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier);
            window.confirmationResult = confirmationResult; // Сохраняем для проверки кода
            alert("Код отправлен на ваш номер!");
        } catch (error) {
            alert("Ошибка: " + error.message);
        }
    },

    // 2. Проверка кода и создание аккаунта
    async verifyCode(code, nickname) {
        try {
            const result = await window.confirmationResult.confirm(code);
            const user = result.user;

            // Сохраняем ник в базу данных Firebase под UID пользователя
            await firebase.database().ref('users/' + user.uid).set({
                nickname: nickname,
                phoneNumber: user.phoneNumber,
                createdAt: Date.now()
            });

            alert("Регистрация успешна!");
            window.location.reload();
        } catch (error) {
            alert("Неверный код!");
        }
    }
};
