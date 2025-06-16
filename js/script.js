// --- State Variables ---
let buyCount = 0;
let sellCount = 0;
let selectedBuy = 0;
let selectedSell = 0;
let selectionStack = []; // Stores actions for undo functionality
let historyList = []; // Simple text history for "Recent Flows"
let historyWithNotes = []; // Detailed history with notes for "Notes & Parameters"
let journalEntries = []; // Trading journal entries
let customParameters = [ // Default parameters
    { id: 'btt', label: 'BTT', value: 1.0, subText: null },
    { id: 'futlevel', label: 'FUTLEVEL', value: 1.0, subText: null },
    { id: 'vsa', label: 'VSA', value: 1.0, subText: '(0.5 for weak signs)' },
    { id: 'vlevel', label: 'VLEVEL', value: 1.0, subText: '(0.5 for derivations)' },
    { id: 'wfutlevel', label: 'WFUTLEVEL', value: 0.5, subText: null },
    { id: 'mtf-confirmation', label: 'MTF CONFIRMATION', value: 1.0, subText: '(0.5=Down TF + 0.5=Up TF)' }
];

// --- DOM Elements ---
const DOMElements = {
    // Header & Time
    liveClock: document.getElementById('live-clock'),
    timezoneClocksContainer: document.getElementById('timezone-clocks'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),
    aboutBtn: document.querySelector('.btn-about'), // Select the new About button

    // Input & Actions
    buyInput: document.getElementById('buy-input'),
    sellInput: document.getElementById('sell-input'),
    incrementButtons: document.querySelectorAll('.btn-increment'),
    deductButtons: document.querySelectorAll('.btn-deduct'),
    submitEntriesBtn: document.getElementById('submitEntriesBtn'),
    resetCurrentBtn: document.getElementById('resetCurrentBtn'),
    undoLastActionBtn: document.getElementById('undoLastActionBtn'),
    selectedBuyDisplay: document.getElementById('selected-buy'),
    selectedSellDisplay: document.getElementById('selected-sell'),

    // Analysis Display
    buyCountDisplay: document.getElementById('buy-count'),
    sellCountDisplay: document.getElementById('sell-count'),
    differenceDisplay: document.getElementById('difference'),
    percentageDisplay: document.getElementById('percentage'),
    conclusionText: document.getElementById('conclusion'),
    sentimentBadge: document.getElementById('sentiment-badge'),
    analysisConclusionArea: document.getElementById('analysis-conclusion-area'), // New ID to target for animation

    // Recent Flows (History)
    historyContainer: document.getElementById('history'),

    // Collapsible Notes & Parameters Section
    toggleNotesParamsBtn: document.getElementById('toggleNotesParamsBtn'), // The header to click
    notesParamsContent: document.getElementById('notes-params-content'), // The content to collapse/expand

    // Detailed History with Notes
    historyWithNotesContainer: document.getElementById('historyWithNotes'),
    noteSearchInput: document.getElementById('note-search'),

    // Parameter Management
    parameterGrid: document.getElementById('parameter-grid'),
    newParamLabelInput: document.getElementById('new-param-label'),
    newParamValueInput: document.getElementById('new-param-value'),
    addParameterBtn: document.getElementById('addParameterBtn'),

    // Trading Journal (within collapsible section)
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

    // News Feed (Placeholder)
    newsFeedContainer: document.getElementById('news-feed'),
};

// --- Constants ---
const STORAGE_KEYS = {
    BUY_COUNT: 'buyCount',
    SELL_COUNT: 'sellCount',
    HISTORY_LIST: 'historyList',
    HISTORY_WITH_NOTES: 'historyWithNotes',
    JOURNAL_ENTRIES: 'journalEntries',
    CUSTOM_PARAMETERS: 'customParameters'
};

const SENTIMENT_STYLES = {
    'STRONG BUY': { className: 'strong-buy', msg: '📈 STRONG BUY' },
    'STRONG SELL': { className: 'strong-sell', msg: '📉 STRONG SELL' },
    'BUY RETRACEMENT EXPECTED': { className: 'buy-retracement', msg: '↘️ BUY RETRACEMENT' },
    'SELL RETRACEMENT EXPECTED': { className: 'sell-retracement', msg: '↗️ SELL RETRACEMENT' }, // Corrected msg
    'NORMAL BUY': { className: 'normal-buy', msg: '✅ NORMAL BUY' },
    'NORMAL SELL': { className: 'normal-sell', msg: '❌ NORMAL SELL' },
    'BOTH ARE EQUAL': { className: 'neutral', msg: '⚖️ NEUTRAL' },
    'NO SIGNAL': { className: 'no-signal', msg: 'NO SIGNAL' }
};

