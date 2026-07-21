// =================================================================
// 🔒 ULTRA HARDENED SECURITY SYSTEM (ANTI-F12 / ANTI-EXPLOIT)
// =================================================================
(function() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', function(e) {
        if (e.keyCode === 123 || 
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
            (e.ctrlKey && e.keyCode === 85) || 
            (e.ctrlKey && e.keyCode === 83)) {
            e.preventDefault();
            alert("🔒 Действие заблокировано системой безопасности Aries RP!");
            return false;
        }
    });
    setInterval(function() {
        function dbg() { return true; }
        if (!dbg()) return;
        (function() {
            (function a() {
                try {
                    (function b(i) {
                        if (('' + (i / i)).length !== 1 || i % 20 === 0) {
                            (function() {}).constructor('debugger')();
                        } else { debugger; }
                        b(++i);
                    })(0);
                } catch (e) { setTimeout(a, 50); }
            })();
        })();
    }, 250);
    Object.defineProperty(window, 'console', {
        value: { log: function(){}, error: function(){}, warn: function(){}, info: function(){}, clear: function(){} },
        writable: false, configurable: false
    });
})();

// =================================================================
// ⚙️ GLOBAL CORE & VARIABLES
// =================================================================
const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;
let currentProfileData = null;
let currentSelectedNodeId = null;
let currentSelectedTopicId = null;
let activeFsReplyToUid = null;
let activeFsReplyToNick = null;

// Локальный реестр известных UID (для безопасной работы админ-панели без массового скачивания /users)
let knownUserMap = new Map();

function registerKnownUser(uid, nick) {
    if (uid && nick) {
        knownUserMap.set(uid, nick);
    }
}

// =================================================================
// 🚀 INITIALIZATION & APP START
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    Auth.listen();
    initDataSynchronization();
});

function initDataSynchronization() {
    db.ref('nodes').on('value', snap => {
        const zone = document.getElementById('sidebar-nodes');
        const admSelect = document.getElementById('adm-leader-node-select');
        if (!zone) return;
        
        zone.innerHTML = '';
        if(admSelect) admSelect.innerHTML = '<option value="none">-- Нет --</option>';
        
        snap.forEach(child => {
            const id = child.key;
            const data = child.val();
            
            const btn = document.createElement('div');
            btn.className = 'nav-link';
            btn.innerText = data.title;
            btn.onclick = () => Forum.loadNode(id, data.title);
            zone.appendChild(btn);

            if(admSelect) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.innerText = data.title;
                admSelect.appendChild(opt);
            }
        });
    });
}

