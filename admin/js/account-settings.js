/**
 * College Events - Admin Account Settings Logic
 * Fetches authenticated user data, updates personal info and manages password changes.
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Verify Authentication Token
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // Initialize Page
    await fetchAndPopulateUserData(token);
    setupFormListeners(token);
});

/**
 * Fetches the user data and populates the Personal Information form.
 */
async function fetchAndPopulateUserData(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Handle unauthorized access
        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load user data from the server.');
        }

        const user = await response.json();
        
        // Populate form inputs
        document.getElementById('profile-name').value = user.name || '';
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-phone').value = user.phone || '';
        document.getElementById('profile-department').value = user.department || '';
        document.getElementById('profile-designation').value = user.designation || '';
        document.getElementById('profile-bio').value = user.bio || '';
        
        // Read-only fields
        document.getElementById('profile-role').value = (user.role || 'Admin').toUpperCase();
        
        const createdDate = new Date(user.createdAt);
        document.getElementById('profile-created').value = !isNaN(createdDate) 
            ? createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
            : 'Unknown';
            
        document.getElementById('profile-status').value = user.accountStatus || 'Active';

        initAdminPhotoUpload(token, user);
        updateAdminProfileHeader(user.profilePhoto);

    } catch (error) {
        console.error('Account Settings Load Error:', error);
        showProfileAlert('Unable to load your profile information at this time.', 'error');
    }
}

/**
 * Attaches event listeners for the update forms.
 */
function initAdminPhotoUpload(token, user) {
    const photoInput = document.getElementById('profile-photo-input');
    const photoPreview = document.getElementById('profile-photo-preview');
    const photoIcon = document.getElementById('profile-photo-icon');
    const btnSave = document.getElementById('btn-save-photo');
    const btnRemove = document.getElementById('btn-remove-photo');
    const errorMsg = document.getElementById('photo-error-msg');
    
    let currentBase64 = user.profilePhoto || "";

    if (currentBase64) {
        photoPreview.src = currentBase64;
        photoPreview.style.display = 'block';
        photoIcon.style.display = 'none';
        btnRemove.style.display = 'inline-block';
    }

    photoInput.addEventListener('change', function() {
        errorMsg.style.display = 'none';
        const file = this.files[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            errorMsg.textContent = 'Invalid file type. Please upload a JPEG, PNG, or WEBP image.';
            errorMsg.style.display = 'block';
            this.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            errorMsg.textContent = 'File is too large. Maximum size is 5 MB.';
            errorMsg.style.display = 'block';
            this.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentBase64 = e.target.result;
            photoPreview.src = currentBase64;
            photoPreview.style.display = 'block';
            photoIcon.style.display = 'none';
            btnSave.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    });

    btnSave.addEventListener('click', async () => {
        try {
            btnSave.textContent = 'Saving...';
            btnSave.disabled = true;
            errorMsg.style.display = 'none';

            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ profilePhoto: currentBase64 })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update photo');
            }

            btnSave.style.display = 'none';
            btnSave.textContent = 'Save';
            btnSave.disabled = false;
            btnRemove.style.display = 'inline-block';
            
            const localUser = JSON.parse(localStorage.getItem('collegeEventAdmin') || '{}');
            if(localUser.name) {
                localUser.profilePhoto = currentBase64;
                localStorage.setItem('collegeEventAdmin', JSON.stringify(localUser));
            }
            
            if (typeof updateAdminProfileHeader === 'function') {
                updateAdminProfileHeader(currentBase64);
            }

        } catch (err) {
            console.error(err);
            errorMsg.textContent = err.message;
            errorMsg.style.display = 'block';
            btnSave.textContent = 'Save';
            btnSave.disabled = false;
        }
    });

    btnRemove.addEventListener('click', async () => {
        try {
            btnRemove.textContent = 'Removing...';
            btnRemove.disabled = true;
            errorMsg.style.display = 'none';

            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ profilePhoto: "" })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove photo');
            }

            currentBase64 = "";
            photoInput.value = "";
            photoPreview.src = "";
            photoPreview.style.display = 'none';
            photoIcon.style.display = 'block';
            btnRemove.style.display = 'none';
            btnSave.style.display = 'none';
            btnRemove.textContent = 'Remove';
            btnRemove.disabled = false;

            const localUser = JSON.parse(localStorage.getItem('collegeEventAdmin') || '{}');
            if(localUser.name) {
                localUser.profilePhoto = "";
                localStorage.setItem('collegeEventAdmin', JSON.stringify(localUser));
            }
            
            if (typeof updateAdminProfileHeader === 'function') {
                updateAdminProfileHeader("");
            }

        } catch (err) {
            console.error(err);
            errorMsg.textContent = err.message;
            errorMsg.style.display = 'block';
            btnRemove.textContent = 'Remove';
            btnRemove.disabled = false;
        }
    });
}