const TIMEZONE_CITIES = [
    { label: 'IST', timezone: 'Asia/Kolkata', icon: 'fas fa-sun' },
    { label: 'LDN', timezone: 'Europe/London', icon: 'fas fa-globe-europe' },
    { label: 'NY', timezone: 'America/New_York', icon: 'fas fa-city' },
    { label: 'TYO', timezone: 'Asia/Tokyo', icon: 'fas fa-yen-sign' },
    { label: 'SYD', timezone: 'Australia/Sydney', icon: 'fas fa-globe-asia' },
    { label: 'UTC', timezone: 'UTC', icon: 'fas fa-globe' } // UTC is a valid timezone name
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    loadStateFromLocalStorage();
    renderTimezoneClocks(); // Render timezone elements once
    updateAllDisplays();
    setupEventListeners();
    startClocks();
    // DOMElements.notesParamsContent.classList.add('active'); // Start collapsed as per new requirement
}

function loadStateFromLocalStorage() {
    buyCount = parseFloat(localStorage.getItem(STORAGE_KEYS.BUY_COUNT)) || 0;
    sellCount = parseFloat(localStorage.getItem(STORAGE_KEYS.SELL_COUNT)) || 0;
    historyList = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_LIST)) || [];
    historyWithNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_WITH_NOTES)) || [];
    journalEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES)) || [];

    const storedParams = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_PARAMETERS));
    if (storedParams && storedParams.length > 0) { // Only load if not empty
        customParameters = storedParams;
    }
}

function saveStateToLocalStorage() {
    localStorage.setItem(STORAGE_KEYS.BUY_COUNT, buyCount);
    localStorage.setItem(STORAGE_KEYS.SELL_COUNT, sellCount);
    localStorage.setItem(STORAGE_KEYS.HISTORY_LIST, JSON.stringify(historyList));
    localStorage.setItem(STORAGE_KEYS.HISTORY_WITH_NOTES, JSON.stringify(historyWithNotes));
    localStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(journalEntries));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PARAMETERS, JSON.stringify(customParameters));
}

// --- UI Update Functions ---
function updateSelectionDisplay() {
    DOMElements.selectedBuyDisplay.innerText = selectedBuy.toFixed(1);
    DOMElements.selectedSellDisplay.innerText = selectedSell.toFixed(1);
    DOMElements.buyInput.value = selectedBuy.toFixed(1);
    DOMElements.sellInput.value = selectedSell.toFixed(1);
}

function updateAnalysisDisplay() {
    const total = buyCount + sellCount;
    const difference = Math.abs(buyCount - sellCount);
    const percentage = total ? ((difference / total) * 100).toFixed(2) : 0;

    let conclusion = '';
    if (buyCount === sellCount && total === 0) {
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

    DOMElements.buyCountDisplay.innerText = buyCount.toFixed(1);
    DOMElements.sellCountDisplay.innerText = sellCount.toFixed(1);
    DOMElements.differenceDisplay.innerText = difference.toFixed(1);
    DOMElements.percentageDisplay.innerText = `${percentage}%`;
    DOMElements.conclusionText.innerText = `Conclusion: ${conclusion}`;

    const style = SENTIMENT_STYLES[conclusion] || SENTIMENT_STYLES['NO SIGNAL'];
    DOMElements.sentimentBadge.className = `sentiment-badge ${style.className}`;
    DOMElements.sentimentBadge.innerText = style.msg;

    // Trigger highlight animation on the analysis conclusion area
    DOMElements.analysisConclusionArea.classList.remove('highlight'); // Remove to re-trigger
    void DOMElements.analysisConclusionArea.offsetWidth; // Trigger reflow
    DOMElements.analysisConclusionArea.classList.add('highlight'); // Add to start animation
}

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

function updateHistoryWithNotesDisplay(searchTerm = '') {
    const filteredHistory = historyWithNotes.filter(entry =>
        (entry.noteTitle && entry.noteTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.note && entry.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.conclusion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.timestamp.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredHistory.length === 0 && searchTerm === '') {
        DOMElements.historyWithNotesContainer.innerHTML = '<p class="text-center text-text-dark py-4">No detailed entries yet.</p>';
        return;
    } else if (filteredHistory.length === 0 && searchTerm !== '') {
        DOMElements.historyWithNotesContainer.innerHTML = '<p class="text-center text-text-dark py-4">No matching entries found.</p>';
        return;
    }

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

function updateNoteField(entryId, field, value) {
    const entry = historyWithNotes.find(h => h.id === entryId);
    if (entry) {
        entry[field] = value;
        saveStateToLocalStorage();
    }
}

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

    // Attach event listeners to delete buttons
    DOMElements.parameterGrid.querySelectorAll('.delete-param-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const paramId = event.currentTarget.dataset.paramId;
            removeParameter(paramId);
        });
    });
}

