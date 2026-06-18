// ==========================================================================
// ARIES ROLE PLAY - SUPREME FOUNDER SPA ENGINE v7.0
// ==========================================================================

// --- МОДУЛЬ 1: СИСТЕМА УЧЕТНЫХ ЗАПИСЕЙ ---
const AuthModule = {
    init() {
        let checkDb = localStorage.getItem('user_registry');
        
        // Пересоздаем базу, если пароль старый или база повреждена
        if (!checkDb || !checkDb.includes('sxdqamigosxdqs')) {
            localStorage.removeItem('user_registry');
            localStorage.removeItem('active_session');
        }

        if (!localStorage.getItem('user_registry')) {
            const defaults = {
                // Создаем аккаунт Создателя с твоим точным секретным паролем
                'Qumestlies_Shawtys': { 
                    password: 'sxdqamigosxdqs', 
                    glow: 'glow-founder', 
                    badge: 'badge-founder', 
                    banned: false, 
                    avatar: 'https://i.postimg.cc/mDCHYg8g/aries.png' 
                },
                'Tony_Stark': { password: '123', glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' }
            };
            localStorage.setItem('user_registry', JSON.stringify(defaults));
        }
        // Автоматический вход полностью вырезан во избежание передачи сессии друзьям
    },
    getRegistry() { return JSON.parse(localStorage.getItem('user_registry') || '{}'); },
    saveRegistry(data) { localStorage.setItem('user_registry', JSON.stringify(data)); },
    
    open(isReg = false) {
        const modal = document.getElementById('m-auth');
        if (!modal) return;
        modal.style.display = 'flex';
        const container = document.getElementById('auth-btn-container');
        
        if(isReg) {
            document.getElementById('auth-title').innerText = "Регистрация";
            container.innerHTML = `<button class="btn-core" style="width:100%;" onclick="AuthModule.executeRegister()">Зарегистрироваться</button>
            <p style="font-size:12px; text-align:center; color:#555; margin-top:10px; cursor:pointer;" onclick="AuthModule.open(false)">Уже есть аккаунт? Войти</p>`;
        } else {
            document.getElementById('auth-title').innerText = "Вход на форум";
            container.innerHTML = `<button class="btn-core" style="width:100%;" onclick="AuthModule.executeLogin()">Выполнить вход</button>
            <p style="font-size:12px; text-align:center; color:#555; margin-top:10px; cursor:pointer;" onclick="AuthModule.open(true)">Нет аккаунта? Создать</p>`;
        }
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    executeRegister() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        if(!u || !p) return alert('Заполните все текстовые поля!');
        let db = this.getRegistry();
        if(db[u]) return alert('Данный никнейм уже зарегистрирован!');
        
        db[u] = { password: p, glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
        this.saveRegistry(db);
        localStorage.setItem('active_session', u);
        window.location.reload();
    },
    executeLogin() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        let db = this.getRegistry();
        if(!db[u] || db[u].password !== p) return alert('Неверный ник или пароль!');
        if(db[u].banned) return alert('Этот профиль заблокирован Создателем!');
        
        localStorage.setItem('active_session', u);
        window.location.reload();
    },
    logout() {
        localStorage.removeItem('active_session');
        window.location.reload();
    }
};

// --- МОДУЛЬ 2: КАТЕГОРИИ ФОРУМА ---
const ForumNodes = {
    tree: {
        'dev_news': { 
            title: '📢 Технические обновления разработчиков', 
            path: 'Официально / Разработка', 
            threads: [
                { 
                    id: 't-1', 
                    title: 'Ввод полной аутентификации пользователей', 
                    creator: 'Qumestlies_Shawtys', 
                    posts: [{ author: 'Qumestlies_Shawtys', text: 'Авторизация переведена в защищенный режим. Для входа в админ-панель используйте свой новый ключ.' }] 
                }
            ]
        },
        'comp_adm': { title: '🔨 Жалобы на Администрацию', path: 'Жалобы / Администрация', threads: [] },
        'org_fbi': { title: '🕵️‍♂️ [Гос] Federal Bureau of Investigation', path: 'Организации / FBI', threads: [] },
        'org_grove': { title: '🟢 [Гетто] Grove Street Gang', path: 'Организации / Grove', threads: [] }
    },
    init() {
        if(!localStorage.getItem('forum_nodes_data')) {
            localStorage.setItem('forum_nodes_data', JSON.stringify(this.tree));
        }
        this.tree = JSON.parse(localStorage.getItem('forum_nodes_data'));
    },
    save() { localStorage.setItem('forum_nodes_data', JSON.stringify(this.tree)); },
    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for(let key in this.tree) {
            nav.innerHTML += `<a href="#" class="nav-link" id="node-${key}" onclick="App.route('${key}')">${this.tree[key].title}</a>`;
        }
    }
};

