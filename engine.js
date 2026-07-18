/**
 * Aries RP Forum Engine - Core Architecture
 * Версия: 4.2.0-FINAL
 * Разработчик ядра: Qumestlies_Shawty
 */

// Личный верифицированный конфиг Realtime Database
const firebaseConfig = {
  apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM",
  authDomain: "aries-forum.firebaseapp.com",
  databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "aries-forum",
  storageBucket: "aries-forum.firebasestorage.app",
  messagingSenderId: "614643963857",
  appId: "1:614643963857:web:01f1f941c72249ac6eb2f0",
  measurementId: "G-8YWLND4LR2"
};

// Инициализация контекста
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Глобальное состояние
let currentUser = null;
let currentProfileData = null;
let currentSelectedNodeId = null;
let currentSelectedTopicId = null;
let activeFsReplyToUid = null;
let activeFsReplyToNick = null;

// Системные константы суперадмина
const MY_ROOT_EMAIL = "ariessupporttest@gmail.com";
const MY_ROOT_NICK = "Qumestlies_Shawty";

// Служебные кэши данных для оптимизации рендера
let usersCache = {};
let activeNodeListeners = {};
let activeTopicListeners = {};
let activeReplyListeners = {};

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});

const App = {
    init: () => {
        console.log("[Aries Engine] Инициализация системных модулей...");
        Auth.listen();
        Nodes.sync();
        Users.preload();
    }
};

