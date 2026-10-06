/**
 * College Events - Admin Manage Events Logic
 * Handles interactive table rendering, calculations, search/filtering,
 * adding, editing, deleting events, form validations, and status calculations.
 * Connected to MongoDB REST API.
 */

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

document.addEventListener('DOMContentLoaded', () => {
    initManageEvents();
});

// State Store
let eventsList = [];
let deleteTargetId = null;

/**
 * Initializes page logic & authenticates admin
 */
async function initManageEvents() {
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

    // Attach logout handler ONLY to the drawer logout button
    const drawerLogoutBtn = document.getElementById('drawer-logout-btn');
    if (drawerLogoutBtn) {
        drawerLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!confirm("Are you sure you want to logout?")) return;
            localStorage.removeItem('token'); sessionStorage.removeItem('token');
            localStorage.removeItem('collegeEventAdmin'); sessionStorage.removeItem('collegeEventAdmin');
            localStorage.removeItem('collegeEventUser'); sessionStorage.removeItem('collegeEventUser');
            localStorage.removeItem('user'); sessionStorage.removeItem('user');
            window.location.href = '../login.html';
        });
    }

    // Initialize the profile drawer functionality directly inside initManageEvents
    setupProfileDrawer();

    setupEventListeners();
    updateCopyrightYear();
    
    // Check if URL specifies action=add from Dashboard navigation
    checkUrlParams();
    
    // Fetch initial events from backend API
    await fetchEvents();
}

/**
 * Fetches events from GET /api/events
 */
