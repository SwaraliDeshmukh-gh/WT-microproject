/**
 * College Events - Admin Dashboard Logic
 * Modular prototype handling dataset rendering, calculations, and mobile UI toggles.
 * Structured for future compatibility with RESTful API endpoints.
 */

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('collegeEventAdmin');

    if (!token || !userJson) {
        window.location.href = '../login.html';
        return;
    }

    try {
        const user = JSON.parse(userJson);

        if (user.role !== 'admin') {
            window.location.href = '../index.html';
            return;
        }

        const profileNameEl = document.querySelector('.profile-name');
        if (profileNameEl && user.name) {
            profileNameEl.textContent = user.name;
        }
        
        // Populate the dynamic admin name in the new profile drawer
        const drawerNameEl = document.getElementById('drawer-admin-name');
        if (drawerNameEl && user.name) {
            drawerNameEl.textContent = user.name;
        }
    } catch (err) {
        console.error('Error parsing admin session:', err);
        window.location.href = '../login.html';
        return;
    }

    // Added #drawer-logout-btn to the existing logout selector
    const logoutBtns = document.querySelectorAll('.sidebar-logout-btn, .header-logout-btn, #drawer-logout-btn');

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            localStorage.removeItem('token');
            localStorage.removeItem('collegeEventAdmin');
            localStorage.removeItem('collegeEventUser');
            localStorage.removeItem('user');

            window.location.href = '../login.html';
        });
    });

    initDashboard();
});

/**
 * Main dashboard initialization
 */
async function initDashboard() {
    setupMobileSidebar();
    updateYear();
    setupProfileDrawer(); // Initialize the profile drawer functionality
    
    try {
        const dashboardData = await fetchDashboardData();
        renderStatistics(dashboardData.statistics);
        renderCategoryBreakdown(dashboardData.categoryStats);
        renderUpcomingEvents(dashboardData.upcomingEvents);
        renderRecentRegistrations(dashboardData.recentRegistrations);
    } catch (error) {
        console.error("Failed to initialize dashboard data", error);
        // Fallbacks rendered as zeros/empty states
        renderStatistics({
            totalEvents: 0,
            upcomingEvents: 0,
            totalRegistrations: 0,
            availableSeats: 0
        });
        renderCategoryBreakdown([]);
        renderUpcomingEvents([]);
        renderRecentRegistrations([]);
    }
}

/**
 * Fetch Data Repository
 * Retrieves real MongoDB data from API endpoints
 */
