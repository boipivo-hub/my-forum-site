// ==========================================================================
// ARIES ROLE PLAY - CORE SPA ENGINE (FOUNDER EDITION)
// ==========================================================================

// --- МОДУЛЬ 1: АВТОРИЗАЦИЯ И СЕССИИ (СТРОГО ДЛЯ Qumestlies_Shawtys) ---
const AuthModule = {
    init() {
        // Принудительно чистим реестр при первом запуске с этим скриптом, чтобы выдать тебе права
        let checkDb = localStorage.getItem('user_registry');
        if (!checkDb || !checkDb.includes('Qumestlies_Shawtys')) {
            localStorage.removeItem('user_registry');
        }

        if (!localStorage.getItem('user_registry')) {
            const defaults = {
                // Твой ник зашит намертво как единственный создатель проекта
                'Qumestlies_Shawtys': { 
                    password: '123', 
                    glow: 'glow-founder', 
                    badge: 'badge-founder', 
                    banned: false, 
                    avatar: 'https://i.postimg.cc/mDCHYg8g/aries.png' 
                }
            };
            localStorage.setItem('user_registry', JSON.stringify(defaults));
        }
    },
    getRegistry() { return JSON.parse(localStorage.getItem('user_registry') || '{}'); },
    saveRegistry(data) { localStorage.setItem('user_registry', JSON.stringify(data)); },
    
    open(isReg = false) {
        const modal = document.getElementById('m-auth');
        if (!modal) return;
        modal.style.display = 'flex';
        const container = document.getElementById('auth-btn-container');
        
        if(isReg) {
            document.getElementById('auth-title').innerText = "Регистрация нового аккаунта";
            container.innerHTML = `
                <button class="btn-core" style="width:100%;" onclick="AuthModule.executeRegister()">Создать аккаунт</button>
                <p style="font-size:12px; text-align:center; color:#666; margin-top:10px; cursor:pointer;" onclick="AuthModule.open(false)">Уже есть профиль? Войти</p>
            `;
        } else {
            document.getElementById('auth-title').innerText = "Вход на веб-портал";
            container.innerHTML = `
                <button class="btn-core" style="width:100%;" onclick="AuthModule.executeLogin()">Войти в аккаунт</button>
                <p style="font-size:12px; text-align:center; color:#666; margin-top:10px; cursor:pointer;" onclick="AuthModule.open(true)">Нет аккаунта? Создать</p>
            `;
        }
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    triggerGoogleLogin() {
        const googleNicks = ['Google_User_Aries', 'Player_Aries_RP', 'Samp_Gamer'];
        const randomNick = googleNicks[Math.floor(Math.random() * googleNicks.length)];
        
        let db = this.getRegistry();
        if(!db[randomNick]) {
            db[randomNick] = { password: 'google_secure_oauth', glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            this.saveRegistry(db);
        }
        
        localStorage.setItem('active_session', randomNick);
        this.close();
        window.location.reload();
    },
    executeRegister() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        if(!u || !p) return alert('Заполните все поля!');
        let db = this.getRegistry();
        if(db[u]) return alert('Этот никнейм уже занят!');
        
        db[u] = { password: p, glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
        this.saveRegistry(db);
        localStorage.setItem('active_session', u);
        this.close(); window.location.reload();
    },
    executeLogin() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        let db = this.getRegistry();
        if(!db[u] || db[u].password !== p) return alert('Неверный ник или пароль!');
        if(db[u].banned) return alert('Ваш аккаунт заблокирован на форуме!');
        
        localStorage.setItem('active_session', u);
        this.close(); window.location.reload();
    },
    logout() {
        localStorage.removeItem('active_session');
        window.location.reload();
    }
};

// --- МОДУЛЬ 2: ДЕРЕВО ОРГАНИЗАЦИЙ, ФРАКЦИЙ И ЖАЛОБ ---
const ForumNodes = {
    tree: {
        // РАЗДЕЛ ЖАЛОБ
        'comp_adm': { title: '🔨 Жалобы на Администрацию', path: 'Жалобы / Администрация', threads: [] },
        'comp_gos': { title: '🏢 Жалобы на сотрудников гос. структур', path: 'Жалобы / Гос. структуры', threads: [] },
        'comp_ghetto': { title: '🥷 Жалобы на членов уличных группировок', path: 'Жалобы / Гетто', threads: [] },
        'comp_players': { title: '👤 Жалобы на игроков не сост. в организациях', path: 'Жалобы / Игроки', threads: [] },
        
        // ВОССТАНОВЛЕНИЯ И АМНИСТИИ
        'appeal_unban': { title: '🔓 Заявления на амнистию игровых аккаунтов', path: 'Амнистия / Разбан', threads: [] },
        'appeal_restore': { title: '🔄 Заявления на восстановление в должностях', path: 'Амнистия / Восстановления', threads: [] },
        
        // ГОСУДАРСТВЕННЫЕ И СИЛОВЫЕ СТРУКТУРЫ
        'org_lspd': { title: '🔵 [Гос] Сhannel LSPD (Полиция Лос-Сантос)', path: 'Организации / Государственные / LSPD', threads: [] },
        'org_fbi': { title: '🕵️‍♂️ [Гос] Federal Bureau of Investigation (ФБР)', path: 'Организации / Государственные / FBI', threads: [] },
        'org_army': { title: '🪖 [Гос] Army Area 51 (Армия Нац. Гвардии)', path: 'Организации / Государственные / Army', threads: [] },
        
        // НЕЛЕГАЛЬНЫЕ СТРУКТУРЫ (ГЕТТО И МАФИИ)
        'org_grove': { title: '🟢 [Банды] Grove Street Gang', path: 'Организации / Нелегальные / Гетто / Grove', threads: [] },
        'org_ballas': { title: '🟣 [Банды] East Side Ballas Gang', path: 'Организации / Нелегальные / Гетто / Ballas', threads: [] },
        'org_lcn': { title: '💼 [Мафии] La Cosa Nostra', path: 'Организации / Нелегальные / Мафии / LCN', threads: [] },
        'org_yakuza': { title: '⚔️ [Мафии] Yakuza Syndicate', path: 'Организации / Нелегальные / Мафии / Yakuza', threads: [] },
        
        // НОВОСТИ И ОБНОВЛЕНИЯ ОТ ТЕБЯ
        'dev_news': { 
            title: '📢 Технические обновления разработчиков', 
            path: 'Официально / Разработка', 
            threads: [
                { 
                    id: 't-1', 
                    title: 'Глобальный патч форумного ядра Aries SPA до версии 6.0', 
                    creator: 'Qumestlies_Shawtys', 
                    posts: [{ author: 'Qumestlies_Shawtys', text: 'Уважаемые пользователи, мы развернули быстрое модульное SPA-ядро. Баги исправлены, профили синхронизированы.' }] 
                }
            ]
        },
        'market_place': { title: '💰 Торговая площадка (Покупка/Продажа имущества)', path: 'Игровой процесс / Торговля', threads: [] }
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

// --- МОДУЛЬ 3: НАСТРОЙКА ПРОФИЛЕЙ И GIF-АВАТАРКИ ---
const ProfileCore = {
    open() { 
        document.getElementById('m-profile').style.display = 'flex'; 
        document.getElementById('my-profile-avatar-view').src = AuthModule.getRegistry()[App.user].avatar; 
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
        
        if(newNick && newNick !== App.user) {
            if(db[newNick]) return alert('Этот ник уже занят!');
            db[newNick] = db[App.user];
            delete db[App.user];
            App.user = newNick;
            localStorage.setItem('active_session', newNick);
        }
        
        db[App.user].avatar = base64Img;
        AuthModule.saveRegistry(db);
        this.close(); window.location.reload();
    }
};

// --- МОДУЛЬ 4: ПАНЕЛЬ УПРАВЛЕНИЯ МОДЕРАЦИЕЙ (АДМИНКА) ---
const AdminPanel = {
    open() {
        // Доступ открывается ТОЛЬКО твоему нику
        if(App.user !== 'Qumestlies_Shawtys') {
            return alert('Ошибка доступа: данная консоль доступна только Создателю проекта.');
        }
        document.getElementById('m-admin').style.display = 'flex';
        const sel = document.getElementById('adm-target-user');
        if (!sel) return;
        sel.innerHTML = '';
        const db = AuthModule.getRegistry();
        for(let name in db) { sel.innerHTML += `<option value="${name}">${name}</option>`; }
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    save() {
        const target = document.getElementById('adm-target-user').value;
        let db = AuthModule.getRegistry();
        
        db[target].glow = document.getElementById('adm-set-glow').value;
        db[target].badge = document.getElementById('adm-set-badge').value;
        
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        db[target].banned = isBan;
        
        if(isBan) {
            if(target === 'Qumestlies_Shawtys') return alert('Вы не можете заблокировать создателя!');
            db[target].glow = 'glow-banned';
            db[target].badge = 'badge-banned';
        }
        
        AuthModule.saveRegistry(db);
        this.close(); window.location.reload();
    }
};

// --- МОДУЛЬ 5: ГЛАВНЫЙ СУПЕР-КООРДИНАТОР SPA-ИНТЕРФЕЙСА ---
const App = {
    user: localStorage.getItem('active_session') || null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,
    
    init() {
        AuthModule.init();
        ForumNodes.init();
        this.renderAuthBar();
        ForumNodes.renderMenu();
        this.route(this.activeNodeKey);
        this.checkAdminButton();
    },
    renderAuthBar() {
        const bar = document.getElementById('runtime-auth-zone');
        if(!bar) return;
        if(this.user) {
            const uData = AuthModule.getRegistry()[this.user] || { glow: 'glow-user', badge: 'badge-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            bar.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <img class="avatar-mini" src="${uData.avatar}"> 
                    <span class="${uData.glow}" style="cursor:pointer; margin-left:8px; font-weight:bold;" onclick="ProfileCore.open()">
                        ${this.user}
                    </span>
                    <button class="btn-core" style="padding:6px 12px; font-size:10px; background:#222; margin-left:15px;" onclick="AuthModule.logout()">Выйти</button>
                </div>
            `;
        } else {
            bar.innerHTML = `<button class="btn-core" style="padding:8px 16px; font-size:11px;" onclick="AuthModule.open(false)">Авторизация</button>`;
        }
    },
    checkAdminButton() {
        const btn = document.getElementById('ui-adm-btn');
        if(!btn) return;
        // Кнопка отображается ТОЛЬКО если ник сессии равен твоему
        if(this.user === 'Qumestlies_Shawtys') {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
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
            <div style="font-size:11px; color:#555; text-transform:uppercase; margin-bottom:5px; letter-spacing:0.5px;">${node.path}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; border-bottom:1px solid #1e1e30; padding-bottom:15px;">
                <h2 style="margin:0; font-size:22px; font-weight:800; color:#fff;">${node.title}</h2>
                <button class="btn-core" onclick="App.openCreateThreadForm()">+ Создать тему</button>
            </div>
        `;
        if(!node.threads || node.threads.length === 0) {
            html += `<p style="color:#444; text-align:center; padding:5px 0 40px 0;">В этом разделе обсуждений пока нет.</p>`;
        } else {
            node.threads.forEach(t => {
                html += `
                    <div style="background:#09090f; padding:15px; border:1px solid #1c1c2b; border-radius:4px; margin-bottom:10px; cursor:pointer;" onclick="App.openThread('${t.id}')">
                        <div style="font-weight:bold; font-size:15px; color:#fff;">${t.title}</div>
                        <div style="font-size:11px; color:#555; margin-top:5px;">Автор: ${t.creator} | Ответов: ${t.posts.length - 1}</div>
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
        let html = `<button class="btn-core" style="background:#222; margin-bottom:20px; padding:6px 12px; font-size:11px;" onclick="App.route('${this.activeNodeKey}')">↩ Назад</button>
                    <h2 style="color:#fff; margin-bottom:25px; font-size:20px; font-weight:800;">${thread.title}</h2>`;
        
        const userDb = AuthModule.getRegistry();
        thread.posts.forEach(p => {
            const u = userDb[p.author] || { glow: 'glow-user', badge: 'badge-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            html += `
                <div style="display:grid; grid-template-columns:190px 1fr; background:#08080d; border:1px solid #1a1a2a; border-radius:4px; margin-bottom:15px; overflow:hidden;">
                    <div style="background:#0c0c14; padding:20px; text-align:center; border-right:1px solid #1a1a2a;">
                        <img class="avatar-round" src="${u.avatar}">
                        <div style="margin-top:10px;"><span class="${u.glow}">${p.author}</span></div>
                        <div class="badge-role ${u.badge}">${u.badge.replace('badge-', '').toUpperCase()}</div>
                    </div>
                    <div style="padding:20px; white-space:pre-wrap; color:#dedee6; font-size:14px; line-height:1.5;">${p.text}</div>
                </div>
            `;
        });
        if(this.user) {
            html += `
                <div style="margin-top:25px; background:#08080d; padding:20px; border-radius:4px; border:1px solid #1a1a2a;">
                    <textarea class="input-field" id="post-reply-text" rows="4" placeholder="Введите ваш ответ..."></textarea>
                    <button class="btn-core" onclick="App.sendReply()">Отправить сообщение</button>
                </div>
            `;
        }
        view.innerHTML = html;
    },
    sendReply() {
        const text = document.getElementById('post-reply-text').value.trim();
        if(!text) return;
        const tree = this.getTree ? this.getTree() : ForumNodes.tree;
        const thread = tree[this.activeNodeKey].threads.find(t => t.id === this.activeThreadId);
        thread.posts.push({ author: this.user, text: text });
        ForumNodes.save(); this.render();
    },
    openCreateThreadForm() {
        if(!this.user) return alert('Только для авторизованных пользователей!');
        const view = document.getElementById('render-forum-core');
        view.innerHTML = `
            <h2 style="color:#fff; font-weight:800;">Создание новой темы</h2>
            <input class="input-field" id="new-t-title" placeholder="Заголовок темы">
            <textarea class="input-field" id="new-t-text" rows="6" placeholder="Текст сообщения..."></textarea>
            <div style="display:flex; gap:10px;">
                <button class="btn-core" onclick="App.submitThread()">Опубликовать</button>
                <button class="btn-core" style="background:#222;" onclick="App.render()">Отмена</button>
            </div>
        `;
    },
    submitThread() {
        const title = document.getElementById('new-t-title').value.trim();
        const text = document.getElementById('new-t-text').value.trim();
        if(!title || !text) return alert('Заполните все поля!');
        const id = 'thread-' + Date.now();
        ForumNodes.tree[this.activeNodeKey].threads.push({
            id: id, title: title, creator: this.user, posts: [{ author: this.user, text: text }]
        });
        ForumNodes.save(); this.activeThreadId = id; this.render();
    }
};

// Автоматический глобальный старт SPA
window.onload = () => { App.init(); };
