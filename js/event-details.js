/**
 * College Events - Event Details Page Logic
 * Reads event ID from URL query string and fetches details dynamically from backend API.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        showNotFoundState();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`);
        if (!response.ok) {
            showNotFoundState();
            return;
        }
        const event = await response.json();

        // Format dates
        const d = new Date(event.date);
        event.formattedDate = isNaN(d) ? '' : d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        if (event.deadline) {
            const dl = new Date(event.deadline);
            event.deadline = isNaN(dl) ? event.deadline : dl.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }

        populateEventDetails(event);
    } catch (error) {
        console.error('Error loading event details:', error);
        showNotFoundState();
    }
});

function populateEventDetails(event) {
    document.getElementById('event-content').style.display = 'grid';
    document.getElementById('event-not-found').style.display = 'none';

    // Page titles & Breadcrumb
    document.title = `${event.title} | College Events`;
    document.getElementById('breadcrumb-title').textContent = event.title;

    // Main Details
    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-short-desc').textContent = event.description;
    document.getElementById('event-full-desc').textContent = event.fullDescription || event.description;
    document.getElementById('event-eligibility').textContent = event.eligibility || 'Open to all students.';

    // Image & Badges
    const bannerImg = document.getElementById('event-image');
    bannerImg.src = event.image;
    bannerImg.alt = event.title;

    document.getElementById('event-category').textContent = event.categoryLabel || event.category;

    const statusBadge = document.getElementById('event-status-badge');
    statusBadge.textContent = event.status;
    statusBadge.className = `status-badge ${getStatusClass(event.status)}`;

    // Info Sidebar Elements
    document.getElementById('event-date').textContent = event.formattedDate || event.date;
    document.getElementById('event-time').textContent = event.time;
    document.getElementById('event-venue').textContent = event.venue;
    document.getElementById('event-organizer').textContent = event.organizer || 'College Event Committee';
    document.getElementById('event-deadline').textContent = event.deadline || 'N/A';

    // Seats Calculation & Visual Bar
    const totalSeats = event.totalSeats || 0;
    const availableSeats = event.availableSeats || 0;
    const filledSeats = totalSeats - availableSeats;
    
    // Percentage calculation
    const filledPercentage = totalSeats > 0 ? Math.min(100, Math.max(0, (filledSeats / totalSeats) * 100)) : 100;

    document.getElementById('seats-count-text').textContent = `${availableSeats} / ${totalSeats} available`;
    
    const progressBar = document.getElementById('seats-progress-bar');
    progressBar.style.width = `${filledPercentage}%`;

    const remainingNote = document.getElementById('seats-remaining-note');
    if (availableSeats === 0) {
        remainingNote.textContent = "All seats are fully booked.";
        progressBar.style.backgroundColor = "#dc2626";
    } else {
        remainingNote.textContent = `${availableSeats} seat(s) left for registration.`;
        progressBar.style.backgroundColor = filledPercentage > 85 ? "#d97706" : "#2563eb";
    }

    // Action Button & Registration Status logic
    const registerBtn = document.getElementById('btn-register');
    const closedMsg = document.getElementById('closed-message');

    if (event.status === 'Registration Closed') {
        registerBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Registration Closed';
        registerBtn.classList.add('btn-disabled');
        registerBtn.removeAttribute('href');
        closedMsg.style.display = 'block';
    } else if (event.status === 'Full') {
        registerBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Event Full';
        registerBtn.classList.add('btn-disabled');
        registerBtn.removeAttribute('href');
        closedMsg.style.display = 'block';
    } else {
    const token = localStorage.getItem('token');

    if (token) {
        registerBtn.href = `register.html?id=${encodeURIComponent(event._id)}`;
    } else {
        registerBtn.href = `login.html?redirect=register&id=${encodeURIComponent(event._id)}`;
    }

    registerBtn.classList.remove('btn-disabled');
    closedMsg.style.display = 'none';
}
}

function getStatusClass(status) {
    if (status === 'Registration Open') return 'status-open';
    if (status === 'Almost Full') return 'status-almost';
    return 'status-closed';
}

function showNotFoundState() {
    document.getElementById('event-content').style.display = 'none';
    document.getElementById('event-not-found').style.display = 'block';
}