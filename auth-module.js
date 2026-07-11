const Auth = {
    async login(code, nick) {
        try {
            const res = await window.confirmationResult.confirm(code);
            const user = res.user;

            // ШИФРУЕМ ПЕРЕД ОТПРАВКОЙ
            const encryptedNick = Security.encrypt(nick);
            
            await firebase.database().ref('users/' + user.uid).set({
                data: encryptedNick, // В базе будет лежать шифр
                created: Date.now()
            });
            window.location.reload();
        } catch(e) { alert("Ошибка!"); }
    },

    async getMyNick() {
        const user = firebase.auth().currentUser;
        const snap = await firebase.database().ref('users/' + user.uid + '/data').once('value');
        
        // РАСШИФРОВЫВАЕМ ПРИ ПОЛУЧЕНИИ
        return Security.decrypt(snap.val());
    }
};
