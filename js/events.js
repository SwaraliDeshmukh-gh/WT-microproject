/**
 * College Events - Events Page Logic
 * Configured to fetch data from backend API.
 */

let eventsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('http://localhost:8000/api/events');
        if (!response.ok) throw new Error('Failed to fetch events from server');
        const data = await response.json();

        eventsData = data.map(event => {
            const d = new Date(event.date);
            const formattedDate = isNaN(d) ? '' : d.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            return {
                ...event,
                formattedDate,
                createdAt: event.createdAt || event.date
            };
        });
    } catch (error) {
        console.error('Error loading events:', error);
        eventsData = [];
    }
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const categorySelect = document.getElementById('category-filter');
    const dateSelect = document.getElementById('date-filter');
    const sortSelect = document.getElementById('sort-filter');
    const resetBtn = document.getElementById('reset-filters');
    const noEventsResetBtn = document.getElementById('no-events-reset');

    // Filter by category URL parameters if passed from Index page
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        categorySelect.value = categoryParam.toLowerCase();
    }

    applyFiltersAndRender();

    // Event listeners
    searchInput.addEventListener('input', () => {
        toggleClearButton();
        applyFiltersAndRender();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        toggleClearButton();
        applyFiltersAndRender();
    });

    categorySelect.addEventListener('change', applyFiltersAndRender);
    dateSelect.addEventListener('change', applyFiltersAndRender);
    sortSelect.addEventListener('change', applyFiltersAndRender);

    resetBtn.addEventListener('click', resetAllFilters);
    if (noEventsResetBtn) {
        noEventsResetBtn.addEventListener('click', resetAllFilters);
    }

    function toggleClearButton() {
        clearSearchBtn.style.display = searchInput.value.trim().length > 0 ? 'block' : 'none';
    }

    function resetAllFilters() {
        searchInput.value = '';
        categorySelect.value = 'all';
        dateSelect.value = 'all';
        sortSelect.value = 'date-asc';
        toggleClearButton();
        
        if (window.history.pushState) {
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({path: newUrl}, '', newUrl);
        }

        applyFiltersAndRender();
    }
});

function applyFiltersAndRender() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const selectedCategory = document.getElementById('category-filter').value;
    const selectedDatePeriod = document.getElementById('date-filter').value;
    const selectedSort = document.getElementById('sort-filter').value;

    const currentDate = new Date();

    let filtered = eventsData.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm) ||
                              event.description.toLowerCase().includes(searchTerm) ||
                              event.venue.toLowerCase().includes(searchTerm);

        // Normalized case-insensitive category matching
        const matchesCategory = selectedCategory === 'all' || 
                                (event.category && event.category.toLowerCase() === selectedCategory.toLowerCase());

        let matchesDate = true;
        const eventDate = new Date(event.date);

        if (selectedDatePeriod === 'today') {
            matchesDate = eventDate.toDateString() === currentDate.toDateString();
        } else if (selectedDatePeriod === 'week') {
            const nextWeek = new Date(currentDate);
            nextWeek.setDate(currentDate.getDate() + 7);
            matchesDate = eventDate >= currentDate && eventDate <= nextWeek;
        } else if (selectedDatePeriod === 'month') {
            matchesDate = eventDate.getMonth() === currentDate.getMonth() &&
                          eventDate.getFullYear() === currentDate.getFullYear();
        }

        return matchesSearch && matchesCategory && matchesDate;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (selectedSort === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else if (selectedSort === 'latest') {
            return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (selectedSort === 'title-asc') {
            return a.title.localeCompare(b.title);
        }
        return 0;
    });

    renderEventCards(filtered);
    updateResultsCount(filtered.length);
}

function renderEventCards(events) {
    const grid = document.getElementById('events-grid');
    const noEventsContainer = document.getElementById('no-events');

    grid.innerHTML = '';

    if (events.length === 0) {
        grid.style.display = 'none';
        noEventsContainer.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    noEventsContainer.style.display = 'none';

    events.forEach(event => {
        const cardHtml = `
            <article class="event-card">
                <div class="card-image-wrapper">
                    <span class="category-badge">${escapeHtml(event.categoryLabel)}</span>
                    <span class="status-badge ${getStatusBadgeClass(event.status)}">${escapeHtml(event.status)}</span>
                    <img src="${escapeHtml(event.image)}" alt="${escapeHtml(event.title)}" class="event-img" onerror="this.parentNode.classList.add('no-image');">
                </div>
                <div class="card-body">
                    <h3 class="event-title">${escapeHtml(event.title)}</h3>
                    <div class="event-meta">
                        <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(event.formattedDate)}</span>
                        <span><i class="fa-regular fa-clock"></i> ${escapeHtml(event.time)}</span>
                        <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.venue)}</span>
                    </div>
                    <p class="event-desc">${escapeHtml(event.description)}</p>
                    <div class="seats-info">
                        <i class="fa-solid fa-chair"></i>
                        <span>${event.availableSeats > 0 ? `${event.availableSeats} seats remaining` : 'No seats remaining'}</span>
                    </div>
                    <button class="btn-card-action" onclick="navigateToDetails('${event._id}')" style="background: none; border: none; cursor: pointer; padding: 0; font: inherit;">
                        View Details <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </article>
        `;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
}

function getStatusBadgeClass(status) {
    if (status === 'Registration Open') return 'status-open';
    if (status === 'Almost Full') return 'status-almost';
    return 'status-closed';
}

function updateResultsCount(count) {
    const resultsCountEl = document.getElementById('results-count');
    resultsCountEl.textContent = `Showing ${count} event${count === 1 ? '' : 's'}`;
}

function navigateToDetails(eventId) {
    window.location.href = `event-details.html?id=${eventId}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}