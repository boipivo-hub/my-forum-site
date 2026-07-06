// ==========================================================================
// 1. ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ И FIREBASE
// ==========================================================================
const firebaseConfig = {
    databaseURL: "https://aries-forum-default-rtdb.firebaseio.com" // Твоя URL базы данных Firebase
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Глобальные хранилища данных, которые используются в твоем рендере
let GlobalNodes = {};
let GlobalUsers = {};

// ==========================================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ МОДУЛИ (АВТОРЫ, РАЗДЕЛЫ, АДМИНКА)
// ==========================================================================

// Модуль Авторизации
const AuthModule = {
    open() { 
        const win = document.getElementById('m-auth');
        if(win) win.style.display = 'flex'; 
    },
    close() { 
        const win = document.getElementById('m-auth');
        if(win) win.style.display = 'none'; 
    },
    submitLogin() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        if(!u || !p) return alert('Заполните все поля!');
        
        firebase.database().ref('users').orderByChild('username').equalTo(u).once('value', snap => {
            if(!snap.exists()) return alert('Пользователь не найден!');
            let userData = null;
            snap.forEach(child => { userData = child.val(); });
            
            if(userData.password !== p) return alert('Неверный пароль!');
            App.user = userData.username; // Записываем ник строкой, как требует твой движок
            localStorage.setItem('forum_session_username', userData.username);
            this.close();
            App.initAuthZone();
            App.render();
        });
    },
    submitRegister() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        if(!u || !p) return alert('Заполните все поля!');
        
        const uid = 'user-' + Date.now();
        const newUser = {
            id: uid,
            uid: uid,
            username: u,
            password: p,
            glow: 'glow-user',
            badge: 'badge-user',
            verify: 'none',
            avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
        };
        
        firebase.database().ref('users/' + u).set(newUser).then(() => {
            alert('Регистрация успешна!');
            App.user = u;
            localStorage.setItem('forum_session_username', u);
            this.close();
            App.initAuthZone();
            App.render();
        });
    }
};

// Модуль Настройки Профиля
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
        const newNick = document.getElementById('new-profile-nick').value.trim();
        const newAv = document.getElementById('new-profile-avatar-url').value.trim();
        if(!newNick) return alert('Никнейм не может быть пустым!');
        
        firebase.database().ref('users/' + App.user).update({
            avatar: newAv || 'https://i.postimg.cc/9Q2g9g6y/user2.png'
        }).then(() => {
            alert('Данные изменены!');
            this.close();
            App.render();
        });
    }
};

// Панель Управления Создателя
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
        
        firebase.database().ref('users/' + uName).update({
            glow: glow,
            badge: badge,
            verify: verify
        }).then(() => {
            alert('Настройки аккаунта обновлены!');
            this.close();
            App.render();
        });
    }
};

// Управление Разделами
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
        if(!title) return alert('Введите название!');
        
        const key = 'node-' + Date.now();
        firebase.database().ref('nodes/' + key).set({
            key: key,
            title: title,
            path: "Форум / Aries RolePlay",
            threads: {}
        }).then(() => {
            this.close();
            document.getElementById('node-new-title').value = '';
        });
    }
};

