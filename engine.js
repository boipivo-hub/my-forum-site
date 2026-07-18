// =================================================================
// ⚙️ GLOBAL CORE & CONFIGURATION
// =================================================================
const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;
let currentProfileData = null;
let currentSelectedNodeId = null;
let currentSelectedTopicId = null;
let activeFsReplyToUid = null;
let activeFsReplyToNick = null;

// ТВОИ ХАРДКОД-ДАННЫЕ ДЛЯ АБСОЛЮТНЫХ ПРАВ
const MY_ROOT_EMAIL = "ariessupporttest@gmail.com";
const MY_ROOT_NICK = "Qumestlies_Shawty";

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
// 🔑 AUTHENTICATION MODULE (С ХАРДКОД-ОБХОДОМ ДЛЯ ТЕБЯ)
// =================================================================
const Auth = {
    listen: () => {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                
                // ЕСЛИ ЗАШЁЛ ТЫ — ДАЁМ АБСОЛЮТНЫЙ ДОСТУП
                if (user.email && user.email.toLowerCase() === MY_ROOT_EMAIL.toLowerCase()) {
                    db.ref('users/' + user.uid).once('value', snap => {
                        let existing = snap.val() || {};
                        currentProfileData = {
                            nick: MY_ROOT_NICK,
                            avatar: existing.avatar || user.photoURL || "https://i.imgur.com/8Km9tTv.png",
                            role: "badge-founder",
                            verifyBadge: "verif-admin" // Старая красная галочка админа
                        };
                        
                        // Записываем и закрепляем в базе
                        db.ref('users/' + user.uid).update(currentProfileData);
                        db.ref('founders/' + user.uid).set(true);
                        
                        Auth.renderHeader(true);
                        document.getElementById('admin-panel-btn').style.display = 'block';
                    });
                    return;
                }

                // Логика для остальных пользователей
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
        
        // Проверка прав создателя/администратора
        db.ref('founders/' + currentUser.uid).once('value', snap => {
            if (snap.exists() || (currentUser.email && currentUser.email.toLowerCase() === MY_ROOT_EMAIL.toLowerCase())) {
                document.getElementById('admin-panel-btn').style.display = 'block';
            } else {
                if (currentProfileData && currentProfileData.role === 'badge-admin') {
                    document.getElementById('admin-panel-btn').style.display = 'block';
                } else {
                    document.getElementById('admin-panel-btn').style.display = 'none';
                }
            }
        });

        // Проверка прав лидера
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

                let authorGlow = UI.getGlowClass(tData.authorRole || 'badge-user');
                let authorVerify = UI.getVerifyHtml(tData.authorVerify || 'none');

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            <span style="font-size:16px; font-weight:bold; color:#fff;">${tData.title}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img class="avatar-mini" src="${tData.authorAvatar || 'https://i.imgur.com/8Km9tTv.png'}" onclick="UI.showUserCard('${tData.authorUid}')">
                            <span class="author-click ${authorGlow}" style="font-size:13px;" onclick="UI.showUserCard('${tData.authorUid}')">${tData.authorNick || 'User'}</span>${authorVerify}
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

                let rGlow = UI.getGlowClass(rData.authorRole || 'badge-user');
                let rVerify = UI.getVerifyHtml(rData.authorVerify || 'none');

                let replyManagementHtml = '';
                if(currentUser && (currentUser.uid === rData.authorUid || currentProfileData.role === 'badge-founder' || (currentProfileData.role === 'badge-leader' && currentProfileData.nodeModeratorId === nodeId))) {
                    replyManagementHtml = `
                        <div style="position:absolute; top:10px; right:10px; display:flex; gap:4px;">
                            <button class="btn-core" style="background:transparent; color:#ffb700; padding:2px 6px; font-size:9px;" onclick="Forum.openEditPostModal('replies/${topicId}/${rId}/text', \`${rData.text.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`)">✏✏</button>
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
// 👤 PROFILE SYSTEM (ИСПРАВЛЕНО СОХРАНЕНИЕ КАРТИНОК)
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
            window.tempAvatarBase64 = event.target.result; // Сюда падает строка картинки
        };
        reader.readAsDataURL(file);
    },
    save: () => {
        const nick = document.getElementById('p-nick').value; if(!nick) return;
        let updates = { nick: nick };
        if(window.tempAvatarBase64) {
            updates.avatar = window.tempAvatarBase64;
        }
        
        db.ref('users/' + currentUser.uid).update(updates).then(() => {
            window.tempAvatarBase64 = null; 
            UI.close('m-profile');
            alert('Профиль успешно обновлен!');
        }).catch(err => {
            alert('Ошибка записи аватара. Возможно база данных блокирует большой объём. Проверьте Rules.');
        });
    }
};

