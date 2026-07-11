/**
 * ARIES ROLEPLAY - MASTER ENGINE V9
 * @author: Qumestlies_Shawty (Owner)
 */

const App = {
    user: null,
    profile: null,
    OWNER_EMAIL: "ponkc29@gamil.com",
    OWNER_NICK: "Qumestlies_Shawty",

    async init() {
        console.log("ARIES: Engine booting...");
        this.genCaptcha();

        auth.onAuthStateChanged(async (u) => {
            if (u) {
                this.user = u;
                await this.syncProfile();
            } else {
                this.user = null;
                this.profile = null;
                UI.renderHeader(false);
            }
            this.loadHome();
        });

        if (auth.isSignInWithEmailLink(window.location.href)) {
            AuthManager.completeAuth();
        }
    },

    async syncProfile() {
        const uid = this.user.uid;
        const snap = await db.ref(`users/${uid}`).once('value');
        let data = snap.val();

        if (!data) {
            const pendingNick = localStorage.getItem('aries_pending_nick') || "New_Player_" + Math.floor(Math.random()*1000);
            data = {
                nickname: pendingNick,
                email: this.user.email,
                role: "user",
                avatar: "https://i.imgur.com/6EOnf8A.png",
                isRainbow: false,
                isBanned: false,
                joinedAt: firebase.database.ServerValue.TIMESTAMP
            };

            // ЕСЛИ ЗАШЕЛ ТЫ (Овнер)
            if (this.user.email === this.OWNER_EMAIL) {
                data.nickname = this.OWNER_NICK;
                data.role = "owner";
                data.isRainbow = true;
            }
            await db.ref(`users/${uid}`).set(data);
            localStorage.removeItem('aries_pending_nick');
        }

        this.profile = data;

        if (this.profile.isBanned) {
            document.body.innerHTML = "<div style='background:#000; color:red; height:100vh; display:flex; align-items:center; justify-content:center;'><h1>ACCESS DENIED: BAN</h1></div>";
            return;
        }

        UI.renderHeader(true, this.profile);
        if (data.role === 'owner' || data.role === 'admin') {
            document.getElementById('owner-panel').classList.remove('hidden');
        }
    },

    genCaptcha() {
        const code = Math.random().toString(36).substring(2, 7).toUpperCase();
        const el = document.getElementById('captcha-code');
        if (el) el.innerText = code;
    },

    loadHome: async function() {
        const root = document.getElementById('forum-root');
        root.innerHTML = "Загрузка разделов...";

        const snap = await db.ref('categories').once('value');
        root.innerHTML = "";

        if (!snap.exists()) {
            root.innerHTML = "<p>Форум пуст. Создайте раздел в панели админа.</p>";
            return;
        }

        snap.forEach(child => {
            const cat = child.val();
            const cid = child.key;
            root.innerHTML += `
                <div class="cat-card">
                    <div class="cat-h">${cat.title}</div>
                    <div id="cat-threads-${cid}"></div>
                    ${this.profile ? `<button onclick="Forum.openThreadModal('${cid}')" style="margin:10px; cursor:pointer;">+ ТЕМА</button>` : ''}
                </div>
            `;
            this.loadThreads(cid);
        });
    },

    async loadThreads(cid) {
        const list = document.getElementById(`cat-threads-${cid}`);
        const snap = await db.ref(`threads/${cid}`).once('value');
        list.innerHTML = "";
        snap.forEach(child => {
            const t = child.val();
            list.innerHTML += `
                <div class="thread-row" onclick="alert('Открытие темы в разработке')">
                    <i class="fas fa-comment tr-icon" style="margin-right:15px; color:#b71c1c;"></i>
                    <div class="tr-info">
                        <span class="tr-title">${t.title}</span>
                        <span class="tr-meta">Автор: ${t.author} • ${new Date(t.date).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        });
    }
};

const AuthManager = {
    async initAuth() {
        const nick = document.getElementById('auth-nick').value.trim();
        const email = document.getElementById('auth-email').value.trim();
        const capIn = document.getElementById('captcha-input').value.trim();
        const capReal = document.getElementById('captcha-code').innerText;

        if (capIn !== capReal) {
            alert("Неверная капча!");
            App.genCaptcha();
            return;
        }

        if (nick.length < 3 || !email.includes('@')) {
            alert("Ник или Почта введены неверно!");
            return;
        }

        const settings = { url: window.location.href, handleCodeInApp: true };

        try {
            console.log("Sending email to:", email);
            await auth.sendSignInLinkToEmail(email, settings);
            
            localStorage.setItem('aries_email', email);
            localStorage.setItem('aries_pending_nick', nick);
            
            alert("ССЫЛКА ОТПРАВЛЕНА! Проверьте почту " + email);
            UI.closeModals();
        } catch (e) {
            alert("ОШИБКА FIREBASE: " + e.message);
            console.error(e);
        }
    },

    async completeAuth() {
        let email = localStorage.getItem('aries_email') || prompt('Введите ваш Email для верификации:');
        try {
            await auth.signInWithEmailLink(email, window.location.href);
            localStorage.removeItem('aries_email');
            window.history.replaceState({}, null, window.location.pathname);
            alert("Вход выполнен!");
        } catch (e) {
            alert("Ошибка: Ссылка недействительна!");
        }
    }
};

const Forum = {
    openThreadModal(cid) {
        this.currentCat = cid;
        UI.modal('create-thread'); // Для примера
    }
};

const Admin = {
    async createCategory() {
        const title = prompt("Название раздела:");
        if (title) {
            await db.ref('categories').push({ title: title, order: Date.now() });
            App.loadHome();
        }
    }
};

const UI = {
    renderHeader(isAuth, data) {
        const zone = document.getElementById('user-zone');
        if (isAuth) {
            zone.innerHTML = `
                <div class="user-pill" onclick="UI.modal('profile')">
                    <img src="${data.avatar}" class="nav-ava" style="width:35px; height:35px; border-radius:50%; margin-right:10px;">
                    <span class="${data.isRainbow ? 'rainbow-text' : ''}">${data.nickname}</span>
                </div>
            `;
        }
    },
    modal(id) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById('modal-' + id).classList.remove('hidden');
    },
    closeModals() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
