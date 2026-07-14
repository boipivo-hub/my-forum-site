// ==========================================================================
// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v11.5 (STABLE FULL VERSION)
// SECURITY LEVEL: ULTRA (EMAIL LINK + GOOGLE AUTHENTICATION)
// DEVELOPED FOR: Qumestlies_Shawty
// ==========================================================================

// Конфигурация Firebase (Данные твоего проекта)
const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM", 
    authDomain: "aries-forum.firebaseapp.com",
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "aries-forum",
    storageBucket: "aries-forum.appspot.com",
    messagingSenderId: "614643963857",
    appId: "1:614643963857:web:01f1f941c72249ac6eb2f0"
};

// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const dbRef = firebase.database().ref();
const auth = firebase.auth();

// Глобальные переменные состояния
let GlobalUsers = {};
let GlobalNodes = {};
let isFirstLoad = true;
window.CloudFounders = [];

// ТВОИ ДАННЫЕ (Ультра-защита)
const MASTER_EMAIL = "ariessupporttest@gmail.com";
const MASTER_NICK = "Qumestlies_Shawty";

// ==========================================================================
// МОДУЛЬ ЗАЩИТЫ: ОБРАБОТКА ВХОДА (MAGIC LINK & GOOGLE)
// ==========================================================================

// Универсальная функция синхронизации профиля с БД
async function syncUserProfile(user, customNick = null) {
    if (!user || !user.email) return;
    const userKey = user.email.replace(/\./g, ',');
    
    // Проверяем существование записи в БД перед созданием
    const snap = await dbRef.child('users/' + userKey).once('value');
    if(!snap.exists()) {
        console.log("Регистрация нового профиля в Cloud Database...");
        await dbRef.child('users/' + userKey).set({
            nick: (user.email === MASTER_EMAIL) ? MASTER_NICK : (customNick || user.displayName || "User_" + Math.floor(Math.random()*9999)),
            email: user.email,
            glow: (user.email === MASTER_EMAIL) ? 'glow-founder' : 'glow-user',
            badge: (user.email === MASTER_EMAIL) ? 'badge-founder' : 'badge-user',
            verify: (user.email === MASTER_EMAIL) ? 'v-blue-fill' : 'none',
            banned: false,
            avatar: user.photoURL || 'https://i.postimg.cc/9Q2g9g6y/user2.png'
        });
    }
    
    // Сохраняем ключ в локальное хранилище для моментального подхвата
    localStorage.setItem('active_session_key', userKey);
    App.userKey = userKey;
    App.syncUI(); // Сразу обновляем интерфейс
}

// Функция обработки входящей ссылки (Magic Link)
async function handleEmailLinkSignIn() {
    if (auth.isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        
        if (!email) {
            email = window.prompt('Для подтверждения безопасности введите ваш Email еще раз:');
        }
        
        if (email) {
            try {
                console.log("Попытка активации Magic Link для:", email);
                const result = await auth.signInWithEmailLink(email, window.location.href);
                
                const nick = window.localStorage.getItem('nickForSignIn');
                window.localStorage.removeItem('emailForSignIn');
                window.localStorage.removeItem('nickForSignIn');

                // Создаем профиль в базе
                await syncUserProfile(result.user, nick);
                
                // Очищаем URL и перезагружаем страницу для чистой сессии
                window.history.replaceState({}, document.title, window.location.pathname);
                location.reload();
            } catch (error) {
                console.error("Auth Error:", error);
                alert("Ошибка авторизации: Ссылка невалидна или просрочена. Попробуйте запросить новую.");
            }
        }
    }
}

// Глобальный слушатель авторизации
auth.onAuthStateChanged(async (user) => {
    if (user && user.email) {
        const userKey = user.email.replace(/\./g, ',');
        localStorage.setItem('active_session_key', userKey);
        App.userKey = userKey;
        
        // Если профиля еще нет в загруженных данных, пробуем создать принудительно
        if (Object.keys(GlobalUsers).length > 0 && !GlobalUsers[userKey]) {
            await syncUserProfile(user);
        }
        
        if (!isFirstLoad) App.syncUI();
    } else {
        App.userKey = null;
        if (!isFirstLoad) App.syncUI();
    }
});

// ==========================================================================
// ОСНОВНОЙ СИНХРОНИЗАТОР ДАННЫХ (REALTIME DATABASE)
// ==========================================================================

dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    
    GlobalUsers = data.users || {};
    GlobalNodes = data.nodes || {};
    window.CloudFounders = data.founders || [];
    
    // Авто-создание структуры проекта, если база пустая
    if (!data.nodes) {
        dbRef.child('nodes/main').set({
            title: '📢 Общий раздел проекта',
            path: 'Aries Role Play / Основное',
            threads: {
                't-init': { 
                    id: 't-init', 
                    title: 'Добро пожаловать!', 
                    creator: 'System', 
                    posts: { "p1": { author: 'System', text: 'Форум успешно запущен на базе Cloud Engine v11.5' } } 
                }
            }
        });
    }

    if (isFirstLoad) {
        const savedKey = localStorage.getItem('active_session_key');
        if (savedKey && GlobalUsers[savedKey] && !GlobalUsers[savedKey].banned) {
            App.userKey = savedKey;
        } else if (savedKey && GlobalUsers[savedKey]?.banned) {
            localStorage.removeItem('active_session_key');
            auth.signOut();
            App.userKey = null;
        }
        isFirstLoad = false;
        // Проверяем ссылку на вход только после первой загрузки БД
        handleEmailLinkSignIn();
    }

    App.syncUI();
});

// ==========================================================================
// МОДУЛЬ 1: АВТОРИЗАЦИЯ (MAGIC LINK & GOOGLE SYSTEM)
// ==========================================================================

const AuthModule = {
    open() {
        const modal = document.getElementById('m-auth');
        if (modal) modal.style.display = 'flex';
        
        document.getElementById('auth-btn-container').innerHTML = `
            <button class="btn-core" style="width:100%; background:#4285F4; margin-bottom:12px; display:flex; align-items:center; justify-content:center; gap:10px;" onclick="AuthModule.googleSignIn()">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18"> Войти через Google
            </button>
            <button class="btn-core" style="width:100%;" onclick="AuthModule.sendLink()">Отправить ссылку на почту</button>
        `;
    },
    close() { document.getElementById('m-auth').style.display = 'none'; },
    
    googleSignIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(async (result) => {
                await syncUserProfile(result.user);
                this.close();
                location.reload();
            })
            .catch((error) => {
                alert('Ошибка Google: ' + error.message);
            });
    },

    sendLink() {
        const email = document.getElementById('f-email').value.trim();
        const nick = document.getElementById('f-user').value.trim();
        
        if (!email || !nick) return alert('Введите ник и электронную почту!');
        
        const actionCodeSettings = {
            url: window.location.origin + window.location.pathname,
            handleCodeInApp: true
        };

        auth.sendSignInLinkToEmail(email, actionCodeSettings)
            .then(() => {
                window.localStorage.setItem('emailForSignIn', email);
                window.localStorage.setItem('nickForSignIn', nick);
                alert('Успешно! Мы отправили письмо на почту ' + email + '. Нажми на ссылку в письме.');
                this.close();
            })
            .catch((error) => {
                alert('Ошибка Firebase: ' + error.message);
            });
    },
    
    logout() {
        auth.signOut().then(() => {
            localStorage.removeItem('active_session_key');
            App.userKey = null;
            App.syncUI();
            location.reload();
        });
    }
};

// ==========================================================================
// МОДУЛЬ 2: АДМИН-ПАНЕЛЬ (УЛЬТРА-ДОСТУП)
// ==========================================================================

const AdminPanel = {
    open() {
        const u = GlobalUsers[App.userKey];
        const hasAccess = u && (u.email === MASTER_EMAIL || window.CloudFounders.includes(u.nick));
        
        if (!hasAccess) return alert('Критическая ошибка доступа: Вы не являетесь Создателем проекта.');
        
        document.getElementById('m-admin').style.display = 'flex';
        this.renderUsersSelect();
        this.renderFoundersList();
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },

    renderUsersSelect() {
        const sel = document.getElementById('adm-target-user');
        if(!sel) return;
        sel.innerHTML = '';
        for (let key in GlobalUsers) {
            sel.innerHTML += `<option value="${key}">${GlobalUsers[key].nick} (${GlobalUsers[key].email})</option>`;
        }
    },

    addFounder() {
        const nick = document.getElementById('add-founder-nick').value.trim();
        if (!nick) return;
        if (!window.CloudFounders.includes(nick)) {
            window.CloudFounders.push(nick);
            dbRef.child('founders').set(window.CloudFounders).then(() => {
                document.getElementById('add-founder-nick').value = '';
                this.renderFoundersList();
            });
        }
    },

    removeFounder(nick) {
        if (nick === MASTER_NICK) return alert('Главного создателя нельзя удалить!');
        window.CloudFounders = window.CloudFounders.filter(n => n !== nick);
        dbRef.child('founders').set(window.CloudFounders).then(() => this.renderFoundersList());
    },

    renderFoundersList() {
        const block = document.getElementById('cloud-founders-list');
        if(!block) return;
        let html = '<b>Founders:</b><br>';
        window.CloudFounders.forEach(n => {
            html += `<span style="color:red; cursor:pointer; margin-right:8px;" onclick="AdminPanel.removeFounder('${n}')">${n}</span> `;
        });
        block.innerHTML = html;
    },

    save() {
        const targetKey = document.getElementById('adm-target-user').value;
        const glow = document.getElementById('adm-set-glow').value;
        const badge = document.getElementById('adm-set-badge').value;
        const verify = document.getElementById('adm-set-verify').value;
        const isBan = document.getElementById('adm-set-ban').value === 'yes';

        dbRef.child('users/' + targetKey).update({
            glow: isBan ? 'glow-banned' : glow,
            badge: isBan ? 'badge-banned' : badge,
            verify: isBan ? 'none' : verify,
            banned: isBan
        }).then(() => {
            alert('Настройки обновлены.');
            this.close();
        });
    }
};

