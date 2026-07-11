const AuthModule = {
    async sendSMS() {
        const phone = document.getElementById('phone').value;
        if(!phone) return alert("Введите номер!");
        
        // Удаляем старую капчу, чтобы не было конфликтов
        document.getElementById('recaptcha-container').innerHTML = '<div id="recaptcha-verifier"></div>';
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-verifier', { 'size': 'invisible' });
        
        try {
            window.confirmationResult = await firebase.auth().signInWithPhoneNumber(phone, window.recaptchaVerifier);
            document.getElementById('step1').classList.add('hidden');
            document.getElementById('step2').classList.remove('hidden');
            alert("Код отправлен! Проверь телефон.");
        } catch(e) { 
            console.error(e); // Посмотри сюда в консоли F12!
            alert("Ошибка отправки: " + e.message); 
        }
    },
    
    async verify() {
        const code = document.getElementById('code').value;
        try {
            await window.confirmationResult.confirm(code);
            alert("Успешно!");
            location.reload();
        } catch(e) { 
            console.error(e);
            alert("Неверный код или истек срок действия!"); 
        }
    }
};