// =================================================================
// 🔑 AUTHENTICATION MODULE (СЕРВЕРНАЯ ПРОВЕРКА ПРАВ)
// =================================================================
const Auth = {
    listen: () => {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                
                db.ref('users/' + user.uid).on('value', snap => {
                    currentProfileData = snap.val();
                    if (!currentProfileData) {
                        currentProfileData = {
                            nick: user.displayName || "Новый игрок",
                            avatar: user.photoURL || "https://i.imgur.com/8Km9tTv.png",
                            role: "badge-user",
                            verifyBadge: "none"
                        };
                        db.ref('users/' + user.uid).set(currentProfileData);
                    }
                    
                    registerKnownUser(user.uid, currentProfileData.nick);
                    Auth.checkStaffPrivileges();
                    Auth.renderHeader(true);
                });
            } else {
                currentUser = null;
                currentProfileData = null;
                Auth.renderHeader(false);
                document.getElementById('admin-panel-btn').style.display = 'none';
                document.getElementById('leader-panel-btn').style.display = 'none';
            }
        });
    },
    google: () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then(() => UI.close('m-auth'));
    },
    logout: () => { auth.signOut(); },
    checkStaffPrivileges: () => {
        if (!currentUser) return;
        
        // Серверная проверка прав администратора или лидера
        if (currentProfileData && (currentProfileData.role === 'badge-admin' || currentProfileData.role === 'badge-founder')) {
            document.getElementById('admin-panel-btn').style.display = 'block';
        } else {
            document.getElementById('admin-panel-btn').style.display = 'none';
        }

        if (currentProfileData && currentProfileData.role === 'badge-leader' && currentProfileData.nodeModeratorId) {
            document.getElementById('leader-panel-btn').style.display = 'block';
        } else {
            document.getElementById('leader-panel-btn').style.display = 'none';
        }

        AppNotif.listen(currentUser.uid);
    },
    renderHeader: (isAuth) => {
        const h = document.getElementById('header-auth');
        if (!h) return;
        if (isAuth && currentProfileData) {
            let g = UI.getGlowClass(currentProfileData.role);
            let v = UI.getVerifyHtml(currentProfileData.verifyBadge);
            h.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="text-align:right;">
                        <span class="${g}" style="font-size:14px; font-weight:bold; cursor:pointer;" onclick="Profile.open()">${currentProfileData.nick}</span>${v}
                        <br><span class="badge-role ${currentProfileData.role}">${currentProfileData.role.replace('badge-','')}</span>
                    </div>
                    <img class="avatar-mini" src="${currentProfileData.avatar}" onclick="Profile.open()">
                    <button class="btn-core" style="background:#222; padding:6px 10px;" onclick="Auth.logout()">Выйти</button>
                </div>
            `;
        } else {
            h.innerHTML = `<button class="btn-core" onclick="UI.show('m-auth')">Войти / Регистрация</button>`;
        }
    }
};

// =================================================================
// 📋 FORUM ENGINE MODULE
// =================================================================
const Forum = {
    loadNode: (nodeId, nodeTitle) => {
        currentSelectedNodeId = nodeId;
        const zone = document.getElementById('forum-render');
        zone.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0;">📁 ${nodeTitle}</h2>
                <button class="btn-core" onclick="Forum.openCreateTopicModal()">➕ Создать тему</button>
            </div>
            <div id="topics-list-zone"><p style="color:#555;">Загрузка тем...</p></div>
        `;

        db.ref('topics/' + nodeId).on('value', snap => {
            const listZone = document.getElementById('topics-list-zone');
            if(!listZone) return;
            listZone.innerHTML = '';
            
            if(!snap.exists()) {
                listZone.innerHTML = '<p style="color:#444; text-align:center; padding:30px;">В этом разделе пока нет тем.</p>';
                return;
            }

            snap.forEach(child => {
                const tId = child.key;
                const tData = child.val();
                
                if (tData.authorUid && tData.authorNick) {
                    registerKnownUser(tData.authorUid, tData.authorNick);
                }

                let statusClass = tData.status || 'status-open';
                let statusText = statusClass === 'status-open' ? 'ОТКРЫТО' : statusClass === 'status-closed' ? 'ЗАКРЫТО' : 'НА РАССМОТРЕНИИ';

                const card = document.createElement('div');
                card.className = 'post-card';
                card.style.cursor = 'pointer';
                card.onclick = (e) => {
                    if(!e.target.classList.contains('avatar-mini') && !e.target.classList.contains('author-click')) {
                        Forum.openFullscreenTopic(nodeId, tId);
                    }
                };

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            <span style="font-size:16px; font-weight:bold; color:#fff;">${tData.title}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img class="avatar-mini" src="${tData.authorAvatar || 'https://i.imgur.com/8Km9tTv.png'}" onclick="UI.showUserCard('${tData.authorUid}')">
                            <span class="author-click" style="font-size:12px; color:#888;" onclick="UI.showUserCard('${tData.authorUid}')">${tData.authorNick || 'User'}</span>
                        </div>
                    </div>
                `;
                listZone.appendChild(card);
            });
        });
    },
    openCreateTopicModal: () => {
        if(!currentUser) { alert('Для создания тем необходимо авторизоваться!'); return; }
        if(currentProfileData && currentProfileData.isBanned) { alert('Ваш аккаунт заблокирован!'); return; }
        
        const isFounder = currentProfileData.role === 'badge-founder';
        const isAdmin = currentProfileData.role === 'badge-admin';
        const isTargetLeader = currentProfileData.role === 'badge-leader' && currentProfileData.nodeModeratorId === currentSelectedNodeId;
        
        if (!isFounder && !isAdmin && !isTargetLeader) {
            alert('У вас нет прав для создания тем в этом разделе!');
            return;
        }
        
        UI.show('m-topic');
    },
    post: () => {
        const title = document.getElementById('t-title').value;
        const text = document.getElementById('t-text').value;
        const status = document.getElementById('t-status').value;

        if(!title || !text || !currentSelectedNodeId) return;

        const topicData = {
            title: title,
            text: text,
            status: status,
            authorUid: currentUser.uid,
            authorNick: currentProfileData.nick,
            authorAvatar: currentProfileData.avatar,
            authorRole: currentProfileData.role,
            authorVerify: currentProfileData.verifyBadge || 'none',
            timestamp: Date.now()
        };

        db.ref('topics/' + currentSelectedNodeId).push(topicData).then(() => {
            UI.close('m-topic');
            document.getElementById('t-title').value = '';
            document.getElementById('t-text').value = '';
        }).catch(err => {
            alert("Ошибка доступа: " + err.message);
        });
    },
    openFullscreenTopic: (nodeId, topicId) => {
        currentSelectedTopicId = topicId;
        const fsView = document.getElementById('fullscreen-view');
        fsView.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        db.ref(`topics/${nodeId}/${topicId}`).on('value', snap => {
            const data = snap.val();
            if(!data) return;

            if (data.authorUid && data.authorNick) {
                registerKnownUser(data.authorUid, data.authorNick);
            }

            document.getElementById('fs-topic-title').innerText = data.title;
            const badgeZone = document.getElementById('fs-topic-badge-status');
            let statusText = data.status === 'status-open' ? 'ОТКРЫТО' : data.status === 'status-closed' ? 'ЗАКРЫТО' : 'РАССМОТРЕНИЕ';
            badgeZone.innerHTML = `<span class="status-badge ${data.status}">${statusText}</span>`;

            const footer = document.getElementById('fs-reply-footer');
            if (data.status === 'status-closed') { footer.style.display = 'none'; } else { footer.style.display = 'block'; }

            const bodyZone = document.getElementById('fs-messages-container');
            bodyZone.innerHTML = '';

            let rootGlow = UI.getGlowClass(data.authorRole || 'badge-user');
            let rootVerify = UI.getVerifyHtml(data.authorVerify || 'none');
            
            let managementBtnsHtml = '';
            if(currentUser && (currentUser.uid === data.authorUid || currentProfileData.role === 'badge-founder' || (currentProfileData.role === 'badge-leader' && currentProfileData.nodeModeratorId === nodeId))) {
                managementBtnsHtml = `
                    <div style="position:absolute; top:15px; right:15px; display:flex; gap:5px;">
                        <button class="btn-core" style="background:#111; border:1px solid #ffb700; color:#ffb700; padding:4px 8px; font-size:10px;" onclick="Forum.openEditPostModal('topics/${nodeId}/${topicId}/text', \`${data.text.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`)">✏️ Ред.</button>
                        <button class="btn-core" style="background:#111; border:1px solid #ff003c; color:#ff003c; padding:4px 8px; font-size:10px;" onclick="Forum.deleteTopic('${nodeId}', '${topicId}')">🗑️ Удалить</button>
                    </div>
                `;
            }

            const rootPostHtml = `
                <div class="post-card" style="border-left: 3px solid var(--accent); padding-top:20px;">
                    ${managementBtnsHtml}
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px;">
                        <img class="avatar-mini" src="${data.authorAvatar || 'https://i.imgur.com/8Km9tTv.png'}" onclick="UI.showUserCard('${data.authorUid}')" style="width:40px; height:40px;">
                        <div>
                            <span class="${rootGlow}" style="font-weight:bold; cursor:pointer;" onclick="UI.showUserCard('${data.authorUid}')">${data.authorNick}</span>${rootVerify}
                            <br><span class="badge-role ${data.authorRole || 'badge-user'}" style="font-size:8px;">${(data.authorRole || 'user').replace('badge-','')}</span>
                        </div>
                    </div>
                    <div style="font-size:15px; line-height:1.6; color:#e2e2eb; white-space:pre-wrap;">${UI.parseBBCode(data.text)}</div>
                    <div id="react-root-topic"></div>
                </div>
                <hr style="border:0; border-top:1px solid var(--border-color); margin:25px 0;">
                <div id="fs-replies-load-zone"></div>
            `;
            bodyZone.innerHTML = rootPostHtml;
            Reactions.sync(`topics/${nodeId}/${topicId}/reactions`, 'react-root-topic');
            Forum.syncReplies(topicId, nodeId);
        });
    },
    closeFullscreen: () => {
        document.getElementById('fullscreen-view').style.display = 'none';
        document.body.style.overflow = 'auto';
        Forum.cancelReplyQuote();
    },
    syncReplies: (topicId, nodeId) => {
        db.ref('replies/' + topicId).on('value', snap => {
            const target = document.getElementById('fs-replies-load-zone');
            if(!target) return;
            target.innerHTML = '';

            snap.forEach(child => {
                const rId = child.key;
                const rData = child.val();

                if (rData.authorUid && rData.authorNick) {
                    registerKnownUser(rData.authorUid, rData.authorNick);
                }

                let rGlow = UI.getGlowClass(rData.authorRole || 'badge-user');
                let rVerify = UI.getVerifyHtml(rData.authorVerify || 'none');

                let replyManagementHtml = '';
                if(currentUser && (currentUser.uid === rData.authorUid || currentProfileData.role === 'badge-founder' || (currentProfileData.role === 'badge-leader' && currentProfileData.nodeModeratorId === nodeId))) {
                    replyManagementHtml = `
                        <div style="position:absolute; top:10px; right:10px; display:flex; gap:4px;">
                            <button class="btn-core" style="background:transparent; color:#ffb700; padding:2px 6px; font-size:9px;" onclick="Forum.openEditPostModal('replies/${topicId}/${rId}/text', \`${rData.text.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`)">✏></button>
                            <button class="btn-core" style="background:transparent; color:#ff003c; padding:2px 6px; font-size:9px;" onclick="Forum.deleteReply('${topicId}', '${rId}')">🗑️</button>
                        </div>
                    `;
                }

                let quoteHtml = '';
                if(rData.replyToNick) {
                    quoteHtml = `<div style="background:#10101c; border-left:2px solid var(--neon-blue); padding:6px 10px; font-size:11px; color:#aaa; margin-bottom:10px; border-radius:3px;">↪️ Ответ пользователю <b style="color:#fff;">${rData.replyToNick}</b></div>`;
                }

                const item = document.createElement('div');
                item.className = 'post-card';
                item.innerHTML = `
                    ${replyManagementHtml}
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img class="avatar-mini" src="${rData.authorAvatar || 'https://i.imgur.com/8Km9tTv.png'}">
                            <div>
                                <span class="${rGlow}" style="font-weight:bold; font-size:13px; cursor:pointer;" onclick="UI.showUserCard('${rData.authorUid}')">${rData.authorNick}</span>${rVerify}
                                <span class="badge-role ${rData.authorRole || 'badge-user'}" style="font-size:7px; padding:1px 4px; margin-left:5px;">${(rData.authorRole || 'user').replace('badge-','')}</span>
                            </div>
                        </div>
                        <span style="font-size:11px; color:var(--neon-blue); cursor:pointer; font-weight:bold;" onclick="Forum.setReplyQuote('${rData.authorUid}', '${rData.authorNick}')">Ответить</span>
                    </div>
                    ${quoteHtml}
                    <div style="font-size:14px; color:#d1d1db; white-space:pre-wrap;">${UI.parseBBCode(rData.text)}</div>
                    <div id="react-reply-${rId}"></div>
                `;
                target.appendChild(item);
                Reactions.sync(`replies/${topicId}/${rId}/reactions`, `react-reply-${rId}`);
            });
        });
    },
    setReplyQuote: (uid, nick) => {
        activeFsReplyToUid = uid;
        activeFsReplyToNick = nick;
        const ind = document.getElementById('reply-target-indicator');
        ind.innerText = `↪️ Ответ для ${nick} (Отменить)`;
        ind.style.display = 'block';
    },
    cancelReplyQuote: () => {
        activeFsReplyToUid = null; activeFsReplyToNick = null;
        document.getElementById('reply-target-indicator').style.display = 'none';
    },
    sendFsReply: () => {
        const text = document.getElementById('fs-reply-text').value;
        if(!text || !currentSelectedTopicId) return;

        const data = {
            text: text,
            authorUid: currentUser.uid,
            authorNick: currentProfileData.nick,
            authorAvatar: currentProfileData.avatar,
            authorRole: currentProfileData.role,
            authorVerify: currentProfileData.verifyBadge || 'none',
            timestamp: Date.now()
        };

        if(activeFsReplyToUid) {
            data.replyToUid = activeFsReplyToUid;
            data.replyToNick = activeFsReplyToNick;
            AppNotif.send(activeFsReplyToUid, `${currentProfileData.nick} ответил на ваше сообщение.`);
        }

        db.ref('replies/' + currentSelectedTopicId).push(data).then(() => {
            document.getElementById('fs-reply-text').value = '';
            Forum.cancelReplyQuote();
        });
    },
    openEditPostModal: (fbPath, currentText) => {
        window.activeEditPath = fbPath;
        document.getElementById('edit-post-textarea').value = currentText;
        UI.show('m-edit-post');
    },
    saveEditedPost: () => {
        const txt = document.getElementById('edit-post-textarea').value;
        if(!txt || !window.activeEditPath) return;
        db.ref(window.activeEditPath).set(txt).then(() => UI.close('m-edit-post'));
    },
    deleteTopic: (nodeId, topicId) => {
        if(confirm('Удалить тему?')) {
            Forum.closeFullscreen();
            db.ref(`topics/${nodeId}/${topicId}`).remove();
            db.ref(`replies/${topicId}`).remove();
        }
    },
    deleteReply: (topicId, replyId) => {
        if(confirm('Удалить комментарий?')) db.ref(`replies/${topicId}/${replyId}`).remove();
    }
};

// =================================================================
// 👍 SYSTEM OF REACTIONS
// =================================================================
const Reactions = {
    sync: (fbPath, htmlElementId) => {
        db.ref(fbPath).on('value', snap => {
            const zone = document.getElementById(htmlElementId);
            if(!zone) return;
            let likes = 0, loves = 0, laffs = 0, angry = 0;
            let myActiveReact = null;
            snap.forEach(child => {
                const u = child.key; const type = child.val();
                if(type === '👍') likes++; if(type === '❤️') loves++;
                if(type === '😂') laffs++; if(type === '😡') angry++;
                if(currentUser && u === currentUser.uid) myActiveReact = type;
            });
            zone.innerHTML = `
                <div class="reactions-bar">
                    <div class="react-btn" onclick="Reactions.toggle('${fbPath}', '👍')" style="${myActiveReact==='👍'?'transform:scale(1.2); filter:drop-shadow(0 0 4px #00d2ff);':''}">👍 <span class="react-count">${likes}</span></div>
                    <div class="react-btn" onclick="Reactions.toggle('${fbPath}', '❤️')" style="${myActiveReact==='❤️'?'transform:scale(1.2); filter:drop-shadow(0 0 4px red);':''}">❤️ <span class="react-count">${loves}</span></div>
                    <div class="react-btn" onclick="Reactions.toggle('${fbPath}', '😂')" style="${myActiveReact==='😂'?'transform:scale(1.2); filter:drop-shadow(0 0 4px yellow);':''}">😂 <span class="react-count">${laffs}</span></div>
                    <div class="react-btn" onclick="Reactions.toggle('${fbPath}', '😡')" style="${myActiveReact==='😡'?'transform:scale(1.2); filter:drop-shadow(0 0 4px var(--accent));':''}">😡 <span class="react-count">${angry}</span></div>
                </div>
            `;
        });
    },
    toggle: (fbPath, emo) => {
        if(!currentUser) return;
        const rRef = db.ref(`${fbPath}/${currentUser.uid}`);
        rRef.once('value', snap => {
            if(snap.val() === emo) rRef.remove(); else rRef.set(emo);
        });
    }
};

// =================================================================
// 🔔 REALTIME NOTIFICATIONS
// =================================================================
const AppNotif = {
    send: (targetUid, text) => {
        if(targetUid === currentUser.uid) return;
        db.ref(`notifications/${targetUid}`).push({ text: text, timestamp: Date.now() });
    },
    listen: (uid) => {
        db.ref(`notifications/${uid}`).on('value', snap => {
            const badge = document.getElementById('bell-badge');
            const zone = document.getElementById('notif-render-zone');
            if(!badge || !zone) return;
            let count = snap.numChildren();
            if(count > 0) { badge.innerText = count; badge.style.display = 'block'; } else { badge.style.display = 'none'; }
            zone.innerHTML = '';
            if(!snap.exists()) { zone.innerHTML = `<p style="text-align:center;color:#555;font-size:12px;padding:20px;">Нет уведомлений</p>`; return; }
            snap.forEach(child => {
                const item = document.createElement('div'); item.className = 'notif-item';
                item.innerText = child.val().text; zone.appendChild(item);
            });
        });
    },
    clearAll: () => { if(currentUser) db.ref(`notifications/${currentUser.uid}`).remove(); }
};

// =================================================================
// 👤 PROFILE SYSTEM
// =================================================================
const Profile = {
    open: () => {
        if(!currentUser || !currentProfileData) return;
        document.getElementById('p-avatar-view').src = currentProfileData.avatar;
        document.getElementById('p-nick').value = currentProfileData.nick;
        UI.show('m-profile');
    },
    preview: (e) => {
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('p-avatar-view').src = event.target.result;
            window.tempAvatarBase64 = event.target.result;
        };
        reader.readAsDataURL(file);
    },
    save: () => {
        const nick = document.getElementById('p-nick').value; if(!nick) return;
        let updates = { nick: nick };
        if(window.tempAvatarBase64) updates.avatar = window.tempAvatarBase64;
        db.ref('users/' + currentUser.uid).update(updates).then(() => {
            window.tempAvatarBase64 = null; UI.close('m-profile');
        });
    }
};

// =================================================================
// 🛡️ STAFF OPERATIONS (АДМИН-ПАНЕЛЬ: БЕЗ ВЫДАЧИ ОСНОВАТЕЛЯ И БЕЗ СЛИВА ПОЧТ)
// =================================================================
const Admin = {
    open: () => {
        UI.show('m-admin');
        const select = document.getElementById('adm-user-list');
        if(!select) return;
        select.innerHTML = '<option value="none">-- Выберите известного игрока или укажите UID --</option>';
        
        // Заполняем список зарегистрированными в процессе работы никами/UID
        knownUserMap.forEach((nick, uid) => {
            const o = document.createElement('option');
            o.value = uid;
            o.innerText = `${nick} (UID: ${uid.substring(0, 6)}...)`;
            select.appendChild(o);
        });
    },
    onUserSelectChange: () => {
        const uid = document.getElementById('adm-user-list').value;
        if(uid === 'none') return;
        
        // Безопасное чтение одного выбранного пользователя по UID
        db.ref('users/' + uid).once('value', snap => {
            const d = snap.val(); if(!d) return;
            
            // В селектор выставляются только безопасные роли
            const roleSelect = document.getElementById('adm-role');
            if (roleSelect) {
                roleSelect.value = (d.role === 'badge-founder') ? 'badge-admin' : (d.role || 'badge-user');
            }
            
            document.getElementById('adm-verify').value = d.verifyBadge || 'none';
            let banStatus = 'no';
            if(d.isBanned) banStatus = 'yes'; else if(d.isMuted) banStatus = 'mute';
            document.getElementById('adm-ban').value = banStatus;
            document.getElementById('adm-leader-node-select').value = d.nodeModeratorId || 'none';
        });
    },
    save: () => {
        let uid = document.getElementById('adm-user-list').value;
        
        // Если администратор ввел UID вручную в текстовое поле
        const manualInput = document.getElementById('adm-manual-uid-input');
        if (manualInput && manualInput.value.trim() !== '') {
            uid = manualInput.value.trim();
        }

        if(!uid || uid === 'none') {
            alert('Пожалуйста, выберите игрока из списка или введите UID!');
            return;
        }

        const role = document.getElementById('adm-role').value;
        const verify = document.getElementById('adm-verify').value;
        const ban = document.getElementById('adm-ban').value;
        const leaderNode = document.getElementById('adm-leader-node-select').value;

        // Блокировка попытки назначить 'badge-founder' из интерфейса
        if (role === 'badge-founder') {
            alert('Ошибка безопасности: Роль Основателя выдается ТОЛЬКО через консоль Firebase!');
            return;
        }

        let updates = {
            role: role,
            verifyBadge: verify,
            nodeModeratorId: leaderNode === 'none' ? null : leaderNode
        };

        if(ban === 'yes') { updates.isBanned = true; updates.isMuted = null; }
        else if(ban === 'mute') { updates.isMuted = true; updates.isBanned = null; }
        else { updates.isBanned = null; updates.isMuted = null; }

        db.ref('users/' + uid).update(updates).then(() => {
            alert('Данные игрока успешно обновлены!');
            UI.close('m-admin');
        }).catch(err => {
            alert('Ошибка при сохранении: ' + err.message);
        });
    },
    createNode: () => {
        const title = document.getElementById('node-title').value;
        if(!title) return;
        db.ref('nodes').push({ title: title }).then(() => {
            UI.close('m-node');
            document.getElementById('node-title').value = '';
        });
    }
};

const LeaderPanel = {
    open: () => {
        if(!currentProfileData || !currentProfileData.nodeModeratorId) return;
        db.ref('nodes/' + currentProfileData.nodeModeratorId).once('value', snap => {
            if(snap.exists()) {
                document.getElementById('leader-assigned-node-title').innerText = snap.val().title;
                UI.show('m-leader');
            }
        });
    },
    goToMyNode: () => {
        if(!currentProfileData || !currentProfileData.nodeModeratorId) return;
        UI.close('m-leader');
        db.ref('nodes/' + currentProfileData.nodeModeratorId).once('value', snap => {
            Forum.loadNode(currentProfileData.nodeModeratorId, snap.val().title);
        });
    }
};

// =================================================================
// 🎨 UI & РЕНДЕР ГАЛОЧЕК
// =================================================================
const UI = {
    show: (id) => { document.getElementById(id).style.display = 'flex'; },
    close: (id) => { document.getElementById(id).style.display = 'none'; },
    toggleNotifs: () => {
        const d = document.getElementById('bell-dropdown');
        d.style.display = d.style.display === 'block' ? 'none' : 'block';
    },
    showUserCard: (uid) => {
        db.ref('users/' + uid).once('value', snap => {
            const d = snap.val(); if(!d) return;
            registerKnownUser(uid, d.nick);
            
            document.getElementById('card-avatar').src = d.avatar || 'https://i.imgur.com/8Km9tTv.png';
            document.getElementById('card-nick').className = UI.getGlowClass(d.role || 'badge-user');
            document.getElementById('card-nick').innerText = d.nick;
            const badgeZone = document.getElementById('card-badge-container');
            badgeZone.innerHTML = `<span class="badge-role ${d.role || 'badge-user'}">${(d.role || 'user').replace('badge-','')}</span>` + UI.getVerifyHtml(d.verifyBadge || 'none');
            let statusText = "🟢 На форуме";
            if(d.isBanned) statusText = "🚫 ЗАБЛОКИРОВАН"; else if(d.isMuted) statusText = "🔇 В МУТЕ";
            document.getElementById('card-status').innerText = statusText;
            UI.show('m-user-card');
        });
    },
    getGlowClass: (role) => {
        if(role === 'badge-founder') return 'glow-founder';
        if(role === 'badge-admin') return 'glow-admin';
        if(role === 'badge-leader') return 'glow-leader';
        return '';
    },
    getVerifyHtml: (v) => {
        if(!v || v === 'none') return '';
        return `<span class="verified-badge ${v}"></span>`;
    },
    parseBBCode: (text) => {
        if(!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\[b\](.*?)\[\/b\]/gi, '<b>$1</b>')
            .replace(/\[i\](.*?)\[\/i\]/gi, '<i>$1</i>')
            .replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" style="max-width:100%; border-radius:4px;">');
    }
};
