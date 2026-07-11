/**
 * ARIES RP - CORE ENGINE V2.0
 * Главный мозг системы. Управляет безопасностью и данными.
 */

const Engine = {
    db: firebase.database(),
    auth: firebase.auth(),
    user: null,
    profile: null,
    
    // Системные константы
    OWNER_EMAIL: "ponkc29@gamil.com",
    OWNER_NICK: "Qumestlies_Shawty",

    /**
     * Инициализация приложения
     */
    async init() {
        console.log("%c ARIES RP ENGINE: Инициализация...", "color: #ff1744; font-weight: bold;");
        
        // Слушатель состояния авторизации
        this.auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                this.user = firebaseUser;
                await this.syncProfile();
            } else {
                this.user = null;
                this.profile = null;
                UIManager.renderHeaderAuth(false);
            }
            
            // Загрузка контента после проверки прав
            Router.load('home');
        });

        // Проверка одноразовой ссылки для входа
        if (this.auth.isSignInWithEmailLink(window.location.href)) {
            AuthSystem.finalizeSignIn();
        }

        // Скрытие прелоадера через 2 секунды
        setTimeout(() => {
            document.getElementById('app-preloader').style.opacity = '0';
            setTimeout(() => document.getElementById('app-preloader').style.display = 'none', 500);
        }, 2000);
    },

    /**
     * Синхронизация данных профиля с Realtime DB
     */
    async syncProfile() {
        try {
            const uid = this.user.uid;
            const snap = await this.db.ref(`users/${uid}`).once('value');
            
            if (snap.exists()) {
                this.profile = snap.val();
            } else {
                // Создание нового аккаунта если нет в БД
                this.profile = {
                    nickname: this.user.email.split('@')[0],
                    role: "user",
                    avatar: "https://i.imgur.com/6EOnf8A.png",
                    isRainbow: false,
                    isBanned: false,
                    isMuted: false,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                };

                // ПРИВЯЗКА ПРАВ ВЛАДЕЛЬЦА
                if (this.user.email === this.OWNER_EMAIL) {
                    this.profile.nickname = this.OWNER_NICK;
                    this.profile.role = "owner";
                    this.profile.isRainbow = true;
                }

                await this.db.ref(`users/${uid}`).set(this.profile);
            }

            // Проверка бана
            if (this.profile.isBanned) {
                this.terminateAccess("Ваш аккаунт заблокирован руководством проекта.");
            }

            UIManager.renderHeaderAuth(true, this.profile);
            this.handleAdminVisuals();

        } catch (error) {
            console.error("Engine Sync Error:", error);
            UIManager.toast("Ошибка синхронизации данных", "error");
        }
    },

    handleAdminVisuals() {
        if (this.profile.role === 'owner' || this.profile.role === 'admin') {
            document.getElementById('owner-tools').classList.remove('hidden');
            document.getElementById('owner-nick-display').innerText = this.profile.nickname;
        }
    },

    terminateAccess(msg) {
        document.body.innerHTML = `
            <div style="background:#000;color:#ff1744;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;text-align:center;padding:20px;">
                <h1 style="font-size:60px;margin-bottom:20px;">ACCESS DENIED</h1>
                <p style="color:#fff;font-size:20px;">${msg}</p>
                <button onclick="location.reload()" style="margin-top:30px;padding:15px 30px;background:#b71c1c;color:#fff;border:none;cursor:pointer;">ПОВТОРИТЬ ПОПЫТКУ</button>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => Engine.init());
