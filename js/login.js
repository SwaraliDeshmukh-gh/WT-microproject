document.addEventListener('DOMContentLoaded', () => {
    localStorage.removeItem('token');
localStorage.removeItem('collegeEventUser');
localStorage.removeItem('collegeEventAdmin');
localStorage.removeItem('user');
    const roleTabs = document.querySelectorAll('.role-tab');
    const studentLoginForm = document.getElementById('student-login-form');
    const adminLoginForm = document.getElementById('admin-login-form');
    const studentSignupForm = document.getElementById('student-signup-form');
    
    const toSignupBtn = document.getElementById('to-signup-btn');
    const toLoginBtn = document.getElementById('to-login-btn');
    
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const roleTabsContainer = document.querySelector('.role-tabs-container');
    
    const authFeedback = document.getElementById('auth-feedback');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackMessage = document.getElementById('feedback-message');

    let currentRole = 'student';
    let currentMode = 'login';

    roleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const role = tab.getAttribute('data-role');
            if (role === currentRole && currentMode === 'login') return;
            
            currentRole = role;
            currentMode = 'login';
            
            roleTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            updateView();
            clearAllErrors();
            hideFeedback();
        });
    });

    if (toSignupBtn) {
        toSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentMode = 'signup';
            updateView();
            clearAllErrors();
            hideFeedback();
        });
    }

    if (toLoginBtn) {
        toLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentMode = 'login';
            updateView();
            clearAllErrors();
            hideFeedback();
        });
    }

    function updateView() {
        studentLoginForm.classList.remove('active-form');
        adminLoginForm.classList.remove('active-form');
        studentSignupForm.classList.remove('active-form');

        if (currentRole === 'admin') {
            roleTabsContainer.style.display = 'grid';
            authTitle.textContent = 'Admin Login';
            authSubtitle.textContent = 'Enter administrative credentials to access dashboard controls.';
            adminLoginForm.classList.add('active-form');
        } else {
            roleTabsContainer.style.display = 'grid';
            if (currentMode === 'login') {
                authTitle.textContent = 'Student Login';
                authSubtitle.textContent = 'Enter your credentials to access your event registrations.';
                studentLoginForm.classList.add('active-form');
            } else {
                authTitle.textContent = 'Create Student Account';
                authSubtitle.textContent = 'Fill in your details to register for campus events easily.';
                studentSignupForm.classList.add('active-form');
            }
        }
    }

    // Password Visibility Toggle
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const wrapper = btn.closest('.input-icon-wrapper');
            const input = wrapper.querySelector('input');
            const icon = btn.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Form Submissions
    if (studentLoginForm) {
        studentLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (validateStudentLogin()) {
                const identifier = document.getElementById('student-login-id').value.trim();
                const password = document.getElementById('student-login-pass').value;

                try {
                    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ identifier, password })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        showFeedback('error', data.error || data.message || 'Login failed. Please check your credentials.');
                        return;
                    }

                    // Student login must only allow student accounts
if (data.user.role === 'admin') {
    showFeedback('error', 'Please use the Admin Login tab to access the administrator dashboard.');
    return;
}

// Save student session
localStorage.removeItem('collegeEventAdmin');
localStorage.removeItem('token');
localStorage.setItem('token', data.token);
localStorage.setItem('collegeEventUser', JSON.stringify(data.user));

// Return to registration if the student came from an event
const urlParams = new URLSearchParams(window.location.search);
const redirect = urlParams.get('redirect');
const eventId = urlParams.get('id');

