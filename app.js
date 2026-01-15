/**
 * App Navigation & Global Features
 * Handles landing page visibility, smooth scrolling, and global interactions
 */

// Check if user has visited before
const hasVisited = localStorage.getItem('hasVisitedBefore');

// Hide landing page on first interaction or if returning user
document.addEventListener('DOMContentLoaded', () => {
    const landing = document.getElementById('landing');
    const navLinks = document.querySelectorAll('nav a');
    const homeBtn = document.getElementById('home-btn');

    // Hide landing if returning user
    if (hasVisited) {
        landing.style.display = 'none';
    }

    // Home button functionality
    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            landing.style.display = 'flex';
            localStorage.removeItem('hasVisitedBefore');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Add smooth navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            // Mark as visited
            localStorage.setItem('hasVisitedBefore', 'true');

            // Hide landing
            landing.style.display = 'none';

            // Smooth scroll
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-button');
    ctaButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem('hasVisitedBefore', 'true');
            landing.style.display = 'none';
        });
    });

    // Add scroll reveal animation
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'slideUp 0.6s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all sections for animation
    document.querySelectorAll('section').forEach(section => {
        if (section.id !== 'landing') {
            section.style.opacity = '0';
            observer.observe(section);
        }
    });
});

// Add keyboard shortcut to reset data (Ctrl+Shift+R)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    }
});

/**
 * Applies time-aware UI based on current time and date
 */
function applyTimeAwareUI() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    // Get last day of current month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const isMonthEnd = day >= lastDayOfMonth - 2; // Last 3 days of month

    const body = document.body;
    const indicator = document.getElementById('time-indicator');

    // Remove existing time-aware classes
    body.classList.remove('morning-mode', 'night-mode', 'month-end-mode');

    // Apply month-end mode first (highest priority)
    if (isMonthEnd) {
        body.classList.add('month-end-mode');
        indicator.textContent = '💰 Month End Pressure';
        return;
    }

    // Apply time-based modes
    if (hour >= 6 && hour < 12) {
        // Morning: 6 AM - 12 PM
        body.classList.add('morning-mode');
        indicator.textContent = '🌅 Morning Mode';
    } else if (hour >= 22 || hour < 6) {
        // Night: 10 PM - 6 AM
        body.classList.add('night-mode');
        indicator.textContent = '🌙 Night Mode';
    } else {
        // Default (afternoon/evening): no special class
        indicator.textContent = '';
    }
}

// Update time-aware UI every minute
setInterval(applyTimeAwareUI, 60000);

// Update Truth Summary Cards
function updateTruthSummaryCards() {
    // Get all expenses
    const expenses = getData(STORAGE_KEYS.EXPENSES) || [];
    const habits = getData(STORAGE_KEYS.HABITS) || {};
    const timeLogs = getData(STORAGE_KEYS.TIME_LOGS) || [];

    // Calculate Financial Leak (total expenses exceeding budget)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    const totalMonthly = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const budget = parseInt(localStorage.getItem('monthlyBudget')) || 10000;
    const leak = Math.max(0, totalMonthly - budget);

    // Calculate Productivity Score
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const weekLogs = Object.entries(timeLogs).filter(([date, log]) => new Date(date) >= thisWeekStart);

    let totalProductive = 0;
    let totalScreen = 0;
    weekLogs.forEach(([date, log]) => {
        totalProductive += parseFloat(log.productive) || 0;
        totalScreen += parseFloat(log.screen) || 0;
    });

    const productivity = totalScreen > 0 ? Math.round((totalProductive / totalScreen) * 100) : 0;
    document.getElementById('productivity-value').textContent = productivity + '%';

    // Calculate Best Streak (from all habits)
    let bestStreak = 0;
    Object.values(habits).forEach(habit => {
        const currentStreak = habit.currentStreak || 0;
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
    });
    document.getElementById('habit-value').textContent = bestStreak;

    // Calculate Time Wasted (this week)
    const timeWasted = Math.max(0, totalScreen - totalProductive);
    document.getElementById('time-value').textContent = timeWasted.toFixed(1);

    // UPDATE DASHBOARD EMPTY STATE
    const dashboardEmptyState = document.getElementById('dashboard-empty-state');
    const hasAnyData = expenses.length > 0 || Object.keys(habits).length > 0 || Object.keys(timeLogs).length > 0;

    if (!hasAnyData) {
        dashboardEmptyState.style.display = 'flex';
        // Hide other dashboard elements when empty
        document.getElementById('most-important-widget').style.display = 'none';
        document.getElementById('truth-summary-cards').style.display = 'none';
        document.getElementById('insights-container').style.display = 'none';
    } else {
        dashboardEmptyState.style.display = 'none';
        document.getElementById('most-important-widget').style.display = 'block';
        document.getElementById('truth-summary-cards').style.display = 'grid';
        document.getElementById('insights-container').style.display = 'block';
    }

    // UPDATE PRIORITY WIDGET
    updatePriorityWidget(expenses, habits, budget, productivity, timeWasted);

    // UPDATE EXPLANATORY INSIGHTS
    updateExplanatoryInsights();
}

