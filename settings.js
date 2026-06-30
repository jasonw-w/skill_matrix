document.addEventListener('DOMContentLoaded', async () => {
    try {
        const sessionRes = await fetch('/api/session');
        if (!sessionRes.ok) {
            window.location.href = 'login.html';
            return;
        }
        
        const currentUser = await sessionRes.json();
        document.getElementById('firstName').value = currentUser.first_name || '';
        document.getElementById('lastName').value = currentUser.last_name || '';
    } catch (e) {
        window.location.href = 'login.html';
    }
});

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, password })
        });

        const data = await res.json();

        if (res.ok) {
            successMsg.style.display = 'block';
            document.getElementById('password').value = '';
        } else {
            throw new Error(data.error || 'Failed to update settings');
        }
    } catch (e) {
        errorMsg.textContent = e.message;
        errorMsg.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
});
