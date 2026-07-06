// ==========================================================================
// 1. ИНИЦИАЛИЗАЦИЯ И НАСТРОЙКА FIREBASE
// ==========================================================================
const firebaseConfig = {
    databaseURL: "https://aries-forum-default-rtdb.firebaseio.com"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

let GlobalNodes = {};
let GlobalUsers = {};

// ==========================================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ МОДУЛИ ДЛЯ МОДАЛЬНЫХ ОКНОН
// ==========================================================================

const ProfileCore = {
    open() {
        if(!App.user) return;
        const win = document.getElementById('m-profile');
        if(win) win.style.display = 'flex';
        
        const uData = GlobalUsers[App.user] || {};
        const avView = document.getElementById('my-profile-avatar-view');
        const nickInp = document.getElementById('new-profile-nick');
        const urlInp = document.getElementById('new-profile-avatar-url');
        
        if(avView) avView.src = uData.avatar || 'https://i.postimg.cc/9Q2g9g6y/user2.png';
        if(nickInp) nickInp.value = App.user;
        if(urlInp) urlInp.value = uData.avatar || '';
    },
    close() { 
        const win = document.getElementById('m-profile');
        if(win) win.style.display = 'none'; 
    },
    saveData() {
        if(!App.user) return;
        const newAv = document.getElementById('new-profile-avatar-url').value.trim();
        
        firebase.database().ref('users/' + App.user).update({
            avatar: newAv || 'https://i.postimg.cc/9Q2g9g6y/user2.png'
        }).then(() => {
            alert('Аватар успешно обновлен!');
            this.close();
            App.render();
        });
    }
};

const AdminPanel = {
    open() {
        const win = document.getElementById('m-admin');
        if(win) win.style.display = 'flex';
        const select = document.getElementById('adm-target-user');
        if(!select) return;
        select.innerHTML = '';
        
        Object.keys(GlobalUsers).forEach(uName => {
            select.innerHTML += `<option value="${uName}">${uName}</option>`;
        });
    },
    close() { 
        const win = document.getElementById('m-admin');
        if(win) win.style.display = 'none'; 
    },
    save() {
        const uName = document.getElementById('adm-target-user').value;
        const glow = document.getElementById('adm-set-glow').value;
        const badge = document.getElementById('adm-set-badge').value;
        const verify = document.getElementById('adm-set-verify').value;
        const banned = document.getElementById('adm-set-ban').value;
        
        if(!uName) return alert('Пользователь не выбран!');

        firebase.database().ref('users/' + uName).update({
            glow: glow,
            badge: badge,
            verify: verify,
            banned: banned
        }).then(() => {
            alert(`Настройки для игрока ${uName} успешно применены!`);
            this.close();
            App.render();
        }).catch(err => alert('Ошибка сохранения: ' + err.message));
    }
};

const NodeManager = {
    open() { 
        const win = document.getElementById('m-create-node');
        if(win) win.style.display = 'flex'; 
    },
    close() { 
        const win = document.getElementById('m-create-node');
        if(win) win.style.display = 'none'; 
    },
    submit() {
        const title = document.getElementById('node-new-title').value.trim();
        const path = document.getElementById('node-new-path').value.trim() || "Форум / Aries RolePlay";
        
        if(!title) return alert('Введите название раздела!');
        
        const key = 'node-' + Date.now();
        firebase.database().ref('nodes/' + key).set({
            key: key,
            title: title,
            path: path
        }).then(() => {
            this.close();
            document.getElementById('node-new-title').value = '';
            document.getElementById('node-new-path').value = '';
            alert('Раздел успешно создан!');
        }).catch(err => alert('Ошибка: ' + err.message));
    }
};

// ==========================================================================
// 3. ОСНОВНОЕ ЯДРО ДВИЖКА (ОБЪЕКТ APP)
// ==========================================================================
const App = {
    user: null, 
    activeNodeKey: null,
    activeThreadId: null,

    init() {
        const savedUser = localStorage.getItem('forum_session_username');
        if (savedUser) {
            this.user = savedUser;
        }

        this.initAuthZone();

        // Безопасное чтение юзеров
        firebase.database().ref('users').on('value', snap => {
            GlobalUsers = snap.val() || {};
            
            if(this.user && GlobalUsers[this.user] && GlobalUsers[this.user].banned === 'yes') {
                alert('Ваш аккаунт заблокирован на данном форуме!');
                this.logout();
                return;
            }

            this.initAuthZone();
            this.render();
        }, err => { console.error("Ошибка Firebase Users:", err); });

        // Безопасное чтение разделов
        firebase.database().ref('nodes').on('value', snap => {
            GlobalNodes = snap.val() || {};
            this.renderSidebar();
            this.render();
        }, err => { console.error("Ошибка Firebase Nodes:", err); });
    },

    initAuthZone() {
        const zone = document.getElementById('runtime-auth-zone');
        if (!zone) return;

        if (this.user) {
            const uData = GlobalUsers[this.user] || { glow: 'glow-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            zone.innerHTML = `
                <span class="${uData.glow || 'glow-user'}" style="cursor:pointer; font-weight:600; margin-right:10px;" onclick="ProfileCore.open()">${this.user}</span>
                <img src="${uData.avatar || 'https://i.postimg.cc/9Q2g9g6y/user2.png'}" onclick="ProfileCore.open()" style="width:32px; height:32px; border-radius:50%; margin-right:10px; cursor:pointer; vertical-align:middle; object-fit:cover;">
                <button class="btn-core" style="background:#222; padding:6px 12px; font-size:11px;" onclick="App.logout()">Выйти</button>
            `;
            window.user = { username: this.user, id: this.user === 'Qumestlies_Shawtys' ? "5694374929" : "0" };
        } else {
            zone.innerHTML = `<button class="btn-core" onclick="document.getElementById('m-auth').style.display='flex'">Войти</button>`;
            window.user = null;
        }
    },

    login() {
        const u = document.getElementById('auth-username').value.trim();
        const p = document.getElementById('auth-password').value.trim();
        if(!u || !p) return alert('Заполните все поля!');
        
        firebase.database().ref('users/' + u).once('value', snap => {
            if(!snap.exists()) return alert('Пользователь не найден!');
            const userData = snap.val();
            
            if(userData.banned === 'yes') return alert('Этот аккаунт заблокирован!');
            if(userData.password !== p) return alert('Неверный пароль!');
            
            this.user = userData.username;
            localStorage.setItem('forum_session_username', userData.username);
            document.getElementById('m-auth').style.display = 'none';
            this.initAuthZone();
            this.render();
        });
    },

    register() {
        const u = document.getElementById('auth-username').value.trim();
        const p = document.getElementById('auth-password').value.trim();
        if(!u || !p) return alert('Заполните все поля!');
        
        firebase.database().ref('users/' + u).once('value', snap => {
            if(snap.exists()) return alert('Этот ник уже занят!');
            
            const uid = 'user-' + Date.now();
            const newUser = {
                id: uid,
                username: u,
                password: p,
                glow: 'glow-user',
                badge: 'badge-user',
                verify: 'none',
                banned: 'no',
                avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
            };
            
            firebase.database().ref('users/' + u).set(newUser).then(() => {
                alert('Регистрация успешна!');
                this.user = u;
                localStorage.setItem('forum_session_username', u);
                document.getElementById('m-auth').style.display = 'none';
                this.initAuthZone();
                this.render();
            });
        });
    },

    logout() {
        localStorage.removeItem('forum_session_username');
        this.user = null;
        window.user = null;
        this.initAuthZone();
        this.render();
    },

    renderSidebar() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация разделов</div>`;

        Object.keys(GlobalNodes).forEach(key => {
            const activeClass = this.activeNodeKey === key ? 'active' : '';
            nav.innerHTML += `<a href="#" class="nav-link ${activeClass}" onclick="App.route('${key}')">${GlobalNodes[key].title}</a>`;
        });
    },

    checkAdminButtons() {
        let list = [];
        try { list = JSON.parse(localStorage.getItem('forced_nicks') || '[]'); } catch(e){}
        const isMaster = (this.user === 'Qumestlies_Shawtys' || list.includes(this.user));
        
        const pBtn = document.getElementById('founder-panel-btn');
        const nBtn = document.getElementById('founder-node-btn');
        
        if(pBtn) pBtn.style.display = isMaster ? 'block' : 'none';
        if(nBtn) nBtn.style.display = isMaster ? 'block' : 'none';
    },

    route(nodeKey) {
        this.activeNodeKey = nodeKey;
        this.activeThreadId = null;
        this.render();
    },

    render() {
        const view = document.getElementById('render-forum-core');
        if (!view) return;
        
        this.checkAdminButtons();

        const node = GlobalNodes[this.activeNodeKey];
        if(!node) {
            view.innerHTML = `<p style="color:#444; text-align:center; padding:40px 0;">Выберите интересующий раздел в левом меню навигации.</p>`;
            return;
        }
        
        if(this.activeThreadId) { this.renderThread(view, node); return; }
        
        let html = `
            <div style="font-size:11px; color:#555; text-transform:uppercase; margin-bottom:5px; font-weight:bold;">${node.path || 'Форум'}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; border-bottom:1px solid var(--border-color); padding-bottom:15px; flex-wrap:wrap; gap:10px;">
                <h2 style="margin:0; font-size:22px; font-weight:800; color:#fff;">${node.title}</h2>
                <button class="btn-core" onclick="App.openCreateThreadForm()">+ Создать тему</button>
            </div>
        `;
        
        if(!node.threads) {
            html += `<p style="color:#444; text-align:center; padding:40px 0;">Обсуждения отсутствуют. Будьте первым!</p>`;
        } else {
            Object.keys(node.threads).forEach(tId => {
                const t = node.threads[tId];
                html += `
                    <div style="background:#09090f; padding:18px; border:1px solid var(--border-color); border-radius:5px; margin-bottom:12px; cursor:pointer;" onclick="App.openThread('${t.id}')">
                        <div style="font-weight:bold; font-size:16px; color:#fff;">${t.title}</div>
                        <div style="font-size:11px; color:#444; margin-top:6px;">Автор темы: <span style="color:#aaa;">${t.creator}</span></div>
                    </div>
                `;
            });
        }
        view.innerHTML = html;
    },

    openThread(id) { this.activeThreadId = id; this.render(); },

    renderThread(view, node) {
        if(!node.threads || !node.threads[this.activeThreadId]) return;
        const thread = node.threads[this.activeThreadId];
        let html = `<button class="btn-core" style="background:#1c1c30; margin-bottom:20px; padding:6px 14px; font-size:11px;" onclick="App.route('${this.activeNodeKey}')">↩ Назад в раздел</button>
                    <h2 style="color:#fff; margin-bottom:25px; font-size:20px; font-weight:800;">${thread.title}</h2>`;
        
        if(thread.posts) {
            const postsArray = Array.isArray(thread.posts) ? thread.posts : Object.values(thread.posts);
            postsArray.forEach(p => {
                const u = GlobalUsers[p.author] || { glow: 'glow-user', badge: 'badge-user', verify: 'none', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
                
                let vHtml = '';
                if(u.verify && u.verify !== 'none') {
                    vHtml = `<span class="verified-badge ${u.verify}"></span>`;
                }

                html += `
                    <div class="post-row">
                        <div class="post-author-zone">
                            <img class="avatar-round" src="${u.avatar || 'https://i.postimg.cc/9Q2g9g6y/user2.png'}">
                            <div style="margin-top:12px;"><span class="${u.glow || 'glow-user'}" style="font-size:14px;">${p.author}${vHtml}</span></div>
                            <div class="badge-role ${u.badge || 'badge-user'}">${String(u.badge || 'badge-user').replace('badge-', '').toUpperCase()}</div>
                        </div>
                        <div class="post-text-zone">${p.text}</div>
                    </div>
                `;
            });
        }
        
        if(this.user) {
            html += `
                <div style="margin-top:25px; background:#08080d; padding:20px; border-radius:5px; border:1px solid var(--border-color);">
                    <textarea class="input-field" id="post-reply-text" rows="4" placeholder="Напишите ответ в тему..."></textarea>
                    <button class="btn-core" onclick="App.sendReply()">Отправить ответ</button>
                </div>
            `;
        }
        view.innerHTML = html;
    },

    sendReply() {
        const text = document.getElementById('post-reply-text').value.trim();
        if(!text) return;
        
        const newPost = { author: this.user, text: text };
        firebase.database().ref('nodes/' + this.activeNodeKey + '/threads/' + this.activeThreadId + '/posts').push(newPost)
        .then(() => {
            const replyBox = document.getElementById('post-reply-text');
            if(replyBox) replyBox.value = '';
        });
    },

    openCreateThreadForm() {
        if(!this.user) return alert('Авторизуйтесь на портале!');
        const view = document.getElementById('render-forum-core');
        view.innerHTML = `
            <h2 style="color:#fff; font-weight:800; margin-bottom:20px;">Создание новой темы</h2>
            <input class="input-field" id="new-t-title" placeholder="Введите заголовок">
            <textarea class="input-field" id="new-t-text" rows="6" placeholder="Введите текст сообщения..."></textarea>
            <div style="display:flex; gap:10px;">
                <button class="btn-core" onclick="App.submitThread()">Опубликовать тему</button>
                <button class="btn-core" style="background:#222;" onclick="App.render()">Отмена</button>
            </div>
        `;
    },

    submitThread() {
        const title = document.getElementById('new-t-title').value.trim();
        const text = document.getElementById('new-t-text').value.trim();
        if(!title || !text) return alert('Заполните формы!');
        
        const id = 'thread-' + Date.now();
        const newThread = {
            id: id,
            title: title,
            creator: this.user,
            posts: {
                "first": { author: this.user, text: text }
            }
        };
        
        firebase.database().ref('nodes/' + this.activeNodeKey + '/threads/' + id).set(newThread).then(() => {
            this.activeThreadId = id;
            this.render();
        });
    }
};

window.onload = () => { App.init(); };
