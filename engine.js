// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v13.0 (ULTRA STABLE FULL)
// SECURITY LEVEL: ULTRA (FIXED DB SYNC + AUTO-REG)
// DEVELOPED FOR: Qumestlies_Shawty
// ==========================================================================

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM", 
    authDomain: "aries-forum.firebaseapp.com",
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "aries-forum",
    storageBucket: "aries-forum.appspot.com",
    messagingSenderId: "614643963857",
    appId: "1:614643963857:web:01f1f941c72249ac6eb2f0"
};

// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const dbRef = firebase.database().ref();
const auth = firebase.auth();

// Глобальные переменные состояния
let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = [];

// ТВОИ ДАННЫЕ (Админ-привязка)
const MASTER_EMAIL = "ariessupporttest@gmail.com";
const MASTER_NICK = "Qumestlies_Shawty";

// ==========================================================================
// МОДУЛЬ ЗАЩИТЫ: СИНХРОНИЗАЦИЯ ПРОФИЛЯ
// ==========================================================================

async function syncUserProfile(user, customNick = null) {
    if (!user || !user.email) return;
    const userKey = user.email.replace(/\./g, ',');
    
    // Пытаемся получить данные юзера из базы
    const snap = await dbRef.child('users/' + userKey).once('value');
    
    // Если юзера еще нет в базе — создаем его запись (РЕГИСТРАЦИЯ)
    if(!snap.exists()) {
        console.log("Регистрация нового профиля в Realtime DB...");
        const isMaster = (user.email.toLowerCase() === MASTER_EMAIL.toLowerCase());
        
        await dbRef.child('users/' + userKey).set({
            nick: isMaster ? MASTER_NICK : (customNick || user.displayName || "User_" + Math.floor(Math.random()*999)),
            email: user.email,
            glow: isMaster ? 'glow-founder' : 'glow-user',
            badge: isMaster ? 'badge-founder' : 'badge-user',
            verify: isMaster ? 'v-blue-fill' : 'none',
            banned: false,
            avatar: user.photoURL || 'https://i.postimg.cc/9Q2g9g6y/user2.png'
        });
    }
    
    // Устанавливаем сессию
    localStorage.setItem('active_session_key', userKey);
    App.userKey = userKey;
    App.syncUI();
}

async function handleEmailLinkSignIn() {
    if (auth.isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) email = window.prompt('Введите ваш Email еще раз:');
        
        if (email) {
            try {
                const result = await auth.signInWithEmailLink(email, window.location.href);
                const nick = window.localStorage.getItem('nickForSignIn');
                await syncUserProfile(result.user, nick);
                
                window.localStorage.removeItem('emailForSignIn');
                window.localStorage.removeItem('nickForSignIn');
                window.history.replaceState({}, document.title, window.location.pathname);
                location.reload();
            } catch (error) {
                alert("Ошибка авторизации: Ссылка недействительна.");
            }
        }
    }
}

// Глобальный слушатель входа/выхода
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userKey = user.email.replace(/\./g, ',');
        App.userKey = userKey;
        localStorage.setItem('active_session_key', userKey);
        
        // Если база уже прогрузилась, но профиля этого юзера нет — создаем
        if (Object.keys(GlobalUsers).length > 0 && !GlobalUsers[userKey]) {
            await syncUserProfile(user);
        }
    } else {
        App.userKey = null;
    }
    App.syncUI();
});

// ==========================================================================
// ОСНОВНОЙ СИНХРОНИЗАТОР ДАННЫХ (БАЗА ДАННЫХ)
// ==========================================================================

dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    window.CloudFounders = data.founders || [];
    
    // Создаем дефолтный раздел, если база совсем пустая
    if (!data.nodes) {
        dbRef.child('nodes/main').set({
            title: '📢 Общий раздел проекта',
            path: 'Aries Role Play / Основное',
            threads: {
                't-init': { id: 't-init', title: 'Добро пожаловать!', creator: 'System', posts: { "p1": { author: 'System', text: 'Форум успешно запущен на Cloud Engine v13.0' } } }
            }
        });
    }

    if (isFirstLoad) {
        const savedKey = localStorage.getItem('active_session_key');
        if (savedKey && GlobalUsers[savedKey] && !GlobalUsers[savedKey].banned) {
            App.userKey = savedKey;
        } else if (savedKey && GlobalUsers[savedKey]?.banned) {
            localStorage.removeItem('active_session_key');
            auth.signOut();
            App.userKey = null;
        }
        isFirstLoad = false;
        handleEmailLinkSignIn();
    }

    App.syncUI();
});

// ==========================================================================
// МОДУЛЬ 1: АВТОРИЗАЦИЯ
// ==========================================================================

