const AuthSystem = {
    // Регистрация с отправкой письма
    async register(email, password, nickname) {
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await user.sendEmailVerification();
            await user.updateProfile({ displayName: nickname });
            
            await firebase.database().ref('users/' + user.uid).set({
                nickname: nickname,
                email: email,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });

            alert("Регистрация прошла успешно! Проверьте почту для подтверждения аккаунта.");
        } catch (error) {
            alert("Ошибка: " + error.message);
        }
    },

    // Вход с проверкой верификации
    async login(email, password) {
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            if (!userCredential.user.emailVerified) {
                alert("Аккаунт не подтвержден. Проверьте почту!");
                await firebase.auth().signOut();
            } else {
                location.reload();
            }
        } catch (error) {
            alert("Ошибка входа: " + error.message);
        }
    },

    logout() {
        firebase.auth().signOut().then(() => location.reload());
    }
};