async function fetchEvents() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/events`);
        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }
        eventsList = await response.json();
        renderDashboard();
    } catch (err) {
        console.error('Error fetching events:', err);
        eventsList = [];
        renderDashboard();
        showAlertBanner('Unable to load events. Please make sure the backend server is running.');
    }
}

/**
 * Event Listeners Registration
 */
function setupEventListeners() {
    // Mobile Sidebar Toggles
    document.getElementById('sidebar-toggle-btn')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close-btn')?.addEventListener('click', toggleSidebar);

    // Modal Trigger Buttons
    document.getElementById('open-add-modal-btn')?.addEventListener('click', () => openEventModal());
    document.getElementById('sidebar-add-event-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openEventModal();
    });

    // Modal Close Buttons
    document.getElementById('modal-close-btn')?.addEventListener('click', closeEventModal);
    document.getElementById('modal-cancel-btn')?.addEventListener('click', closeEventModal);
    document.getElementById('delete-close-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-cancel-btn')?.addEventListener('click', closeDeleteModal);

    // Form Submissions
    document.getElementById('event-form')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('delete-confirm-btn')?.addEventListener('click', confirmDeleteEvent);

    // Filter and Search Inputs
    document.getElementById('search-input')?.addEventListener('input', renderDashboard);
    document.getElementById('filter-category')?.addEventListener('change', renderDashboard);
    document.getElementById('filter-status')?.addEventListener('change', renderDashboard);
    document.getElementById('sort-by')?.addEventListener('change', renderDashboard);
    
    // Clear Filter Event Listeners
    document.getElementById('clear-filters-btn')?.addEventListener('click', resetFilters);
    document.getElementById('reset-filters-btn')?.addEventListener('click', resetFilters);

    // Image Upload Preview Listener
    document.getElementById('event-image')?.addEventListener('change', function(e) {
        const previewContainer = document.getElementById('image-preview-container');
        const imagePreview = document.getElementById('event-image-preview');
        
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                imagePreview.src = evt.target.result;
                previewContainer.style.display = 'block';
            }
            reader.readAsDataURL(this.files[0]);
        }
    });

    // Alert Banner Close
    document.getElementById('alert-close-btn')?.addEventListener('click', hideAlertBanner);
}

/**
 * Main Render Pipeline
 */
function renderDashboard() {
    const filtered = getFilteredEvents();
    renderOverviewStats(eventsList);
    renderTable(filtered);
}

/**
 * Calculates overview card statistics dynamically from data
 */
function renderOverviewStats(data) {
    const total = data.length;
    let openCount = 0;
    let almostFullCount = 0;
    let closedCount = 0;

    data.forEach(evt => {
        const computedStatus = getCalculatedStatus(evt);
        if (computedStatus === 'Registration Open') openCount++;
        else if (computedStatus === 'Almost Full') almostFullCount++;
        else closedCount++; // Full or Closed
    });

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-open').textContent = openCount;
    document.getElementById('stat-almost-full').textContent = almostFullCount;
    document.getElementById('stat-closed').textContent = closedCount;
}

/**
 * Filters and Sorts dataset based on toolbar selections
 */
function getFilteredEvents() {
    const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const catVal = document.getElementById('filter-category')?.value || 'all';
    const statusVal = document.getElementById('filter-status')?.value || 'all';
    const sortVal = document.getElementById('sort-by')?.value || 'date-asc';

    return eventsList.filter(evt => {
        // Search Match
        const matchesSearch = evt.title.toLowerCase().includes(searchVal) ||
                              (evt.category && evt.category.toLowerCase().includes(searchVal)) ||
                              evt.venue.toLowerCase().includes(searchVal) ||
                              (evt.organizer && evt.organizer.toLowerCase().includes(searchVal));

        // Normalized case-insensitive category match
        const matchesCategory = (catVal === 'all') || 
                                (evt.category && evt.category.toLowerCase() === catVal.toLowerCase());

        // Status Match
        const computedStatus = getCalculatedStatus(evt);
        const matchesStatus = (statusVal === 'all') || (computedStatus === statusVal);

        return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
        if (sortVal === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortVal === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortVal === 'title-asc') return a.title.localeCompare(b.title);
        if (sortVal === 'title-desc') return b.title.localeCompare(a.title);
        if (sortVal === 'capacity-desc') return (b.totalSeats || 0) - (a.totalSeats || 0);
        return 0;
    });
}

/**
 * Renders HTML Table Rows
 */
function renderTable(events) {
    const tbody = document.getElementById('events-tbody');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count-text');

    if (!tbody) return;

    resultsCount.textContent = `Showing ${events.length} of ${eventsList.length} events`;

    if (events.length === 0) {
        tbody.innerHTML = '';
        emptyState?.classList.remove('hidden');
        return;
    }

    emptyState?.classList.add('hidden');

    tbody.innerHTML = events.map(evt => {
        const availableSeats = evt.availableSeats !== undefined ? Math.max(0, evt.availableSeats) : evt.totalSeats;
        const registrations = Math.max(0, evt.totalSeats - availableSeats);
        const computedStatus = getCalculatedStatus(evt);
        const statusBadgeClass = getStatusBadgeClass(computedStatus);
        const formattedDate = formatDateString(evt.date);

        return `
            <tr>
                <td>
                    <div class="event-title-cell">
                        <span class="event-name-text">${escapeHTML(evt.title)}</span>
                        <span class="event-sub-text">By ${escapeHTML(evt.organizer)}</span>
                    </div>
                </td>
                <td><span class="category-tag">${escapeHTML(evt.category)}</span></td>
                <td>
                    <div class="event-title-cell">
                        <span>${formattedDate}</span>
                        <span class="event-sub-text">${escapeHTML(evt.time)}</span>
                    </div>
                </td>
                <td>${escapeHTML(evt.venue)}</td>
                <td><strong>${evt.totalSeats}</strong></td>
                <td><strong>${registrations}</strong></td>
                <td><strong>${availableSeats}</strong></td>
                <td><span class="status-badge ${statusBadgeClass}">${computedStatus}</span></td>
                <td class="text-right">
                    <div class="action-btns-group">
                        <button class="btn-icon-action btn-edit" onclick="openEditModal('${evt._id}')" title="Edit Event">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-icon-action btn-delete" onclick="promptDeleteModal('${evt._id}')" title="Delete Event">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Logic to derive display status from backend status or available seats
 */