// =================================================================
// 🛡️ STAFF OPERATIONS (УПРАВЛЕНИЕ РОЛЯМИ, ГАЛОЧКАМИ И ЛИДЕРКАМИ)
// =================================================================
const Admin = {
    open: () => {
        UI.show('m-admin');
        db.ref('users').once('value', snap => {
            const select = document.getElementById('adm-user-list');
            if(!select) return;
            select.innerHTML = '<option value="none">-- Выберите игрока --</option>';
            snap.forEach(child => {
                const o = document.createElement('option');
                o.value = child.key;
                o.innerText = `${child.val().nick} (${child.key.substring(0,6)})`;
                select.appendChild(o);
            });
        });
    },
    onUserSelectChange: () => {
        const uid = document.getElementById('adm-user-list').value;
        if(uid === 'none') return;
        db.ref('users/' + uid).once('value', snap => {
            const d = snap.val(); if(!d) return;
            document.getElementById('adm-role').value = d.role || 'badge-user';
            document.getElementById('adm-verify').value = d.verifyBadge || 'none';
            let banStatus = 'no';
            if(d.isBanned) banStatus = 'yes'; else if(d.isMuted) banStatus = 'mute';
            document.getElementById('adm-ban').value = banStatus;
            document.getElementById('adm-leader-node-select').value = d.nodeModeratorId || 'none';
        });
    },
    save: () => {
        const uid = document.getElementById('adm-user-list').value;
        if(uid === 'none') return;

        const role = document.getElementById('adm-role').value;
        const verify = document.getElementById('adm-verify').value;
        const ban = document.getElementById('adm-ban').value;
        const leaderNode = document.getElementById('adm-leader-node-select').value;

        let updates = {
            role: role,
            verifyBadge: verify,
            nodeModeratorId: leaderNode === 'none' ? null : leaderNode
        };

        if(ban === 'yes') { updates.isBanned = true; updates.isMuted = null; }
        else if(ban === 'mute') { updates.isMuted = true; updates.isBanned = null; }
        else { updates.isBanned = null; updates.isMuted = null; }

        // Если ставим права создателя, дублируем в ветку супер-доступа
        if(role === 'badge-founder') {
            db.ref('founders/' + uid).set(true);
        } else {
            db.ref('founders/' + uid).remove();
        }

        db.ref('users/' + uid).update(updates).then(() => {
            alert('Успешно выдано! Данные пользователя обновлены на сервере.');
            UI.close('m-admin');
        });
    },
    createNode: () => {
        const title = document.getElementById('node-title').value;
        if(!title) return;
        db.ref('nodes').push({ title: title }).then(() => {
            document.getElementById('node-title').value = '';
            alert('Раздел создан!');
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
// 🎨 UI & BB-CODE PARSER
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
            document.getElementById('card-avatar').src = d.avatar || 'https://i.imgur.com/8Km9tTv.png';
            document.getElementById('card-nick').className = UI.getGlowClass(d.role || 'badge-user');
            document.getElementById('card-nick').innerText = d.nick;
            const badgeZone = document.getElementById('card-badge-container');
            badgeZone.innerHTML = `<br><span class="badge-role ${d.role || 'badge-user'}">${(d.role || 'user').replace('badge-','')}</span>` + UI.getVerifyHtml(d.verifyBadge || 'none');
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

const Editor = {
    tag: (open, close) => {
        const area = document.getElementById('t-text');
        const start = area.selectionStart; const end = area.selectionEnd;
        const text = area.value;
        area.value = text.substring(0, start) + open + text.substring(start, end) + close + text.substring(end);
        area.focus();
    }
};
