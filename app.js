/**
 * ARIES ROLEPLAY - FORUM ENGINE V4.0
 * ПОЛНАЯ ПРИВЯЗКА К FIREBASE
 */

const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM",
    authDomain: "aries-forum.firebaseapp.com",
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "aries-forum",
    storageBucket: "aries-forum.firebasestorage.app",
    messagingSenderId: "614643963857",
    appId: "1:614643963857:web:01f1f941c72249ac6eb2f0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

const App = {
    user: null,
    profile: null,
    ownerEmail: "ponkc29@gamil.com",
    ownerNick: "Qumestlies_Shawty",

    async init() {
        auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                this.user = firebaseUser;
                await this.syncProfile();
            } else {
                this.user = null;
                this.profile = null;
                UI.renderNav(false);
            }
            Forum.init();
        });

        if (auth.isSignInWithEmailLink(window.location.href)) {
            Auth.completeLogin();
        }
    },

    async syncProfile() {
        const snap = await db.ref(`users/${this.user.uid}`).once('value');
        let data = snap.val();

        if (!data) {
            data = {
                nickname: this.user.email.split('@')[0],
                avatar: "https://i.imgur.com/6EOnf8A.png",
                role: "user",
                isRainbow: false
            };
            if (this.user.email === this.ownerEmail) {
                data.role = "owner";
                data.nickname = this.ownerNick;
                data.isRainbow = true;
            }
            await db.ref(`users/${this.user.uid}`).set(data);
        }
        this.profile = data;
        UI.renderNav(true);
        if (data.role === 'owner') document.getElementById('admin-panel').classList.remove('hidden');
    }
};

