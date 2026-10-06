/**
 * College Events - Profile Page Logic
 * Fetches authenticated user data from backend and populates the profile UI.
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Verify Authentication Token
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    
    if (!token) {
        // Not logged in, redirect immediately
        window.location.href = 'login.html';
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
            localStorage.removeItem('collegeEventUser'); sessionStorage.removeItem('collegeEventUser');
            window.location.href = 'login.html';
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
    document.getElementById('val-studentid').textContent = user.studentId || 'Not specified';
    document.getElementById('val-email').textContent = user.email || 'Not specified';
    document.getElementById('val-phone').textContent = user.phone || 'Not specified';
    document.getElementById('val-class').textContent = user.className || 'Not specified';
    document.getElementById('val-department').textContent = user.department || 'Not specified';
    document.getElementById('val-division').textContent = user.division || 'Not specified';
    document.getElementById('val-role').textContent = user.role || 'Student';
    
    document.getElementById('val-bio').textContent = user.bio || 'Not specified';
    document.getElementById('val-designation').textContent = user.designation || 'Not specified';
    document.getElementById('val-status').textContent = user.accountStatus || 'Active';
    
    // Display Profile Photo
    const photoPreview = document.getElementById('profile-photo-preview');
    const photoIcon = document.getElementById('profile-photo-icon');
    
    if (user.profilePhoto && photoPreview && photoIcon) {
        photoPreview.src = user.profilePhoto;
        photoPreview.style.display = 'block';
        photoIcon.style.display = 'none';
    }
    
    if (user.createdAt) {
        const createdDate = new Date(user.createdAt);
        document.getElementById('val-created').textContent = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        document.getElementById('val-created').textContent = 'Not specified';
    }
    
    // Toggle Admin vs Student UI Fields
    const adminFields = document.querySelectorAll('.admin-field');
    const studentFields = document.querySelectorAll('.student-field');
    
    if (user.role === 'admin') {
        adminFields.forEach(el => el.style.display = 'flex');
        studentFields.forEach(el => el.style.display = 'none');
    } else {
        adminFields.forEach(el => el.style.display = 'none');
        studentFields.forEach(el => el.style.display = 'flex');
    }
}