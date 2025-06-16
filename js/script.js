// --- State Variables ---
let buyCount = 0;
let sellCount = 0;
let selectedBuy = 0;
let selectedSell = 0;
let selectionStack = []; // Stores 'buy', 'sell' or { type: 'input', value: X, original: Y } for undo
let historyList = []; // Simple text history
let historyWithNotes = []; // Detailed history with notes
let journalEntries = []; // New array for trading journal entries
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
    // Time & Header
    liveClock: document.getElementById('live-clock'),
    newYorkTime: document.getElementById('new-york-time'),
    londonTime: document.getElementById('london-time'),
    indiaTime: document.getElementById('india-time'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),

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

    // History
    historyContainer: document.getElementById('history'),

    // Modals
    infoModal: document.getElementById('infoModal'),
    closeInfoModalBtn: document.getElementById('closeInfoModalBtn'),
    openInfoModalBtn: document.getElementById('openInfoModalBtn'), // Separate button
    historyWithNotesContainer: document.getElementById('historyWithNotes'),
    noteSearchInput: document.getElementById('note-search'),

    // Parameter Management
    parameterGrid: document.getElementById('parameter-grid'),
    newParamLabelInput: document.getElementById('new-param-label'),
    newParamValueInput: document.getElementById('new-param-value'),
    addParameterBtn: document.getElementById('addParameterBtn'),

    // Trading Journal
    journalLogModal: document.getElementById('journalLogModal'),
    closeJournalLogModalBtn: document.getElementById('closeJournalLogModalBtn'),
    openJournalModalBtn: document.getElementById('openJournalModalBtn'),
    clearJournalBtn: document.getElementById('clearJournalBtn'),
    journalEntriesContainer: document.getElementById('journal-entries'),
    tradeInstrumentInput: document.getElementById('trade-instrument'),
    tradeEntryPriceInput: document.getElementById('trade-entry-price'),
    tradeExitPriceInput: document.getElementById('trade-exit-price'),
    tradePnlInput: document.getElementById('trade-pnl'),
    tradeDateInput: document.getElementById('trade-date'),
    tradeNotesInput: document.getElementById('trade-notes'),
    saveTradeBtn: document.getElementById('saveTradeBtn'),
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
    'SELL RETRACEMENT EXPECTED': { className: 'sell-retracement', msg: '↗️ SELL RETRACEMENT' },
    'NORMAL BUY': { className: 'normal-buy', msg: '✅ NORMAL BUY' },
    'NORMAL SELL': { className: 'normal-sell', msg: '❌ NORMAL SELL' },
    'BOTH ARE EQUAL': { className: 'neutral', msg: '⚖️ NEUTRAL' },
    'NO SIGNAL': { className: 'no-signal', msg: 'NO SIGNAL' }
};

const TIMEZONE_CONFIG = {
    'America/New_York': DOMElements.newYorkTime, // EST/EDT
    'Europe/London': DOMElements.londonTime,     // GMT/BST
    'Asia/Kolkata': DOMElements.indiaTime       // IST
    // Add more UTC timezones as needed:
    // 'Asia/Tokyo': document.getElementById('tokyo-time'),
    // 'Australia/Sydney': document.getElementById('sydney-time'),
    // 'Europe/Paris': document.getElementById('paris-time'),
    // 'America/Los_Angeles': document.getElementById('los-angeles-time')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    loadStateFromLocalStorage();
    updateAllDisplays();
    setupEventListeners();
    startClocks();
}

function loadStateFromLocalStorage() {
    buyCount = parseFloat(localStorage.getItem(STORAGE_KEYS.BUY_COUNT)) || 0;
    sellCount = parseFloat(localStorage.getItem(STORAGE_KEYS.SELL_COUNT)) || 0;
    historyList = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_LIST)) || [];
    historyWithNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_WITH_NOTES)) || [];
    journalEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES)) || [];

    const storedParams = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_PARAMETERS));
    if (storedParams) {
        customParameters = storedParams; // Overwrite defaults if stored
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
    if (buyCount === sellCount) {
        conclusion = 'BOTH ARE EQUAL';
    } else if (percentage <= 25 && total > 0) { // Only apply retracement logic if there's significant total
        conclusion = buyCount > sellCount ? 'BUY RETRACEMENT EXPECTED' : 'SELL RETRACEMENT EXPECTED';
    } else if (percentage > 66) {
        conclusion = buyCount > sellCount ? 'STRONG BUY' : 'STRONG SELL';
    } else if (total > 0) { // If total is not zero but not strong, it's normal
        conclusion = buyCount > sellCount ? 'NORMAL BUY' : 'NORMAL SELL';
    } else { // No entries yet
        conclusion = 'NO SIGNAL';
    }

    DOMElements.buyCountDisplay.innerText = buyCount.toFixed(1);
    DOMElements.sellCountDisplay.innerText = sellCount.toFixed(1);
    DOMElements.differenceDisplay.innerText = difference.toFixed(1);
    DOMElements.percentageDisplay.innerText = `${percentage}%`;
    DOMElements.conclusionText.innerText = `Conclusion: ${conclusion}`;

    const style = SENTIMENT_STYLES[conclusion] || SENTIMENT_STYLES['NO SIGNAL'];
    DOMElements.sentimentBadge.className = `sentiment-badge ${style.className} stock-badge`;
    DOMElements.sentimentBadge.innerText = style.msg;
}

