// --- Global State Variables ---
let buyCount = 0; // Total accumulated buys
let sellCount = 0; // Total accumulated sells
let selectedBuy = 0; // Buys currently in the pending selection area
let selectedSell = 0; // Sells currently in the pending selection area
let selectionStack = []; // Stores individual actions for the undo functionality

// Data storage for various sections
let historyList = []; // Stores simplified text entries of past analyses for 'Recent Flows'
let historyWithNotes = []; // Stores detailed objects of past analyses with user notes for 'Detailed Entry History Notes'
let journalEntries = []; // Stores detailed trade logs for the 'Trading Journal'

// Configurable trading parameters, can be customized and extended by the user
let customParameters = [
    { id: 'btt', label: 'BTT', value: 1.0, subText: null },
    { id: 'futlevel', label: 'FUTLEVEL', value: 1.0, subText: null },
    { id: 'vsa', label: 'VSA', value: 1.0, subText: '(0.5 for weak signs)' },
    { id: 'vlevel', label: 'VLEVEL', value: 1.0, subText: '(0.5 for derivations)' },
    { id: 'wfutlevel', label: 'WFUTLEVEL', value: 0.5, subText: null },
    { id: 'mtf-confirmation', label: 'MTF CONFIRMATION', value: 1.0, subText: '(0.5=Down TF + 0.5=Up TF)' }
];

// --- DOM Element References ---
// Centralized references to all necessary DOM elements for efficient access
const DOMElements = {
    // Header & Global Controls
    liveClock: document.getElementById('live-clock'),
    timezoneClocksContainer: document.getElementById('timezone-clocks'), // Container for dynamic timezone clocks
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),
    aboutBtn: document.querySelector('.btn-about'), // The About button (anchor tag)

    // Trade Flow Input Section
    buyInput: document.getElementById('buy-input'),
    sellInput: document.getElementById('sell-input'),
    incrementButtons: document.querySelectorAll('.btn-increment'), // All increment buttons (+0.5)
    deductButtons: document.querySelectorAll('.btn-deduct'),     // All deduct buttons (-0.5)
    submitEntriesBtn: document.getElementById('submitEntriesBtn'),
    resetCurrentBtn: document.getElementById('resetCurrentBtn'),
    undoLastActionBtn: document.getElementById('undoLastActionBtn'),
    selectedBuyDisplay: document.getElementById('selected-buy'),
    selectedSellDisplay: document.getElementById('selected-sell'),

    // Market Sentiment Analysis Section
    buyCountDisplay: document.getElementById('buy-count'),
    sellCountDisplay: document.getElementById('sell-count'),
    differenceDisplay: document.getElementById('difference'),
    percentageDisplay: document.getElementById('percentage'),
    conclusionText: document.getElementById('conclusion'),
    sentimentBadge: document.getElementById('sentiment-badge'),
    analysisConclusionArea: document.getElementById('analysis-conclusion-area'), // Area to animate on update

    // Recent Flows (History) Section
    historyContainer: document.getElementById('history'),

    // Collapsible Notes & Parameters & Journal Panel
    toggleNotesParamsBtn: document.getElementById('toggleNotesParamsBtn'), // The header that acts as a toggle
    notesParamsContent: document.getElementById('notes-params-content'),   // The content div that collapses/expands

    // Detailed Entry History Notes Sub-section
    historyWithNotesContainer: document.getElementById('historyWithNotes'),
    noteSearchInput: document.getElementById('note-search'), // Search bar for notes

    // Custom Trading Parameters Sub-section
    parameterGrid: document.getElementById('parameter-grid'),
    newParamLabelInput: document.getElementById('new-param-label'),
    newParamValueInput: document.getElementById('new-param-value'),
    addParameterBtn: document.getElementById('addParameterBtn'),

    // Trading Journal Form Sub-section
    journalEntriesContainer: document.getElementById('journal-entries'),
    tradeInstrumentInput: document.getElementById('trade-instrument'),
    tradeEntryPriceInput: document.getElementById('trade-entry-price'),
    tradeExitPriceInput: document.getElementById('trade-exit-price'),
    tradePnlInput: document.getElementById('trade-pnl'),
    tradeDateInput: document.getElementById('trade-date'),
    tradeNotesInput: document.getElementById('trade-notes'),
    saveTradeBtn: document.getElementById('saveTradeBtn'),
    clearJournalFormBtn: document.getElementById('clearJournalFormBtn'),
    clearJournalBtn: document.getElementById('clearJournalBtn'),

    // Static News Feed (no dynamic functionality)
    newsFeedContainer: document.getElementById('news-feed'),
};

