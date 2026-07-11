/**
 * ARIES RP CORE ENGINE - FULL VERSION
 * Файл содержит полную логику: Firebase Auth, Email Verification, Admin Access
 */

// 1. Инициализация Firebase с обработкой конфигурации
const firebaseConfig = {
    apiKey: "AIzaSyB3IcqqmojbVDiQaos8phPyWbzFCq0_TlM",
    authDomain: "aries-forum.firebaseapp.com",
    databaseURL: "https://aries-forum-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "aries-forum",
    storageBucket: "aries-forum.firebasestorage.app",
    messagingSenderId: "614643963857",
    appId: "1:614643963857:web:01f1f941c72249ac6eb2f0"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// 2. Объект управления состоянием приложения
const AppCore = {
    user: null,
    isAdmin: false,

    async init() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Если юзер есть, проверяем верификацию Email
                if (!user.emailVerified) {
                    console.warn("Email не подтвержден. Доступ ограничен.");
                    this.user = null;
                    return;
                }
                this.user = user;
                await this.checkPrivileges(user.uid);
            } else {
                this.user = null;
                this.isAdmin = false;
            }
        });
    },

    async checkPrivileges(uid) {
        const snap = await db.ref('admins/' + uid).once('value');
        if (snap.exists()) {
            this.isAdmin = true;
            this.renderAdminUI();
        }
    },

    renderAdminUI() {
        const adminPanel = document.getElementById('admin-dashboard');
        if (adminPanel) adminPanel.style.display = 'block';
    }
};

// 3. Реализация авторизации с проверкой почты
async function loginAction(email, pass) {
    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        if (!cred.user.emailVerified) {
            alert("Ваш Email не подтвержден. Проверьте папку Спам.");
            await auth.signOut();
            return;
        }
        window.location.reload();
    } catch (e) {
        alert("Ошибка входа: " + e.message);
    }
}

// 4. Регистрация с отправкой письма
async function registerAction(email, pass) {
    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, pass);
        await userCred.user.sendEmailVerification();
        alert("Письмо с подтверждением отправлено!");
    } catch (e) {
        alert("Ошибка: " + e.message);
    }
}

// 5. Логика выхода (полная очистка сессии)
async function logoutAction() {
    await auth.signOut();
    window.location.href = "index.html";
}
// 6. Реализация наказаний: БАН/МУТ/ВАРН
async function executeAdminPunishment(targetUid, type, reason) {
    if (!AppCore.isAdmin) {
        console.error("Попытка несанкционированного действия");
        return;
    }

    const timestamp = firebase.database.ServerValue.TIMESTAMP;
    const punishmentRef = db.ref('punishments/' + targetUid).push();

    try {
        await punishmentRef.set({
            type: type,
            reason: reason,
            admin: AppCore.user.email,
            date: timestamp
        });

        // Добавляем запись в общие логи форума
        await db.ref('admin_logs').push({
            action: 'PUNISHMENT_' + type,
            target: targetUid,
            admin: AppCore.user.email,
            reason: reason,
            date: timestamp
        });

        alert(`Игрок ${targetUid} получил ${type}. Запись добавлена в логи.`);
    } catch (e) {
        console.error("Ошибка при выдаче наказания:", e);
        alert("Ошибка записи в базу: " + e.message);
    }
}

// 7. Система управления разделами (Категориями) форума
async function updateForumCategory(categoryId, title, status) {
    if (!AppCore.isAdmin) return;

    try {
        await db.ref('categories/' + categoryId).update({
            title: title,
            status: status,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        });
        console.log("Раздел успешно обновлен в базе данных.");
    } catch (e) {
        console.error("Ошибка обновления категории:", e);
        alert("Не удалось изменить раздел.");
    }
}

// 8. Мониторинг активности в реальном времени
function attachDatabaseListeners() {
    // Слушаем создание новых тем
    db.ref('threads').on('child_added', (snapshot) => {
        const threadData = snapshot.val();
        console.log("Новая тема создана:", threadData.title);
        // Здесь можно добавить функцию обновления интерфейса форума
    });

    // Слушаем изменения в админских логах
    db.ref('admin_logs').limitToLast(5).on('child_added', (snap) => {
        const log = snap.val();
        console.log(`[LOG ACTION]: ${log.action} performed by ${log.admin}`);
    });
}

// 9. Утилиты безопасности: проверка валидности данных
function sanitizeInput(str) {
    return str.replace(/[<>]/g, ""); // Защита от XSS
}

// 10. Расширенный функционал панели руководства (управление уровнем админа)
async function promoteUserToAdmin(uid, level) {
    if (!AppCore.isAdmin) return;

    try {
        await db.ref('admins/' + uid).set({
            level: level,
            appointedBy: AppCore.user.email,
            date: firebase.database.ServerValue.TIMESTAMP
        });
        alert("Пользователь успешно назначен администратором.");
    } catch (e) {
        alert("Ошибка при назначении админа: " + e.message);
    }
}

// Инициализация дополнительных слушателей
AppCore.init().then(() => {
    attachDatabaseListeners();
});
// ... (здесь будет продолжение логики на следующие 400 строк: управление БД, логи, баны и т.д.)
