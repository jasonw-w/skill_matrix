document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const submitBtn = document.getElementById('submitBtn');
    const switchLink = document.getElementById('switchLink');
    const switchText = document.getElementById('switchText');
    const statusMsg = document.getElementById('statusMsg');
    
    const emailInput = document.getElementById('email');
    const codeInput = document.getElementById('code');
    const passwordInput = document.getElementById('password');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    
    const emailGroup = document.getElementById('emailGroup');
    const codeGroup = document.getElementById('codeGroup');
    const passwordGroup = document.getElementById('passwordGroup');
    const nameGroup = document.getElementById('nameGroup');

    let mode = 'login'; // 'login', 'register_step1' (email), 'register_step2' (code + pass)

    function resetForm() {
        statusMsg.textContent = '';
        statusMsg.className = 'error-msg';
        emailInput.value = '';
        codeInput.value = '';
        passwordInput.value = '';
        if(firstNameInput) firstNameInput.value = '';
        if(lastNameInput) lastNameInput.value = '';
        submitBtn.disabled = false;
        
        if (mode === 'login') {
            authTitle.textContent = 'Sign In';
            submitBtn.textContent = 'Sign In';
            switchText.textContent = "Don't have an account? ";
            switchLink.textContent = "Register here";
            
            emailGroup.classList.remove('hidden');
            passwordGroup.classList.remove('hidden');
            codeGroup.classList.add('hidden');
            if(nameGroup) nameGroup.classList.add('hidden');
            
            emailInput.required = true;
            passwordInput.required = true;
            codeInput.required = false;
            if(firstNameInput) firstNameInput.required = false;
            if(lastNameInput) lastNameInput.required = false;
        } else {
            authTitle.textContent = 'Register (Step 1)';
            submitBtn.textContent = 'Send Verification Code';
            switchText.textContent = "Already have an account? ";
            switchLink.textContent = "Sign In here";
            
            emailGroup.classList.remove('hidden');
            passwordGroup.classList.add('hidden');
            codeGroup.classList.add('hidden');
            if(nameGroup) nameGroup.classList.add('hidden');
            
            emailInput.required = true;
            passwordInput.required = false;
            codeInput.required = false;
            if(firstNameInput) firstNameInput.required = false;
            if(lastNameInput) lastNameInput.required = false;
        }
    }

    switchLink.addEventListener('click', () => {
        mode = mode === 'login' ? 'register_step1' : 'login';
        resetForm();
    });

    resetForm();

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusMsg.textContent = '';
        statusMsg.className = 'error-msg';
        submitBtn.disabled = true;
        
        const email = emailInput.value;
        const password = passwordInput.value;
        const code = codeInput.value;
        const firstName = firstNameInput ? firstNameInput.value : '';
        const lastName = lastNameInput ? lastNameInput.value : '';
        
        try {
            if (mode === 'login') {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                
                if (!response.ok) throw new Error(data.error || 'Login failed');
                
                // Success: Cloudflare worker set the HttpOnly cookie. Redirect.
                window.location.href = 'index.html';
                
            } else if (mode === 'register_step1') {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();
                
                if (!response.ok) throw new Error(data.error || 'Failed to send code');
                
                // Transition to Step 2
                mode = 'register_step2';
                authTitle.textContent = 'Register (Step 2)';
                submitBtn.textContent = 'Verify & Create Account';
                
                emailGroup.classList.add('hidden'); // hide email
                codeGroup.classList.remove('hidden'); // show code
                passwordGroup.classList.remove('hidden'); // show password
                if(nameGroup) nameGroup.classList.remove('hidden'); // show names
                
                codeInput.required = true;
                passwordInput.required = true;
                if(firstNameInput) firstNameInput.required = true;
                if(lastNameInput) lastNameInput.required = true;
                
                statusMsg.className = 'success-msg';
                statusMsg.textContent = 'Verification code sent to your email!';
                submitBtn.disabled = false;
                
            } else if (mode === 'register_step2') {
                const response = await fetch('/api/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code, password, firstName, lastName })
                });
                const data = await response.json();
                
                if (!response.ok) throw new Error(data.error || 'Verification failed');
                
                // Success
                statusMsg.className = 'success-msg';
                statusMsg.textContent = 'Account created successfully! Please sign in.';
                mode = 'login';
                setTimeout(resetForm, 2000); // Reset to login after 2 seconds
            }
        } catch (error) {
            console.error('Auth error:', error);
            statusMsg.textContent = error.message || 'Network error. Please try again.';
            submitBtn.disabled = false;
        }
    });
});
