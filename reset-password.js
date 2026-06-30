document.addEventListener('DOMContentLoaded', () => {
    // Get email from URL params
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
        document.getElementById('email').value = emailParam;
    } else {
        window.location.href = 'forgot-password.html';
    }
});

document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
    
    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
        const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, password })
        });

        const data = await res.json();

        if (res.ok) {
            successMsg.style.display = 'block';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            throw new Error(data.error || 'Failed to update password');
        }
    } catch (e) {
        errorMsg.textContent = e.message;
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Update Password';
    }
});
