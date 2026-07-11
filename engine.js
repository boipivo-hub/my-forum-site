/**
 * ARIES RP ENGINE - CORE LOGIC PART 1
 * Handles: Firebase Auth, UI Toggle, Admin Permissions
 */

// Инициализация конфигурации Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM",
    authDomain: "aries-forum.firebaseapp.com",
    projectId: "aries-forum",
    storageBucket: "aries-forum.firebasestorage.app",
    messagingSenderId: "614643963857",
    appId: "1:614643963857:web:01f1f941c72249ac6eb2f0"
};

// Проверка наличия Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// Объекты управления состоянием
const AppState = {
    isAdmin: false,
    currentUser: null
};

// Функция переключения бокового меню
function toggleMenu() {
    const menu = document.getElementById('main-menu');
    menu.classList.toggle('active');
    console.log("Menu state changed");
}

// Проверка прав администратора при загрузке
auth.onAuthStateChanged((user) => {
    if (user) {
        AppState.currentUser = user;
        checkAdminRights(user.uid);
    } else {
        console.log("User not logged in");
    }
});

// Проверка в базе данных, является ли пользователь руководителем
function checkAdminRights(uid) {
    const adminRef = db.ref('admins/' + uid);
    adminRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            AppState.isAdmin = true;
            document.getElementById('admin-dashboard').style.display = 'block';
            document.getElementById('admin-link').style.display = 'block';
            console.log("Admin privileges granted for: " + uid);
        }
    });
}

// Функция авторизации с обработкой ошибок
async function handleLogin() {
    const email = document.getElementById('login-input').value;
    const pass = document.getElementById('pass-input').value;

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        alert("Успешная авторизация!");
        window.location.reload();
    } catch (error) {
        console.error("Auth error:", error.code);
        alert("Ошибка входа: " + error.message);
    }
}

// Функция регистрации пользователя
async function registerUser() {
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        alert("Регистрация успешна: " + userCredential.user.email);
    } catch (error) {
        alert("Ошибка регистрации: " + error.message);
    }
}

// Функция отображения формы регистрации
function showRegister() {
    const authSection = document.getElementById('auth-container');
    authSection.innerHTML = `
        <h3>Регистрация</h3>
        <input type="text" id="reg-email" placeholder="Email">
        <input type="password" id="reg-pass" placeholder="Пароль">
        <button onclick="registerUser()">Зарегистрироваться</button>
    `;
}
/**
 * ARIES RP ENGINE - ADMIN FUNCTIONS PART 2
 * Handles: Bans, Mutes, Thread Management, and Log Access
 */

// Функция для управления наказаниями
async function adminAction(actionType) {
    if (!AppState.isAdmin) {
        alert("У вас нет прав доступа к панели руководителя!");
        return;
    }

    const targetUid = prompt("Введите ID или Email пользователя:");
    if (!targetUid) return;

    try {
        const actionRef = db.ref('punishments/' + targetUid).push();
        await actionRef.set({
            type: actionType,
            admin: AppState.currentUser.email,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            reason: "Нарушение правил проекта"
        });
        
        alert(`Действие '${actionType}' успешно применено к ${targetUid}`);
        logAdminAction(actionType, targetUid);
    } catch (error) {
        console.error("Ошибка администрирования:", error);
        alert("Не удалось применить действие. Проверьте права.");
    }
}

// Запись действий администратора в логи
function logAdminAction(action, target) {
    const logRef = db.ref('adminLogs').push();
    logRef.set({
        action: action,
        target: target,
        admin: AppState.currentUser.email,
        date: new Date().toISOString()
    });
}

// Управление разделами форума (Создание и редактирование)
async function manageForumSection(sectionId, newTitle) {
    if (!AppState.isAdmin) return;

    try {
        await db.ref('categories/' + sectionId).update({
            title: newTitle,
            lastEditedBy: AppState.currentUser.email
        });
        console.log("Раздел форума обновлен.");
    } catch (error) {
        console.error("Ошибка обновления раздела:", error);
    }
}

// Система проверки прав (на случай, если пользователь попытается обойти фильтры)
function verifyGlobalAccess() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                resolve(false);
                return;
            }
            const adminCheck = await db.ref('admins/' + user.uid).once('value');
            resolve(adminCheck.exists());
        });
    });
}

// Утилита для динамической смены ника (если админ меняет свой ник)
async function updateMyNick(newName) {
    if (!AppState.currentUser) return;
    await db.ref('users/' + AppState.currentUser.uid + '/nick').set(newName);
    document.getElementById('nick-text').innerText = newName;
}

// Очистка старых сообщений (административная функция)
async function clearForumThread(threadId) {
    if (!AppState.isAdmin) return;
    await db.ref('threads/' + threadId + '/posts').remove();
    alert("Тема очищена.");
}

// Анимация интерфейса для администраторов
function triggerAdminGlow() {
    const elements = document.querySelectorAll('.admin-only');
    elements.forEach(el => {
        el.style.boxShadow = "0 0 15px #ff0000";
    });
}

// Инициализация мониторинга логов
db.ref('adminLogs').limitToLast(10).on('child_added', (snap) => {
    console.log("Новая запись в логах:", snap.val());
});
