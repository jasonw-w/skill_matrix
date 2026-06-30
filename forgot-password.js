document.getElementById('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
    
    const email = document.getElementById('email').value.trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (res.ok) {
            successMsg.style.display = 'block';
            setTimeout(() => {
                // Redirect to reset password page, passing email in query string
                window.location.href = `reset-password.html?email=${encodeURIComponent(email)}`;
            }, 1500);
        } else {
            throw new Error(data.error || 'Failed to send reset code');
        }
    } catch (e) {
        errorMsg.textContent = e.message;
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Send Reset Code';
    }
});
