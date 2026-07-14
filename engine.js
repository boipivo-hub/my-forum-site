// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v20.0 (ARMORED ULTRA FULL)
// SECURITY LEVEL: TOTAL PROTECTION (UID + SERVER RULES + ANTI-F12)
// DEVELOPED FOR: Qumestlies_Shawty (ariessupporttest@gmail.com)
// ==========================================================================

// --- КОНФИГУРАЦИЯ FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM", 
    authDomain: "aries-forum.firebaseapp.com",
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "aries-forum",
    storageBucket: "aries-forum.appspot.com",
    messagingSenderId: "614643963857",
    appId: "1:614643963857:web:01f1f941c72249ac6eb2f0"
};

// Инициализация системы
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Aries Engine: System Core v20.0 Booted.");
}

const dbRef = firebase.database().ref();
const auth = firebase.auth();

// --- ГЛОБАЛЬНОЕ СОСТОЯНИЕ (CLOUD STATE) ---
let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = [];

const MASTER_EMAIL = "ariessupporttest@gmail.com";
const MASTER_NICK = "Qumestlies_Shawty";

// ==========================================================================
// МОДУЛЬ БРАУЗЕРНОЙ ЗАЩИТЫ (ANTI-F12)
// ==========================================================================
document.addEventListener('contextmenu', e => e.preventDefault()); 
document.onkeydown = function(e) {
    if(e.keyCode == 123) return false; 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) return false; 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) return false; 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) return false; 
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false; 
};

// ==========================================================================
// МОДУЛЬ 1: УЛЬТРА-СИНХРОНИЗАЦИЯ ПРОФИЛЯ (UID SYSTEM)
// ==========================================================================

async function syncUserProfile(user, customNick = null) {
    if (!user) return;
    const uid = user.uid; // Железный ID
    
    try {
        const snap = await dbRef.child('users/' + uid).once('value');
        const isMaster = (user.email.toLowerCase() === MASTER_EMAIL.toLowerCase());

        if (!snap.exists()) {
            console.log("Aries Security: Initializing new UID profile...");
            await dbRef.child('users/' + uid).set({
                uid: uid,
                nick: isMaster ? MASTER_NICK : (customNick || user.displayName || "User_" + Math.floor(Math.random()*9999)),
                email: user.email,
                glow: isMaster ? 'glow-founder' : 'glow-user',
                badge: isMaster ? 'badge-founder' : 'badge-user',
                verify: isMaster ? 'v-blue-fill' : 'none',
                avatar: user.photoURL || 'https://i.postimg.cc/9Q2g9g6y/user2.png',
                banned: false,
                reg_date: Date.now()
            });
        }
        App.userUid = uid;
        App.syncUI();
    } catch (e) { console.error("Database block by Rules. Profile not synced."); }
}

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
            } catch (error) { alert("Ссылка невалидна."); }
        }
    }
}

auth.onAuthStateChanged(async (user) => {
    if (user) {
        App.userUid = user.uid;
        if (!GlobalUsers[user.uid]) await syncUserProfile(user);
    } else {
        App.userUid = null;
    }
    App.syncUI();
});

// ==========================================================================
// МОДУЛЬ 2: МОНИТОРИНГ БАЗЫ (IRON STREAM)
// ==========================================================================

dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    window.CloudFounders = data.founders || [];

    // Авто-создание структуры, если база пустая
    if (Object.keys(GlobalNodes).length === 0) {
        dbRef.child('nodes/main').set({
            title: '📢 Общий раздел проекта',
            path: 'Aries Role Play / Основное',
            threads: {
                't-init': { id: 't-init', title: 'Добро пожаловать!', creator: 'System', posts: { "p1": { author: 'System', text: 'Форум онлайн. Защита активна.' } } }
            }
        });
    }

    if (isFirstLoad) {
        isFirstLoad = false;
        handleEmailLinkSignIn();
    }

    App.syncUI();
}, (err) => { console.error("Access Refused: Iron Rules are watching."); });

// ==========================================================================
// МОДУЛЬ 3: AUTH MODULE (GOOGLE + MAGIC LINK)
// ==========================================================================

const AuthModule = {
    open() { document.getElementById('m-auth').style.display = 'flex'; },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    googleSignIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(async (result) => {
                await syncUserProfile(result.user);
                location.reload();
            })
            .catch((error) => alert('Google Error: ' + error.message));
    },

    sendLink() {
        const email = document.getElementById('f-email').value.trim();
        const nick = document.getElementById('f-user').value.trim();
        if (!email || !nick) return alert('Введите данные!');
        
        auth.sendSignInLinkToEmail(email, { url: window.location.origin + window.location.pathname, handleCodeInApp: true })
            .then(() => {
                window.localStorage.setItem('emailForSignIn', email);
                window.localStorage.setItem('nickForSignIn', nick);
                alert('Письмо отправлено на ' + email);
                this.close();
            }).catch((err) => alert('Firebase Error: ' + err.message));
    },
    
    logout() {
        auth.signOut().then(() => {
            location.reload();
        });
    }
};

// ==========================================================================
// МОДУЛЬ 4: АДМИН-ПАНЕЛЬ (SERVER-PROTECTED)
// ==========================================================================