const AuthModule = {
    open() {
        document.getElementById('m-auth').style.display = 'flex';
        document.getElementById('auth-btn-container').innerHTML = `
            <button class="btn-core" style="width:100%; background:#4285F4; margin-bottom:12px; display:flex; align-items:center; justify-content:center; gap:10px;" onclick="AuthModule.googleSignIn()">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18"> Войти через Google
            </button>
            <button class="btn-core" style="width:100%;" onclick="AuthModule.sendLink()">Отправить ссылку на почту</button>
        `;
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    googleSignIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then(async (res) => {
            await syncUserProfile(res.user);
            location.reload();
        }).catch((error) => alert('Ошибка Google: ' + error.message));
    },

    sendLink() {
        const email = document.getElementById('f-email').value.trim();
        const nick = document.getElementById('f-user').value.trim();
        if (!email || !nick) return alert('Заполните данные!');
        
        auth.sendSignInLinkToEmail(email, { url: window.location.origin + window.location.pathname, handleCodeInApp: true })
            .then(() => {
                window.localStorage.setItem('emailForSignIn', email);
                window.localStorage.setItem('nickForSignIn', nick);
                alert('Успешно! Ссылка отправлена на почту.');
                this.close();
            }).catch((error) => alert('Ошибка: ' + error.message));
    },
    
    logout() {
        auth.signOut().then(() => {
            localStorage.removeItem('active_session_key');
            location.reload();
        });
    }
};

// ==========================================================================
// МОДУЛЬ 2: АДМИН-ПАНЕЛЬ
// ==========================================================================

