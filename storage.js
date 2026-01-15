/**
 * Personal Control System - Storage Module
 * STRICT RULE: No other module should directly access localStorage.
 */

const STORAGE_KEYS = {
    EXPENSES: 'pcs_expenses',
    HABITS: 'pcs_habits',
    TIME_LOGS: 'pcs_timeLogs'
};

/**
 * Saves data to localStorage
 * @param {string} key - Use STORAGE_KEYS
 * @param {any} value - Data to be stringified
 */
const saveData = (key, value) => {
    try {
        const serializedValue = JSON.stringify(value);
        localStorage.setItem(key, serializedValue);
    } catch (error) {
        console.error("Error saving to storage:", error);
    }
};

/**
 * Retrieves data from localStorage
 * @param {string} key - Use STORAGE_KEYS
 * @returns {any|null} Parsed data or null if not found
 */
const getData = (key) => {
    try {
        const serializedValue = localStorage.getItem(key);
        return serializedValue ? JSON.parse(serializedValue) : null;
    } catch (error) {
        console.error("Error reading from storage:", error);
        return null;
    }
};

/**
 * Removes a specific key from localStorage
 * @param {string} key - Use STORAGE_KEYS
 */
const removeData = (key) => {
    localStorage.removeItem(key);
};

/**
 * Resets all application data
 */
const clearAllAppData = () => {
    Object.values(STORAGE_KEYS).forEach(key => removeData(key));
    window.location.reload();
};