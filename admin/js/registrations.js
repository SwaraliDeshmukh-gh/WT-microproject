/**
 * College Events - Admin Registrations Logic
 * Dynamic search, filtering, pagination, modal viewing, status updates, and stats updates connected to MongoDB API.
 */

document.addEventListener('DOMContentLoaded', () => {
    initRegistrationsPage();
});

// State Store
let registrationsList = [];
let currentPage = 1;
const itemsPerPage = 8;
let cancelTargetId = null;
let deleteTargetId = null;
let isActionProcessing = false;

async function initRegistrationsPage() {
    // 1. Authentication check
    const token = localStorage.getItem('token');
    const adminData = localStorage.getItem('collegeEventAdmin');
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

    // Attach standalone logout handler for the drawer
    const drawerLogoutBtn = document.getElementById('drawer-logout-btn');
    if (drawerLogoutBtn) {
        drawerLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('collegeEventAdmin');
            localStorage.removeItem('collegeEventUser');
            localStorage.removeItem('user');
            window.location.href = '../login.html';
        });
    }

    setupProfileDrawer();
    setupEventListeners();
    updateCopyrightYear();

    // 2. Fetch real registrations from backend API with improved error handling
    try {
        const response = await fetch('http://localhost:8000/api/registrations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch registrations');
        }

        registrationsList = await response.json();
        renderDashboard();
    } catch (err) {
        console.error('Error fetching registrations:', err);
        registrationsList = [];
        renderDashboard();
        showAlertBanner('Unable to load registrations. Please make sure the backend server is running.');
    }
}

function setupEventListeners() {
    // Mobile Sidebar Toggles
    document.getElementById('sidebar-toggle-btn')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close-btn')?.addEventListener('click', toggleSidebar);

    // Filter and Search Inputs
    document.getElementById('search-input')?.addEventListener('input', () => { currentPage = 1; renderDashboard(); });
    document.getElementById('filter-event')?.addEventListener('change', () => { currentPage = 1; renderDashboard(); });
    document.getElementById('filter-status')?.addEventListener('change', () => { currentPage = 1; renderDashboard(); });
    document.getElementById('sort-by')?.addEventListener('change', () => { currentPage = 1; renderDashboard(); });

    // Clear Filters Buttons
    document.getElementById('clear-filters-btn')?.addEventListener('click', resetFilters);
    document.getElementById('reset-filters-btn')?.addEventListener('click', resetFilters);

    // Modal Close Listeners
    document.getElementById('view-close-btn')?.addEventListener('click', closeViewModal);
    document.getElementById('view-modal-close-btn')?.addEventListener('click', closeViewModal);
    
    document.getElementById('cancel-close-btn')?.addEventListener('click', closeCancelModal);
    document.getElementById('cancel-keep-btn')?.addEventListener('click', closeCancelModal);
    
    document.getElementById('delete-close-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-keep-btn')?.addEventListener('click', closeDeleteModal);
    
    // Action Confirms
    document.getElementById('cancel-confirm-btn')?.addEventListener('click', confirmCancelRegistration);
    document.getElementById('delete-confirm-btn')?.addEventListener('click', confirmPermanentDeletion);

    // Alert Banner Close
    document.getElementById('alert-close-btn')?.addEventListener('click', hideAlertBanner);
}

/**
 * Main Render Pipeline
 */
function renderDashboard() {
    const filtered = getFilteredRegistrations();
    renderOverviewStats();
    renderTableAndPagination(filtered);
}

/**
 * Updates Statistics Overview Cards
 */
function renderOverviewStats() {
    const total = registrationsList.length;
    let confirmed = 0;
    let cancelled = 0;
    let upcoming = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    registrationsList.forEach(reg => {
        const status = reg.status || 'Confirmed';
        if (status === 'Confirmed') confirmed++;
        if (status === 'Cancelled') cancelled++;
        
        if (status === 'Confirmed' && reg.event && reg.event.date) {
            const eventDate = new Date(reg.event.date);
            if (eventDate >= today) {
                upcoming++;
            }
        }
    });

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-confirmed').textContent = confirmed;
    document.getElementById('stat-cancelled').textContent = cancelled;
    document.getElementById('stat-upcoming').textContent = upcoming;
}

/**
 * Filters & Sorts Dataset
 */
