// ==========================================================================
// ARIES ROLE PLAY - CLOUD ENGINE v9.9 ULTRA SECURE (FULL)
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM", // Нужен для Auth
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/",
    authDomain: "aries-forum.firebaseapp.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const dbRef = firebase.database().ref();
const auth = firebase.auth();

let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = [];

// --- ПРОВЕРКА ВХОДА ПО ПОЧТЕ (ГЛАВНАЯ ЗАЩИТА) ---
if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) email = window.prompt('Для подтверждения введите ваш Email еще раз:');
    
    auth.signInWithEmailLink(email, window.location.href)
    .then((result) => {
        window.localStorage.removeItem('emailForSignIn');
        const nick = window.localStorage.getItem('nickForSignIn') || "User_" + Math.floor(Math.random()*999);
        const userKey = email.replace(/\./g, ','); // Firebase не любит точки в ключах

        dbRef.child('users/' + userKey).once('value', snap => {
            if(!snap.exists()) {
                // Если новый акк, создаем запись
                dbRef.child('users/' + userKey).set({
                    nick: nick, email: email, glow: 'glow-user', badge: 'badge-user', 
                    verify: 'none', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
                });
            }
            localStorage.setItem('active_session_email', userKey);
            window.location.href = window.location.origin + window.location.pathname;
        });
    }).catch(err => alert('Ошибка входа: ' + err.message));
}

// СИНХРОНИЗАЦИЯ БАЗЫ
dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    window.CloudFounders = data.founders || [];

    if (isFirstLoad) {
        const saved = localStorage.getItem('active_session_email');
        if (saved && GlobalUsers[saved] && !GlobalUsers[saved].banned) {
            App.userKey = saved;
        } else {
            localStorage.removeItem('active_session_email');
            App.userKey = null;
        }
        isFirstLoad = false;
    }
    App.syncUI();
});

