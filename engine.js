// ==========================================================================
// XENFORO PLATFORM SPA ENGINE v6.0.0 (MONOLITHIC RUNTIME)
// ==========================================================================

/**
 * Инициализация глобального реестра аккаунтов.
 * Выполняется один раз при первичном запуске сайта.
 */
function initializeDatabase() {
    if (!localStorage.getItem('forum_users_db')) {
        const initialUsers = {
            'Qumestlies_Shawty': { 
                password: '123', 
                group: 'founder', 
                verified: true, 
                avatar: 'https://i.postimg.cc/mDCHYg8g/aries.png' 
            },
            'Sam_Mason': { 
                password: '123', 
                group: 'ga', 
                verified: true, 
                avatar: 'https://i.postimg.cc/44f88S6n/user1.png' 
            },
            'Aries_Player': { 
                password: '123', 
                group: 'user', 
                verified: false, 
                avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' 
            }
        };
        localStorage.setItem('forum_users_db', JSON.stringify(initialUsers));
    }

    if (!localStorage.getItem('forum_content_db')) {
        const initialContent = {
            chat: {
                title: 'Общий чат игроков',
                threads: [
                    {
                        id: 'th-default-1',
                        title: 'Официальный запуск нового веб-портала Aries RP',
                        creator: 'Qumestlies_Shawty',
                        posts: [
                            { 
                                author: 'Qumestlies_Shawty', 
                                text: 'Приветствуем всех игроков! Мы полностью обновили движок форума. Теперь база данных работает автономно в вашем браузере, аватарки загружаются напрямую с компьютера, а верификация полностью соответствует оригинальным алгоритмам XenForo.' 
                            },
                            { 
                                author: 'Sam_Mason', 
                                text: 'Прекрасная работа. Проверил систему изменения профилей — всё работает моментально и без задержек!' 
                            }
                        ]
                    }
                ]
            },
            gos: { title: 'Государственные структуры', threads: [] },
            ghetto: { title: 'Уличные группировки (Ghetto)', threads: [] },
            complaints: { title: 'Жалобы на администрацию', threads: [] }
        };
        localStorage.setItem('forum_content_db', JSON.stringify(initialContent));
    }
}

// Запуск инициализации данных
initializeDatabase();

// Глобальные переменные рантайма
let forumUsers = JSON.parse(localStorage.getItem('forum_users_db'));
let forumData = JSON.parse(localStorage.getItem('forum_content_db'));
let activeNode = 'chat';
let activeThread = null;
let currentUser = localStorage.getItem('forum_session_user') || null;
let isRegisterMode = false;

// Сохранение изменений рантайма в локальное хранилище браузера
function synchronizationStorage() {
    localStorage.setItem('forum_users_db', JSON.stringify(forumUsers));
    localStorage.setItem('forum_content_db', JSON.stringify(forumData));
}

/**
 * Аутентификация и контроль сессий
 */
function updateAuthStatusBar() {
    const block = document.getElementById('auth-top-block');
    if (currentUser) {
        const user = forumUsers[currentUser] || { group: 'user' };
        let styleClass = 'xf-glow-user';
        
        if (user.group === 'founder') styleClass = 'xf-glow-founder';
        else if (user.group === 'ga') styleClass = 'xf-glow-ga';
        else if (user.group === 'admin') styleClass = 'xf-glow-admin';

        block.innerHTML = `
            Добро пожаловать, <span class="${styleClass}" style="cursor:pointer; font-weight:700;" onclick="openUserProfile('${currentUser}')">${currentUser}</span>
            <span style="color:#2a2a42; margin:0 10px;">|</span>
            <a href="#" onclick="processLogout(event)" style="color:var(--xf-red); text-decoration:none; font-weight:600;">Выйти</a>
        `;
    } else {
        block.innerHTML = `
            <button class="xf-btn" style="padding:6px 14px; font-size:11px;" onclick="openAuthModal(false)">Войти</button>
            <button class="xf-btn" style="padding:6px 14px; font-size:11px; background:#1b1b2a; border:1px solid #2a2a42; margin-left:6px;" onclick="openAuthModal(true)">Регистрация</button>
        `;
    }
    evaluateAdminPrivileges();
}

function openAuthModal(regMode) {
    isRegisterMode = regMode;
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    renderAuthFormActions();
    document.getElementById('modal-auth').style.display = 'flex';
}

