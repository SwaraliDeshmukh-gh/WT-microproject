/**
 * College Events - Registration Page Logic
 * Reads event ID from URL query string, fetches event details from backend API,
 * validates student registration details, submits to backend API, and redirects to confirmation page.
 */

let selectedEvent = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse Event ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    // Default fallback if parameter is missing
    if (!eventId) {
        showNotFoundState();
        return;
    }

    // 2. Fetch real event from backend API
    try {
        const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`);
        if (!response.ok) {
            showNotFoundState();
            return;
        }
        const event = await response.json();

        // Format date for display consistency
        const d = new Date(event.date);
        event.formattedDate = isNaN(d) ? event.date : d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        selectedEvent = event;

        renderEventSummary(selectedEvent);
        checkSeatAvailability(selectedEvent);
        
        await populateUserProfileFields();
        
        setupLiveValidation();
        setupFormSubmit();
    } catch (error) {
        console.error('Error loading event details for registration:', error);
        showNotFoundState();
    }
});

// Fetch authenticated user profile and populate fields
async function populateUserProfileFields() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            window.location.href = 'login.html';
            return;
        }

        const user = await response.json();

        // Auto-fill fields
        const fields = [
            { id: 'studentName', value: user.name },
            { id: 'studentId', value: user.studentId },
            { id: 'email', value: user.email },
            { id: 'className', value: user.className },
            { id: 'division', value: user.division },
            { id: 'phone', value: user.phone },
            { id: 'department', value: user.department } // For Req 3
        ];

        fields.forEach(field => {
            const el = document.getElementById(field.id);
            if (el && field.value) {
                el.value = field.value;
                el.readOnly = true;
                
                // For select elements, disabled works better to prevent changes
                if (el.tagName === 'SELECT') {
                    // Try to set the value. If it doesn't match an option, we might need to add it dynamically or rely on standardize Req 3 to fix options.
                    el.disabled = true;
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

// Render selected event details in sidebar summary card
function renderEventSummary(event) {
    document.getElementById('registration-container').style.display = 'grid';
    document.getElementById('event-not-found').style.display = 'none';

    document.title = `Register for ${event.title} | College Events`;

    // Navigation & Breadcrumb setup
    const backBtn = document.getElementById('btn-back-to-details');
    const breadcrumbLink = document.getElementById('breadcrumb-event-link');
    const cancelBtn = document.getElementById('btn-cancel');

    const eventDetailsUrl = `event-details.html?id=${encodeURIComponent(event._id)}`;
    
    backBtn.href = eventDetailsUrl;
    breadcrumbLink.href = eventDetailsUrl;
    breadcrumbLink.textContent = event.title;
    cancelBtn.href = eventDetailsUrl;

    // Populate Sidebar Summary
    document.getElementById('summary-event-image').src = event.image;
    document.getElementById('summary-event-image').alt = event.title;
    document.getElementById('summary-event-category').textContent = event.categoryLabel || event.category;
    document.getElementById('summary-event-title').textContent = event.title;
    document.getElementById('summary-event-date').textContent = event.formattedDate || event.date;
    document.getElementById('summary-event-time').textContent = event.time;
    document.getElementById('summary-event-venue').textContent = event.venue;
    document.getElementById('summary-event-seats').textContent = `${event.availableSeats} / ${event.totalSeats} seats`;
}

// Seat Availability Check
function checkSeatAvailability(event) {
    const seatsAlert = document.getElementById('seats-full-alert');
    const submitBtn = document.getElementById('btn-submit');
    const formInputs = document.querySelectorAll('#registration-form input, #registration-form select');

    if (event.availableSeats <= 0) {
        seatsAlert.style.display = 'flex';
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-disabled');

        formInputs.forEach(input => {
            input.disabled = true;
        });
    }
}

// Setup real-time input error clearing
function setupLiveValidation() {
    const form = document.getElementById('registration-form');
    const inputs = form.querySelectorAll('input, select');

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearFieldError(input.id);
        });

        input.addEventListener('change', () => {
            clearFieldError(input.id);
        });
    });
}

// Form Submission & Validation Logic
function setupFormSubmit() {
    const form = document.getElementById('registration-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedEvent || selectedEvent.availableSeats <= 0) {
            return;
        }

        const isValid = validateForm();

        if (isValid) {
            await submitRegistration();
        } else {
            const globalError = document.getElementById('form-global-error');
            globalError.style.display = 'flex';
            globalError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

// Validate each input field using JS Regex and strict checks
function validateForm() {
    let isValid = true;

    // Fields
    const nameInput = document.getElementById('studentName');
    const idInput = document.getElementById('studentId');
    const emailInput = document.getElementById('email');
    const classInput = document.getElementById('className');
    const divisionInput = document.getElementById('division');
    const departmentInput = document.getElementById('department');
    const phoneInput = document.getElementById('phone');
    const confirmInput = document.getElementById('confirmCheck');

    // 1. Student Name Validation
    if (!nameInput.value.trim()) {
        showFieldError('studentName', 'Full Name is required.');
        isValid = false;
    } else if (nameInput.value.trim().length < 3) {
        showFieldError('studentName', 'Name must be at least 3 characters long.');
        isValid = false;
    } else {
        clearFieldError('studentName');
    }

    // 2. Student ID Validation
    if (!idInput.value.trim()) {
        showFieldError('studentId', 'Student ID / PRN is required.');
        isValid = false;
    } else if (idInput.value.trim().length < 3) {
        showFieldError('studentId', 'Please enter a valid Student ID.');
        isValid = false;
    } else {
        clearFieldError('studentId');
    }

    // 3. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim()) {
        showFieldError('email', 'Email address is required.');
        isValid = false;
    } else if (!emailRegex.test(emailInput.value.trim())) {
        showFieldError('email', 'Please enter a valid email address (e.g. name@domain.com).');
        isValid = false;
    } else {
        clearFieldError('email');
    }

    // 4. Class Selection Validation
    if (!classInput.value) {
        showFieldError('className', 'Please select your class/year.');
        isValid = false;
    } else {
        clearFieldError('className');
    }

    // 5. Division Selection Validation
    if (!divisionInput.value) {
        showFieldError('division', 'Please select your division.');
        isValid = false;
    } else {
        clearFieldError('division');
    }

    // 5.5 Department Selection Validation
    if (!departmentInput.value) {
        showFieldError('department', 'Please select your department.');
        isValid = false;
    } else {
        clearFieldError('department');
    }

    // 6. Phone Number Validation (Standard 10-digit check)
    const phoneRegex = /^[0-9]{10}$/;
    const cleanPhone = phoneInput.value.trim().replace(/[\s\-\+\(\)]/g, '');
    if (!phoneInput.value.trim()) {
        showFieldError('phone', 'Phone number is required.');
        isValid = false;
    } else if (!phoneRegex.test(cleanPhone)) {
        showFieldError('phone', 'Please enter a valid 10-digit phone number.');
        isValid = false;
    } else {
        clearFieldError('phone');
    }

    // 7. Confirmation Checkbox Validation
    if (!confirmInput.checked) {
        showFieldError('confirmCheck', 'You must confirm that the information provided is correct.');
        isValid = false;
    } else {
        clearFieldError('confirmCheck');
    }

    return isValid;
}

// Helper to show inline validation errors
function showFieldError(fieldId, message) {
    const errorSpan = document.getElementById(`${fieldId}-error`);
    const inputControl = document.getElementById(fieldId);

    if (errorSpan) {
        errorSpan.textContent = message;
    }

    if (inputControl && inputControl.type !== 'checkbox') {
        inputControl.classList.add('is-invalid');
    }
}

// Helper to clear inline validation errors
function clearFieldError(fieldId) {
    const errorSpan = document.getElementById(`${fieldId}-error`);
    const inputControl = document.getElementById(fieldId);
    const globalError = document.getElementById('form-global-error');

    if (errorSpan) {
        errorSpan.textContent = '';
    }

    if (inputControl) {
        inputControl.classList.remove('is-invalid');
    }

    if (globalError) {
        globalError.style.display = 'none';
    }
}

// Submit registration to backend API and redirect
async function submitRegistration() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const globalError = document.getElementById('form-global-error');

    try {
        const response = await fetch(`${API_BASE_URL}/api/registrations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                event: selectedEvent._id
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to complete registration.');
        }

        // Redirect to confirmation page with actual event ID and backend registration ID
        window.location.href = `confirmation.html?id=${encodeURIComponent(selectedEvent._id)}&regId=${encodeURIComponent(data._id)}`;

    } catch (err) {
        console.error('Registration submission error:', err);
        if (globalError) {
            globalError.querySelector('span').textContent = err.message || 'An error occurred during registration. Please try again.';
            globalError.style.display = 'flex';
            globalError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Show error card if event ID is invalid
function showNotFoundState() {
    document.getElementById('registration-container').style.display = 'none';
    document.getElementById('event-not-found').style.display = 'block';
}