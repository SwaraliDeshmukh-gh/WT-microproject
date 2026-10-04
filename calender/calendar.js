/**
 * College Events - Event Calendar Logic
 * Generates an interactive monthly calendar with event mapping, dynamic filtering, and panel view.
 */

// Shared Sample Events Dataset
const eventsDataset = [
    {
        id: "evt-101",
        title: "Web Development Workshop",
        category: "workshops",
        categoryLabel: "Workshop",
        date: "2026-09-20",
        formattedDate: "20 September 2026",
        time: "10:00 AM",
        venue: "Seminar Hall"
    },
    {
        id: "evt-102",
        title: "Inter-College Hackathon",
        category: "technical",
        categoryLabel: "Technical",
        date: "2026-09-25",
        formattedDate: "25 September 2026",
        time: "9:00 AM",
        venue: "Innovation Lab"
    },
    {
        id: "evt-103",
        title: "Cultural Fest 2026",
        category: "cultural",
        categoryLabel: "Cultural",
        date: "2026-09-30",
        formattedDate: "30 September 2026",
        time: "11:00 AM",
        venue: "College Auditorium"
    },
    {
        id: "evt-104",
        title: "Inter-Department Cricket Tournament",
        category: "sports",
        categoryLabel: "Sports",
        date: "2026-10-03",
        formattedDate: "3 October 2026",
        time: "8:00 AM",
        venue: "College Ground"
    },
    {
        id: "evt-105",
        title: "Coding Competition",
        category: "competitions",
        categoryLabel: "Competitions",
        date: "2026-10-07",
        formattedDate: "7 October 2026",
        time: "10:00 AM",
        venue: "Computer Laboratory"
    },
    {
        id: "evt-106",
        title: "Career Guidance Seminar",
        category: "seminars",
        categoryLabel: "Seminars",
        date: "2026-10-12",
        formattedDate: "12 October 2026",
        time: "2:00 PM",
        venue: "Seminar Hall"
    }
];

// State variables
let currentDate = new Date(2026, 8, 1); // Defaults to September 2026 matching sample data
let selectedCategory = 'all';
let selectedDateStr = '2026-09-20'; // Default selected day

document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
});

/**
 * Initializes calendar logic, triggers renders, and attaches listeners.
 */
function initCalendar() {
    renderCalendar();
    renderDatePanel(selectedDateStr);
    renderUpcomingEvents();
    setupControls();
    setupCategoryFilters();
}

/**
 * Renders the month/year grid cells dynamically.
 */
function renderCalendar() {
    const monthYearTitle = document.getElementById('current-month-year');
    const calendarDays = document.getElementById('calendar-days');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Month Names Array
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    monthYearTitle.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and total days
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    calendarDays.innerHTML = '';

    // Render Previous Month Days (Grayed out)
    for (let x = firstDayIndex; x > 0; x--) {
        const prevDay = prevMonthDays - x + 1;
        const cell = document.createElement('div');
        cell.className = 'day-cell other-month';
        cell.innerHTML = `<span class="day-number">${prevDay}</span>`;
        calendarDays.appendChild(cell);
    }

    // Today's Real Date String
    const today = new Date();
    const todayStr = formatDateISO(today.getFullYear(), today.getMonth() + 1, today.getDate());

    // Render Current Month Days
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dateStr = formatDateISO(year, month + 1, day);
        const cell = document.createElement('div');
        cell.className = 'day-cell';

        if (dateStr === todayStr) cell.classList.add('today');
        if (dateStr === selectedDateStr) cell.classList.add('selected-day');

        // Number Label
        const numElem = document.createElement('span');
        numElem.className = 'day-number';
        numElem.textContent = day;
        cell.appendChild(numElem);

        // Filter and add events matching this cell date
        const dayEvents = getFilteredEvents().filter(e => e.date === dateStr);
        if (dayEvents.length > 0) {
            const container = document.createElement('div');
            container.className = 'cell-events-container';

            dayEvents.forEach(evt => {
                const pill = document.createElement('a');
                pill.href = `event-details.html?id=${evt.id}`;
                pill.className = `event-pill cat-${evt.category}`;
                pill.textContent = evt.title;
                pill.title = `${evt.title} (${evt.time})`;
                
                // Prevent cell click from triggering when pill link is clicked
                pill.addEventListener('click', (e) => e.stopPropagation());
                container.appendChild(pill);
            });

            cell.appendChild(container);
        }

        // Cell Click Handler
        cell.addEventListener('click', () => {
            document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected-day'));
            cell.classList.add('selected-day');
            selectedDateStr = dateStr;
            renderDatePanel(dateStr);
        });

        calendarDays.appendChild(cell);
    }
}

