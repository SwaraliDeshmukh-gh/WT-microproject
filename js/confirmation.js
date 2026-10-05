/**
 * College Events - Registration Confirmation Page Logic
 * Reads registration ID from URL query string and JWT token from localStorage,
 * fetches registration details from the backend API, and populates the confirmation view.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse regId from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const regId = urlParams.get('regId');

    // 2. Read JWT token from localStorage
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));

    // 3. If either regId or token is missing, show no-registration-card
    if (!regId || !token) {
        showNoDataState();
        return;
    }

    // 4. Fetch authenticated registration details from backend API
    try {
        const response = await fetch(`${API_BASE_URL}/api/registrations/${regId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            showNoDataState();
            return;
        }

        const registration = await response.json();
        displayConfirmationDetails(registration);

    } catch (error) {
        console.error('Error fetching registration details:', error);
        showNoDataState();
    }
});

/**
 * Dynamically updates DOM elements with registration and populated event information.
 */
function displayConfirmationDetails(registration) {
    document.getElementById('confirmation-content').style.display = 'block';
    document.getElementById('no-registration-card').style.display = 'none';

    // Populate Status Badge
    const statusElem = document.getElementById('display-status');
    statusElem.textContent = registration.status || 'Confirmed';

    // Populate Registration Details
    document.getElementById('display-reg-id').textContent = registration._id || 'N/A';
    document.getElementById('display-student-name').textContent = registration.studentName || 'N/A';
    document.getElementById('display-student-id').textContent = registration.studentId || 'N/A';
    document.getElementById('display-class').textContent = registration.className || 'N/A';
    document.getElementById('display-division').textContent = registration.division || 'N/A';
    document.getElementById('display-email').textContent = registration.email || 'N/A';
    document.getElementById('display-reg-date').textContent = formatDate(registration.createdAt);

    // Populate Event Details (from populated event object)
    const event = registration.event || {};
    const eventTitle = event.title || 'Event';
    const eventCategory = event.categoryLabel || event.category || 'General';
    const eventDate = formatDate(event.date);
    const eventTime = event.time || '-';
    const eventVenue = event.venue || '-';

    document.getElementById('display-event-title').textContent = eventTitle;
    document.getElementById('display-event-category').textContent = capitalizeFirstLetter(eventCategory);
    document.getElementById('display-event-date').textContent = eventDate;
    document.getElementById('display-event-time').textContent = eventTime;
    document.getElementById('display-event-venue').textContent = eventVenue;

    // Update page title
    document.title = `Registration Confirmed - ${eventTitle} | College Events`;
}

/**
 * Formats date strings into a human-readable format (e.g. 23 September 2026).
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) {
        return dateStr;
    }
    
    return parsedDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function showNoDataState() {
    document.getElementById('confirmation-content').style.display = 'none';
    document.getElementById('no-registration-card').style.display = 'block';
}