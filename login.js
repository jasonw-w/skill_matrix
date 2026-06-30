document.addEventListener('DOMContentLoaded', () => {
    // Mode state
    let isRegisterMode = false;
    let currentEmail = '';
    let currentCode = '';

    // Step Elements
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    
    // UI Elements
    const s1Title = document.getElementById('s1Title');
    const s1Desc = document.getElementById('s1Desc');
    const switchText = document.getElementById('switchText');
    const switchLink = document.getElementById('switchLink');
    const loginPasswordGroup = document.getElementById('loginPasswordGroup');
    const loginPassword = document.getElementById('loginPassword');
    
    // Forms
    const formStep1 = document.getElementById('formStep1');
    const formStep3 = document.getElementById('formStep3');

    // OTP Logic
    const otpInputs = document.querySelectorAll('.otp-input');
    
    // Switch between Login and Register modes
    switchLink.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        document.getElementById('s1Msg').textContent = '';
        if (isRegisterMode) {
            s1Title.textContent = 'Create an Account';
            s1Desc.textContent = 'Enter your organization email to get started.';
            loginPasswordGroup.style.display = 'none';
            loginPassword.required = false;
            switchText.textContent = 'Already have an account? ';
            switchLink.textContent = 'Sign In';
        } else {
            s1Title.textContent = 'Sign In';
            s1Desc.textContent = 'Welcome back to the Team Skill Matrix.';
            loginPasswordGroup.style.display = 'flex';
            loginPassword.required = true;
            switchText.textContent = "Don't have an account? ";
            switchLink.textContent = 'Register here';
        }
    });

    function transitionTo(hideElem, showElem) {
        hideElem.style.opacity = '0';
        setTimeout(() => {
            hideElem.classList.add('step-hidden');
            showElem.classList.remove('step-hidden');
            showElem.style.opacity = '0';
            setTimeout(() => {
                showElem.style.opacity = '1';
                showElem.style.transform = 'translateX(0)';
            }, 50);
        }, 300);
    }

    // Step 1 Submission (Login OR Send Email)
    formStep1.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = loginPassword.value;
        const btn = document.getElementById('btnStep1');
        const msg = document.getElementById('s1Msg');
        
        msg.textContent = '';
        btn.innerHTML = '<span class="spinner"></span>';
        btn.disabled = true;

        try {
            if (!isRegisterMode) {
                // Login Flow
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                // Success: Redirect
                window.location.href = 'index.html';
            } else {
                // Register Flow: Send Code
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                // Transition to Step 2
                currentEmail = email;
                document.getElementById('verifyEmailDisplay').textContent = email;
                transitionTo(step1, step2);
                setTimeout(() => otpInputs[0].focus(), 350);
            }
        } catch (err) {
            msg.textContent = err.message || 'An error occurred';
            btn.innerHTML = 'Continue';
            btn.disabled = false;
        }
    });

    // OTP Input Logic (Auto-Advance)
    otpInputs.forEach((input, index) => {
        input.addEventListener('keyup', async (e) => {
            const val = e.target.value;
            if (val.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            } else if (e.key === 'Backspace' && index > 0 && val.length === 0) {
                otpInputs[index - 1].focus();
            }

            // Check if fully entered
            const code = Array.from(otpInputs).map(i => i.value).join('');
            if (code.length === 6) {
                await verifyCodeSilently(code);
            }
        });
        // Handle Paste
        input.addEventListener('paste', async (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text').slice(0, 6).replace(/[^0-9]/g, '');
            text.split('').forEach((char, i) => { if (otpInputs[i]) otpInputs[i].value = char; });
            if (text.length === 6) await verifyCodeSilently(text);
            else if (text.length > 0) otpInputs[text.length - 1].focus();
        });
    });

    async function verifyCodeSilently(code) {
        const msg = document.getElementById('s2Msg');
        msg.textContent = 'Verifying...';
        msg.className = 'msg success-msg';
        
        try {
            const res = await fetch('/api/check-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, code })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Valid code!
            currentCode = code;
            msg.textContent = '';
            transitionTo(step2, step3);
            setTimeout(() => document.getElementById('firstName').focus(), 350);

        } catch(err) {
            msg.textContent = err.message || 'Invalid code';
            msg.className = 'msg error-msg';
            // Clear inputs
            otpInputs.forEach(i => i.value = '');
            otpInputs[0].focus();
        }
    }

    // Step 3 Submission (Complete Profile & Auto-Login)
    formStep3.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const password = document.getElementById('regPassword').value;
        const btn = document.getElementById('btnStep3');
        const msg = document.getElementById('s3Msg');

        btn.innerHTML = '<span class="spinner"></span>';
        btn.disabled = true;
        msg.textContent = '';

        try {
            // Complete Account
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, code: currentCode, password, firstName, lastName })
            });
            if (!res.ok) throw new Error((await res.json()).error);

            // Auto-login!
            const loginRes = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, password })
            });
            if (!loginRes.ok) throw new Error('Account created, but auto-login failed.');

            window.location.href = 'index.html';
        } catch(err) {
            msg.textContent = err.message;
            btn.innerHTML = 'Complete Account';
            btn.disabled = false;
        }
    });
});
