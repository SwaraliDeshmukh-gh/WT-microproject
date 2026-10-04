/**
 * College Events - About Page Logic
 * Fetches data from XML to populate the page dynamically.
 */

document.addEventListener('DOMContentLoaded', () => {
    initAboutPage();
});

function initAboutPage() {
    updateCopyrightYear();
    fetchXMLData();
}

/**
 * Ensures footer date matches current runtime year dynamically
 */
function updateCopyrightYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/**
 * Fetches the about.xml file and initiates data population
 */
async function fetchXMLData() {
    try {
        const response = await fetch('about.xml');
        if (!response.ok) {
            throw new Error(`Failed to load XML: ${response.statusText}`);
        }
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        populatePageContent(xmlDoc);

    } catch (error) {
        console.error('Error fetching or parsing XML data:', error);
    }
}

/**
 * Distributes XML parsing across specific sections
 */
function populatePageContent(xmlDoc) {
    populateHero(xmlDoc);
    populatePurpose(xmlDoc);
    populateExperiences(xmlDoc);
    populateConvenience(xmlDoc);
    populateQuote(xmlDoc);
    populateMemories(xmlDoc);
    populateCTA(xmlDoc);
}

function populateHero(xmlDoc) {
    const heroNode = xmlDoc.querySelector('hero');
    if (!heroNode) return;

    // Static text
    const badgeEl = document.getElementById('hero-badge');
    if (badgeEl) badgeEl.innerHTML = `<i class="${heroNode.querySelector('badgeIcon').textContent}"></i> ${heroNode.querySelector('badgeText').textContent}`;
    
    const titleEl = document.getElementById('hero-title');
    if (titleEl) titleEl.textContent = heroNode.querySelector('title').textContent;
    
    const taglineEl = document.getElementById('hero-tagline');
    if (taglineEl) taglineEl.textContent = heroNode.querySelector('tagline').textContent;
    
    const descEl = document.getElementById('hero-description');
    if (descEl) descEl.textContent = heroNode.querySelector('description').textContent;

    // Graphic cards
    const cardStack = document.getElementById('hero-card-stack');
    const cards = heroNode.querySelectorAll('cards > card');
    let stackHtml = '';
    
    cards.forEach(card => {
        const icon = card.querySelector('icon').textContent;
        const text = card.querySelector('text').textContent;
        const className = card.querySelector('class').textContent;
        stackHtml += `
            <div class="stack-card ${className}">
                <i class="${icon}"></i>
                <span>${text}</span>
            </div>
        `;
    });
    
    if (cardStack) cardStack.innerHTML = stackHtml;
}

function populatePurpose(xmlDoc) {
    const purposeNode = xmlDoc.querySelector('purpose');
    if (!purposeNode) return;

    const tagEl = document.getElementById('purpose-tag');
    if (tagEl) tagEl.textContent = purposeNode.querySelector('tag').textContent;

    const titleEl = document.getElementById('purpose-title');
    if (titleEl) titleEl.textContent = purposeNode.querySelector('title').textContent;

    // Paragraphs
    const paragraphsNode = document.getElementById('purpose-paragraphs');
    const paragraphs = purposeNode.querySelectorAll('paragraphs > paragraph');
    let pContent = '';
    
    paragraphs.forEach(p => {
        const isHighlight = p.getAttribute('highlight') === 'true';
        pContent += `<p${isHighlight ? ' class="highlight-text"' : ''}>${p.textContent}</p>`;
    });
    if (paragraphsNode) paragraphsNode.innerHTML = pContent;

    // Banner
    const bannerNode = document.getElementById('purpose-banner-inner');
    if (bannerNode) {
        const bannerIcon = purposeNode.querySelector('banner > icon').textContent;
        const bannerTitle = purposeNode.querySelector('banner > title').textContent;
        const bannerDesc = purposeNode.querySelector('banner > description').textContent;
        bannerNode.innerHTML = `
            <i class="${bannerIcon} banner-icon"></i>
            <h3>${bannerTitle}</h3>
            <p>${bannerDesc}</p>
        `;
    }
}

function populateExperiences(xmlDoc) {
    const expNode = xmlDoc.querySelector('experiences');
    if (!expNode) return;

    const tagEl = document.getElementById('exp-tag');
    if (tagEl) tagEl.textContent = expNode.querySelector('tag').textContent;

    const titleEl = document.getElementById('exp-title');
    if (titleEl) titleEl.textContent = expNode.querySelector('title').textContent;

    const subEl = document.getElementById('exp-subtitle');
    if (subEl) subEl.textContent = expNode.querySelector('subtitle').textContent;

    const gridEl = document.getElementById('experience-grid');
    const cards = expNode.querySelectorAll('cards > card');
    let gridHtml = '';

    cards.forEach(card => {
        const colorClass = card.querySelector('colorClass').textContent;
        const icon = card.querySelector('icon').textContent;
        const title = card.querySelector('title').textContent;
        const desc = card.querySelector('description').textContent;

        gridHtml += `
            <div class="exp-card">
                <div class="exp-icon-box ${colorClass}">
                    <i class="${icon}"></i>
                </div>
                <h3>${title}</h3>
                <p>${desc}</p>
            </div>
        `;
    });

    if (gridEl) {
        gridEl.innerHTML = gridHtml;
        // Re-attach card animations now that they exist in DOM
        setupCardAnimations();
    }
}

