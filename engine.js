// ARIES ROLE PLAY - CLOUD REALTIME ENGINE v21.0 (ARMORED ULTRA FULL PRO)
// DEVELOPED WITH ADVANCED LEADERSHIP & FULLSCREEN TELEGRAM-STYLE SYSTEM
// ==========================================================================

const db = firebase.database();
const auth = firebase.auth();

let user = null;
let currentActiveNode = null;
let currentOpenTopicId = null; 
let replyToProfileData = null; // Хранение данных для цитирования/ответа игроку

let GlobalUsers = {};
let GlobalNodes = {};
let GlobalStatuses = {};
let CloudFounders = [];

// Системный хардкод аккаунта создателя
const MASTER_EMAIL = "ariessupporttest@gmail.com";
const MASTER_NICK = "Qumestlies_Shawty";

// --- ANTI-F12 И ЗАЩИТА ---
document.addEventListener('contextmenu', e => e.preventDefault()); 
document.onkeydown = function(e) {
    if(e.keyCode == 123) return false; 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) return false; 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) return false; 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) return false; 
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false; 
};

// --- МОНИТОРИНГ ОНЛАЙНА ---
function setupOnlinePresence(uid) {
    const userStatusRef = db.ref(`/status/${uid}`);
    const isOffline = { state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP };
    const isOnline = { state: 'online', last_changed: firebase.database.ServerValue.TIMESTAMP };

    db.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() == false) return;
        userStatusRef.onDisconnect().set(isOffline).then(() => {
            userStatusRef.set(isOnline);
        }).catch(e => console.log("Превышены права присутствия:", e.message));
    });
}

// --- БЕЗОПАСНАЯ СИНХРОНИЗАЦИЯ БАЗЫ ПО ВЕТКАМ ---
function initDataSynchronization() {
    // 1. Слушаем разделы форума (Доступно всем)
    db.ref('nodes').on('value', snap => {
        GlobalNodes = snap.val() || {};
        Forum.renderSidebarNodes();
    }, err => console.error("Ошибка загрузки разделов:", err.message));

    // 2. Слушаем основателей (Доступно всем)
    db.ref('founders').on('value', snap => {
        const data = snap.val() || {};
        CloudFounders = [];
        Object.keys(data).forEach(k => {
            if (data[k]?.email) CloudFounders.push(data[k].email.toLowerCase());
        });
        UI.renderHeader();
    }, err => console.error("Ошибка загрузки основателей:", err.message));

    // 3. Слушаем статусы онлайна (Доступно всем)
    db.ref('status').on('value', snap => {
        GlobalStatuses = snap.val() || {};
    }, err => console.error("Ошибка загрузки статусов:", err.message));

    // 4. Слушаем всех юзеров (Доступно всем для чтения ников/аватарок)
    db.ref('users').on('value', snap => {
        GlobalUsers = snap.val() || {};
        
        if (auth.currentUser) {
            const myUid = auth.currentUser.uid;
            // Защита от динамического бана во время сессии
            if (GlobalUsers[myUid]?.sanction === 'yes') {
                document.body.innerHTML = '<h1 style="color:red; text-align:center; padding-top:100px;">ВЫ ЗАБАНЕНЫ НА ФОРУМЕ</h1>';
                return;
            }
            if (GlobalUsers[myUid]) {
                user = GlobalUsers[myUid];
            }
        }
        UI.renderHeader();
    }, err => console.error("Ошибка загрузки пользователей:", err.message));
}

// Запуск синхронизации сразу при загрузке скрипта
initDataSynchronization();