async function fetchDashboardData() {
    const token = localStorage.getItem('token');
    
    // Fetch Events and Registrations concurrently
    const [eventsRes, regsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/events`),
        fetch(`${API_BASE_URL}/api/registrations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
    ]);

    if (!eventsRes.ok) throw new Error('Failed to fetch events');
    if (!regsRes.ok) throw new Error('Failed to fetch registrations');

    const events = await eventsRes.json();
    const registrations = await regsRes.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Calculate Statistics
    let totalEvents = events.length;
    let upcomingEventsCount = 0;
    let totalAvailableSeats = 0;

    events.forEach(event => {
        const eventDate = new Date(event.date);
        
        // Count active/upcoming events
        if (eventDate >= today && event.status !== "Registration Closed") {
            upcomingEventsCount++;
        }
        
        // Sum available seats (preventing negative values)
        totalAvailableSeats += Math.max(0, event.availableSeats || 0);
    });

    // Count only confirmed registrations for the total stat
    const activeRegistrations = registrations.filter(r => r.status === 'Confirmed');
    const totalRegistrations = activeRegistrations.length;

    // 2. Registrations by Category
    const categoryCounts = {};
    activeRegistrations.forEach(reg => {
        // Handle potentially missing event populations gracefully
        if (reg.event && reg.event.categoryLabel) {
            const cat = reg.event.categoryLabel;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
    });

    const categoryStats = Object.keys(categoryCounts).map(cat => {
        const count = categoryCounts[cat];
        const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
        return { category: cat, count, percentage };
    });

    // Sort category stats by count descending
    categoryStats.sort((a, b) => b.count - a.count);

    // 3. Process Upcoming Events for the Table
    // Filter to events today or in the future
    const upcomingEvents = events.filter(e => new Date(e.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Map backend events to table structure
    const processedUpcomingEvents = upcomingEvents.map(evt => {
        // Calculate status
        let displayStatus = "Open";
        if (evt.status === "Registration Closed") {
            displayStatus = "Closed";
        } else if (evt.availableSeats <= 0) {
            displayStatus = "Full";
        } else if (evt.availableSeats <= Math.ceil(evt.totalSeats * 0.2)) {
            displayStatus = "Almost Full";
        }

        // Count actual confirmed registrations for this specific event
        const confirmedForEvent = registrations.filter(r => 
    r.event &&
    String(r.event._id) === String(evt._id) &&
    r.status === 'Confirmed'
).length;

        const options = { month: 'short', day: '2-digit', year: 'numeric' };
        const formattedDate = new Date(evt.date).toLocaleDateString('en-US', options);

        return {
            id: evt._id,
            name: evt.title,
            category: evt.categoryLabel || evt.category,
            date: formattedDate,
            venue: evt.venue,
            registrations: `${confirmedForEvent} / ${evt.totalSeats}`,
            status: displayStatus
        };
    });

    // 4. Process Recent Registrations for the Table
    // Sort all registrations by createdAt descending
    const recentRegs = [...registrations]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10); // Take top 10

    const processedRecentRegistrations = recentRegs.map(reg => {
        const options = { month: 'short', day: '2-digit', year: 'numeric' };
        const formattedDate = reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('en-US', options) : 'N/A';

        return {
            id: reg._id,
            studentName: reg.studentName || 'N/A',
            studentId: reg.studentId || 'N/A',
            event: reg.event ? reg.event.title : 'Unknown Event',
            date: formattedDate,
            status: reg.status
        };
    });

    return {
        statistics: {
            totalEvents,
            upcomingEvents: upcomingEventsCount,
            totalRegistrations,
            availableSeats: totalAvailableSeats
        },
        categoryStats,
        upcomingEvents: processedUpcomingEvents,
        recentRegistrations: processedRecentRegistrations
    };
}


/**
 * Renders statistic cards
 */
function renderStatistics(stats) {
    if (!stats) return;
    
    document.getElementById('stat-total-events').textContent = stats.totalEvents;
    document.getElementById('stat-upcoming-events').textContent = stats.upcomingEvents;
    document.getElementById('stat-total-registrations').textContent = stats.totalRegistrations;
    document.getElementById('stat-available-seats').textContent = stats.availableSeats;
}

/**
 * Renders visual category progress bars
 */
function renderCategoryBreakdown(categories) {
    const container = document.getElementById('category-stats-container');
    if (!container) return;
    
    if (!categories || categories.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: #64748b; padding: 1rem 0;">No registration data available.</p>';
        return;
    }

    container.innerHTML = categories.map(cat => `
        <div class="cat-stat-item">
            <div class="cat-stat-header">
                <span class="cat-stat-name">${escapeHTML(cat.category)}</span>
                <span class="cat-stat-count">${cat.count} (${cat.percentage}%)</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${cat.percentage}%;"></div>
            </div>
        </div>
    `).join('');
}

/**
 * Renders upcoming events table
 */
function renderUpcomingEvents(events) {
    const tbody = document.getElementById('upcoming-events-tbody');
    if (!tbody) return;

    if (!events || events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1rem;">No upcoming events found.</td></tr>';
        return;
    }

    tbody.innerHTML = events.map(event => {
        const statusClass = getStatusClass(event.status);
        return `
            <tr>
                <td><strong>${escapeHTML(event.name)}</strong></td>
                <td><span class="category-tag">${escapeHTML(event.category)}</span></td>
                <td>${escapeHTML(event.date)}</td>
                <td>${escapeHTML(event.venue)}</td>
                <td>${escapeHTML(event.registrations)}</td>
                <td><span class="status-badge ${statusClass}">${escapeHTML(event.status)}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * Renders recent registrations table
 */
function renderRecentRegistrations(registrations) {
    const tbody = document.getElementById('recent-registrations-tbody');
    if (!tbody) return;

    if (!registrations || registrations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1rem;">No recent registrations found.</td></tr>';
        return;
    }

    tbody.innerHTML = registrations.map(reg => {
        const statusClass = getStatusClass(reg.status);
        return `
            <tr>
                <td><strong>${escapeHTML(reg.studentName)}</strong></td>
                <td><code>${escapeHTML(reg.studentId)}</code></td>
                <td>${escapeHTML(reg.event)}</td>
                <td>${escapeHTML(reg.date)}</td>
                <td><span class="status-badge ${statusClass}">${escapeHTML(reg.status)}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * Helper to get CSS status classes
 */
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'open':
        case 'confirmed':
            return 'status-open';
        case 'almost full':
            return 'status-almost-full';
        case 'closed':
        case 'cancelled':
        case 'full':
            return 'status-closed';
        default:
            return '';
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
 * Mobile Sidebar Drawer Toggles
 */
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebar-toggle-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');

    if (openBtn && sidebar) {
        openBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
}

/**
 * Updates dynamic footer year
 */
function updateYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

/**
 * Helper to prevent XSS string injection
 */
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}