function getCalculatedStatus(evt) {
    return evt.status || 'Registration Open';
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Registration Open': return 'status-open';
        case 'Almost Full': return 'status-almost-full';
        case 'Full': return 'status-full';
        case 'Registration Closed': return 'status-closed';
        default: return '';
    }
}

/**
 * Opens Add / Edit Event Modal
 */
function openEventModal(eventId = null) {
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    const modalTitle = document.getElementById('modal-title-text');
    const errorBanner = document.getElementById('form-error-msg');
    const imageInput = document.getElementById('event-image');
    const previewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('event-image-preview');
    const categorySelect = document.getElementById('event-category');
    
    errorBanner?.classList.add('hidden');
    form.reset();
    imageInput.value = ''; // Ensure file input is cleared

    if (eventId) {
        // Edit Mode
        const evt = eventsList.find(e => e._id === eventId);
        if (!evt) return;

        modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Event`;
        document.getElementById('event-id').value = evt._id;
        document.getElementById('event-title').value = evt.title || '';
        
        // Normalized case-insensitive category pre-selection
        categorySelect.value = ''; 
        if (evt.category) {
            for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].value.toLowerCase() === evt.category.toLowerCase()) {
                    categorySelect.value = categorySelect.options[i].value;
                    break;
                }
            }
        }


        document.getElementById('event-date').value = formatDateForInput(evt.date);
        document.getElementById('event-time').value = evt.time || '';
        document.getElementById('event-venue').value = evt.venue || '';
        document.getElementById('event-organizer').value = evt.organizer || '';
        document.getElementById('event-capacity').value = evt.totalSeats || '';
        document.getElementById('event-deadline').value = formatDateForInput(evt.deadline);
        document.getElementById('event-eligibility').value = evt.eligibility || '';
        document.getElementById('event-description').value = evt.description || '';
        document.getElementById('event-full-description').value = evt.fullDescription || '';

        // Display existing image preview if present
        if (evt.image) {
            imagePreview.src = evt.image;
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
        }

    } else {
        // Add Mode
        modalTitle.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> Add New Event`;
        document.getElementById('event-id').value = '';

        previewContainer.style.display = 'none';
    }

    modal?.classList.add('active');
}

/**
 * Global wrapper to trigger edit mode from inline onclick
 */
window.openEditModal = function(id) {
    openEventModal(id);
};

/**
 * Closes Add / Edit Event Modal
 */
function closeEventModal() {
    document.getElementById('event-modal')?.classList.remove('active');
}