// --- МОДУЛЬ УВЕДОМЛЕНИЙ ---
const AppNotif = {
    listen() {
        if (!auth.currentUser) return;
        db.ref('notifications/' + auth.currentUser.uid).on('value', snap => {
            const list = snap.val() || {};
            const keys = Object.keys(list);
            const badge = document.getElementById('bell-badge');
            
            if (badge && keys.length > 0) {
                badge.innerText = keys.length;
                badge.style.display = 'block';
                
                let html = '';
                keys.reverse().forEach(id => {
                    const item = list[id];
                    html += `<div class="notif-item" onclick="AppNotif.click('${item.nodeId}', '${item.topicId}', '${id}')">
                        <b>${item.author || 'Система'}</b> ${item.text || ''}
                    </div>`;
                });
                const zone = document.getElementById('notif-render-zone');
                if (zone) zone.innerHTML = html;
            } else if (badge) {
                badge.style.display = 'none';
                const zone = document.getElementById('notif-render-zone');
                if (zone) zone.innerHTML = `<p style="text-align:center; color:#555; font-size:12px; padding:20px;">Уведомлений нет</p>`;
            }
        }, err => console.log("Оповещения пока не доступны или пусты"));
    },
    send(targetUid, text, nodeId, topicId) {
        if (!targetUid || !user || targetUid === auth.currentUser?.uid) return;
        db.ref('notifications/' + targetUid).push({
            author: user.nick || 'Игрок',
            text: text,
            nodeId: nodeId,
            topicId: topicId,
            time: Date.now()
        }).catch(e => console.log("Ошибка отправки уведомления:", e.message));
    },
    clearAll() {
        if (!auth.currentUser) return;
        db.ref('notifications/' + auth.currentUser.uid).remove();
    },
    click(nodeId, topicId, notifId) {
        db.ref(`notifications/${auth.currentUser.uid}/${notifId}`).remove();
        UI.closeNotifs();
        currentActiveNode = nodeId;
        Forum.viewTopic(topicId);
    }
};

