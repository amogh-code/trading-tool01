// --- State Variables ---
let buyCount = 0;
let sellCount = 0;
let selectedBuy = 0;
let selectedSell = 0;
let selectionStack = []; // To support undo functionality
let historyList = []; // Renamed to avoid conflict with global history object
let historyWithNotes = [];

// --- DOM Elements ---
const DOMElements = {
    liveClock: document.getElementById('live-clock'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    selectedBuyDisplay: document.getElementById('selected-buy'),
    selectedSellDisplay: document.getElementById('selected-sell'),
    buyCountDisplay: document.getElementById('buy-count'),
    sellCountDisplay: document.getElementById('sell-count'),
    differenceDisplay: document.getElementById('difference'),
    percentageDisplay: document.getElementById('percentage'),
    conclusionText: document.getElementById('conclusion'),
    sentimentBadge: document.getElementById('sentiment-badge'),
    historyContainer: document.getElementById('history'),
    noteModal: document.getElementById('noteModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    historyWithNotesContainer: document.getElementById('historyWithNotes'),
    actionButtons: document.querySelectorAll('.btn-action'), // Select all buy/sell buttons
    submitEntriesBtn: document.getElementById('submitEntriesBtn'),
    resetCountsBtn: document.getElementById('resetCountsBtn'),
    undoLastActionBtn: document.getElementById('undoLastActionBtn'),
    openNoteModalBtn: document.getElementById('openNoteModalBtn'),
};

// --- Constants ---
const STORAGE_KEYS = {
    BUY_COUNT: 'buyCount',
    SELL_COUNT: 'sellCount',
    HISTORY_LIST: 'historyList',
    HISTORY_WITH_NOTES: 'historyWithNotes'
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    loadStateFromLocalStorage();
    updateAllDisplays();
    setupEventListeners();
    startLiveClock();
}

function loadStateFromLocalStorage() {
    buyCount = parseFloat(localStorage.getItem(STORAGE_KEYS.BUY_COUNT)) || 0;
    sellCount = parseFloat(localStorage.getItem(STORAGE_KEYS.SELL_COUNT)) || 0;
    historyList = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_LIST)) || [];
    historyWithNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_WITH_NOTES)) || [];
}

function saveStateToLocalStorage() {
    localStorage.setItem(STORAGE_KEYS.BUY_COUNT, buyCount);
    localStorage.setItem(STORAGE_KEYS.SELL_COUNT, sellCount);
    localStorage.setItem(STORAGE_KEYS.HISTORY_LIST, JSON.stringify(historyList));
    localStorage.setItem(STORAGE_KEYS.HISTORY_WITH_NOTES, JSON.stringify(historyWithNotes));
}

// --- UI Update Functions ---
function updateSelectionDisplay() {
    DOMElements.selectedBuyDisplay.innerText = selectedBuy.toFixed(1);
    DOMElements.selectedSellDisplay.innerText = selectedSell.toFixed(1);
}

