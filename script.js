// === Intersection Observer for Animations ===
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Animate stat counters when visible
            if (entry.target.classList.contains('stat-value')) {
                animateCounter(entry.target);
            }
        }
    });
}, observerOptions);

// Observe all case studies and stat values
document.querySelectorAll('.case-study, .stat-value').forEach(el => {
    observer.observe(el);
});

// === Counter Animation ===
function animateCounter(element) {
    const target = parseInt(element.dataset.count);
    if (!target || element.classList.contains('counted')) return;
    
    element.classList.add('counted');
    const duration = 1500;
    const start = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quart
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
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// === Parallax Effect for Floating Cards ===
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.floating-card');
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    cards.forEach((card, index) => {
        const factor = (index + 1) * 5;
        const x = mouseX * factor;
        const y = mouseY * factor;
        card.style.transform = `translate(${x}px, ${y}px)`;
    });
});

// === Chart Bar Animation ===
const chartBars = document.querySelectorAll('.bar');
chartBars.forEach((bar, index) => {
    bar.style.animationDelay = `${index * 0.1}s`;
});

// === Code Syntax Highlighting Enhancement ===
// Already handled in HTML with span classes

// === Add subtle hover effects to tech tags ===
document.querySelectorAll('.tech-tags span').forEach(tag => {
    tag.addEventListener('mouseenter', () => {
        tag.style.borderColor = 'var(--accent-primary)';
        tag.style.color = 'var(--accent-primary)';
    });
    
    tag.addEventListener('mouseleave', () => {
        tag.style.borderColor = 'var(--border)';
        tag.style.color = 'var(--text-secondary)';
    });
});

// === Initialize ===
document.addEventListener('DOMContentLoaded', () => {
    // Add loaded class for any initial animations
    document.body.classList.add('loaded');
    
    // Trigger counter animation for visible elements
    document.querySelectorAll('.stat-value').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
            animateCounter(el);
        }
    });
});