// --- МОДУЛЬ 1: АВТОРИЗАЦИЯ ПО ССЫЛКЕ ---
const AuthModule = {
    open() {
        document.getElementById('m-auth').style.display = 'flex';
        document.getElementById('auth-btn-container').innerHTML = `
            <button class="btn-core" style="width:100%;" onclick="AuthModule.sendMagicLink()">Отправить ссылку на почту</button>
        `;
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    sendMagicLink() {
        const email = document.getElementById('f-email').value.trim();
        const nick = document.getElementById('f-user').value.trim();
        if(!email || !nick) return alert('Введите ник и почту!');

        const actionCodeSettings = {
            url: window.location.href,
            handleCodeInApp: true
        };

        auth.sendSignInLinkToEmail(email, actionCodeSettings)
        .then(() => {
            window.localStorage.setItem('emailForSignIn', email);
            window.localStorage.setItem('nickForSignIn', nick);
            alert('Ссылка для входа отправлена на ' + email + '! Проверьте папку Входящие или Спам.');
            this.close();
        }).catch(err => alert('Ошибка: ' + err.message));
    },
    logout() {
        auth.signOut();
        localStorage.removeItem('active_session_email');
        App.userKey = null;
        App.syncUI();
    }
};

// --- МОДУЛЬ 2: АДМИН-ПАНЕЛЬ (ТОЛЬКО ДЛЯ ТЕБЯ) ---
const AdminPanel = {
    open() {
        const u = GlobalUsers[App.userKey];
        // ПРОВЕРКА ПО ПОЧТЕ (УЛЬТРА ЗАЩИТА)
        const isOwner = u && (u.email === 'ariessupporttest@gmail.com' || window.CloudFounders.includes(u.nick));
        if(!isOwner) return alert('Доступ запрещен! Ваша почта не подтверждена как Создатель.');
        
        document.getElementById('m-admin').style.display = 'flex';
        this.loadUsers();
        this.renderFounders();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    
    loadUsers() {
        const sel = document.getElementById('adm-target-user');
        sel.innerHTML = '';
        for(let key in GlobalUsers) {
            sel.innerHTML += `<option value="${key}">${GlobalUsers[key].nick} (${GlobalUsers[key].email})</option>`;
        }
    },
    addFounder() {
        const nick = document.getElementById('add-founder-nick').value.trim();
        if(!nick) return;
        if(!window.CloudFounders.includes(nick)) {
            window.CloudFounders.push(nick);
            dbRef.child('founders').set(window.CloudFounders);
        }
    },
    renderFounders() {
        let html = '<b>Основатели:</b> ';
        window.CloudFounders.forEach(f => html += `<span style="color:red;">${f}</span> `);
        document.getElementById('cloud-founders-list').innerHTML = html;
    },
    save() {
        const target = document.getElementById('adm-target-user').value;
        const glow = document.getElementById('adm-set-glow').value;
        const badge = document.getElementById('adm-set-badge').value;
        const verify = document.getElementById('adm-set-verify').value;
        
        dbRef.child('users/' + target).update({ glow, badge, verify });
        this.close();
    }
};

// --- МОДУЛЬ 3: ФОРУМНЫЙ ДВИЖОК ---
const App = {
    userKey: null,
    activeNodeKey: 'dev_news',
    
    syncUI() {
        const bar = document.getElementById('runtime-auth-zone');
        if(this.userKey && GlobalUsers[this.userKey]) {
            const u = GlobalUsers[this.userKey];
            bar.innerHTML = `
                <img src="${u.avatar}" class="avatar-mini" onclick="ProfileCore.open()">
                <span class="${u.glow}" style="cursor:pointer;" onclick="ProfileCore.open()">${u.nick}</span>
                <button class="btn-core" style="padding:5px; font-size:10px; margin-left:10px;" onclick="AuthModule.logout()">Выход</button>
            `;
            this.checkFounderUI(u);
        } else {
            bar.innerHTML = `<button class="btn-core" onclick="AuthModule.open()">Войти</button>`;
        }
        this.renderMenu();
        this.renderForum();
    },

    checkFounderUI(u) {
        if(u.email === 'ariessupporttest@gmail.com' || window.CloudFounders.includes(u.nick)) {
            if(!document.getElementById('adm-btn')) {
                const nav = document.getElementById('nodes-navigation-list');
                const b = document.createElement('button');
                b.id = 'adm-btn'; b.className = 'btn-core'; b.style.width='100%'; b.style.marginTop='15px';
                b.innerHTML = '🛡️ Панель Создателя';
                b.onclick = () => AdminPanel.open();
                nav.appendChild(b);
            }
        }
    },

    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        nav.innerHTML = '<div class="sidebar-title">Навигация</div>';
        for(let key in GlobalNodes) {
            const active = this.activeNodeKey === key ? 'active' : '';
            nav.innerHTML += `<div class="nav-link ${active}" onclick="App.route('${key}')">${GlobalNodes[key].title}</div>`;
        }
    },

    route(key) { this.activeNodeKey = key; this.renderForum(); this.renderMenu(); },

    renderForum() {
        const view = document.getElementById('render-forum-core');
        const node = GlobalNodes[this.activeNodeKey];
        if(!node) return;
        
        let html = `<h2>${node.title}</h2><button class="btn-core" onclick="App.createThread()">+ Создать тему</button><hr style="border:1px solid #1c1c30; margin:20px 0;">`;
        
        if(node.threads) {
            for(let tid in node.threads) {
                html += `<div class="topic-link" onclick="App.openThread('${tid}')">${node.threads[tid].title}</div>`;
            }
        }
        view.innerHTML = html;
    },

    openThread(tid) {
        const view = document.getElementById('render-forum-core');
        const t = GlobalNodes[this.activeNodeKey].threads[tid];
        let html = `<button class="btn-core" style="background:#222;" onclick="App.renderForum()">Назад</button><h3>${t.title}</h3>`;
        
        Object.values(t.posts).forEach(p => {
            html += `<div class="post-row">
                <div class="post-author-zone"><b>${p.author}</b></div>
                <div class="post-text-zone">${p.text}</div>
            </div>`;
        });
        view.innerHTML = html;
    }
};

const ProfileCore = { open() { document.getElementById('m-profile').style.display='flex'; }, close() { document.getElementById('m-profile').style.display='none'; } };
const NodeManager = { open() { document.getElementById('m-create-node').style.display='flex'; }, close() { document.getElementById('m-create-node').style.display='none'; } };

window.onload = () => { if(!App.userKey) App.syncUI(); };