const Auth = {
    listen: () => {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                console.log("[Auth] Пользователь авторизован: " + user.email);
                
                // Проверка на жесткие права создателя по Email напрямую
                if (user.email && user.email.toLowerCase() === MY_ROOT_EMAIL.toLowerCase()) {
                    db.ref('users/' + user.uid).once('value', snap => {
                        let data = snap.val() || {};
                        currentProfileData = {
                            nick: MY_ROOT_NICK,
                            avatar: data.avatar || user.photoURL || "https://i.imgur.com/8Km9tTv.png",
                            role: "badge-founder",
                            verifyBadge: "verif-admin",
                            isBanned: false,
                            isMuted: false
                        };
                        // Намертво обновляем и фиксируем в БД структуру
                        db.ref('users/' + user.uid).update(currentProfileData);
                        db.ref('founders/' + user.uid).set(true);
                        
                        Auth.renderHeader(true);
                        document.getElementById('admin-panel-btn').style.display = 'block';
                    });
                    return;
                }

                // Логика обычного юзера
                db.ref('users/' + user.uid).on('value', snap => {
                    currentProfileData = snap.val();
                    if (!currentProfileData) {
                        currentProfileData = {
                            nick: user.displayName ? user.displayName.replace(/\s+/g, '_') : "Player_New",
                            avatar: user.photoURL || "https://i.imgur.com/8Km9tTv.png",
                            role: "badge-user",
                            verifyBadge: "none",
                            isBanned: false,
                            isMuted: false
                        };
                        db.ref('users/' + user.uid).set(currentProfileData);
                    }

                    // Проверка бана при живой сессии
                    if (currentProfileData.isBanned) {
                        alert("Ваш аккаунт заблокирован администрацией проекта.");
                        auth.signOut();
                        return;
                    }

                    // Видимость админки
                    if (currentProfileData.role === 'badge-founder' || currentProfileData.role === 'badge-admin') {
                        document.getElementById('admin-panel-btn').style.display = 'block';
                    } else {
                        document.getElementById('admin-panel-btn').style.display = 'none';
                    }

                    Auth.renderHeader(true);
                });

            } else {
                currentUser = null;
                currentProfileData = null;
                console.log("[Auth] Сессия пуста (гостевой режим)");
                Auth.renderHeader(false);
                document.getElementById('admin-panel-btn').style.display = 'none';
            }
        });
    },

    google: () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(res => {
                console.log("[Auth] Вход через Google успешен");
                UI.close('m-auth');
            })
            .catch(err => {
                console.error("[Auth] Ошибка входа: ", err);
                alert("Ошибка авторизации. Попробуйте снова.");
            });
    },

    logout: () => {
        if (confirm("Вы действительно хотите выйти из аккаунта?")) {
            auth.signOut().then(() => {
                window.location.reload();
            });
        }
    },

    renderHeader: (isAuth) => {
        const zone = document.getElementById('header-auth');
        if (!zone) return;

        if (isAuth && currentProfileData) {
            let glow = UI.getGlowClass(currentProfileData.role);
            let verify = UI.getVerifyHtml(currentProfileData.verifyBadge);
            
            zone.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="text-align: right;">
                        <div class="flex-center" style="justify-content: flex-end;">
                            <span class="${glow}" style="cursor: pointer; font-size: 15px;" onclick="Profile.open()">${currentProfileData.nick}</span>
                            ${verify}
                        </div>
                        <span class="badge-role ${currentProfileData.role}">${currentProfileData.role.replace('badge-', '')}</span>
                    </div>
                    <img class="avatar-mini" src="${currentProfileData.avatar}" onclick="Profile.open()" title="Личный кабинет">
                    <button class="btn-core" style="background: #1c1c34; padding: 7px 12px; font-size: 11px;" onclick="Auth.logout()">Выйти</button>
                </div>
            `;
        } else {
            zone.innerHTML = `
                <button class="btn-core" onclick="UI.show('m-auth')">🔑 Авторизация</button>
            `;
        }
    }
};

const Nodes = {
    sync: () => {
        db.ref('nodes').on('value', snap => {
            const zone = document.getElementById('sidebar-nodes');
            if (!zone) return;
            zone.innerHTML = '';

            if (!snap.exists()) {
                zone.innerHTML = `<div class="text-muted" style="padding: 10px 15px;">Нет разделов</div>`;
                return;
            }

            snap.forEach(child => {
                const node = child.val();
                const key = child.key;

                const link = document.createElement('div');
                link.className = 'nav-link';
                link.id = `node-link-${key}`;
                link.innerHTML = `
                    <span style="font-size: 16px;">📁</span>
                    <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${node.title}</span>
                `;
                link.onclick = () => Forum.loadNode(key, node.title);
                zone.appendChild(link);
            });

            if (currentSelectedNodeId) {
                const active = document.getElementById(`node-link-${currentSelectedNodeId}`);
                if (active) active.classList.add('active');
            }
        });
    }
};

const Forum = {
    loadNode: (nodeId, nodeTitle) => {
        currentSelectedNodeId = nodeId;
        
        // Визуальный маркер активного раздела
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        const activeLink = document.getElementById(`node-link-${nodeId}`);
        if (activeLink) activeLink.classList.add('active');

        document.getElementById('forum-breadcrumbs').innerText = `Главная / ${nodeTitle}`;

        const zone = document.getElementById('forum-render');
        zone.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800;">${nodeTitle}</h1>
                    <span class="text-muted">Официальные топики и обсуждения раздела</span>
                </div>
                <button class="btn-core" onclick="Forum.openCreateTopicModal()">➕ Создать новую тему</button>
            </div>
            <div id="topics-list-zone">
                <div class="text-muted" style="text-align:center; padding: 40px;">Загрузка веток обсуждений...</div>
            </div>
        `;

        // Отписываемся от старых стримов тем, чтобы не было утечки памяти
        if (activeTopicListeners[nodeId]) {
            db.ref('topics/' + nodeId).off('value', activeTopicListeners[nodeId]);
        }

        activeTopicListeners[nodeId] = db.ref('topics/' + nodeId).on('value', snap => {
            const listZone = document.getElementById('topics-list-zone');
            if (!listZone) return;
            listZone.innerHTML = '';

            if (!snap.exists()) {
                listZone.innerHTML = `
                    <div style="text-align: center; padding: 60px; border: 1px dashed var(--border-color); border-radius: 8px;">
                        <span style="font-size: 30px;">📭</span>
                        <h3 style="margin: 10px 0 5px 0;">В данном разделе ещё нет тем</h3>
                        <p class="text-muted" style="margin: 0;">Будьте первым, кто создаст обсуждение!</p>
                    </div>
                `;
                return;
            }

            snap.forEach(child => {
                const tId = child.key;
                const t = child.val();

                let glow = UI.getGlowClass(t.authorRole || 'badge-user');
                let verify = UI.getVerifyHtml(t.authorVerify || 'none');
                let statusStr = t.status === 'status-closed' ? 'Закрыто' : t.status === 'status-consideration' ? 'В обработке' : 'Открыто';

                const card = document.createElement('div');
                card.className = 'post-card topic-item';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                        <div style="display: flex; align-items: center; gap: 15px; flex: 1; min-width: 0;">
                            <span class="status-badge ${t.status || 'status-open'}" style="white-space: nowrap;">${statusStr}</span>
                            <div style="min-width: 0;">
                                <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #fff; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.title}</h3>
                                <div style="display: flex; align-items: center; gap: 6px; font-size: 12px;" class="text-muted">
                                    <span>Автор топика:</span>
                                    <span class="${glow}" style="cursor:pointer;" onclick="event.stopPropagation(); Users.viewCard('${t.authorUid}')">${t.authorNick}</span>
                                    ${verify}
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right; font-size: 13px;" class="text-muted">
                            <button class="btn-core" style="padding: 6px 12px; font-size: 10px; background: #16162d; border: 1px solid var(--border-color);" onclick="event.stopPropagation(); Forum.openFullscreenTopic('${nodeId}', '${tId}')">Читать ➔</button>
                        </div>
                    </div>
                `;
                card.onclick = () => Forum.openFullscreenTopic(nodeId, tId);
                listZone.appendChild(card);
            });
        });
    },

    openCreateTopicModal: () => {
        if (!currentUser) {
            UI.show('m-auth');
            return;
        }
        if (currentProfileData.isBanned) return;

        // Показываем админ опции статуса, если зашел админ/создатель
        if (currentProfileData.role === 'badge-founder' || currentProfileData.role === 'badge-admin') {
            document.getElementById('t-admin-options').style.display = 'flex';
        } else {
            document.getElementById('t-admin-options').style.display = 'none';
        }

        document.getElementById('t-title').value = '';
        document.getElementById('t-text').value = '';
        document.getElementById('t-status').value = 'status-open';

        UI.show('m-topic');
    },

    post: () => {
        if (!currentUser || !currentSelectedNodeId) return;
        
        const title = document.getElementById('t-title').value.trim();
        const text = document.getElementById('t-text').value.trim();
        const status = document.getElementById('t-status').value;

        if (!title || !text) {
            alert("Заполните все поля заголовка и содержимого!");
            return;
        }

        db.ref('topics/' + currentSelectedNodeId).push({
            title: title,
            text: text,
            status: status,
            authorUid: currentUser.uid,
            authorNick: currentProfileData.nick,
            authorAvatar: currentProfileData.avatar,
            authorRole: currentProfileData.role,
            authorVerify: currentProfileData.verifyBadge || 'none',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            UI.close('m-topic');
        }).catch(err => {
            alert("Ошибка записи на сервере: " + err.message);
        });
    },

    openFullscreenTopic: (nodeId, topicId) => {
        currentSelectedTopicId = topicId;
        UI.show('fullscreen-view');

        if (activeFsReplyToUid) Forum.cancelReplyQuote();

        db.ref(`topics/${nodeId}/${topicId}`).on('value', snap => {
            const data = snap.val();
            if (!data) return;

            document.getElementById('fs-topic-title').innerText = data.title;
            let dateStr = data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Неизвестно';
            document.getElementById('fs-topic-meta').innerText = `Создано: ${dateStr}`;

            let statusStr = data.status === 'status-closed' ? 'Архив' : data.status === 'status-consideration' ? 'На рассмотрении' : 'Открытая ветка';
            const statusBadge = document.getElementById('fs-topic-badge-status');
            statusBadge.className = `status-badge ${data.status || 'status-open'}`;
            statusBadge.innerText = statusStr;

            const container = document.getElementById('fs-messages-container');
            
            let glow = UI.getGlowClass(data.authorRole || 'badge-user');
            let verify = UI.getVerifyHtml(data.authorVerify || 'none');

            // Кнопка удаления топика для админов
            let adminActionsHtml = '';
            if (currentUser && (currentUser.uid === data.authorUid || currentProfileData.role === 'badge-founder' || currentProfileData.role === 'badge-admin')) {
                adminActionsHtml = `
                    <div style="margin-top: 15px; display:flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-core" style="background:#222; padding: 5px 10px; font-size:10px;" onclick="Forum.deleteTopic('${nodeId}', '${topicId}')">🗑 Удалить топик</button>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="post-card" style="background: #131326; border-color: rgba(0,210,255,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img class="avatar-mini" src="${data.authorAvatar}" onclick="Users.viewCard('${data.authorUid}')" style="width:48px; height:48px;">
                            <div>
                                <div class="flex-center">
                                    <span class="${glow}" style="font-size: 16px; cursor:pointer;" onclick="Users.viewCard('${data.authorUid}')">${data.authorNick}</span>
                                    ${verify}
                                </div>
                                <span class="badge-role ${data.authorRole}">${data.authorRole.replace('badge-','')}</span>
                            </div>
                        </div>
                        <span class="text-muted" style="font-size:12px;">#Оригинальный пост</span>
                    </div>
                    <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #fff; padding: 5px 0;">${data.text}</div>
                    ${adminActionsHtml}
                </div>
                <div id="fs-replies-zone"></div>
            `;

            Forum.syncReplies(topicId, data.status);
        });
    },

    closeFullscreen: () => {
        UI.close('fullscreen-view');
        currentSelectedTopicId = null;
    },

    deleteTopic: (nodeId, topicId) => {
        if (confirm("Вы уверены, что хотите полностью стереть эту тему и все ответы в ней? Потери необратимы.")) {
            db.ref(`topics/${nodeId}/${topicId}`).remove().then(() => {
                db.ref(`replies/${topicId}`).remove();
                Forum.closeFullscreen();
            });
        }
    },

    syncReplies: (topicId, topicStatus) => {
        const footer = document.getElementById('fs-reply-footer');
        if (topicStatus === 'status-closed') {
            footer.innerHTML = `<div class="text-muted" style="text-align:center; padding: 10px; font-weight:700; color:var(--accent);">⚠️ Данное обсуждение закрыто администрацией проекта. Публикация новых ответов невозможна.</div>`;
        } else {
            // Восстанавливаем дефолтное текстовое поле
            footer.innerHTML = `
                <div id="reply-target-indicator" style="display: none; background: #161632; padding: 10px 18px; margin-bottom: 12px; border-left: 4px solid var(--neon-blue); border-radius: 4px; font-size: 13px; cursor: pointer;" onclick="Forum.cancelReplyQuote()"></div>
                <div style="display: flex; gap: 12px; align-items: flex-end;">
                    <textarea class="input-core" id="fs-reply-text" placeholder="Напишите развернутый ответ в тему..." style="flex: 1; height: 54px; resize: none; font-family:inherit;"></textarea>
                    <button class="btn-core" onclick="Forum.sendFsReply()" style="height: 54px; padding: 0 25px;">Отправить</button>
                </div>
            `;
        }

        db.ref('replies/' + topicId).on('value', snap => {
            const zone = document.getElementById('fs-replies-zone');
            if (!zone) return;
            zone.innerHTML = '';

            if (!snap.exists()) {
                zone.innerHTML = `<div class="text-muted" style="text-align:center; padding: 20px;">Нет ответов в теме. Будьте первым!</div>`;
                return;
            }

            snap.forEach(child => {
                const rId = child.key;
                const r = child.val();

                let glow = UI.getGlowClass(r.authorRole || 'badge-user');
                let verify = UI.getVerifyHtml(r.authorVerify || 'none');
                
                let quoteHtml = '';
                if (r.replyToNick) {
                    quoteHtml = `
                        <div style="background: rgba(0, 210, 255, 0.04); border-left: 2px solid var(--neon-blue); padding: 8px 12px; margin-bottom: 12px; border-radius: 4px; font-size: 13px;">
                            <span style="color: var(--neon-blue); font-weight:700;">↪ Ответ для ${r.replyToNick}</span>
                        </div>
                    `;
                }

                let deleteReplyBtn = '';
                if (currentUser && (currentUser.uid === r.authorUid || currentProfileData.role === 'badge-founder' || currentProfileData.role === 'badge-admin')) {
                    deleteReplyBtn = `<span style="color:var(--text-muted); cursor:pointer; font-size:12px;" onclick="Forum.deleteReply('${topicId}', '${rId}')">🗑 Удалить</span>`;
                }

                const block = document.createElement('div');
                block.className = 'post-card';
                block.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img class="avatar-mini" src="${r.authorAvatar}" onclick="Users.viewCard('${r.authorUid}')">
                            <div>
                                <div class="flex-center">
                                    <span class="${glow}" style="font-size:14px; cursor:pointer;" onclick="Users.viewCard('${r.authorUid}')">${r.authorNick}</span>
                                    ${verify}
                                </div>
                                <span class="badge-role ${r.authorRole}" style="font-size:8px; padding:2px 5px;">${r.authorRole.replace('badge-','')}</span>
                            </div>
                        </div>
                        <div style="display:flex; gap:12px; align-items:center;">
                            ${deleteReplyBtn}
                            <span style="color: var(--neon-blue); cursor: pointer; font-size: 13px; font-weight:600;" onclick="Forum.setReplyQuote('${r.authorUid}', '${r.authorNick}')">Ответить</span>
                        </div>
                    </div>
                    ${quoteHtml}
                    <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #e2e2e2;">${r.text}</div>
                `;
                zone.appendChild(block);
            });
        });
    },

    deleteReply: (topicId, replyId) => {
        if (confirm("Удалить данный комментарий?")) {
            db.ref(`replies/${topicId}/${replyId}`).remove();
        }
    },

    setReplyQuote: (uid, nick) => {
        if (!currentUser) { UI.show('m-auth'); return; }
        activeFsReplyToUid = uid;
        activeFsReplyToNick = nick;

        const indicator = document.getElementById('reply-target-indicator');
        if (indicator) {
            indicator.innerText = `× Вы отвечаете пользователю ${nick} (Нажмите сюда для отмены)`;
            indicator.style.display = 'block';
        }
    },

    cancelReplyQuote: () => {
        activeFsReplyToUid = null;
        activeFsReplyToNick = null;
        const indicator = document.getElementById('reply-target-indicator');
        if (indicator) {
            indicator.innerText = '';
            indicator.style.display = 'none';
        }
    },

    sendFsReply: () => {
        if (!currentUser) { UI.show('m-auth'); return; }
        if (currentProfileData.isMuted) {
            alert("У вас заблокирован чат (МУТ). Вы не можете отвечать.");
            return;
        }

        const input = document.getElementById('fs-reply-text');
        const text = input.value.trim();
        if (!text) return;

        let payload = {
            text: text,
            authorUid: currentUser.uid,
            authorNick: currentProfileData.nick,
            authorAvatar: currentProfileData.avatar,
            authorRole: currentProfileData.role,
            authorVerify: currentProfileData.verifyBadge || 'none',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        if (activeFsReplyToUid) {
            payload.replyToUid = activeFsReplyToUid;
            payload.replyToNick = activeFsReplyToNick;
        }

        db.ref('replies/' + currentSelectedTopicId).push(payload).then(() => {
            input.value = '';
            Forum.cancelReplyQuote();
            // Скроллим вниз к новому сообщению
            const body = document.querySelector('.fs-body');
            if (body) body.scrollTop = body.scrollHeight;
        });
    }
};

const Profile = {
    open: () => {
        if (!currentUser || !currentProfileData) return;
        document.getElementById('p-nick').value = currentProfileData.nick;
        document.getElementById('p-avatar-view').src = currentProfileData.avatar;
        window.tempAvatar = null;
        UI.show('m-profile');
    },

    preview: (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Прямое чтение Base64 без каких-либо лимитов на стороне клиента
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('p-avatar-view').src = event.target.result;
            window.tempAvatar = event.target.result; // Полная строка base64 пишется в буфер
        };
        reader.readAsDataURL(file);
    },

    save: () => {
        if (!currentUser) return;
        const nick = document.getElementById('p-nick').value.trim();
        
        if (!nick || nick.length < 3) {
            alert("Никнейм слишком короткий!");
            return;
        }

        let updateData = { nick: nick };
        if (window.tempAvatar) {
            updateData.avatar = window.tempAvatar; // Заливаем огромную аватарку в Firebase
        }

        db.ref('users/' + currentUser.uid).update(updateData).then(() => {
            console.log("[Profile] Личные данные успешно сохранены");
            UI.close('m-profile');
        }).catch(err => {
            alert("Ошибка сохранения: " + err.message);
        });
    }
};

