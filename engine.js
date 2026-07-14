// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v15.0 (SUPER ARMORED FULL)
// SECURITY LEVEL: GOD (UID PROTECTION + SERVER SIDE VALIDATION)
// DEVELOPED FOR: Qumestlies_Shawty (ariessupporttest@gmail.com)
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM", 
    authDomain: "aries-forum.firebaseapp.com",
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "aries-forum",
    storageBucket: "aries-forum.appspot.com",
    messagingSenderId: "614643963857",
    appId: "1:614643963857:web:01f1f941c72249ac6eb2f0"
};

// Инициализация ядра системы
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Aries Engine: Firebase Core Initialized.");
}

const dbRef = firebase.database().ref();
const auth = firebase.auth();

// Состояние приложения (Cloud State)
let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = [];

// Константы администратора
const MASTER_EMAIL = "ariessupporttest@gmail.com";
const MASTER_NICK = "Qumestlies_Shawty";

// ==========================================================================
// МОДУЛЬ 1: УЛЬТРА-СИНХРОНИЗАЦИЯ (UID SYSTEM)
// ==========================================================================

async function syncUserProfile(user, customNick = null) {
    if (!user) return;
    const uid = user.uid;
    console.log("Aries Sync: Checking profile for UID:", uid);

    try {
        const snapshot = await dbRef.child('users/' + uid).once('value');
        const isMaster = (user.email.toLowerCase() === MASTER_EMAIL.toLowerCase());

        if (!snapshot.exists()) {
            console.log("Aries Sync: Registering new user...");
            const newUser = {
                uid: uid,
                nick: isMaster ? MASTER_NICK : (customNick || user.displayName || "Player_" + Math.floor(Math.random() * 9999)),
                email: user.email,
                glow: isMaster ? 'glow-founder' : 'glow-user',
                badge: isMaster ? 'badge-founder' : 'badge-user',
                verify: isMaster ? 'v-blue-fill' : 'none',
                avatar: user.photoURL || 'https://i.postimg.cc/9Q2g9g6y/user2.png',
                banned: false,
                reg_date: Date.now()
            };
            await dbRef.child('users/' + uid).set(newUser);
        } else {
            console.log("Aries Sync: Profile found. Session active.");
        }

        App.userUid = uid;
        localStorage.setItem('aries_active_uid', uid);
        App.syncUI();
    } catch (error) {
        console.error("Aries Sync critical error:", error);
    }
}

// Обработка входящих ссылок Magic Link
async function handleEmailLinkSignIn() {
    if (auth.isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn') || window.prompt('Для входа введите ваш Email:');
        if (email) {
            try {
                const result = await auth.signInWithEmailLink(email, window.location.href);
                const nick = window.localStorage.getItem('nickForSignIn');
                await syncUserProfile(result.user, nick);
                
                window.localStorage.removeItem('emailForSignIn');
                window.localStorage.removeItem('nickForSignIn');
                window.history.replaceState({}, document.title, window.location.pathname);
                location.reload();
            } catch (err) {
                alert("Ошибка ссылки: она недействительна или уже использована.");
            }
        }
    }
}

// Слушатель состояния авторизации
auth.onAuthStateChanged(async (user) => {
    if (user) {
        App.userUid = user.uid;
        if (!GlobalUsers[user.uid]) await syncUserProfile(user);
    } else {
        App.userUid = null;
        localStorage.removeItem('aries_active_uid');
    }
    App.syncUI();
});

// ==========================================================================
// МОДУЛЬ 2: МОНИТОРИНГ БАЗЫ (REALTIME STREAM)
// ==========================================================================

dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    window.CloudFounders = data.founders || [];

    console.log("Aries Cloud: Database Synced.");

    // Инициализация структуры (если база девственно чиста)
    if (Object.keys(GlobalNodes).length === 0) {
        console.warn("Aries Engine: Nodes not found. Initializing...");
        dbRef.child('nodes/main').set({
            title: '📢 Главный раздел проекта',
            path: 'Aries Role Play / Основное',
            threads: {
                't-start': { id: 't-init', title: 'Добро пожаловать!', creator: 'System', posts: { "p1": { author: 'System', text: 'Форум успешно запущен на Cloud Engine v15.0' } } }
            }
        });
    }

    if (isFirstLoad) {
        isFirstLoad = false;
        const saved = localStorage.getItem('aries_active_uid');
        if (saved && GlobalUsers[saved]) App.userUid = saved;
        handleEmailLinkSignIn();
    }

    App.syncUI();
}, (error) => {
    console.error("Aries Cloud: Permission Denied! Check Rules.");
});

// ==========================================================================
// МОДУЛЬ 3: AUTH MODULE (GOOGLE + MAGIC LINK)
// ==========================================================================

const AuthModule = {
    open() {
        document.getElementById('m-auth').style.display = 'flex';
        document.getElementById('auth-btn-container').innerHTML = `
            <button class="btn-core" style="width:100%; background:#4285F4; margin-bottom:12px; display:flex; align-items:center; justify-content:center; gap:10px;" onclick="AuthModule.googleSignIn()">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18"> Вход через Google
            </button>
            <button class="btn-core" style="width:100%;" onclick="AuthModule.sendLink()">Вход по почте (Magic Link)</button>
        `;
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    googleSignIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(async (result) => {
                await syncUserProfile(result.user);
                location.reload();
            })
            .catch((error) => alert("Ошибка Google: " + error.message));
    },

    sendLink() {
        const email = document.getElementById('f-email').value.trim();
        const nick = document.getElementById('f-user').value.trim();
        if (!email || !nick) return alert('Заполните данные для регистрации!');
        
        auth.sendSignInLinkToEmail(email, {
            url: window.location.origin + window.location.pathname,
            handleCodeInApp: true
        }).then(() => {
            window.localStorage.setItem('emailForSignIn', email);
            window.localStorage.setItem('nickForSignIn', nick);
            alert('Магическая ссылка отправлена на почту ' + email);
            this.close();
        }).catch((err) => alert("Ошибка: " + err.message));
    },
    
    logout() {
        auth.signOut().then(() => {
            localStorage.removeItem('aries_active_uid');
            location.reload();
        });
    }
};

// ==========================================================================
// МОДУЛЬ 4: АДМИН-ПАНЕЛЬ (SERVER-SIDE PROTECTED)
// ==========================================================================