/**
 * Attaches event listeners for the update forms.
 */
function setupFormListeners(token) {
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');

    // Personal Information Update
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            name: document.getElementById('profile-name').value.trim(),
            email: document.getElementById('profile-email').value.trim(),
            phone: document.getElementById('profile-phone').value.trim(),
            department: document.getElementById('profile-department').value.trim(),
            designation: document.getElementById('profile-designation').value.trim(),
            bio: document.getElementById('profile-bio').value.trim()
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to update profile.');
            }

            // Update local storage so other components stay in sync
            localStorage.setItem('collegeEventAdmin', JSON.stringify(data));
            
            // Immediately update display names in headers and drawers
            updateNavbarNameDisplay(data.name);

            showProfileAlert('Personal information updated successfully.', 'success');

        } catch (error) {
            console.error('Profile Update Error:', error);
            showProfileAlert(error.message, 'error');
        }
    });

    // Password Update
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Frontend Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            showPasswordAlert('All password fields are required.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showPasswordAlert('New password and confirm password do not match.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (response.status === 401 || response.status === 403) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to update password.');
            }

            showPasswordAlert('Password updated successfully.', 'success');
            
            // Clear password fields on success
            passwordForm.reset();

        } catch (error) {
            console.error('Password Update Error:', error);
            showPasswordAlert(error.message, 'error');
        }
    });
}

/**
 * Instantly updates the dynamically rendered profile name globally.
 */
function updateNavbarNameDisplay(newName) {
    const navProfileBtnSpan = document.querySelector('.header-right .profile-name');
    if (navProfileBtnSpan) {
        navProfileBtnSpan.textContent = newName;
    }
    
    const drawerProfileName = document.querySelector('.drawer-user-info .d-name');
    if (drawerProfileName) {
        drawerProfileName.textContent = newName;
    }
}

/**
 * Instantly updates the profile photo globally.
 */
function updateAdminProfileHeader(base64Image) {
    const headerAvatarWrap = document.querySelector('.profile-avatar');
    if (headerAvatarWrap) {
        if (base64Image) {
            headerAvatarWrap.innerHTML = `<img src="${base64Image}" alt="Admin" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            headerAvatarWrap.innerHTML = `<i class="fa-solid fa-user-shield"></i>`;
        }
    }
}

/**
 * Triggers logout and redirect for invalid/expired tokens.
 */
function handleUnauthorized() {
    localStorage.removeItem('token'); sessionStorage.removeItem('token');
    localStorage.removeItem('collegeEventAdmin'); sessionStorage.removeItem('collegeEventAdmin');
    window.location.href = '../login.html';
}

/**
 * Display alert messages for Personal Information form
 */
function showProfileAlert(message, type) {
    const alertEl = document.getElementById('profile-alert');
    if (!alertEl) return;
    
    alertEl.textContent = message;
    alertEl.className = `settings-alert show ${type}`;
    
    // Auto-hide success message
    if (type === 'success') {
        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 5000);
    }
}

/**
 * Display alert messages for Password form
 */
function showPasswordAlert(message, type) {
    const alertEl = document.getElementById('password-alert');
    if (!alertEl) return;
    
    alertEl.textContent = message;
    alertEl.className = `settings-alert show ${type}`;
    
    // Auto-hide success message
    if (type === 'success') {
        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 5000);
    }
}