function updateAllDisplays() {
    updateSelectionDisplay();
    updateAnalysisDisplay(); // This ensures initial state is "No Signal" if counts are zero
    updateHistoryDisplay();
    updateJournalDisplay();
    updateParametersDisplay();
}

// --- Action Handlers ---
function recordAction(type, change) {
    if (type === 'buy') {
        selectedBuy = Math.max(0, parseFloat((selectedBuy + change).toFixed(1))); // Ensure non-negative and correct precision
    } else if (type === 'sell') {
        selectedSell = Math.max(0, parseFloat((selectedSell + change).toFixed(1))); // Ensure non-negative and correct precision
    }
    selectionStack.push({ type: type, change: change });
    updateSelectionDisplay();
}

function handleInputChanges(type, event) {
    let value = parseFloat(event.target.value);
    if (isNaN(value)) value = 0;
    value = parseFloat(value.toFixed(1)); // Ensure precision

    // Store original pending value for undo if direct input
    // This replaces previous selections for simplicity on undo for direct input
    if (type === 'buy') {
        const oldValue = selectedBuy;
        selectedBuy = value;
        // Mark as input change for undo, storing old value
        selectionStack.push({ type: 'input_buy', original: oldValue, new: value });
    } else if (type === 'sell') {
        const oldValue = selectedSell;
        selectedSell = value;
        // Mark as input change for undo, storing old value
        selectionStack.push({ type: 'input_sell', original: oldValue, new: value });
    }
    updateSelectionDisplay();
}

function undoLastAction() {
    const lastAction = selectionStack.pop();

    if (!lastAction) return;

    if (lastAction.type === 'buy') {
        selectedBuy = Math.max(0, parseFloat((selectedBuy - lastAction.change).toFixed(1)));
    } else if (lastAction.type === 'sell') {
        selectedSell = Math.max(0, parseFloat((selectedSell - lastAction.change).toFixed(1)));
    } else if (lastAction.type === 'input_buy') {
        selectedBuy = lastAction.original;
    } else if (lastAction.type === 'input_sell') {
        selectedSell = lastAction.original;
    }
    updateSelectionDisplay();
}