// --- Constants for Local Storage Keys and UI Styling ---
const STORAGE_KEYS = {
    BUY_COUNT: 'qf_buyCount', // Unique keys to prevent conflicts
    SELL_COUNT: 'qf_sellCount',
    HISTORY_LIST: 'qf_historyList',
    HISTORY_WITH_NOTES: 'qf_historyWithNotes',
    JOURNAL_ENTRIES: 'qf_journalEntries',
    CUSTOM_PARAMETERS: 'qf_customParameters'
};

const SENTIMENT_STYLES = {
    'STRONG BUY': { className: 'strong-buy', msg: '📈 STRONG BUY' },
    'STRONG SELL': { className: 'strong-sell', msg: '📉 STRONG SELL' },
    'BUY RETRACEMENT EXPECTED': { className: 'buy-retracement', msg: '↘️ BUY RETRACEMENT' },
    'SELL RETRACEMENT EXPECTED': { className: 'sell-retracement', msg: '↗️ SELL RETRACEMENT' },
    'NORMAL BUY': { className: 'normal-buy', msg: '✅ NORMAL BUY' },
    'NORMAL SELL': { className: 'normal-sell', msg: '❌ NORMAL SELL' },
    'BOTH ARE EQUAL': { className: 'neutral', msg: '⚖️ NEUTRAL' },
    'NO SIGNAL': { className: 'no-signal', msg: 'NO SIGNAL' }
};

// Configuration for multiple timezone clocks
const TIMEZONE_CITIES = [
    { label: 'IST', timezone: 'Asia/Kolkata', icon: 'fas fa-sun' },
    { label: 'LDN', timezone: 'Europe/London', icon: 'fas fa-globe-europe' },
    { label: 'NY', timezone: 'America/New_York', icon: 'fas fa-city' },
    { label: 'TYO', timezone: 'Asia/Tokyo', icon: 'fas fa-yen-sign' },
    { label: 'SYD', timezone: 'Australia/Sydney', icon: 'fas fa-globe-asia' },
    { label: 'UTC', timezone: 'UTC', icon: 'fas fa-globe' }
];

// --- Application Initialization on Page Load ---
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    loadStateFromLocalStorage(); // Load any previously saved data
    renderTimezoneClocks();     // Dynamically create the HTML elements for timezone clocks
    updateAllDisplays();        // Update the UI with initial data
    setupEventListeners();      // Attach all necessary event listeners
    startClocks();              // Start the live clock updates
}

// --- Local Storage Management ---
function loadStateFromLocalStorage() {
    // Retrieve and parse data from localStorage, defaulting to 0 or empty arrays/objects if not found
    buyCount = parseFloat(localStorage.getItem(STORAGE_KEYS.BUY_COUNT)) || 0;
    sellCount = parseFloat(localStorage.getItem(STORAGE_KEYS.SELL_COUNT)) || 0;

    historyList = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_LIST)) || [];
    historyWithNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_WITH_NOTES)) || [];
    journalEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES)) || [];

    const storedParams = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_PARAMETERS));
    // If custom parameters were saved and not empty, use them; otherwise, keep defaults
    if (storedParams && storedParams.length > 0) {
        customParameters = storedParams;
    }
}

function saveStateToLocalStorage() {
    // Save current application state to localStorage
    localStorage.setItem(STORAGE_KEYS.BUY_COUNT, buyCount.toString());
    localStorage.setItem(STORAGE_KEYS.SELL_COUNT, sellCount.toString());
    localStorage.setItem(STORAGE_KEYS.HISTORY_LIST, JSON.stringify(historyList));
    localStorage.setItem(STORAGE_KEYS.HISTORY_WITH_NOTES, JSON.stringify(historyWithNotes));
    localStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(journalEntries));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PARAMETERS, JSON.stringify(customParameters));
}

