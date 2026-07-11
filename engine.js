/**
 * ARIES ROLEPLAY - CORE ENGINE V3.0
 */
const Engine = {
    user: null,
    profile: null,
    OWNER_EMAIL: "ponkc29@gamil.com",
    OWNER_NICK: "Qumestlies_Shawty",

    async init() {
        console.log("Engine: Booting...");

        // ПРЕДОХРАНИТЕЛЬ (Failsafe)
        setTimeout(() => {
            const loader = document.getElementById('app-preloader');
            if (loader && loader.style.display !== 'none') {
                console.warn("Failsafe: Forced loader hide!");
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        }, 4000);

        auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                this.user = firebaseUser;
                await this.syncProfile();
            } else {
                this.user = null;
                this.profile = null;
                UIManager.renderAuthNode(false);
            }
            UIManager.loadHome();
        });

        if (auth.isSignInWithEmailLink(window.location.href)) {
            AuthSystem.completeSignIn();
        }
    },

    async syncProfile() {
        try {
            const uid = this.user.uid;
            const snap = await db.ref(`users/${uid}`).once('value');
            let data = snap.val();

            if (!data) {
                data = {
                    nickname: this.user.email.split('@')[0],
                    role: "user",
                    avatar: "https://i.imgur.com/6EOnf8A.png",
                    isRainbow: false
                };
                if (this.user.email === this.OWNER_EMAIL) {
                    data.role = "owner";
                    data.nickname = this.OWNER_NICK;
                    data.isRainbow = true;
                }
                await db.ref(`users/${uid}`).set(data);
            }
            this.profile = data;
            UIManager.renderAuthNode(true, data);

            if (data.role === 'owner') {
                document.getElementById('owner-strip').classList.remove('hidden');
            }
        } catch (e) {
            console.error("Sync Error:", e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Engine.init());
