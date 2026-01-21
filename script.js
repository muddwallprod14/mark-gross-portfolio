// === Loading Screen ===
window.addEventListener('load', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        document.body.classList.add('loaded');
        initScrollReveal();
    }, 800);
});

// === Scroll Reveal Animation ===
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.case-study, .skill-category, .detail-block, .section-header');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-reveal', 'revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    revealElements.forEach(el => {
        el.classList.add('scroll-reveal');
        revealObserver.observe(el);
    });
}

// === Stats Counter Animation ===
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateCounter(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => counterObserver.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    const duration = 2000;
    const start = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out expo
        const eased = 1 - Math.pow(2, -10 * progress);
        const current = Math.round(eased * target);
        
        // Add + suffix for large numbers
        if (target >= 1000) {
            element.textContent = current.toLocaleString() + '+';
        } else {
            element.textContent = current + '+';
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// === Dashboard Stat Animation ===
const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            if (entry.target.classList.contains('stat-value')) {
                animateStatValue(entry.target);
            }
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.stat-value').forEach(el => {
    statObserver.observe(el);
});

function animateStatValue(element) {
    const target = parseInt(element.dataset.count);
    if (!target || element.classList.contains('counted')) return;
    
    element.classList.add('counted');
    const duration = 1500;
    const start = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(eased * target);
        
        element.textContent = current + (element.dataset.count === '98' ? '%' : '');
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// === Smooth Scroll for Nav Links ===
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// === Navbar Background on Scroll ===
const navbar = document.querySelector('.navbar');
const heroBackground = document.querySelector('.hero-background');
const heroSection = document.querySelector('.hero');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    const heroHeight = heroSection ? heroSection.offsetHeight : 600;
    
    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Switch to video background when past hero
    if (heroBackground) {
        if (currentScroll > heroHeight * 0.7) {
            heroBackground.classList.add('show-video');
        } else {
            heroBackground.classList.remove('show-video');
        }
    }
    
    // Back to Top button visibility
    const backToTop = document.getElementById('backToTop');
    if (currentScroll > 500) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
});

// === Back to Top Button ===
document.getElementById('backToTop')?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// === Parallax Effect for Floating Cards ===
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.floating-card');
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    cards.forEach((card, index) => {
        const factor = (index + 1) * 8;
        const x = mouseX * factor;
        const y = mouseY * factor;
        card.style.transform = `translate(${x}px, ${y}px)`;
    });
});

// === Project Nav Active State ===
const projectNavItems = document.querySelectorAll('.project-nav-item');
const caseStudies = document.querySelectorAll('.case-study');

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            projectNavItems.forEach(item => {
                if (item.getAttribute('href') === `#${id}`) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    });
}, { threshold: 0.3 });

caseStudies.forEach(study => {
    if (study.id) navObserver.observe(study);
});

// === Chart Bar Animation ===
const chartBars = document.querySelectorAll('.bar');
chartBars.forEach((bar, index) => {
    bar.style.animationDelay = `${index * 0.1}s`;
});

// === Initialize ===
document.addEventListener('DOMContentLoaded', () => {
    animateCounters();
    
    // Trigger counter animation for visible elements
    document.querySelectorAll('.stat-value').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
            animateStatValue(el);
        }
    });
});
