// Координатор и главный диспетчер SPA-архитектуры форума
const App = {
    user: localStorage.getItem('active_session') || null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,
    
    init() {
        this.renderAuthBar();
        ForumNodes.renderMenu();
        this.route(this.activeNodeKey);
        this.checkAdminButton();
    },
    
    renderAuthBar() {
        const bar = document.getElementById('runtime-auth-zone');
        if(this.user) {
            const uData = AuthModule.getRegistry()[this.user];
            bar.innerHTML = `
                <img class="avatar-mini" src="${uData.avatar}"> 
                <span class="${uData.glow}" style="cursor:pointer; margin-left:6px; font-weight:bold;" onclick="ProfileCore.open()">
                    ${this.user}
                </span>
                <button class="btn-core" style="padding:6px 12px; font-size:10px; background:#222; margin-left:15px;" onclick="AuthModule.logout()">Выйти</button>
            `;
        } else {
            bar.innerHTML = `
                <button class="btn-core" style="padding:8px 16px; font-size:11px;" onclick="AuthModule.open(false)">Авторизация</button>
            `;
        }
    },
    
    checkAdminButton() {
        if(!this.user) return;
        const u = AuthModule.getRegistry()[this.user];
        if(u && (u.glow === 'glow-founder' || u.glow === 'glow-spec' || u.glow === 'glow-admin')) {
            document.getElementById('ui-adm-btn').style.display = 'block';
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
        const node = ForumNodes.tree[this.activeNodeKey];
        
        if(this.activeThreadId) {
            this.renderThread(view, node);
            return;
        }
        
        let html = `
            <div style="font-size:12px; color:#555; text-transform:uppercase; margin-bottom:5px;">${node.path}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                <h2 style="margin:0; font-size:22px; font-weight:800;">${node.title}</h2>
                <button class="btn-core" onclick="App.openCreateThreadForm()">+ Создать тему</button>
            </div>
        `;
        
        if(node.threads.length === 0) {
            html += `<p style="color:#444; text-align:center; padding:40px;">В этом разделе обсуждений пока нет.</p>`;
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
        let html = `<button class="btn-core" style="background:#222; margin-bottom:20px; padding:6px 12px; font-size:11px;" onclick="App.route('${this.activeNodeKey}')">↩ Назад в раздел</button>
                    <h2 style="color:#fff; margin-bottom:25px; font-size:20px;">${thread.title}</h2>`;
        
        const userDb = AuthModule.getRegistry();
        thread.posts.forEach(p => {
            const u = userDb[p.author] || { glow: 'glow-user', badge: 'badge-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
            html += `
                <div style="display:grid; grid-template-columns:180px 1fr; background:#08080d; border:1px solid #1a1a2a; border-radius:4px; margin-bottom:15px; overflow:hidden;">
                    <div style="background:#0c0c14; padding:20px; text-align:center; border-right:1px solid #1a1a2a;">
                        <img class="avatar-round" src="${u.avatar}" style="width:75px; height:75px;">
                        <div style="margin-top:10px;"><span class="${u.glow}">${p.author}</span></div>
                        <div class="badge-role ${u.badge}">${u.badge.replace('badge-', '').toUpperCase()}</div>
                    </div>
                    <div style="padding:20px; white-space:pre-wrap;">${p.text}</div>
                </div>
            `;
        });
        
        if(this.user) {
            html += `
                <div style="margin-top:25px;">
                    <textarea class="input-field" id="post-reply-text" rows="4" placeholder="Введите ваш ответ в тему..."></textarea>
                    <button class="btn-core" onclick="App.sendReply()">Отправить сообщение</button>
                </div>
            `;
        } else {
            html += `<p style="text-align:center; color:#444; margin-top:20px;">Для ответов необходимо <a href="#" style="color:var(--brand-red);" onclick="AuthModule.open(false)">авторизоваться</a></p>`;
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
        if(!this.user) return alert('Только авторизованные пользователи могут создавать темы!');
        const view = document.getElementById('render-forum-core');
        view.innerHTML = `
            <h2>Создание темы в разделе</h2>
            <input class="input-field" id="new-t-title" placeholder="Краткий заголовок темы">
            <textarea class="input-field" id="new-t-text" rows="6" placeholder="Текст вашего стартового сообщения..."></textarea>
            <button class="btn-core" onclick="App.submitThread()">Опубликовать</button>
            <button class="btn-core" style="background:#222;" onclick="App.render()">Отмена</button>
        `;
    },
    
    submitThread() {
        const title = document.getElementById('new-t-title').value.trim();
        const text = document.getElementById('new-t-text').value.trim();
        if(!title || !text) return;
        
        const id = 'thread-' + Date.now();
        ForumNodes.tree[this.activeNodeKey].threads.push({
            id: id, title: title, creator: this.user, posts: [{ author: this.user, text: text }]
        });
        ForumNodes.save();
        this.activeThreadId = id;
        this.render();
    }
};

// Системный старт
App.init();
