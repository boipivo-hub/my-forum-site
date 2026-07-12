// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v9.9 (STABLE FULL VERSION)
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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const dbRef = firebase.database().ref();
const auth = firebase.auth();

let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = [];

// --- ЛОГИКА ВХОДА ПО ССЫЛКЕ ---
if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) email = window.prompt('Введите ваш Email для подтверждения:');
    
    auth.signInWithEmailLink(email, window.location.href)
        .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            const nick = window.localStorage.getItem('nickForSignIn') || "User_" + Math.floor(Math.random()*999);
            const userKey = email.replace(/\./g, ','); // Ключ для БД (Firebase не любит точки)
            
            dbRef.child('users/' + userKey).once('value', snap => {
                if(!snap.exists()) {
                    dbRef.child('users/' + userKey).set({
                        nick: nick, 
                        glow: 'glow-user', 
                        badge: 'badge-user', 
                        verify: 'none', 
                        banned: false, 
                        avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
                    });
                }
                localStorage.setItem('active_session', userKey);
                window.location.href = "/"; // Редирект на чистый URL
            });
        })
        .catch(err => alert('Ошибка входа: ' + err.message));
}

// ОСНОВНОЙ СИНХРОНИЗАТОР ДАННЫХ
dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    window.CloudFounders = data.founders || [];
    
    // Инициализация стандартных узлов, если пусто
    if (!data.nodes) {
        firebase.database().ref('nodes/dev_news').set({
            title: '📢 Технические обновления',
            path: 'Официально / Разработка',
            threads: {
                't-1': { id: 't-1', title: 'Добро пожаловать!', creator: 'System', posts: { "f": { author: 'System', text: 'Форум запущен на Cloud Engine v9.9' } } }
            }
        });
    }

    if (isFirstLoad) {
        const saved = localStorage.getItem('active_session');
        if (saved && GlobalUsers[saved] && !GlobalUsers[saved].banned) {
            App.user = saved;
        } else { 
            localStorage.removeItem('active_session'); 
            App.user = null; 
        }
        isFirstLoad = false;
    }
    App.syncUI();
});

