// ==========================================================================
// XENFORO ENGINE CORE EMULATOR v1.0.2
// ==========================================================================

let forumUsers = {
    'Qumestlies_Shawty': { group: 'founder', verified: true, avatar: 'https://i.postimg.cc/mDCHYg8g/aries.png' },
    'Sam_Mason': { group: 'ga', verified: true, avatar: 'https://i.postimg.cc/44f88S6n/user1.png' },
    'Tony_Stark': { group: 'admin', verified: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' },
    'Aries_Player': { group: 'user', verified: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' }
};

let forumData = {
    chat: {
        title: 'Общий чат игроков',
        threads: [
            {
                id: 't1', title: 'Добро пожаловать на обновленный веб-портал проекта!', creator: 'Qumestlies_Shawty', posts: [
                    { author: 'Qumestlies_Shawty', text: 'Мы переписали код форума, убрали баги и настроили кастомные стили отображения верификаций.' },
                    { author: 'Sam_Mason', text: 'Ура! Галочки как в инсте теперь работают стабильно!' }
                ]
            }
        ]
    },
    gos: { title: 'Государственные Организации', threads: [] },
    ghetto: { title: 'Уличные группировки', threads: [] },
    complaints: { title: 'Жалобы на администрацию', threads: [] }
};

let activeNode = 'chat';
let activeThread = null;

function switchNode(nodeKey) {
    activeNode = nodeKey;
    activeThread = null;
    document.querySelectorAll('.xf-node-row').forEach(el => el.classList.remove('active'));
    document.getElementById(`n-${nodeKey}`).classList.add('active');
    render();
}

function render() {
    let view = document.getElementById('xen-content-render');
    let node = forumData[activeNode];
    
    if (activeThread) {
        renderThread(view);
        return;
    }

    let html = `<div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                    <h2 style="margin:0; text-transform:uppercase;">${node.title}</h2>
                    <button class="xf-btn" onclick="openCreateThread()">+ Создать тему</button>
                </div>`;
                
    if(node.threads.length === 0) {
        html += `<p style="color:#555; text-align:center; padding-top:40px;">В этом разделе ещё нет тем.</p>`;
    } else {
        node.threads.forEach(t => {
            let u = forumUsers[t.creator] || { group: 'user' };
            html += `<div class="xf-thread-row" onclick="viewThread('${t.id}')">
                        <div>
                            <div style="font-weight:bold; color:#fff; font-size:15px;">${t.title}</div>
                            <div style="font-size:12px; color:#6f6f7f; margin-top:4px;">Автор: ${t.creator} | Ответов: ${t.posts.length - 1}</div>
                        </div>
                     </div>`;
        });
    }
    view.innerHTML = html;
}

function viewThread(id) {
    activeThread = id;
    render();
}

function renderThread(view) {
    let node = forumData[activeNode];
    let thread = node.threads.find(t => t.id === activeThread);
    
    let html = `<button class="xf-btn" style="background:#222; margin-bottom:15px;" onclick="backToNode()">↩ Назад</button>
                <h2 style="margin-bottom:20px; color:#fff;">${thread.title}</h2>`;
                
    thread.posts.forEach(p => {
        let u = forumUsers[p.author] || { group: 'user', verified: false, avatar: 'https://i.postimg.cc/9Q2g9g6y/user2.png' };
        let gClass = u.group === 'founder' ? 'xf-glow-founder' : (u.group === 'ga' ? 'xf-glow-ga' : 'xf-glow-user');
        let bClass = u.group === 'founder' ? 'xf-banner-founder' : (u.group === 'ga' ? 'xf-banner-ga' : 'xf-banner-user');
        let bTitle = u.group === 'founder' ? 'Основатель' : (u.group === 'ga' ? 'Гл. Администратор' : 'Пользователь');
        let check = u.verified ? `<span class="instagram-verified-badge"></span>` : '';

        html += `<div class="xf-post-block">
                    <div class="xf-post-userzone">
                        <img class="xf-post-avatar" src="${u.avatar}" onclick="viewProfile('${p.author}')">
                        <div style="margin-top:8px; font-weight:bold;"><span class="${gClass}">${p.author}</span>${check}</div>
                        <div class="xf-user-banner ${bClass}">${bTitle}</div>
                    </div>
                    <div class="xf-post-main">${p.text}</div>
                 </div>`;
    });

    html += `<div style="margin-top:20px;">
                <textarea class="xf-input" id="reply-text" rows="4" placeholder="Напишите ответ..."></textarea>
                <button class="xf-btn" onclick="sendReply()">Ответить</button>
             </div>`;
             
    view.innerHTML = html;
}

function sendReply() {
    let txt = document.getElementById('reply-text').value;
    if(!txt.trim()) return;
    let node = forumData[activeNode];
    let thread = node.threads.find(t => t.id === activeThread);
    thread.posts.push({ author: 'Qumestlies_Shawty', text: txt });
    render();
}

function backToNode() { activeThread = null; render(); }

function openCreateThread() {
    let view = document.getElementById('xen-content-render');
    view.innerHTML = `<h2>Создание новой темы</h2>
                      <input class="xf-input" id="new-t-title" placeholder="Название темы">
                      <textarea class="xf-input" id="new-t-text" rows="6" placeholder="Текст сообщения..."></textarea>
                      <button class="xf-btn" onclick="saveNewThread()">Опубликовать</button>
                      <button class="xf-btn" style="background:#222;" onclick="backToNode()">Отмена</button>`;
}

function saveNewThread() {
    let title = document.getElementById('new-t-title').value;
    let text = document.getElementById('new-t-text').value;
    if(!title.trim() || !text.trim()) return;
    
    let id = 'th-' + Date.now();
    forumData[activeNode].threads.push({
        id: id, title: title, creator: 'Qumestlies_Shawty', posts: [{ author: 'Qumestlies_Shawty', text: text }]
    });
    activeThread = id;
    render();
}

function openAdminModal() {
    let sel = document.getElementById('adm-user');
    sel.innerHTML = '';
    for(let n in forumUsers) { sel.innerHTML += `<option value="${n}">${n}</option>`; }
    document.getElementById('modal-admin').style.display = 'flex';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function saveAdminData() {
    let user = document.getElementById('adm-user').value;
    forumUsers[user].group = document.getElementById('adm-group').value;
    forumUsers[user].verified = document.getElementById('adm-ver').value === 'yes';
    closeModal('modal-admin');
    render();
}

function viewProfile(name) {
    let u = forumUsers[name];
    if(!u) return;
    document.getElementById('p-ava').src = u.avatar;
    document.getElementById('p-nick').innerText = name;
    document.getElementById('p-banner').innerText = u.group.toUpperCase();
    document.getElementById('modal-profile').style.display = 'flex';
}

// Старт
render();