// --- UI Update Functions ---
// Updates the display for pending buy/sell selections and their input fields
function updateSelectionDisplay() {
    DOMElements.selectedBuyDisplay.innerText = selectedBuy.toFixed(1);
    DOMElements.selectedSellDisplay.innerText = selectedSell.toFixed(1);
    DOMElements.buyInput.value = selectedBuy.toFixed(1);
    DOMElements.sellInput.value = selectedSell.toFixed(1);
}

// Updates the main analysis display (total buys/sells, difference, percentage, conclusion)
function updateAnalysisDisplay() {
    const total = buyCount + sellCount;
    const difference = Math.abs(buyCount - sellCount);
    // Calculate percentage, handling division by zero for initial state
    const percentage = total ? ((difference / total) * 100).toFixed(2) : 0;

    let conclusion = '';
    // Determine the market sentiment conclusion based on counts and percentage
    if (total === 0 && buyCount === 0 && sellCount === 0) {
        conclusion = 'NO SIGNAL'; // When no entries have been submitted yet
    } else if (buyCount === sellCount) {
        conclusion = 'BOTH ARE EQUAL';
    } else if (percentage <= 25) { // Low percentage difference indicates potential retracement
        conclusion = buyCount > sellCount ? 'BUY RETRACEMENT EXPECTED' : 'SELL RETRACEMENT EXPECTED';
    } else if (percentage > 66) { // High percentage difference indicates strong trend
        conclusion = buyCount > sellCount ? 'STRONG BUY' : 'STRONG SELL';
    } else { // Moderate percentage difference indicates normal trend
        conclusion = buyCount > sellCount ? 'NORMAL BUY' : 'NORMAL SELL';
    }

    // Update the DOM elements with calculated values and conclusion
    DOMElements.buyCountDisplay.innerText = buyCount.toFixed(1);
    DOMElements.sellCountDisplay.innerText = sellCount.toFixed(1);
    DOMElements.differenceDisplay.innerText = difference.toFixed(1);
    DOMElements.percentageDisplay.innerText = `${percentage}%`;
    DOMElements.conclusionText.innerText = `Conclusion: ${conclusion}`;

    // Apply specific styling and text based on the conclusion
    const style = SENTIMENT_STYLES[conclusion] || SENTIMENT_STYLES['NO SIGNAL'];
    DOMElements.sentimentBadge.className = `sentiment-badge ${style.className}`;
    DOMElements.sentimentBadge.innerText = style.msg;

    // Trigger the highlight animation on the analysis conclusion area for visual feedback
    // By removing and immediately re-adding the class, the animation restarts.
    DOMElements.analysisConclusionArea.classList.remove('highlight');
    void DOMElements.analysisConclusionArea.offsetWidth; // Force reflow for animation restart
    DOMElements.analysisConclusionArea.classList.add('highlight');
}

// Updates the simplified history list in the 'Recent Flows' section
function updateHistoryDisplay() {
    if (historyList.length === 0) {
        DOMElements.historyContainer.innerHTML = '<p class="text-center text-text-dark py-4">No entries yet.</p>';
        return;
    }
    DOMElements.historyContainer.innerHTML = historyList.map(entry =>
        `<div class="history-item fade-in">
            <div class="history-data">${entry}</div>
        </div>`
    ).join('');
}

