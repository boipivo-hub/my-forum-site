// Модуль настроек аккаунта и парсинга аватаров (Поддерживает анимированные GIF)
const ProfileCore = {
    open() { document.getElementById('m-profile').style.display = 'flex'; document.getElementById('my-profile-avatar-view').src = AuthModule.getRegistry()[App.user].avatar; },
    close() { document.getElementById('m-profile').style.display = 'none'; },
    
    upload(event) {
        const file = event.target.files[0];
        if(!file) return;
        
        // FileReader переводит любой файл (включая .gif) в строку Base64 для localStorage
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('my-profile-avatar-view').src = e.target.result;
        };
        reader.readAsDataURL(file);
    },
    
    saveData() {
        const newNick = document.getElementById('new-profile-nick').value.trim();
        const base64Img = document.getElementById('my-profile-avatar-view').src;
        let db = AuthModule.getRegistry();
        
        if(newNick && newNick !== App.user) {
            if(db[newNick]) return alert('Этот ник уже занят!');
            db[newNick] = db[App.user];
            delete db[App.user];
            App.user = newNick;
            localStorage.setItem('active_session', newNick);
        }
        
        db[App.user].avatar = base64Img;
        AuthModule.saveRegistry(db);
        this.close();
        window.location.reload();
    }
};
