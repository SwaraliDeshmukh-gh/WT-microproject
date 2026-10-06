/**
 * College Events - Account Settings Logic
 * Fetches authenticated user data, updates personal info and manages password changes.
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Verify Authentication Token
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    
    if (!token) {
        window.location.href = 'login.html';
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
        document.getElementById('profile-studentid').value = user.studentId || '';
        document.getElementById('profile-class').value = user.className || '';
        document.getElementById('profile-department').value = user.department || '';
        document.getElementById('profile-division').value = user.division || '';
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-phone').value = user.phone || '';
        
        // New Profile Fields
        document.getElementById('profile-bio').value = user.bio || '';
        document.getElementById('profile-designation').value = user.designation || '';
        document.getElementById('profile-role').value = user.role === 'admin' ? 'Administrator' : 'Student';
        document.getElementById('profile-status').value = user.accountStatus || 'Active';
        
        if (user.createdAt) {
            const createdDate = new Date(user.createdAt);
            document.getElementById('profile-created').value = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Toggle Admin vs Student UI Fields
        const adminFields = document.querySelectorAll('.admin-field');
        const studentFields = document.querySelectorAll('.student-field');
        
        if (user.role === 'admin') {
            adminFields.forEach(el => el.style.display = 'block');
            studentFields.forEach(el => el.style.display = 'none');
        } else {
            adminFields.forEach(el => el.style.display = 'none');
            studentFields.forEach(el => el.style.display = 'block');
        }

        initPhotoUpload(token, user);

    } catch (error) {
        console.error('Account Settings Load Error:', error);
        showProfileAlert('Unable to load your profile information at this time.', 'error');
    }
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
            className: document.getElementById('profile-class').value.trim(),
            department: document.getElementById('profile-department').value.trim(),
            division: document.getElementById('profile-division').value.trim(),
            email: document.getElementById('profile-email').value.trim(),
            phone: document.getElementById('profile-phone').value.trim(),
            bio: document.getElementById('profile-bio').value.trim(),
            designation: document.getElementById('profile-designation').value.trim()
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

            // Update local storage so other components (like navbar) stay in sync
            localStorage.setItem('collegeEventUser', JSON.stringify(data));
            
            // Immediately update navbar display names if they exist in DOM
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
 * Instantly updates the dynamically rendered profile name in the navbar
 * injected by main.js without requiring a hard refresh.
 */
function updateNavbarNameDisplay(newName) {
    const navProfileBtnSpan = document.querySelector('#nav-profile-toggle span');
    if (navProfileBtnSpan) {
        navProfileBtnSpan.textContent = newName;
    }
    
    const drawerProfileName = document.querySelector('.drawer-user-info .d-name');
    if (drawerProfileName) {
        drawerProfileName.textContent = newName;
    }
}

