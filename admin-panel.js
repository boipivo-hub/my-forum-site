// Модуль распределения прав доступа, стилей никнеймов и модерации
const AdminPanel = {
    open() {
        const user = AuthModule.getRegistry()[App.user];
        if(!user || (user.glow !== 'glow-founder' && user.glow !== 'glow-spec' && user.glow !== 'glow-admin')) {
            return alert('Доступ заблокирован: вы не являетесь Администратором.');
        }
        
        document.getElementById('m-admin').style.display = 'flex';
        const sel = document.getElementById('adm-target-user');
        sel.innerHTML = '';
        
        const db = AuthModule.getRegistry();
        for(let name in db) {
            sel.innerHTML += <option value="${name}">${name}</option>;
        }
    },
    close() { document.getElementById('m-admin').style.display = 'none'; },
    
    save() {
        const target = document.getElementById('adm-target-user').value;
        let db = AuthModule.getRegistry();
        
        db[target].glow = document.getElementById('adm-set-glow').value;
        db[target].badge = document.getElementById('adm-set-badge').value;
        
        const isBan = document.getElementById('adm-set-ban').value === 'yes';
        db[target].banned = isBan;
        if(isBan && target === App.user) {
            alert('Нельзя заблокировать самого себя!');
            return;
        }
        
        // Если пользователя забанили, сбрасываем его оформление на бан-стиль
        if(isBan) {
            db[target].glow = 'glow-banned';
            db[target].badge = 'badge-banned';
        }
        
        AuthModule.saveRegistry(db);
        this.close();
        window.location.reload();
    }
};