function getFilteredRegistrations() {
    const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const eventVal = document.getElementById('filter-event')?.value || 'all';
    const statusVal = document.getElementById('filter-status')?.value || 'all';
    const sortVal = document.getElementById('sort-by')?.value || 'newest';

    return registrationsList.filter(reg => {
        const eventTitle = reg.event ? (reg.event.title || '') : '';
        const matchesSearch = (reg.studentName || '').toLowerCase().includes(searchVal) ||
                              (reg.studentId || '').toLowerCase().includes(searchVal) ||
                              eventTitle.toLowerCase().includes(searchVal) ||
                              (reg.email || '').toLowerCase().includes(searchVal) ||
                              (reg._id || '').toLowerCase().includes(searchVal);

        const matchesEvent = (eventVal === 'all') || (eventTitle === eventVal);
        const matchesStatus = (statusVal === 'all') || ((reg.status || 'Confirmed') === statusVal);

        return matchesSearch && matchesEvent && matchesStatus;
    }).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        const nameA = a.studentName || '';
        const nameB = b.studentName || '';
        const eventA = a.event ? (a.event.title || '') : '';
        const eventB = b.event ? (b.event.title || '') : '';

        if (sortVal === 'newest') return dateB - dateA;
        if (sortVal === 'oldest') return dateA - dateB;
        if (sortVal === 'student-asc') return nameA.localeCompare(nameB);
        if (sortVal === 'student-desc') return nameB.localeCompare(nameA);
        if (sortVal === 'event-asc') return eventA.localeCompare(eventB);
        return 0;
    });
}

/**
 * Renders Table Content and Pagination Controls
 */
