// Void Mode Toggle - Existential UI Element
document.addEventListener('DOMContentLoaded', () => {
    // Create void toggle button
    const voidToggle = document.createElement('button');
    voidToggle.className = 'void-toggle';
    voidToggle.innerHTML = '<i class="fas fa-moon"></i>';
    voidToggle.title = 'Toggle Void Mode';
    document.body.appendChild(voidToggle);

    // Check for saved preference
    if (localStorage.getItem('voidMode') === 'true') {
        document.body.classList.add('void-mode');
        voidToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    voidToggle.addEventListener('click', () => {
        document.body.classList.toggle('void-mode');
        const isVoid = document.body.classList.contains('void-mode');

        if (isVoid) {
            voidToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('voidMode', 'true');
        } else {
            voidToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('voidMode', 'false');
        }
    });

    // Existential console messages
    const messages = [
        "🌌 Welcome to the void of complexity.",
        "💭 In chaos, we find patterns. In patterns, we find meaning.",
        "🎭 The simulation is running. Are you observing or participating?",
        "🔮 Every click creates ripples in the network of causality.",
        "⚡ Free will is an emergent property of deterministic chaos.",
        "🧠 You are a node in an infinite network of consciousness.",
        "🌀 Complexity arises from simple rules iterated infinitely.",
        "📊 Your behavior is data. Your data is behavior.",
        "🎲 Randomness is just determinism we haven't decoded yet.",
        "🌐 The personal is political. The political is computational."
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    console.log(`%c${randomMessage}`, 'color: #0369a1; font-size: 14px; font-weight: bold;');
    console.log('%cInterested in the code? Check out the repository: https://github.com/ahnafarnab', 'color: #64748b; font-size: 12px;');

    // Easter egg: Konami code for special message
    let konamiCode = [];
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.key);
        konamiCode = konamiCode.slice(-10);

        if (konamiCode.join(',') === konamiSequence.join(',')) {
            console.log('%c🎮 KONAMI CODE ACTIVATED!', 'color: #f59e0b; font-size: 20px; font-weight: bold;');
            console.log('%c"The greatest trick complexity ever pulled was convincing the world it didn\'t exist." - A.T.', 'color: #0369a1; font-size: 14px; font-style: italic;');

            // Add a subtle visual effect
            document.body.style.animation = 'fadeIn 0.5s ease-out';
        }
    });

    // Animated counters for impact section
    const animateCounter = (element, target, duration = 2000) => {
        const start = 0;
        const increment = target / (duration / 16); // 60fps
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    };

    // Intersection Observer for counters
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                if (target) {
                    animateCounter(entry.target, target);
                    entry.target.classList.add('counted');
                }
            }
        });
    }, { threshold: 0.5 });

    // Observe all impact numbers
    document.querySelectorAll('.impact-number[data-target]').forEach(counter => {
        counterObserver.observe(counter);
    });
    // Mobile Menu Toggle
    const navContainer = document.querySelector('.navbar .container');
    const menuToggle = document.createElement('div');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    menuToggle.setAttribute('aria-label', 'Toggle Navigation');
    menuToggle.setAttribute('role', 'button');
    navContainer.appendChild(menuToggle);

    const navLinks = document.querySelector('.nav-links');

    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        menuToggle.innerHTML = navLinks.classList.contains('active')
            ? '<i class="fas fa-times"></i>'
            : '<i class="fas fa-bars"></i>';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !menuToggle.contains(e.target) && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
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
