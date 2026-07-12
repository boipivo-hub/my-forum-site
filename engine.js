// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v9.6 (FULL VERSION + EMAIL AUTH)
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM", // Твой ключ из сообщения
    authDomain: "aries-forum.firebaseapp.com",
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "aries-forum",
    storageBucket: "aries-forum.appspot.com",
    messagingSenderId: "614643963857",
    appId: "1:614643963857:web:01f1f941c72249ac6eb2f0"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const dbRef = firebase.database().ref();
const auth = firebase.auth();

let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = []; 

// ПРОВЕРКА ССЫЛКИ ИЗ ПОЧТЫ (Подтверждение входа)
if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
        email = window.prompt('Пожалуйста, введите вашу почту еще раз для подтверждения:');
    }
    auth.signInWithEmailLink(email, window.location.href)
        .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            const nick = window.localStorage.getItem('nickForSignIn') || "User_" + Math.floor(Math.random()*999);
            const userKey = email.replace('.', ',');
            
            // Если юзера нет в базе - создаем
            firebase.database().ref('users/' + userKey).once('value', snap => {
                if(!snap.exists()) {
                    firebase.database().ref('users/' + userKey).set({
                        nick: nick, glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
                    });
                }
                localStorage.setItem('active_session', userKey);
                window.location.href = "/";
            });
        })
        .catch((error) => alert('Ошибка входа: ' + error.message));
}

// ОСНОВНОЙ ЦИКЛ СИНХРОНИЗАЦИИ
dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    window.CloudFounders = data.founders || []; 
    
    if (isFirstLoad) {
        const savedSession = localStorage.getItem('active_session');
        if (savedSession && GlobalUsers[savedSession] && !GlobalUsers[savedSession].banned) {
            App.user = savedSession;
        } else {
            localStorage.removeItem('active_session');
            App.user = null;
        }
        isFirstLoad = false;
    }
    App.syncUI();
});

// --- МОДУЛЬ 1: АВТОРИЗАЦИЯ (ПЕРЕДЕЛАН ПОД EMAIL) ---
const AuthModule = {
    open() {
        const modal = document.getElementById('m-auth');
        if (!modal) return;
        modal.style.display = 'flex';
        const container = document.getElementById('auth-btn-container');
        container.innerHTML = `<button class="btn-core" style="width:100%;" onclick="AuthModule.sendLoginLink()">Отправить ссылку на почту</button>`;
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    sendLoginLink() {
        const email = document.getElementById('f-email').value.trim();
        const nick = document.getElementById('f-nick').value.trim();
        if(!email) return alert('Введите почту!');

        const actionCodeSettings = {
            url: window.location.href, // Вернуться сюда же
            handleCodeInApp: true
        };

        auth.sendSignInLinkToEmail(email, actionCodeSettings)
            .then(() => {
                window.localStorage.setItem('emailForSignIn', email);
                window.localStorage.setItem('nickForSignIn', nick);
                alert('Проверьте почту! Мы отправили вам ссылку для входа.');
                this.close();
            })
            .catch((error) => alert('Ошибка: ' + error.message));
    },
    logout() {
        auth.signOut();
        localStorage.removeItem('active_session');
        App.user = null;
        window.location.reload();
    }
};

// --- МОДУЛЬ АДМИН-ПАНЕЛИ (ОРИГИНАЛЬНАЯ ЛОГИКА) ---
const AdminPanel = {
    open() {
        document.getElementById('m-admin').style.display = 'flex';
        this.loadUsersList();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    loadUsersList() {
        const sel = document.getElementById('adm-target-user');
        sel.innerHTML = '';
        for(let key in GlobalUsers) { sel.innerHTML += `<option value="${key}">${GlobalUsers[key].nick || key}</option>`; }
    },
    save() {
        const target = document.getElementById('adm-target-user').value;
        const glow = document.getElementById('adm-set-glow').value;
        firebase.database().ref('users/' + target).update({ glow: glow });
        this.close();
    }
};

// --- ДИСПЕТЧЕР ИНТЕРФЕЙСА (ОРИГИНАЛЬНАЯ ЛОГИКА + ТВОЙ СТИЛЬ) ---
const App = {
    user: null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,

    syncUI() {
        this.renderAuthBar();
        this.renderMenu();
        this.render();
    },
    renderAuthBar() {
        const bar = document.getElementById('runtime-auth-zone');
        if(this.user && GlobalUsers[this.user]) {
            const u = GlobalUsers[this.user];
            bar.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <img class="avatar-mini" src="${u.avatar}">
                    <span class="${u.glow}" style="font-weight:bold;">${u.nick || this.user}</span>
                    <button class="btn-core" style="padding:5px 10px; font-size:10px;" onclick="AuthModule.logout()">Выход</button>
                </div>
            `;
        } else {
            bar.innerHTML = `<button class="btn-core" onclick="AuthModule.open()">Вход / Регистрация</button>`;
        }
    },
    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for(let key in GlobalNodes) {
            const activeClass = (this.activeNodeKey === key) ? 'active' : '';
            nav.innerHTML += `<div class="nav-link ${activeClass}" onclick="App.route('${key}')">${GlobalNodes[key].title}</div>`;
        }
    },
    route(key) { this.activeNodeKey = key; this.activeThreadId = null; this.render(); this.renderMenu(); },
    render() {
        const view = document.getElementById('render-forum-core');
        const node = GlobalNodes[this.activeNodeKey];
        if(!node) return;

        if(this.activeThreadId) { this.renderThread(view, node); return; }

        let html = `<h2>${node.title}</h2><hr style="border:0; border-top:1px solid #1c1c30; margin-bottom:20px;">`;
        if(node.threads) {
            for(let tid in node.threads) {
                html += `<div class="topic-link" onclick="App.openThread('${tid}')">${node.threads[tid].title}</div>`;
            }
        } else { html += `<p>Тем нет</p>`; }
        view.innerHTML = html;
    },
    openThread(id) { this.activeThreadId = id; this.render(); },
    renderThread(view, node) {
        const thread = node.threads[this.activeThreadId];
        let html = `<button class="btn-core" style="background:#222; margin-bottom:15px;" onclick="App.route('${this.activeNodeKey}')">↩ Назад</button><h3>${thread.title}</h3>`;
        if(thread.posts) {
            Object.values(thread.posts).forEach(p => {
                html += `<div class="post-row">
                    <div class="post-author-zone"><b>${p.author}</b></div>
                    <div class="post-text-zone">${p.text}</div>
                </div>`;
            });
        }
        view.innerHTML = html;
    }
};

window.onload = () => { App.syncUI(); };