function renderTableAndPagination(data) {
    const tbody = document.getElementById('registrations-tbody');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count-text');
    const paginationWrapper = document.getElementById('pagination-wrapper');

    if (!tbody) return;

    resultsCount.textContent = `Showing ${data.length} of ${registrationsList.length} registrations`;

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

    tbody.innerHTML = paginatedData.map(reg => {
        const event = reg.event || {};
        const status = reg.status || 'Confirmed';
        const isConfirmed = status === 'Confirmed';
        return `
            <tr>
                <td><span class="reg-id-badge">${reg._id}</span></td>
                <td>
                    <div class="student-cell">
                        <span class="cell-title">${escapeHTML(reg.studentName)}</span>
                        <span class="cell-sub">${escapeHTML(reg.email)}</span>
                    </div>
                </td>
                <td><strong>${escapeHTML(reg.studentId)}</strong></td>
                <td>
                    <div class="event-cell">
                        <span class="cell-title">${escapeHTML(event.title)}</span>
                        <span class="cell-sub">${escapeHTML(event.categoryLabel || event.category)}</span>
                    </div>
                </td>
                <td>${formatDate(event.date)}</td>
                <td>${formatDate(reg.createdAt)}</td>
                <td>
                    <span class="status-badge ${isConfirmed ? 'status-confirmed' : 'status-cancelled'}">
                        <i class="fa-solid ${isConfirmed ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                        ${status}
                    </span>
                </td>
                <td class="text-right">
                    <div class="action-btns-group">
                        <button class="btn-icon-action btn-view" onclick="viewRegistrationDetails('${reg._id}')" title="View Details">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                        ${isConfirmed ? `
                            <button class="btn-icon-action btn-cancel-reg" ${isActionProcessing ? 'disabled' : ''} onclick="promptCancelModal('${reg._id}')" title="Cancel Registration">
                                <i class="fa-solid fa-ban"></i> Cancel
                            </button>
                        ` : `
                            <button class="btn-icon-action btn-confirm-reg" ${isActionProcessing ? 'disabled' : ''} onclick="confirmRegistrationStatus('${reg._id}')" title="Confirm Registration">
                                <i class="fa-solid fa-circle-check"></i> Confirm
                            </button>
                            <button class="btn-icon-action btn-delete-reg" ${isActionProcessing ? 'disabled' : ''} onclick="promptDeleteModal('${reg._id}')" title="Delete Permanently">
                                <i class="fa-solid fa-trash-can"></i> 
                            </button>
                        `}
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
window.viewRegistrationDetails = function(regId) {
    const reg = registrationsList.find(r => r._id === regId);
    if (!reg) return;

    const event = reg.event || {};
    const status = reg.status || 'Confirmed';
    const isConfirmed = status === 'Confirmed';

    document.getElementById('view-reg-id').textContent = reg._id;
    document.getElementById('view-reg-date').textContent = formatDate(reg.createdAt);
    
    const badge = document.getElementById('view-reg-status-badge');
    badge.textContent = status;
    badge.className = `status-badge ${isConfirmed ? 'status-confirmed' : 'status-cancelled'}`;

    // Student Information
    document.getElementById('view-student-name').textContent = reg.studentName || '-';
    document.getElementById('view-student-id').textContent = reg.studentId || '-';
    document.getElementById('view-student-class-div').textContent = `${reg.className || '-'} (${reg.division || '-'})`;
    document.getElementById('view-student-email').textContent = reg.email || '-';
    document.getElementById('view-student-phone').textContent = reg.phone || '-';

    // Event Information
    document.getElementById('view-event-name').textContent = event.title || '-';
    document.getElementById('view-event-category').textContent = event.categoryLabel || event.category || '-';
    document.getElementById('view-event-date').textContent = formatDate(event.date);
    document.getElementById('view-event-time').textContent = event.time || '-';
    document.getElementById('view-event-venue').textContent = event.venue || '-';

    document.getElementById('view-modal')?.classList.add('active');
};

function closeViewModal() {
    document.getElementById('view-modal')?.classList.remove('active');
}

/**
 * Cancel Registration Modal Prompt
 */
window.promptCancelModal = function(regId) {
    if (isActionProcessing) return;
    const reg = registrationsList.find(r => r._id === regId);
    if (!reg) return;

    cancelTargetId = regId;
    document.getElementById('cancel-student-name').textContent = reg.studentName || 'Student';
    document.getElementById('cancel-reg-id').textContent = reg._id;

    document.getElementById('cancel-modal')?.classList.add('active');
};

function closeCancelModal() {
    cancelTargetId = null;
    document.getElementById('cancel-modal')?.classList.remove('active');
}

/**
 * Permanent Delete Modal Prompt
 */
window.promptDeleteModal = function(regId) {
    if (isActionProcessing) return;
    const reg = registrationsList.find(r => r._id === regId);
    if (!reg) return;
    
    if (reg.status === 'Confirmed') {
        showAlertBanner('Confirmed registrations cannot be permanently deleted.');
        return;
    }

    deleteTargetId = regId;
    document.getElementById('delete-student-name').textContent = reg.studentName || 'Student';
    document.getElementById('delete-reg-id').textContent = reg._id;

    document.getElementById('delete-modal')?.classList.add('active');
};

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('delete-modal')?.classList.remove('active');
}

/**
 * Confirm Registration Cancellation via backend API
 */
async function confirmCancelRegistration() {
    if (!cancelTargetId || isActionProcessing) return;

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    isActionProcessing = true;
    const confirmBtn = document.getElementById('cancel-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
        const response = await fetch(`http://localhost:8000/api/registrations/${cancelTargetId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: 'Cancelled'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to cancel registration:', errorData);
            showAlertBanner(errorData.error || 'Failed to cancel registration. Please try again.');
            closeCancelModal();
            isActionProcessing = false;
            if (confirmBtn) confirmBtn.disabled = false;
            return;
        }

        // Successfully cancelled on backend
        registrationsList = registrationsList.map(reg => {
            if (reg._id === cancelTargetId) {
                return { ...reg, status: 'Cancelled' };
            }
            return reg;
        });

        showAlertBanner(`Registration ${cancelTargetId} cancelled successfully.`);
        closeCancelModal();
        renderDashboard();
    } catch (error) {
        console.error('Network or server error during cancellation:', error);
        showAlertBanner('An unexpected error occurred. Please try again.');
        closeCancelModal();
    } finally {
        isActionProcessing = false;
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

/**
 * Confirm Permanent Registration Deletion via backend API
 */
async function confirmPermanentDeletion() {
    if (!deleteTargetId || isActionProcessing) return;

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    isActionProcessing = true;
    const confirmBtn = document.getElementById('delete-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
        const response = await fetch(`http://localhost:8000/api/registrations/${deleteTargetId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to delete registration:', errorData);
            showAlertBanner(errorData.error || 'Failed to delete registration. Please try again.');
            closeDeleteModal();
            isActionProcessing = false;
            if (confirmBtn) confirmBtn.disabled = false;
            return;
        }

        // Successfully deleted on backend
        registrationsList = registrationsList.filter(reg => reg._id !== deleteTargetId);

        showAlertBanner(`Registration ${deleteTargetId} deleted permanently.`);
        closeDeleteModal();
        renderDashboard();
    } catch (error) {
        console.error('Network or server error during deletion:', error);
        showAlertBanner('An unexpected error occurred. Please try again.');
        closeDeleteModal();
    } finally {
        isActionProcessing = false;
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

/**
 * Confirm (restore) Registration status to Confirmed via backend API
 */
window.confirmRegistrationStatus = async function(regId) {
    if (!regId || isActionProcessing) return;

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    isActionProcessing = true;
    renderDashboard(); // Re-render to disable buttons

    try {
        const response = await fetch(`http://localhost:8000/api/registrations/${regId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: 'Confirmed'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to confirm registration:', errorData);
            showAlertBanner(errorData.error || 'Failed to confirm registration. Please try again.');
            isActionProcessing = false;
            renderDashboard();
            return;
        }

        // Successfully confirmed on backend
        registrationsList = registrationsList.map(reg => {
            if (reg._id === regId) {
                return { ...reg, status: 'Confirmed' };
            }
            return reg;
        });

        showAlertBanner(`Registration ${regId} confirmed successfully.`);
        renderDashboard();
    } catch (error) {
        console.error('Network or server error during confirmation:', error);
        showAlertBanner('An unexpected error occurred. Please try again.');
    } finally {
        isActionProcessing = false;
        renderDashboard();
    }
};

/**
 * Clear All Filters Action
 */
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-event').value = 'all';
    document.getElementById('filter-status').value = 'all';
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