function updateNavbarProfilePhoto(base64Image) {
    // 1. Navbar Avatar
    const navProfileBtn = document.getElementById('nav-profile-toggle');
    if (navProfileBtn) {
        let existingImg = navProfileBtn.querySelector('.nav-avatar-img');
        let existingIcon = navProfileBtn.querySelector('i');
        
        if (base64Image) {
            if (!existingImg) {
                existingImg = document.createElement('img');
                existingImg.className = 'nav-avatar-img';
                existingImg.style.width = '20px';
                existingImg.style.height = '20px';
                existingImg.style.borderRadius = '50%';
                existingImg.style.objectFit = 'cover';
                navProfileBtn.insertBefore(existingImg, navProfileBtn.firstChild);
            }
            existingImg.src = base64Image;
            if (existingIcon) existingIcon.remove();
        } else {
            if (existingImg) existingImg.remove();
            if (!existingIcon) {
                existingIcon = document.createElement('i');
                existingIcon.className = 'fa-solid fa-user';
                navProfileBtn.insertBefore(existingIcon, navProfileBtn.firstChild);
            }
        }
    }
    
    // 2. Drawer Avatar
    const drawerAvatarWrap = document.querySelector('.drawer-avatar');
    if (drawerAvatarWrap) {
        if (base64Image) {
            drawerAvatarWrap.innerHTML = `<img src="${base64Image}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            drawerAvatarWrap.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
    }
}

/**
 * Initialize profile photo upload, preview, save, and remove logic
 */
function initPhotoUpload(token, user) {
    const photoInput = document.getElementById('profile-photo-input');
    const photoPreview = document.getElementById('profile-photo-preview');
    const photoIcon = document.getElementById('profile-photo-icon');
    const btnSave = document.getElementById('btn-save-photo');
    const btnRemove = document.getElementById('btn-remove-photo');
    const errorMsg = document.getElementById('photo-error-msg');
    
    if(!photoInput) return; // Fail gracefully if not found
    
    let currentBase64 = user.profilePhoto || "";

    // Show existing photo if any
    if (currentBase64) {
        photoPreview.src = currentBase64;
        photoPreview.style.display = 'block';
        photoIcon.style.display = 'none';
        btnRemove.style.display = 'inline-block';
    }

    // Handle File Selection
    photoInput.addEventListener('change', function() {
        errorMsg.style.display = 'none';
        const file = this.files[0];
        
        if (!file) return;

        // Validation
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            errorMsg.textContent = 'Invalid file type. Please upload a JPEG, PNG, or WEBP image.';
            errorMsg.style.display = 'block';
            this.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            errorMsg.textContent = 'File is too large. Maximum size is 5 MB.';
            errorMsg.style.display = 'block';
            this.value = '';
            return;
        }

        // Preview and Prepare Base64
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

    // Handle Save
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

            // Success
            btnSave.style.display = 'none';
            btnSave.textContent = 'Save';
            btnSave.disabled = false;
            btnRemove.style.display = 'inline-block';
            
            // Optionally update localStorage if the app relies on it
            const localUser = JSON.parse(localStorage.getItem('collegeEventUser') || '{}');
            if(localUser.name) {
                localUser.profilePhoto = currentBase64;
                localStorage.setItem('collegeEventUser', JSON.stringify(localUser));
            }
            
            updateNavbarProfilePhoto(currentBase64);

        } catch (err) {
            console.error(err);
            errorMsg.textContent = err.message;
            errorMsg.style.display = 'block';
            btnSave.textContent = 'Save';
            btnSave.disabled = false;
        }
    });

    // Handle Remove
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

            // Success
            currentBase64 = "";
            photoInput.value = "";
            photoPreview.src = "";
            photoPreview.style.display = 'none';
            photoIcon.style.display = 'block';
            btnRemove.style.display = 'none';
            btnSave.style.display = 'none';
            btnRemove.textContent = 'Remove';
            btnRemove.disabled = false;

            const localUser = JSON.parse(localStorage.getItem('collegeEventUser') || '{}');
            if(localUser.name) {
                localUser.profilePhoto = "";
                localStorage.setItem('collegeEventUser', JSON.stringify(localUser));
            }
            
            updateNavbarProfilePhoto("");

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
 * Triggers logout and redirect for invalid/expired tokens.
 */
function handleUnauthorized() {
    localStorage.removeItem('token'); sessionStorage.removeItem('token');
    localStorage.removeItem('collegeEventUser'); sessionStorage.removeItem('collegeEventUser');
    window.location.href = 'login.html';
}

/**
 * Display alert messages for Personal Information form
 */
function showProfileAlert(message, type) {
    const alertEl = document.getElementById('profile-alert');
    if (!alertEl) return;
    
    alertEl.textContent = message;
    alertEl.className = `settings-alert show ${type}`;
    
    // Auto-hide success message after a few seconds
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
    
    // Auto-hide success message after a few seconds
    if (type === 'success') {
        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 5000);
    }
}