const AdminPanel = {
    open() {
        const u = GlobalUsers[App.userKey];
        const hasAccess = u && (u.email === MASTER_EMAIL || window.CloudFounders.includes(u.nick));
        if (!hasAccess) return alert('Доступ закрыт.');
        document.getElementById('m-admin').style.display = 'flex';
        this.renderUsersSelect();
        this.renderFoundersList();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    renderUsersSelect() {
        const sel = document.getElementById('adm-target-user');
        sel.innerHTML = '';
        for (let key in GlobalUsers) sel.innerHTML += `<option value="${key}">${GlobalUsers[key].nick}</option>`;
    },
    addFounder() {
        const nick = document.getElementById('add-founder-nick').value.trim();
        if (nick && !window.CloudFounders.includes(nick)) {
            window.CloudFounders.push(nick);
            dbRef.child('founders').set(window.CloudFounders).then(() => this.renderFoundersList());
        }
    },
    removeFounder(nick) {
        if (nick === MASTER_NICK) return alert('Нельзя удалить главного!');
        window.CloudFounders = window.CloudFounders.filter(n => n !== nick);
        dbRef.child('founders').set(window.CloudFounders).then(() => this.renderFoundersList());
    },
    renderFoundersList() {
        let html = '<b>Founders:</b><br>';
        window.CloudFounders.forEach(n => html += `<span style="color:red; cursor:pointer; margin-right:8px;" onclick="AdminPanel.removeFounder('${n}')">${n}</span> `);
        document.getElementById('cloud-founders-list').innerHTML = html;
    },
    save() {
        const key = document.getElementById('adm-target-user').value;
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        dbRef.child('users/' + key).update({
            glow: isBan ? 'glow-banned' : document.getElementById('adm-set-glow').value,
            badge: isBan ? 'badge-banned' : document.getElementById('adm-set-badge').value,
            verify: isBan ? 'none' : document.getElementById('adm-set-verify').value,
            banned: isBan
        }).then(() => { alert('Настройки обновлены.'); this.close(); });
    }
};

// ==========================================================================
// МОДУЛЬ 3: ИНТЕРФЕЙС
// ==========================================================================

const App = {
    userKey: null, activeNodeKey: 'main', activeThreadId: null,
    syncUI() { this.renderAuthBar(); this.renderSidebar(); this.checkAdminPrivileges(); this.renderContent(); },
    renderAuthBar() {
        const zone = document.getElementById('runtime-auth-zone');
        if (!zone) return;
        const u = GlobalUsers[this.userKey];
        if (u) {
            zone.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
                <img src="${u.avatar}" class="avatar-mini" onclick="ProfileCore.open()">
                <span class="${u.glow}" style="font-weight:bold; cursor:pointer;" onclick="ProfileCore.open()">${u.nick}</span>
                <button class="btn-core" style="padding:6px 10px; font-size:10px; background:#1a1a2e;" onclick="AuthModule.logout()">Выйти</button>
            </div>`;
        } else {
            zone.innerHTML = `<button class="btn-core" onclick="AuthModule.open()">Войти / Создать</button>`;
        }
    },
    renderSidebar() {
        const nav = document.getElementById('nodes-navigation-list');
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for (let key in GlobalNodes) {
            nav.innerHTML += `<div class="nav-link ${this.activeNodeKey===key?'active':''}" onclick="App.route('${key}')">${GlobalNodes[key].title}</div>`;
        }
    },
    checkAdminPrivileges() {
        const u = GlobalUsers[this.userKey];
        if (u && (u.email === MASTER_EMAIL || window.CloudFounders.includes(u.nick))) {
            if (!document.getElementById('ui-admin-btn')) {
                const nav = document.getElementById('nodes-navigation-list');
                const btnA = document.createElement('button');
                btnA.id = 'ui-admin-btn'; btnA.className = 'btn-core'; btnA.style.cssText = 'width:100%; margin-top:20px; background:red;';
                btnA.innerHTML = '🛡️ Админка'; btnA.onclick = () => AdminPanel.open();
                nav.appendChild(btnA);
                const btnN = document.createElement('button');
                btnN.className = 'btn-core'; btnN.style.cssText = 'width:100%; margin-top:5px; background:#1c1c30;';
                btnN.innerHTML = '➕ Создать раздел'; btnN.onclick = () => NodeManager.open();
                nav.appendChild(btnN);
            }
        }
    },
    route(key) { this.activeNodeKey = key; this.activeThreadId = null; this.syncUI(); },
    renderContent() {
        const view = document.getElementById('render-forum-core');
        const node = GlobalNodes[this.activeNodeKey];
        if (!node) { view.innerHTML = '<h3>Загрузка...</h3>'; return; }
        if (this.activeThreadId) { this.renderThread(view, node); return; }
        let html = `<h2>${node.title}</h2><button class="btn-core" onclick="App.formCreateThread()">+ Создать тему</button><hr style="border:0; border-top:1px solid #1c1c30; margin:20px 0;">`;
        for (let tid in (node.threads || {})) {
            html += `<div class="topic-link" onclick="App.openThread('${tid}')">${node.threads[tid].title} <br><small style="color:#555;">Автор: ${node.threads[tid].creator}</small></div>`;
        }
        view.innerHTML = html;
    },
    openThread(id) { this.activeThreadId = id; this.renderContent(); },
    renderThread(view, node) {
        const thread = node.threads[this.activeThreadId];
        let html = `<button class="btn-core" style="background:#222; margin-bottom:15px;" onclick="App.route('${this.activeNodeKey}')">Назад</button><h3>${thread.title}</h3>`;
        Object.values(thread.posts || {}).forEach(p => {
            let authData = { nick: p.author, glow: 'glow-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            for(let k in GlobalUsers) if(GlobalUsers[k].nick === p.author) authData = GlobalUsers[k];
            html += `<div class="post-row" style="padding:15px; border:1px solid #1c1c30; border-radius:6px; margin-bottom:10px; background:#08080d;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <img src="${authData.avatar}" class="avatar-mini"><span class="${authData.glow}" style="font-weight:bold;">${p.author}</span>
                </div>
                <div>${p.text}</div>
            </div>`;
        });
        if (this.userKey) html += `<textarea id="reply-text" class="input-field" rows="4" placeholder="Напишите ответ..."></textarea><button class="btn-core" onclick="App.sendReply()">Отправить</button>`;
        view.innerHTML = html;
    },
    sendReply() {
        const text = document.getElementById('reply-text').value.trim();
        if (text) dbRef.child(`nodes/${this.activeNodeKey}/threads/${this.activeThreadId}/posts`).push({ author: GlobalUsers[this.userKey].nick, text: text });
    },
    formCreateThread() {
        if (!this.userKey) return alert('Войдите в аккаунт!');
        document.getElementById('render-forum-core').innerHTML = `<h3>Новая тема</h3><input type="text" id="nt-title" class="input-field" placeholder="Заголовок"><textarea id="nt-text" class="input-field" rows="8" placeholder="Текст"></textarea><button class="btn-core" onclick="App.submitThread()">Создать</button>`;
    },
    submitThread() {
        const title = document.getElementById('nt-title').value;
        const text = document.getElementById('nt-text').value;
        const tid = 't-' + Date.now();
        dbRef.child(`nodes/${this.activeNodeKey}/threads/${tid}`).set({ id: tid, title: title, creator: GlobalUsers[this.userKey].nick, posts: { "p1": { author: GlobalUsers[this.userKey].nick, text: text } } }).then(() => { this.activeThreadId = tid; this.renderContent(); });
    }
};

const ProfileCore = {
    open() {
        const u = GlobalUsers[App.userKey];
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
        dbRef.child('users/' + App.userKey).update({ nick: document.getElementById('new-profile-nick').value.trim(), avatar: document.getElementById('my-profile-avatar-view').src }).then(() => this.close());
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
// END OF ENGINE.JS - ARIES ROLE PLAY CLOUD v13.0
// ==========================================================================