function submitEntries() {
    if (selectedBuy === 0 && selectedSell === 0) {
        alert('Please add some Buy or Sell flow before submitting.');
        return;
    }

    buyCount += selectedBuy;
    sellCount += selectedSell;

    const now = new Date();
    const timestamp = now.toLocaleString();

    // Recalculate conclusion based on new total counts
    const total = buyCount + sellCount;
    const difference = Math.abs(buyCount - sellCount);
    const percentage = total ? ((difference / total) * 100).toFixed(2) : 0;

    let conclusion = '';
    if (buyCount === sellCount && total === 0) {
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

    const historyEntry = `${timestamp} | ${conclusion} | BUYS: ${buyCount.toFixed(1)} | SELLS: ${sellCount.toFixed(1)} | %DIFF: ${percentage}%`;

    historyList.unshift(historyEntry);
    if (historyList.length > 30) {
        historyList.pop();
    }

    const detailedEntry = {
        id: Date.now(), // Unique ID for each entry
        timestamp: timestamp,
        conclusion: conclusion,
        buyCount: buyCount,
        sellCount: sellCount,
        percentage: percentage,
        noteTitle: '', // New field for note title
        note: ''
    };

    historyWithNotes.unshift(detailedEntry);
    if (historyWithNotes.length > 30) {
        historyWithNotes.pop();
    }

    // Reset selected counts after submission
    selectedBuy = 0;
    selectedSell = 0;
    selectionStack = []; // Clear stack on successful submission

    updateAllDisplays(); // This will trigger the conclusion area animation
    saveStateToLocalStorage();
}

function resetCurrentCounts() {
    if (!confirm('Are you sure you want to reset the current pending flow?')) {
        return;
    }
    selectedBuy = 0;
    selectedSell = 0;
    selectionStack = [];
    updateSelectionDisplay();
}

function clearAllData() {
    if (!confirm('Are you sure you want to CLEAR ALL DATA (Total Counts, All History, All Journal Entries, Custom Parameters)? This action cannot be undone.')) {
        return;
    }
    buyCount = 0;
    sellCount = 0;
    selectedBuy = 0;
    selectedSell = 0;
    selectionStack = [];
    historyList = [];
    historyWithNotes = [];
    journalEntries = [];
    customParameters = [ // Reset to default parameters
        { id: 'btt', label: 'BTT', value: 1.0, subText: null },
        { id: 'futlevel', label: 'FUTLEVEL', value: 1.0, subText: null },
        { id: 'vsa', label: 'VSA', value: 1.0, subText: '(0.5 for weak signs)' },
        { id: 'vlevel', label: 'VLEVEL', value: 1.0, subText: '(0.5 for derivations)' },
        { id: 'wfutlevel', label: 'WFUTLEVEL', value: 0.5, subText: null },
        { id: 'mtf-confirmation', label: 'MTF CONFIRMATION', value: 1.0, subText: '(0.5=Down TF + 0.5=Up TF)' }
    ];
    updateAllDisplays();
    localStorage.clear(); // Clear all relevant local storage items
}

// --- Press and Hold Logic ---
let holdInterval;
let holdTimeout;
const HOLD_INITIAL_DELAY = 300; // ms before first repeat
const HOLD_REPEAT_RATE = 100; // ms between subsequent repeats

function startHold(button, action, change) {
    // Clear any existing intervals to prevent multiple running
    stopHold();

    // Perform action immediately
    recordAction(action, change);

    // Set a timeout for the first repeat, and then an interval for continuous repeats
    holdTimeout = setTimeout(() => {
        holdInterval = setInterval(() => {
            recordAction(action, change);
        }, HOLD_REPEAT_RATE);
    }, HOLD_INITIAL_DELAY);
}

function stopHold() {
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
}

// --- Parameter Management ---
function addParameter() {
    const label = DOMElements.newParamLabelInput.value.trim();
    let value = parseFloat(DOMElements.newParamValueInput.value);

    if (!label) {
        alert('Parameter label cannot be empty.');
        return;
    }
    if (isNaN(value)) {
        value = 0.0;
    }

    const newParam = {
        id: 'custom-' + Date.now(), // Unique ID
        label: label,
        value: parseFloat(value.toFixed(1)), // Ensure precision
        subText: null // Custom parameters don't have subText by default
    };

    customParameters.push(newParam);
    DOMElements.newParamLabelInput.value = '';
    DOMElements.newParamValueInput.value = 1.0; // Reset to default
    updateParametersDisplay();
    saveStateToLocalStorage();
}

function removeParameter(paramId) {
    if (!confirm('Are you sure you want to remove this parameter?')) {
        return;
    }
    customParameters = customParameters.filter(param => param.id !== paramId);
    updateParametersDisplay();
    saveStateToLocalStorage();
}

// --- Trading Journal Functions ---
function saveTrade() {
    const instrument = DOMElements.tradeInstrumentInput.value.trim();
    const entryPrice = parseFloat(DOMElements.tradeEntryPriceInput.value);
    const exitPrice = parseFloat(DOMElements.tradeExitPriceInput.value);
    const pnl = parseFloat(DOMElements.tradePnlInput.value);
    const date = DOMElements.tradeDateInput.value; // YYYY-MM-DD
    const notes = DOMElements.tradeNotesInput.value.trim();

    if (!instrument || !date) {
        alert('Instrument and Date are required to log a trade.');
        return;
    }

    const newTrade = {
        id: Date.now(),
        instrument: instrument,
        entryPrice: isNaN(entryPrice) ? null : parseFloat(entryPrice.toFixed(2)),
        exitPrice: isNaN(exitPrice) ? null : parseFloat(exitPrice.toFixed(2)),
        pnl: isNaN(pnl) ? null : parseFloat(pnl.toFixed(2)),
        date: date,
        notes: notes
    };

    journalEntries.unshift(newTrade); // Add to beginning
    if (journalEntries.length > 50) { // Keep a reasonable number of journal entries
        journalEntries.pop();
    }
    updateJournalDisplay();
    saveStateToLocalStorage();
    clearJournalForm();
}

function clearJournalForm() {
    DOMElements.tradeInstrumentInput.value = '';
    DOMElements.tradeEntryPriceInput.value = '';
    DOMElements.tradeExitPriceInput.value = '';
    DOMElements.tradePnlInput.value = '';
    DOMElements.tradeDateInput.value = new Date().toISOString().split('T')[0]; // Set to today's date
    DOMElements.tradeNotesInput.value = '';
}

function clearJournal() {
    if (!confirm('Are you sure you want to clear ALL trading journal entries? This cannot be undone.')) {
        return;
    }
    journalEntries = [];
    updateJournalDisplay();
    saveStateToLocalStorage();
}


// --- Event Listeners ---
function setupEventListeners() {
    // Increment/Deduct Buttons (with press-and-hold)
    DOMElements.incrementButtons.forEach(button => {
        const action = button.dataset.action;
        const change = parseFloat(button.dataset.change);
        button.addEventListener('mousedown', () => startHold(button, action, change));
        button.addEventListener('mouseup', stopHold);
        button.addEventListener('mouseleave', stopHold); // Important for drag-off
        button.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(button, action, change); }, { passive: false }); // Prevent default scroll
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

    // Input fields for direct value entry
    DOMElements.buyInput.addEventListener('input', (e) => handleInputChanges('buy', e));
    DOMElements.sellInput.addEventListener('input', (e) => handleInputChanges('sell', e));

    // Main action buttons
    DOMElements.submitEntriesBtn.addEventListener('click', submitEntries);
    DOMElements.resetCurrentBtn.addEventListener('click', resetCurrentCounts);
    DOMElements.undoLastActionBtn.addEventListener('click', undoLastAction);
    DOMElements.clearAllDataBtn.addEventListener('click', clearAllData); // Global clear button

    // Collapsible Notes & Parameters Section
    DOMElements.toggleNotesParamsBtn.addEventListener('click', () => {
        DOMElements.notesParamsContent.classList.toggle('active');
        // If it's becoming active, ensure notes/params are rendered
        if (DOMElements.notesParamsContent.classList.contains('active')) {
            updateHistoryWithNotesDisplay(DOMElements.noteSearchInput.value);
            updateParametersDisplay();
            updateJournalDisplay(); // Also ensure journal is up-to-date
        }
    });

    // Note Search
    DOMEElements.noteSearchInput.addEventListener('input', (e) => updateHistoryWithNotesDisplay(e.target.value));

    // Parameter addition
    DOMElements.addParameterBtn.addEventListener('click', addParameter);

    // Trading Journal buttons
    DOMElements.saveTradeBtn.addEventListener('click', saveTrade);
    DOMElements.clearJournalFormBtn.addEventListener('click', clearJournalForm);
    DOMElements.clearJournalBtn.addEventListener('click', clearJournal);

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape' && DOMElements.notesParamsContent.classList.contains('active')) {
                DOMElements.notesParamsContent.classList.remove('active');
                e.target.blur(); // Remove focus from input
            }
            return; // Don't trigger other shortcuts if typing in an input field
        }

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

    // Auto-save before page unload
    window.addEventListener('beforeunload', saveStateToLocalStorage);
}

// --- Live Clocks ---
function renderTimezoneClocks() {
    DOMElements.timezoneClocksContainer.innerHTML = TIMEZONE_CITIES.map(tz => `
        <div class="time-zone">
            <span class="time-label"><i class="${tz.icon}"></i> ${tz.label}:</span>
            <span class="time-value" id="${tz.label.toLowerCase().replace(/[^a-z0-9]/g, '')}-time"></span>
        </div>
    `).join('');
}

function updateClocks() {
    const now = new Date();

    // Local Live Clock
    DOMElements.liveClock.innerText = now.toLocaleTimeString();

    // Specific Timezones
    TIMEZONE_CITIES.forEach(tz => {
        const element = document.getElementById(`${tz.label.toLowerCase().replace(/[^a-z0-9]/g, '')}-time`);
        if (element) {
            element.innerText = now.toLocaleTimeString('en-US', { timeZone: tz.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        }
    });
}

function startClocks() {
    updateClocks(); // Initial update
    setInterval(updateClocks, 1000); // Update every second
}
