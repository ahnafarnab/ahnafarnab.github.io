class Agent {
    constructor(x, y) {
        this.x = x; // -1 (Left) to 1 (Right)
        this.y = y; // 0 to 1 (Social Cluster/Vertical Space)
        this.vx = (Math.random() - 0.5) * 0.002;
        this.vy = (Math.random() - 0.5) * 0.002;
        this.partyAffiliation = null;
        this.demographic = Math.random(); // 0-1 proxy for age/education (low = more susceptible)
        this.radicalization = this.demographic < 0.3 ? Math.random() * 0.4 : Math.random() * 0.1; // Higher for "youth"
        this.friends = [];
    }
}

class Party {
    constructor(name, ideology, color, yPos) {
        this.name = name;
        this.baseIdeology = ideology;
        this.currentIdeology = ideology;
        this.color = color;
        this.yPos = yPos;
        this.influenceRadius = 0.25;
        this.strength = 0; // Number of adherents
    }
}

const canvas = document.getElementById('political-sim-canvas');
const ctx = canvas.getContext('2d');

// Simulation State
const state = {
    agents: [],
    parties: [],
    time: 0,
    polarization: 0,
    judiciaryCapacity: 100,
    legislativeOutput: 0,
    metricsLog: [], // For export: [{time, polarization, judiciary, legislative, gini}]
    params: {
        affectivePolarization: 0.5, // 0 to 1
        partyOpportunism: 0.3, // 0 to 1
        noise: 0.005, // Randomness
        mediaFrequency: 0.005, // Probability of media event
        radicalizationScale: 1.0, // Multiplier for radicalization effect
        simulationSpeed: 1 // Frames per update (1 = normal, higher = faster)
    },
    paused: false
};

let animationId;
let width, height;

// Initialize Simulation
async function initSim() {
    resizeSim();

    // Load real data or fallback to random
    state.agents = await loadRealData();
    if (state.agents.length === 0) {
        for (let i = 0; i < 600; i++) {
            let ideology = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3;
            ideology = ideology / 3; // Normalize roughly -1 to 1
            state.agents.push(new Agent(ideology, Math.random()));
        }
    }

    // Add social networks
    state.agents.forEach(agent => {
        for (let i = 0; i < 5; i++) { // Erdos-Renyi like
            const friend = state.agents[Math.floor(Math.random() * state.agents.length)];
            if (friend !== agent && !agent.friends.includes(friend)) agent.friends.push(friend);
        }
    });

    // Create Parties (Bangladeshi Political Spectrum Abstracted)
    state.parties = [
        new Party("Radical Left", -0.8, "#ef4444", 0.2),    // Red
        new Party("Center-Left Alliance", -0.3, "#22c55e", 0.4), // Green (AL led)
        new Party("Centrist Bloc", 0, "#94a3b8", 0.5),       // Gray
        new Party("Nationalist Alliance", 0.3, "#3b82f6", 0.6), // Blue (BNP led)
        new Party("Religious Right", 0.8, "#a855f7", 0.8)    // Purple (Jamaat ish)
    ];

    state.metricsLog = [];
    state.time = 0;
    state.polarization = 0;
    state.judiciaryCapacity = 100;
    state.legislativeOutput = 0;

    render();
    loop();
}

async function loadRealData() {
    try {
        const response = await fetch('assets/data/bangladesh_ideology_survey.json'); // Assume JSON: [{ideology: -0.5, y: 0.3}, ...]
        const data = await response.json();
        return data.slice(0, 600).map(d => new Agent(d.ideology || (Math.random() * 2 - 1), d.y || Math.random()));
    } catch (e) {
        // console.error('Data load failed; using random'); // Suppress error for demo
        return [];
    }
}

function resizeSim() {
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width;
    canvas.height = height;
}

