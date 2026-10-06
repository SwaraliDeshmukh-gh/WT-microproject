/**
 * Main Front-End JavaScript
 * Handles Navigation, Mobile Drawer, Scrolling Features, Scroll Animations,
 * Dynamic Logged-in User Profile Navbar Display, and Homepage Dynamic Data.
 */

document.addEventListener('DOMContentLoaded', () => {

    /* --------------------------------------------------
     * 1. Mobile Navigation Hamburger Menu Toggle
     * -------------------------------------------------- */
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            const isOpen = navMenu.classList.contains('active');
            
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Update ARIA expanded state for accessibility
            hamburger.setAttribute('aria-expanded', !isOpen);
            
            // Toggle body scrolling when menu is open
            document.body.style.overflow = isOpen ? 'auto' : 'hidden';
        });

        // Close menu when a navigation link is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = 'auto';
            });
        });
    }

    /* --------------------------------------------------
     * 2. Sticky Navbar Background Shift on Scroll
     * -------------------------------------------------- */
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    /* --------------------------------------------------
     * 3. Dynamic Footer Current Year
     * -------------------------------------------------- */
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    /* --------------------------------------------------
     * 4. Scroll Reveal Intersection Observer
     * -------------------------------------------------- */
    let revealObserver;
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    if ('IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Stop observing once animated into view
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        // Fallback for older browsers
        revealElements.forEach(el => el.classList.add('is-visible'));
    }

    /* --------------------------------------------------
     * 5. Dynamic Logged-in User Profile Navbar Display & Drawer
     * -------------------------------------------------- */
    const userJson = (localStorage.getItem('collegeEventUser') || sessionStorage.getItem('collegeEventUser'));
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            const loginNavItems = document.querySelectorAll('.btn-nav-login');

            loginNavItems.forEach(loginLink => {
                const navItemLi = loginLink.closest('.nav-item');
                if (navItemLi) {
                    navItemLi.innerHTML = '';

                    const userArea = document.createElement('div');
                    userArea.className = 'nav-user-area';

                    // Profile Toggle Button
                    const profileToggle = document.createElement('button');
                    profileToggle.type = 'button';
                    profileToggle.className = 'nav-profile-btn';
                    profileToggle.id = 'nav-profile-toggle';
                    profileToggle.setAttribute('aria-expanded', 'false');

                    let iconUser;
                    if (user.profilePhoto) {
                        iconUser = document.createElement('img');
                        iconUser.src = user.profilePhoto;
                        iconUser.alt = 'Profile';
                        iconUser.style.width = '20px';
                        iconUser.style.height = '20px';
                        iconUser.style.borderRadius = '50%';
                        iconUser.style.objectFit = 'cover';
                        iconUser.className = 'nav-avatar-img';
                    } else {
                        iconUser = document.createElement('i');
                        iconUser.className = 'fa-solid fa-user';
                    }

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = user.name || 'User';

                    profileToggle.appendChild(iconUser);
                    profileToggle.appendChild(nameSpan);

                    // Existing Navbar Logout Button
                    const navbarLogoutBtn = document.createElement('button');
                    navbarLogoutBtn.type = 'button';
                    navbarLogoutBtn.className = 'btn-nav-logout';
                    navbarLogoutBtn.id = 'btn-nav-logout';
                    navbarLogoutBtn.title = 'Logout';

                    const iconLogout = document.createElement('i');
                    iconLogout.className = 'fa-solid fa-right-from-bracket';

                    navbarLogoutBtn.appendChild(iconLogout);
                    navbarLogoutBtn.appendChild(document.createTextNode(' Logout'));

                    userArea.appendChild(profileToggle);
                    userArea.appendChild(navbarLogoutBtn);
                    navItemLi.appendChild(userArea);

                    // --- Create Slide-in Profile Drawer ---
                    const overlay = document.createElement('div');
                    overlay.className = 'profile-drawer-overlay';

                    const drawer = document.createElement('div');
                    drawer.className = 'profile-drawer';

                    // Drawer Header
                    const drawerHeader = document.createElement('div');
                    drawerHeader.className = 'profile-drawer-header';

                    const userInfo = document.createElement('div');
                    userInfo.className = 'drawer-user-info';

                    const dName = document.createElement('div');
                    dName.className = 'd-name';
                    dName.textContent = user.name || 'User';

                    const dRole = document.createElement('div');
                    dRole.className = 'd-role';
                    const roleText = user.role || 'Student';
                    dRole.textContent = roleText.charAt(0).toUpperCase() + roleText.slice(1);

                    const dEmail = document.createElement('div');
                    dEmail.className = 'd-email';
                    dEmail.textContent = user.email || '';

                    userInfo.appendChild(dName);
                    userInfo.appendChild(dRole);
                    userInfo.appendChild(dEmail);

                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'drawer-close-btn';
                    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    closeBtn.setAttribute('aria-label', 'Close profile menu');

                    const drawerAvatar = document.createElement('div');
                    drawerAvatar.className = 'drawer-avatar';
                    drawerAvatar.style.width = '48px';
                    drawerAvatar.style.height = '48px';
                    drawerAvatar.style.borderRadius = '50%';
                    drawerAvatar.style.marginRight = '15px';
                    drawerAvatar.style.display = 'flex';
                    drawerAvatar.style.alignItems = 'center';
                    drawerAvatar.style.justifyContent = 'center';
                    drawerAvatar.style.background = 'var(--color-bg-alt, #e2e8f0)';
                    drawerAvatar.style.color = 'var(--color-text-muted, #94a3b8)';
                    drawerAvatar.style.fontSize = '1.5rem';
                    drawerAvatar.style.overflow = 'hidden';
                    drawerAvatar.style.flexShrink = '0';

                    if (user.profilePhoto) {
                        drawerAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">`;
                    } else {
                        drawerAvatar.innerHTML = `<i class="fa-solid fa-user"></i>`;
                    }

                    // Wrap avatar and user info so they are grouped together on the left
                    const headerInfoGroup = document.createElement('div');
                    headerInfoGroup.style.display = 'flex';
                    headerInfoGroup.style.alignItems = 'center';
                    headerInfoGroup.appendChild(drawerAvatar);
                    headerInfoGroup.appendChild(userInfo);

                    drawerHeader.style.display = 'flex';
                    drawerHeader.style.justifyContent = 'space-between';
                    drawerHeader.style.alignItems = 'center';

                    drawerHeader.appendChild(headerInfoGroup);
                    drawerHeader.appendChild(closeBtn);

                    // Drawer Body & Links
                    const drawerBody = document.createElement('div');
                    drawerBody.className = 'profile-drawer-body';

                    const profileLink = document.createElement('a');
                    profileLink.className = 'profile-drawer-link';
                    profileLink.href = 'profile.html';
                    profileLink.innerHTML = '<i class="fa-solid fa-user"></i> <span>My Profile</span><i class="fa-solid fa-arrow-right ms-auto"></i>';

                    const settingsLink = document.createElement('a');
                    settingsLink.className = 'profile-drawer-link';
                    settingsLink.href = 'account-settings.html';
                    settingsLink.innerHTML = '<i class="fa-solid fa-gear"></i> <span>Account Settings</span><i class="fa-solid fa-arrow-right ms-auto"></i>';

                    const divider1 = document.createElement('div');
                    divider1.className = 'drawer-divider';
                    
                    const divider2 = document.createElement('div');
                    divider2.className = 'drawer-divider';

                    const drawerLogoutBtn = document.createElement('button');
                    drawerLogoutBtn.className = 'profile-drawer-link profile-drawer-logout';
                    drawerLogoutBtn.innerHTML = '<i class="fa-solid fa-door-open"></i> <span>Logout</span>';

                    drawerBody.appendChild(profileLink);
                    drawerBody.appendChild(settingsLink);
                    drawerBody.appendChild(divider1);
                    drawerBody.appendChild(drawerLogoutBtn);

                    drawer.appendChild(drawerHeader);
                    drawer.appendChild(divider2);
                    drawer.appendChild(drawerBody);

                    // Append Drawer and Overlay to the body
                    document.body.appendChild(overlay);
                    document.body.appendChild(drawer);

                    // --- Open & Close Logic ---
                    const openDrawer = () => {
                        overlay.classList.add('show');
                        drawer.classList.add('show');
                        document.body.style.overflow = 'hidden';
                        profileToggle.setAttribute('aria-expanded', 'true');
                    };

                    const closeDrawer = () => {
                        overlay.classList.remove('show');
                        drawer.classList.remove('show');
                        document.body.style.overflow = '';
                        profileToggle.setAttribute('aria-expanded', 'false');
                    };

                    // Toggle Button Click
                    profileToggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (drawer.classList.contains('show')) {
                            closeDrawer();
                        } else {
                            openDrawer();
                        }
                    });

                    // Close Listeners
                    closeBtn.addEventListener('click', closeDrawer);
                    overlay.addEventListener('click', closeDrawer);
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && drawer.classList.contains('show')) {
                            closeDrawer();
                        }
                    });

                    // --- Logout Functionality ---
                    const performLogout = (e) => {
                        e.preventDefault();
                        if (!confirm("Are you sure you want to logout?")) return;
                        localStorage.removeItem('token'); sessionStorage.removeItem('token');
                        localStorage.removeItem('collegeEventUser'); sessionStorage.removeItem('collegeEventUser');
                        window.location.href = 'login.html';
                    };

                    navbarLogoutBtn.addEventListener('click', performLogout);
                    drawerLogoutBtn.addEventListener('click', performLogout);
                }
            });
        } catch (err) {
            console.error('Error parsing collegeEventUser from localStorage:', err);
        }
    }

    /* --------------------------------------------------
     * 6. Fetch and Populate Homepage Dynamic Events
     * -------------------------------------------------- */
    const fetchUpcomingEvents = async () => {
        const eventsGrid = document.getElementById('upcoming-events-grid');
        const heroNextFestVal = document.getElementById('hero-next-fest-val');
        const heroLiveRegTitle = document.getElementById('hero-live-reg-title');
        const heroLiveRegCountContainer = document.getElementById('hero-live-reg-count-container');
        const heroLiveRegCount = document.getElementById('hero-live-reg-count');

        // Formatting date utility
        const formatDate = (dateString) => {
            const d = new Date(dateString);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/events`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const events = await response.json();

            // Filter for upcoming events (date is today or in the future)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const upcomingEvents = events.filter(event => new Date(event.date) >= today);
            
            // Sort ascending by date
            upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Populate Hero "Next Major Fest"
            if (heroNextFestVal) {
                if (upcomingEvents.length > 0) {
                    heroNextFestVal.textContent = upcomingEvents[0].title;
                } else {
                    heroNextFestVal.textContent = "No upcoming event";
                }
            }

            // Populate Hero "Live Registration"
            if (heroLiveRegTitle) {
                const liveEvent = upcomingEvents.find(ev => ev.status === "Registration Open");
                if (liveEvent) {
                    heroLiveRegTitle.textContent = liveEvent.title;
                    if (heroLiveRegCount) {
                        const registeredCount = Math.max(0, liveEvent.totalSeats - liveEvent.availableSeats);
                        heroLiveRegCount.textContent = `${registeredCount} Registered`;
                    }
                } else {
                    heroLiveRegTitle.textContent = "No active registration";
                    if (heroLiveRegCountContainer) {
                        heroLiveRegCountContainer.style.display = 'none';
                    }
                }
            }

            // Populate Upcoming Events Grid
            if (eventsGrid) {
                if (upcomingEvents.length === 0) {
                    eventsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-light); padding: 2rem;">No upcoming events at the moment.</p>';
                } else {
                    const topEvents = upcomingEvents.slice(0, 3);
                    eventsGrid.innerHTML = topEvents.map(event => `
                        <article class="event-card reveal-on-scroll">
                            <div class="card-image-wrapper">
                                <span class="category-badge">${event.categoryLabel}</span>
                                <img src="${event.image}" alt="${event.title}" class="event-img" onerror="this.parentNode.classList.add('no-image');">
                            </div>
                            <div class="card-body">
                                <h3 class="event-title">${event.title}</h3>
                                <div class="event-meta">
                                    <span><i class="fa-regular fa-calendar"></i> ${formatDate(event.date)}</span>
                                    <span><i class="fa-regular fa-clock"></i> ${event.time}</span>
                                    <span><i class="fa-solid fa-location-dot"></i> ${event.venue}</span>
                                </div>
                                <p class="event-desc">${event.description}</p>
                                <a href="event-details.html?id=${encodeURIComponent(event._id)}" class="btn-card-action">View Details <i class="fa-solid fa-arrow-right"></i></a>
                            </div>
                        </article>
                    `).join('');

                    // Re-apply intersection observer to dynamically injected elements
                    if (revealObserver) {
                        const newCards = eventsGrid.querySelectorAll('.reveal-on-scroll');
                        newCards.forEach(el => revealObserver.observe(el));
                    } else if (!('IntersectionObserver' in window)) {
                        const newCards = eventsGrid.querySelectorAll('.reveal-on-scroll');
                        newCards.forEach(el => el.classList.add('is-visible'));
                    }
                }
            }

        } catch (error) {
            console.error("Failed to fetch upcoming events:", error);
            
            if (eventsGrid) {
                eventsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--danger-color); padding: 2rem;">Unable to load upcoming events.</p>';
            }
            if (heroNextFestVal) heroNextFestVal.textContent = "No upcoming event";
            if (heroLiveRegTitle) heroLiveRegTitle.textContent = "No active registration";
            if (heroLiveRegCountContainer) heroLiveRegCountContainer.style.display = 'none';
        }
    };

    // Initialize fetching if we are on a page containing the upcoming events grid
    if (document.getElementById('upcoming-events-grid')) {
        fetchUpcomingEvents();
    }

});