const Forum = {
    currentCat: null,
    currentThread: null,

    async init() {
        const root = document.getElementById('app');
        root.innerHTML = "<div class='loading'>Загрузка форума...</div>";

        const snap = await db.ref('categories').once('value');
        root.innerHTML = "";

        if (!snap.exists()) {
            root.innerHTML = "<p>Разделов еще нет. Создайте первый в панели руководства.</p>";
            return;
        }

        snap.forEach(child => {
            const cat = child.val();
            const id = child.key;
            root.innerHTML += `
                <div class="cat-block">
                    <div class="cat-head">
                        <h2>${cat.title}</h2>
                        ${App.profile?.role === 'owner' ? `<button onclick="Forum.openThreadModal('${id}')" style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer;">СОЗДАТЬ ТЕМУ</button>` : ''}
                    </div>
                    <div id="cat-${id}">
                        ${this.renderThreads(id)}
                    </div>
                </div>
            `;
        });
    },

    async renderThreads(catId) {
        const container = document.getElementById(`cat-${catId}`);
        const snap = await db.ref(`threads/${catId}`).once('value');
        container.innerHTML = "";

        if (!snap.exists()) {
            container.innerHTML = "<p style='padding:20px; color:#555;'>В этом разделе нет тем.</p>";
            return;
        }

        snap.forEach(child => {
            const t = child.val();
            const tid = child.key;
            container.innerHTML += `
                <div class="thread-row" onclick="Forum.viewThread('${catId}', '${tid}')">
                    <div class="t-icon"><i class="fas fa-comments"></i></div>
                    <div class="t-info">
                        <span class="tag tag-open">${t.status}</span>
                        <span class="t-title">${t.title}</span>
                        <div class="t-meta">Автор: ${t.authorName} | ${new Date(t.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        });
    },

    async viewThread(catId, tid) {
        this.currentCat = catId;
        this.currentThread = tid;
        const root = document.getElementById('app');
        const snap = await db.ref(`threads/${catId}/${tid}`).once('value');
        const t = snap.val();

        root.innerHTML = `
            <button onclick="Forum.init()" class="btn-red" style="width:120px; margin-bottom:20px;">← Назад</button>
            <div class="thread-view">
                <div class="cat-head"><h2>${t.title}</h2></div>
                <div class="post">
                    <div class="post-side">
                        <img src="${t.authorAva}">
                        <span class="post-nick ${t.authorRole === 'owner' ? 'rainbow-text' : ''}">${t.authorName}</span>
                        <span class="post-rank">${t.authorRole}</span>
                    </div>
                    <div class="post-main">${t.content}</div>
                </div>
                <div id="replies-area"></div>
                <div class="reply-box" style="margin-top:30px;">
                    <textarea id="reply-text" placeholder="Ваш ответ..."></textarea>
                    <button class="btn-red" onclick="Forum.sendReply()">ОТПРАВИТЬ ОТВЕТ</button>
                </div>
            </div>
        `;
        this.loadReplies(tid);
    },

    async loadReplies(tid) {
        const container = document.getElementById('replies-area');
        const snap = await db.ref(`replies/${tid}`).once('value');
        if (!snap.exists()) return;
        snap.forEach(child => {
            const r = child.val();
            container.innerHTML += `
                <div class="post">
                    <div class="post-side">
                        <img src="${r.authorAva}">
                        <span class="post-nick ${r.authorRole === 'owner' ? 'rainbow-text' : ''}">${r.authorName}</span>
                        <span class="post-rank">${r.authorRole}</span>
                    </div>
                    <div class="post-main">${r.message}</div>
                </div>
            `;
        });
    },

    openThreadModal(catId) {
        this.currentCat = catId;
        UI.openModal('create-thread');
    },

    async submitThread() {
        const title = document.getElementById('th-title').value;
        const body = document.getElementById('th-body').value;
        if (!title || !body) return alert("Заполни всё!");

        const threadData = {
            title, content: body,
            authorName: App.profile.nickname,
            authorAva: App.profile.avatar,
            authorRole: App.profile.role,
            status: "Открыто",
            createdAt: Date.now()
        };

        await db.ref(`threads/${this.currentCat}`).push(threadData);
        UI.closeModals();
        this.init();
    },

    async sendReply() {
        const text = document.getElementById('reply-text').value;
        if (!text) return;

        const replyData = {
            message: text,
            authorName: App.profile.nickname,
            authorAva: App.profile.avatar,
            authorRole: App.profile.role,
            createdAt: Date.now()
        };

        await db.ref(`replies/${this.currentThread}`).push(replyData);
        this.viewThread(this.currentCat, this.currentThread);
    }
};

const Admin = {
    async createCategory() {
        const title = prompt("Название нового раздела:");
        if (title) {
            await db.ref('categories').push({ title, order: Date.now() });
            Forum.init();
        }
    },
    async manageUsers() {
        alert("Список игроков доступен в базе данных Firebase Console.");
    }
};

const Auth = {
    async sendLink() {
        const email = document.getElementById('auth-email').value;
        await auth.sendSignInLinkToEmail(email, { url: window.location.href, handleCodeInApp: true });
        localStorage.setItem('emailForSignIn', email);
        alert("Ссылка на почте!");
    },
    async completeLogin() {
        let email = localStorage.getItem('emailForSignIn') || prompt("Email:");
        await auth.signInWithEmailLink(email, window.location.href);
        localStorage.removeItem('emailForSignIn');
        window.location.replace('/');
    }
};

const UI = {
    openModal(id) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById(id).classList.remove('hidden');
    },
    closeModals() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    },
    renderNav(isAuth) {
        const nav = document.getElementById('user-nav');
        if (isAuth) {
            nav.innerHTML = `
                <div class="user-pill" onclick="UI.openModal('settings')">
                    <img src="${App.profile.avatar}" style="width:30px; height:30px; border-radius:50%; margin-right:10px;">
                    <span class="${App.profile.isRainbow ? 'rainbow-text' : ''}">${App.profile.nickname}</span>
                </div>
            `;
        } else {
            nav.innerHTML = `<button class="btn-login" onclick="UI.openModal('auth')">ВХОД</button>`;
        }
    }
};

App.init();
