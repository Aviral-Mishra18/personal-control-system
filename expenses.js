/**
 * Phase 3: Expense Tracker
 * Handles adding, deleting, filtering, and leak detection for expenses.
 */

// Category colors for visual preview
const CATEGORY_COLORS = {
    'Food': '#f59e0b',
    'Travel': '#06b6d4',
    'Learning': '#8b5cf6',
    'Entertainment': '#ec4899',
    'Waste': '#ef4444'
};

// Initialize local state
let expenses = getData(STORAGE_KEYS.EXPENSES) || [];
let monthlyBudget = getData('MONTHLY_BUDGET') || 10000; // Default budget

// DOM Elements (Will be set on DOMContentLoaded)
let expenseForm;
let expenseList;
let totalMonthlyDisplay;
let leakDetectionDisplay;
let filterMonthInput;
let clearMonthBtn;
let remainingAmountDisplay;
let budgetInput;
let setBudgetBtn;
let expenseCategorySelect;
let categoryPreview;
let wasteWarning;

/**
 * Sets the monthly budget
 */
const setBudget = () => {
    const newBudget = parseFloat(budgetInput.value);
    if (newBudget > 0) {
        monthlyBudget = newBudget;
        saveData('MONTHLY_BUDGET', monthlyBudget);
        renderExpenses();
    }
};

/**
 * Updates category preview and waste warning
 */
const updateCategoryPreview = () => {
    const selectedCategory = expenseCategorySelect.value;

    if (selectedCategory && CATEGORY_COLORS[selectedCategory]) {
        categoryPreview.style.backgroundColor = CATEGORY_COLORS[selectedCategory];
        categoryPreview.style.opacity = '1';
    } else {
        categoryPreview.style.opacity = '0';
    }

    // Show waste warning only if "Waste" is selected
    if (selectedCategory === 'Waste') {
        wasteWarning.style.display = 'block';
    } else {
        wasteWarning.style.display = 'none';
    }
};

/**
 * Adds a new expense based on the strict data model
 */
const addExpense = (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const note = document.getElementById('expense-note').value;
    const date = document.getElementById('expense-date').value;

    if (!amount || !category || !date) return;

    const newExpense = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        amount,
        category,
        note,
        date
    };

    expenses.push(newExpense);
    saveData(STORAGE_KEYS.EXPENSES, expenses);
    renderExpenses();
    expenseForm.reset();

    // Trigger insights update if function exists
    if (window.updateInsights) window.updateInsights();
};

/**
 * Deletes an individual expense
 */
const deleteExpense = (id) => {
    expenses = expenses.filter(exp => exp.id !== id);
    saveData(STORAGE_KEYS.EXPENSES, expenses);
    renderExpenses();
    if (window.updateInsights) window.updateInsights();
};

/**
 * Filters and renders the expense list
 */
