/**
 * College Events - Admin Users Logic
 * Dynamic search, filtering, pagination, adding/editing/viewing/deleting accounts.
 * Connects to existing MongoDB Users API.
 */

document.addEventListener('DOMContentLoaded', () => {
    initUsersPage();
});

// State Store
let usersList = [];
let currentPage = 1;
const itemsPerPage = 8;
let deleteTargetId = null;
let isActionProcessing = false;

async function initUsersPage() {
    // 1. Authentication check
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    const adminData = (localStorage.getItem('collegeEventAdmin') || sessionStorage.getItem('collegeEventAdmin'));
    
    if (!token || !adminData) {
        window.location.href = '../login.html';
        return;
    }

    try {
        const user = JSON.parse(adminData);

        if (!user || user.role !== 'admin') {
            window.location.href = '../index.html';
            return;
        }

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
        
        // Populate the dynamic admin name in the profile drawer
        const drawerNameEl = document.getElementById('drawer-admin-name');
        if (drawerNameEl && user.name) {
            drawerNameEl.textContent = user.name;
        }

    } catch (err) {
        console.error('Error parsing admin session:', err);
        window.location.href = '../login.html';
        return;
    }

    // Attach logout handlers to all matching buttons
    const logoutBtns = document.querySelectorAll('.sidebar-logout-btn, .header-logout-btn, #drawer-logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!confirm("Are you sure you want to logout?")) return;
            localStorage.removeItem('token'); sessionStorage.removeItem('token');
            localStorage.removeItem('collegeEventAdmin'); sessionStorage.removeItem('collegeEventAdmin');
            localStorage.removeItem('collegeEventUser'); sessionStorage.removeItem('collegeEventUser');
            localStorage.removeItem('user'); sessionStorage.removeItem('user');
            window.location.href = '../login.html';
        });
    });

    setupProfileDrawer();
    setupEventListeners();
    updateCopyrightYear();

    // 2. Fetch Users
    await fetchUsers();
}

/**
 * Fetches users from GET /api/users
 */
async function fetchUsers() {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token'); sessionStorage.removeItem('token');
            localStorage.removeItem('collegeEventAdmin'); sessionStorage.removeItem('collegeEventAdmin');
            localStorage.removeItem('collegeEventUser'); sessionStorage.removeItem('collegeEventUser');
            localStorage.removeItem('user'); sessionStorage.removeItem('user');
            window.location.href = '../login.html';
            return;
        }

        if (response.status === 403) {
            window.location.href = '../index.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        usersList = await response.json();
        renderDashboard();
    } catch (err) {
        console.error('Error fetching users:', err);
        usersList = [];
        renderDashboard();
        showAlertBanner('Unable to load users. Please make sure the backend server is running.');
    }
}

/**
 * Event Listeners Registration
 */
function setupEventListeners() {
    // Mobile Sidebar Toggles
    document.getElementById('sidebar-toggle-btn')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close-btn')?.addEventListener('click', toggleSidebar);

    // Filter and Search Inputs
    document.getElementById('search-input')?.addEventListener('input', () => { currentPage = 1; renderDashboard(); });
    document.getElementById('filter-role')?.addEventListener('change', () => { currentPage = 1; renderDashboard(); });
    document.getElementById('sort-by')?.addEventListener('change', () => { currentPage = 1; renderDashboard(); });

    // Clear Filters Buttons
    document.getElementById('clear-filters-btn')?.addEventListener('click', resetFilters);
    document.getElementById('reset-filters-btn')?.addEventListener('click', resetFilters);

    // Modals open triggers
    document.getElementById('open-add-user-modal-btn')?.addEventListener('click', () => openUserModal());

    // Role selection dynamic form updates via Radio Buttons
    const roleRadios = document.querySelectorAll('input[name="user-role"]');
    roleRadios.forEach(radio => radio.addEventListener('change', handleRoleSelectionChange));

    // Modal Close Listeners
    document.getElementById('view-close-btn')?.addEventListener('click', closeViewModal);
    document.getElementById('view-modal-close-btn')?.addEventListener('click', closeViewModal);
    
    document.getElementById('user-modal-close-btn')?.addEventListener('click', closeUserModal);
    document.getElementById('user-modal-cancel-btn')?.addEventListener('click', closeUserModal);
    
    document.getElementById('delete-close-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-cancel-btn')?.addEventListener('click', closeDeleteModal);
    
    // Action Confirms
    document.getElementById('user-form')?.addEventListener('submit', handleUserFormSubmit);
    document.getElementById('delete-confirm-btn')?.addEventListener('click', confirmDeleteUser);

    // Alert Banner Close
    document.getElementById('alert-close-btn')?.addEventListener('click', hideAlertBanner);
}