/**
 * Updates the "Most Important Today" priority widget with top insights
 */
function updatePriorityWidget(expenses, habits, budget, productivity, timeWasted) {
    const priorityContent = document.getElementById('priority-content');
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Collect all priority issues with severity
    const issues = [];

    // Check if habits completed today
    const completedHabitsToday = Object.values(habits).filter(h => h.history && h.history[today]).length;
    const totalHabits = Object.keys(habits).length;

    if (completedHabitsToday === 0 && totalHabits > 0) {
        issues.push({
            priority: 1,
            icon: '🔴',
            text: 'No habits completed yet today'
        });
    }

    // Check waste spending
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    const wasteTotal = monthlyExpenses
        .filter(exp => exp.category === 'Waste')
        .reduce((sum, exp) => sum + exp.amount, 0);
    const wasteLimit = budget * 0.2;

    if (wasteTotal > wasteLimit) {
        issues.push({
            priority: 1,
            icon: '💸',
            text: `Reduce waste spending (₹${wasteTotal.toFixed(0)} over limit)`
        });
    }

    // Check productivity
    if (productivity < 40) {
        issues.push({
            priority: 2,
            icon: '⚡',
            text: 'Improve productivity (currently ' + productivity + '%)'
        });
    }

    // Check time wasted
    if (timeWasted > 5) {
        issues.push({
            priority: 2,
            icon: '⏳',
            text: 'You wasted ' + timeWasted.toFixed(1) + ' hours this week'
        });
    }

    // Check broken streaks
    let brokenStreaks = [];
    Object.entries(habits).forEach(([key, habit]) => {
        if (habit.streak === 0 && habit.longest > 0) {
            brokenStreaks.push(key.charAt(0).toUpperCase() + key.slice(1));
        }
    });

    if (brokenStreaks.length > 0) {
        issues.push({
            priority: 1,
            icon: '🔥',
            text: 'Rebuild streak: ' + brokenStreaks.join(', ')
        });
    }

    // If no issues, show positive message
    if (issues.length === 0) {
        issues.push({
            priority: 3,
            icon: '✨',
            text: 'You\'re doing great! Keep it up!'
        });
    }

    // Sort by priority (lower = more important) and take top 3
    issues.sort((a, b) => a.priority - b.priority);
    const topIssues = issues.slice(0, 3);

    // Render priority items
    priorityContent.innerHTML = topIssues
        .map(issue => `
            <div class="priority-item">
                <span class="priority-icon">${issue.icon}</span>
                <span class="priority-text">${issue.text}</span>
            </div>
        `)
        .join('');
}

/**
 * Updates explanatory insights that explain the data in a calm, factual way
 */