if (redirect === 'register' && eventId) {
    window.location.href = `register.html?id=${encodeURIComponent(eventId)}`;
} else {
    window.location.href = 'index.html';
}
                } catch (error) {
                    showFeedback('error', 'Unable to connect to the server. Please try again later.');
                }
            }
        });
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (validateAdminLogin()) {
                const identifier = document.getElementById('admin-login-id').value.trim();
                const password = document.getElementById('admin-login-pass').value;

                try {
                    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ identifier, password })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        showFeedback('error', data.error || data.message || 'Admin login failed. Please check your credentials.');
                        return;
                    }

                    if (data.user.role !== 'admin') {
                        showFeedback('error', 'Access denied: This account does not have administrator privileges.');
                        return;
                    }

                    // Save admin session
                    localStorage.removeItem('collegeEventUser');
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('collegeEventAdmin', JSON.stringify(data.user));

                    window.location.href = 'admin/dashboard.html';
                } catch (error) {
                    showFeedback('error', 'Unable to connect to the server. Please try again later.');
                }
            }
        });
    }

    if (studentSignupForm) {
        studentSignupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (validateStudentSignup()) {
                const name = document.getElementById('signup-name').value.trim();
                const studentId = document.getElementById('signup-id').value.trim();
                const className = document.getElementById('signup-class').value;
                const division = document.getElementById('signup-division').value;
                const department = document.getElementById('signup-department').value;
                const email = document.getElementById('signup-email').value.trim();
                const phone = document.getElementById('signup-phone').value.trim();
                const password = document.getElementById('signup-pass').value;

                try {
                    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name,
                            studentId,
                            className,
                            division,
                            department,
                            email,
                            phone,
                            password
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        showFeedback('error', data.error || data.message || 'Signup failed. Please check your input details.');
                        return;
                    }

                    studentSignupForm.reset();
                    
                    // Switch back to login view and keep success message visible on main login interface
                    currentMode = 'login';
                    updateView();
                    showFeedback('success', 'Account created successfully! Please login with your credentials.');
                } catch (error) {
                    showFeedback('error', 'Unable to connect to the server. Please try again later.');
                }
            }
        });
    }

    // Specific Validations
    function validateStudentLogin() {
        let isValid = true;
        const idInput = document.getElementById('student-login-id');
        const passInput = document.getElementById('student-login-pass');
        
        clearFieldError(idInput, 'student-login-id-error');
        clearFieldError(passInput, 'student-login-pass-error');

        if (!idInput.value.trim()) {
            setFieldError(idInput, 'student-login-id-error', 'Please enter your Email or Student ID.');
            isValid = false;
        }

        if (!passInput.value.trim()) {
            setFieldError(passInput, 'student-login-pass-error', 'Please enter your password.');
            isValid = false;
        } else if (passInput.value.length < 6) {
            setFieldError(passInput, 'student-login-pass-error', 'Password must contain at least 6 characters.');
            isValid = false;
        }

        return isValid;
    }

    function validateAdminLogin() {
        let isValid = true;
        const idInput = document.getElementById('admin-login-id');
        const passInput = document.getElementById('admin-login-pass');
        
        clearFieldError(idInput, 'admin-login-id-error');
        clearFieldError(passInput, 'admin-login-pass-error');

        if (!idInput.value.trim()) {
            setFieldError(idInput, 'admin-login-id-error', 'Admin ID or email address is required.');
            isValid = false;
        }

        if (!passInput.value.trim()) {
            setFieldError(passInput, 'admin-login-pass-error', 'Admin password is required.');
            isValid = false;
        }

        return isValid;
    }

    function validateStudentSignup() {
        let isValid = true;

        const name = document.getElementById('signup-name');
        const studentId = document.getElementById('signup-id');
        const studentClass = document.getElementById('signup-class');
        const division = document.getElementById('signup-division');
        const department = document.getElementById('signup-department');
        const email = document.getElementById('signup-email');
        const phone = document.getElementById('signup-phone');
        const password = document.getElementById('signup-pass');
        const confirmPass = document.getElementById('signup-confirm-pass');

        [name, studentId, studentClass, division, department, email, phone, password, confirmPass].forEach(input => {
            clearFieldError(input, `${input.id}-error`);
        });

        if (!name.value.trim()) {
            setFieldError(name, 'signup-name-error', 'Please enter your full name.');
            isValid = false;
        }

        if (!studentId.value.trim()) {
            setFieldError(studentId, 'signup-id-error', 'Student ID number is required.');
            isValid = false;
        }

        if (!studentClass.value) {
            setFieldError(studentClass, 'signup-class-error', 'Please select your academic class.');
            isValid = false;
        }

        if (!division.value) {
            setFieldError(division, 'signup-division-error', 'Please select your class division.');
            isValid = false;
        }

        if (!department.value) {
            setFieldError(department, 'signup-department-error', 'Please select your department.');
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value.trim()) {
            setFieldError(email, 'signup-email-error', 'Email address is required.');
            isValid = false;
        } else if (!emailRegex.test(email.value.trim())) {
            setFieldError(email, 'signup-email-error', 'Please enter a valid email address format.');
            isValid = false;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phone.value.trim()) {
            setFieldError(phone, 'signup-phone-error', 'Phone number is required.');
            isValid = false;
        } else if (!phoneRegex.test(phone.value.trim())) {
            setFieldError(phone, 'signup-phone-error', 'Phone number must be exactly 10 digits.');
            isValid = false;
        }

        if (!password.value) {
            setFieldError(password, 'signup-pass-error', 'Password is required.');
            isValid = false;
        } else if (password.value.length < 6) {
            setFieldError(password, 'signup-pass-error', 'Password must be at least 6 characters long.');
            isValid = false;
        }

        if (confirmPass.value !== password.value) {
            setFieldError(confirmPass, 'signup-confirm-pass-error', 'Passwords do not match. Please re-enter.');
            isValid = false;
        }

        return isValid;
    }

    function setFieldError(inputElement, errorElementId, message) {
        inputElement.classList.add('is-invalid');
        const errorEl = document.getElementById(errorElementId);
        if (errorEl) errorEl.textContent = message;
    }

    function clearFieldError(inputElement, errorElementId) {
        inputElement.classList.remove('is-invalid');
        const errorEl = document.getElementById(errorElementId);
        if (errorEl) errorEl.textContent = '';
    }

    function clearAllErrors() {
        document.querySelectorAll('.form-input.is-invalid').forEach(input => input.classList.remove('is-invalid'));
        document.querySelectorAll('.error-message').forEach(msg => msg.textContent = '');
    }

    function showFeedback(type, message) {
        authFeedback.className = `auth-feedback ${type}`;
        if (type === 'success') {
            feedbackIcon.className = 'fa-solid fa-circle-check';
        } else {
            feedbackIcon.className = 'fa-solid fa-circle-exclamation';
        }
        feedbackMessage.textContent = message;
        authFeedback.style.display = 'flex';
        authFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideFeedback() {
        authFeedback.style.display = 'none';
    }
});