/**
 * Main Render Pipeline
 */
function renderDashboard() {
    const filtered = getFilteredUsers();
    renderOverviewStats();
    renderTableAndPagination(filtered);
}

/**
 * Updates Statistics Overview Cards
 */
function renderOverviewStats() {
    const total = usersList.length;
    let students = 0;
    let admins = 0;

    usersList.forEach(user => {
        if (user.role === 'student') students++;
        if (user.role === 'admin') admins++;
    });

    document.getElementById('stat-total-users').textContent = total;
    document.getElementById('stat-student-users').textContent = students;
    
    const adminStatEl = document.getElementById('stat-admin-users');
    if(adminStatEl) adminStatEl.textContent = admins;
}

/**
 * Filters & Sorts Dataset
 */
function getFilteredUsers() {
    const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const roleVal = document.getElementById('filter-role')?.value || 'all';
    const sortVal = document.getElementById('sort-by')?.value || 'newest';

    return usersList.filter(user => {
        const matchesSearch = (user.name || '').toLowerCase().includes(searchVal) ||
                              (user.studentId || '').toLowerCase().includes(searchVal) ||
                              (user.email || '').toLowerCase().includes(searchVal) ||
                              (user.className || '').toLowerCase().includes(searchVal) ||
                              (user.division || '').toLowerCase().includes(searchVal);

        const matchesRole = (roleVal === 'all') || (user.role === roleVal);

        return matchesSearch && matchesRole;
    }).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        const nameA = a.name || '';
        const nameB = b.name || '';

        if (sortVal === 'newest') return dateB - dateA;
        if (sortVal === 'oldest') return dateA - dateB;
        if (sortVal === 'name-asc') return nameA.localeCompare(nameB);
        if (sortVal === 'name-desc') return nameB.localeCompare(nameA);
        return 0;
    });
}

/**
 * Renders Table Content and Pagination Controls
 */
