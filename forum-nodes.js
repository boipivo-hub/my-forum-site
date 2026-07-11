const ForumNodes = {
    // Отправка поста в базу
    async createPost(title, body) {
        const user = firebase.auth().currentUser;
        if (!user) return alert("Авторизуйтесь!");
        
        await firebase.database().ref('posts').push({
            title: title,
            body: body,
            uid: user.uid,
            timestamp: Date.now()
        });
        alert("Пост создан!");
    },

    // Чтение и отображение постов
    loadPosts() {
        firebase.database().ref('posts').on('value', (snapshot) => {
            const container = document.getElementById('forum-container');
            if (!container) return;
            
            container.innerHTML = '';
            const posts = snapshot.val();
            
            for (let key in posts) {
                const p = posts[key];
                container.innerHTML += `
                    <div class="post-card">
                        <h4>${p.title}</h4>
                        <p>${p.body}</p>
                    </div>
                `;
            }
        });
    }
};