function renderAuthFormActions() {
    const title = document.getElementById('auth-modal-title');
    const container = document.getElementById('auth-action-box');
    
    if (isRegisterMode) {
        title.innerText = "Создание учетной записи";
        container.innerHTML = `
            <button class="xf-btn" style="width:100%; padding:14px;" onclick="processRegister()">Зарегистрировать аккаунт</button>
            <p style="font-size:12px; text-align:center; color:#8f8f9f; margin-top:15px; cursor:pointer; margin-bottom:0;" onclick="changeAuthMode(false)">Уже зарегистрированы? Авторизоваться</p>
        `;
    } else {
        title.innerText = "Авторизация на портале";
        container.innerHTML = `
            <button class="xf-btn" style="width:100%; padding:14px;" onclick="processLogin()">Выполнить вход</button>
            <p style="font-size:12px; text-align:center; color:#8f8f9f; margin-top:15px; cursor:pointer; margin-bottom:0;" onclick="changeAuthMode(true)">Новый пользователь? Создать аккаунт</p>
        `;
    }
}

function changeAuthMode(mode) {
    isRegisterMode = mode;
    renderAuthFormActions();
}

function processRegister() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!username || !password) return alert('Ошибка: Все поля ввода обязательны к заполнению.');
    if (username.length < 3) return alert('Ошибка: Никнейм не может быть короче 3-х символов.');
    if (forumUsers[username]) return alert('Ошибка: Пользователь с таким никнеймом уже зарегистрирован.');

    forumUsers[username] = {
        password: password,
        group: 'user',
        verified: false,
        avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png'
    };
    
    synchronizationStorage();
    currentUser = username;
    localStorage.setItem('forum_session_user', currentUser);
    
    closeModal('modal-auth');
    updateAuthStatusBar();
    renderContentArea();
}

function processLogin() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!username || !password) return alert('Ошибка: Введите регистрационные данные.');
    
    const targetUser = forumUsers[username];
    if (!targetUser || targetUser.password !== password) {
        return alert('Ошибка: Неверное имя пользователя или секретный пароль.');
    }

    currentUser = username;
    localStorage.setItem('forum_session_user', currentUser);
    
    closeModal('modal-auth');
    updateAuthStatusBar();
    renderContentArea();
}

function processLogout(event) {
    event.preventDefault();
    currentUser = null;
    localStorage.removeItem('forum_session_user');
    updateAuthStatusBar();
    renderContentArea();
}