/**
 * Handles Form Validation & Submission (POST / PUT)
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const errorBanner = document.getElementById('form-error-msg');
    const eventId = document.getElementById('event-id').value;

    const title = document.getElementById('event-title').value.trim();
    const category = document.getElementById('event-category').value;
    
    // Existing mapping expected by public pages
    const categoryLabels = {
        Technical: 'Technical',
        Cultural: 'Cultural',
        Competitions: 'Competition',
        Sports: 'Sports',
        Workshops: 'Workshop',
        Seminars: 'Seminar'
    };
    const categoryLabel = categoryLabels[category] || category;


    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value.trim();
    const venue = document.getElementById('event-venue').value.trim();
    const organizer = document.getElementById('event-organizer').value.trim();
    const totalSeats = parseInt(document.getElementById('event-capacity').value, 10);
    const deadline = document.getElementById('event-deadline').value;
    const eligibility = document.getElementById('event-eligibility').value.trim();
    const description = document.getElementById('event-description').value.trim();
    const fullDescription = document.getElementById('event-full-description').value.trim();
    
    const imageInput = document.getElementById('event-image');
    let finalImageBase64 = "";

    if (new Date(deadline) > new Date(date)) {
        showFormError('Registration deadline cannot be after the event date.');
        return;
    }

    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    try {
        // Handle Image Serialization (File to Base64 String)
        if (imageInput.files && imageInput.files.length > 0) {
            finalImageBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (evt) => resolve(evt.target.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(imageInput.files[0]);
            });
        } else if (eventId) {
            // Keep existing image if editing and no new image was selected
            const existingEvent = eventsList.find(e => e._id === eventId);
            finalImageBase64 = existingEvent?.image || DEFAULT_IMAGE;
        } else {
            // Default fallback if no image selected on creation
            finalImageBase64 = DEFAULT_IMAGE;
        }

        // Build Payload - IMPORTANT: do not send availableSeats to backend
        const eventPayload = {
            title,
            category,
            categoryLabel,
            date,
            time,
            venue,
            organizer,
            description,
            fullDescription,
            eligibility,
            deadline,
            image: finalImageBase64,
            totalSeats
        };

        let response;
        if (eventId) {
            // PUT /api/events/:id
            response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventPayload)
            });
        } else {
            // POST /api/events
            response = await fetch(`${API_BASE_URL}/api/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventPayload)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save event.');
        }

        showAlertBanner(`Event "${title}" ${eventId ? 'updated' : 'created'} successfully.`);
        closeEventModal();
        await fetchEvents();
    } catch (err) {
        console.error('Error saving event:', err);
        showFormError(err.message || 'An unexpected error occurred while saving the event.');
    }
}

function showFormError(msg) {
    const errorBanner = document.getElementById('form-error-msg');
    if (errorBanner) {
        errorBanner.querySelector('span').textContent = msg;
        errorBanner.classList.remove('hidden');
    }
}

/**
 * Delete Modal Flow
 */
window.promptDeleteModal = function(id) {
    const evt = eventsList.find(e => e._id === id);
    if (!evt) return;

    deleteTargetId = id;
    document.getElementById('delete-event-title').textContent = evt.title;
    document.getElementById('delete-modal')?.classList.add('active');
};

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('delete-modal')?.classList.remove('active');
}

async function confirmDeleteEvent() {
    if (!deleteTargetId) return;

    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/events/${deleteTargetId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete event.');
        }

        showAlertBanner('Event deleted successfully.');
        closeDeleteModal();
        await fetchEvents();
    } catch (err) {
        console.error('Error deleting event:', err);
        showAlertBanner(err.message || 'Failed to delete event.');
        closeDeleteModal();
    }
}

/**
 * Utility: Reset Search & Filters
 */
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-status').value = 'all';
    document.getElementById('sort-by').value = 'date-asc';
    renderDashboard();
}

/**
 * Alert Banner helper
 */
function showAlertBanner(msg) {
    const banner = document.getElementById('alert-banner');
    const msgSpan = document.getElementById('alert-message');
    if (banner && msgSpan) {
        msgSpan.textContent = msg;
        banner.classList.remove('hidden');

        // Auto hide after 4 seconds
        setTimeout(() => {
            banner.classList.add('hidden');
        }, 4000);
    }
}

function hideAlertBanner() {
    document.getElementById('alert-banner')?.classList.add('hidden');
}

/**
 * URL Parameter Check (e.g. ?action=add)
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        openEventModal();
    }
}

/**
 * Mobile Sidebar Drawer Toggle
 */
function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('active');
}

/**
 * Updates dynamic footer year
 */
function updateCopyrightYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
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

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('show')) {
            closeDrawer();
        }
    });
}

/**
 * Helper: Format Date String (ISO to Month DD, YYYY)
 */
function formatDateString(dateStr) {
    if (!dateStr) return '';
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return dateStr;
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return parsedDate.toLocaleDateString('en-US', options);
}

/**
 * Helper: Format Date for HTML Input (YYYY-MM-DD)
 */
function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return '';
    return parsedDate.toISOString().split('T')[0];
}

/**
 * Helper: XSS String Sanitization
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}