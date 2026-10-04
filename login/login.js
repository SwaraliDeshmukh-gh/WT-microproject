/**
 * College Events - Login & Account Creation Interface Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initAuthPage();
});

function initAuthPage() {
    setupRoleSelector();
    setupStateSwitchers();
    setupPasswordToggles();
    setupLoginFormValidation();
    setupSignupFormValidation();
    setupForgotPasswordHandler();
    updateCopyrightYear();
}

/**
 * Switch state between Student and Admin user roles
 */
function setupRoleSelector() {
    const roleTabs = document.querySelectorAll('#user-role-tabs .tab-btn');
    const labelIdentifier = document.getElementById('label-identifier');
    const inputIdentifier = document.getElementById('login-identifier');
    const signupPrompt = document.getElementById('student-signup-prompt');

    roleTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            roleTabs.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            const selectedTab = e.currentTarget;
            selectedTab.classList.add('active');
            selectedTab.setAttribute('aria-selected', 'true');

            const selectedRole = selectedTab.getAttribute('data-role');

            clearAllErrors();
            hideAlert();
            switchAuthState('login');

            if (selectedRole === 'admin') {
                labelIdentifier.textContent = 'Admin ID or Email';
                inputIdentifier.placeholder = 'e.g. ADM9876 or admin@college.edu';
                signupPrompt.style.display = 'none';
            } else {
                labelIdentifier.textContent = 'Student ID or College Email';
                inputIdentifier.placeholder = 'e.g. ST12345 or student@college.edu';
                signupPrompt.style.display = 'block';
            }
        });
    });
}

/**
 * Handle switching between Sign In and Create Account states
 */
function setupStateSwitchers() {
    const btnShowSignup = document.getElementById('btn-show-signup');
    const btnShowLogin = document.getElementById('btn-show-login');

    if (btnShowSignup) {
        btnShowSignup.addEventListener('click', () => {
            clearAllErrors();
            hideAlert();
            switchAuthState('signup');
        });
    }

    if (btnShowLogin) {
        btnShowLogin.addEventListener('click', () => {
            clearAllErrors();
            hideAlert();
            switchAuthState('login');
        });
    }
}

/**
 * Toggle visibility of login vs signup views
 * @param {'login'|'signup'} state 
 */
function switchAuthState(state) {
    const loginBox = document.getElementById('login-state');
    const signupBox = document.getElementById('signup-state');
    const visualHeading = document.getElementById('visual-heading');
    const visualDesc = document.getElementById('visual-desc');

    if (state === 'signup') {
        loginBox.style.display = 'none';
        signupBox.style.display = 'block';
        visualHeading.textContent = 'Join College Events';
        visualDesc.textContent = 'Register your student profile to reserve tickets, receive event notifications, and manage campus participation.';
    } else {
        signupBox.style.display = 'none';
        loginBox.style.display = 'block';
        visualHeading.textContent = 'Your Gateway to Campus Life';
        visualDesc.textContent = 'Access your event passes, check real-time workshop schedules, and stay connected with everything happening on campus.';
    }
}

/**
 * Toggle password field visibility (text vs password input types)
 */
function setupPasswordToggles() {
    const toggleBtns = document.querySelectorAll('.toggle-password-btn');

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const inputField = document.getElementById(targetId);
            const icon = btn.querySelector('i');

            if (inputField && icon) {
                const isPassword = inputField.type === 'password';
                inputField.type = isPassword ? 'text' : 'password';
                icon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
            }
        });
    });
}

/**
 * Login Form Validation & Action Handler
 */
function setupLoginFormValidation() {
    const form = document.getElementById('login-form');
    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');

    if (!form) return;

    identifierInput.addEventListener('input', () => clearFieldError('login-identifier'));
    passwordInput.addEventListener('input', () => clearFieldError('login-password'));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAllErrors();
        hideAlert();

        const identifierVal = identifierInput.value.trim();
        const passwordVal = passwordInput.value;
        let isValid = true;

        if (!identifierVal) {
            showFieldError('login-identifier', 'Please enter your ID or Email');
            isValid = false;
        } else if (identifierVal.includes('@') && !isValidEmail(identifierVal)) {
            showFieldError('login-identifier', 'Please enter a valid email address');
            isValid = false;
        }

        if (!passwordVal) {
            showFieldError('login-password', 'Please enter your password');
            isValid = false;
        }

        if (isValid) {
            // Redirect user after authentication flow simulation
            window.location.href = 'index.html';
        }
    });
}

/**
 * Student Create Account Form Validation & Action Handler
 */
