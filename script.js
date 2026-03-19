/* ===============================================
   SACHDEVA GROUP - INTERACTIVE FUNCTIONALITY
   Premium Industrial Website - JavaScript
   =============================================== */

// ===============================================
// LOADING ANIMATION
// ===============================================

window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 2000);
});

// ===============================================
// STICKY NAVIGATION WITH SCROLL EFFECT
// ===============================================

const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    // Update active nav link based on scroll position
    let current = '';
    const sections = document.querySelectorAll('section');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// ===============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ===============================================

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        if (targetSection) {
            const offsetTop = targetSection.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ===============================================
// MOBILE MENU TOGGLE
// ===============================================

const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });
}

// ===============================================
// SCROLL ANIMATIONS - INTERSECTION OBSERVER
// ===============================================

const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -100px 0px'
};

const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe elements
const elementsToAnimate = document.querySelectorAll(
    '.about-content, .parallax-zoom, .timeline-item, .stat-item, .company-card, .news-card, .testimonial-card'
);

elementsToAnimate.forEach(el => animateOnScroll.observe(el));

// ===============================================
// TIMELINE SHIP ROUTE LINE ANIMATION
// ===============================================

const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const routeLine = document.querySelector('.ship-route-line');
            if (routeLine) {
                routeLine.classList.add('active');
            }
        }
    });
}, { threshold: 0.3 });

const timelineContainer = document.querySelector('.timeline-container');
if (timelineContainer) {
    timelineObserver.observe(timelineContainer);
}

// ===============================================
// ANIMATED COUNTERS
// ===============================================

const counters = document.querySelectorAll('.counter');
let countersStarted = false;

const startCounters = () => {
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };

        updateCounter();
    });
};

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !countersStarted) {
            countersStarted = true;
            startCounters();
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    counterObserver.observe(statsSection);
}

// ===============================================
// PARALLAX ZOOM EFFECT FOR IMAGES
// ===============================================

window.addEventListener('scroll', () => {
    const parallaxImages = document.querySelectorAll('.parallax-zoom img');
    parallaxImages.forEach(img => {
        const rect = img.getBoundingClientRect();
        const scrollPercent = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);

        if (scrollPercent > 0 && scrollPercent < 1) {
            const scale = 1 + (scrollPercent * 0.1);
            img.style.transform = `scale(${scale})`;
        }
    });
});

// ===============================================
// WATER RIPPLE EFFECT ON HOVER
// ===============================================

const createRipple = (event, element) => {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');

    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    element.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
};

// Add ripple effect to buttons
const buttons = document.querySelectorAll('.cta-button, .contact-button');
buttons.forEach(button => {
    button.addEventListener('click', (e) => {
        createRipple(e, button);
    });
});

// ===============================================
// TYPEWRITER EFFECT
// ===============================================

const typewriterElements = document.querySelectorAll('.typewriter');

typewriterElements.forEach((element, index) => {
    const text = element.textContent;
    element.textContent = '';
    element.style.opacity = '1';

    let charIndex = 0;
    const baseDelay = index * 2000; // Delay between lines

    setTimeout(() => {
        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                element.textContent += text.charAt(charIndex);
                charIndex++;
            } else {
                clearInterval(typeInterval);
                // Remove cursor after typing is complete
                setTimeout(() => {
                    element.style.borderRight = 'none';
                }, 500);
            }
        }, 100);
    }, baseDelay + 9000); // Start after ship animation
});

// ===============================================
// FLOATING PARTICLE EFFECT
// ===============================================

const createParticles = () => {
    const particleContainer = document.querySelector('.stats-section');
    if (!particleContainer) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(200, 164, 61, 0.5);
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: floatParticle ${5 + Math.random() * 10}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        particleContainer.appendChild(particle);
    }
};

// Add particle animation CSS dynamically
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    @keyframes floatParticle {
        0%, 100% {
            transform: translate(0, 0);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
            opacity: 0;
        }
    }

    .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(200, 164, 61, 0.6);
        width: 20px;
        height: 20px;
        transform: translate(-50%, -50%);
        animation: rippleAnimation 0.6s ease-out;
        pointer-events: none;
    }

    @keyframes rippleAnimation {
        to {
            transform: translate(-50%, -50%) scale(10);
            opacity: 0;
        }
    }

    @media (max-width: 768px) {
        .nav-menu.active {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            background: var(--navy-blue);
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .mobile-menu-toggle.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }

        .mobile-menu-toggle.active span:nth-child(2) {
            opacity: 0;
        }

        .mobile-menu-toggle.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    }
