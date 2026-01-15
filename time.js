/**
 * Phase 5: Time Awareness Tracker
 * Handles screen time and productive time logging.
 * Generates blunt, factual output about wasted time.
 */

// Initialize data structure based on the strict model
let timeLogs = getData(STORAGE_KEYS.TIME_LOGS) || {};

// DOM Elements (Will be set on DOMContentLoaded)
let timeForm;
let screenTimeInput;
let productiveTimeInput;
let timeDateInput;
let totalScreenDisplay;
let totalProductiveDisplay;
let wastedOutput;

/**
 * Saves a time log for a specific date
 */
const logTime = (e) => {
    e.preventDefault();

    const date = timeDateInput.value;
    const screen = parseFloat(screenTimeInput.value);
    const productive = parseFloat(productiveTimeInput.value);

    if (!date || isNaN(screen) || isNaN(productive)) return;

    // Save to the strict model: timeLogs["YYYY-MM-DD"] = { screen, productive }
    timeLogs[date] = {
        screen: screen,
        productive: productive
    };

    saveData(STORAGE_KEYS.TIME_LOGS, timeLogs);
    renderTimeSummary();
    timeForm.reset();

    if (window.updateInsights) window.updateInsights();
};

/**
 * Calculates and displays the weekly summary and blunt output
 */
const renderTimeSummary = () => {
    const now = new Date();
    let totalScreen = 0;
    let totalProductive = 0;

    // Calculate the date 7 days ago
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
    }

    // Sum totals for the last 7 logged days
    last7Days.forEach(dateStr => {
        if (timeLogs[dateStr]) {
            totalScreen += timeLogs[dateStr].screen;
            totalProductive += timeLogs[dateStr].productive;
        }
    });

    const wastedHours = totalScreen - totalProductive;

    // Update UI
    totalScreenDisplay.textContent = `Total screen time: ${totalScreen.toFixed(1)} hrs`;
    totalProductiveDisplay.textContent = `Total productive time: ${totalProductive.toFixed(1)} hrs`;

    // Blunt Factual Output
    if (wastedHours > 0) {
        wastedOutput.textContent = `You wasted ${wastedHours.toFixed(1)} hours this week`;
    } else if (wastedHours < 0) {
        wastedOutput.textContent = `Productive time exceeded screen time by ${Math.abs(wastedHours).toFixed(1)} hours`;
    } else {
        wastedOutput.textContent = `Zero wasted time detected this week`;
    }

    // UPDATE STATE CONTAINERS
    updateTimeStates(totalScreen, totalProductive, wastedHours, last7Days.length);
};

/**
 * Updates time state containers (empty, warning, critical)
 */
const updateTimeStates = (totalScreen, totalProductive, wastedHours, daysLogged) => {
    const emptyState = document.getElementById('time-empty-state');
    const warningState = document.getElementById('time-warning-state');
    const criticalState = document.getElementById('time-critical-state');
    const summary = document.getElementById('time-summary');

    // Check if any time logs exist
    const hasTimeLogs = Object.keys(timeLogs).length > 0;

    // Collect warning/critical issues
    const warningIssues = [];
    const criticalIssues = [];

    if (hasTimeLogs) {
        // Calculate productivity ratio
        const productivityRatio = totalScreen > 0 ? totalProductive / totalScreen : 1;

        // WARNING: High wasted time (> 10 hours this week)
        if (wastedHours > 10) {
            warningIssues.push(`⏰ You wasted ${wastedHours.toFixed(1)} hours this week`);
        }

        // WARNING: Low productivity (< 50%)
        if (productivityRatio < 0.5 && totalScreen > 5) {
            warningIssues.push(`📉 Productivity is below 50% (${(productivityRatio * 100).toFixed(0)}%)`);
        }

        // CRITICAL: Excessive wasted time (> 20 hours this week)
        if (wastedHours > 20) {
            criticalIssues.push(`🚨 You wasted ${wastedHours.toFixed(1)} hours this week - that's ${(wastedHours / 7).toFixed(1)} hours per day!`);
        }

        // CRITICAL: Very low productivity (< 25%)
        if (productivityRatio < 0.25 && totalScreen > 10) {
            criticalIssues.push(`🔴 Productivity is critically low (${(productivityRatio * 100).toFixed(0)}%) - review your time management`);
        }
    }

    // DISPLAY STATE
    if (!hasTimeLogs) {
        // EMPTY STATE: No time logs yet
        emptyState.style.display = 'flex';
        warningState.style.display = 'none';
        criticalState.style.display = 'none';
        summary.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        summary.style.display = 'block';

        if (criticalIssues.length > 0) {
            criticalState.style.display = 'flex';
            warningState.style.display = 'none';
            document.getElementById('time-critical-messages').innerHTML =
                criticalIssues.map(msg => `<p>${msg}</p>`).join('');
        } else if (warningIssues.length > 0) {
            warningState.style.display = 'flex';
            criticalState.style.display = 'none';
            document.getElementById('time-warning-messages').innerHTML =
                warningIssues.map(msg => `<p>${msg}</p>`).join('');
        } else {
            warningState.style.display = 'none';
            criticalState.style.display = 'none';
        }
    }
};

// Event Listeners
// Moved to DOMContentLoaded below

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    timeForm = document.getElementById('time-log-form');
    screenTimeInput = document.getElementById('screen-time');
    productiveTimeInput = document.getElementById('productive-time');
    timeDateInput = document.getElementById('time-log-date');
    totalScreenDisplay = document.getElementById('total-screen-time');
    totalProductiveDisplay = document.getElementById('total-productive-time');
    wastedOutput = document.getElementById('wasted-time-output');

    // Attach event listener
    timeForm.addEventListener('submit', logTime);

    // Set default date to today for convenience
    timeDateInput.value = new Date().toISOString().split('T')[0];
    renderTimeSummary();
});