// --- МОДУЛЬ 1: АВТОРИЗАЦИЯ (БЕЗ ПАРОЛЕЙ - ПОЧТА) ---
const AuthModule = {
    open() {
        const modal = document.getElementById('m-auth');
        if (!modal) return;
        modal.style.display = 'flex';
        document.getElementById('auth-title').innerText = "Вход / Регистрация";
        document.getElementById('auth-btn-container').innerHTML = `
            <button class="btn-core" style="width:100%;" onclick="AuthModule.sendLink()">Отправить ссылку на почту</button>
        `;
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    sendLink() {
        const email = document.getElementById('f-email').value.trim();
        const nick = document.getElementById('f-nick').value.trim();
        if(!email || !nick) return alert('Введите почту и желаемый ник!');
        
        auth.sendSignInLinkToEmail(email, { url: window.location.href, handleCodeInApp: true })
            .then(() => {
                window.localStorage.setItem('emailForSignIn', email);
                window.localStorage.setItem('nickForSignIn', nick);
                alert('Проверьте почту! Ссылка для входа отправлена.');
                this.close();
            })
            .catch(err => alert('Ошибка: ' + err.message));
    },
    logout() {
        auth.signOut();
        localStorage.removeItem('active_session');
        App.user = null;
        App.syncUI();
    }
};

// --- МОДУЛЬ 2: ПРОФИЛЬ ---
const ProfileCore = {
    open() { 
        if(!App.user || !GlobalUsers[App.user]) return;
        document.getElementById('m-profile').style.display = 'flex'; 
        document.getElementById('new-profile-nick').value = GlobalUsers[App.user].nick;
        document.getElementById('my-profile-avatar-view').src = GlobalUsers[App.user].avatar || 'https://i.postimg.cc/9Q2g9g6y/user2.png'; 
    },
    close() { document.getElementById('m-profile').style.display = 'none'; },
    upload(event) {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = e => document.getElementById('my-profile-avatar-view').src = e.target.result;
        reader.readAsDataURL(file);
    },
    saveData() {
        const newNick = document.getElementById('new-profile-nick').value.trim();
        const avatar = document.getElementById('my-profile-avatar-view').src;
        if(!newNick) return alert('Ник не может быть пустым!');
        
        firebase.database().ref('users/' + App.user).update({
            nick: newNick,
            avatar: avatar
        }).then(() => this.close());
    }
};

// --- МОДУЛЬ 3: АДМИН-ПАНЕЛЬ ---
const AdminPanel = {
    open() {
        const u = GlobalUsers[App.user];
        if(!u || (u.nick !== 'Qumestlies_Shawtys' && !window.CloudFounders.includes(u.nick))) return alert('Нет доступа!');
        document.getElementById('m-admin').style.display = 'flex';
        this.loadUsersList();
        this.renderFoundersList();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    addFounder() {
        const nick = document.getElementById('add-founder-nick').value.trim();
        if(!nick) return;
        if(!window.CloudFounders.includes(nick)) {
            window.CloudFounders.push(nick);
            firebase.database().ref('founders').set(window.CloudFounders).then(() => this.renderFoundersList());
        }
    },
    removeFounder(nick) {
        window.CloudFounders = window.CloudFounders.filter(n => n !== nick);
        firebase.database().ref('founders').set(window.CloudFounders).then(() => this.renderFoundersList());
    },
    renderFoundersList() {
        const block = document.getElementById('cloud-founders-list');
        let html = '<b>Основатели:</b><br>';
        window.CloudFounders.forEach(n => html += `<span style="color:red; cursor:pointer;" onclick="AdminPanel.removeFounder('${n}')">${n}</span> `);
        block.innerHTML = html;
    },
    loadUsersList() {
        const sel = document.getElementById('adm-target-user');
        sel.innerHTML = '';
        for(let key in GlobalUsers) sel.innerHTML += `<option value="${key}">${GlobalUsers[key].nick}</option>`;
    },
    save() {
        const target = document.getElementById('adm-target-user').value;
        const glow = document.getElementById('adm-set-glow').value;
        const badge = document.getElementById('adm-set-badge').value;
        const verify = document.getElementById('adm-set-verify').value;
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        
        firebase.database().ref('users/' + target).update({
            glow: isBan ? 'glow-banned' : glow,
            badge: isBan ? 'badge-banned' : badge,
            verify: isBan ? 'none' : verify,
            banned: isBan
        });
        this.close();
    }
};

// --- МОДУЛЬ СОЗДАНИЯ РАЗДЕЛОВ ---
const NodeManager = {
    open() { document.getElementById('m-create-node').style.display = 'flex'; },
    close() { document.getElementById('m-create-node').style.display = 'none'; },
    submit() {
        const t = document.getElementById('node-new-title').value.trim();
        const p = document.getElementById('node-new-path').value.trim();
        if(!t || !p) return;
        const key = 'node_' + Date.now();
        firebase.database().ref('nodes/' + key).set({ title: t, path: p }).then(() => this.close());
    }
};

// --- МОДУЛЬ 4: ДИСПЕТЧЕР (ГЛАВНЫЙ КОНТРОЛЛЕР) ---
const App = {
    user: null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,

    syncUI() {
        this.renderAuthBar();
        this.renderMenu();
        this.checkAdminButtons();
        this.render();
    },
    renderAuthBar() {
        const bar = document.getElementById('runtime-auth-zone');
        if(this.user && GlobalUsers[this.user]) {
            const u = GlobalUsers[this.user];
            let v = (u.verify && u.verify !== 'none') ? `<span class="verified-badge ${u.verify}"></span>` : '';
            bar.innerHTML = `
                <img class="avatar-mini" src="${u.avatar}" onclick="ProfileCore.open()"> 
                <span class="${u.glow}" style="font-weight:bold; cursor:pointer;" onclick="ProfileCore.open()">${u.nick}${v}</span> 
                <button class="btn-core" style="padding:5px; font-size:10px; margin-left:10px;" onclick="AuthModule.logout()">Выйти</button>
            `;
        } else {
            bar.innerHTML = `<button class="btn-core" onclick="AuthModule.open()">Войти</button>`;
        }
    },
    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        if(!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for(let key in GlobalNodes) {
            const active = (this.activeNodeKey === key) ? 'active' : '';
            nav.innerHTML += `<a href="javascript:void(0)" class="nav-link ${active}" onclick="App.route('${key}')">${GlobalNodes[key].title}</a>`;
        }
    },
    checkAdminButtons() {
        const u = GlobalUsers[this.user];
        const isAdm = u && (u.nick === 'Qumestlies_Shawtys' || window.CloudFounders.includes(u.nick));
        if (isAdm) {
            if(!document.getElementById('ui-adm-btn')) {
                const nav = document.getElementById('nodes-navigation-list');
                const btn = document.createElement('button');
                btn.id = 'ui-adm-btn'; btn.className = 'btn-core'; btn.style.width = '100%'; btn.style.marginTop = '15px';
                btn.style.background = 'linear-gradient(135deg, #ff0055, #8a2387)';
                btn.innerHTML = '🛡️ Админ Панель'; btn.onclick = () => AdminPanel.open();
                nav.appendChild(btn);
                
                const btnNode = document.createElement('button');
                btnNode.id = 'ui-node-btn'; btnNode.className = 'btn-core'; btnNode.style.width = '100%'; btnNode.style.marginTop = '5px';
                btnNode.innerHTML = '➕ Создать раздел'; btnNode.onclick = () => NodeManager.open();
                nav.appendChild(btnNode);
            }
        }
    },
    route(key) { this.activeNodeKey = key; this.activeThreadId = null; this.render(); this.renderMenu(); },
    render() {
        const view = document.getElementById('render-forum-core');
        const node = GlobalNodes[this.activeNodeKey];
        if(!node) return;
        if(this.activeThreadId) { this.renderThread(view, node); return; }
        
        let html = `<div class="node-path">${node.path}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h2>${node.title}</h2>
                        <button class="btn-core" onclick="App.openCreateThreadForm()">+ Создать тему</button>
                    </div><hr style="border:0; border-top:1px solid #1c1c30; margin:20px 0;">`;
        
        if(node.threads) {
            for(let tid in node.threads) {
                const t = node.threads[tid];
                html += `<div class="topic-link" onclick="App.openThread('${tid}')">
                            <div style="font-weight:bold;">${t.title}</div>
                            <div style="font-size:10px; color:#555;">Автор: ${t.creator}</div>
                         </div>`;
            }
        } else {
            html += `<p style="text-align:center; color:#333;">Тем пока нет.</p>`;
        }
        view.innerHTML = html;
    },
    openThread(id) { this.activeThreadId = id; this.render(); },
    renderThread(view, node) {
        const thread = node.threads[this.activeThreadId];
        let html = `<button class="btn-core" style="background:#222; margin-bottom:15px;" onclick="App.route('${this.activeNodeKey}')">Назад</button>
                    <h3>${thread.title}</h3>`;
        
        if(thread.posts) {
            Object.values(thread.posts).forEach(p => {
                // Поиск данных автора по нику
                let u = { glow: 'glow-user', badge: 'badge-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png', verify: 'none' };
                for(let k in GlobalUsers) { if(GlobalUsers[k].nick === p.author) u = GlobalUsers[k]; }
                
                let v = (u.verify && u.verify !== 'none') ? `<span class="verified-badge ${u.verify}"></span>` : '';
                
                html += `<div class="post-row">
                            <div class="post-author-zone">
                                <img src="${u.avatar}" class="avatar-round">
                                <div class="${u.glow}" style="font-weight:bold; font-size:13px;">${p.author}${v}</div>
                                <div class="badge-role ${u.badge}">${(u.badge || 'user').replace('badge-', '').toUpperCase()}</div>
                            </div>
                            <div class="post-text-zone">${p.text}</div>
                         </div>`;
            });
        }
        
        if(this.user) {
            html += `<div style="margin-top:20px;">
                        <textarea id="reply-text" class="input-field" placeholder="Ваш ответ..."></textarea>
                        <button class="btn-core" onclick="App.sendReply()">Ответить</button>
                     </div>`;
        }
        view.innerHTML = html;
    },
    sendReply() {
        const text = document.getElementById('reply-text').value.trim();
        if(!text) return;
        const post = { author: GlobalUsers[this.user].nick, text: text };
        firebase.database().ref(`nodes/${this.activeNodeKey}/threads/${this.activeThreadId}/posts`).push(post).then(() => {
            document.getElementById('reply-text').value = '';
        });
    },
    openCreateThreadForm() {
        if(!this.user) return alert('Нужно войти!');
        const view = document.getElementById('render-forum-core');
        view.innerHTML = `
            <h2>Создание темы</h2>
            <input id="t-title" class="input-field" placeholder="Заголовок темы">
            <textarea id="t-text" class="input-field" rows="5" placeholder="Текст темы..."></textarea>
            <button class="btn-core" onclick="App.submitThread()">Опубликовать</button>
            <button class="btn-core" style="background:#222;" onclick="App.render()">Отмена</button>
        `;
    },
    submitThread() {
        const title = document.getElementById('t-title').value.trim();
        const text = document.getElementById('t-text').value.trim();
        if(!title || !text) return alert('Заполните поля!');
        
        const tid = 't-' + Date.now();
        const nick = GlobalUsers[this.user].nick;
        firebase.database().ref(`nodes/${this.activeNodeKey}/threads/${tid}`).set({
            id: tid,
            title: title,
            creator: nick,
            posts: { "first": { author: nick, text: text } }
        }).then(() => { 
            this.activeThreadId = tid; 
            this.render(); 
        });
    }
};

window.onload = () => App.syncUI();