function setupSignupFormValidation() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    const fields = ['name', 'studentid', 'class', 'division', 'email', 'phone', 'password', 'confirm-password'];

    fields.forEach(field => {
        const input = document.getElementById(`signup-${field}`);
        if (input) {
            input.addEventListener('change', () => clearFieldError(`signup-${field}`));
            input.addEventListener('input', () => clearFieldError(`signup-${field}`));
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAllErrors();
        hideAlert();

        const nameVal = document.getElementById('signup-name').value.trim();
        const studentIdVal = document.getElementById('signup-studentid').value.trim();
        const classVal = document.getElementById('signup-class').value;
        const divisionVal = document.getElementById('signup-division').value;
        const emailVal = document.getElementById('signup-email').value.trim();
        const phoneVal = document.getElementById('signup-phone').value.trim();
        const passwordVal = document.getElementById('signup-password').value;
        const confirmPasswordVal = document.getElementById('signup-confirm-password').value;

        let isValid = true;

        if (!nameVal) {
            showFieldError('signup-name', 'Full name is required');
            isValid = false;
        }

        if (!studentIdVal) {
            showFieldError('signup-studentid', 'Student ID is required');
            isValid = false;
        }

        if (!classVal) {
            showFieldError('signup-class', 'Please select your academic year');
            isValid = false;
        }

        if (!divisionVal) {
            showFieldError('signup-division', 'Please select your division');
            isValid = false;
        }

        if (!emailVal) {
            showFieldError('signup-email', 'College email is required');
            isValid = false;
        } else if (!isValidEmail(emailVal)) {
            showFieldError('signup-email', 'Please enter a valid email address');
            isValid = false;
        }

        if (!phoneVal) {
            showFieldError('signup-phone', 'Phone number is required');
            isValid = false;
        } else if (!isValidPhone(phoneVal)) {
            showFieldError('signup-phone', 'Please enter a valid phone number (min 10 digits)');
            isValid = false;
        }

        if (!passwordVal) {
            showFieldError('signup-password', 'Password is required');
            isValid = false;
        } else if (passwordVal.length < 6) {
            showFieldError('signup-password', 'Password must be at least 6 characters');
            isValid = false;
        }

        if (!confirmPasswordVal) {
            showFieldError('signup-confirm-password', 'Please confirm your password');
            isValid = false;
        } else if (passwordVal && passwordVal !== confirmPasswordVal) {
            showFieldError('signup-confirm-password', 'Passwords do not match');
            isValid = false;
        }

        if (isValid) {
            // Smoothly switch back to login state with successful feedback
            switchAuthState('login');
            
            // Auto pre-fill the login identifier field for convenient sign in
            const loginIdentifierInput = document.getElementById('login-identifier');
            if (loginIdentifierInput) {
                loginIdentifierInput.value = studentIdVal;
            }

            showAlert(
                'success',
                `<i class="fa-solid fa-circle-check"></i> Account created successfully! You can now sign in with your credentials.`
            );
            form.reset();
        }
    });
}

/**
 * Handle Forgot Password link click
 */
function setupForgotPasswordHandler() {
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAlert(
                'info',
                `<i class="fa-solid fa-envelope"></i> Password reset instructions have been sent to your registered college email.`
            );
        });
    }
}

/**
 * Helper: Validate Email Format
 */
function isValidEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

/**
 * Helper: Validate Phone Format
 */
function isValidPhone(phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    return /^\d{10,15}$/.test(cleanPhone);
}

/**
 * Shows field error message and adds visual highlight
 */
function showFieldError(inputId, message) {
    const errorSpan = document.getElementById(`error-${inputId}`);
    const inputElem = document.getElementById(inputId);

    if (errorSpan) {
        errorSpan.textContent = message;
    }

    if (inputElem) {
        const group = inputElem.closest('.form-group');
        if (group) {
            group.classList.add('has-error');
        }
    }
}

/**
 * Clears field error message and removes visual highlight
 */
function clearFieldError(inputId) {
    const errorSpan = document.getElementById(`error-${inputId}`);
    const inputElem = document.getElementById(inputId);

    if (errorSpan) {
        errorSpan.textContent = '';
    }

    if (inputElem) {
        const group = inputElem.closest('.form-group');
        if (group) {
            group.classList.remove('has-error');
        }
    }
}

/**
 * Clears all error messages across forms
 */
function clearAllErrors() {
    const errorSpans = document.querySelectorAll('.error-text');
    errorSpans.forEach(span => span.textContent = '');

    const errorGroups = document.querySelectorAll('.form-group.has-error');
    errorGroups.forEach(group => group.classList.remove('has-error'));
}

/**
 * Shows top notification alert banner
 */
function showAlert(type, htmlContent) {
    const alertBox = document.getElementById('form-alert');
    if (alertBox) {
        alertBox.className = `form-status-alert alert-${type}`;
        alertBox.innerHTML = htmlContent;
        alertBox.style.display = 'block';
    }
}

/**
 * Hides top notification alert banner
 */
function hideAlert() {
    const alertBox = document.getElementById('form-alert');
    if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
    }
}

/**
 * Updates dynamic year element in footer
 */
function updateCopyrightYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}