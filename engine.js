// ==========================================================================
// CORE FORUM ENGINE - SYSTEM DISPATCHER & CORE SPA
// ==========================================================================

const App = {
    user: localStorage.getItem('active_session') || null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,

    init() {
        // Проверяем и разворачиваем дерево разделов при первом запуске
        if (!localStorage.getItem('forum_nodes_data')) {
            const initialTree = {
                // Раздел 1: Жалобы
                'comp_adm': { title: '🔨 Жалобы на администрацию сервера', path: 'Жалобы / Администрация', threads: [] },
                'comp_gos': { title: '🚓 Жалобы на сотрудников гос. структур', path: 'Жалобы / Государственные организации', threads: [] },
                'comp_ghetto': { title: '🥷 Жалобы на членов уличных группировок (Гетто)', path: 'Жалобы / Банды', threads: [] },
                'comp_players': { title: '👤 Жалобы на игроков не состоящих в организациях', path: 'Жалобы / Игроки', threads: [] },
                
                // Раздел 2: Восстановления / Амнистии
                'appeal_unban': { title: '🔓 Заявления на амнистию (Разбан аккаунтов)', path: 'Амнистии и Восстановления', threads: [] },
                'appeal_restore': { title: '🔄 Заявления на восстановление в должностях/рангах', path: 'Амнистии и Восстановления', threads: [] },
                
                // Раздел 3: Организации -> Государственные
                'gos_lspd': { title: '🔵 [Гос] Сhannel LSPD (Полиция г. Лос-Сантос)', path: 'Организации / Государственные фракции / LSPD', threads: [] },
                'gos_fbi': { title: '🕵️‍♂️ [Гос] Federal Bureau of Investigation (ФБР)', path: 'Организации / Государственные фракции / FBI', threads: [] },
                'gos_army': { title: '🪖 [Гос] Army Area 51 (Сухопутные войска)', path: 'Организации / Государственные фракции / Армия', threads: [] },
                
                // Раздел 3: Организации -> Банды / Мафии
                'ghetto_grove': { title: '🟢 [Банды] Grove Street Gang', path: 'Организации / Нелегальные структуры / Гетто / Grove Street', threads: [] },
                'ghetto_ballas': { title: '🟣 [Банды] East Side Ballas Gang', path: 'Организации / Нелегальные структуры / Гетто / Ballas', threads: [] },
                'mafia_lcn': { title: '💼 [Мафии] La Cosa Nostra', path: 'Организации / Нелегальные структуры / Мафии / LCN', threads: [] },
                'mafia_yakuza': { title: '⚔️ [Мафии] Yakuza Syndicate', path: 'Организации / Нелегальные структуры / Мафии / Yakuza', threads: [] },
                
                // Кастомные разделы от разработчика
                'dev_news': { 
                    title: '📢 Технические обновления и патчноуты разработчиков', 
                    path: 'Официальный раздел / Новости', 
                    threads: [
                        { 
                            id: 't-welcome', 
                            title: 'Добро пожаловать на обновленный веб-портал Aries Portal v6.0', 
                            creator: 'Qumestlies_Shawty', 
                            posts: [{ author: 'Qumestlies_Shawty', text: 'Приветствуем! Форум переведен на компонентную SPA-архитектуру по технологиям топовых игровых проектов. Пользуйтесь!' }] 
                        }
                    ] 
                },
                'market_estate': { title: '🏠 [Торговля] Продажа и покупка недвижимости (Дома/Бизнесы)', path: 'Игровой процесс / Рынок', threads: [] },
                'market_cars': { title: '🚗 [Торговля] Продажа и покупка транспортных средств', path: 'Игровой процесс / Рынок', threads: [] }
            };
            localStorage.setItem('forum_nodes_data', JSON.stringify(initialTree));
        }

        this.renderAuthBar();
        this.renderMenu();
        this.route(this.activeNodeKey);
        this.checkAdminPrivileges();
    },

    getTree() {
        return JSON.parse(localStorage.getItem('forum_nodes_data'));
    },

    saveTree(data) {
        localStorage.setItem('forum_nodes_data', JSON.stringify(data));
    },

    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        
        const tree = this.getTree();
        nav.innerHTML = `<div class="sidebar-title">Навигация портала</div>`;
        
        for (let key in tree) {
            nav.innerHTML += `<a href="#" class="nav-link" id="node-${key}" onclick="App.route('${key}')">${tree[key].title}</a>`;
        }
    },

    renderAuthBar() {
        const bar = document.getElementById('runtime-auth-zone');
        if (!bar) return;

        if (this.user) {
            const db = AuthModule.getRegistry();
            const uData = db[this.user] || { glow: 'glow-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            bar.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <img class="avatar-mini" src="${uData.avatar}"> 
                    <span class="${uData.glow}" style="cursor:pointer; font-weight:700; font-size:15px;" onclick="ProfileCore.open()">
                        ${this.user}
                    </span>
                    <button class="btn-core" style="padding:8px 16px; font-size:10px; background:#1c1c2b;" onclick="AuthModule.logout()">Выйти</button>
                </div>
            `;
        } else {
            bar.innerHTML = `
                <button class="btn-core" style="padding:10px 20px; font-size:11px;" onclick="AuthModule.open(false)">Войти / Регистрация</button>
            `;
        }
    },

    checkAdminPrivileges() {
        const btn = document.getElementById('ui-adm-btn');
        if (!btn) return;
        
        if (!this.user) {
            btn.style.display = 'none';
            return;
        }
        
        const u = AuthModule.getRegistry()[this.user];
        if (u && (u.glow === 'glow-founder' || u.glow === 'glow-spec' || u.glow === 'glow-admin')) {
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
        if (activeLink) activeLink.classList.add('active');
        
        this.render();
    },

    render() {
        const view = document.getElementById('render-forum-core');
        if (!view) return;

        const tree = this.getTree();
        const node = tree[this.activeNodeKey];
        if (!node) return;

        if (this.activeThreadId) {
            this.renderThread(view, node);
            return;
        }

        let html = `
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px;">${node.path}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
                <h2 style="margin:0; font-size:24px; font-weight:800; color:#fff;">${node.title}</h2>
                <button class="btn-core" onclick="App.openCreateThreadForm()">+ Создать тему</button>
            </div>
        `;

        if (!node.threads || node.threads.length === 0) {
            html += `
                <div style="text-align:center; padding:60px 20px; color:var(--text-muted);">
                    <div style="font-size:40px; margin-bottom:10px;">📂</div>
                     В данном подразделе ещё нет тем для обсуждения. Будьте первым!
                </div>`;
        } else {
            node.threads.forEach(t => {
                html += `
                    <div style="background:#09090f; padding:18px 24px; border:1px solid var(--border-color); border-radius:4px; margin-bottom:12px; cursor:pointer; transition:0.15s;" onmouseover="this.style.borderColor='#31314d'" onmouseout="this.style.borderColor='var(--border-color)'" onclick="App.openThread('${t.id}')">
                        <div style="font-weight:700; font-size:16px; color:#fff; margin-bottom:6px;">${t.title}</div>
                        <div style="font-size:12px; color:var(--text-muted);">Автор публикации: <span style="color:#8e8eaf;">${t.creator}</span> | Сообщений: ${t.posts.length}</div>
                    </div>
                `;
            });
        }
        view.innerHTML = html;
    },

    openThread(id) { 
        this.activeThreadId = id; 
        this.render(); 
    },

    renderThread(view, node) {
        const thread = node.threads.find(t => t.id === this.activeThreadId);
        if (!thread) {
            this.activeThreadId = null;
            this.render();
            return;
        }

        let html = `
            <button class="btn-core" style="background:#1c1c2b; margin-bottom:25px; padding:8px 16px; font-size:11px;" onclick="App.route('${this.activeNodeKey}')">↩ Вернуться назад</button>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">${node.path}</div>
            <h2 style="color:#fff; margin:0 0 30px 0; font-size:22px; font-weight:800; border-bottom:1px solid var(--border-color); padding-bottom:15px;">${thread.title}</h2>
        `;

        const userDb = AuthModule.getRegistry();
        thread.posts.forEach(p => {
            const u = userDb[p.author] || { glow: 'glow-user', badge: 'badge-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            html += `
                <div style="display:grid; grid-template-columns:210px 1fr; background:#08080d; border:1px solid var(--border-color); border-radius:4px; margin-bottom:16px; overflow:hidden;">
                    <div style="background:#0c0c14; padding:25px 15px; text-align:center; border-right:1px solid var(--border-color);">
                        <img class="avatar-round" src="${u.avatar}" style="width:80px; height:80px;">
                        <div style="margin-top:12px; font-size:15px;"><span class="${u.glow}">${p.author}</span></div>
                        <div class="badge-role ${u.badge}">${u.badge.replace('badge-', '').toUpperCase()}</div>
                    </div>
                    <div style="padding:25px; white-space:pre-wrap; font-size:15px; line-height:1.6; color:#d2d2de;">${p.text}</div>
                </div>
            `;
        });

        if (this.user) {
            html += `
                <div style="margin-top:30px; background: #08080d; padding: 20px; border-radius: 4px; border: 1px solid var(--border-color);">
                    <div style="font-size:13px; font-weight:bold; margin-bottom:10px; color:#fff;">Быстрый ответ в тему:</div>
                    <textarea class="input-field" id="post-reply-text" rows="5" placeholder="Напишите ваше сообщение..." style="margin-bottom:15px;"></textarea>
                    <button class="btn-core" onclick="App.sendReply()">Отправить ответ</button>
                </div>
            `;
        } else {
            html += `<p style="text-align:center; color:var(--text-muted); margin-top:25px; font-size:14px;">Вы должны <a href="#" style="color:var(--brand-red); font-weight:bold;" onclick="AuthModule.open(false)">войти</a>, чтобы оставлять сообщения.</p>`;
        }
        view.innerHTML = html;
    },

    sendReply() {
        const text = document.getElementById('post-reply-text').value.trim();
        if (!text) return alert('Сообщение не может быть пустым!');
        
        const tree = this.getTree();
        const thread = tree[this.activeNodeKey].threads.find(t => t.id === this.activeThreadId);
        
        thread.posts.push({ author: this.user, text: text });
        this.saveTree(tree);
        this.render();
    },

    openCreateThreadForm() {
        if (!this.user) return alert('Только авторизованные пользователи могут открывать обсуждения!');
        const view = document.getElementById('render-forum-core');
        
        view.innerHTML = `
            <h2 style="color:#fff; font-weight:800; font-size:22px; margin-bottom:25px;">Создание новой темы</h2>
            <label style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Название обсуждения</label>
            <input class="input-field" id="new-t-title" placeholder="Введите понятный заголовок темы">
            
            <label style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Суть темы / Текст публикации</label>
            <textarea class="input-field" id="new-t-text" rows="8" placeholder="Опишите ваше предложение, жалобу или заявление подробно..."></textarea>
            
            <div style="display:flex; gap:10px;">
                <button class="btn-core" onclick="App.submitThread()">Опубликовать на форуме</button>
                <button class="btn-core" style="background:#1c1c2b;" onclick="App.render()">Отмена</button>
            </div>
        `;
    },

    submitThread() {
        const title = document.getElementById('new-t-title').value.trim();
        const text = document.getElementById('new-t-text').value.trim();
        if (!title || !text) return alert('Все поля обязательны к заполнению!');

        const tree = this.getTree();
        const id = 'thread-' + Date.now();
        
        tree[this.activeNodeKey].threads.push({
            id: id,
            title: title,
            creator: this.user,
            posts: [{ author: this.user, text: text }]
        });
        
        this.saveTree(tree);
        this.activeThreadId = id;
        this.render();
    }
};