// Updates the detailed history with notes, including search/filter functionality
function updateHistoryWithNotesDisplay(searchTerm = '') {
    // Filter history entries based on the search term (case-insensitive)
    const filteredHistory = historyWithNotes.filter(entry =>
        (entry.noteTitle && entry.noteTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.note && entry.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.conclusion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.timestamp.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Display appropriate message if no entries or no matches found
    if (filteredHistory.length === 0 && searchTerm === '') {
        DOMElements.historyWithNotesContainer.innerHTML = '<p class="text-center text-text-dark py-4">No detailed entries yet.</p>';
        return;
    } else if (filteredHistory.length === 0 && searchTerm !== '') {
        DOMElements.historyWithNotesContainer.innerHTML = '<p class="text-center text-text-dark py-4">No matching entries found.</p>';
        return;
    }

    // Render the filtered history entries with editable note titles and content
    DOMElements.historyWithNotesContainer.innerHTML = filteredHistory.map(entry => `
        <div class="history-item">
            <div class="history-timestamp">${entry.timestamp}</div>
            <div class="history-title-input-group">
                <input type="text"
                    class="history-title-input"
                    placeholder="Entry Title (e.g., 'Pre-Earnings Analysis')"
                    data-entry-id="${entry.id}"
                    data-field="noteTitle"
                    value="${entry.noteTitle || ''}"
                    onchange="updateNoteField(${entry.id}, 'noteTitle', this.value)">
            </div>
            <div class="history-data">
                ${entry.conclusion} | BUYS: ${entry.buyCount.toFixed(1)} | SELLS: ${entry.sellCount.toFixed(1)} | %DIFF: ${entry.percentage}%
            </div>
            <textarea
                class="text-input"
                rows="3"
                placeholder="Add your trading notes for this entry..."
                data-entry-id="${entry.id}"
                data-field="note"
                onchange="updateNoteField(${entry.id}, 'note', this.value)"
            >${entry.note || ''}</textarea>
        </div>
    `).join('');
}

// Updates a specific field (note title or content) for a history entry
function updateNoteField(entryId, field, value) {
    const entry = historyWithNotes.find(h => h.id === entryId);
    if (entry) {
        entry[field] = value;
        saveStateToLocalStorage(); // Save changes to local storage
    }
}

// Updates the display of logged journal entries
function updateJournalDisplay() {
    if (journalEntries.length === 0) {
        DOMElements.journalEntriesContainer.innerHTML = '<p class="text-center text-text-dark py-4">No trades logged yet.</p>';
        return;
    }
    DOMElements.journalEntriesContainer.innerHTML = journalEntries.map(entry => `
        <div class="journal-item">
            <div class="journal-entry-header">
                <span class="journal-entry-instrument">${entry.instrument || 'N/A'}</span>
                <span class="journal-entry-date">${entry.date || 'N/A'}</span>
            </div>
            <div class="journal-entry-price-pnl">
                <span>Entry: ${entry.entryPrice !== null ? entry.entryPrice.toFixed(2) : 'N/A'}</span>
                <span>Exit: ${entry.exitPrice !== null ? entry.exitPrice.toFixed(2) : 'N/A'}</span>
                <span style="color: ${entry.pnl >= 0 ? 'var(--color-accent-green)' : 'var(--color-accent-red)'};">P/L: $${entry.pnl !== null ? entry.pnl.toFixed(2) : 'N/A'}</span>
            </div>
            <div class="journal-entry-notes">${entry.notes || ''}</div>
        </div>
    `).join('');
}

// Updates the display of custom trading parameters
function updateParametersDisplay() {
    if (customParameters.length === 0) {
        DOMElements.parameterGrid.innerHTML = '<p class="text-center text-text-dark py-4 col-span-full">No parameters added yet.</p>';
        return;
    }
    DOMElements.parameterGrid.innerHTML = customParameters.map(param => `
        <div class="parameter-item">
            <button class="delete-param-btn" data-param-id="${param.id}" title="Remove Parameter"><i class="fas fa-times"></i></button>
            <div class="parameter-value text-accent-yellow">${param.value.toFixed(1)}</div>
            <div class="parameter-label">
                ${param.label}
                ${param.subText ? `<span class="sub-text">${param.subText}</span>` : ''}
            </div>
        </div>
    `).join('');

    // Attach event listeners to newly rendered delete buttons for parameters
    DOMElements.parameterGrid.querySelectorAll('.delete-param-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const paramId = event.currentTarget.dataset.paramId;
            removeParameter(paramId);
        });
    });
}

// Calls all UI update functions to refresh the entire display
function updateAllDisplays() {
    updateSelectionDisplay();
    updateAnalysisDisplay();
    updateHistoryDisplay();
    updateJournalDisplay();
    updateParametersDisplay();
}

