/**
 * UI MANAGER - ADVANCED RENDERER
 * Отвечает за динамическую отрисовку всего интерфейса
 */

const UIManager = {
    
    toast(text, type = 'info') {
        const container = document.getElementById('toast-manager');
        const toast = document.createElement('div');
        toast.className = `toast-item ${type}`;
        toast.innerHTML = `<i class="fas fa-info-circle"></i> <span>${text}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = "translateX(120%)";
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    },

    renderHeaderAuth(isAuth, data = null) {
        const node = document.getElementById('header-auth-node');
        if (isAuth) {
            node.innerHTML = `
                <div class="user-pill" onclick="UIManager.openModal('settings')">
                    <div class="pill-info">
                        <span class="pill-nick ${data.isRainbow ? 'rainbow-text' : ''}">${data.nickname}</span>
                        <span class="pill-role">${data.role.toUpperCase()}</span>
                    </div>
                    <img src="${data.avatar}" class="pill-ava">
                </div>
            `;
        } else {
            node.innerHTML = `<button class="btn-auth-glow" onclick="UIManager.openAuth()">ВХОД / РЕГИСТРАЦИЯ</button>`;
        }
    },

    async renderForumHome() {
        const root = document.getElementById('dynamic-root');
        root.innerHTML = `<div class="skeleton-list"></div>`;
        
        const snap = await Engine.db.ref('categories').orderByChild('order').once('value');
        root.innerHTML = "";

        if (!snap.exists()) {
            root.innerHTML = `<div class="info-empty">Разделы форума появятся скоро.</div>`;
            return;
        }

        snap.forEach(catSnap => {
            const cat = catSnap.val();
            const id = catSnap.key;
            
            const catEl = document.createElement('div');
            catEl.className = "forum-card";
            catEl.innerHTML = `
                <div class="card-head"><h2>${cat.title}</h2></div>
                <div class="threads-list" id="cat-list-${id}">
                    <div class="loader-inner">Загрузка тем...</div>
                </div>
            `;
            root.appendChild(catEl);
            this.renderThreads(id);
        });
    },

    async renderThreads(catId) {
        const list = document.getElementById(`cat-list-${catId}`);
        const snap = await Engine.db.ref(`threads/${catId}`).limitToLast(10).once('value');
        
        list.innerHTML = "";
        if (!snap.exists()) {
            list.innerHTML = `<div class="empty-threads">Тем в этом разделе еще нет.</div>`;
            return;
        }

        snap.forEach(tSnap => {
            const t = tSnap.val();
            const tid = tSnap.key;
            const row = document.createElement('div');
            row.className = "thread-row";
            row.onclick = () => Router.page('thread', {catId, tid});
            row.innerHTML = `
                <div class="tr-icon"><i class="fas fa-comments"></i></div>
                <div class="tr-info">
                    <h4><span class="tag ${this.tagClass(t.status)}">${t.status}</span> ${t.title}</h4>
                    <span class="tr-meta">Автор: ${t.authorName} • ${new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="tr-last">
                    <span class="last-nick">${t.lastReplyBy || 'Нет ответов'}</span>
                </div>
            `;
            list.appendChild(row);
        });
    },

    tagClass(s) {
        if (s === 'Открыто') return 'tag-open';
        if (s === 'Закрыто') return 'tag-closed';
        return 'tag-review';
    },

    openAuth() {
        this.openModal('auth');
        AuthSystem.generateCaptcha();
    },

    openModal(id) {
        document.getElementById('modal-system-bg').classList.remove('hidden');
        document.getElementById(`modal-${id}`).classList.remove('hidden');
    },

    closeModals() {
        document.getElementById('modal-system-bg').classList.add('hidden');
        document.querySelectorAll('.modal-box').forEach(m => m.classList.add('hidden'));
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
    }
};

// Простой роутер для переключения страниц
const Router = {
    page(name, params = {}) {
        if (name === 'home') UIManager.renderForumHome();
        // Можно расширить для открытия конкретных тем
    }
};
