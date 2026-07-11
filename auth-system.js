/**
 * AUTH SYSTEM V2
 * Реализует отправку SMS/Email ссылок и проверку CAPTCHA
 */

const AuthSystem = {
    currentCaptcha: "",

    generateCaptcha() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "";
        for(let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.currentCaptcha = result;
        const box = document.getElementById('captcha-img-gen');
        if(box) box.innerText = result;
    },

    async initiateLogin() {
        const email = document.getElementById('auth-email-field').value;
        const captchaInput = document.getElementById('captcha-input').value;

        if (captchaInput.toUpperCase() !== this.currentCaptcha) {
            UIManager.toast("Неверный код с картинки!", "error");
            this.generateCaptcha();
            return;
        }

        if (!email || !email.includes('@')) {
            UIManager.toast("Введите корректный Email!", "error");
            return;
        }

        const actionCodeSettings = {
            url: window.location.origin + window.location.pathname,
            handleCodeInApp: true,
        };

        try {
            UIManager.toast("Отправка ссылки...", "info");
            await Engine.auth.sendSignInLinkToEmail(email, actionCodeSettings);
            window.localStorage.setItem('ariesEmailForSignIn', email);
            
            UIManager.toast("Ссылка отправлена на " + email, "success");
            UIManager.closeModals();
        } catch (error) {
            console.error(error);
            UIManager.toast("Ошибка Firebase: " + error.message, "error");
        }
    },

    async finalizeSignIn() {
        let email = window.localStorage.getItem('ariesEmailForSignIn');
        if (!email) {
            email = prompt('Пожалуйста, введите ваш Email для подтверждения входа:');
        }

        try {
            await Engine.auth.signInWithEmailLink(email, window.location.href);
            window.localStorage.removeItem('ariesEmailForSignIn');
            UIManager.toast("Добро пожаловать на Aries RP!", "success");
            window.history.replaceState({}, null, window.location.pathname);
        } catch (error) {
            UIManager.toast("Ошибка входа: ссылка недействительна", "error");
        }
    }
};
