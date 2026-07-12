// Модуль структуры разделов и тем (Глубокая многоуровневая вложенность фракций и жалоб)
const ForumNodes = {
    tree: {
        'complaints_adm': { title: 'Жалобы на Администрацию', path: 'Жалобы / Администрация', threads: [] },
        'complaints_gos': { title: 'Жалобы на сотрудников гос. структур', path: 'Жалобы / Гос', threads: [] },
        'complaints_ghetto': { title: 'Жалобы на членов уличных группировок', path: 'Жалобы / Гетто', threads: [] },
        'unban_appeal': { title: 'Заявления на амнистию и восстановление аккаунтов', path: 'Амнистия', threads: [] },
        
        // Разделы государственных структур
        'org_lspd': { title: '🌐 [Гос] Сhannel LSPD (Полиция Лос-Сантос)', path: 'Организации / Государственные / LSPD', threads: [] },
        'org_fbi': { title: '🕵️‍♂️ [Гос] Federal Bureau of Investigation (ФБР)', path: 'Организации / Государственные / FBI', threads: [] },
        'org_army': { title: '🪖 [Гос] Army Area 51 (Армия Национальной Гвардии)', path: 'Организации / Государственные / Army', threads: [] },
        
        // Разделы криминальных структур
        'org_grove': { title: '🟢 [Банды] Grove Street Gang', path: 'Организации / Нелегальные / Гетто / Grove', threads: [] },
        'org_ballas': { title: '🟣 [Банды] East Side Ballas Gang', path: 'Организации / Нелегальные / Гетто / Ballas', threads: [] },
        'org_lcn': { title: '💼 [Мафии] La Cosa Nostra', path: 'Организации / Нелегальные / Мафии / LCN', threads: [] },
        'org_yakuza': { title: '⚔️ [Мафии] Yakuza Syndicate', path: 'Организации / Нелегальные / Мафии / Yakuza', threads: [] },
        
        // Кастомные авторские разделы (От разработчика)
        'dev_news': { title: '📢 Технические обновления и патчноуты разработчиков', path: 'Официально / Разработка', threads: [
            { id: 't-dev-1', title: 'Глобальное обновление форумного ядра до версии SPA Core 6.0', creator: 'Qumestlies_Shawty', posts: [{ author: 'Qumestlies_Shawty', text: 'Уважаемые игроки, мы развернули модульную структуру как на топовых проектах.' }] }
        ]},
        'market_place': { title: '💰 Торговая площадка (Покупка/Продажа имущества)', path: 'Игровой процесс / Торговля', threads: [] }
    },

    init() {
        if(!localStorage.getItem('forum_nodes_data')) {
            localStorage.setItem('forum_nodes_data', JSON.stringify(this.tree));
        }
        this.tree = JSON.parse(localStorage.getItem('forum_nodes_data'));
    },
    save() { localStorage.setItem('forum_nodes_data', JSON.stringify(this.tree)); },

    renderMenu() {
        const nav = document.getElementById('nodes-navigation-list');
        nav.innerHTML = <div class="sidebar-title">Навигация проекта</div>;
        for(let key in this.tree) {
            nav.innerHTML += <a href="#" class="nav-link" id="node-${key}" onclick="App.route('${key}')">${this.tree[key].title}</a>;
        }
    }
};
ForumNodes.init();