function update() {
    if (state.paused) return;

    state.time++;

    // Update Party Strategies (Dubious Ideologies)
    state.parties.forEach(party => {
        // Random drift or opportunistic jump
        if (Math.random() < 0.01 * state.params.partyOpportunism) {
            // Sudden shift to capture center or drift extreme
            const target = (Math.random() - 0.5) * 1.5;
            const drift = (target - party.currentIdeology) * 0.1;
            party.currentIdeology += drift;
            logEvent(`Crisis: ${party.name} shifts ideology dubiously!`);
        }

        // Return slowly to base if not opportunistic
        party.currentIdeology += (party.baseIdeology - party.currentIdeology) * 0.01;
    });

    // Spatial bins for efficiency
    const bins = {};
    state.agents.forEach(agent => {
        const bin = getBin(agent.x, agent.y);
        if (!bins[bin]) bins[bin] = [];
        bins[bin].push(agent);
    });

    // Update Agents
    let totalIdeology = 0;
    let partyStrengths = state.parties.map(() => 0);

    state.agents.forEach(agent => {
        // 1. Find nearest party (Attraction)
        let bestParty = null;
        let minDist = Infinity;

        state.parties.forEach(party => {
            const d = Math.abs(agent.x - party.currentIdeology);
            if (d < minDist) {
                minDist = d;
                bestParty = party;
            }
        });

        agent.partyAffiliation = bestParty;
        if (bestParty) partyStrengths[state.parties.indexOf(bestParty)]++;

        // Move towards party
        if (bestParty) {
            agent.vx += (bestParty.currentIdeology - agent.x) * 0.001 * (1 + agent.radicalization * state.params.radicalizationScale);
            // Align Y slightly
            agent.vy += (bestParty.yPos - agent.y) * 0.001;
        }

        // 2. Affective Polarization (Repulsion from opposite extreme) - using bins
        const repulsionStrength = state.params.affectivePolarization * 0.0005;
        const agentBin = getBin(agent.x, agent.y);
        const [bx, by] = agentBin.split(',').map(Number);

        // Check surrounding bins + current bin
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const neighborBin = `${bx + dx},${by + dy}`;
                if (bins[neighborBin]) {
                    bins[neighborBin].forEach(other => {
                        if (other !== agent && Math.abs(agent.x - other.x) > 1.0) {
                            const sign = agent.x > other.x ? 1 : -1;
                            agent.vx += sign * repulsionStrength;
                        }
                    });
                }
            }
        }

        // 3. Social influence from friends
        agent.friends.forEach(friend => {
            agent.vx += (friend.x - agent.x) * 0.0005 * agent.radicalization * state.params.radicalizationScale;
        });

        // 4. Media influence (global drift)
        if (Math.random() < state.params.mediaFrequency) {
            const mediaBias = (Math.random() - 0.5) * 0.5; // Random shift
            state.agents.forEach(a => a.vx += mediaBias * a.radicalization * 0.01 * state.params.radicalizationScale);
            logEvent(`Media Event: Ideological nudge (${mediaBias > 0 ? 'Right' : 'Left'})`);
        }

        // 5. Noise / Randomness
        agent.vx += (Math.random() - 0.5) * state.params.noise;
        agent.vy += (Math.random() - 0.5) * state.params.noise;

        // Apply Physics
        agent.x += agent.vx;
        agent.y += agent.vy;
        agent.vx *= 0.95; // Friction
        agent.vy *= 0.95;

        // Bounds
        if (agent.x < -1.1) agent.x = -1.1;
        if (agent.x > 1.1) agent.x = 1.1;
        if (agent.y < 0) agent.y = 0;
        if (agent.y > 1) agent.y = 1;

        totalIdeology += agent.x;
    });

    // Calculate Metrics
    const mean = totalIdeology / state.agents.length;
    let variance = 0;
    state.agents.forEach(a => variance += Math.pow(a.x - mean, 2));
    state.polarization = Math.sqrt(variance / state.agents.length) * 2; // Scale for UI

    // Judiciary Capacity: Decays with high polarization
    if (state.polarization > 0.8) {
        state.judiciaryCapacity -= 0.1;
    } else {
        state.judiciaryCapacity += 0.05;
    }
    state.judiciaryCapacity = Math.max(0, Math.min(100, state.judiciaryCapacity));

    // Legislative Output
    if (state.polarization < 0.6) {
        state.legislativeOutput += 0.2;
    } else if (state.polarization > 1.2) {
        state.legislativeOutput += 0; // Gridlock
    } else {
        state.legislativeOutput += 0.05;
    }

    // Gini for party strengths
    const gini = calculateGini(partyStrengths);

    // Log metrics every 10 steps for export
    if (state.time % 10 === 0) {
        state.metricsLog.push({
            time: state.time,
            polarization: state.polarization,
            judiciary: state.judiciaryCapacity,
            legislative: state.legislativeOutput,
            gini: gini
        });
    }

    // Check for critical events
    if (state.judiciaryCapacity < 20 && Math.random() < 0.05) {
        logEvent("Warning: Judicial Capacity Critical! Rule of Law eroding.");
    }

    updateUI(gini);
}