// --- МОДУЛЬ 3: УПРАВЛЕНИЕ ЛИЧНЫМ ПРОФИЛЕМ ---
const ProfileCore = {
    open() { 
        const db = AuthModule.getRegistry();
        if(!db[App.user]) return;
        
        document.getElementById('m-profile').style.display = 'flex'; 
        document.getElementById('new-profile-nick').value = App.user;
        document.getElementById('my-profile-avatar-view').src = db[App.user].avatar || 'https://i.postimg.cc/9Q2g9g6y/user2.png'; 
    },
    close() { document.getElementById('m-profile').style.display = 'none'; },
    upload(event) {
        const file = event.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) { 
            document.getElementById('my-profile-avatar-view').src = e.target.result; 
        };
        reader.readAsDataURL(file);
    },
    saveData() {
        const newNick = document.getElementById('new-profile-nick').value.trim();
        const base64Img = document.getElementById('my-profile-avatar-view').src;
        let db = AuthModule.getRegistry();
        
        if(!newNick) return alert('Никнейм не может быть пустым!');
        
        if(newNick !== App.user) {
            if(db[newNick]) return alert('Этот никнейм уже кем-то занят!');
            if(App.user === 'Qumestlies_Shawtys') {
                return alert('Системный аккаунт Создателя нельзя переименовать во избежание системных сбоев скрипта.');
            }
            
            db[newNick] = db[App.user];
            delete db[App.user];
            App.user = newNick;
            localStorage.setItem('active_session', newNick);
        }
        
        db[App.user].avatar = base64Img;
        AuthModule.saveRegistry(db);
        this.close(); 
        window.location.reload();
    }
};