// --- МЕНЕДЖЕР ИНТЕРФЕЙСА ---
const UI = {
    show: (id) => { const el = document.getElementById(id); if(el) el.style.display='flex'; },
    close: (id) => { const el = document.getElementById(id); if(el) el.style.display='none'; },
    toggleNotifs() {
        const d = document.getElementById('bell-dropdown');
        if(d) d.style.display = (d.style.display === 'block') ? 'none' : 'block';
    },
    closeNotifs() { const d = document.getElementById('bell-dropdown'); if(d) d.style.display = 'none'; },
    
    renderHeader: () => {
        const zone = document.getElementById('header-auth');
        if (!zone) return;
        
        if (auth.currentUser && user) {
            let glow = '';
            if (user.role === 'badge-founder') glow = 'glow-founder';
            else if (user.role === 'badge-admin') glow = 'glow-admin';
            else if (user.role === 'badge-leader') glow = 'glow-leader';
            else if (user.role === 'badge-banned') glow = 'glow-banned';

            const verifyClass = user.verify || 'none';
            zone.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${user.avatar || 'https://via.placeholder.com/32'}" class="avatar-mini" onclick="UI.show('m-profile')">
                    <span class="${glow}" style="font-weight:bold; cursor:pointer;" onclick="UserProfileCard.show('${auth.currentUser.uid}')">${user.nick || 'Player'} <div class="verified-badge ${verifyClass}"></div></span>
                    <button class="btn-core" style="background:#222; font-size:10px;" onclick="auth.signOut().then(()=>location.reload())">Выход</button>
                </div>
            `;
            
            const myEmail = auth.currentUser.email ? auth.currentUser.email.toLowerCase() : '';
            const hasFounderAccess = (myEmail === MASTER_EMAIL.toLowerCase() || CloudFounders.includes(myEmail));
            
            const admBtn = document.getElementById('admin-panel-btn');
            if (admBtn) {
                admBtn.style.display = (hasFounderAccess || user.role === 'badge-admin') ? 'block' : 'none';
            }

            const leadBtn = document.getElementById('leader-panel-btn');
            if (leadBtn) {
                leadBtn.style.display = (user.role === 'badge-leader' && user.leaderNode) ? 'block' : 'none';
            }
        } else {
            zone.innerHTML = `<button class="btn-core" onclick="UI.show('m-auth')">Войти</button>`;
            const admBtn = document.getElementById('admin-panel-btn'); if(admBtn) admBtn.style.display = 'none';
            const leadBtn = document.getElementById('leader-panel-btn'); if(leadBtn) leadBtn.style.display = 'none';
        }
    }
};

// --- СИСТЕМА ЛИДЕРСТВА И КАРТОЧЕК ---
const UserProfileCard = {
    async show(uid) {
        try {
            const snap = await db.ref('users/' + uid).once('value');
            const uData = snap.val();
            if (!uData) return;

            document.getElementById('card-avatar').src = uData.avatar || 'https://via.placeholder.com/90';
            document.getElementById('card-nick').innerText = uData.nick || 'Неизвестно';
            
            let roleName = 'USER';
            if(uData.role === 'badge-founder') roleName = 'FOUNDER';
            if(uData.role === 'badge-admin') roleName = 'ADMIN';
            if(uData.role === 'badge-leader') roleName = 'LEADER';
            if(uData.role === 'badge-banned') roleName = 'BANNED';

            document.getElementById('card-badge-container').innerHTML = `<span class="badge-role ${uData.role || 'badge-user'}">${roleName}</span>`;
            
            const isOnline = GlobalStatuses[uid]?.state === 'online';
            document.getElementById('card-status').innerHTML = `Статус: ${isOnline ? '<span style="color:#00ffaa; font-weight:bold;">В СЕТИ</span>' : '<span style="color:#666;">ОФЛАЙН</span>'}`;
            
            UI.show('m-user-card');
        } catch(e) { console.error(e); }
    }
};

const LeaderPanel = {
    open() {
        if (!user || !user.leaderNode || !GlobalNodes[user.leaderNode]) {
            return alert('У вас нет лидерских разделов');
        }
        document.getElementById('leader-assigned-node-title').innerText = GlobalNodes[user.leaderNode].title;
        UI.show('m-leader');
    },
    goToMyNode() {
        if(user && user.leaderNode) {
            UI.close('m-leader');
            Forum.loadTopics(user.leaderNode, GlobalNodes[user.leaderNode].title);
        }
    }
};

// --- КОРНЕВОЙ МОДУЛЬ ФОРУМА ---
const Forum = {
    renderSidebarNodes() {
        let html = '';
        Object.keys(GlobalNodes).forEach(id => {
            html += `<div class="nav-link" onclick="Forum.loadTopics('${id}', '${GlobalNodes[id].title}')">📂 ${GlobalNodes[id].title}</div>`;
        });
        const sidebar = document.getElementById('sidebar-nodes');
        if(sidebar) sidebar.innerHTML = html;
        
        if (!currentActiveNode && Object.keys(GlobalNodes).length > 0) {
            currentActiveNode = Object.keys(GlobalNodes)[0];
            Forum.loadTopics(currentActiveNode, GlobalNodes[currentActiveNode].title);
        }
    },
    
    async loadTopics(nodeId, title) {
        currentActiveNode = nodeId;
        const targetTitle = title || (GlobalNodes[nodeId] ? GlobalNodes[nodeId].title : '');
        const renderZone = document.getElementById('forum-render');
        if(renderZone) renderZone.innerHTML = `<h3>Загрузка ${targetTitle}...</h3>`;
        
        try {
            const snap = await db.ref('topics/' + nodeId).once('value');
            const data = snap.val() || {};
            
            const myEmail = auth.currentUser?.email ? auth.currentUser.email.toLowerCase() : '';
            const isFounder = auth.currentUser && (myEmail === MASTER_EMAIL.toLowerCase() || CloudFounders.includes(myEmail));
            const isLeaderOfThisNode = (user && user.role === 'badge-leader' && user.leaderNode === nodeId);
            const canPost = isFounder || (user && user.role === 'badge-admin') || isLeaderOfThisNode;

            let html = canPost ? `<button class="btn-core" style="width:100%; margin-bottom:20px;" onclick="UI.show('m-topic')">+ Опубликовать тему в "${targetTitle}"</button>` : '';
            
            const topicIds = Object.keys(data);
            if (topicIds.length > 0) {
                topicIds.reverse().forEach(id => {
                    const t = data[id];
                    const statusClass = t.status || 'status-open';
                    const displayStatus = statusClass.split('-')[1] ? statusClass.split('-')[1].toUpperCase() : 'OPEN';
                    
                    html += `
                        <div class="post-card" onclick="Forum.viewTopic('${id}')" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span class="status-badge ${statusClass}">${displayStatus}</span>
                                <span style="font-weight:bold; font-size:16px;">${t.title || 'Без названия'}</span>
                                <div style="font-size:11px; color:#555; margin-top:8px;">Автор: ${t.authorNick || 'Игрок'}</div>
                            </div>
                            <div style="display:flex; gap:5px;">
                                ${canPost ? `<button class="btn-core" style="background:#ffb700; color:#000; font-size:9px;" onclick="event.stopPropagation(); Forum.openEditModal('${id}', 'topic_title')">✏️ Ред.</button>` : ''}
                                ${isFounder ? `<button class="btn-core" style="background:red; font-size:9px;" onclick="event.stopPropagation(); Forum.deleteTopic('${id}')">Удалить</button>` : ''}
                            </div>
                        </div>
                    `;
                });
            } else {
                html += '<p style="text-align:center; padding: 20px 0;">В этом разделе ещё нет тем.</p>';
            }
            if(renderZone) renderZone.innerHTML = html;
        } catch(e) {
            if(renderZone) renderZone.innerHTML = `<p style="color:red;">Ошибка доступа к разделу.</p>`;
        }
    },

    async viewTopic(id) {
        currentOpenTopicId = id;
        try {
            const snap = await db.ref(`topics/${currentActiveNode}/${id}`).once('value');
            const t = snap.val();
            if(!t) return;

            document.getElementById('fs-topic-title').innerText = t.title || 'Тема';
            
            const myEmail = auth.currentUser?.email ? auth.currentUser.email.toLowerCase() : '';
            const isFounder = auth.currentUser && (myEmail === MASTER_EMAIL.toLowerCase() || CloudFounders.includes(myEmail));
            const isLeaderOfThisNode = (user && user.role === 'badge-leader' && user.leaderNode === currentActiveNode);
            const hasModAccess = isFounder || (user && user.role === 'badge-admin') || isLeaderOfThisNode;

            let statusSelectorHtml = `<span class="status-badge ${t.status || 'status-open'}">${(t.status || 'open').replace('status-','').toUpperCase()}</span>`;
            if (hasModAccess) {
                statusSelectorHtml = `
                    <select onchange="Forum.changeTopicStatus('${id}', this.value)" style="background:#111; color:#fff; border:1px solid var(--border-color); font-size:11px; padding:3px; border-radius:3px;">
                        <option value="status-open" ${t.status==='status-open'?'selected':''}>ОТКРЫТО</option>
                        <option value="status-closed" ${t.status==='status-closed'?'selected':''}>ЗАКРЫТО</option>
                        <option value="status-review" ${t.status==='status-review'?'selected':''}>РАССМОТРЕНИЕ</option>
                    </select>
                `;
            }
            document.getElementById('fs-topic-badge-status').innerHTML = statusSelectorHtml;

            let html = `
                <div class="post-card" style="border-left: 3px solid var(--accent);">
                    <div style="display:flex; justify-content:between; align-items:start;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                            <img src="${t.authorAvatar || 'https://via.placeholder.com/32'}" class="avatar-mini" onclick="UserProfileCard.show('${t.authorUid || ''}')">
                            <div>
                                <span class="${t.authorGlow || ''}" style="font-weight:bold; cursor:pointer;" onclick="UserProfileCard.show('${t.authorUid || ''}')">${t.authorNick || 'Игрок'}</span>
                                <div class="verified-badge ${t.authorVerify || 'none'}"></div><br>
                                <span class="badge-role ${t.authorBadge || 'badge-user'}">${(t.authorBadge || 'user').replace('badge-','').toUpperCase()}</span>
                            </div>
                        </div>
                        <div style="margin-left:auto; display:flex; gap:5px;">
                            <button class="btn-core" style="background:#1a1a2e; font-size:10px;" onclick="Forum.setReplyTarget('${t.authorUid || ''}', '${t.authorNick || 'Игрок'}')">↩️ Ответить</button>
                            ${(hasModAccess || (auth.currentUser && auth.currentUser.uid === t.authorUid)) ? `<button class="btn-core" style="background:#ffb700; color:#000; font-size:10px;" onclick="Forum.openEditModal('${id}', 'topic_text')">✏️ Ред.</button>` : ''}
                        </div>
                    </div>
                    <div style="color:#cdcdff; line-height:1.6; margin-top:10px; word-break:break-word;">${Editor.parse(t.text || '')}</div>
                    ${Forum.renderReactionsDom('topic', id, t.reactions, t.authorUid)}
                </div>
                <div id="fs-replies-list-zone"></div>
            `;
            
            document.getElementById('fs-messages-container').innerHTML = html;
            document.getElementById('fullscreen-view').style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            Forum.loadRepliesRealtime(id);
        } catch(e) { console.error(e); }
    },

    closeFullscreen() {
        document.getElementById('fullscreen-view').style.display = 'none';
        document.body.style.overflow = 'auto';
        Forum.setReplyTarget(null, null);
        // Снимаем слушатель ответов
        if (currentOpenTopicId) {
            db.ref('replies/' + currentOpenTopicId).off();
        }
    },

    async changeTopicStatus(topicId, newStatus) {
        await db.ref(`topics/${currentActiveNode}/${topicId}`).update({ status: newStatus });
        Forum.viewTopic(topicId);
    },

    setReplyTarget(uid, nick) {
        const ind = document.getElementById('reply-target-indicator');
        if(!ind) return;
        if(!uid) {
            replyToProfileData = null;
            ind.style.display = 'none';
        } else {
            replyToProfileData = { uid, nick };
            ind.innerText = `В ответ пользователю: @${nick}`;
            ind.style.display = 'block';
            document.getElementById('fs-reply-text').focus();
        }
    },

    renderReactionsDom(type, id, reactionsData, targetAuthorUid) {
        const list = reactionsData || {};
        const emo = ['👍', '❤️', '🔥', '😂', '😮'];
        let html = `<div class="reactions-bar">`;
        
        emo.forEach(e => {
            let count = 0;
            Object.values(list).forEach(val => { if(val === e) count++; });
            html += `
                <div class="react-btn" onclick="Forum.toggleReaction('${type}', '${id}', '${e}', '${targetAuthorUid}')">
                    <span>${e}</span>
                    <span class="react-count">${count}</span>
                </div>
            `;
        });
        html += `</div>`;
        return html;
    },

    async toggleReaction(type, id, emoji, targetAuthorUid) {
        if(!auth.currentUser) return alert('Авторизуйтесь!');
        const myUid = auth.currentUser.uid;
        const path = (type === 'topic') ? `topics/${currentActiveNode}/${id}/reactions/${myUid}` : `replies/${currentOpenTopicId}/${id}/reactions/${myUid}`;
        
        const snap = await db.ref(path).once('value');
        if (snap.val() === emoji) {
            await db.ref(path).remove();
        } else {
            await db.ref(path).set(emoji);
            AppNotif.send(targetAuthorUid, `поставил реакцию ${emoji} на ваше сообщение`, currentActiveNode, currentOpenTopicId);
        }
        Forum.viewTopic(currentOpenTopicId);
    },

    handleAttachment(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const tag = file.type.startsWith('video/') ? `[video]${reader.result}[/video]` : `[img]${reader.result}[/img]`;
            document.getElementById('fs-reply-text').value += tag;
        };
        reader.readAsDataURL(file);
    },

    async post() {
        const title = document.getElementById('t-title').value;
        const text = document.getElementById('t-text').value;
        if(!title || !text) return alert('Заполните поля!');
        
        const topic = {
            title, text, status: document.getElementById('t-status').value,
            authorNick: user.nick || 'Игрок', authorAvatar: user.avatar || '',
            authorUid: auth.currentUser.uid,
            authorGlow: user.role === 'badge-founder' ? 'glow-founder' : (user.role === 'badge-admin' ? 'glow-admin' : (user.role === 'badge-leader' ? 'glow-leader' : '')),
            authorBadge: user.role || 'badge-user', authorVerify: user.verify || 'none',
            time: Date.now()
        };
        await db.ref('topics/' + currentActiveNode).push(topic);
        
        document.getElementById('t-title').value = '';
        document.getElementById('t-text').value = '';
        UI.close('m-topic'); 
        Forum.loadTopics(currentActiveNode, '');
    },

    async sendFsReply() {
        const textStr = document.getElementById('fs-reply-text').value.trim();
        if(!textStr) return;
        
        const snapTopic = await db.ref(`topics/${currentActiveNode}/${currentOpenTopicId}`).once('value');
        if (snapTopic.val()?.status === 'status-closed') {
            return alert('Тема закрыта для ответов!');
        }

        let clearText = textStr;
        if (replyToProfileData) {
            clearText = `<b>@${replyToProfileData.nick}</b>, ${textStr}`;
        }

        const replyData = {
            text: clearText, authorNick: user.nick || 'Игрок', authorAvatar: user.avatar || '',
            authorUid: auth.currentUser.uid,
            authorGlow: user.role === 'badge-founder' ? 'glow-founder' : (user.role === 'badge-admin' ? 'glow-admin' : (user.role === 'badge-leader' ? 'glow-leader' : '')),
            authorBadge: user.role || 'badge-user', authorVerify: user.verify || 'none',
            time: Date.now()
        };

        await db.ref('replies/' + currentOpenTopicId).push(replyData);
        
        if(replyToProfileData) {
            AppNotif.send(replyToProfileData.uid, `ответил на ваше сообщение в теме`, currentActiveNode, currentOpenTopicId);
        } else {
            AppNotif.send(snapTopic.val()?.authorUid, `оставил ответ в вашей теме`, currentActiveNode, currentOpenTopicId);
        }

        document.getElementById('fs-reply-text').value = '';
        Forum.setReplyTarget(null, null);
    },

    loadRepliesRealtime(id) {
        db.ref('replies/' + id).on('value', snap => {
            const data = snap.val() || {};
            let html = '';
            
            const myEmail = auth.currentUser?.email ? auth.currentUser.email.toLowerCase() : '';
            const isFounder = auth.currentUser && (myEmail === MASTER_EMAIL.toLowerCase() || CloudFounders.includes(myEmail));
            const isLeaderOfThisNode = (user && user.role === 'badge-leader' && user.leaderNode === currentActiveNode);

            Object.keys(data).forEach(rid => {
                const r = data[rid];
                const canEditPost = isFounder || (user && user.role === 'badge-admin') || isLeaderOfThisNode || (auth.currentUser && auth.currentUser.uid === r.authorUid);

                html += `
                    <div class="post-card" style="margin-left:20px; border-left:2px solid #1c1c35;">
                        <div style="display:flex; justify-content:between; align-items:start;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                <img src="${r.authorAvatar || 'https://via.placeholder.com/24'}" class="avatar-mini" style="width:24px; height:24px;" onclick="UserProfileCard.show('${r.authorUid || ''}')">
                                <div>
                                    <span class="${r.authorGlow || ''}" style="font-size:12px; font-weight:bold; cursor:pointer;" onclick="UserProfileCard.show('${r.authorUid || ''}')">${r.authorNick || 'Игрок'}</span>
                                    <div class="verified-badge ${r.authorVerify || 'none'}"></div>
                                </div>
                            </div>
                            <div style="margin-left:auto; display:flex; gap:5px;">
                                <button class="btn-core" style="background:#111; font-size:9px; padding:3px 7px;" onclick="Forum.setReplyTarget('${r.authorUid || ''}', '${r.authorNick || 'Игрок'}')">↩️</button>
                                ${canEditPost ? `<button class="btn-core" style="background:#ffb700; color:#000; font-size:9px; padding:3px 7px;" onclick="Forum.openEditModal('${rid}', 'reply')">✏️</button>` : ''}
                            </div>
                        </div>
                        <div style="font-size:13px; color:#aaa; margin-top:5px; word-break:break-word;">${Editor.parse(r.text || '')}</div>
                        ${Forum.renderReactionsDom('reply', rid, r.reactions, r.authorUid)}
                    </div>
                `;
            });
            const repliesZone = document.getElementById('fs-replies-list-zone');
            if(repliesZone) repliesZone.innerHTML = html;
        });
    },

    letEditingData: null,
    async openEditModal(id, mode) {
        Forum.letEditingData = { id, mode };
        let currentText = '';
        
        if (mode === 'topic_title' || mode === 'topic_text') {
            const snap = await db.ref(`topics/${currentActiveNode}/${id}`).once('value');
            currentText = (mode === 'topic_title') ? snap.val().title : snap.val().text;
        } else {
            const snap = await db.ref(`replies/${currentOpenTopicId}/${id}`).once('value');
            currentText = snap.val().text;
        }

        document.getElementById('edit-post-textarea').value = currentText;
        UI.show('m-edit-post');
    },

    async saveEditedPost() {
        const txt = document.getElementById('edit-post-textarea').value.trim();
        if(!txt || !Forum.letEditingData) return;
        
        const { id, mode } = Forum.letEditingData;
        if (mode === 'topic_title') {
            await db.ref(`topics/${currentActiveNode}/${id}`).update({ title: txt });
            Forum.loadTopics(currentActiveNode, '');
        } else if (mode === 'topic_text') {
            await db.ref(`topics/${currentActiveNode}/${id}`).update({ text: txt });
            Forum.viewTopic(currentOpenTopicId);
        } else if (mode === 'reply') {
            await db.ref(`replies/${currentOpenTopicId}/${id}`).update({ text: txt });
        }

        UI.close('m-edit-post');
        Forum.letEditingData = null;
    },

    async deleteTopic(id) {
        if(confirm('Удалить эту тему навсегда?')) {
            await db.ref('topics/' + currentActiveNode + '/' + id).remove();
            await db.ref('replies/' + id).remove();
            Forum.loadTopics(currentActiveNode, '');
        }
    }
};

// --- СИСТЕМНЫЙ КОРРЕКТНЫЙ РЕДАКТОР МЕДИА ТЕГОВ ---
const Editor = {
    tag: (s, e) => document.getElementById('t-text').value += s + e,
    appendAttachment(e, tagType) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const compiledTag = `${tagType}${reader.result}${tagType.replace('[','[/')}`;
            document.getElementById('t-text').value += compiledTag;
        };
        reader.readAsDataURL(file);
    },
    parse: (t) => {
        if(!t) return '';
        return t.replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:100%; border-radius:5px; margin:5px 0; display:block;">')
                .replace(/\[video\](.*?)\[\/video\]/g, '<video src="$1" controls style="max-width:100%; max-height:380px; display:block; margin:5px 0;"></video>')
                .replace(/\[b\](.*?)\[\/b\]/g, '<b>$1</b>')
                .replace(/\n/g, '<br>');
    }
};

// --- УПРАВЛЕНИЕ АДМИН-СИСТЕМОЙ ---
const Admin = {
    async open() {
        let html = '';
        Object.keys(GlobalUsers).forEach(uid => {
            html += `<option value="${uid}">${GlobalUsers[uid].nick || 'Player'} (${GlobalUsers[uid].email || ''})</option>`;
        });
        document.getElementById('adm-user-list').innerHTML = html;
        
        let nodeOpts = '<option value="none">-- Отвязать лидерку --</option>';
        Object.keys(GlobalNodes).forEach(id => {
            nodeOpts += `<option value="${id}">${GlobalNodes[id].title}</option>`;
        });
        document.getElementById('adm-leader-node-select').innerHTML = nodeOpts;

        UI.show('m-admin');
        Admin.onUserSelectChange();
    },

    async onUserSelectChange() {
        const uid = document.getElementById('adm-user-list').value;
        if(!uid || !GlobalUsers[uid]) return;
        const u = GlobalUsers[uid];

        document.getElementById('adm-role').value = u.role || 'badge-user';
        document.getElementById('adm-verify').value = u.verify || 'none';
        document.getElementById('adm-ban').value = u.sanction || 'no';
        document.getElementById('adm-leader-node-select').value = u.leaderNode || 'none';
    },

    async grantFounderPrivilege() {
        const mail = document.getElementById('adm-new-founder-email').value.trim().toLowerCase();
        const nickName = document.getElementById('adm-new-founder-nick').value.trim();
        if(!mail || !nickName) return alert('Заполните почту и ник друга!');

        await db.ref('founders').push({ email: mail, nick: nickName });
        alert(`Права создателя зарезервированы для почты: ${mail}.`);
        document.getElementById('adm-new-founder-email').value = '';
        document.getElementById('adm-new-founder-nick').value = '';
    },

    async save() {
        const uid = document.getElementById('adm-user-list').value;
        if(!uid) return;
        const selectedRole = document.getElementById('adm-role').value;
        const isBannedMode = document.getElementById('adm-ban').value === 'yes';

        const updates = {
            role: isBannedMode ? 'badge-banned' : selectedRole,
            verify: isBannedMode ? 'none' : document.getElementById('adm-verify').value,
            sanction: document.getElementById('adm-ban').value,
            leaderNode: document.getElementById('adm-leader-node-select').value
        };

        await db.ref('users/' + uid).update(updates);
        alert('Данные обновлены!');
        UI.close('m-admin');
        location.reload();
    },

    async createNode() {
        const title = document.getElementById('node-title').value;
        if(!title) return;
        await db.ref('nodes').push({ title });
        UI.close('m-node');
        document.getElementById('node-title').value = '';
    }
};

// --- МОДУЛЬ ПРОФИЛЯ ---
const Profile = {
    preview: (e) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const SIZE = 120;
                canvas.width = SIZE; canvas.height = SIZE;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, SIZE, SIZE);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('p-avatar-view').src = compressedDataUrl;
                if(!user) user = {};
                user.tempAvatar = compressedDataUrl;
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    },
    save: async () => {
        if(!auth.currentUser) return;
        const updates = { nick: document.getElementById('p-nick').value || user?.nick || 'Player' };
        if(user && user.tempAvatar) updates.avatar = user.tempAvatar;
        
        if(user) {
            if(user.role === 'badge-founder') updates.authorGlow = 'glow-founder';
            if(user.role === 'badge-admin') updates.authorGlow = 'glow-admin';
            if(user.role === 'badge-leader') updates.authorGlow = 'glow-leader';
        }

        await db.ref('users/' + auth.currentUser.uid).update(updates);
        location.reload();
    }
};

const Auth = {
    google: () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(() => location.reload()),
    magic: () => {
        const email = document.getElementById('auth-email').value;
        auth.sendSignInLinkToEmail(email, { url: window.location.href, handleCodeInApp: true })
        .then(() => alert('Ссылка отправлена на почту!'));
    }
};

// --- СЛУШАТЕЛЬ АВТОРИЗАЦИИ ---
auth.onAuthStateChanged(async (u) => {
    if (u) {
        setupOnlinePresence(u.uid);
        AppNotif.listen();
        
        const snap = await db.ref('users/' + u.uid).once('value');
        let dbUser = snap.val();
        
        const myEmail = u.email ? u.email.toLowerCase() : '';
        const isMaster = (myEmail === MASTER_EMAIL.toLowerCase());
        const hasFounderAccess = (isMaster || CloudFounders.includes(myEmail));

        if (hasFounderAccess) {
            if (!dbUser || dbUser.role !== 'badge-founder') {
                dbUser = { 
                    role: 'badge-founder', 
                    nick: isMaster ? MASTER_NICK : (dbUser?.nick || 'Founder_Partner'), 
                    email: u.email, 
                    verify: 'v-blue-fill',
                    avatar: u.photoURL || 'https://via.placeholder.com/90',
                    sanction: 'no'
                };
                await db.ref('users/' + u.uid).set(dbUser);
            }
        } else if (!dbUser) {
            dbUser = { 
                nick: u.displayName || 'Player_' + Math.floor(1000 + Math.random() * 9000), 
                role: 'badge-user', 
                avatar: u.photoURL || 'https://via.placeholder.com/90', 
                sanction: 'no', 
                email: u.email, 
                verify: 'none' 
            };
            await db.ref('users/' + u.uid).set(dbUser);
        }

        user = dbUser;

        if (user.sanction === 'yes') { 
            document.body.innerHTML = '<h1 style="color:red; text-align:center; padding-top:100px;">ВЫ ЗАБАНЕНЫ НА ФОРУМЕ</h1>'; 
            return; 
        }
        
        const pNickInput = document.getElementById('p-nick'); if(pNickInput) pNickInput.value = user.nick || '';
        const pAvInput = document.getElementById('p-avatar-view'); if(pAvInput) pAvInput.src = user.avatar || 'https://via.placeholder.com/90';
    } else {
        user = null;
    }
    UI.renderHeader();
});
