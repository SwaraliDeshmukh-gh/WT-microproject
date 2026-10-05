/**
 * College Events - My Registrations Logic
 * Handles loading, displaying, filtering, and interacting with user event registrations from MongoDB API.
 */

// Page State Management
let currentFilter = 'all';
let allRegistrations = [];
let selectedRegIdToCancel = null;
let isCancelling = false;

document.addEventListener('DOMContentLoaded', () => {
    initRegistrationsPage();
});

/**
 * Main Initializer Function
 */
async function initRegistrationsPage() {
    // 1. Check for token in localStorage
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Fetch registrations from backend API
    try {
        const response = await fetch(`${API_BASE_URL}/api/registrations/my`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            showEmptyState();
            return;
        }

        allRegistrations = await response.json();
    } catch (err) {
        console.error("Error fetching registrations:", err);
        showEmptyState();
        allRegistrations = [];
    }

    renderRegistrations();
    setupFilterEventListeners();
    setupModalEventListeners();
}

/**
 * Main render controller that handles filtering, DOM injection, and empty states.
 */
function renderRegistrations() {
    const gridContainer = document.getElementById('registrations-grid');
    const emptyStateElem = document.getElementById('empty-state');
    const emptyMessageElem = document.getElementById('empty-message');

    // Update filter counters
    updateFilterCounts(allRegistrations);

    // Filter registrations based on active filter state
    const filteredRegistrations = filterRegistrations(allRegistrations, currentFilter);

    const displayedCountElem = document.getElementById('displayed-count');
    if (displayedCountElem) {
        displayedCountElem.textContent = filteredRegistrations.length;
    }

    if (filteredRegistrations.length === 0) {
        gridContainer.innerHTML = '';
        emptyStateElem.style.display = 'block';

        if (allRegistrations.length > 0 && currentFilter !== 'all') {
            emptyMessageElem.textContent = `No ${currentFilter} registrations found.`;
        } else {
            emptyMessageElem.textContent = "You haven't registered for any events yet. Explore upcoming campus activities and get involved!";
        }
        return;
    }

    emptyStateElem.style.display = 'none';
    gridContainer.innerHTML = filteredRegistrations.map(reg => createRegistrationCardHTML(reg)).join('');

    // Attach dynamic click event handlers for cancel buttons
    attachCardActionListeners();
}

/**
 * Helper to show empty state when API fails or returns nothing
 */
function showEmptyState() {
    allRegistrations = [];
    renderRegistrations();
}

/**
 * Filters the registrations list by status.
 */
function filterRegistrations(list, filter) {
    if (filter === 'confirmed') {
        return list.filter(r => (r.status || 'Confirmed').toLowerCase() === 'confirmed');
    }
    if (filter === 'cancelled') {
        return list.filter(r => (r.status || '').toLowerCase() === 'cancelled');
    }
    return list;
}

/**
 * Updates filter tab counts.
 */
function updateFilterCounts(registrations) {
    const countAll = registrations.length;
    const countConfirmed = registrations.filter(r => (r.status || 'Confirmed').toLowerCase() === 'confirmed').length;
    const countCancelled = registrations.filter(r => (r.status || '').toLowerCase() === 'cancelled').length;

    const countAllElem = document.getElementById('count-all');
    const countConfirmedElem = document.getElementById('count-confirmed');
    const countCancelledElem = document.getElementById('count-cancelled');

    if (countAllElem) countAllElem.textContent = countAll;
    if (countConfirmedElem) countConfirmedElem.textContent = countConfirmed;
    if (countCancelledElem) countCancelledElem.textContent = countCancelled;
}

/**
 * Generates the HTML string for a single registration card.
 */