function updateAnalysisDisplay() {
    const total = buyCount + sellCount;
    const difference = Math.abs(buyCount - sellCount);
    const percentage = total ? ((difference / total) * 100).toFixed(2) : 0;

    let conclusion = '';
    if (buyCount === sellCount) {
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
}

function updateHistoryDisplay() {
    if (historyList.length === 0) {
        DOMElements.historyContainer.innerHTML = '<p class="text-center text-gray-500 py-4">No entries yet.</p>';
        return;
    }
    DOMElements.historyContainer.innerHTML = historyList.map(entry =>
        `<div class="history-item fade-enter">
            <div class="history-data">${entry}</div>
        </div>`
    ).join('');
}

function updateHistoryWithNotesDisplay() {
    if (historyWithNotes.length === 0) {
        DOMElements.historyWithNotesContainer.innerHTML = '<p class="text-center text-gray-500 py-4">No detailed entries yet.</p>';
        return;
    }
    DOMElements.historyWithNotesContainer.innerHTML = historyWithNotes.map(entry => `
        <div class="history-item">
            <div class="history-timestamp">${entry.timestamp}</div>
            <div class="history-data">
                ${entry.conclusion} | BUYS: ${entry.buyCount.toFixed(1)} | SELLS: ${entry.sellCount.toFixed(1)} | %DIFF: ${entry.percentage}%
            </div>
            <textarea
                class="note-input"
                placeholder="Add your trading notes here..."
                data-entry-id="${entry.id}"
            >${entry.note}</textarea>
        </div>
    `).join('');

    // Attach event listeners to newly rendered textareas
    DOMElements.historyWithNotesContainer.querySelectorAll('.note-input').forEach(textarea => {
        textarea.addEventListener('change', (event) => {
            const entryId = parseInt(event.target.dataset.entryId);
            updateNote(entryId, event.target.value);
        });
    });
}

function updateAllDisplays() {
    updateSelectionDisplay();
    updateAnalysisDisplay();
    updateHistoryDisplay();
    updateHistoryWithNotesDisplay();
}

// --- Action Handlers ---
function recordAction(type) {
    if (type === 'buy') {
        selectedBuy += 0.5;
        selectionStack.push('buy');
    } else if (type === 'sell') {
        selectedSell += 0.5;
        selectionStack.push('sell');
    }
    updateSelectionDisplay();
}

function undoLastAction() {
    const last = selectionStack.pop();
    if (last === 'buy' && selectedBuy >= 0.5) {
        selectedBuy -= 0.5;
    } else if (last === 'sell' && selectedSell >= 0.5) {
        selectedSell -= 0.5;
    }
    updateSelectionDisplay();
}

function submitEntries() {
    if (selectedBuy === 0 && selectedSell === 0) {
        alert('Please select at least one Buy or Sell entry before submitting.');
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
        note: ''
    };

    historyWithNotes.unshift(detailedEntry);
    if (historyWithNotes.length > 30) {
        historyWithNotes.pop();
    }

    // Reset selected counts after submission
    selectedBuy = 0;
    selectedSell = 0;
    selectionStack = [];

    updateAllDisplays();
    saveStateToLocalStorage();
}

function resetCounts() {
    if (!confirm('Are you sure you want to reset all current analysis data? This action cannot be undone.')) {
        return;
    }
    buyCount = 0;
    sellCount = 0;
    selectedBuy = 0;
    selectedSell = 0;
    selectionStack = [];
    historyList = []; // Also clear history on full reset
    historyWithNotes = [];
    updateAllDisplays();
    localStorage.clear(); // Clear all relevant local storage items
}

function clearHistory() {
    if (!confirm('Are you sure you want to clear all history entries? This action cannot be undone.')) {
        return;
    }
    historyList = [];
    historyWithNotes = [];
    updateHistoryDisplay();
    updateHistoryWithNotesDisplay();
    saveStateToLocalStorage();
}

function updateNote(entryId, noteText) {
    const entry = historyWithNotes.find(h => h.id === entryId);
    if (entry) {
        entry.note = noteText;
        saveStateToLocalStorage();
    }
}

// --- Modal Functions ---
function openNoteModal() {
    DOMElements.noteModal.style.display = 'flex'; // Use flex for centering
    document.body.style.overflow = 'hidden'; // Prevent scrolling background
    updateHistoryWithNotesDisplay(); // Ensure notes history is fresh
}

function closeNoteModal() {
    DOMElements.noteModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// --- Event Listeners ---
function setupEventListeners() {
    DOMElements.actionButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const actionType = event.currentTarget.dataset.action;
            recordAction(actionType);
        });
    });

    DOMElements.submitEntriesBtn.addEventListener('click', submitEntries);
    DOMElements.resetCountsBtn.addEventListener('click', resetCounts);
    DOMElements.undoLastActionBtn.addEventListener('click', undoLastAction);
    DOMElements.openNoteModalBtn.addEventListener('click', openNoteModal);
    DOMElements.closeModalBtn.addEventListener('click', closeNoteModal);
    DOMElements.clearHistoryBtn.addEventListener('click', clearHistory);

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            submitEntries();
        } else if (e.key.toLowerCase() === 'b') {
            recordAction('buy');
        } else if (e.key.toLowerCase() === 's') {
            recordAction('sell');
        } else if (e.key.toLowerCase() === 'r') {
            resetCounts();
        } else if (e.key.toLowerCase() === 'n') {
            openNoteModal();
        } else if (e.key === 'Escape') {
            closeNoteModal();
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === DOMElements.noteModal) {
            closeNoteModal();
        }
    });

    // Auto-save before page unload
    window.addEventListener('beforeunload', saveStateToLocalStorage);
}

// --- Live Clock ---
function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        DOMElements.liveClock.innerText = now.toLocaleTimeString();
    }, 1000);
}