/**
 * Renders the selected date overview side panel.
 */
function renderDatePanel(dateStr) {
    const panelDateDisplay = document.getElementById('selected-date-display');
    const panelEventsList = document.getElementById('selected-date-events');

    const dayEvents = getFilteredEvents().filter(e => e.date === dateStr);
    
    // Format label for panel header
    const parsedDate = new Date(dateStr + 'T00:00:00');
    const formatted = isNaN(parsedDate.getTime()) 
        ? dateStr 
        : parsedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    panelDateDisplay.textContent = formatted;
    panelEventsList.innerHTML = '';

    if (dayEvents.length === 0) {
        panelEventsList.innerHTML = `
            <div class="empty-panel">
                <i class="fa-regular fa-calendar-xmark"></i>
                <p>No events scheduled for this date.</p>
            </div>
        `;
        return;
    }

    dayEvents.forEach(evt => {
        const card = document.createElement('div');
        card.className = 'panel-event-card';
        card.innerHTML = `
            <div class="panel-event-title">${escapeHTML(evt.title)}</div>
            <div class="panel-meta">
                <div><i class="fa-solid fa-tag"></i> ${escapeHTML(evt.categoryLabel || evt.category)}</div>
                <div><i class="fa-regular fa-clock"></i> ${escapeHTML(evt.time)}</div>
                <div><i class="fa-solid fa-location-dot"></i> ${escapeHTML(evt.venue)}</div>
            </div>
            <a href="event-details.html?id=${evt.id}" class="btn btn-outline">
                View Details <i class="fa-solid fa-arrow-right"></i>
            </a>
        `;
        panelEventsList.appendChild(card);
    });
}

/**
 * Renders the upcoming events cards below the calendar.
 */
function renderUpcomingEvents() {
    const upcomingGrid = document.getElementById('upcoming-events-grid');
    const filtered = getFilteredEvents();

    if (filtered.length === 0) {
        upcomingGrid.innerHTML = '<p class="text-muted">No upcoming events available for this category.</p>';
        return;
    }

    // Display first 3-4 upcoming events
    upcomingGrid.innerHTML = filtered.slice(0, 3).map(evt => `
        <div class="upcoming-card">
            <div>
                <span class="badge-category">${escapeHTML(evt.categoryLabel || evt.category)}</span>
                <h3 class="upcoming-title font-heading" style="margin-top: 0.5rem;">${escapeHTML(evt.title)}</h3>
                <div class="panel-meta" style="margin-top: 0.5rem;">
                    <div><i class="fa-regular fa-calendar"></i> ${escapeHTML(evt.formattedDate)}</div>
                    <div><i class="fa-regular fa-clock"></i> ${escapeHTML(evt.time)}</div>
                </div>
            </div>
            <a href="event-details.html?id=${evt.id}" class="btn btn-outline">View Details</a>
        </div>
    `).join('');
}

/**
 * Navigational button controls.
 */
function setupControls() {
    document.getElementById('btn-prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('btn-today').addEventListener('click', () => {
        const today = new Date();
        currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        selectedDateStr = formatDateISO(today.getFullYear(), today.getMonth() + 1, today.getDate());
        renderCalendar();
        renderDatePanel(selectedDateStr);
    });
}

/**
 * Category Filter event listeners.
 */
function setupCategoryFilters() {
    const filterBtns = document.querySelectorAll('#category-filters .btn-filter');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            selectedCategory = e.currentTarget.getAttribute('data-category');
            renderCalendar();
            renderDatePanel(selectedDateStr);
            renderUpcomingEvents();
        });
    });
}

/**
 * Returns filtered dataset based on current active category.
 */
function getFilteredEvents() {
    if (selectedCategory === 'all') return eventsDataset;
    return eventsDataset.filter(e => e.category.toLowerCase() === selectedCategory.toLowerCase());
}

/**
 * Utility: Returns YYYY-MM-DD formatted string with zero padding.
 */
function formatDateISO(year, month, day) {
    const m = month < 10 ? `0${month}` : month;
    const d = day < 10 ? `0${day}` : day;
    return `${year}-${m}-${d}`;
}

/**
 * Utility: Escape HTML string to prevent XSS.
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