// --- Core Action Handlers ---
// Records an action (increment/decrement) for pending buy/sell
function recordAction(type, change) {
    if (type === 'buy') {
        selectedBuy = Math.max(0, parseFloat((selectedBuy + change).toFixed(1))); // Ensure non-negative and 1 decimal place
    } else if (type === 'sell') {
        selectedSell = Math.max(0, parseFloat((selectedSell + change).toFixed(1))); // Ensure non-negative and 1 decimal place
    }
    selectionStack.push({ type: type, change: change }); // Push action to stack for undo
    updateSelectionDisplay();
}

// Handles direct input changes from the number fields
function handleInputChanges(type, event) {
    let value = parseFloat(event.target.value);
    if (isNaN(value)) value = 0;
    value = parseFloat(value.toFixed(1)); // Ensure 1 decimal place precision

    // For undo, store the original value before the direct input change
    if (type === 'buy') {
        const oldValue = selectedBuy;
        selectedBuy = value;
        selectionStack.push({ type: 'input_buy', original: oldValue, new: value });
    } else if (type === 'sell') {
        const oldValue = selectedSell;
        selectedSell = value;
        selectionStack.push({ type: 'input_sell', original: oldValue, new: value });
    }
    updateSelectionDisplay();
}

// Reverts the last action performed (increment/decrement or direct input)
function undoLastAction() {
    const lastAction = selectionStack.pop(); // Get the last action from the stack

    if (!lastAction) return; // No actions to undo

    if (lastAction.type === 'buy') {
        selectedBuy = Math.max(0, parseFloat((selectedBuy - lastAction.change).toFixed(1)));
    } else if (lastAction.type === 'sell') {
        selectedSell = Math.max(0, parseFloat((selectedSell - lastAction.change).toFixed(1)));
    } else if (lastAction.type === 'input_buy') {
        selectedBuy = lastAction.original; // Revert to value before direct input
    } else if (lastAction.type === 'input_sell') {
        selectedSell = lastAction.original; // Revert to value before direct input
    }
    updateSelectionDisplay();
}

// Submits the pending buy/sell selections to the total counts and updates history
function submitEntries() {
    if (selectedBuy === 0 && selectedSell === 0) {
        alert('Please add some Buy or Sell flow before submitting.');
        return;
    }

    buyCount += selectedBuy;
    sellCount += selectedSell;

    const now = new Date();
    const timestamp = now.toLocaleString(); // Get current date and time string

    // Recalculate analysis metrics based on new total counts
    const total = buyCount + sellCount;
    const difference = Math.abs(buyCount - sellCount);
    const percentage = total ? ((difference / total) * 100).toFixed(2) : 0;

    let conclusion = '';
    // Determine the new market sentiment conclusion
    if (total === 0) { // If totals become zero after submission (e.g., if previous totals were reset)
        conclusion = 'NO SIGNAL';
    } else if (buyCount === sellCount) {
        conclusion = 'BOTH ARE EQUAL';
    } else if (percentage <= 25) {
        conclusion = buyCount > sellCount ? 'BUY RETRACEMENT EXPECTED' : 'SELL RETRACEMENT EXPECTED';
    } else if (percentage > 66) {
        conclusion = buyCount > sellCount ? 'STRONG BUY' : 'STRONG SELL';
    } else {
        conclusion = buyCount > sellCount ? 'NORMAL BUY' : 'NORMAL SELL';
    }

    // Prepare and add simplified history entry
    const historyEntry = `${timestamp} | ${conclusion} | BUYS: ${buyCount.toFixed(1)} | SELLS: ${sellCount.toFixed(1)} | %DIFF: ${percentage}%`;
    historyList.unshift(historyEntry); // Add to the beginning
    if (historyList.length > 30) {
        historyList.pop(); // Keep only the last 30 entries
    }

    // Prepare and add detailed history entry with new fields
    const detailedEntry = {
        id: Date.now(), // Unique ID for each entry (for note editing)
        timestamp: timestamp,
        conclusion: conclusion,
        buyCount: buyCount,
        sellCount: sellCount,
        percentage: percentage,
        noteTitle: '', // Initialize note title
        note: '' // Initialize note content
    };
    historyWithNotes.unshift(detailedEntry); // Add to the beginning
    if (historyWithNotes.length > 30) {
        historyWithNotes.pop(); // Keep only the last 30 entries
    }

    // Reset pending selections and the undo stack after successful submission
    selectedBuy = 0;
    selectedSell = 0;
    selectionStack = [];

    updateAllDisplays(); // Refresh all UI sections
    saveStateToLocalStorage(); // Persist changes
}

