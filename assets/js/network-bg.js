const canvas = document.getElementById('network-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let nodes = [];
let particles = []; // Mouse trail particles
let pulses = []; // Signal pulses along connections
let mouse = { x: null, y: null, radius: 250 }; // Increased radius for interaction

// Configuration
const config = {
    nodeCount: window.innerWidth < 768 ? 40 : 80,
    connectionDistance: window.innerWidth < 768 ? 100 : 180,
    baseRadius: 2,
    pulseChance: 0.005, // Chance for a pulse to start
    pulseSpeed: 3,
    colors: {
        political: { r: 239, g: 68, b: 68 }, // Red
        philosophical: { r: 59, g: 130, b: 246 }, // Blue
        computational: { r: 34, g: 197, b: 94 }, // Green
        creative: { r: 168, g: 85, b: 247 }, // Purple
        default: { r: 148, g: 163, b: 184 } // Slate 400
    },
    voidColors: {
        political: { r: 248, g: 113, b: 113 }, // Lighter Red
        philosophical: { r: 96, g: 165, b: 250 }, // Lighter Blue
        computational: { r: 74, g: 222, b: 128 }, // Lighter Green
        creative: { r: 192, g: 132, b: 252 }, // Lighter Purple
        default: { r: 148, g: 163, b: 184 }
    }
};

const nodeCategories = {
    political: ["Polarization", "Hybrid Regimes", "Democracy", "Power"],
    philosophical: ["Ethics", "Existentialism", "Free Will"],
    computational: ["AI", "Networks", "Simulation", "Agents"],
    creative: ["Chaos", "Music", "Narrative"]
};

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    config.nodeCount = width < 768 ? 40 : 80;
    config.connectionDistance = width < 768 ? 100 : 180;
    init(); // Re-init on resize to adjust density
}

class Node {
    constructor(label, category) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.label = label;
        this.category = category || 'default';
        this.radius = Math.random() * 2 + config.baseRadius;
        this.color = config.colors[this.category] || config.colors.default;
        this.angle = Math.random() * Math.PI * 2; // For organic movement
    }

    update() {
        // Organic movement using sine waves
        this.angle += 0.01;
        this.vx += Math.sin(this.angle) * 0.01;
        this.vy += Math.cos(this.angle) * 0.01;

        // Dampen velocity limits
        const maxVel = 1.5;
        this.vx = Math.max(-maxVel, Math.min(maxVel, this.vx));
        this.vy = Math.max(-maxVel, Math.min(maxVel, this.vy));

        // Mouse Interaction
        if (mouse.x !== null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouse.radius) {
                // Gentle attraction/swirl or repulsion?
                // Let's do a "calming" effect where they slow down and move slightly away
                const force = (mouse.radius - distance) / mouse.radius;
                const angle = Math.atan2(dy, dx);

                // Repulsion
                this.vx -= Math.cos(angle) * force * 0.5;
                this.vy -= Math.sin(angle) * force * 0.5;
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < -50) this.x = width + 50;
        if (this.x > width + 50) this.x = -50;
        if (this.y < -50) this.y = height + 50;
        if (this.y > height + 50) this.y = -50;
    }

    draw() {
        // Dynamic color selection based on mode
        const isVoid = document.body.classList.contains('void-mode');
        const palette = isVoid ? config.voidColors : config.colors;
        const color = palette[this.category] || palette.default;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
        ctx.fill();

        // Label
        if (this.label) {
            ctx.font = '10px "JetBrains Mono"';
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
            ctx.fillText(this.label, this.x + 8, this.y + 3);
        }
    }
}

class Pulse {
    constructor(nodeA, nodeB, color) {
        this.nodeA = nodeA;
        this.nodeB = nodeB;
        this.progress = 0;
        this.speed = config.pulseSpeed / Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2));
        this.color = color;
        this.finished = false;
    }

    update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
            this.finished = true;
        }
    }

    draw() {
        if (this.finished) return;
        const x = this.nodeA.x + (this.nodeB.x - this.nodeA.x) * this.progress;
        const y = this.nodeA.y + (this.nodeB.y - this.nodeA.y) * this.progress;

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function init() {
    nodes = [];
    pulses = [];

    // Create labeled nodes
    Object.keys(nodeCategories).forEach(cat => {
        nodeCategories[cat].forEach(label => {
            nodes.push(new Node(label, cat));
        });
    });

    // Fill remaining
    while (nodes.length < config.nodeCount) {
        // Random category
        const cats = Object.keys(nodeCategories);
        const randomCat = cats[Math.floor(Math.random() * cats.length)];
        nodes.push(new Node("", randomCat));
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update Nodes
    nodes.forEach(node => {
        node.update();
        node.draw();
    });

    // Draw Connections & Pulses
    ctx.lineWidth = 1;

    const isVoid = document.body.classList.contains('void-mode');
    const palette = isVoid ? config.voidColors : config.colors;

    for (let i = 0; i < nodes.length; i++) {
        let nodeA = nodes[i];
        let colorA = palette[nodeA.category] || palette.default;

        // Find near nodes
        for (let j = i + 1; j < nodes.length; j++) {
            let nodeB = nodes[j];
            let colorB = palette[nodeB.category] || palette.default;

            let dx = nodeA.x - nodeB.x;
            let dy = nodeA.y - nodeB.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            // Connect if close
            if (dist < config.connectionDistance) {
                let opacity = 1 - (dist / config.connectionDistance);

                // Color mixing logic
                let r = Math.floor((colorA.r + colorB.r) / 2);
                let g = Math.floor((colorA.g + colorB.g) / 2);
                let b = Math.floor((colorA.b + colorB.b) / 2);

                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.15})`; // Low opacity for text readability
                ctx.beginPath();
                ctx.moveTo(nodeA.x, nodeA.y);
                ctx.lineTo(nodeB.x, nodeB.y);
                ctx.stroke();

                // Chance to spawn a pulse
                if (Math.random() < config.pulseChance && dist > 50) {
                    pulses.push(new Pulse(nodeA, nodeB, { r, g, b }));
                }
            }
        }
    }

    // Update & Draw Pulses
    pulses = pulses.filter(p => !p.finished);
    pulses.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

// Event Listeners
window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

// Start
resize();
animate();
