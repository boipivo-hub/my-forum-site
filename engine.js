/** 
 * Aries RP Forum Engine - Core Logic
 * Version: 1.0.0
 * Description: Handles Auth, Roles, and Admin Privileges
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

const ForumEngine = {
    currentUser: null,
    isAdmin: false,
    isDeveloper: false,

    init() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.checkUserPrivileges(user);
                this.loadUserData(user.uid);
            } else {
                this.redirectToLogin();
            }
        });
    },

    checkUserPrivileges(user) {
        // Установка Qumestlies_Shawty как главного разработчика
        const devEmail = "qumestlies_shawty@example.com"; // Замени на свой реальный email
        if (user.email === devEmail) {
            this.isDeveloper = true;
            this.isAdmin = true;
            this.renderAdminPanel();
        }
    },

    loadUserData(uid) {
        firebase.database().ref('users/' + uid).once('value').then(snapshot => {
            const data = snapshot.val();
            if (data) {
                this.renderProfileUI(data);
            } else {
                this.createInitialUserRecord(uid);
            }
        });
    },

    createInitialUserRecord(uid) {
        firebase.database().ref('users/' + uid).set({
            nick: "NewPlayer",
            role: "user",
            avatar: "default.png",
            createdAt: Date.now()
        });
    },

    renderAdminPanel() {
        console.log("Admin Panel Loaded: Active Privileges Enabled");
        // Здесь будет логика отображения админских кнопок
    },

    handleBan(targetUid) {
        if (!this.isAdmin) return alert("Нет прав!");
        firebase.database().ref('users/' + targetUid + '/banned').set(true);
    },

    updateNickColor(uid, colorCode) {
        if (!this.isAdmin) return;
        firebase.database().ref('users/' + uid + '/color').set(colorCode);
    },

    // Метод для создания разделов форума (только для админов)
    createForumSection(title, permissions) {
        if (!this.isAdmin) return;
        const sectionRef = firebase.database().ref('sections').push();
        sectionRef.set({ title, permissions, createdAt: Date.now() });
    }
};

// Инициализация движка
ForumEngine.init();

// ... (далее код будет расширяться функциями для работы с темами, аватарами и т.д.)