const Users = {
    preload: () => {
        // Подгружаем базу юзеров в кэш для карточек
        db.ref('users').on('value', snap => {
            if (snap.exists()) usersCache = snap.val();
        });
    },

    viewCard: (uid) => {
        const user = usersCache[uid];
        if (!user) return;

        document.getElementById('card-avatar').src = user.avatar || "https://i.imgur.com/8Km9tTv.png";
        document.getElementById('card-nick').innerText = user.nick;
        document.getElementById('card-nick').className = UI.getGlowClass(user.role);
        
        let badgeZone = document.getElementById('card-badge-container');
        badgeZone.innerHTML = `
            <span class="badge-role ${user.role}">${user.role.replace('badge-','')}</span>
            ${UI.getVerifyHtml(user.verifyBadge)}
        `;

        document.getElementById('card-reg-date').innerText = user.isBanned ? "СТАТУС: ЗАБЛОКИРОВАН" : "СТАТУС: Свободный игрок";
        if(user.isBanned) document.getElementById('card-reg-date').style.color = "var(--accent)";
        else document.getElementById('card-reg-date').style.color = "var(--text-muted)";

        UI.show('m-user-card');
    }
};

const Admin = {
    open: () => {
        if (currentProfileData.role !== 'badge-founder' && currentProfileData.role !== 'badge-admin') return;
        UI.show('m-admin');

        // Рендерим селект юзеров
        const select = document.getElementById('adm-user-list');
        select.innerHTML = '';

        Object.keys(usersCache).forEach(uid => {
            const u = usersCache[uid];
            let opt = document.createElement('option');
            opt.value = uid;
            opt.innerText = u.nick;
            select.appendChild(opt);
        });

        Admin.onUserSelectChange();
    },

    onUserSelectChange: () => {
        const uid = document.getElementById('adm-user-list').value;
        if (!uid) return;

        const u = usersCache[uid];
        if (!u) return;

        document.getElementById('adm-role').value = u.role || 'badge-user';
        document.getElementById('adm-verify').value = u.verifyBadge || 'none';
        document.getElementById('adm-ban-status').checked = !!u.isBanned;
        document.getElementById('adm-mute-status').checked = !!u.isMuted;
    },

    save: () => {
        const uid = document.getElementById('adm-user-list').value;
        if (!uid) return;

        // Защита от попытки снять или забанить суперадмина
        if (usersCache[uid] && usersCache[uid].nick === MY_ROOT_NICK && currentProfileData.nick !== MY_ROOT_NICK) {
            alert("Критическая ошибка: Недостаточно прав для изменения создателя проекта.");
            return;
        }

        let updates = {
            role: document.getElementById('adm-role').value,
            verifyBadge: document.getElementById('adm-verify').value,
            isBanned: document.getElementById('adm-ban-status').checked,
            isMuted: document.getElementById('adm-mute-status').checked
        };

        db.ref('users/' + uid).update(updates).then(() => {
            alert("Права пользователя успешно изменены!");
            UI.close('m-admin');
        }).catch(err => {
            alert("Firebase отказал в доступе: " + err.message);
        });
    },

    createNode: () => {
        const titleInput = document.getElementById('node-title');
        const title = titleInput.value.trim();
        
        if (!title) return;

        db.ref('nodes').push({ title: title }).then(() => {
            titleInput.value = '';
            alert("Новый глобальный раздел успешно добавлен в левое меню!");
        });
    }
};

const UI = {
    show: (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'flex';
            setTimeout(() => el.classList.add('active'), 10);
        }
    },
    close: (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            setTimeout(() => el.style.display = 'none', 200);
        }
    },
    getGlowClass: (role) => {
        if (role === 'badge-founder') return 'glow-founder';
        if (role === 'badge-admin') return 'glow-admin';
        if (role === 'badge-leader') return 'glow-leader';
        if (role === 'badge-moderator') return 'glow-moderator';
        return '';
    },
    getVerifyHtml: (v) => {
        if (!v || v === 'none') return '';
        return `<span class="verified-badge ${v}"></span>`;
    }
};