function render() {
    ctx.clearRect(0, 0, width, height);

    // Draw Ideology Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(239, 68, 68, 0.1)");
    gradient.addColorStop(0.5, "rgba(148, 163, 184, 0.05)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw Axis with labels
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "12px Inter";
    ctx.textAlign = "left";
    ctx.fillText("Left", 10, height - 10);
    ctx.textAlign = "right";
    ctx.fillText("Right", width - 10, height - 10);

    // Draw Agents
    state.agents.forEach(agent => {
        const xPos = map(agent.x, -1.2, 1.2, 0, width);
        const yPos = agent.y * height;

        ctx.fillStyle = agent.partyAffiliation ? agent.partyAffiliation.color : "#666";
        ctx.beginPath();
        ctx.arc(xPos, yPos, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Parties (Attractors)
    state.parties.forEach(party => {
        const xPos = map(party.currentIdeology, -1.2, 1.2, 0, width);
        const yPos = party.yPos * height;

        // Influence field
        ctx.beginPath();
        ctx.arc(xPos, yPos, party.influenceRadius * (width / 3), 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(party.color, 0.1);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(xPos, yPos, 8, 0, Math.PI * 2);
        ctx.fillStyle = party.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = party.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = "#fff";
        ctx.font = "10px Inter";
        ctx.textAlign = "center";
        ctx.fillText(party.name, xPos, yPos - 12);
    });
}

function loop() {
    for (let i = 0; i < state.params.simulationSpeed; i++) {
        update();
    }
    render();
    animationId = requestAnimationFrame(loop);
}

// Helpers
function map(value, minA, maxA, minB, maxB) {
    return minB + (value - minA) * (maxB - minB) / (maxA - minA);
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getBin(x, y) {
    const binX = Math.floor(map(x, -1.2, 1.2, 0, 10));
    const binY = Math.floor(y * 10);
    return `${binX},${binY}`;
}

function calculateGini(arr) {
    arr = arr.sort((a, b) => a - b);
    let sum = 0, n = arr.length;
    arr.forEach((v, i) => sum += (2 * (i + 1) - n - 1) * v);
    return Math.abs(sum) / (Math.pow(n, 2) * (arr.reduce((a, b) => a + b, 0) / n) || 1); // Fixed Gini formula
}

function updateUI(gini) {
    // Meters
    const elPolarization = document.getElementById('sim-polarization');
    if (elPolarization) elPolarization.style.width = Math.min(100, state.polarization * 50) + '%';

    const elPolarizationVal = document.getElementById('sim-polarization-val');
    if (elPolarizationVal) elPolarizationVal.innerText = state.polarization.toFixed(2);

    const elJudiciary = document.getElementById('sim-judiciary');
    if (elJudiciary) elJudiciary.style.width = state.judiciaryCapacity + '%';

    const elJudiciaryVal = document.getElementById('sim-judiciary-val');
    if (elJudiciaryVal) elJudiciaryVal.innerText = Math.round(state.judiciaryCapacity) + '%';

    const elLegislature = document.getElementById('sim-legislature');
    if (elLegislature) elLegislature.innerText = Math.floor(state.legislativeOutput);

    const elGini = document.getElementById('sim-gini-val');
    if (elGini) elGini.innerText = gini ? gini.toFixed(2) : '0.00';
}

function logEvent(msg) {
    const log = document.getElementById('sim-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (msg.includes('Critical')) entry.classList.add('crisis');
    entry.innerText = `[T+${state.time}] ${msg}`;
    log.prepend(entry);
}

// User Controls - Existing
const sliderAffect = document.getElementById('sim-slider-affect');
if (sliderAffect) {
    sliderAffect.addEventListener('input', (e) => {
        state.params.affectivePolarization = parseFloat(e.target.value);
        const val = document.getElementById('val-affect');
        if (val) val.innerText = state.params.affectivePolarization;
    });
}

const sliderOpportunism = document.getElementById('sim-slider-opportunism');
if (sliderOpportunism) {
    sliderOpportunism.addEventListener('input', (e) => {
        state.params.partyOpportunism = parseFloat(e.target.value);
        const val = document.getElementById('val-opportunism');
        if (val) val.innerText = state.params.partyOpportunism;
    });
}

const btnPolarize = document.getElementById('btn-polarize');
if (btnPolarize) {
    btnPolarize.addEventListener('click', () => {
        state.agents.forEach(a => {
            a.x = a.x > 0 ? a.x + 0.3 : a.x - 0.3;
        });
        logEvent("Event: Mass Radicalization triggered.");
    });
}

const btnCoalition = document.getElementById('btn-coalition');
if (btnCoalition) {
    btnCoalition.addEventListener('click', () => {
        // Merge Center-Left and Radical Left OR Center-Right and Religious Right
        if (state.parties.length > 1) {
            const targetA = state.parties[1]; // AL
            const targetB = state.parties[0]; // Left
            targetB.currentIdeology = targetA.currentIdeology - 0.1;
            logEvent("Event: Strategic Coalition formed.");
        }
    });
}

const btnReset = document.getElementById('btn-reset');
if (btnReset) {
    btnReset.addEventListener('click', () => {
        initSim();
        logEvent("System Reset.");
    });
}

// New Sliders and Buttons
const sliderNoise = document.getElementById('sim-slider-noise');
if (sliderNoise) {
    sliderNoise.addEventListener('input', (e) => {
        state.params.noise = parseFloat(e.target.value);
        const val = document.getElementById('val-noise');
        if (val) val.innerText = state.params.noise;
    });
}

const sliderMedia = document.getElementById('sim-slider-media');
if (sliderMedia) {
    sliderMedia.addEventListener('input', (e) => {
        state.params.mediaFrequency = parseFloat(e.target.value);
        const val = document.getElementById('val-media');
        if (val) val.innerText = state.params.mediaFrequency;
    });
}

const sliderRadical = document.getElementById('sim-slider-radical');
if (sliderRadical) {
    sliderRadical.addEventListener('input', (e) => {
        state.params.radicalizationScale = parseFloat(e.target.value);
        const val = document.getElementById('val-radical');
        if (val) val.innerText = state.params.radicalizationScale;
    });
}

const sliderSpeed = document.getElementById('sim-slider-speed');
if (sliderSpeed) {
    sliderSpeed.addEventListener('input', (e) => {
        state.params.simulationSpeed = parseInt(e.target.value);
        const val = document.getElementById('val-speed');
        if (val) val.innerText = state.params.simulationSpeed;
    });
}

const btnPause = document.getElementById('btn-pause');
if (btnPause) {
    btnPause.addEventListener('click', () => {
        state.paused = !state.paused;
        btnPause.innerText = state.paused ? 'Resume' : 'Pause';
        logEvent(state.paused ? "Simulation Paused." : "Simulation Resumed.");
    });
}

const btnExport = document.getElementById('btn-export');
if (btnExport) {
    btnExport.addEventListener('click', () => {
        let csv = 'Time,Polarization,Judiciary,Legislative,Gini\n';
        state.metricsLog.forEach(log => {
            csv += `${log.time},${log.polarization.toFixed(2)},${log.judiciary.toFixed(2)},${log.legislative.toFixed(2)},${log.gini.toFixed(2)}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'abm_metrics.csv'; a.click();
        logEvent('Data Exported.');
    });
}

window.addEventListener('resize', resizeSim);

// Start
if (canvas) initSim();
