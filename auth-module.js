const AuthModule = {
    async sendSMS() {
        const phone = document.getElementById('phone').value;
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size': 'invisible' });
        try {
            window.confirmationResult = await firebase.auth().signInWithPhoneNumber(phone, window.recaptchaVerifier);
            document.getElementById('step1').classList.add('hidden');
            document.getElementById('step2').classList.remove('hidden');
        } catch(e) { alert("Ошибка: " + e.message); }
    },
    async verify() {
        const code = document.getElementById('code').value;
        const nick = document.getElementById('nick').value;
        try {
            const res = await window.confirmationResult.confirm(code);
            const hashedNick = await Security.hash(nick);
            await firebase.database().ref('users/' + res.user.uid).set({ id: hashedNick });
            location.reload();
        } catch(e) { alert("Неверный код!"); }
    }
};
