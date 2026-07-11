const db = firebase.database();

const Engine = {
    user: null,

    init: function() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user && user.emailVerified) {
                this.user = user;
                this.checkAdminStatus(user.uid);
            }
        });
    },

    checkAdminStatus: async function(uid) {
        const snap = await db.ref('admins/' + uid).once('value');
        if (snap.exists()) {
            const adminPanel = document.getElementById('admin-dashboard');
            if (adminPanel) adminPanel.classList.remove('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Engine.init());