function createRegistrationCardHTML(registration) {
    const event = registration.event || {};
    const title = event.title || 'Event Details Unavailable';
    const category = event.categoryLabel || event.category || 'General';
    const date = formatDate(event.date);
    const time = event.time || 'N/A';
    const venue = event.venue || 'N/A';
    const eventId = event._id || '';

    const status = registration.status || 'Confirmed';
    const isCancelled = status.toLowerCase() === 'cancelled';
    const statusClass = isCancelled ? 'badge-status-cancelled' : 'badge-status-confirmed';

    return `
        <div class="registration-card" data-reg-id="${registration._id}">
            <div class="card-top-bar">
                <span class="badge-category">${escapeHTML(category)}</span>
                <span class="badge-status ${statusClass}">${escapeHTML(status)}</span>
            </div>

            <div class="card-main-body">
                <h3 class="event-card-title font-heading">${escapeHTML(title)}</h3>

                <div class="info-list">
                    <div class="info-item">
                        <i class="fa-regular fa-calendar"></i>
                        <span>${escapeHTML(date)}</span>
                    </div>
                    <div class="info-item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${escapeHTML(time)}</span>
                    </div>
                    <div class="info-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeHTML(venue)}</span>
                    </div>
                </div>

                <div class="student-info-box">
                    <div class="student-detail-row">
                        <span class="detail-key">Reg ID:</span>
                        <span class="detail-val reg-id-val">${escapeHTML(registration._id || 'N/A')}</span>
                    </div>
                    <div class="student-detail-row">
                        <span class="detail-key">Student Name:</span>
                        <span class="detail-val">${escapeHTML(registration.studentName || 'N/A')}</span>
                    </div>
                    <div class="student-detail-row">
                        <span class="detail-key">Student ID:</span>
                        <span class="detail-val">${escapeHTML(registration.studentId || 'N/A')}</span>
                    </div>
                    <div class="student-detail-row">
                        <span class="detail-key">Reg Date:</span>
                        <span class="detail-val">${formatDate(registration.createdAt)}</span>
                    </div>
                </div>
            </div>

            <div class="card-actions-footer">
                <a href="confirmation.html?regId=${registration._id}" class="btn btn-outline">
                    <i class="fa-solid fa-receipt"></i> View Receipt
                </a>
                <a href="event-details.html?id=${eventId}" class="btn btn-outline">
                    <i class="fa-solid fa-eye"></i> View Event
                </a>
                ${!isCancelled ? `
                    <button type="button" class="btn-danger-outline btn-cancel-reg" data-reg-id="${registration._id}" data-event-title="${escapeHTML(title)}">
                        <i class="fa-solid fa-xmark"></i> Cancel
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Attaches event listeners to dynamically created cancel buttons.
 */
function attachCardActionListeners() {
    const cancelButtons = document.querySelectorAll('.btn-cancel-reg');
    cancelButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const regId = e.currentTarget.getAttribute('data-reg-id');
            const eventTitle = e.currentTarget.getAttribute('data-event-title');
            openCancelModal(regId, eventTitle);
        });
    });
}

/**
 * Sets up filter button click listeners.
 */
function setupFilterEventListeners() {
    const filterBtns = document.querySelectorAll('.btn-filter');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            currentFilter = e.currentTarget.getAttribute('data-filter');
            renderRegistrations();
        });
    });
}

/**
 * Modal Setup Functions
 */
function setupModalEventListeners() {
    const modal = document.getElementById('cancel-modal');
    const closeBtn = document.getElementById('btn-modal-close');
    const confirmBtn = document.getElementById('btn-modal-confirm');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeCancelModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCancelModal();
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirmCancel);
    }
}

function openCancelModal(regId, eventTitle) {
    selectedRegIdToCancel = regId;
    const titleElem = document.getElementById('modal-event-title');
    if (titleElem) titleElem.textContent = eventTitle;
    const modal = document.getElementById('cancel-modal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function closeCancelModal() {
    selectedRegIdToCancel = null;
    isCancelling = false;
    const modal = document.getElementById('cancel-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Handles confirmation of cancellation from modal via real API request.
 */
async function handleConfirmCancel() {
    if (!selectedRegIdToCancel || isCancelling) return;

    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    isCancelling = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/registrations/${selectedRegIdToCancel}`, {
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
            alert(errorData.error || 'Failed to cancel registration. Please try again.');
            isCancelling = false;
            return;
        }

        // Successfully cancelled on backend
        allRegistrations = allRegistrations.map(reg => {
            if (reg._id === selectedRegIdToCancel) {
                return { ...reg, status: 'Cancelled' };
            }
            return reg;
        });

        closeCancelModal();
        renderRegistrations();
    } catch (error) {
        console.error('Network or server error during cancellation:', error);
        alert('An unexpected error occurred. Please check your connection and try again.');
        isCancelling = false;
    }
}

/**
 * Utility: Safe HTML Escape
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Utility: Format Date string
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return dateStr;
    return parsedDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}