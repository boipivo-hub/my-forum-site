/** 
 * ARIES RP CORE ENGINE - FINAL VERSION
 * Handles: Auth State, Role Management, Admin Permissions
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

const AppEngine = {
    // Управление пользователем
    currentUser: null,
    
    init() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.checkAdminStatus(user.uid);
                this.loadUserData(user.uid);
            }
        });
    },

    async checkAdminStatus(uid) {
        const adminRef = firebase.database().ref('admins/' + uid);
        adminRef.on('value', (snap) => {
            if (snap.exists()) {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
                this.applyAdminEffects();
            }
        });
    },

    applyAdminEffects() {
        // Добавление анимации переливающегося ника для админа
        const nick = document.getElementById('nick-text');
        if(nick) nick.classList.add('nick-admin');
    },

    loadUserData(uid) {
        firebase.database().ref('users/' + uid).on('value', (snap) => {
            const data = snap.val();
            if(data) {
                document.getElementById('nick-text').innerText = data.nick || "Player";
                if(data.avatar) document.getElementById('avatar-img').src = data.avatar;
            }
        });
    },

    logout() {
        firebase.auth().signOut().then(() => window.location.reload());
    }
};

AppEngine.init();
// ... (Здесь планируется добавить функции для смены почты, пароля, мута и банов с валидацией через Database Rules)