function populateConvenience(xmlDoc) {
    const convNode = xmlDoc.querySelector('convenience');
    if (!convNode) return;

    const tagEl = document.getElementById('conv-tag');
    if (tagEl) tagEl.textContent = convNode.querySelector('tag').textContent;

    const titleEl = document.getElementById('conv-title');
    if (titleEl) titleEl.textContent = convNode.querySelector('title').textContent;

    const descEl = document.getElementById('conv-desc');
    if (descEl) descEl.textContent = convNode.querySelector('description').textContent;

    const timelineEl = document.getElementById('convenience-timeline');
    const steps = convNode.querySelectorAll('steps > step');
    let timelineHtml = '';

    steps.forEach(step => {
        const num = step.querySelector('number').textContent;
        const title = step.querySelector('title').textContent;
        const desc = step.querySelector('description').textContent;

        timelineHtml += `
            <div class="timeline-step">
                <div class="step-num">${num}</div>
                <div class="step-content">
                    <h4>${title}</h4>
                    <p>${desc}</p>
                </div>
            </div>
        `;
    });

    if (timelineEl) timelineEl.innerHTML = timelineHtml;
}

function populateQuote(xmlDoc) {
    const quoteNode = xmlDoc.querySelector('quote');
    if (!quoteNode) return;

    const iconEl = document.getElementById('quote-icon');
    if (iconEl) iconEl.className = `${quoteNode.querySelector('icon').textContent} quote-icon`;

    const textEl = document.getElementById('quote-text');
    if (textEl) textEl.textContent = quoteNode.querySelector('text').textContent;

    const subEl = document.getElementById('quote-sub');
    if (subEl) subEl.textContent = quoteNode.querySelector('description').textContent;
}

function populateMemories(xmlDoc) {
    const memNode = xmlDoc.querySelector('memories');
    if (!memNode) return;

    const tagEl = document.getElementById('mem-tag');
    if (tagEl) tagEl.textContent = memNode.querySelector('tag').textContent;

    const titleEl = document.getElementById('mem-title');
    if (titleEl) titleEl.textContent = memNode.querySelector('title').textContent;

    const subEl = document.getElementById('mem-subtitle');
    if (subEl) subEl.textContent = memNode.querySelector('subtitle').textContent;

    const slidesContainer = document.getElementById('memories-slides-container');
    const indicatorsContainer = document.getElementById('slider-indicators');
    
    const slides = memNode.querySelectorAll('slides > slide');
    let slidesHtml = '';
    let indicatorsHtml = '';

    slides.forEach((slide, index) => {
        const num = slide.querySelector('number').textContent;
        const icon = slide.querySelector('icon').textContent;
        const title = slide.querySelector('title').textContent;
        const desc = slide.querySelector('description').textContent;
        
        const activeClass = index === 0 ? 'active' : '';

        slidesHtml += `
            <div class="memory-slide ${activeClass}" data-index="${index}">
                <div class="slide-bg-num">${num}</div>
                <div class="slide-content">
                    <div class="slide-icon"><i class="${icon}"></i></div>
                    <h3 class="slide-title font-heading">${title}</h3>
                    <p class="slide-text">${desc}</p>
                </div>
            </div>
        `;

        indicatorsHtml += `
            <button class="indicator-dot ${activeClass}" aria-label="Go to slide ${index + 1}" data-target="${index}"></button>
        `;
    });

    if (slidesContainer) slidesContainer.innerHTML = slidesHtml;
    if (indicatorsContainer) indicatorsContainer.innerHTML = indicatorsHtml;

    // Initialize the slider logic now that elements are rendered
    setupMemoriesSlider();
}

function populateCTA(xmlDoc) {
    const ctaNode = xmlDoc.querySelector('callToAction');
    if (!ctaNode) return;

    const titleEl = document.getElementById('cta-title');
    if (titleEl) titleEl.textContent = ctaNode.querySelector('title').textContent;

    const textEl = document.getElementById('cta-text');
    if (textEl) textEl.textContent = ctaNode.querySelector('description').textContent;

    const btnEl = document.getElementById('cta-button');
    if (btnEl) {
        btnEl.innerHTML = `${ctaNode.querySelector('buttonText').textContent} <i class="fa-solid fa-arrow-right"></i>`;
        btnEl.href = ctaNode.querySelector('buttonLink').textContent;
    }
}

/**
 * Adds a subtle hover tilt enhancement to experience cards
 */
function setupCardAnimations() {
    const expCards = document.querySelectorAll('.exp-card');
    
    expCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.25s ease, box-shadow 0.25s ease';
        });
    });
}

/**
 * Sets up the interactive moments slider
 */
function setupMemoriesSlider() {
    const slides = document.querySelectorAll('.memory-slide');
    const dots = document.querySelectorAll('.indicator-dot');
    const prevBtn = document.querySelector('.prev-arrow');
    const nextBtn = document.querySelector('.next-arrow');

    if (slides.length === 0) return;

    let currentIndex = 0;
    const totalSlides = slides.length;

    function goToSlide(index) {
        // Remove active class from all
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        // Set current index with looping logic
        if (index < 0) {
            currentIndex = totalSlides - 1;
        } else if (index >= totalSlides) {
            currentIndex = 0;
        } else {
            currentIndex = index;
        }

        // Add active class to new current slide
        slides[currentIndex].classList.add('active');
        dots[currentIndex].classList.add('active');
    }

    // Event Listeners for arrows
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            goToSlide(currentIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            goToSlide(currentIndex + 1);
        });
    }

    // Event Listeners for indicator dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
        });
    });
}