`;
document.head.appendChild(particleStyle);

// Initialize particles
createParticles();

// ===============================================
// SHIP ANIMATION COMPLETION HANDLER
// ===============================================

const shipAnimation = document.querySelector('.ship-animation');
if (shipAnimation) {
    setTimeout(() => {
        shipAnimation.style.opacity = '0.1';
        shipAnimation.style.transform = 'translate(-50%, -50%) scale(0.5)';
    }, 8000);
}

// ===============================================
// ENHANCED HOVER EFFECTS FOR CARDS
// ===============================================

const newsCards = document.querySelectorAll('.news-card');
newsCards.forEach(card => {
    card.addEventListener('mouseenter', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// ===============================================
// GOLD SHIMMER EFFECT ON BUTTONS
// ===============================================

const addShimmerEffect = () => {
    const shimmerStyle = document.createElement('style');
    shimmerStyle.textContent = `
        .cta-button::after,
        .contact-button::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(
                45deg,
                transparent,
                rgba(255, 255, 255, 0.3),
                transparent
            );
            transform: rotate(45deg);
            animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
            0% {
                transform: translateX(-100%) rotate(45deg);
            }
            100% {
                transform: translateX(100%) rotate(45deg);
            }
        }
    `;
    document.head.appendChild(shimmerStyle);
};

addShimmerEffect();

// ===============================================
// PERFORMANCE OPTIMIZATION - DEBOUNCE SCROLL
// ===============================================

let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
    }

    scrollTimeout = window.requestAnimationFrame(() => {
        // Scroll-based animations handled here
    });
}, { passive: true });

// ===============================================
// PAGE TRANSITION EFFECTS
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// ===============================================
// ACCESSIBILITY ENHANCEMENTS
// ===============================================

// Add keyboard navigation support
const focusableElements = document.querySelectorAll(
    'a, button, input, [tabindex]:not([tabindex="-1"])'
);

focusableElements.forEach(element => {
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            element.click();
        }
    });
});

// ===============================================
// LAZY LOADING FOR IMAGES
// ===============================================

const lazyImages = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
        }
    });
});

lazyImages.forEach(img => imageObserver.observe(img));

// ===============================================
// CONSOLE BRANDING
// ===============================================

console.log('%cðŸš¢ Sachdeva Group', 'font-size: 24px; font-weight: bold; color: #C8A43D;');
console.log('%cLeading the way in sustainable ship recycling since 1983', 'font-size: 14px; color: #5E6A71;');
console.log('%câš“ Website developed with excellence', 'font-size: 12px; color: #0A1F33;');

// ===============================================
// DYNAMIC YEAR UPDATE FOR COPYRIGHT
// ===============================================

const currentYear = new Date().getFullYear();
const copyrightText = document.querySelector('.footer-bottom p');
if (copyrightText) {
    copyrightText.innerHTML = copyrightText.innerHTML.replace('2026', currentYear);
}

// ===============================================
// SCROLL TO TOP FUNCTIONALITY
// ===============================================

const createScrollToTop = () => {
    const scrollBtn = document.createElement('button');
    scrollBtn.innerHTML = 'â†‘';
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: var(--gold-accent);
        color: var(--navy-blue);
        border: none;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 999;
        box-shadow: 0 5px 20px rgba(200, 164, 61, 0.4);
    `;

    document.body.appendChild(scrollBtn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollBtn.style.opacity = '1';
            scrollBtn.style.visibility = 'visible';
        } else {
            scrollBtn.style.opacity = '0';
            scrollBtn.style.visibility = 'hidden';
        }
    });

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
};

createScrollToTop();

// ===============================================
// ENHANCED TIMELINE ANIMATION
// ===============================================

const timelineItems = document.querySelectorAll('.timeline-item');
let timelineItemIndex = 0;

const timelineDetailObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, timelineItemIndex * 200);
            timelineItemIndex++;
        }
    });
}, { threshold: 0.3 });

timelineItems.forEach(item => timelineDetailObserver.observe(item));

// ===============================================
// TESTIMONIALS CAROUSEL
// ===============================================