// ==========================================================================
// 3. ЯДРО ПРИЛОЖЕНИЯ (ОБЪЕКТ APP) — ПОЛНЫЙ ВАРИАНТ С ТВОИМ РЕНДЕРОМ
// ==========================================================================
const App = {
    user: null, // Имя текущего пользователя (строка)
    activeNodeKey: null,
    activeThreadId: null,

    init() {
        // Восстанавливаем авторизацию из памяти
        const savedUser = localStorage.getItem('forum_session_username');
        if (savedUser) {
            this.user = savedUser;
        }

        this.initAuthZone();

        // Слушаем пользователей базы данных
        firebase.database().ref('users').on('value', snap => {
            GlobalUsers = snap.val() || {};
            this.render();
        });

        // Слушаем разделы базы данных
        firebase.database().ref('nodes').on('value', snap => {
            GlobalNodes = snap.val() || {};
            this.renderSidebar();
            this.render();
        });
    },

    initAuthZone() {
        const zone = document.getElementById('runtime-auth-zone');
        if (!zone) return;

        if (this.user) {
            const uData = GlobalUsers[this.user] || { glow: 'glow-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            zone.innerHTML = `
                <span class="${uData.glow}" style="cursor:pointer; font-weight:600;" onclick="ProfileCore.open()">${this.user}</span>
                <img class="avatar-mini" src="${uData.avatar}" onclick="ProfileCore.open()" style="width:32px; height:32px; border-radius:50%; margin-left:5px; vertical-align:middle;">
                <button class="btn-core" style="background:#222; padding:6px 12px; font-size:11px; margin-left:8px;" onclick="App.logout()">Выйти</button>
            `;
        } else {
            zone.innerHTML = `<button class="btn-core" onclick="AuthModule.open()">Войти на портал</button>`;
        }
    },

    logout() {
        localStorage.removeItem('forum_session_username');
        this.user = null;
        this.initAuthZone();
        this.render();
    },

    renderSidebar() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация разделов</div>`;

        for (let key in GlobalNodes) {
            const activeClass = this.activeNodeKey === key ? 'active' : '';
            nav.innerHTML += `<a href="#" class="nav-link ${activeClass}" onclick="App.route('${key}')">${GlobalNodes[key].title}</a>`;
        }
    },

    checkAdminButtons() {
        const existingAdmBtn = document.getElementById('ui-adm-btn');
        const existingNodeBtn = document.getElementById('ui-node-btn');
        
        // Достаем кастомный список разрешенных ников (вайтлист твоего друга)
        let allowedNicks = [];
        try {
            allowedNicks = JSON.parse(localStorage.getItem('forced_nicks') || '[]');
        } catch(e) { allowedNicks = []; }

        const currentNick = typeof this.user === 'string' ? this.user : '';
        
        // Если зашел ты ИЛИ твой друг из вайтлиста панелей
        if (currentNick === 'Qumestlies_Shawtys' || (currentNick && allowedNicks.includes(currentNick))) {
            const navMenu = document.getElementById('nodes-navigation-list');
            if (navMenu) {
                if (!existingAdmBtn) {
                    const btn = document.createElement('button');
                    btn.id = 'ui-adm-btn'; btn.className = 'btn-core'; btn.style.width = '100%'; btn.style.marginTop = '20px';
                    btn.style.background = 'linear-gradient(135deg, #ff0055, #8a2387)';
                    btn.innerHTML = '🛡️ Панель Создателя';
                    btn.onclick = () => AdminPanel.open();
                    navMenu.appendChild(btn);
                }
                if (!existingNodeBtn) {
                    const btnNode = document.createElement('button');
                    btnNode.id = 'ui-node-btn'; btnNode.className = 'btn-core'; btnNode.style.width = '100%'; btnNode.style.marginTop = '8px';
                    btnNode.style.background = '#1c1c30'; btnNode.style.border = '1px solid #2c2c42';
                    btnNode.innerHTML = '➕ Создать раздел';
                    btnNode.onclick = () => NodeManager.open();
                    navMenu.appendChild(btnNode);
                }
            }
        } else {
            if (existingAdmBtn) existingAdmBtn.remove();
            if (existingNodeBtn) existingNodeBtn.remove();
        }
    },

    route(nodeKey) {
        this.activeNodeKey = nodeKey;
        this.activeThreadId = null;
        this.render();
    },

    render() {
        this.checkAdminButtons();

        const view = document.getElementById('render-forum-core');
        if (!view) return;
        const node = GlobalNodes[this.activeNodeKey];
        if(!node) {
            view.innerHTML = `<h2 style="color:#fff; font-weight:300;">Добро пожаловать на Aries Role Play<br><span style="font-size:14px; color:#555;">Выберите интересующий раздел в левом меню навигации.</span></h2>`;
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
            html += `<p style="color:#444; text-align:center; padding:40px 0;">Обсуждения отсутствуют.</p>`;
        } else {
            for(let tId in node.threads) {
                const t = node.threads[tId];
                html += `
                    <div style="background:#09090f; padding:18px; border:1px solid var(--border-color); border-radius:5px; margin-bottom:12px; cursor:pointer;" onclick="App.openThread('${t.id}')">
                        <div style="font-weight:bold; font-size:16px; color:#fff;">${t.title}</div>
                        <div style="font-size:11px; color:#444; margin-top:6px;">Автор: <span style="color:#aaa;">${t.creator}</span></div>
                    </div>
                `;
            }
        }
        view.innerHTML = html;
    },

    openThread(id) { this.activeThreadId = id; this.render(); },

    renderThread(view, node) {
        if(!node.threads || !node.threads[this.activeThreadId]) return;
        const thread = node.threads[this.activeThreadId];
        let html = `<button class="btn-core" style="background:#1c1c30; margin-bottom:20px; padding:6px 14px; font-size:11px;" onclick="App.route('${this.activeNodeKey}')">↩ Назад</button>
                    <h2 style="color:#fff; margin-bottom:25px; font-size:20px; font-weight:800;">${thread.title}</h2>`;
        
        if(thread.posts) {
            const postsArray = Array.isArray(thread.posts) ? thread.posts : Object.values(thread.posts);
            postsArray.forEach(p => {
                const u = GlobalUsers[p.author] || { glow: 'glow-user', badge: 'badge-user', verify: 'none', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
                
                let verifyBadge = '';
                if(u.verify && u.verify !== 'none') {
                    verifyBadge = `<span class="verified-badge ${u.verify}"></span>`;
                }

                html += `
                    <div class="post-row">
                        <div class="post-author-zone">
                            <img class="avatar-round" src="${u.avatar}" style="width:70px; height:70px; border-radius:50%; object-fit:cover;">
                            <div style="margin-top:12px;"><span class="${u.glow}" style="font-size:14px;">${p.author}${verifyBadge}</span></div>
                            <div class="badge-role ${u.badge}">${(u.badge || 'badge-user').replace('badge-', '').toUpperCase()}</div>
                        </div>
                        <div class="post-text-zone">${p.text}</div>
                    </div>
                `;
            });
        }
        
        if(this.user) {
            html += `
                <div style="margin-top:25px; background:#08080d; padding:20px; border-radius:5px; border:1px solid var(--border-color);">
                    <textarea class="input-field" id="post-reply-text" rows="4" placeholder="Напишите ответ..."></textarea>
                    <button class="btn-core" onclick="App.sendReply()">Отправить ответ</button>
                </div>
            `;
        }
        view.innerHTML = html;
    },

    sendReply() {
        const text = document.getElementById('post-reply-text').value.trim();
        if(!text) return;
        
        const authorName = typeof this.user === 'string' ? this.user : 'Пользователь';
        const newPost = { author: authorName, text: text };
        
        firebase.database().ref('nodes/' + this.activeNodeKey + '/threads/' + this.activeThreadId + '/posts').push(newPost)
        .then(() => {
            const area = document.getElementById('post-reply-text');
            if(area) area.value = '';
        });
    },

    openCreateThreadForm() {
        if(!this.user) return alert('Авторизуйтесь на портале!');
        const view = document.getElementById('render-forum-core');
        if(!view) return;
        view.innerHTML = `
            <h2 style="color:#fff; font-weight:800; margin-bottom:20px;">Создание новой темы</h2>
            <input class="input-field" id="new-t-title" placeholder="Введите заголовок">
            <textarea class="input-field" id="new-t-text" rows="6" placeholder="Введите текст..."></textarea>
            <div style="display:flex; gap:10px;">
                <button class="btn-core" onclick="App.submitThread()">Опубликовать</button>
                <button class="btn-core" style="background:#222;" onclick="App.render()">Отмена</button>
            </div>
        `;
    },

    submitThread() {
        const title = document.getElementById('new-t-title').value.trim();
        const text = document.getElementById('new-t-text').value.trim();
        if(!title || !text) return alert('Заполните формы!');
        
        const id = 'thread-' + Date.now();
        const authorName = typeof this.user === 'string' ? this.user : 'Пользователь';
        
        const newThread = {
            id: id,
            title: title,
            creator: authorName,
            posts: {
                "first": { author: authorName, text: text }
            }
        };
        
        firebase.database().ref('nodes/' + this.activeNodeKey + '/threads/' + id).set(newThread).then(() => {
            this.activeThreadId = id;
            this.render();
        });
    }
};

// ==========================================================================
// 4. ТОЧКА ВХОДА И ФОНОВЫЕ СЕРВИСЫ
// ==========================================================================
window.onload = () => { 
    App.init(); 
    
    // Каждую секунду проверяем статус админ-панелей и кнопок на экране
    setInterval(() => { 
        App.checkAdminButtons(); 
    }, 1000);
};
