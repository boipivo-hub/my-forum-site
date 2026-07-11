/**
 * ARIES RP - APP LOGIC (FORUM ENGINE)
 */

const ForumEngine = {
    currentCat: null,

    async loadHome() {
        const root = document.getElementById('forum-root');
        root.innerHTML = "Загрузка разделов...";

        const snap = await db.ref('categories').once('value');
        root.innerHTML = "";

        if (!snap.exists()) {
            root.innerHTML = "<p>Форум пуст. Создайте первый раздел.</p>";
            return;
        }

        snap.forEach(child => {
            const cat = child.val();
            const id = child.key;
            root.innerHTML += `
                <div class="category-card">
                    <div class="cat-header" onclick="ForumEngine.viewCategory('${id}')">
                        <h3>${cat.title}</h3>
                    </div>
                    <div id="threads-preview-${id}"></div>
                </div>
            `;
            this.loadThreads(id);
        });
    },

    async loadThreads(id) {
        const container = document.getElementById(`threads-preview-${id}`);
        const snap = await db.ref(`threads/${id}`).limitToLast(5).once('value');
        
        container.innerHTML = "";
        snap.forEach(child => {
            const t = child.val();
            container.innerHTML += `
                <div class="thread-row">
                    <i class="fas fa-comment tr-icon"></i>
                    <div class="tr-info">
                        <span class="tr-title">
                            <span class="tag tag-${t.status === 'Открыто' ? 'open' : 'closed'}">${t.status}</span>
                            ${t.title}
                        </span>
                        <span class="tr-meta">Автор: ${t.author} • ${new Date(t.date).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        });
    },

    viewCategory(id) {
        this.currentCat = id;
        UI.modal('create-thread');
    },

    async submitThread() {
        if (!Engine.profile) return alert("Войдите на форум!");
        const title = document.getElementById('th-title').value;
        const text = document.getElementById('th-content').value;

        if (!title || !text) return alert("Заполните все поля!");

        await db.ref(`threads/${this.currentCat}`).push({
            title: title,
            content: text,
            author: Engine.profile.nickname,
            authorUid: Engine.user.uid,
            status: "Открыто",
            date: firebase.database.ServerValue.TIMESTAMP
        });

        UI.closeModals();
        this.loadHome();
    }
};

const AdminPanel = {
    async open() {
        UI.modal('admin');
        const list = document.getElementById('admin-user-list');
        list.innerHTML = "Загрузка игроков...";

        const snap = await db.ref('users').once('value');
        list.innerHTML = "";
        snap.forEach(child => {
            const u = child.val();
            const uid = child.key;
            list.innerHTML += `
                <div class="user-row" style="padding:10px; border-bottom:1px solid #222; display:flex; justify-content:space-between;">
                    <span>${u.nickname} (${u.role})</span>
                    <div class="btns">
                        <button onclick="AdminPanel.setRole('${uid}', 'admin')">Админ</button>
                        <button onclick="AdminPanel.setRole('${uid}', 'user')">Игрок</button>
                        <button onclick="AdminPanel.ban('${uid}')" style="color:red;">БАН</button>
                    </div>
                </div>
            `;
        });
    },

    async setRole(uid, role) {
        await db.ref(`users/${uid}`).update({ role: role, isRainbow: (role === 'admin' || role === 'owner') });
        alert("Роль обновлена!");
        this.open();
    },

    async ban(uid) {
        await db.ref(`users/${uid}`).update({ isBanned: true });
        alert("Забанен!");
        this.open();
    },

    async createCategory() {
        const title = prompt("Название нового раздела:");
        if (title) {
            await db.ref('categories').push({ title: title });
            ForumEngine.loadHome();
        }
    }
};

const UI = {
    renderHeader(isAuth, data) {
        const nav = document.getElementById('user-navigation');
        if (isAuth) {
            nav.innerHTML = `
                <div class="notif-bell"><i class="fas fa-bell"></i><span class="bell-count">0</span></div>
                <div class="user-pill" onclick="UI.modal('profile')">
                    <img src="${data.avatar}" class="nav-ava" style="width:35px; height:35px; border-radius:50%; margin-right:10px;">
                    <span class="${data.isRainbow ? 'rainbow-text' : ''}">${data.nickname}</span>
                </div>
            `;
        }
    },

    modal(id) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById('modal-' + id).classList.remove('hidden');
    },

    closeModals() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }
};
