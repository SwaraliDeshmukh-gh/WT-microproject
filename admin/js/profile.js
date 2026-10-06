/**
 * College Events - Admin Profile Page Logic
 * Fetches authenticated admin data from backend and populates the profile UI.
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Verify Authentication Token
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Fetch User Data
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Handle expired/invalid tokens
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token'); sessionStorage.removeItem('token');
            localStorage.removeItem('collegeEventAdmin'); sessionStorage.removeItem('collegeEventAdmin');
            window.location.href = '../login.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load profile data from the server.');
        }

        // 3. Populate Profile Data
        const userData = await response.json();
        populateProfile(userData);

    } catch (error) {
        console.error('Profile API Error:', error);
        
        // Show user-friendly error message
        const errorMsg = document.getElementById('profile-error-msg');
        if (errorMsg) {
            errorMsg.textContent = 'Unable to load your profile information at this time. Please try again later.';
            errorMsg.classList.remove('hidden');
        }
    }
});

/**
 * Maps the returned user data to the DOM elements.
 * Uses fallback strings if a specific field is missing.
 */
function populateProfile(user) {
    document.getElementById('val-name').textContent = user.name || 'Not specified';
    document.getElementById('val-email').textContent = user.email || 'Not specified';
    document.getElementById('val-phone').textContent = user.phone || 'Not specified';
    document.getElementById('val-department').textContent = user.department || 'Not specified';
    document.getElementById('val-designation').textContent = user.designation || 'Not specified';
    document.getElementById('val-bio').textContent = user.bio || 'No bio provided.';
    
    document.getElementById('val-role').textContent = (user.role || 'Admin').toUpperCase();
    
    const profileNameEl = document.querySelector('.profile-name');
    if (profileNameEl && user.name) {
        profileNameEl.textContent = user.name;
    }

    const profileAvatarWrap = document.querySelector('.profile-avatar');
    if (profileAvatarWrap) {
        if (user.profilePhoto) {
            profileAvatarWrap.innerHTML = `<img src="${user.profilePhoto}" alt="Admin" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            profileAvatarWrap.innerHTML = `<i class="fa-solid fa-user-shield"></i>`;
        }
    }
    
    // Display Profile Photo (large preview)
    const photoPreview = document.getElementById('profile-photo-preview');
    const photoIcon = document.getElementById('profile-photo-icon');
    
    if (user.profilePhoto && photoPreview && photoIcon) {
        photoPreview.src = user.profilePhoto;
        photoPreview.style.display = 'block';
        photoIcon.style.display = 'none';
    }
    
    const createdDate = new Date(user.createdAt);
    document.getElementById('val-created').textContent = !isNaN(createdDate) 
        ? createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
        : 'Unknown';
        
    document.getElementById('val-status').textContent = user.accountStatus || 'Active';
}