// Resets only the current pending buy/sell selections, not the total counts
function resetCurrentCounts() {
    if (!confirm('Are you sure you want to reset the current pending flow?')) {
        return;
    }
    selectedBuy = 0;
    selectedSell = 0;
    selectionStack = []; // Clear pending stack
    updateSelectionDisplay();
}

// Clears all stored data in the application (totals, history, journal, parameters)
function clearAllData() {
    if (!confirm('Are you sure you want to CLEAR ALL DATA (Total Counts, All History, All Journal Entries, Custom Parameters)? This action cannot be undone.')) {
        return;
    }
    // Reset all state variables to their initial defaults
    buyCount = 0;
    sellCount = 0;
    selectedBuy = 0;
    selectedSell = 0;
    selectionStack = [];
    historyList = [];
    historyWithNotes = [];
    journalEntries = [];
    // Reset custom parameters to their default hardcoded set
    customParameters = [
        { id: 'btt', label: 'BTT', value: 1.0, subText: null },
        { id: 'futlevel', label: 'FUTLEVEL', value: 1.0, subText: null },
        { id: 'vsa', label: 'VSA', value: 1.0, subText: '(0.5 for weak signs)' },
        { id: 'vlevel', label: 'VLEVEL', value: 1.0, subText: '(0.5 for derivations)' },
        { id: 'wfutlevel', label: 'WFUTLEVEL', value: 0.5, subText: null },
        { id: 'mtf-confirmation', label: 'MTF CONFIRMATION', value: 1.0, subText: '(0.5=Down TF + 0.5=Up TF)' }
    ];
    updateAllDisplays(); // Refresh all UI sections to reflect cleared state
    localStorage.clear(); // Clear all data from browser's local storage
}

// --- Press and Hold Logic for Increment/Deduct Buttons ---
let holdInterval; // Stores the interval ID for continuous action repetition
let holdTimeout; // Stores the timeout ID for the initial delay before repetition
const HOLD_INITIAL_DELAY = 300; // Time (ms) before the first repeat action
const HOLD_REPEAT_RATE = 100; // Time (ms) between subsequent repeat actions

function startHold(button, action, change) {
    stopHold(); // Clear any existing hold timers to prevent overlapping calls

    recordAction(action, change); // Perform the action immediately on mousedown/touchstart

    // Set a timeout: after an initial delay, start repeating the action at an interval
    holdTimeout = setTimeout(() => {
        holdInterval = setInterval(() => {
            recordAction(action, change);
        }, HOLD_REPEAT_RATE);
    }, HOLD_INITIAL_DELAY);
}

function stopHold() {
    clearTimeout(holdTimeout); // Clear the initial delay timeout
    clearInterval(holdInterval); // Clear the continuous repetition interval
}

// --- Custom Parameter Management Functions ---
function addParameter() {
    const label = DOMElements.newParamLabelInput.value.trim();
    let value = parseFloat(DOMElements.newParamValueInput.value);

    if (!label) {
        alert('Parameter label cannot be empty.');
        return;
    }
    if (isNaN(value)) {
        value = 0.0; // Default to 0.0 if value is not a valid number
    }

    const newParam = {
        id: 'custom-' + Date.now(), // Generate a unique ID for the new parameter
        label: label,
        value: parseFloat(value.toFixed(1)), // Ensure value is stored with 1 decimal place
        subText: null // New custom parameters don't have subText by default
    };

    customParameters.push(newParam); // Add the new parameter to the array
    DOMElements.newParamLabelInput.value = ''; // Clear label input
    DOMElements.newParamValueInput.value = 1.0; // Reset value input to default
    updateParametersDisplay(); // Refresh the parameters display
    saveStateToLocalStorage(); // Persist changes
}