function updateHistoryDisplay() {
    if (historyList.length === 0) {
        DOMElements.historyContainer.innerHTML = '<p class="text-center text-text-muted py-4">No entries yet.</p>';
        return;
    }
    DOMElements.historyContainer.innerHTML = historyList.map(entry =>
        `<div class="history-item antique-item fade-enter">
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
        DOMElements.historyWithNotesContainer.innerHTML = '<p class="text-center text-text-muted py-4">No detailed entries yet.</p>';
        return;
    } else if (filteredHistory.length === 0 && searchTerm !== '') {
        DOMElements.historyWithNotesContainer.innerHTML = '<p class="text-center text-text-muted py-4">No matching entries found.</p>';
        return;
    }

    DOMElements.historyWithNotesContainer.innerHTML = filteredHistory.map(entry => `
        <div class="history-item antique-item">
            <div class="history-timestamp">${entry.timestamp}</div>
            <div class="note-input-group">
                <label for="note-title-${entry.id}">Title:</label>
                <input type="text"
                    id="note-title-${entry.id}"
                    class="antique-input"
                    placeholder="Add a title for this entry..."
                    data-entry-id="${entry.id}"
                    data-field="noteTitle"
                    value="${entry.noteTitle || ''}"
                    onchange="updateNoteField(${entry.id}, 'noteTitle', this.value)">
            </div>
            <div class="history-data">
                ${entry.conclusion} | BUYS: ${entry.buyCount.toFixed(1)} | SELLS: ${entry.sellCount.toFixed(1)} | %DIFF: ${entry.percentage}%
            </div>
            <div class="note-input-group">
                <label for="note-content-${entry.id}">Notes:</label>
                <textarea
                    id="note-content-${entry.id}"
                    class="antique-input"
                    placeholder="Add your trading notes here..."
                    data-entry-id="${entry.id}"
                    data-field="note"
                    onchange="updateNoteField(${entry.id}, 'note', this.value)"
                >${entry.note}</textarea>
            </div>
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
        DOMElements.journalEntriesContainer.innerHTML = '<p class="text-center text-text-muted py-4">No trades logged yet.</p>';
        return;
    }
    DOMElements.journalEntriesContainer.innerHTML = journalEntries.map(entry => `
        <div class="journal-item antique-item">
            <div class="journal-entry-header">
                <span class="journal-entry-instrument">${entry.instrument || 'N/A'}</span>
                <span class="journal-entry-date">${entry.date || 'N/A'}</span>
            </div>
            <div class="journal-entry-price-pnl">
                <span>Entry: ${entry.entryPrice !== null ? entry.entryPrice.toFixed(2) : 'N/A'}</span>
                <span>Exit: ${entry.exitPrice !== null ? entry.exitPrice.toFixed(2) : 'N/A'}</span>
                <span style="color: ${entry.pnl >= 0 ? 'var(--color-accent-green-stock)' : 'var(--color-accent-red-stock)'};">P/L: $${entry.pnl !== null ? entry.pnl.toFixed(2) : 'N/A'}</span>
            </div>
            <div class="journal-entry-notes">${entry.notes || ''}</div>
        </div>
    `).join('');
}