function updateExplanatoryInsights() {
    const expenses = getData(STORAGE_KEYS.EXPENSES) || [];
    const habits = getData(STORAGE_KEYS.HABITS) || {};
    const timeLogs = getData(STORAGE_KEYS.TIME_LOGS) || [];

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));

    // Insight 1: Worst category this month
    const categoryTotals = {};
    monthlyExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    let worstCategory = null;
    let maxAmount = 0;
    Object.entries(categoryTotals).forEach(([category, amount]) => {
        if (amount > maxAmount) {
            maxAmount = amount;
            worstCategory = category;
        }
    });

    const wasteInsight = document.getElementById('waste-insight');
    if (worstCategory) {
        wasteInsight.textContent = `This is your worst category this month`;
        wasteInsight.style.fontSize = '0.9rem';
        wasteInsight.style.color = 'var(--text-secondary)';
        wasteInsight.style.fontStyle = 'italic';
    } else {
        wasteInsight.textContent = '';
    }

    // Insight 2: Habit failure patterns
    const today = new Date();
    const last30Days = [];
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        last30Days.push(date.toISOString().split('T')[0]);
    }

    let weekendFailures = 0;
    let weekdayFailures = 0;
    let totalHabitsTracked = 0;

    last30Days.forEach(dateStr => {
        const date = new Date(dateStr);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday = 0, Saturday = 6
        const isPastDate = dateStr < today.toISOString().split('T')[0];

        Object.values(habits).forEach(habit => {
            // Count as failure if habit wasn't completed on past dates
            if (isPastDate && !habit.history[dateStr]) {
                totalHabitsTracked++;
                if (isWeekend) {
                    weekendFailures++;
                } else {
                    weekdayFailures++;
                }
            }
        });
    });

    const productivityInsight = document.getElementById('productivity-insight');
    if (totalHabitsTracked > 0) {
        const weekendRate = weekendFailures / Math.max(1, weekendFailures + weekdayFailures);
        if (weekendRate > 0.6) {
            productivityInsight.textContent = `You usually fail habits on weekends`;
            productivityInsight.style.fontSize = '0.9rem';
            productivityInsight.style.color = 'var(--text-secondary)';
            productivityInsight.style.fontStyle = 'italic';
        } else {
            productivityInsight.textContent = '';
        }
    } else {
        productivityInsight.textContent = '';
    }

    // Insight 3: Productivity patterns (after 9 PM)
    const recentTimeLogs = Object.entries(timeLogs).filter(([date]) => {
        const logDate = new Date(date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logDate >= weekAgo;
    });

    let eveningLogs = [];
    let morningLogs = [];

    recentTimeLogs.forEach(([date, log]) => {
        const logDate = new Date(date);
        const hour = logDate.getHours();
        if (hour >= 21 || hour < 6) { // After 9 PM or before 6 AM
            eveningLogs.push(log);
        } else {
            morningLogs.push(log);
        }
    });

    const disciplineInsight = document.getElementById('discipline-insight');
    if (eveningLogs.length > 0 && morningLogs.length > 0) {
        const eveningProductivity = eveningLogs.reduce((sum, log) => sum + (log.productive / Math.max(1, log.screen)), 0) / eveningLogs.length;
        const morningProductivity = morningLogs.reduce((sum, log) => sum + (log.productive / Math.max(1, log.screen)), 0) / morningLogs.length;

        if (eveningProductivity < morningProductivity * 0.7) {
            disciplineInsight.textContent = `Productivity drops after 9 PM`;
            disciplineInsight.style.fontSize = '0.9rem';
            disciplineInsight.style.color = 'var(--text-secondary)';
            disciplineInsight.style.fontStyle = 'italic';
        } else {
            disciplineInsight.textContent = '';
        }
    } else {
        disciplineInsight.textContent = '';
    }
}

// Initialize Truth Summary Cards on page load
document.addEventListener('DOMContentLoaded', () => {
    applyTimeAwareUI(); // Apply time-aware UI on load
    updateTruthSummaryCards();
    updateExplanatoryInsights();

    // Update cards whenever user adds data
    document.addEventListener('dataUpdated', updateTruthSummaryCards);
});

// Global function for other modules to trigger insights update
window.updateInsights = function () {
    updateTruthSummaryCards();
};

// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', function () {
    const themeToggle = document.getElementById('theme-toggle');
    const hamburger = document.getElementById('hamburger');
    const navUl = document.querySelector('nav ul');
    const body = document.body;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }

    // Toggle theme
    themeToggle.addEventListener('click', function () {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Hamburger menu toggle
    hamburger.addEventListener('click', function () {
        navUl.classList.toggle('show');
    });

    // Close menu when clicking outside or on a link
    document.addEventListener('click', function (e) {
        if (!hamburger.contains(e.target) && !navUl.contains(e.target)) {
            navUl.classList.remove('show');
        }
    });

    navUl.addEventListener('click', function (e) {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
            navUl.classList.remove('show');
        }
    });
});

// Console greeting
console.log('%c🎯 Personal Control System', 'font-size: 20px; font-weight: bold; color: #06b6d4;');
console.log('%cTip: Press Ctrl+Shift+R to reset all data', 'font-size: 12px; color: #64748b;');