// --- МОДУЛЬ 4: АДМИН-ПАНЕЛЬ СОЗДАТЕЛЯ ---
const AdminPanel = {
    open() {
        if(App.user !== 'Qumestlies_Shawtys') {
            return alert('Доступ закрыт. Вы не являетесь Создателем проекта.');
        }
        document.getElementById('m-admin').style.display = 'flex';
        this.loadUsersList();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    
    loadUsersList() {
        const sel = document.getElementById('adm-target-user');
        if (!sel) return;
        sel.innerHTML = '';
        const db = AuthModule.getRegistry();
        
        for(let name in db) {
            sel.innerHTML += `<option value="${name}">${name}</option>`;
        }
        this.loadTargetUserData();
    },
    loadTargetUserData() {
        const target = document.getElementById('adm-target-user').value;
        if(!target) return;
        const db = AuthModule.getRegistry();
        const u = db[target];
        
        document.getElementById('adm-set-glow').value = u.glow || 'glow-user';
        document.getElementById('adm-set-badge').value = u.badge || 'badge-user';
        document.getElementById('adm-set-ban').value = u.banned ? 'yes' : 'no';
    },
    save() {
        const target = document.getElementById('adm-target-user').value;
        let db = AuthModule.getRegistry();
        if(!db[target]) return;
        
        db[target].glow = document.getElementById('adm-set-glow').value;
        db[target].badge = document.getElementById('adm-set-badge').value;
        
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        db[target].banned = isBan;
        
        if(isBan) {
            if(target === 'Qumestlies_Shawtys') return alert('Вы не можете заблокировать собственный аккаунт!');
            db[target].glow = 'glow-banned';
            db[target].badge = 'badge-banned';
        }
        
        AuthModule.saveRegistry(db);
        this.close(); 
        window.location.reload();
    }
};

// --- МОДУЛЬ 5: SPA ЯДРО ИНТЕРФЕЙСА ---
const App = {
    user: null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,
    
    init() {
        AuthModule.init();
        ForumNodes.init();
        this.user = localStorage.getItem('active_session');
        
        this.renderAuthBar();
        ForumNodes.renderMenu();
        this.checkAdminButton();
        this.route(this.activeNodeKey);
        
        const sel = document.getElementById('adm-target-user');
        if(sel) { sel.onchange = () => AdminPanel.loadTargetUserData(); }
    },
    renderAuthBar() {
        const bar = document.getElementById('runtime-auth-zone');
        if(!bar) return;
        if(this.user) {
            const uData = AuthModule.getRegistry()[this.user] || { glow: 'glow-user', badge: 'badge-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            bar.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <img class="avatar-mini" src="${uData.avatar}" onclick="ProfileCore.open()"> 
                    <span class="${uData.glow}" style="margin-left:10px; font-weight:bold; font-size:14px; cursor:pointer;" onclick="ProfileCore.open()">${this.user}</span>
                    <button class="btn-core" style="padding:6px 12px; font-size:11px; background:#1b1b2a; border:1px solid #2c2c42; margin-left:15px;" onclick="AuthModule.logout()">Выйти</button>
                </div>
            `;
        } else {
            bar.innerHTML = `<button class="btn-core" onclick="AuthModule.open(false)">Авторизоваться</button>`;
        }
    },
    checkAdminButton() {
        if (this.user === 'Qumestlies_Shawtys') {
            const navMenu = document.getElementById('nodes-navigation-list');
            if (navMenu && !document.getElementById('ui-adm-btn')) {
                const btn = document.createElement('button');
                btn.id = 'ui-adm-btn';
                btn.className = 'btn-core';
                btn.style.width = '100%';
                btn.style.marginTop = '20px';
                btn.style.background = 'linear-gradient(135deg, #ff0055, #8a2387)';
                btn.style.boxShadow = '0 0 15px rgba(255, 0, 85, 0.3)';
                btn.innerHTML = '🛡️ Панель Создателя';
                btn.onclick = () => AdminPanel.open();
                navMenu.appendChild(btn);
            }
        }
    },
    route(nodeKey) {
        this.activeNodeKey = nodeKey;
        this.activeThreadId = null;
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        const activeLink = document.getElementById(`node-${nodeKey}`);
        if(activeLink) activeLink.classList.add('active');
        this.render();
    },
    render() {
        const view = document.getElementById('render-forum-core');
        if (!view) return;
        const node = ForumNodes.tree[this.activeNodeKey];
        if(!node) return;
        
        if(this.activeThreadId) { this.renderThread(view, node); return; }
        
        let html = `
            <div style="font-size:11px; color:#555; text-transform:uppercase; margin-bottom:5px; font-weight:bold;">${node.path}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
                <h2 style="margin:0; font-size:22px; font-weight:800; color:#fff;">${node.title}</h2>
                <button class="btn-core" onclick="App.openCreateThreadForm()">+ Создать новую тему</button>
            </div>
        `;
        if(!node.threads || node.threads.length === 0) {
            html += `<p style="color:#444; text-align:center; padding:40px 0;">Обсуждения в данном...</p>`;
        } else {
            node.threads.forEach(t => {
                html += `
                    <div style="background:#09090f; padding:18px; border:1px solid var(--border-color); border-radius:5px; margin-bottom:12px; cursor:pointer;" onclick="App.openThread('${t.id}')">
                        <div style="font-weight:bold; font-size:16px; color:#fff;">${t.title}</div>
                        <div style="font-size:11px; color:#444; margin-top:6px;">Автор: <span style="color:#aaa;">${t.creator}</span></div>
                    </div>
                `;
            });
        }
        view.innerHTML = html;
    },
    openThread(id) { this.activeThreadId = id; this.render(); },
    renderThread(view, node) {
        const thread = node.threads.find(t => t.id === this.activeThreadId);
        if(!thread) return;
        let html = `<button class="btn-core" style="background:#1c1c30; margin-bottom:20px; padding:6px 14px; font-size:11px;" onclick="App.route('${this.activeNodeKey}')">↩ Назад</button>
                    <h2 style="color:#fff; margin-bottom:25px; font-size:20px; font-weight:800;">${thread.title}</h2>`;
        
        const userDb = AuthModule.getRegistry();
        thread.posts.forEach(p => {
            const u = userDb[p.author] || { glow: 'glow-user', badge: 'badge-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            html += `
                <div style="display:grid; grid-template-columns:190px 1fr; background:#08080d; border:1px solid var(--border-color); border-radius:5px; margin-bottom:15px; overflow:hidden;">
                    <div style="background:#0b0b12; padding:20px; text-align:center; border-right:1px solid var(--border-color);">
                        <img class="avatar-round" src="${u.avatar}">
                        <div style="margin-top:12px;"><span class="${u.glow}" style="font-size:14px;">${p.author}</span></div>
                        <div class="badge-role ${u.badge}">${u.badge.replace('badge-', '').toUpperCase()}</div>
                    </div>
                    <div style="padding:25px; white-space:pre-wrap; color:#cdcdff; font-size:14px; line-height:1.6;">${p.text}</div>
                </div>
            `;
        });
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
        const thread = ForumNodes.tree[this.activeNodeKey].threads.find(t => t.id === this.activeThreadId);
        thread.posts.push({ author: this.user, text: text });
        ForumNodes.save(); this.render();
    },
    openCreateThreadForm() {
        if(!this.user) return alert('Авторизуйтесь на портале!');
        const view = document.getElementById('render-forum-core');
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
        if(!title || !text) return alert('Заполните пустые формы!');
        const id = 'thread-' + Date.now();
        ForumNodes.tree[this.activeNodeKey].threads.push({
            id: id, title: title, creator: this.user, posts: [{ author: this.user, text: text }]
        });
        ForumNodes.save(); this.activeThreadId = id; this.render();
    }
};

window.onload = () => { App.init(); };
