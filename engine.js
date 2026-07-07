// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v9.6 (CLOUD FOUNDERS UPDATE)
// ==========================================================================

const firebaseConfig = {
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/" 
};
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref();

let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = []; 

dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    window.CloudFounders = data.founders || []; 
    
    if (!data.users || !data.users['Qumestlies_Shawtys']) {
        GlobalUsers['Qumestlies_Shawtys'] = {
            password: 'sxdqamigosxdqs',
            glow: 'glow-founder',
            badge: 'badge-founder',
            verify: 'v-blue-fill',
            banned: false,
            avatar: 'https://i.postimg.cc/mDCHYg8g/aries.png'
        };
        GlobalNodes = {
            'dev_news': { 
                title: '📢 Технические обновления разработчиков', 
                path: 'Официально / Разработка', 
                threads: {
                    't-1': { id: 't-1', title: 'Форум успешно переведен на глобальную базу данных!', creator: 'Qumestlies_Shawtys', posts: { "first": { author: 'Qumestlies_Shawtys', text: 'Теперь все пользователи видят действия друг друга в реальном времени.' } } }
                }
            },
            'comp_adm': { title: '🔨 Жалобы на Администрацию', path: 'Жалобы / Администрация' },
            'org_fbi': { title: '🕵️‍♂️ [Гос] Federal Bureau of Investigation', path: 'Организации / FBI' },
            'org_grove': { title: '🟢 [Гетто] Grove Street Gang', path: 'Организации / Grove' }
        };
        firebase.database().ref('users').set(GlobalUsers);
        firebase.database().ref('nodes').set(GlobalNodes);
    }
    
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

    if (App.user && (App.user === 'Qumestlies_Shawtys' || window.CloudFounders.includes(App.user))) {
        if (GlobalUsers[App.user]) {
            GlobalUsers[App.user].id = "5694374929";
            GlobalUsers[App.user].uid = "5694374929";
        }
    }

    App.syncUI();
});

// --- МОДУЛЬ 1: АВТОРИЗАЦИЯ ---
const AuthModule = {
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
            document.getElementById('auth-title').innerText = "Вход на forum";
            container.innerHTML = `<button class="btn-core" style="width:100%;" onclick="AuthModule.executeLogin()">Выполнить вход</button>
            <p style="font-size:12px; text-align:center; color:#555; margin-top:10px; cursor:pointer;" onclick="AuthModule.open(true)">Нет аккаунта? Создать</p>`;
        }
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    executeRegister() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        if(!u || !p) return alert('Заполните все поля!');
        if(GlobalUsers[u]) return alert('Этот никнейм занят!');
        
        firebase.database().ref('users/' + u).set({
            password: p, glow: 'glow-user', badge: 'badge-user', verify: 'none', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
        }).then(() => {
            localStorage.setItem('active_session', u);
            App.user = u;
            this.close();
        });
    },
    executeLogin() {
        const u = document.getElementById('f-user').value.trim();
        const p = document.getElementById('f-pass').value.trim();
        
        if(!GlobalUsers[u] || GlobalUsers[u].password !== p) return alert('Неверный ник или пароль!');
        if(GlobalUsers[u].banned) return alert('Профиль заблокирован!');
        
        localStorage.setItem('active_session', u);
        App.user = u;
        this.close();
        App.syncUI();
    },
    logout() {
        localStorage.removeItem('active_session');
        App.user = null;
        App.syncUI();
    }
};

// --- МОДУЛЬ 3: ПРОФИЛЬ ---
const ProfileCore = {
    open() { 
        if(!GlobalUsers[App.user]) return;
        document.getElementById('m-profile').style.display = 'flex'; 
        document.getElementById('new-profile-nick').value = App.user;
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
        
        if(newNick !== App.user) {
            if(GlobalUsers[newNick]) return alert('Никнейм занят!');
            if(App.user === 'Qumestlies_Shawtys') return alert('Создателя переименовать нельзя.');
            
            let backup = GlobalUsers[App.user];
            backup.avatar = base64Img;
            
            firebase.database().ref('users/' + newNick).set(backup).then(() => {
                firebase.database().ref('users/' + App.user).remove();
                App.user = newNick;
                localStorage.setItem('active_session', newNick);
                this.close();
            });
        } else {
            firebase.database().ref('users/' + App.user + '/avatar').set(base64Img).then(() => {
                this.close();
            });
        }
    }
};

