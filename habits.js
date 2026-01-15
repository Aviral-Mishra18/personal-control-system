/**
 * Phase 4: Habit Tracker
 * Manages Study, Exercise, Coding, and No Junk Food habits.
 * Includes streak calculation and history persistence.
 */

// Initialize data structure based on the strict model
const defaultHabits = {
    study: { history: {}, streak: 0, longest: 0 },
    exercise: { history: {}, streak: 0, longest: 0 },
    coding: { history: {}, streak: 0, longest: 0 },
    noJunkFood: { history: {}, streak: 0, longest: 0 }
};

let habits = getData(STORAGE_KEYS.HABITS) || defaultHabits;

/**
 * Calculates current and longest streaks for a habit
 * @param {Object} history - The history object { "YYYY-MM-DD": true }
 */
const calculateStreaks = (history) => {
    const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
    if (dates.length === 0) return { current: 0, longest: 0 };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    // Calculate Longest
    const sortedDatesAsc = [...dates].sort((a, b) => new Date(a) - new Date(b));
    let lastDate = null;

    sortedDatesAsc.forEach(dateStr => {
        if (!history[dateStr]) {
            tempStreak = 0;
        } else {
            if (lastDate) {
                const diff = (new Date(dateStr) - new Date(lastDate)) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
            } else {
                tempStreak = 1;
            }
            if (tempStreak > longest) longest = tempStreak;
        }
        lastDate = dateStr;
    });

    // Calculate Current (must include today or yesterday to be active)
    let checkDate = new Date();
    while (true) {
        const checkStr = checkDate.toISOString().split('T')[0];
        if (history[checkStr]) {
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // If the missing date isn't today, the streak is broken
            break;
        }
    }

    return { current, longest };
};

/**
 * Toggles habit completion for the current date
 * @param {string} habitKey - study | exercise | coding | noJunkFood
 */
const toggleHabit = (habitKey) => {
    const today = new Date().toISOString().split('T')[0];
    const habit = habits[habitKey];

    // Toggle state
    habit.history[today] = !habit.history[today];

    // Recalculate streaks
    const { current, longest } = calculateStreaks(habit.history);
    habit.streak = current;
    habit.longest = longest;

    saveData(STORAGE_KEYS.HABITS, habits);
    renderHabits();

    if (window.updateInsights) window.updateInsights();
};

/**
 * Updates the UI with current habit data
 */
const renderHabits = () => {
    const today = new Date().toISOString().split('T')[0];

    Object.keys(habits).forEach(key => {
        const container = document.querySelector(`.habit-card[data-habit="${key}"]`);
        if (!container) return;

        const habitData = habits[key];
        const isDoneToday = !!habitData.history[today];

        container.querySelector('.current-streak').textContent = habitData.streak;
        container.querySelector('.longest-streak').textContent = habitData.longest;

        const btn = container.querySelector('.habit-toggle');
        btn.textContent = isDoneToday ? 'Completed' : 'Mark Completed Today';
        btn.style.backgroundColor = isDoneToday ? 'var(--success)' : 'var(--accent)';
    });

    // UPDATE STATE CONTAINERS
    updateHabitStates();
};

/**
 * Updates habit state containers (empty, warning, critical)
 */
const updateHabitStates = () => {
    const today = new Date().toISOString().split('T')[0];
    const emptyState = document.getElementById('habit-empty-state');
    const warningState = document.getElementById('habit-warning-state');
    const criticalState = document.getElementById('habit-critical-state');
    const habitGrid = document.getElementById('habit-grid');

    // Check if any habit is completed today
    const completedToday = Object.values(habits).some(habit => !!habit.history[today]);

    // Check for productivity issues (from time logs)
    const timeLogs = getData(STORAGE_KEYS.TIME_LOGS) || {};
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekLogs = Object.entries(timeLogs).filter(([date, log]) => new Date(date) >= weekStart);

    let totalProductive = 0, totalScreen = 0;
    weekLogs.forEach(([date, log]) => {
        totalProductive += parseFloat(log.productive) || 0;
        totalScreen += parseFloat(log.screen) || 0;
    });

    const productivity = totalScreen > 0 ? (totalProductive / totalScreen) : 1;
    const wasteHours = Math.max(0, totalScreen - totalProductive);

    // Collect warning/critical issues
    const warningIssues = [];
    const criticalIssues = [];

    // Check for waste
    const expenses = getData(STORAGE_KEYS.EXPENSES) || [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    const wasteTotal = monthlyExpenses
        .filter(exp => exp.category === 'Waste')
        .reduce((sum, exp) => sum + exp.amount, 0);

    // Productivity down
    if (productivity < 0.5) {
        warningIssues.push('📉 Productivity down (below 50% this week)');
    }

    // Waste up
    if (wasteTotal > 5000) {
        warningIssues.push('⬆️ Waste spending is high');
    }

    // Habit streaks at 0
    Object.entries(habits).forEach(([key, habitData]) => {
        if (habitData.streak === 0 && !habitData.history[today]) {
            criticalIssues.push(`🔴 ${key.charAt(0).toUpperCase() + key.slice(1)} streak is broken`);
        }
    });

    // Waste > limit
    const monthlyBudget = parseInt(localStorage.getItem('monthlyBudget')) || 10000;
    const wasteLimit = monthlyBudget * 0.2;
    if (wasteTotal > wasteLimit) {
        criticalIssues.push(`💸 Waste exceeded limit (₹${wasteTotal.toFixed(0)} > ₹${wasteLimit.toFixed(0)})`);
    }

    // DISPLAY STATE
    if (!completedToday) {
        emptyState.style.display = 'flex';
        warningState.style.display = 'none';
        criticalState.style.display = 'none';
        habitGrid.style.display = 'grid';
    } else {
        emptyState.style.display = 'none';
        habitGrid.style.display = 'grid';

        if (criticalIssues.length > 0) {
            criticalState.style.display = 'flex';
            warningState.style.display = 'none';
            document.getElementById('critical-messages').innerHTML =
                criticalIssues.map(msg => `<p>${msg}</p>`).join('');
        } else if (warningIssues.length > 0) {
            warningState.style.display = 'flex';
            criticalState.style.display = 'none';
            document.getElementById('warning-messages').innerHTML =
                warningIssues.map(msg => `<p>${msg}</p>`).join('');
        } else {
            warningState.style.display = 'none';
            criticalState.style.display = 'none';
        }
    }
};

// Event Listeners
document.querySelectorAll('.habit-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const habitKey = e.target.closest('.habit-card').dataset.habit;
        toggleHabit(habitKey);
    });
});

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
    // Force a recalculation on load to handle date changes
    Object.keys(habits).forEach(key => {
        const { current, longest } = calculateStreaks(habits[key].history);
        habits[key].streak = current;
        habits[key].longest = longest;
    });
    renderHabits();
});

// Listen for expense/time updates to refresh habit states
document.addEventListener('dataUpdated', () => {
    updateHabitStates();
});