function updateParametersDisplay() {
    if (customParameters.length === 0) {
        DOMElements.parameterGrid.innerHTML = '<p class="text-center text-text-muted py-4 col-span-full">No parameters added yet.</p>';
        return;
    }
    DOMElements.parameterGrid.innerHTML = customParameters.map(param => `
        <div class="parameter-item antique-item">
            <button class="delete-param-btn" data-param-id="${param.id}" title="Remove Parameter"><i class="fas fa-times"></i></button>
            <div class="parameter-value text-accent-yellow-stock">${param.value.toFixed(1)}</div>
            <div class="parameter-label stock-label">
                ${param.label}
                ${param.subText ? `<span class="sub-text stock-sub-text">${param.subText}</span>` : ''}
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
    updateAnalysisDisplay();
    updateHistoryDisplay();
    updateJournalDisplay();
    updateParametersDisplay(); // Initial display of parameters
}

// --- Action Handlers ---
function recordAction(type, change) {
    if (type === 'buy') {
        selectedBuy = Math.max(0, selectedBuy + change); // Ensure non-negative
    } else if (type === 'sell') {
        selectedSell = Math.max(0, selectedSell + change); // Ensure non-negative
    }
    // For Undo: Store what action just happened
    selectionStack.push({ type: type, change: change });
    updateSelectionDisplay();
}

function handleInputChanges(type, event) {
    let value = parseFloat(event.target.value);
    if (isNaN(value)) value = 0;

    // Store original pending value for undo if direct input
    // This is more complex for undo, as a single input might replace multiple +0.5s.
    // For simplicity with the existing undo stack, let's treat direct input as a 'reset' of selectedBuy/Sell
    // to that value, and then add it to the stack as a single 'input' action.
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

function undoLastAction() {
    const lastAction = selectionStack.pop();

    if (!lastAction) return;

    if (lastAction.type === 'buy') {
        selectedBuy = Math.max(0, selectedBuy - lastAction.change);
    } else if (lastAction.type === 'sell') {
        selectedSell = Math.max(0, selectedSell - lastAction.change);
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
    if (buyCount === sellCount) {
        conclusion = 'BOTH ARE EQUAL';
    } else if (percentage <= 25 && total > 0) {
        conclusion = buyCount > sellCount ? 'BUY RETRACEMENT EXPECTED' : 'SELL RETRACEMENT EXPECTED';
    } else if (percentage > 66) {
        conclusion = buyCount > sellCount ? 'STRONG BUY' : 'STRONG SELL';
    } else if (total > 0) {
        conclusion = buyCount > sellCount ? 'NORMAL BUY' : 'NORMAL SELL';
    } else {
        conclusion = 'NO SIGNAL';
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

    updateAllDisplays();
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

// --- Modal Functions ---
function openModal(modalElement) {
    modalElement.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalElement) {
    modalElement.style.display = 'none';
    document.body.style.overflow = 'auto';
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
        value: value,
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
        entryPrice: isNaN(entryPrice) ? null : entryPrice,
        exitPrice: isNaN(exitPrice) ? null : exitPrice,
        pnl: isNaN(pnl) ? null : pnl,
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
    closeModal(DOMElements.journalLogModal);
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

    // Info/Parameters Modal
    DOMElements.openInfoModalBtn.addEventListener('click', () => {
        updateHistoryWithNotesDisplay(); // Update notes with search bar
        updateParametersDisplay(); // Ensure parameters are up-to-date
        openModal(DOMElements.infoModal);
    });
    DOMElements.closeInfoModalBtn.addEventListener('click', () => closeModal(DOMElements.infoModal));
    DOMElements.noteSearchInput.addEventListener('input', (e) => updateHistoryWithNotesDisplay(e.target.value));

    // Parameter addition
    DOMElements.addParameterBtn.addEventListener('click', addParameter);

    // Trading Journal Modal
    DOMElements.openJournalModalBtn.addEventListener('click', () => {
        clearJournalForm(); // Reset form when opening
        openModal(DOMElements.journalLogModal);
    });
    DOMElements.closeJournalLogModalBtn.addEventListener('click', () => closeModal(DOMElements.journalLogModal));
    DOMElements.saveTradeBtn.addEventListener('click', saveTrade);
    DOMElements.clearJournalBtn.addEventListener('click', clearJournal);

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; // Don't trigger shortcuts if typing in an input field
        }

        if (e.key === 'Enter') {
            submitEntries();
        } else if (e.key.toLowerCase() === 'b') {
            recordAction('buy', 0.5);
        } else if (e.key.toLowerCase() === 's') {
            recordAction('sell', 0.5);
        } else if (e.key.toLowerCase() === 'r') {
            resetCurrentCounts();
        } else if (e.key.toLowerCase() === 'i') { // 'I' for Info/Parameters
            if (DOMElements.infoModal.style.display === 'flex') {
                closeModal(DOMElements.infoModal);
            } else {
                openModal(DOMElements.infoModal);
            }
        } else if (e.key.toLowerCase() === 'l') { // 'L' for Log Trade
            if (DOMElements.journalLogModal.style.display === 'flex') {
                closeModal(DOMElements.journalLogModal);
            } else {
                openModal(DOMElements.journalLogModal);
            }
        } else if (e.key === 'Escape') {
            if (DOMElements.infoModal.style.display === 'flex') {
                closeModal(DOMElements.infoModal);
            }
            if (DOMElements.journalLogModal.style.display === 'flex') {
                closeModal(DOMElements.journalLogModal);
            }
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === DOMElements.infoModal) {
            closeModal(DOMElements.infoModal);
        }
        if (event.target === DOMElements.journalLogModal) {
            closeModal(DOMElements.journalLogModal);
        }
    });

    // Auto-save before page unload
    window.addEventListener('beforeunload', saveStateToLocalStorage);
}

// --- Live Clocks ---
function updateClocks() {
    const now = new Date();

    // Live Clock (Local Time)
    DOMElements.liveClock.innerText = now.toLocaleTimeString();

    // Specific Timezones
    for (const [timezone, element] of Object.entries(TIMEZONE_CONFIG)) {
        element.innerText = now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
}

function startClocks() {
    updateClocks(); // Initial update
    setInterval(updateClocks, 1000); // Update every second
}
