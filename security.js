const Security = {
    async hash(text) {
        const msg = new TextEncoder().encode(text + "ARIES_PRIVATE_KEY_2026");
        const buf = await crypto.subtle.digest('SHA-256', msg);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
};
