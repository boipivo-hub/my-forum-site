// Модуль аутентификации и работы с постоянной сессией HTML5
const AuthModule = {
    init() {
        if (!localStorage.getItem('user_registry')) {
            const defaults = {
                'Qumestlies_Shawty': { password: '123', glow: 'glow-founder', badge: 'badge-founder', banned: false, avatar: 'https://i.postimg.cc/mDCHYg8g/aries.png' },
                'Admin_Aries': { password: '123', glow: 'glow-admin', badge: 'badge-admin', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' }
            };
            localStorage.setItem('user_registry', JSON.stringify(defaults));
        }
    },
    getRegistry() { return JSON.parse(localStorage.getItem('user_registry')); },
    saveRegistry(data) { localStorage.setItem('user_registry', JSON.stringify(data)); },
    
    open(isReg = false) {
        document.getElementById('m-auth').style.display = 'flex';
        const container = document.getElementById('auth-btn-container');
        if(isReg) {
            document.getElementById('auth-title').innerText = "Регистрация нового аккаунта";
            container.innerHTML = <button class="btn-core" style="width:100%;" onclick="AuthModule.executeRegister()">Создать аккаунт</button>
            <p style="font-size:12px; text-align:center; color:#666; margin-top:10px; cursor:pointer;" onclick="AuthModule.open(false)">Уже есть профиль? Войти</p>;
        } else {
            document.getElementById('auth-title').innerText = "Вход на веб-портал";
            container.innerHTML = <button class="btn-core" style="width:100%;" onclick="AuthModule.executeLogin()">Войти в аккаунт</button>
            <p style="font-size:12px; text-align:center; color:#666; margin-top:10px; cursor:pointer;" onclick="AuthModule.open(true)">Нет аккаунта? Создать</p>;
        }
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    triggerGoogleLogin() {
        // Профессиональная симуляция API авторизации Google Accounts OAuth 2.0
        const googleNicks = ['Google_User_65', 'Aries_Fan_99', 'Samp_Player_77'];
        const randomNick = googleNicks[Math.floor(Math.random() * googleNicks.length)];
        
        let db = this.getRegistry();
        if(!db[randomNick]) {
            db[randomNick] = { password: 'oauth_secure_pass', glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            this.saveRegistry(db);
        }
        
        localStorage.setItem('active_session', randomNick);
        this.close();
        window.location.reload();
    },
    executeRegister() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        if(!u || !p) return alert('Заполните поля!');
        let db = this.getRegistry();
        if(db[u]) return alert('Ник занят!');
        
        db[u] = { password: p, glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
        this.saveRegistry(db);
        localStorage.setItem('active_session', u);
        this.close(); window.location.reload();
    },
    executeLogin() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        let db = this.getRegistry();
        if(!db[u] || db[u].password !== p) return alert('Неверный ник или пароль!');
        if(db[u].banned) return alert('Ваш аккаунт заблокирован Администрацией форума!');
        
        localStorage.setItem('active_session', u);
        this.close(); window.location.reload();
    },
    logout() {
        localStorage.removeItem('active_session');
        window.location.reload();
    }
};
AuthModule.init();