const renderExpenses = () => {
    const filterMonth = filterMonthInput.value; // Format: YYYY-MM

    let filtered = expenses;
    if (filterMonth) {
        filtered = expenses.filter(exp => exp.date.startsWith(filterMonth));
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    expenseList.innerHTML = '';
    let monthlyTotal = 0;
    let wasteTotal = 0;

    filtered.forEach(exp => {
        monthlyTotal += exp.amount;
        if (exp.category === 'Waste') wasteTotal += exp.amount;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${exp.date}</td>
            <td>${exp.category}</td>
            <td>${exp.note}</td>
            <td>₹${exp.amount.toFixed(2)}</td>
            <td><button onclick="deleteExpense('${exp.id}')" style="background: var(--danger); padding: 0.3rem 0.6rem; font-size: 0.7rem;">Delete</button></td>
        `;
        expenseList.appendChild(row);
    });

    // Update Totals
    totalMonthlyDisplay.textContent = `₹${monthlyTotal.toFixed(2)}`;

    // SHOW/HIDE STATE CONTAINERS
    const emptyState = document.getElementById('expense-empty-state');
    const warningState = document.getElementById('expense-warning-state');
    const criticalState = document.getElementById('expense-critical-state');
    const table = document.getElementById('expense-table');

    if (filtered.length === 0) {
        // EMPTY STATE: No expenses yet
        emptyState.style.display = 'flex';
        warningState.style.display = 'none';
        criticalState.style.display = 'none';
        table.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        table.style.display = 'table';

        // Collect warning/critical issues
        const warningIssues = [];
        const criticalIssues = [];

        // WARNING: High waste spending (> 15% of budget)
        const wasteLimit = monthlyBudget * 0.15;
        if (wasteTotal > wasteLimit && wasteTotal <= monthlyBudget * 0.2) {
            warningIssues.push(`💸 Waste spending is high (₹${wasteTotal.toFixed(0)})`);
        }

        // CRITICAL: Waste exceeded (> 20% of budget)
        const criticalWasteLimit = monthlyBudget * 0.2;
        if (wasteTotal > criticalWasteLimit) {
            criticalIssues.push(`🚨 Waste spending exceeded limit (₹${wasteTotal.toFixed(0)} > ₹${criticalWasteLimit.toFixed(0)})`);
        }

        // DISPLAY STATE
        if (criticalIssues.length > 0) {
            criticalState.style.display = 'flex';
            warningState.style.display = 'none';
            document.getElementById('waste-critical-amount').innerHTML =
                criticalIssues.map(msg => `<p>${msg}</p>`).join('');
        } else if (warningIssues.length > 0) {
            warningState.style.display = 'flex';
            criticalState.style.display = 'none';
            document.getElementById('expense-warning-messages').innerHTML =
                warningIssues.map(msg => `<p>${msg}</p>`).join('');
        } else {
            warningState.style.display = 'none';
            criticalState.style.display = 'none';
        }
    }

    // Calculate Remaining Amount
    const remainingAmount = monthlyBudget - monthlyTotal;
    const remainingColor = remainingAmount >= 0 ? 'var(--success)' : 'var(--danger)';
    remainingAmountDisplay.textContent = `₹${remainingAmount.toFixed(2)}`;
    remainingAmountDisplay.style.color = remainingColor;

    // Leak Detection logic
    if (wasteTotal > 0) {
        leakDetectionDisplay.textContent = `LEAK DETECTED: ₹${wasteTotal.toFixed(2)} spent on Waste.`;
        leakDetectionDisplay.style.color = 'var(--danger)';
    } else {
        leakDetectionDisplay.textContent = 'Clear';
        leakDetectionDisplay.style.color = 'var(--success)';
    }
};

/**
 * Clears all expenses for a specific selected month
 */
const clearSelectedMonth = () => {
    const filterMonth = filterMonthInput.value;
    if (!filterMonth) return;

    expenses = expenses.filter(exp => !exp.date.startsWith(filterMonth));
    saveData(STORAGE_KEYS.EXPENSES, expenses);
    renderExpenses();
    if (window.updateInsights) window.updateInsights();
};

// Initialize DOM Elements and Event Listeners on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    expenseForm = document.getElementById('expense-form');
    expenseList = document.getElementById('expense-list');
    totalMonthlyDisplay = document.getElementById('total-monthly-amount');
    leakDetectionDisplay = document.getElementById('leak-detection');
    filterMonthInput = document.getElementById('filter-month');
    clearMonthBtn = document.getElementById('clear-month-btn');
    remainingAmountDisplay = document.getElementById('remaining-amount');
    budgetInput = document.getElementById('budget-input');
    setBudgetBtn = document.getElementById('set-budget-btn');
    expenseCategorySelect = document.getElementById('expense-category');
    categoryPreview = document.getElementById('category-preview');
    wasteWarning = document.getElementById('waste-warning');

    // Set initial budget value in input
    budgetInput.value = monthlyBudget;

    // Attach event listeners
    expenseForm.addEventListener('submit', addExpense);
    filterMonthInput.addEventListener('change', renderExpenses);
    clearMonthBtn.addEventListener('click', clearSelectedMonth);
    setBudgetBtn.addEventListener('click', setBudget);
    expenseCategorySelect.addEventListener('change', updateCategoryPreview);

    // Initial Render
    renderExpenses();

});