// ==========================================================================
// МОДУЛЬ 3: ДИСПЕТЧЕР ИНТЕРФЕЙСА (APP CORE)
// ==========================================================================

const App = {
    userKey: null,
    activeNodeKey: 'main',
    activeThreadId: null,

    syncUI() {
        this.renderAuthBar();
        this.renderSidebar();
        this.checkAdminPrivileges();
        this.renderContent();
    },

    renderAuthBar() {
        const zone = document.getElementById('runtime-auth-zone');
        if (!zone) return;
        
        if (this.userKey && GlobalUsers[this.userKey]) {
            const u = GlobalUsers[this.userKey];
            const v = (u.verify && u.verify !== 'none') ? `<span class="verified-badge ${u.verify}"></span>` : '';
            zone.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${u.avatar}" class="avatar-mini" onclick="ProfileCore.open()">
                    <span class="${u.glow}" style="font-weight:bold; cursor:pointer;" onclick="ProfileCore.open()">${u.nick}${v}</span>
                    <button class="btn-core" style="padding:6px 10px; font-size:10px; background:#1a1a2e;" onclick="AuthModule.logout()">Выйти</button>
                </div>
            `;
        } else {
            zone.innerHTML = `<button class="btn-core" onclick="AuthModule.open()">Войти / Создать</button>`;
        }
    },

    renderSidebar() {
        const nav = document.getElementById('nodes-navigation-list');
        if (!nav) return;
        nav.innerHTML = `<div class="sidebar-title">Навигация проекта</div>`;
        for (let key in GlobalNodes) {
            const active = (this.activeNodeKey === key) ? 'active' : '';
            nav.innerHTML += `<div class="nav-link ${active}" onclick="App.route('${key}')">${GlobalNodes[key].title}</div>`;
        }
    },

    checkAdminPrivileges() {
        const u = GlobalUsers[this.userKey];
        if (u && (u.email === MASTER_EMAIL || window.CloudFounders.includes(u.nick))) {
            if (!document.getElementById('ui-admin-btn')) {
                const nav = document.getElementById('nodes-navigation-list');
                const btnAdm = document.createElement('button');
                btnAdm.id = 'ui-admin-btn';
                btnAdm.className = 'btn-core';
                btnAdm.style.cssText = 'width:100%; margin-top:20px; background:red;';
                btnAdm.innerHTML = '🛡️ Админка';
                btnAdm.onclick = () => AdminPanel.open();
                nav.appendChild(btnAdm);

                const btnNode = document.createElement('button');
                btnNode.className = 'btn-core';
                btnNode.style.cssText = 'width:100%; margin-top:8px; background:#1c1c30;';
                btnNode.innerHTML = '➕ Новый раздел';
                btnNode.onclick = () => NodeManager.open();
                nav.appendChild(btnNode);
            }
        }
    },

    route(key) {
        this.activeNodeKey = key;
        this.activeThreadId = null;
        this.syncUI();
    },

    renderContent() {
        const view = document.getElementById('render-forum-core');
        if (!view) return;
        const node = GlobalNodes[this.activeNodeKey];
        
        if (!node) {
            view.innerHTML = `<h3>Загрузка контента...</h3>`;
            return;
        }

        if (this.activeThreadId) {
            this.renderThread(view, node);
            return;
        }

        let html = `<h2>${node.title}</h2><button class="btn-core" onclick="App.formCreateThread()">+ Создать тему</button><hr style="border:0; border-top:1px solid var(--border-color); margin: 20px 0;">`;

        if (node.threads) {
            for (let tid in node.threads) {
                const t = node.threads[tid];
                html += `<div class="topic-link" onclick="App.openThread('${tid}')">${t.title} <br><small style="color:#555;">Автор: ${t.creator}</small></div>`;
            }
        } else {
            html += `<p style="text-align:center; padding:40px; color:#444;">В этом разделе пока нет тем.</p>`;
        }
        view.innerHTML = html;
    },

    openThread(id) {
        this.activeThreadId = id;
        this.renderContent();
    },

    renderThread(view, node) {
        const thread = node.threads[this.activeThreadId];
        let html = `<button class="btn-core" style="background:#222; margin-bottom:15px;" onclick="App.route('${this.activeNodeKey}')">Назад</button><h3>${thread.title}</h3>`;

        if (thread.posts) {
            Object.values(thread.posts).forEach(p => {
                let author = { nick: p.author, glow: 'glow-user', avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
                for(let k in GlobalUsers) { if(GlobalUsers[k].nick === p.author) author = GlobalUsers[k]; }
                html += `<div class="post-row" style="padding:15px; border:1px solid #1c1c30; border-radius:6px; margin-bottom:10px; background:#08080d;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <img src="${author.avatar}" class="avatar-mini">
                        <span class="${author.glow}" style="font-weight:bold;">${p.author}</span>
                    </div>
                    <div class="post-text-zone">${p.text}</div>
                </div>`;
            });
        }

        if (this.userKey) {
            html += `<textarea id="reply-text" class="input-field" rows="4" placeholder="Напишите ответ..."></textarea><button class="btn-core" onclick="App.sendReply()">Отправить ответ</button>`;
        }
        view.innerHTML = html;
    },

    sendReply() {
        const text = document.getElementById('reply-text').value.trim();
        if (!text) return;
        dbRef.child(`nodes/${this.activeNodeKey}/threads/${this.activeThreadId}/posts`).push({
            author: GlobalUsers[this.userKey].nick,
            text: text
        });
    },

    formCreateThread() {
        if (!this.userKey) return alert('Войдите в аккаунт!');
        document.getElementById('render-forum-core').innerHTML = `
            <h2>Новая тема</h2>
            <input type="text" id="nt-title" class="input-field" placeholder="Заголовок темы">
            <textarea id="nt-text" class="input-field" rows="8" placeholder="Текст сообщения..."></textarea>
            <button class="btn-core" onclick="App.submitThread()">Опубликовать тему</button>
        `;
    },

    submitThread() {
        const title = document.getElementById('nt-title').value.trim();
        const text = document.getElementById('nt-text').value.trim();
        const tid = 't-' + Date.now();
        dbRef.child(`nodes/${this.activeNodeKey}/threads/${tid}`).set({
            id: tid, title: title, creator: GlobalUsers[this.userKey].nick,
            posts: { "p1": { author: GlobalUsers[this.userKey].nick, text: text } }
        }).then(() => { this.activeThreadId = tid; this.renderContent(); });
    }
};

const ProfileCore = {
    open() {
        const u = GlobalUsers[App.userKey];
        if (!u) return;
        document.getElementById('m-profile').style.display = 'flex';
        document.getElementById('new-profile-nick').value = u.nick;
        document.getElementById('my-profile-avatar-view').src = u.avatar;
    },
    close() { document.getElementById('m-profile').style.display = 'none'; },
    upload(e) {
        const reader = new FileReader();
        reader.onload = (event) => document.getElementById('my-profile-avatar-view').src = event.target.result;
        reader.readAsDataURL(e.target.files[0]);
    },
    saveData() {
        dbRef.child('users/' + App.userKey).update({ 
            nick: document.getElementById('new-profile-nick').value.trim(), 
            avatar: document.getElementById('my-profile-avatar-view').src 
        }).then(() => { alert("Профиль обновлен!"); this.close(); });
    }
};

const NodeManager = {
    open() { document.getElementById('m-create-node').style.display = 'flex'; },
    close() { document.getElementById('m-create-node').style.display = 'none'; },
    submit() {
        const nid = 'node_' + Date.now();
        dbRef.child('nodes/' + nid).set({ 
            title: document.getElementById('node-new-title').value.trim(), 
            path: document.getElementById('node-new-path').value.trim() 
        }).then(() => this.close());
    }
};

// Инициализация при загрузке
window.onload = () => { App.syncUI(); };

// ==========================================================================
// END OF ENGINE.JS - ARIES ROLE PLAY CLOUD v11.5 ULTRA FULL
// ==========================================================================
