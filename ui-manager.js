/**
 * ARIES RP - UI MANAGER
 */
const UIManager = {
    currentCat: null,

    async loadHome() {
        const root = document.getElementById('dynamic-content');
        root.innerHTML = "<div class='loader-mini'>Загрузка разделов...</div>";

        try {
            const snap = await db.ref('categories').once('value');
            root.innerHTML = "";
            
            if (!snap.exists()) {
                root.innerHTML = "<p>Разделов нет. Создайте первый через панель управления.</p>";
                return;
            }

            snap.forEach(child => {
                const cat = child.val();
                const id = child.key;
                root.innerHTML += `
                    <div class="cat-card" onclick="UIManager.viewCategory('${id}')">
                        <div class="cat-icon"><i class="fas fa-folder"></i></div>
                        <div class="cat-info">
                            <h3>${cat.title}</h3>
                            <p>Официальный раздел Aries RP</p>
                        </div>
                    </div>
                `;
            });
        } catch (e) {
            console.error("LoadHome Error:", e);
        }
    },

    async viewCategory(id) {
        this.currentCat = id;
        const root = document.getElementById('dynamic-content');
        root.innerHTML = `
            <div class="section-nav">
                <button onclick="UIManager.loadHome()">← Назад</button>
                <button class="btn-red" onclick="UIManager.openModal('create-thread')">НОВАЯ ТЕМА</button>
            </div>
            <div id="threads-container"></div>
        `;
        this.loadThreads(id);
    },

    async loadThreads(id) {
        const container = document.getElementById('threads-container');
        const snap = await db.ref(`threads/${id}`).once('value');
        if (!snap.exists()) {
            container.innerHTML = "<p class='empty'>В этом разделе еще нет тем.</p>";
            return;
        }
        snap.forEach(child => {
            const t = child.val();
            container.innerHTML += `
                <div class="thread-row">
                    <span class="tag tag-open">${t.status}</span>
                    <div class="t-main">
                        <div class="t-title">${t.title}</div>
                        <div class="t-meta">Автор: ${t.authorName}</div>
                    </div>
                </div>
            `;
        });
    },

    async createCategory() {
        const title = prompt("Название раздела:");
        if (title) {
            await db.ref('categories').push({ title: title, order: Date.now() });
            this.loadHome();
        }
    },

    async submitThread() {
        const title = document.getElementById('th-title').value;
        const text = document.getElementById('th-text').value;
        if (!title || !text) return;

        await db.ref(`threads/${this.currentCat}`).push({
            title, text,
            authorName: Engine.profile.nickname,
            status: "Открыто",
            createdAt: Date.now()
        });
        this.closeModals();
        this.viewCategory(this.currentCat);
    },

    renderAuthNode(isAuth, data) {
        const node = document.getElementById('auth-node');
        if (isAuth) {
            node.innerHTML = `
                <div class="user-pill">
                    <img src="${data.avatar}" class="nav-ava">
                    <span class="${data.isRainbow ? 'rainbow-text' : ''}">${data.nickname}</span>
                </div>
            `;
        }
    },

    openModal(id) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById(`modal-${id}`).classList.remove('hidden');
    },

    closeModals() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal-box').forEach(m => m.classList.add('hidden'));
    }
};
