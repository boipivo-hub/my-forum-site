/**
 * ARIES RP - ADVANCED FORUM ENGINE
 * AUTHOR: Qumestlies_Shawty
 * LINES: > 1000 planned functional logic
 */

const db = firebase.database();
const auth = firebase.auth();

const App = {
    user: null,
    profile: null,
    ownerNick: "Qumestlies_Shawty", // Твой ник
    ownerEmail: "ponkc29@gamil.com", // Твоя почта

    init: function() {
        console.log("ARIES Engine: Booting...");
        
        // Слушатель авторизации
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.user = user;
                await this.loadProfile();
                this.syncAdminStatus();
                UI.renderHeader(true);
            } else {
                this.user = null;
                UI.renderHeader(false);
            }
            this.loadHome();
        });

        // Проверка входа по ссылке
        if (auth.isSignInWithEmailLink(window.location.href)) {
            Auth.completeSignIn();
        }

        this.initCaptcha();
    },

    loadProfile: async function() {
        const snap = await db.ref(`users/${this.user.uid}`).once('value');
        if (snap.exists()) {
            this.profile = snap.val();
        } else {
            // Регистрация нового аккаунта в БД
            this.profile = {
                nickname: this.user.email.split('@')[0],
                avatar: "https://i.imgur.com/6EOnf8A.png",
                role: "user",
                tagColor: "#ffffff",
                isRainbow: false,
                isBanned: false,
                isMuted: false,
                joinedAt: Date.now()
            };
            
            // Если зашел ты - выдаем Овнера автоматически
            if (this.user.email === this.ownerEmail) {
                this.profile.nickname = this.ownerNick;
                this.profile.role = "owner";
                this.profile.isRainbow = true;
            }

            await db.ref(`users/${this.user.uid}`).set(this.profile);
        }

        // Проверка на бан
        if (this.profile.isBanned) {
            document.body.innerHTML = "<div style='background:#000;color:red;height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;'><h1>ВЫ ЗАБАНЕНЫ НА ФОРУМЕ</h1><p>Обратитесь к руководству.</p></div>";
        }
    },

    syncAdminStatus: function() {
        if (this.profile.role === "owner" || this.profile.role === "admin") {
            document.getElementById('admin-bar').classList.remove('hidden');
            document.getElementById('admin-nick-top').innerText = this.profile.nickname;
            if (this.profile.isRainbow) document.getElementById('admin-nick-top').className = "rainbow-text";
        }
    },

    initCaptcha: function() {
        const code = Math.random().toString(36).substring(2, 7).toUpperCase();
        const box = document.getElementById('captcha-text');
        if (box) box.innerText = code;
    },

    loadHome: async function() {
        const root = document.getElementById('forum-view');
        root.innerHTML = "<div class='loader'>Загрузка разделов...</div>";

        const snap = await db.ref('categories').once('value');
        root.innerHTML = "";

        snap.forEach(catSnap => {
            const cat = catSnap.val();
            const catId = catSnap.key;
            
            let html = `
                <div class="forum-category">
                    <div class="cat-head"><h3>${cat.title}</h3></div>
                    <div class="threads-container" id="cat-${catId}"></div>
                </div>
            `;
            root.innerHTML += html;
            this.loadThreads(catId);
        });
    },

    loadThreads: async function(catId) {
        const container = document.getElementById(`cat-${catId}`);
        const snap = await db.ref(`threads/${catId}`).once('value');
        
        container.innerHTML = "";
        snap.forEach(tSnap => {
            const t = tSnap.val();
            const tid = tSnap.key;
            container.innerHTML += `
                <div class="thread-row" onclick="Router.viewThread('${catId}','${tid}')">
                    <div class="thread-icon"><i class="fas fa-comment"></i></div>
                    <div class="thread-main">
                        <span class="tag ${this.getTagClass(t.status)}">${t.status}</span>
                        <span class="t-title">${t.title}</span>
                        <div class="t-meta">Автор: ${t.authorName} | ${new Date(t.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="thread-last">Последний ответ: ${t.lastReplyBy || 'Нет'}</div>
                </div>
            `;
        });
    },

    getTagClass: function(status) {
        if (status === "Открыто") return "tag-open";
        if (status === "Закрыто") return "tag-closed";
        return "tag-review";
    }
};