// --- МОДУЛЬ 4: АДМИН-ПАНЕЛЬ ---
const AdminPanel = {
    open() {
        const isFounder = (App.user === 'Qumestlies_Shawtys' || window.CloudFounders.includes(App.user));
        if(!isFounder) return alert('Вы не Создатель!');
        
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
            firebase.database().ref('founders').set(window.CloudFounders).then(() => {
                alert(`Доступ создателя для ${nick} успешно сохранен в облако!`);
                if(document.getElementById('add-founder-nick')) document.getElementById('add-founder-nick').value = '';
                this.renderFoundersList();
            });
        } else {
            alert('Он уже есть в списке!');
        }
    },
    removeFounder(nick) {
        if(nick === 'Qumestlies_Shawtys') return alert('Главного создателя нельзя удалить!');
        if(confirm(`Забрать права создателя у ${nick}?`)) {
            window.CloudFounders = window.CloudFounders.filter(name => name !== nick);
            firebase.database().ref('founders').set(window.CloudFounders).then(() => {
                this.renderFoundersList();
            });
        }
    },
    renderFoundersList() {
        const block = document.getElementById('cloud-founders-list');
        if(!block) return;
        if(window.CloudFounders.length === 0) {
            block.innerHTML = "В облаке: пусто (только ты)";
            return;
        }
        let listHtml = '<b>В облаке (нажми, чтобы удалить):</b><br>';
        window.CloudFounders.forEach(name => {
            listHtml += `<span style="color:#ff0055; cursor:pointer; text-decoration:underline; margin-right:8px;" onclick="AdminPanel.removeFounder('${name}')">${name}</span> `;
        });
        block.innerHTML = listHtml;
    },

    loadUsersList() {
        const sel = document.getElementById('adm-target-user');
        if (!sel) return; sel.innerHTML = '';
        for(let name in GlobalUsers) { sel.innerHTML += `<option value="${name}">${name}</option>`; }
        this.loadTargetUserData();
    },
    loadTargetUserData() {
        const target = document.getElementById('adm-target-user').value;
        if(!target || !GlobalUsers[target]) return;
        const u = GlobalUsers[target];
        document.getElementById('adm-set-glow').value = u.glow || 'glow-user';
        document.getElementById('adm-set-badge').value = u.badge || 'badge-user';
        document.getElementById('adm-set-verify').value = u.verify || 'none';
        document.getElementById('adm-set-ban').value = u.banned ? 'yes' : 'no';
    },
    save() {
        const target = document.getElementById('adm-target-user').value;
        if(!GlobalUsers[target]) return;
        
        let glowValue = document.getElementById('adm-set-glow').value;
        let badgeValue = document.getElementById('adm-set-badge').value;
        let verifyValue = document.getElementById('adm-set-verify').value;
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        
        if(isBan) {
            if(target === 'Qumestlies_Shawtys') return alert('Себя банить нельзя!');
            glowValue = 'glow-banned';
            badgeValue = 'badge-banned';
            verifyValue = 'none';
        }
        
        firebase.database().ref('users/' + target).update({
            glow: glowValue, badge: badgeValue, verify: verifyValue, banned: isBan
        });
        this.close();
    }
};

// --- МОДУЛЬ СОЗДАНИЯ РАЗДЕЛОВ ---
const NodeManager = {
    open() {
        const isFounder = (App.user === 'Qumestlies_Shawtys' || window.CloudFounders.includes(App.user));
        if(!isFounder) return alert('Доступно только Создателю!');
        document.getElementById('m-create-node').style.display = 'flex';
    },
    close() { document.getElementById('m-create-node').style.display = 'none'; },
    submit() {
        const title = document.getElementById('node-new-title').value.trim();
        const path = document.getElementById('node-new-path').value.trim();
        if(!title || !path) return alert('Заполните все поля!');
        
        const nodeKey = 'node_' + Date.now();
        
        firebase.database().ref('nodes/' + nodeKey).set({
            title: title,
            path: path
        }).then(() => {
            document.getElementById('node-new-title').value = '';
            document.getElementById('node-new-path').value = '';
            this.close();
            App.route(nodeKey);
        });
    }
};

