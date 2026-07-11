const AuthSystem = {
    async sendLink() {
        const email = document.getElementById('login-email').value;
        await auth.sendSignInLinkToEmail(email, {
            url: window.location.href,
            handleCodeInApp: true
        });
        localStorage.setItem('emailForSignIn', email);
        alert("Ссылка отправлена!");
    },
    async completeSignIn() {
        let email = localStorage.getItem('emailForSignIn') || prompt('Email:');
        await auth.signInWithEmailLink(email, window.location.href);
        localStorage.removeItem('emailForSignIn');
        window.location.replace('/');
    }
};