function removeParameter(paramId) {
    if (!confirm('Are you sure you want to remove this parameter?')) {
        return; // User cancelled
    }
    // Filter out the parameter with the matching ID
    customParameters = customParameters.filter(param => param.id !== paramId);
    updateParametersDisplay(); // Refresh the display
    saveStateToLocalStorage(); // Persist changes
}

// --- Trading Journal Functions ---
function saveTrade() {
    // Get values from the journal form inputs
    const instrument = DOMElements.tradeInstrumentInput.value.trim();
    const entryPrice = parseFloat(DOMElements.tradeEntryPriceInput.value);
    const exitPrice = parseFloat(DOMElements.tradeExitPriceInput.value);
    const pnl = parseFloat(DOMElements.tradePnlInput.value);
    const date = DOMElements.tradeDateInput.value; // YYYY-MM-DD format from input
    const notes = DOMElements.tradeNotesInput.value.trim();

    // Basic validation
    if (!instrument || !date) {
        alert('Instrument and Date are required to log a trade.');
        return;
    }

    // Create a new trade object
    const newTrade = {
        id: Date.now(), // Unique ID
        instrument: instrument,
        entryPrice: isNaN(entryPrice) ? null : parseFloat(entryPrice.toFixed(2)),
        exitPrice: isNaN(exitPrice) ? null : parseFloat(exitPrice.toFixed(2)),
        pnl: isNaN(pnl) ? null : parseFloat(pnl.toFixed(2)),
        date: date,
        notes: notes
    };

    journalEntries.unshift(newTrade); // Add the new trade to the beginning of the array
    if (journalEntries.length > 50) { // Keep the journal size manageable
        journalEntries.pop();
    }
    updateJournalDisplay(); // Refresh the journal display
    saveStateToLocalStorage(); // Persist changes
    clearJournalForm(); // Reset the form fields
}

function clearJournalForm() {
    // Resets all journal form input fields
    DOMElements.tradeInstrumentInput.value = '';
    DOMElements.tradeEntryPriceInput.value = '';
    DOMElements.tradeExitPriceInput.value = '';
    DOMElements.tradePnlInput.value = '';
    DOMElements.tradeDateInput.value = new Date().toISOString().split('T')[0]; // Set date to today
    DOMElements.tradeNotesInput.value = '';
}

function clearJournal() {
    if (!confirm('Are you sure you want to clear ALL trading journal entries? This cannot be undone.')) {
        return; // User cancelled
    }
    journalEntries = []; // Empty the journal entries array
    updateJournalDisplay(); // Refresh the display
    saveStateToLocalStorage(); // Persist changes
}


