// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v9.6 (FULL VERSION + EMAIL AUTH)
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const dbRef = firebase.database().ref();
const auth = firebase.auth();

let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = []; 

// ПРОВЕРКА ВХОДА ПО ССЫЛКЕ ИЗ EMAIL
if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
        email = window.prompt('Пожалуйста, введите ваш email для подтверждения:');
    }
    auth.signInWithEmailLink(email, window.location.href)
        .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            const nick = window.localStorage.getItem('nickForSignIn') || "User_" + Math.floor(Math.random()*999);
            const userKey = email.replace('.', ','); // В Firebase нельзя точки в ключах
            
            dbRef.child('users/' + userKey).once('value', s => {
                if(!s.exists()) {
                    dbRef.child('users/' + userKey).set({
                        nick: nick, glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
                    });
                }
                localStorage.setItem('active_session', userKey);
                window.location.href = "/";
            });
        })
        .catch(err => alert('Ошибка ссылки: ' + err.message));
}

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

// --- МОДУЛЬ 1: АВТОРИЗАЦИЯ (ОБНОВЛЕНО НА EMAIL) ---
const AuthModule = {
    open() {
        document.getElementById('m-auth').style.display = 'flex';
        const container = document.getElementById('auth-btn-container');
        container.innerHTML = `<button class="btn-core" style="width:100%;" onclick="AuthModule.sendLink()">Отправить ссылку на почту</button>`;
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    sendLink() {
        const email = document.getElementById('f-email').value.trim();
        const nick = document.getElementById('f-user').value.trim();
        if(!email || !nick) return alert('Заполните Email и Ник!');

        const settings = { url: window.location.href, handleCodeInApp: true };
        auth.sendSignInLinkToEmail(email, settings)
            .then(() => {
                window.localStorage.setItem('emailForSignIn', email);
                window.localStorage.setItem('nickForSignIn', nick);
                alert('Ссылка отправлена! Проверьте почту.');
                this.close();
            })
            .catch(err => alert('Ошибка: ' + err.message));
    },
    logout() {
        localStorage.removeItem('active_session');
        auth.signOut();
        App.user = null;
        App.syncUI();
    }
};

// --- МОДУЛЬ 3: ПРОФИЛЬ ---
const ProfileCore = {
    open() { 
        if(!GlobalUsers[App.user]) return;
        document.getElementById('m-profile').style.display = 'flex'; 
        document.getElementById('new-profile-nick').value = GlobalUsers[App.user].nick || App.user;
        document.getElementById('my-profile-avatar-view').src = GlobalUsers[App.user].avatar || 'https://i.postimg.cc/9Q2g9g6y/user2.png'; 
    },
    close() { document.getElementById('m-profile').style.display = 'none'; },
    upload(event) {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('my-profile-avatar-view').src = e.target.result; };
        reader.readAsDataURL(file);
    },
    saveData() {
        const newNick = document.getElementById('new-profile-nick').value.trim();
        const base64Img = document.getElementById('my-profile-avatar-view').src;
        if(!newNick) return alert('Ник не может быть пустым!');
        firebase.database().ref('users/' + App.user).update({ nick: newNick, avatar: base64Img }).then(() => { this.close(); });
    }
};

