// ARIES ROLE PLAY - SECURE ENGINE v10.0
const firebaseConfig = { databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const App = {
    user: null,
    uid: null,
    
    // Инициализация безопасности
    init() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.user = user.displayName;
                this.uid = user.uid;
            }
            this.syncUI();
        });
    },

    // Метод для безопасной записи (сервер проверит правила)
    secureWrite(refPath, data) {
        if (this.uid === '5694374929') {
            firebase.database().ref(refPath).set(data);
        } else {
            console.error("Попытка взлома заблокирована.");
        }
    },

    syncUI() {
        // Логика отрисовки кнопок
        const isOwner = (this.uid === '5694374929');
        const admBtns = document.getElementById('adm-controls');
        if (admBtns) admBtns.style.display = isOwner ? 'block' : 'none';
    }
};

App.init();