let currentTestimonial = 0;
const testimonialTrack = document.querySelector('.testimonials-track');
const testimonialCards = document.querySelectorAll('.testimonial-card');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.querySelector('.testimonial-nav.prev');
const nextBtn = document.querySelector('.testimonial-nav.next');

const updateTestimonials = (index) => {
    if (!testimonialTrack) return;

    currentTestimonial = index;

    // Update track position
    testimonialTrack.style.transform = `translateX(-${currentTestimonial * 100}%)`;

    // Update dots
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentTestimonial);
    });

    // Update card visibility
    testimonialCards.forEach((card, i) => {
        if (i === currentTestimonial) {
            setTimeout(() => {
                card.classList.add('visible');
            }, 300);
        } else {
            card.classList.remove('visible');
        }
    });
};

// Navigation buttons
if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        const newIndex = currentTestimonial === 0 ? testimonialCards.length - 1 : currentTestimonial - 1;
        updateTestimonials(newIndex);
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const newIndex = currentTestimonial === testimonialCards.length - 1 ? 0 : currentTestimonial + 1;
        updateTestimonials(newIndex);
    });
}

// Dots navigation
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        updateTestimonials(index);
    });
});

// Auto-advance testimonials
let testimonialInterval = setInterval(() => {
    const newIndex = currentTestimonial === testimonialCards.length - 1 ? 0 : currentTestimonial + 1;
    updateTestimonials(newIndex);
}, 6000);

// Pause auto-advance on hover
const testimonialsSection = document.querySelector('.testimonials-section');
if (testimonialsSection) {
    testimonialsSection.addEventListener('mouseenter', () => {
        clearInterval(testimonialInterval);
    });

    testimonialsSection.addEventListener('mouseleave', () => {
        testimonialInterval = setInterval(() => {
            const newIndex = currentTestimonial === testimonialCards.length - 1 ? 0 : currentTestimonial + 1;
            updateTestimonials(newIndex);
        }, 6000);
    });
}

// Initialize first testimonial
if (testimonialCards.length > 0) {
    testimonialCards[0].classList.add('visible');
}

// Touch/Swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

if (testimonialTrack) {
    testimonialTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    testimonialTrack.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

const handleSwipe = () => {
    if (touchEndX < touchStartX - 50) {
        // Swipe left - next
        const newIndex = currentTestimonial === testimonialCards.length - 1 ? 0 : currentTestimonial + 1;
        updateTestimonials(newIndex);
    }
    if (touchEndX > touchStartX + 50) {
        // Swipe right - prev
        const newIndex = currentTestimonial === 0 ? testimonialCards.length - 1 : currentTestimonial - 1;
        updateTestimonials(newIndex);
    }
};

// ===============================================
// ENHANCED FOOTER ANIMATIONS
// ===============================================

// Newsletter Form Submission
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('.newsletter-input-enhanced');
        const submitBtn = newsletterForm.querySelector('.newsletter-btn-enhanced');

        // Animate button
        submitBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            submitBtn.style.transform = 'scale(1)';
        }, 200);

        // Show success message (you can replace this with actual API call)
        const email = emailInput.value;
        if (email) {
            emailInput.value = '';
            emailInput.placeholder = 'Thank you for subscribing!';
            setTimeout(() => {
                emailInput.placeholder = 'Enter your email';
            }, 3000);
        }
    });
}

// Animate footer particles
const createFooterParticles = () => {
    const particlesContainer = document.querySelector('.footer-particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: rgba(200, 164, 61, ${Math.random() * 0.3 + 0.2});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: floatParticle ${Math.random() * 10 + 10}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        particlesContainer.appendChild(particle);
    }
};

createFooterParticles();

// Update footer year dynamically
const footerYear = document.getElementById('footerYear');
if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
}

// Smooth reveal animation on scroll
const footerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

const footerElements = document.querySelectorAll('.footer-col-enhanced');
footerElements.forEach(el => footerObserver.observe(el));

// Social icon ripple effect
const socialLinks = document.querySelectorAll('.social-link');
socialLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        // Create ripple effect
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            transform: scale(0);
            animation: rippleEffect 0.6s ease-out;
            pointer-events: none;
        `;
        link.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

console.log('âœ… Sachdeva Group website loaded successfully!');