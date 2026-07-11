const App = {
    init() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log("Авторизован: " + user.uid);
            } else {
                console.log("Нужна авторизация");
            }
        });
    }
};
App.init();
