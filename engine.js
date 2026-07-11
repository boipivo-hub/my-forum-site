/**
 * ARIES ROLEPLAY - MASTER ENGINE V6.0 (SECURITY UPDATE)
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

        if (auth.isSignInWithEmailLink(window.location.href)) {
            AuthSystem.completeAuth();
        }
    },

    async syncProfile() {
        try {
            const uid = this.user.uid;
            const snap = await db.ref(`users/${uid}`).once('value');
            let data = snap.val();

            // Если новыйthis.user = u;
                await this.syncProfile();
            } else {
                this.user = null;
                this.profile = null;
                UI.renderHeader(false);
            }
            Router.home();
        });

        // 2. Обработка ссылки из Email
        if (auth.isSignInWithEmailLink(window.location.href)) {
            AuthSystem.completeAuth();
        }

        UI.generateCaptcha();
    },

    /**
     * СИНХРОНИЗАЦИЯ АККАУНТА С БАЗОЙ
     */
    async syncProfile() {
        try {
            const uid = this.user.uid;
            const snap = await db.ref(`users/${uid}`).once('value');
            let data = snap.val();

            // Если аккаунта еще нет в БД (первый вход)
            if (!data) {
                const pendingNick = localStorage.getItem('aries_pending_nick');
                data = {
                    nickname: pendingNick || this.user.email.split('@')[0],
                    role: "user",
                    email: this.user.email,
                    avatar: "https://i.imgur.com/6EOnf аккаунт
            if (!data) {
                const nick = localStorage.getItem('auth_nick') || "New_Player_" + Math.floor(Math.random()*1000);
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

                // АВТО-ВЫДАЧА ПРАВ ТЕБЕ (Qumestlies_Shawty)
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
                document.body.innerHTML = "<div class='ban-screen'><h1>ACCESS DENIED</h1><p>Ваш аккаунт на форуме заблокирован.</p></div>";
                return;
            }

            UI.renderHeader(true,8A.png",
                    tagColor: "#ffffff",
                    isRainbow: false,
                    isBanned: false,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                };

                // ПРОВЕРКА НА ТЕБЯ (OWNER)
                if (this.user.email === this.OWNER_EMAIL) {
                    data.nickname = this.OWNER_NICK;
                    data.role = "owner";
                    data.isRainbow = true;
                }

                await db.ref(`users/${uid}`).set(data);
                localStorage.removeItem('aries_pending_nick');
            }

            this.profile = data;

            // Глобальный бан
            if (this.profile.isBanned) {
                document.body.innerHTML = "<div class='ban-msg'><h1>ACCESS DENIED</h1><p>Вы заблокированы на форуме Aries RP.</p></div>";
                return;
            }

            UI.renderHeader(true, this.profile);
            this.handleAdminBar();

        } catch (e) {
            console.error("Profile Error: ", e);
        }
    },

    handleAdminBar() {
        if (this.profile.role === 'owner' || this.profile.role === 'admin') {
            document.getElementById('admin-bar').classList.remove('hidden');
        }
    }
};

/**
 * СИСТЕМА АВТОРИЗАЦИИ (NICK + EMAIL)
 */
const AuthSystem = {
    async startAuth() {
        const nick = document.getElementById('auth-nick').value.trim();
        const email = document.getElementById('auth-email').value.trim();
        const captcha = document.getElementById('captcha-input').value.trim();
 data);
            
            // Если ты овнер - открываем админку
            if (data.role === 'owner' || data.role === 'admin') {
                document.getElementById('admin-header').classList.remove('hidden');
            }

        } catch (e) {
            console.error("Engine Sync Error: ", e);
        }
    }
};

const AuthSystem = {
    async startAuth() {
        const nick = document.getElementById('auth-nick').value;
        const email = document.getElementById('auth-email').value;

        if (!nick || !email) return alert("Заполните все поля!");

        const settings = { url: window.location.href, handleCodeInApp: true };
        
        try {
            await auth.sendSignInLinkToEmail(email, settings);
            localStorage.setItem('auth_email', email);
            localStorage.setItem('auth_nick', nick);
            alert("Ссылка для подтверждения отправлена на почту!");
            UI.closeModals();
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    },

    async completeAuth() {
        let email = localStorage.getItem('auth_email') || prompt('Введите ваш Email для верификации:');
        try {
            await auth.signInWithEmailLink(email, window.location.href);
            localStorage.removeItem('auth_email');
            window.history.replaceState({}, null, window.location.pathname);
        } catch (e) {
            alert("Ошибка входа: " + e.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Engine.init());