function evaluateAdminPrivileges() {
    const btn = document.getElementById('admin-panel-btn');
    if (!currentUser) {
        btn.style.display = 'none';
        return;
    }
    const user = forumUsers[currentUser];
    if (user && (user.group === 'founder' || user.group === 'ga' || user.group === 'admin')) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

/**
 * Системный конвертер файлов и менеджер аватарок
 */
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 3145728) return alert('Ошибка: Максимальный размер аватара не должен превышать 3 МБ.');

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Content = e.target.result;
        if (forumUsers[currentUser]) {
            forumUsers[currentUser].avatar = base64Content;
            synchronizationStorage();
            document.getElementById('p-ava').src = base64Content;
            renderContentArea();
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Движок рендеринга контента (SPA Router / Renderer)
 */
function switchNode(nodeKey) {
    if (!forumData[nodeKey]) return;
    activeNode = nodeKey;
    activeThread = null;
    
    document.querySelectorAll('.xf-node-row').forEach(element => {
        element.classList.remove('active');
    });
    document.getElementById(`n-${nodeKey}`).classList.add('active');
    renderContentArea();
}

function renderContentArea() {
    const runtimeContainer = document.getElementById('xen-content-render');
    const targetNode = forumData[activeNode];
    
    if (activeThread) {
        renderThreadContext(runtimeContainer);
        return;
    }

    let nodeHeaderHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:25px; align-items:center;">
            <h2 style="margin:0; text-transform:uppercase; font-size:20px; letter-spacing:0.5px; font-weight:800;">
                ${targetNode.title}
            </h2>
            <button class="xf-btn" onclick="openThreadCreationForm()">+ Создать новую тему</button>
        </div>
    `;

    if (targetNode.threads.length === 0) {
        nodeHeaderHTML += `
            <div style="text-align:center; padding:60px 20px; color:#555566; background:var(--bg-canvas); border:1px dashed var(--border-weak); border-radius:4px;">
                <p style="margin:0; font-size:15px; font-weight:500;">В данном разделе обсуждения отсутствуют</p>
                <p style="margin:5px 0 0 0; font-size:12px;">Станьте первым, кто создаст тему в этом узле!</p>
            </div>
        `;
    } else {
        targetNode.threads.forEach(thread => {
            nodeHeaderHTML += `
                <div class="xf-thread-row" onclick="loadThreadContext('${thread.id}')">
                    <div>
                        <div style="font-weight:700; color:#ffffff; font-size:15px; line-height:1.4;">${thread.title}</div>
                        <div style="font-size:12px; color:#6f6f7f; margin-top:6px; display:flex; align-items:center;">
                            Автор темы: <span style="color:#a5a5b5; margin-left:4px; font-weight:600;">${thread.creator}</span>
                            <span style="margin:0 8px;">•</span>
                            Сообщений: ${thread.posts.length}
                        </div>
                    </div>
                    <div style="font-size:20px; color:var(--border-strong);">➔</div>
                </div>
            `;
        });
    }
    runtimeContainer.innerHTML = nodeHeaderHTML;
}

function loadThreadContext(id) {
    activeThread = id;
    renderContentArea();
}

function renderThreadContext(container) {
    const thread = forumData[activeNode].threads.find(t => t.id === activeThread);
    if (!thread) {
        activeThread = null;
        renderContentArea();
        return;
    }

    let threadHTML = `
        <button class="xf-btn" style="background:#1b1b2a; border:1px solid var(--border-medium); margin-bottom:20px;" onclick="exitThreadContext()">
            ↩ Возврат в раздел
        </button>
        <h2 style="margin:0 0 25px 0; font-size:22px; font-weight:800; color:#ffffff; border-bottom:1px solid var(--border-weak); padding-bottom:15px;">
            ${thread.title}
        </h2>
    `;

    thread.posts.forEach(post => {
        const userMeta = forumUsers[post.author] || { group: 'user', verified: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
        
        let groupClass = 'xf-glow-user';
        let bannerClass = 'xf-banner-user';
        let bannerTitle = 'Пользователь';

        if (userMeta.group === 'founder') {
            groupClass = 'xf-glow-founder'; bannerClass = 'xf-banner-founder'; bannerTitle = 'Основатель';
        } else if (userMeta.group === 'ga') {
            groupClass = 'xf-glow-ga'; bannerClass = 'xf-banner-ga'; bannerTitle = 'Гл. Администратор';
        } else if (userMeta.group === 'admin') {
            groupClass = 'xf-glow-admin'; bannerClass = 'xf-banner-admin'; bannerTitle = 'Администратор';
        }

        const verificationBadge = userMeta.verified ? `<span class="instagram-verified-badge"></span>` : '';

        threadHTML += `
            <div class="xf-post-block">
                <div class="xf-post-userzone">
                    <img class="xf-post-avatar" src="${userMeta.avatar}" onclick="openUserProfile('${post.author}')">
                    <div style="margin-top:10px; font-weight:700; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        <span class="${groupClass}">${post.author}</span>${verificationBadge}
                    </div>
                    <div class="xf-user-banner ${bannerClass}">${bannerTitle}</div>
                </div>
                <div class="xf-post-main">
                    <div style="white-space:pre-wrap; word-break:break-word;">${post.text}</div>
                </div>
            </div>
        `;
    });

    if (currentUser) {
        threadHTML += `
            <div style="margin-top:30px; background:var(--bg-canvas); padding:20px; border-radius:4px; border:1px solid var(--border-weak);">
                <label style="font-size:11px; color:#8f8f9f; display:block; margin-bottom:8px; text-transform:uppercase; font-weight:700;">Быстрый ответ от имени ${currentUser}</label>
                <textarea class="xf-input" id="thread-reply-textarea" rows="5" placeholder="Введите текст вашего сообщения..."></textarea>
                <button class="xf-btn" onclick="submitPostReply()">Опубликовать ответ</button>
            </div>
        `;
    } else {
        threadHTML += `
            <div style="text-align:center; padding:20px; color:#6f6f7f; margin-top:25px; background:#0e0e16; border-radius:4px; border:1px solid var(--border-weak);">
                Чтобы принять участие в обсуждении, вам необходимо <a href="#" style="color:var(--xf-red); font-weight:700;" onclick="openAuthModal(false)">Авторизоваться</a> или <a href="#" style="color:#fff; font-weight:700;" onclick="openAuthModal(true)">Зарегистрироваться</a>
            </div>
        `;
    }

    container.innerHTML = threadHTML;
}

function exitThreadContext() {
    activeThread = null;
    renderContentArea();
}

function submitPostReply() {
    const text = document.getElementById('thread-reply-textarea').value.trim();
    if (!text) return alert('Ошибка: Нельзя отправить пустое сообщение.');

    const thread = forumData[activeNode].threads.find(t => t.id === activeThread);
    thread.posts.push({
        author: currentUser,
        text: text
    });

    synchronizationStorage();
    renderContentArea();
}

function openThreadCreationForm() {
    if (!currentUser) return alert('Ошибка: Создавать новые обсуждения могут только авторизованные пользователи.');
    
    const container = document.getElementById('xen-content-render');
    container.innerHTML = `
        <h2 style="margin:0 0 20px 0; text-transform:uppercase; font-size:20px; font-weight:800;">Создание новой темы в разделе</h2>
        <div style="background:var(--bg-canvas); padding:25px; border-radius:4px; border:1px solid var(--border-weak);">
            <label style="font-size:11px; color:#8f8f9f; display:block; margin-bottom:5px; text-transform:uppercase;">Название темы обсуждения</label>
            <input class="xf-input" id="new-thread-title" placeholder="Кратко сформулируйте суть темы">
            
            <label style="font-size:11px; color:#8f8f9f; display:block; margin-bottom:5px; text-transform:uppercase;">Содержимое первого сообщения</label>
            <textarea class="xf-input" id="new-thread-text" rows="8" placeholder="Опишите проблему или предложение детально..."></textarea>
            
            <div style="margin-top:10px;">
                <button class="xf-btn" onclick="submitNewThread()">Опубликовать тему</button>
                <button class="xf-btn" style="background:#1b1b2a; border:1px solid var(--border-medium);" onclick="exitThreadContext()">Отмена</button>
            </div>
        </div>
    `;
}

function submitNewThread() {
    const title = document.getElementById('new-thread-title').value.trim();
    const text = document.getElementById('new-thread-text').value.trim();

    if (!title || !text) return alert('Ошибка: Заполните заголовок и текст публикации.');

    const generatedID = 'th-' + Date.now();
    forumData[activeNode].threads.push({
        id: generatedID,
        title: title,
        creator: currentUser,
        posts: [{ author: currentUser, text: text }]
    });

    synchronizationStorage();
    activeThread = generatedID;
    renderContentArea();
}

/**
 * Профили и Модальное управление инфраструктурой
 */
function openUserProfile(name) {
    const user = forumUsers[name];
    if (!user) return;

    document.getElementById('p-ava').src = user.avatar;
    document.getElementById('p-nick').innerText = name;
    document.getElementById('p-banner').innerText = user.group.toUpperCase();

    const bannerElement = document.getElementById('p-banner');
    bannerElement.className = 'xf-user-banner';
    if (user.group === 'founder') bannerElement.classList.add('xf-banner-founder');
    else if (user.group === 'ga') bannerElement.classList.add('xf-banner-ga');
    else if (user.group === 'admin') bannerElement.classList.add('xf-banner-admin');
    else bannerElement.classList.add('xf-banner-user');

    const labelUploader = document.getElementById('p-upload-label');
    if (name === currentUser) {
        labelUploader.style.display = 'block';
    } else {
        labelUploader.style.display = 'none';
    }

    document.getElementById('modal-profile').style.display = 'flex';
}

function openAdminModal() {
    const selector = document.getElementById('adm-user');
    selector.innerHTML = '';
    
    for (let username in forumUsers) {
        selector.innerHTML += `<option value="${username}">${username}</option>`;
    }
    document.getElementById('modal-admin').style.display = 'flex';
}

function saveAdminData() {
    const selectedUser = document.getElementById('adm-user').value;
    const selectedGroup = document.getElementById('adm-group').value;
    const isVerified = document.getElementById('adm-ver').value === 'yes';

    if (forumUsers[selectedUser]) {
        forumUsers[selectedUser].group = selectedGroup;
        forumUsers[selectedUser].verified = isVerified;
        
        synchronizationStorage();
        closeModal('modal-admin');
        updateAuthStatusBar();
        renderContentArea();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Первичный запуск системных процессов
updateAuthStatusBar();
renderContentArea();