function renderTableAndPagination(data) {
    const tbody = document.getElementById('users-tbody');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count-text');
    const paginationWrapper = document.getElementById('pagination-wrapper');

    if (!tbody) return;

    resultsCount.textContent = `Showing ${data.length} of ${usersList.length} users`;

    if (data.length === 0) {
        tbody.innerHTML = '';
        emptyState?.classList.remove('hidden');
        if (paginationWrapper) paginationWrapper.style.display = 'none';
        return;
    }

    emptyState?.classList.add('hidden');
    if (paginationWrapper) paginationWrapper.style.display = 'flex';

    // Pagination slice calculation
    const totalPages = Math.ceil(data.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

    tbody.innerHTML = paginatedData.map(user => {
        const isAdmin = user.role === 'admin';
        const roleClass = isAdmin ? 'role-admin' : 'role-student';
        const roleDisplay = (user.role || 'student').charAt(0).toUpperCase() + (user.role || 'student').slice(1);
        
        // Blank cells for admins according to requirements
        const studentIdDisplay = !isAdmin ? escapeHTML(user.studentId || '') : '';
        const classDivDisplay = !isAdmin && user.className ? escapeHTML(`${user.className}, ${user.department || 'N/A'}, Div ${user.division || ''}`) : '';
        const phoneDisplay = !isAdmin ? escapeHTML(user.phone || '') : '';

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <span class="user-cell-title">${escapeHTML(user.name)}</span>
                    </div>
                </td>
                <td><strong>${studentIdDisplay}</strong></td>
                <td>${classDivDisplay}</td>
                <td>${escapeHTML(user.email)}</td>
                <td>${phoneDisplay}</td>
                <td>
                    <span class="status-badge ${roleClass}">${roleDisplay}</span>
                </td>
                <td class="text-right">
                    <div class="action-btns-group">
                        <button class="btn-icon-action btn-view" onclick="viewUserDetails('${user._id}')" title="View Details">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                        ${!isAdmin ? `
                            <button class="btn-icon-action btn-edit" onclick="openUserModal('${user._id}')" title="Edit Student">
                                <i class="fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button class="btn-icon-action btn-delete-reg" ${isActionProcessing ? 'disabled' : ''} onclick="promptDeleteModal('${user._id}')" title="Delete Student">
                                <i class="fa-solid fa-trash-can"></i> Delete
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderPaginationControls(data.length, totalPages);
}

/**
 * Renders Pagination Buttons & Information
 */
function renderPaginationControls(totalItems, totalPages) {
    const infoSpan = document.getElementById('pagination-info');
    const controlsDiv = document.getElementById('pagination-controls');

    if (infoSpan) {
        infoSpan.textContent = `Page ${currentPage} of ${totalPages} (${totalItems} items)`;
    }

    if (!controlsDiv) return;

    let html = `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fa-solid fa-chevron-left"></i>
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>
        `;
    }

    html += `
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

    controlsDiv.innerHTML = html;
}

window.changePage = function(newPage) {
    currentPage = newPage;
    renderDashboard();
};

/**
 * View Modal Handler
 */
window.viewUserDetails = function(userId) {
    const user = usersList.find(u => u._id === userId);
    if (!user) return;

    document.getElementById('view-user-date').textContent = formatDate(user.createdAt);
    
    const roleBadge = document.getElementById('view-user-role-badge');
    roleBadge.textContent = (user.role || 'student').charAt(0).toUpperCase() + (user.role || 'student').slice(1);
    roleBadge.className = `status-badge ${user.role === 'admin' ? 'role-admin' : 'role-student'}`;

    document.getElementById('view-user-name').textContent = user.name || '';
    document.getElementById('view-user-email').textContent = user.email || '';
    document.getElementById('view-user-phone').textContent = user.phone || '-';
    document.getElementById('view-user-bio').textContent = user.bio || '-';
    document.getElementById('view-user-status').textContent = user.accountStatus || 'Active';

    const isStudent = user.role !== 'admin';
    
    // Hide entire rows conditionally
    document.getElementById('view-row-studentid').style.display = isStudent ? 'flex' : 'none';
    document.getElementById('view-row-classdiv').style.display = isStudent ? 'flex' : 'none';
    
    const deptRow = document.getElementById('view-row-department');
    if (deptRow) deptRow.style.display = isStudent ? 'none' : 'flex';
    
    const desigRow = document.getElementById('view-row-designation');
    if (desigRow) desigRow.style.display = isStudent ? 'none' : 'flex';

    // Populate data
    if (isStudent) {
        document.getElementById('view-user-id').textContent = user.studentId || '-';
        document.getElementById('view-user-class-div').textContent = user.className ? `${user.className}, ${user.department || 'N/A'}, Div ${user.division || ''}` : '-';
    } else {
        document.getElementById('view-user-department').textContent = user.department || '-';
        document.getElementById('view-user-designation').textContent = user.designation || '-';
    }

    document.getElementById('view-modal')?.classList.add('active');
};

function closeViewModal() {
    document.getElementById('view-modal')?.classList.remove('active');
}

/**
 * Dynamic form toggling based on role selection.
 * Handles the display logic natively within the CSS Grid.
 */
function handleRoleSelectionChange() {
    const checkedRadio = document.querySelector('input[name="user-role"]:checked');
    if (!checkedRadio) return;
    
    const isStudent = checkedRadio.value === 'student';
    const studentFields = document.querySelectorAll('.student-only-field');
    
    studentFields.forEach(field => {
        field.style.display = isStudent ? 'flex' : 'none';
        const input = field.querySelector('input, select, textarea');
        if (input) input.required = isStudent;
    });

    const btnText = document.getElementById('submit-btn-text');
    if (btnText) {
        const isEdit = document.getElementById('user-id').value !== '';
        btnText.textContent = isEdit ? 'Save Changes' : 'Add User';
    }
}

/**
 * Opens Add / Edit User Modal
 */
window.openUserModal = function(userId = null) {
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    const modalTitle = document.getElementById('user-modal-title-text');
    const errorBanner = document.getElementById('user-form-error-msg');
    const passwordGroup = document.getElementById('password-group');
    const passwordInput = document.getElementById('user-password');
    const roleGroupWrapper = document.getElementById('role-selection-wrapper');
    
    errorBanner?.classList.add('hidden');
    form.reset();

    if (userId) {
        // Edit Mode (Only for students based on requirements)
        const user = usersList.find(u => u._id === userId);
        if (!user || user.role === 'admin') return; 

        modalTitle.innerHTML = `<i class="fa-solid fa-user-pen"></i> Edit Student`;
        document.getElementById('user-id').value = user._id;
        document.getElementById('user-name').value = user.name || '';
        document.getElementById('user-email').value = user.email || '';
        
        // Hide role selector wrapper (and divider) during edit
        if(roleGroupWrapper) roleGroupWrapper.style.display = 'none';
        
        // Setup fields based on the user's existing role by silently setting the radio
        const studentRadio = document.querySelector('input[name="user-role"][value="student"]');
        if(studentRadio) studentRadio.checked = true;
        handleRoleSelectionChange();
        
        document.getElementById('user-studentid').value = user.studentId || '';
        document.getElementById('user-class').value = user.className || '';
        document.getElementById('user-department').value = user.department || '';
        document.getElementById('user-division').value = user.division || '';
        document.getElementById('user-phone').value = user.phone || '';
        
        // Hide password field and divider during edit
        if(passwordGroup) passwordGroup.style.display = 'none';
        if(passwordInput) passwordInput.required = false;

    } else {
        // Add Mode
        modalTitle.innerHTML = `<i class="fa-solid fa-user-plus"></i> Add User`;
        document.getElementById('user-id').value = '';
        
        // Show role selector wrapper during add
        if(roleGroupWrapper) roleGroupWrapper.style.display = 'block';
        
        const studentRadio = document.querySelector('input[name="user-role"][value="student"]');
        if(studentRadio) studentRadio.checked = true;
        handleRoleSelectionChange();

        // Show password field during add
        if(passwordGroup) passwordGroup.style.display = 'flex';
        if(passwordInput) passwordInput.required = true;
    }

    modal?.classList.add('active');
};

function closeUserModal() {
    document.getElementById('user-modal')?.classList.remove('active');
}

/**
 * Handles Form Validation & Submission (POST / PUT)
 */
async function handleUserFormSubmit(e) {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const isEdit = !!userId;
    
    // For edits, it is always a student. Otherwise check radio.
    let userRole = 'student';
    if (!isEdit) {
        const checkedRadio = document.querySelector('input[name="user-role"]:checked');
        if (checkedRadio) userRole = checkedRadio.value;
    }

    const isStudent = userRole === 'student';

    // Base payload common to both
    const payload = {
        name: document.getElementById('user-name').value.trim(),
        email: document.getElementById('user-email').value.trim(),
        phone: document.getElementById('user-phone').value.trim(),
        department: document.getElementById('user-department').value.trim()
    };

    // Add student specific fields
    if (isStudent) {
        payload.studentId = document.getElementById('user-studentid').value.trim();
        payload.className = document.getElementById('user-class').value.trim();
        payload.division = document.getElementById('user-division').value.trim();
    }

    // Add creation specific fields
    if (!isEdit) {
        payload.password = document.getElementById('user-password').value;
        payload.role = userRole;
    }

    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    const submitBtn = document.getElementById('user-modal-submit-btn');
    if(submitBtn) submitBtn.disabled = true;

    try {
        let response;
        if (isEdit) {
            // PUT /api/users/:id
            response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        } else {
            // POST /api/users
            response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        }

        if (response.status === 401) {
            localStorage.removeItem('token'); sessionStorage.removeItem('token');
            localStorage.removeItem('collegeEventAdmin'); sessionStorage.removeItem('collegeEventAdmin');
            localStorage.removeItem('collegeEventUser'); sessionStorage.removeItem('collegeEventUser');
            localStorage.removeItem('user'); sessionStorage.removeItem('user');
            window.location.href = '../login.html';
            return;
        }

        if (response.status === 403) {
            window.location.href = '../index.html';
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to save user.');
        }

        showAlertBanner(`${isStudent ? 'Student' : 'Admin'} "${payload.name}" ${isEdit ? 'updated' : 'created'} successfully.`);
        closeUserModal();
        await fetchUsers(); // Refresh the list
    } catch (err) {
        console.error('Error saving user:', err);
        const errorBanner = document.getElementById('user-form-error-msg');
        if (errorBanner) {
            errorBanner.querySelector('span').textContent = err.message || 'An unexpected error occurred while saving.';
            errorBanner.classList.remove('hidden');
        }
    } finally {
        if(submitBtn) submitBtn.disabled = false;
    }
}

/**
 * Delete Modal Prompt
 */
window.promptDeleteModal = function(userId) {
    if (isActionProcessing) return;
    const user = usersList.find(u => u._id === userId);
    if (!user || user.role === 'admin') return;

    deleteTargetId = userId;
    document.getElementById('delete-user-name').textContent = user.name || 'Student';

    document.getElementById('delete-modal')?.classList.add('active');
};

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('delete-modal')?.classList.remove('active');
}

/**
 * Confirm User Deletion via backend API
 */
async function confirmDeleteUser() {
    if (!deleteTargetId || isActionProcessing) return;

    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    isActionProcessing = true;
    const confirmBtn = document.getElementById('delete-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${deleteTargetId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token'); sessionStorage.removeItem('token');
            localStorage.removeItem('collegeEventAdmin'); sessionStorage.removeItem('collegeEventAdmin');
            localStorage.removeItem('collegeEventUser'); sessionStorage.removeItem('collegeEventUser');
            localStorage.removeItem('user'); sessionStorage.removeItem('user');
            window.location.href = '../login.html';
            return;
        }

        if (response.status === 403) {
            window.location.href = '../index.html';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete user.');
        }

        // Successfully deleted on backend
        usersList = usersList.filter(user => user._id !== deleteTargetId);

        showAlertBanner(`Student account deleted successfully.`);
        closeDeleteModal();
        renderDashboard();
    } catch (error) {
        console.error('Error during deletion:', error);
        showAlertBanner(error.message || 'An unexpected error occurred. Please try again.');
        closeDeleteModal();
    } finally {
        isActionProcessing = false;
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

/**
 * Clear All Filters Action
 */
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-role').value = 'all';
    document.getElementById('sort-by').value = 'newest';
    currentPage = 1;
    renderDashboard();
}

/**
 * Alert Banner Helpers
 */
function showAlertBanner(msg) {
    const banner = document.getElementById('alert-banner');
    const msgSpan = document.getElementById('alert-message');
    if (banner && msgSpan) {
        msgSpan.textContent = msg;
        banner.classList.remove('hidden');

        setTimeout(() => {
            banner.classList.add('hidden');
        }, 4000);
    }
}

function hideAlertBanner() {
    document.getElementById('alert-banner')?.classList.add('hidden');
}

/**
 * Mobile Sidebar Toggle
 */
function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('active');
}

/**
 * Footer Year
 */
function updateCopyrightYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

/**
 * Setups the interactive right-side profile drawer
 */
function setupProfileDrawer() {
    const profileToggle = document.getElementById('admin-profile-toggle');
    const drawer = document.getElementById('profile-drawer');
    const overlay = document.getElementById('profile-drawer-overlay');
    const closeBtn = document.getElementById('drawer-close-btn');

    if (!profileToggle || !drawer || !overlay) return;

    const openDrawer = () => {
        overlay.classList.add('show');
        drawer.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
        overlay.classList.remove('show');
        drawer.classList.remove('show');
        document.body.style.overflow = '';
    };

    profileToggle.addEventListener('click', (e) => {
        e.stopPropagation();

        if (drawer.classList.contains('show')) {
            closeDrawer();
        } else {
            openDrawer();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeDrawer);
    }

    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('show')) {
            closeDrawer();
        }
    });
}

/**
 * Utility: Format Date
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return dateStr;
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return parsedDate.toLocaleDateString('en-US', options);
}

/**
 * Utility: Escape HTML Output
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}