const AdminPanel = {
    open() {
        const u = GlobalUsers[App.userUid];
        if (!(u && (u.email === MASTER_EMAIL || window.CloudFounders.includes(u.nick)))) {
            return alert('Access Denied.');
        }
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
        if (n === MASTER_NICK) return;
        window.CloudFounders = window.CloudFounders.filter(x => x !== n);
        dbRef.child('founders').set(window.CloudFounders);
    },

    save() {
        const k = document.getElementById('adm-target-user').value;
        const isB = document.getElementById('adm-set-ban').value === 'yes';
        dbRef.child('users/' + k).update({
            glow: isB ? 'glow-banned' : document.getElementById('adm-set-glow').value,
            badge: isB ? 'badge-banned' : document.getElementById('adm-set-badge').value,
            verify: isB ? 'none' : document.getElementById('adm-set-verify').value,
            banned: isB
        }).then(() => { alert('Обновлено!'); this.close(); });
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
                <span class="${u.glow}" onclick="ProfileCore.open()" style="cursor:pointer; font-weight:bold;">${u.nick}</span>
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
            const act = (this.activeNodeKey === k) ? 'active' : '';
            nav.innerHTML += `<div class="nav-link ${act}" onclick="App.route('${k}')">${GlobalNodes[k].title}</div>`;
        }
    },

    checkAdmin() {
        const u = GlobalUsers[this.userUid];
        if (u && (u.email === MASTER_EMAIL || window.CloudFounders.includes(u.nick))) {
            if (!document.getElementById('ui-admin-btn')) {
                const nav = document.getElementById('nodes-navigation-list');
                const b = document.createElement('button');
                b.id = 'ui-admin-btn'; b.className = 'btn-core'; b.style.cssText = 'width:100%; margin-top:20px; background:red;';
                b.innerHTML = '🛡️ Админка'; b.onclick = () => AdminPanel.open();
                nav.appendChild(b);
            }
        }
    },

    route(k) { this.activeNodeKey = k; this.activeThreadId = null; this.syncUI(); },

    renderContent() {
        const v = document.getElementById('render-forum-core');
        if (!v) return;
        const n = GlobalNodes[this.activeNodeKey];
        if (!n) { v.innerHTML = '<h3>Загрузка...</h3>'; return; }
        if (this.activeThreadId) { this.renderThread(v, n); return; }

        let h = `<h2>${n.title}</h2><button class="btn-core" onclick="App.formThread()">+ Создать тему</button><hr style="border:0; border-top:1px solid #1c1c30; margin:20px 0;">`;
        for (let tid in (n.threads || {})) {
            h += `<div class="topic-link" onclick="App.openThread('${tid}')">${n.threads[tid].title} <br><small>Автор: ${n.threads[tid].creator}</small></div>`;
        }
        v.innerHTML = h;
    },

    openThread(id) { this.activeThreadId = id; this.renderContent(); },

    renderThread(v, n) {
        const t = n.threads[this.activeThreadId];
        let h = `<button class="btn-core" style="background:#222; margin-bottom:15px;" onclick="App.route('${this.activeNodeKey}')">Назад</button><h3>${t.title}</h3>`;
        Object.values(t.posts || {}).forEach(p => {
            let author = { nick: p.author, glow: 'glow-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            for(let k in GlobalUsers) if(GlobalUsers[k].nick === p.author) author = GlobalUsers[k];
            h += `<div class="post-row" style="padding:15px; border:1px solid #1c1c30; border-radius:6px; margin-bottom:10px; background:#08080d;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <img src="${author.avatar}" class="avatar-mini"><span class="${author.glow}" style="font-weight:bold">${p.author}</span>
                </div>
                <div style="color:#ccc;">${p.text}</div>
            </div>`;
        });
        if (this.userUid && GlobalUsers[this.userUid]?.banned === false) {
            h += `<textarea id="reply-text" class="input-field" placeholder="Ваш ответ..."></textarea><button class="btn-core" onclick="App.sendReply()">Отправить</button>`;
        }
        v.innerHTML = h;
    },

    sendReply() {
        const txt = document.getElementById('reply-text').value.trim();
        if (txt) dbRef.child(`nodes/${this.activeNodeKey}/threads/${this.activeThreadId}/posts`).push({ author: GlobalUsers[this.userUid].nick, author_uid: this.userUid, text: txt });
    },

    formThread() {
        if (!this.userUid) return alert('Залогиньтесь!');
        document.getElementById('render-forum-core').innerHTML = `<h3>Создание темы</h3><input id="nt-title" class="input-field" placeholder="Заголовок"><textarea id="nt-text" class="input-field" rows="8" placeholder="Сообщение"></textarea><button class="btn-core" onclick="App.submitThread()">Создать</button>`;
    },

    submitThread() {
        const tid = 't-' + Date.now();
        dbRef.child(`nodes/${this.activeNodeKey}/threads/${tid}`).set({ id: tid, title: document.getElementById('nt-title').value, creator: GlobalUsers[this.userUid].nick, posts: { "p1": { author: GlobalUsers[this.userUid].nick, author_uid: this.userUid, text: document.getElementById('nt-text').value } } }).then(() => { this.activeThreadId = tid; this.renderContent(); });
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
        reader.onload = (event) => document.getElementById('my-profile-avatar-view').src = event.target.result;
        reader.readAsDataURL(e.target.files[0]);
    },
    saveData() {
        dbRef.child('users/' + this.userUid).update({ nick: document.getElementById('new-profile-nick').value.trim(), avatar: document.getElementById('my-profile-avatar-view').src }).then(() => { alert("Saved."); this.close(); });
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
// END OF ENGINE.JS - ARIES ROLE PLAY CLOUD v20.0 ULTRA FULL
// ==========================================================================