const Auth = {
    startLogin: async function() {
        const email = document.getElementById('auth-email').value;
        const captcha = document.getElementById('captcha-input').value;
        const target = document.getElementById('captcha-text').innerText;

        if (captcha !== target) return alert("Неверная капча!");
        if (!email) return alert("Введите почту!");

        const actionCodeSettings = {
            url: window.location.origin + window.location.pathname,
            handleCodeInApp: true,
        };

        try {
            await auth.sendSignInLinkToEmail(email, actionCodeSettings);
            localStorage.setItem('emailForSignIn', email);
            alert("Ссылка для входа отправлена на вашу почту!");
            UI.closeModals();
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    },

    completeSignIn: async function() {
        let email = localStorage.getItem('emailForSignIn');
        if (!email) email = prompt('Введите ваш Email для подтверждения:');
        
        try {
            await auth.signInWithEmailLink(email, window.location.href);
            localStorage.removeItem('emailForSignIn');
            window.location.replace('/'); // Очистить URL
        } catch (e) {
            alert("Ошибка входа: " + e.message);
        }
    }
};

const Profile = {
    handleAva: function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('edit-preview').src = event.target.result;
        };
        reader.readAsDataURL(file);
    },

    save: async function() {
        const nick = document.getElementById('edit-nickname').value;
        const ava = document.getElementById('edit-preview').src;
        
        if (App.profile.isMuted) return alert("У вас мут!");

        await db.ref(`users/${App.user.uid}`).update({
            nickname: nick,
            avatar: ava
        });

        alert("Профиль обновлен!");
        location.reload();
    }
};

const AdminPanel = {
    open: function() {
        UI.showModal('admin');
        this.setTab('users');
    },

    setTab: async function(tab) {
        const content = document.getElementById('admin-tab-content');
        content.innerHTML = "Загрузка...";

        if (tab === 'users') {
            const snap = await db.ref('users').once('value');
            content.innerHTML = "<h4>Управление пользователями</h4><div class='admin-grid'>";
            snap.forEach(uSnap => {
                const u = uSnap.val();
                const uid = uSnap.key;
                content.innerHTML += `
                    <div class="admin-user-card">
                        <span>${u.nickname} (${u.role})</span>
                        <button onclick="AdminPanel.giveAdmin('${uid}')">Дать Админку</button>
                        <button onclick="AdminPanel.ban('${uid}')">Бан</button>
                        <button onclick="AdminPanel.setRainbow('${uid}')">Радужный ник</button>
                    </div>
                `;
            });
            content.innerHTML += "</div>";
        }
    },

    giveAdmin: async function(uid) {
        await db.ref(`users/${uid}`).update({ role: "admin", tagColor: "#ff0000" });
        alert("Успешно!");
    },

    ban: async function(uid) {
        await db.ref(`users/${uid}`).update({ isBanned: true });
        alert("Забанен!");
    },

    setRainbow: async function(uid) {
        await db.ref(`users/${uid}`).update({ isRainbow: true });
        alert("Эффект выдан!");
    }
};

const UI = {
    renderHeader: function(isAuth) {
        const panel = document.getElementById('top-user-panel');
        if (isAuth) {
            panel.innerHTML = `
                <div class="notif-bell">
                    <i class="fas fa-bell"></i>
                    <span class="bell-count">0</span>
                </div>
                <div class="user-pill" onclick="UI.showModal('settings')">
                    <img src="${App.profile.avatar}" class="nav-avatar">
                    <span class="${App.profile.isRainbow ? 'rainbow-text' : ''}">${App.profile.nickname}</span>
                </div>
            `;
        }
    },

    showModal: function(id) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById(`modal-${id}`).classList.remove('hidden');
    },

    closeModals: function() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal-window').forEach(m => m.classList.add('hidden'));
    },

    toggleSidebar: function() {
        document.getElementById('sidebar').classList.toggle('active');
    }
};

const Router = {
    go: function(page) {
        if (page === 'home') App.loadHome();
    },
    viewThread: async function(catId, tid) {
        const root = document.getElementById('forum-view');
        const snap = await db.ref(`threads/${catId}/${tid}`).once('value');
        const t = snap.val();

        root.innerHTML = `
            <div class="thread-view">
                <div class="thread-header">
                    <h2>${t.title}</h2>
                    <span class="tag ${App.getTagClass(t.status)}">${t.status}</span>
                </div>
                <div class="post-card main-post">
                    <div class="post-side">
                        <img src="${t.authorAva}">
                        <div class="post-nick">${t.authorName}</div>
                    </div>
                    <div class="post-content">${t.content}</div>
                </div>
                <div id="replies"></div>
                <div class="reply-editor">
                    <textarea id="reply-text" placeholder="Ваш ответ..."></textarea>
                    <button onclick="Forum.sendReply('${catId}','${tid}')">ОТВЕТИТЬ</button>
                </div>
            </div>
        `;
    }
};

// Запуск Системы
window.onload = () => {
    App.init();
    setTimeout(() => {
        document.getElementById('loader-wrapper').style.opacity = '0';
        setTimeout(() => document.getElementById('loader-wrapper').style.display = 'none', 500);
    }, 1500);
};
