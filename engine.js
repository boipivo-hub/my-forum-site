/**
 * ARIES RP - MASTER ENGINE V7.0 (SECURITY UPDATE)
 * @author: Qumestlies_Shawty (OWNER)
 */

const Engine = {
    user: null,
    profile: null,
    OWNER_EMAIL: "ponkc29@gamil.com",
    OWNER_NICK: "Qumestlies_Shawty",

    async init() {
        console.log("ARIES Engine: Booting...");
        
        auth.onAuthStateChanged(async (u) => {
            if (u) {
                this.user = u;
                await this.syncProfile();
            } else {
                this.user = null;
                this.profile = null;
                UI.renderHeader(false);
            }
            ForumEngine.loadHome();
        });

        // Обработка ссылки из почты
        if (auth.isSignInWithEmailLink(window.location.href)) {
            AuthSystem.completeAuth();
        }

        this.generateCaptcha();
    },

    async syncProfile() {
        try {
            const uid = this.user.uid;
            const snap = await db.ref(`users/${uid}`).once('value');
            let data = snap.val();

            // Первый вход - регистрация в БД
            if (!data) {
                const nick = localStorage.getItem('aries_pending_nick') || "New_Player_" + Math.floor(Math.random()*1000);
                data = {
                    nickname: nick,
                    email: this.user.email,
                    role: "user",
                    avatar: "https://i.imgur.com/6EOnf8A.png",
                    isRainbow: false,
                    isBanned: false,
                    isMuted: false,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                };

                // ВЫДАЧА ПРАВ ТЕБЕ (Qumestlies_Shawty)
                if (this.user.email === this.OWNER_EMAIL) {
                    data.nickname = this.OWNER_NICK;
                    data.role = "owner";
                    data.isRainbow = true;
                }
                await db.ref(`users/${uid}`).set(data);
            }

            this.profile = data;

            // Проверка на БАН
            if (this.profile.isBanned) {
                document.body.innerHTML = "<div style='background:#000; color:red; height:100vh; display:flex; align-items:center; justify-content:center;'><h1>ACCESS DENIED: ВЫ ЗАБАНЕНЫ НА ФОРУМЕ</h1></div>";
                return;
            }

            UI.renderHeader(true, this.profile);
            
            // Открываем админ-панель
            if (data.role === 'owner' || data.role === 'admin') {
                document.getElementById('admin-bar').classList.remove('hidden');
            }

        } catch (e) {
            console.error("Engine Error: ", e);
        }
    },

    generateCaptcha() {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const el = document.getElementById('captcha-text');
        if (el) el.innerText = code;
    }
};

const AuthSystem = {
    async startAuth() {
        const nick = document.getElementById('auth-nick').value;
        const email = document.getElementById('auth-email').value;
        const captchaIn = document.getElementById('captcha-input').value;
        const captchaReal = document.getElementById('captcha-text').innerText;

        if (captchaIn !== captchaReal) return alert("Неверная капча!");
        if (!nick || !email) return alert("Заполните поля!");

        // Проверка на занятость ника
        const nickSnap = await db.ref('users').orderByChild('nickname').equalTo(nick).once('value');
        if (nickSnap.exists() && email !== this.OWNER_EMAIL) {
            // Если ник уже есть у другого email
            let isSame = false;
            nickSnap.forEach(c => { if(c.val().email === email) isSame = true; });
            if (!isSame) return alert("Этот никнейм уже занят другим аккаунтом!");
        }

        const settings = { url: window.location.href, handleCodeInApp: true };
        
        try {
            await auth.sendSignInLinkToEmail(email, settings);
            localStorage.setItem('auth_email', email);
            localStorage.setItem('aries_pending_nick', nick);
            alert("Ссылка отправлена! Проверьте почту.");
            UI.closeModals();
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    },

    async completeAuth() {
        let email = localStorage.getItem('auth_email') || prompt('Введите ваш Email:');
        try {
            await auth.signInWithEmailLink(email, window.location.href);
            localStorage.removeItem('auth_email');
            window.history.replaceState({}, null, window.location.pathname);
        } catch (e) {
            alert("Ссылка устарела!");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Engine.init());
