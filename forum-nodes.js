const ForumNodes = {
    async createPost(title, body) {
        const user = firebase.auth().currentUser;
        if (!user) return;
        await firebase.database().ref('posts').push({
            title: title, body: body, uid: user.uid, timestamp: Date.now()
        });
    }
};
