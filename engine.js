// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v8.0 (FIREBASE INTEGRATION)
// ==========================================================================

// Инициализация Firebase с твоей базой данных
const firebaseConfig = {
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/" 
};
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref();

// Глобальное оперативное состояние клиента
let GlobalUsers = {};
let GlobalNodes = {};

// Слушаем изменения в облаке в реальном времени
dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    
    // Синхронизируем локальные объекты с сервером
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    
    // Если облако пустое (первый запуск), создаем начальную структуру
    if (!data.users || !data.users['Qumestlies_Shawtys']) {
        GlobalUsers['Qumestlies_Shawtys'] = {
            password: 'sxdqamigosxdqs',
            glow: 'glow-founder',
            badge: 'badge-founder',
            banned: false,
            avatar: 'https://i.postimg.cc/mDCHYg8g/aries.png'
        };
        GlobalNodes = {
            'dev_news': { 
                title: '📢 Технические обновления разработчиков', 
                path: 'Официально / Разработка', 
                threads: {
                    't-1': { id: 't-1', title: 'Форум успешно переведен на глобальную базу данных!', creator: 'Qumestlies_Shawtys', posts: [{ author: 'Qumestlies_Shawtys', text: 'Теперь все пользователи видят действия друг друга в реальном времени.' }] }
                }
            },
            'comp_adm': { title: '🔨 Жалобы на Администрацию', path: 'Жалобы / Администрация', threads: {} },
            'org_fbi': { title: '🕵️‍♂️ [Гос] Federal Bureau of Investigation', path: 'Организации / FBI', threads: {} },
            'org_grove': { title: '🟢 [Гетто] Grove Street Gang', path: 'Организации / Grove', threads: {} }
        };
        dbRef.set({ users: GlobalUsers, nodes: GlobalNodes });
    }
    
    // Обновляем отображение у всех игроков на экране автоматически
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
            document.getElementById('auth-title').innerText = "Вход на форум";
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
            password: p, glow: 'glow-user', badge: 'badge-user', banned: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
        }).then(() => {
            localStorage.setItem('active_session', u);
            App.user = u;
            this.close();
            window.location.reload();
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
        window.location.reload();
    },
    logout() {
        localStorage.removeItem('active_session');
        window.location.reload();
    }
};

// --- МОДУЛЬ 3: ПРОФИЛЬ ПРОЕКТА ---
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
            
            firebase.database().ref('users/' + newNick).set(backup);
            firebase.database().ref('users/' + App.user).remove();
            
            App.user = newNick;
            localStorage.setItem('active_session', newNick);
        } else {
            firebase.database().ref('users/' + App.user + '/avatar').set(base64Img);
        }
        this.close();
    }
};

// --- МОДУЛЬ 4: АДМИН-ПАНЕЛЬ ---
const AdminPanel = {
    open() {
        if(App.user !== 'Qumestlies_Shawtys') return alert('Вы не Создатель!');
        document.getElementById('m-admin').style.display = 'flex';
        this.loadUsersList();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
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
        document.getElementById('adm-set-ban').value = u.banned ? 'yes' : 'no';
    },
    save() {
        const target = document.getElementById('adm-target-user').value;
        if(!GlobalUsers[target]) return;
        
        let glowValue = document.getElementById('adm-set-glow').value;
        let badgeValue = document.getElementById('adm-set-badge').value;
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        
        if(isBan) {
            if(target === 'Qumestlies_Shawtys') return alert('Себя банить нельзя!');
            glowValue = 'glow-banned';
            badgeValue = 'badge-banned';
        }
        
        firebase.database().ref('users/' + target).update({
            glow: glowValue, badge: badgeValue, banned: isBan
        });
        this.close();
    }
};

// --- МОДУЛЬ 5: ДИСПЕТЧЕР ИНТЕРФЕЙСА ---
const App = {
    user: null,
    activeNodeKey: 'dev_news',
    activeThreadId: null,
    
    init() {
        this.user = localStorage.getItem('active_session');
        const sel = document.getElementById('adm-target-user');
        if(sel) { sel.onchange = () => AdminPanel.loadTargetUserData(); }
    },
    syncUI() {
        this.renderAuthBar();
        this.renderMenu();
        this.checkAdminButton();
        this.render();
    },
    renderAuthBar() {
        const bar = document.getElementById('runtime-auth-zone');
        if(!bar) return;
        if(this.user && GlobalUsers[this.user]) {
            const uData = GlobalUsers[this.user];
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
    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for(let key in GlobalNodes) {
            const activeClass = (this.activeNodeKey === key) ? 'active' : '';
            nav.innerHTML += `<a href="#" class="nav-link ${activeClass}" onclick="App.route('${key}')">${GlobalNodes[key].title}</a>`;
        }
    },
    checkAdminButton() {
        if (this.user === 'Qumestlies_Shawtys') {
            if (!document.getElementById('ui-adm-btn')) {
                const navMenu = document.getElementById('nodes-navigation-list');
                if (navMenu) {
                    const btn = document.createElement('button');
                    btn.id = 'ui-adm-btn'; btn.className = 'btn-core'; btn.style.width = '100%'; btn.style.marginTop = '20px';
                    btn.style.background = 'linear-gradient(135deg, #ff0055, #8a2387)';
                    btn.innerHTML = '🛡️ Панель Создателя';
                    btn.onclick = () => AdminPanel.open();
                    navMenu.appendChild(btn);
                }
            }
        } else {
            const existingBtn = document.getElementById('ui-adm-btn');
            if (existingBtn) existingBtn.remove();
        }
    },
    route(nodeKey) {
        this.activeNodeKey = nodeKey;
        this.activeThreadId = null;
        this.render();
    },
    render() {
        const view = document.getElementById('render-forum-core');
        if (!view) return;
        const node = GlobalNodes[this.activeNodeKey];
        if(!node) return;
        
        if(this.activeThreadId) { this.renderThread(view, node); return; }
        
        let html = `
            <div style="font-size:11px; color:#555; text-transform:uppercase; margin-bottom:5px; font-weight:bold;">${node.path}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
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
            thread.posts.forEach(p => {
                const u = GlobalUsers[p.author] || { glow: 'glow-user', badge: 'badge-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
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
        
        let thread = GlobalNodes[this.activeNodeKey].threads[this.activeThreadId];
        if(!thread.posts) thread.posts = [];
        thread.posts.push({ author: this.user, text: text });
        
        firebase.database().ref('nodes/' + this.activeNodeKey + '/threads/' + this.activeThreadId + '/posts').set(thread.posts);
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
            id: id, title: title, creator: this.user, posts: [{ author: this.user, text: text }]
        };
        
        firebase.database().ref('nodes/' + this.activeNodeKey + '/threads/' + id).set(newThread).then(() => {
            this.activeThreadId = id;
        });
    }
};

window.onload = () => { App.init(); };