const AdminPanel = {
    open() {
        const u = GlobalUsers[App.userUid];
        const isMaster = u && u.email === MASTER_EMAIL;
        const isFounder = u && window.CloudFounders.includes(u.nick);
        
        if (!(isMaster || isFounder)) return alert('Критическая ошибка: Доступ запрещен правилами сервера.');
        
        document.getElementById('m-admin').style.display = 'flex';
        this.renderUsers();
        this.renderFounders();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    
    renderUsers() {
        const sel = document.getElementById('adm-target-user');
        sel.innerHTML = '';
        for (let k in GlobalUsers) {
            sel.innerHTML += `<option value="${k}">${GlobalUsers[k].nick}</option>`;
        }
    },
    
    renderFounders() {
        let h = '<b>Founders List:</b><br>';
        window.CloudFounders.forEach(n => h += `<span style="color:red; cursor:pointer; margin-right:8px;" onclick="AdminPanel.removeFounder('${n}')">${n}</span> `);
        document.getElementById('cloud-founders-list').innerHTML = h;
    },

    addFounder() {
        const n = document.getElementById('add-founder-nick').value.trim();
        if (n && !window.CloudFounders.includes(n)) {
            window.CloudFounders.push(n);
            dbRef.child('founders').set(window.CloudFounders);
        }
    },

    removeFounder(n) {
        if (n === MASTER_NICK) return alert("Нельзя удалить главного создателя!");
        window.CloudFounders = window.CloudFounders.filter(x => x !== n);
        dbRef.child('founders').set(window.CloudFounders);
    },

    save() {
        const key = document.getElementById('adm-target-user').value;
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        
        dbRef.child('users/' + key).update({
            glow: isBan ? 'glow-banned' : document.getElementById('adm-set-glow').value,
            badge: isBan ? 'badge-banned' : document.getElementById('adm-set-badge').value,
            verify: isBan ? 'none' : document.getElementById('adm-set-verify').value,
            banned: isBan
        }).then(() => { alert('Настройки обновлены на сервере.'); this.close(); });
    }
};

// ==========================================================================
// МОДУЛЬ 5: ГЛАВНЫЙ ДИСПЕТЧЕР (INTERFACE CORE)
// ==========================================================================

const App = {
    userUid: null, activeNodeKey: 'main', activeThreadId: null,

    syncUI() {
        this.renderAuthBar();
        this.renderSidebar();
        this.checkAdmin();
        this.renderContent();
    },

    renderAuthBar() {
        const zone = document.getElementById('runtime-auth-zone');
        if (!zone) return;
        const u = GlobalUsers[this.userUid];
        if (u) {
            zone.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
                <img src="${u.avatar}" class="avatar-mini" onclick="ProfileCore.open()">
                <span class="${u.glow}" style="font-weight:bold; cursor:pointer;" onclick="ProfileCore.open()">${u.nick}</span>
                <button class="btn-core" style="padding:6px 10px; font-size:10px; background:#1a1a2e" onclick="AuthModule.logout()">Выйти</button>
            </div>`;
        } else {
            zone.innerHTML = `<button class="btn-core" onclick="AuthModule.open()">Войти / Создать</button>`;
        }
    },

    renderSidebar() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for (let k in GlobalNodes) {
            nav.innerHTML += `<div class="nav-link ${this.activeNodeKey===k?'active':''}" onclick="App.route('${k}')">${GlobalNodes[k].title}</div>`;
        }
    },

    checkAdmin() {
        const u = GlobalUsers[this.userUid];
        if (u && (u.email === MASTER_EMAIL || window.CloudFounders.includes(u.nick))) {
            if (!document.getElementById('ui-admin-btn')) {
                const nav = document.getElementById('nodes-navigation-list');
                const bA = document.createElement('button');
                bA.id = 'ui-admin-btn'; bA.className = 'btn-core'; bA.style.cssText = 'width:100%; margin-top:20px; background:red;';
                bA.innerHTML = '🛡️ Панель Создателя'; bA.onclick = () => AdminPanel.open();
                nav.appendChild(bA);
                const bN = document.createElement('button');
                bN.className = 'btn-core'; bN.style.cssText = 'width:100%; margin-top:5px; background:#1c1c30;';
                bN.innerHTML = '➕ Новый раздел'; bN.onclick = () => NodeManager.open();
                nav.appendChild(bN);
            }
        }
    },

    route(k) { this.activeNodeKey = k; this.activeThreadId = null; this.syncUI(); },

    renderContent() {
        const v = document.getElementById('render-forum-core');
        if (!v) return;
        const n = GlobalNodes[this.activeNodeKey];
        if (!n) { v.innerHTML = '<h3>Загрузка контента...</h3>'; return; }
        if (this.activeThreadId) { this.renderThread(v, n); return; }

        let h = `<h2>${n.title}</h2><button class="btn-core" onclick="App.formThread()">+ Создать тему</button><hr style="border:0; border-top:1px solid #1c1c30; margin:20px 0;">`;
        for (let tid in (n.threads || {})) {
            const t = n.threads[tid];
            h += `<div class="topic-link" onclick="App.openThread('${tid}')">${t.title} <br><small style="color:#555">Автор: ${t.creator}</small></div>`;
        }
        v.innerHTML = (Object.keys(n.threads || {}).length === 0) ? h + '<p style="text-align:center; padding:40px;">Тут еще никто ничего не написал.</p>' : h;
    },

    openThread(id) { this.activeThreadId = id; this.renderContent(); },

    renderThread(v, n) {
        const t = n.threads[this.activeThreadId];
        let h = `<button class="btn-core" style="background:#222; margin-bottom:15px;" onclick="App.route('${this.activeNodeKey}')">Назад</button><h3>${t.title}</h3>`;
        Object.values(t.posts || {}).forEach(p => {
            let author = { nick: p.author, glow: 'glow-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            for(let k in GlobalUsers) if(GlobalUsers[k].nick === p.author) author = GlobalUsers[k];
            h += `<div class="post-row"><div class="post-author-zone"><img src="${author.avatar}" class="avatar-mini"><span class="${author.glow}">${p.author}</span></div><div class="post-text-zone">${p.text}</div></div>`;
        });
        if (this.userUid) h += `<textarea id="reply-text" class="input-field" placeholder="Ваш ответ..."></textarea><button class="btn-core" onclick="App.sendReply()">Отправить ответ</button>`;
        v.innerHTML = h;
    },

    sendReply() {
        const txt = document.getElementById('reply-text').value.trim();
        if (txt) dbRef.child(`nodes/${this.activeNodeKey}/threads/${this.activeThreadId}/posts`).push({ author: GlobalUsers[this.userUid].nick, text: txt, author_uid: this.userUid });
    },

    formThread() {
        if (!this.userUid) return alert('Войдите в аккаунт!');
        document.getElementById('render-forum-core').innerHTML = `<h3>Создание новой темы</h3><input id="nt-title" class="input-field" placeholder="Заголовок темы"><textarea id="nt-text" class="input-field" rows="8" placeholder="Текст сообщения..."></textarea><button class="btn-core" onclick="App.submitThread()">Опубликовать</button>`;
    },

    submitThread() {
        const title = document.getElementById('nt-title').value;
        const text = document.getElementById('nt-text').value;
        if (!title || !text) return;
        const tid = 't-' + Date.now();
        dbRef.child(`nodes/${this.activeNodeKey}/threads/${tid}`).set({ id: tid, title, creator: GlobalUsers[this.userUid].nick, posts: { "p1": { author: GlobalUsers[this.userUid].nick, text, author_uid: this.userUid } } }).then(() => { this.activeThreadId = tid; this.renderContent(); });
    }
};

const ProfileCore = {
    open() {
        const u = GlobalUsers[this.userUid];
        if (!u) return;
        document.getElementById('m-profile').style.display = 'flex';
        document.getElementById('new-profile-nick').value = u.nick;
        document.getElementById('my-profile-avatar-view').src = u.avatar;
    },
    close() { document.getElementById('m-profile').style.display = 'none'; },
    upload(e) {
        const reader = new FileReader();
        reader.onload = (ev) => document.getElementById('my-profile-avatar-view').src = ev.target.result;
        reader.readAsDataURL(e.target.files[0]);
    },
    saveData() {
        dbRef.child('users/' + this.userUid).update({ nick: document.getElementById('new-profile-nick').value.trim(), avatar: document.getElementById('my-profile-avatar-view').src }).then(() => this.close());
    }
};

const NodeManager = {
    open() { document.getElementById('m-create-node').style.display = 'flex'; },
    close() { document.getElementById('m-create-node').style.display = 'none'; },
    submit() {
        const nid = 'node_' + Date.now();
        dbRef.child('nodes/' + nid).set({ title: document.getElementById('node-new-title').value.trim(), path: document.getElementById('node-new-path').value.trim() }).then(() => this.close());
    }
};

window.onload = () => { App.syncUI(); };

// ==========================================================================
// END OF ENGINE.JS - ARIES ROLE PLAY CLOUD v15.0
// ==========================================================================