// --- МОДУЛЬ 5: ДИСПЕТЧЕР ИНТЕРФЕЙСА ---
const App = {
    user: null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,
    
    init() {
        const sel = document.getElementById('adm-target-user');
        if(sel) { sel.onchange = () => AdminPanel.loadTargetUserData(); }
    },
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
            let vHtml = '';
            if(uData.verify && uData.verify !== 'none') {
                vHtml = `<span class="verified-badge ${uData.verify}"></span>`;
            }
            bar.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <img class="avatar-mini" src="${uData.avatar}" onclick="ProfileCore.open()"> 
                    <span class="${uData.glow || 'glow-user'}" style="margin-left:10px; font-weight:bold; font-size:14px; cursor:pointer;" onclick="ProfileCore.open()">${this.user}${vHtml}</span>
                    <button class="btn-core" style="padding:6px 12px; font-size:11px; background:#1b1b2a; border:1px solid #2c2c42; margin-left:15px;" onclick="AuthModule.logout()">Выйти</button>
                </div>
            `;
        } else {
            bar.innerHTML = `<button class="btn-core" onclick="AuthModule.open(false)">Авторизоваться</button>`;
        }
    },
    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for(let key in GlobalNodes) {
            // ИСПРАВЛЕНО: Проверяем активный раздел и вешаем класс 'active'
            const activeClass = (this.activeNodeKey === key) ? 'active' : '';
            nav.innerHTML += `<a href="javascript:void(0)" class="nav-link ${activeClass}" onclick="App.route('${key}')">${GlobalNodes[key].title}</a>`;
        }
    },
    checkAdminButtons() {
        const existingAdmBtn = document.getElementById('ui-adm-btn');
        const existingNodeBtn = document.getElementById('ui-node-btn');
        const isFounder = (this.user === 'Qumestlies_Shawtys' || window.CloudFounders.includes(this.user));
        
        if (isFounder) {
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
        this.renderMenu(); // Перерисовываем меню, чтобы сбросить старый "active" и поставить на новый раздел
        this.render();
    },
    render() {
        const view = document.getElementById('render-forum-core');
        if (!view) return;
        const node = GlobalNodes[this.activeNodeKey];
        if(!node) {
            view.innerHTML = `<p style="color:#444; text-align:center; padding:40px 0;">Раздел не найден или был удален.</p>`;
            return;
        }
        
        if(this.activeThreadId) { this.renderThread(view, node); return; }
        
        let html = `
            <div style="font-size:11px; color:#555; text-transform:uppercase; margin-bottom:5px; font-weight:bold;">${node.path}</div>
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
                // ИСПРАВЛЕНО: Теперь проверяется активная тема и ей присваивается класс topic-link active, чтобы она горела неоновым красным
                const activeTopicClass = (this.activeThreadId === t.id) ? 'active' : '';
                html += `
                    <div class="topic-link ${activeTopicClass}" style="background:#09090f; padding:18px; border:1px solid var(--border-color); border-radius:5px; margin-bottom:12px; cursor:pointer;" onclick="App.openThread('${t.id}')">
                        <div style="font-weight:bold; font-size:16px; color:#fff;">${t.title}</div>
                        <div style="font-size:11px; color:#444; margin-top:6px;">Автор: <span style="color:#aaa;">${t.creator}</span></div>
                    </div>
                `;
            }
        }
        view.innerHTML = html;
    },
    openThread(id) { 
        this.activeThreadId = id; 
        this.render(); 
    },
    renderThread(view, node) {
        if(!node.threads || !node.threads[this.activeThreadId]) return;
        const thread = node.threads[this.activeThreadId];
        let html = `<button class="btn-core" style="background:#1c1c30; margin-bottom:20px; padding:6px 14px; font-size:11px;" onclick="App.route('${this.activeNodeKey}')">↩ Назад</button>
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
                            <img class="avatar-round" src="${u.avatar}">
                            <div style="margin-top:12px;"><span class="${u.glow}" style="font-size:14px;">${p.author}${vHtml}</span></div>
                            <div class="badge-role ${u.badge}">${(u.badge || 'user').replace('badge-', '').toUpperCase()}</div>
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
        
        const newPost = { author: this.user, text: text };
        firebase.database().ref('nodes/' + this.activeNodeKey + '/threads/' + this.activeThreadId + '/posts').push(newPost)
        .then(() => {
            document.getElementById('post-reply-text').value = '';
        });
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
