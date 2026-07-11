firebase.auth().onAuthStateChanged(user => {
    if (user) {
        document.getElementById('auth-box').classList.add('hidden');
        document.getElementById('forum-ui').classList.remove('hidden');
        ForumNodes.loadPosts();
    }
});