// --- Event Listeners Setup ---
function setupEventListeners() {
    // Event listeners for increment/deduct buttons (with press-and-hold functionality)
    DOMElements.incrementButtons.forEach(button => {
        const action = button.dataset.action;
        const change = parseFloat(button.dataset.change);
        button.addEventListener('mousedown', () => startHold(button, action, change));
        button.addEventListener('mouseup', stopHold);
        button.addEventListener('mouseleave', stopHold); // Stop if mouse leaves button while held
        button.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(button, action, change); }, { passive: false }); // Prevent default touch scroll
        button.addEventListener('touchend', stopHold);
        button.addEventListener('touchcancel', stopHold);
    });

    DOMElements.deductButtons.forEach(button => {
        const action = button.dataset.action;
        const change = parseFloat(button.dataset.change);
        button.addEventListener('mousedown', () => startHold(button, action, change));
        button.addEventListener('mouseup', stopHold);
        button.addEventListener('mouseleave', stopHold);
        button.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(button, action, change); }, { passive: false });
        button.addEventListener('touchend', stopHold);
        button.addEventListener('touchcancel', stopHold);
    });

    // Event listeners for direct input fields (buy/sell)
    DOMElements.buyInput.addEventListener('input', (e) => handleInputChanges('buy', e));
    DOMElements.sellInput.addEventListener('input', (e) => handleInputChanges('sell', e));

    // Event listeners for main action buttons
    DOMElements.submitEntriesBtn.addEventListener('click', submitEntries);
    DOMElements.resetCurrentBtn.addEventListener('click', resetCurrentCounts);
    DOMElements.undoLastActionBtn.addEventListener('click', undoLastAction);
    DOMElements.clearAllDataBtn.addEventListener('click', clearAllData); // Global clear button

    // Event listener for the collapsible panel header (Notes & Parameters & Journal)
    DOMElements.toggleNotesParamsBtn.addEventListener('click', () => {
        DOMElements.notesParamsContent.classList.toggle('active'); // Toggles the 'active' class
        // When expanding, ensure dynamic content within is refreshed
        if (DOMElements.notesParamsContent.classList.contains('active')) {
            updateHistoryWithNotesDisplay(DOMElements.noteSearchInput.value);
            updateParametersDisplay();
            updateJournalDisplay();
        }
    });

    // Event listener for the notes search bar
    DOMElements.noteSearchInput.addEventListener('input', (e) => updateHistoryWithNotesDisplay(e.target.value));

    // Event listener for adding new custom parameters
    DOMElements.addParameterBtn.addEventListener('click', addParameter);

    // Event listeners for Trading Journal buttons
    DOMElements.saveTradeBtn.addEventListener('click', saveTrade);
    DOMElements.clearJournalFormBtn.addEventListener('click', clearJournalForm);
    DOMElements.clearJournalBtn.addEventListener('click', clearJournal);

    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Prevent shortcuts from triggering if user is actively typing in an input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Allow 'Escape' to close the collapsible panel even if typing
            if (e.key === 'Escape' && DOMElements.notesParamsContent.classList.contains('active')) {
                DOMElements.notesParamsContent.classList.remove('active');
                e.target.blur(); // Remove focus from the input field
            }
            return; // Exit function if typing
        }

        // Handle other general keyboard shortcuts
        if (e.key === 'Enter') {
            submitEntries();
        } else if (e.key.toLowerCase() === 'b') {
            recordAction('buy', 0.5);
        } else if (e.key.toLowerCase() === 's') {
            recordAction('sell', 0.5);
        } else if (e.key.toLowerCase() === 'r') {
            resetCurrentCounts();
        } else if (e.key.toLowerCase() === 'i') { // 'I' for Info/Parameters section toggle
            DOMElements.notesParamsContent.classList.toggle('active');
        } else if (e.key === 'Escape') { // Close collapsible with escape
            if (DOMElements.notesParamsContent.classList.contains('active')) {
                DOMElements.notesParamsContent.classList.remove('active');
            }
        }
    });

    // Auto-save state to local storage just before the page is unloaded
    window.addEventListener('beforeunload', saveStateToLocalStorage);
}

// --- Live Clocks Functions ---
// Dynamically renders the HTML elements for each timezone clock
function renderTimezoneClocks() {
    DOMElements.timezoneClocksContainer.innerHTML = TIMEZONE_CITIES.map(tz => `
        <div class="time-zone">
            <span class="time-label"><i class="${tz.icon}"></i> ${tz.label}:</span>
            <span class="time-value" id="${tz.label.toLowerCase().replace(/[^a-z0-9]/g, '')}-time">--:--:-- --</span>
        </div>
    `).join('');
}

// Updates the displayed time for the local clock and all timezone clocks
function updateClocks() {
    const now = new Date(); // Get current date and time

    // Update the local live clock
    DOMElements.liveClock.innerText = now.toLocaleTimeString();

    // Update each specific timezone clock
    TIMEZONE_CITIES.forEach(tz => {
        // Construct the unique ID for each timezone span element
        const elementId = `${tz.label.toLowerCase().replace(/[^a-z0-9]/g, '')}-time`;
        const element = document.getElementById(elementId);

        if (element) {
            // Format time specifically for each timezone, including AM/PM (hour12: true)
            element.innerText = now.toLocaleTimeString('en-US', {
                timeZone: tz.timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } else {
            // Log a warning if an element isn't found (useful for debugging)
            console.warn(`Timezone element not found for ID: ${elementId}`);
        }
    });
}

// Starts the interval to update clocks every second
function startClocks() {
    updateClocks(); // Call once immediately to display time on load
    setInterval(updateClocks, 1000); // Set interval for continuous updates
}