// --- МОДУЛЬ 4: АДМИН-ПАНЕЛЬ ---
const AdminPanel = {
    open() {
        const isFounder = (App.user && GlobalUsers[App.user] && (GlobalUsers[App.user].nick === 'Qumestlies_Shawtys' || window.CloudFounders.includes(GlobalUsers[App.user].nick)));
        if(!isFounder && App.user !== 'Qumestlies_Shawtys') return alert('Вы не Создатель!');
        document.getElementById('m-admin').style.display = 'flex';
        this.loadUsersList();
        this.renderFoundersList();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    addFounder() {
        const nick = document.getElementById('add-founder-nick').value.trim();
        if(!nick) return alert('Введите никнейм!');
        if(!window.CloudFounders.includes(nick)) {
            window.CloudFounders.push(nick);
            firebase.database().ref('founders').set(window.CloudFounders).then(() => { this.renderFoundersList(); });
        }
    },
    renderFoundersList() {
        const block = document.getElementById('cloud-founders-list');
        if(!block) return;
        let listHtml = '<b>Облако:</b> ';
        window.CloudFounders.forEach(name => { listHtml += `<span>${name}</span> `; });
        block.innerHTML = listHtml;
    },
    loadUsersList() {
        const sel = document.getElementById('adm-target-user');
        if (!sel) return; sel.innerHTML = '';
        for(let key in GlobalUsers) { sel.innerHTML += `<option value="${key}">${GlobalUsers[key].nick || key}</option>`; }
    },
    save() {
        const target = document.getElementById('adm-target-user').value;
        const glowValue = document.getElementById('adm-set-glow').value;
        const badgeValue = document.getElementById('adm-set-badge').value;
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        firebase.database().ref('users/' + target).update({ glow: glowValue, badge: badgeValue, banned: isBan });
        this.close();
    }
};

// --- МОДУЛЬ СОЗДАНИЯ РАЗДЕЛОВ ---
const NodeManager = {
    open() { document.getElementById('m-create-node').style.display = 'flex'; },
    close() { document.getElementById('m-create-node').style.display = 'none'; },
    submit() {
        const title = document.getElementById('node-new-title').value.trim();
        const path = document.getElementById('node-new-path').value.trim();
        const nodeKey = 'node_' + Date.now();
        firebase.database().ref('nodes/' + nodeKey).set({ title: title, path: path }).then(() => { this.close(); });
    }
};

// --- МОДУЛЬ 5: ДИСПЕТЧЕР ИНТЕРФЕЙСА ---
const App = {
    user: null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,
    
    init() {},
    syncUI() {
        this.renderAuthBar();
        this.renderMenu();
        this.checkAdminButtons();
        this.render();
    },
    renderAuthBar() {
        const bar = document.getElementById('runtime-auth-zone');
        if(!bar) return;
        if(this.user && GlobalUsers[this.user]) {
            const uData = GlobalUsers[this.user];
            bar.innerHTML = `<img class="avatar-mini" src="${uData.avatar}" onclick="ProfileCore.open()"> <span class="${uData.glow}">${uData.nick}</span> <button class="btn-core" onclick="AuthModule.logout()">Выйти</button>`;
        } else {
            bar.innerHTML = `<button class="btn-core" onclick="AuthModule.open()">Войти</button>`;
        }
    },
    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for(let key in GlobalNodes) {
            const activeClass = (this.activeNodeKey === key) ? 'active' : '';
            nav.innerHTML += `<a href="javascript:void(0)" class="nav-link ${activeClass}" onclick="App.route('${key}')">${GlobalNodes[key].title}</a>`;
        }
    },
    checkAdminButtons() {
        const isFounder = (this.user && GlobalUsers[this.user] && (GlobalUsers[this.user].nick === 'Qumestlies_Shawtys' || window.CloudFounders.includes(GlobalUsers[this.user].nick)));
        if (isFounder) {
            if(!document.getElementById('ui-adm-btn')) {
                const btn = document.createElement('button');
                btn.id = 'ui-adm-btn'; btn.className = 'btn-core'; btn.style.width = '100%'; btn.innerHTML = '🛡️ Панель Создателя';
                btn.onclick = () => AdminPanel.open();
                document.getElementById('nodes-navigation-list').appendChild(btn);
            }
        }
    },
    route(nodeKey) { this.activeNodeKey = nodeKey; this.activeThreadId = null; this.render(); this.renderMenu(); },
    render() {
        const view = document.getElementById('render-forum-core');
        const node = GlobalNodes[this.activeNodeKey];
        if(!node) return;
        if(this.activeThreadId) { this.renderThread(view, node); return; }
        
        let html = `<h2>${node.title}</h2><button class="btn-core" onclick="App.openCreateThreadForm()">+ Создать тему</button><hr>`;
        if(node.threads) {
            for(let tid in node.threads) {
                html += `<div class="topic-link" onclick="App.openThread('${tid}')">${node.threads[tid].title}</div>`;
            }
        }
        view.innerHTML = html;
    },
    openThread(id) { this.activeThreadId = id; this.render(); },
    renderThread(view, node) {
        const thread = node.threads[this.activeThreadId];
        let html = `<button class="btn-core" onclick="App.route('${this.activeNodeKey}')">Назад</button><h3>${thread.title}</h3>`;
        if(thread.posts) {
            Object.values(thread.posts).forEach(p => {
                html += `<div class="post-row"><div class="post-author-zone">${p.author}</div><div class="post-text-zone">${p.text}</div></div>`;
            });
        }
        if(this.user) html += `<textarea id="post-reply-text" class="input-field"></textarea><button class="btn-core" onclick="App.sendReply()">Ответить</button>`;
        view.innerHTML = html;
    },
    sendReply() {
        const text = document.getElementById('post-reply-text').value.trim();
        const post = { author: GlobalUsers[this.user].nick, text: text };
        firebase.database().ref('nodes/'+this.activeNodeKey+'/threads/'+this.activeThreadId+'/posts').push(post).then(() => { this.render(); });
    },
    openCreateThreadForm() {
        const view = document.getElementById('render-forum-core');
        view.innerHTML = `<input id="new-t-title" class="input-field" placeholder="Заголовок"><textarea id="new-t-text" class="input-field"></textarea><button class="btn-core" onclick="App.submitThread()">Создать</button>`;
    },
    submitThread() {
        const title = document.getElementById('new-t-title').value;
        const text = document.getElementById('new-t-text').value;
        const tid = 't-' + Date.now();
        firebase.database().ref('nodes/'+this.activeNodeKey+'/threads/'+tid).set({ title: title, creator: GlobalUsers[this.user].nick, posts: { "f": { author: GlobalUsers[this.user].nick, text: text } } }).then(() => { this.activeThreadId = tid; this.render(); });
    }
};

window.onload = () => { App.init(); };
