const AuthModule = {
    async sendSMS() {
        const phone = document.getElementById('phone').value;
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size': 'invisible' });
        window.confirmationResult = await firebase.auth().signInWithPhoneNumber(phone, window.recaptchaVerifier);
    },
    async verify() {
        const code = document.getElementById('code').value;
        const nick = document.getElementById('nick').value;
        const res = await window.confirmationResult.confirm(code);
        const hashedNick = await Security.hash(nick);
        await firebase.database().ref('users/' + res.user.uid).set({ id: hashedNick });
        location.reload();
    }
};
