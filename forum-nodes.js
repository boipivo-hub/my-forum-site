const ForumNodes = {
    async createPost(title, body) {
        const user = firebase.auth().currentUser;
        if (!user) return;
        await firebase.database().ref('posts').push({
            title: title, body: body, uid: user.uid, time: Date.now()
        });
    },
    loadPosts() {
        firebase.database().ref('posts').on('value', (snap) => {
            const container = document.getElementById('forum-container');
            container.innerHTML = '';
            const posts = snap.val();
            for (let k in posts) {
                container.innerHTML += `<div class="post-card"><h4>${posts[k].title}</h4><p>${posts[k].body}</p></div>`;
            }
        });
    }
};
