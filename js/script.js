// --- Global State Variables ---
// Variables for Flow Analyzer (encapsulated in an object)
let flowAnalyzer = {
    buyCount: 0,
    sellCount: 0,
    selectedBuy: 0,
    selectedSell: 0,
    selectionStack: [],
    historyList: [],
    historyWithNotes: [],
    journalEntries: [],
    customParameters: [
        { id: 'btt', label: 'BTT', value: 1.0, subText: null },
        { id: 'futlevel', label: 'FUTLEVEL', value: 1.0, subText: null },
        { id: 'vsa', label: 'VSA', value: 1.0, subText: '(0.5 for weak signs)' },
        { id: 'vlevel', label: 'VLEVEL', value: 1.0, subText: '(0.5 for derivations)' },
        { id: 'wfutlevel', label: 'WFUTLEVEL', value: 0.5, subText: null },
        { id: 'mtf-confirmation', label: 'MTF CONFIRMATION', value: 1.0, subText: '(0.5=Down TF + 0.5=Up TF)' }
    ]
};

// Variables for Pivot Calculator (encapsulated in an object)
let pivotCalculator = {
    selectedFormulas: new Set(), // Use a Set for unique formula IDs
    allLevels: [], // Stores all calculated levels across selected formulas
    convergenceThreshold: 3, // Minimum number of formulas converging for a recurring level
    toleranceValue: 0.50,    // Price range within which levels are considered to converge
    // Formula definitions (moved here for encapsulation)
    formulas: [
        {
            id: 'formula0', name: 'CLASSIC PIVOT (EXTENDED)', description: 'Classic pivot with half levels (R0.5, R1, R1.5, etc.)',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3;
                const r1 = (pp * 2) - l; const r2 = pp + (h - l); const r3 = 2 * pp + (h - (2 * l)); const r4 = 3 * pp + (h - (3 * l));
                const s1 = (pp * 2) - h; const s2 = pp - (h - l); const s3 = (2 * pp) - ((2 * h) - l); const s4 = (3 * pp) - ((3 * h) - l);
                return { PP: pp, 'R0.5': (r1 + pp) / 2, R1: r1, 'R1.5': (r1 + r2) / 2, R2: r2, 'R2.5': (r2 + r3) / 2, R3: r3, 'R3.5': (r3 + r4) / 2, R4: r4, 'S0.5': (s1 + pp) / 2, S1: s1, 'S1.5': (s1 + s2) / 2, S2: s2, 'S2.5': (s2 + s3) / 2, S3: s3, 'S3.5': (s3 + s4) / 2, S4: s4 };
            }
        },
        {
            id: 'formula1', name: 'STANDARD PIVOT', description: 'Traditional pivot point formula',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3;
                const r1 = (pp * 2) - l; const r2 = pp + (h - l); const r3 = h + (h - l); const r4 = pp + 3 * (h - l);
                const s1 = (pp * 2) - h; const s2 = pp - (h - l); const s3 = (2 * pp) - h - (h - l); const s4 = pp - 3 * (h - l);
                return { PP: pp, R1: r1, R2: r2, R3: r3, R4: r4, S1: s1, S2: s2, S3: s3, S4: s4 };
            }
        },
        {
            id: 'formula2', name: 'FOUR POINT PIVOT', description: 'Uses yesterday\'s OHLC + today\'s open',
            calculate: (h, l, c, tO, yO) => {
                if (!tO) return null; // Formula requires Today's Open
                const pp = (h + l + c + tO) / 4;
                const r1 = (pp * 2) - l; const r2 = pp + (h - l); const r3 = 2 * pp + (h - (2 * l)); const r4 = 3 * pp + (h - (3 * l));
                const s1 = (pp * 2) - h; const s2 = pp - (h - l); const s3 = (2 * pp) - ((2 * h) - l); const s4 = (3 * pp) - ((3 * h) - l);
                return { PP: pp, R1: r1, R2: r2, R3: r3, R4: r4, S1: s1, S2: s2, S3: s3, S4: s4 };
            }
        },
        {
            id: 'formula3', name: 'DOUBLE OPEN PIVOT', description: 'Uses current open twice in calculation',
            calculate: (h, l, c, tO, yO) => {
                const currentOpen = tO || c; // Use Today's Open if provided, else Yesterday's Close
                const pp = (h + l + currentOpen + currentOpen) / 4;
                const r1 = (pp * 2) - l; const r2 = pp + (h - l); const r3 = 2 * pp + (h - (2 * l));
                const s1 = (pp * 2) - h; const s2 = pp - (h - l); const s3 = (2 * pp) - ((2 * h) - l); const s4 = (3 * pp) - ((3 * h) - l);
                return { PP: pp, R1: r1, R2: r2, R3: r3, S1: s1, S2: s2, S3: s3, S4: s4 };
            }
        },
        {
            id: 'formula4', name: 'LINEAR PIVOT', description: 'Linear progression pivot levels',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3;
                const r1 = (pp * 2) - l; const r2 = pp + (h - l); const r3 = pp + 2 * (h - l); const r4 = pp + 3 * (h - l);
                const s1 = (pp * 2) - h; const s2 = pp - (h - l); const s3 = pp - 2 * (h - l); const s4 = pp - 3 * (h - l);
                return { PP: pp, R1: r1, R2: r2, R3: r3, R4: r4, S1: s1, S2: s2, S3: s3, S4: s4 };
            }
        },
        {
            id: 'formula5', name: 'COMPLEX RANGE PIVOT', description: 'Complex calculation with range multipliers',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3;
                const range = h - l;
                return {
                    PP: pp, 'R0.5': c + (range * 1.1 / 18), R1: c + (range * 1.1 / 12), 'R1.5': c + (range * 1.1 / 9),
                    R2: c + (range * 1.1 / 6), 'R2.5': c + (range * 1.1 / 5), R3: c + (range * 1.1 / 4),
                    'R3.5': c + (range * 1.1 / 3), R4: c + (range * 1.1 / 2), 'R4.5': c + (range * 1.1 / 1.33), R5: (h / l) * c,
                    'S0.5': c - (range * 1.1 / 18), S1: c - (range * 1.1 / 12), 'S1.5': c - (range * 1.1 / 9),
                    S2: c - (range * 1.1 / 6), 'S2.5': c - (range * 1.1 / 5), S3: c - (range * 1.1 / 4),
                    'S3.5': c - (range * 1.1 / 3), S4: c - (range * 1.1 / 2), 'S4.5': c - (range * 1.1 / 1.33)
                };
            }
        },
        {
            id: 'formula6', name: 'CONDITIONAL PIVOT', description: 'Changes calculation based on close vs open relationship',
            calculate: (h, l, c, tO, yO) => {
                if (!yO) return null; // Formula requires Yesterday's Open
                let x;
                if (c < yO) { x = h + l + l + c; } else if (c > yO) { x = h + h + l + c; } else { x = h + l + c + c; }
                const pp = x / 4; const r1 = x / 2; const s1 = x / 2;
                return { PP: pp, R1: r1, S1: s1 };
            }
        },
        {
            id: 'formula7', name: 'FIBONACCI PIVOT', description: 'Uses Fibonacci ratios for level calculation',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const range = h - l;
                return { PP: pp, R1: pp + (range / 2), R2: pp + (range * 0.618), R3: pp + range, S1: pp - (range / 2), S2: pp - (range * 0.618), S3: pp - range };
            }
        },
        {
            id: 'formula8', name: 'CLASSIC STANDARD', description: 'Classic standard pivot calculation',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3;
                const r1 = 2 * pp - l; const s1 = 2 * pp - h; const r2 = pp + (r1 - s1); const s2 = pp - (r1 - s1);
                const r3 = h + 2 * (pp - l); const s3 = l - 2 * (h - pp);
                return { PP: pp, R1: r1, R2: r2, R3: r3, S1: s1, S2: s2, S3: s3 };
            }
        },
        {
            id: 'formula9', name: 'SQUARE ROOT PIVOT', description: 'Uses square root calculations for levels',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const sqrt = Math.sqrt(Math.sqrt(pp));
                return { PP: pp, R1: pp + sqrt, R2: pp + 2 * sqrt, R3: pp + 3 * sqrt, S1: pp - sqrt, S2: pp - 2 * sqrt, S3: pp - 3 * sqrt };
            }
        },
        {
            id: 'formula10', name: 'PROGRESSIVE PIVOT', description: 'Progressive calculation method',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3;
                const r1 = (2 * pp) - l; const r2 = pp + (h - l); const r3 = r1 + (h - l); const r4 = r3 + (r2 - r1);
                const s1 = (2 * pp) - h; const s2 = pp - (h - l); const s3 = s1 - (h - l); const s4 = s3 - (s2 - s1);
                return { PP: pp, R1: r1, R2: r2, R3: r3, R4: r4, S1: s1, S2: s2, S3: s3, S4: s4 };
            }
        },
        {
            id: 'formula11', name: 'FIBONACCI EXTENDED', description: 'Extended Fibonacci ratios for pivot calculation',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const range = h - l;
                return {
                    PP: pp, 'R0.5': pp + 0.5 * range, R1: pp + 0.618 * range, 'R1.5': pp + 1 * range, R2: pp + 1.272 * range,
                    'R2.5': pp + 1.618 * range, R3: pp + 2 * range, R4: pp + 2.618 * range,
                    'S0.5': pp - 0.5 * range, S1: pp - 0.618 * range, 'S1.5': pp - 1 * range, S2: pp - 1.272 * range,
                    'S2.5': pp - 1.618 * range, S3: pp - 2 * range, S4: pp - 2.618 * range
                };
            }
        },
        {
            id: 'formula12', name: 'GOLDEN RATIO PIVOT', description: 'Golden ratio based pivot calculations',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const range = h - l;
                const r1 = pp + 0.382 * range; const r2 = pp + 0.618 * range; const r3 = pp + 1.0 * range;
                const s1 = pp - 0.382 * range; const s2 = pp - 0.618 * range; const s3 = pp - 1.0 * range;
                return {
                    PP: pp, 'R0.5': (r1 + pp) / 2, R1: r1, 'R1.5': (r1 + r2) / 2, R2: r2, 'R2.5': (r3 + r2) / 2, R3: r3,
                    'S0.5': (s1 + pp) / 2, S1: s1, 'S1.5': (s1 + s2) / 2, S2: s2, 'S2.5': (s3 + s2) / 2, S3: s3
                };
            }
        },
        {
            id: 'formula13', name: 'ADVANCED RESISTANCE PIVOT', description: 'Advanced resistance calculation method',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3;
                const r1 = 2 * pp - l; const s1 = 2 * pp - h; const r2 = pp - (h - l) + r1; const r3 = pp - (h - l) + r2;
                const s2 = pp - (r1 - s1); const s3 = pp - (r2 - s1);
                return { PP: pp, R1: r1, R2: r2, R3: r3, S1: s1, S2: s2, S3: s3 };
            }
        },
        {
            id: 'formula14', name: 'FIBONACCI RANGE PIVOT', description: 'Fibonacci ratios with daily range',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const range = h - l;
                return {
                    PP: pp, R1: pp + range / 2, 'R1.5': pp + range * 0.618, R2: pp + range, 'R2.5': pp + range * 1.382,
                    S1: pp - range / 2, 'S1.5': pp - range * 0.618, S2: pp - range, 'S2.5': pp - range * 1.382
                };
            }
        },
        {
            id: 'formula15', name: 'MIDPOINT PIVOT', description: 'Midpoint based calculation',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const s1 = (h + l) / 2; const r1 = (pp - s1) + pp;
                return { PP: pp, R1: r1, S1: s1 };
            }
        },
        {
            id: 'formula17', name: '75% PIVOT', description: '75% range pivot calculation',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const r1 = pp + (h - l) * 0.75; const s1 = pp - (h - l) * 0.75;
                return { PP: pp, R1: r1, S1: s1 };
            }
        },
        {
            id: 'formula18', name: 'DOUBLE OPEN WEIGHTED', description: 'Weighted with double today\'s open',
            calculate: (h, l, c, tO, yO) => {
                if (!tO) return null;
                const pp = (h + l + 2 * tO) / 4; const r1 = pp + 2 * (h - l); const s1 = pp - 2 * (h - l);
                return { PP: pp, R1: r1, S1: s1 };
            }
        },
        {
            id: 'formula19', name: 'ABSOLUTE MIDPOINT', description: 'Absolute midpoint difference',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const diff = Math.abs((h + l) / 2 - pp);
                const r1 = pp + diff; const s1 = pp - diff;
                return { PP: pp, R1: r1, S1: s1 };
            }
        },
        {
            id: 'formula22', name: 'EXTENDED FIBONACCI', description: 'Extended Fibonacci levels',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const range = h - l;
                return {
                    PP: pp, R1: pp + 0.5 * range, R2: pp + 0.618 * range, R3: pp + range, R4: pp + 1.382 * range,
                    R5: pp + 1.618 * range, R6: pp + 2 * range, R7: pp + 2.618 * range,
                    S1: pp - 0.5 * range, S2: pp - 0.618 * range, S3: pp - range, S4: pp - 1.382 * range,
                    S5: pp - 1.618 * range, S6: pp - 2 * range, S7: pp - 2.618 * range
                };
            }
        },
        {
            id: 'formula24', name: 'PRIOR RANGE EXTENSION', description: 'Prior range extension method',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const s1 = (h + l) / 2; const r1 = pp + (pp - s1); const range = h - l;
                return {
                    PP: pp, R1: r1, R2: h + range * 0.25, R3: h + range * 0.5, R4: h + range * 0.75, R5: h + range,
                    S1: s1, S2: l - range * 0.25, S3: l - range * 0.5, S4: l - range * 0.75, S5: l - range
                };
            }
        },
        {
            id: 'formula25', name: 'ENHANCED FIBONACCI', description: 'Enhanced Fibonacci with 0.786 level',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const range = h - l;
                return {
                    PP: pp, R1: pp + 0.382 * range, R2: pp + 0.618 * range, R3: pp + 0.786 * range, R4: pp + 1.0 * range,
                    R5: pp + 1.382 * range, R6: pp + 1.618 * range, R7: pp + 2.0 * range,
                    S1: pp - 0.382 * range, S2: pp - 0.618 * range, S3: pp - 0.786 * range, S4: pp - 1.0 * range,
                    S5: pp - 1.382 * range, S6: pp - 1.618 * range, S7: pp - 2.0 * range
                };
            }
        },
        {
            id: 'formula27', name: 'PIVOT POINT HIGH/LOW', description: 'Pivot point high and low calculation',
            calculate: (h, l, c, tO, yO) => {
                const pp = (h + l + c) / 3; const range = h - l; const d = (h + l) / 2; const r = pp - d;
                const ppHigh = pp + r; const ppLow = pp - r;
                const r1 = 2 * pp - h; const s1 = 2 * pp - l; const r2 = 2 * pp + (r1 - s1); const s2 = 2 * pp - (r1 - s1);
                const r3 = r1 + range; const s3 = s1 - range; const r4 = r3 + (r2 - r1); const s4 = s3 - (s2 - s1);
                return { PP: pp, 'PP-HIGH': ppHigh, 'PP-LOW': ppLow, R1: r1, R2: r2, R3: r3, R4: r4, S1: s1, S2: s2, S3: s3, S4: s4 };
            }
        },
        {
            id: 'pivotz', name: 'PIVOTZ ALGORITHM', description: 'Special algorithm with precise multipliers',
            calculate: (h, l, c, tO, yO) => {
                const pp = c; const range = h - l;
                return {
                    PP: pp, R1: pp + 0.0916 * range, R2: pp + 0.183 * range, R3: pp + 0.275 * range, R4: pp + 0.555 * range,
                    R5: pp + 0.8244 * range, R6: pp + 1.0076 * range,
                    S1: pp - 0.0916 * range, S2: pp - 0.183 * range, S3: pp - 0.275 * range, S4: pp - 0.55 * range,
                    S5: pp - 0.8244 * range, S6: pp - 1.0992 * range
                };
            }
        }
    ]
};

// --- Global DOM Element References ---
// Centralized references for elements common to the entire app.
// Elements specific to FlowAnalyzer or PivotCalculator are defined within their respective modules.
const GlobalDOMElements = {
    liveClock: document.getElementById('live-clock'),
    timezoneClocksContainer: document.getElementById('timezone-clocks'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),
    navButtons: document.querySelectorAll('.nav-button'), // Navigation buttons for tool switching
    flowAnalyzerSection: document.getElementById('flow-analyzer-section'),
    pivotCalculatorSection: document.getElementById('pivot-calculator-section'),
};

// --- Global Constants ---
const LOCAL_STORAGE_PREFIX = 'qfa_'; // Prefix for all local storage keys to avoid conflicts

const STORAGE_KEYS = {
    FLOW_ANALYZER_STATE: LOCAL_STORAGE_PREFIX + 'state',
    PIVOT_CALCULATOR_STATE: LOCAL_STORAGE_PREFIX + 'pivot_state',
    CURRENT_TOOL: LOCAL_STORAGE_PREFIX + 'current_tool'
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
const TIMEZONE_CITIES_CONFIG = [
    { label: 'IST', timezone: 'Asia/Kolkata', icon: 'fas fa-sun', elementId: 'ist-time' },
    { label: 'LDN', timezone: 'Europe/London', icon: 'fas fa-globe-europe', elementId: 'ldn-time' },
    { label: 'NY', timezone: 'America/New_York', icon: 'fas fa-city', elementId: 'ny-time' },
    { label: 'TYO', timezone: 'Asia/Tokyo', icon: 'fas fa-yen-sign', elementId: 'tyo-time' },
    { label: 'SYD', timezone: 'Australia/Sydney', icon: 'fas fa-globe-asia', elementId: 'syd-time' },
    { label: 'UTC', timezone: 'UTC', icon: 'fas fa-globe', elementId: 'utc-time' }
];

// --- Main Application Controller ---
const App = {
    currentTool: 'analyzer', // Default active tool

    // Initializes the entire application
    initializeApp: function() {
        this.loadState();          // Load application state from local storage
        this.renderTimezoneClocks(); // Dynamically create timezone clock elements
        this.setupToolSwitching(); // Set up navigation between tools
        this.setupGlobalEventListeners(); // Attach global event listeners
        this.startClocks();        // Start updating clocks

        // Determine which tool to activate on initial load based on URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const toolFromUrl = urlParams.get('tool');
        if (toolFromUrl === 'pivot') {
            this.switchTool('pivot');
        } else {
            this.switchTool('analyzer'); // Default to analyzer
        }
    },

    // Loads state for both tools from local storage
    loadState: function() {
        // Load Flow Analyzer state
        const storedFlowAnalyzerState = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOW_ANALYZER_STATE));
        if (storedFlowAnalyzerState) {
            Object.assign(flowAnalyzer, storedFlowAnalyzerState);
            // Re-initialize Set for selectedFormulas if loaded from plain object
            if (flowAnalyzer.selectedFormulas && Array.isArray(flowAnalyzer.selectedFormulas)) {
                 flowAnalyzer.selectedFormulas = new Set(flowAnalyzer.selectedFormulas);
            }
        }

        // Load Pivot Calculator state
        const storedPivotCalculatorState = JSON.parse(localStorage.getItem(STORAGE_KEYS.PIVOT_CALCULATOR_STATE));
        if (storedPivotCalculatorState) {
            Object.assign(pivotCalculator, storedPivotCalculatorState);
            // Re-initialize Set for selectedFormulas if loaded from plain object
            if (pivotCalculator.selectedFormulas && Array.isArray(pivotCalculator.selectedFormulas)) {
                 pivotCalculator.selectedFormulas = new Set(pivotCalculator.selectedFormulas);
            } else { // Ensure it's a Set even if nothing was stored (new session)
                pivotCalculator.selectedFormulas = new Set();
            }
        } else { // If no pivot state, initialize selectedFormulas as a Set
            pivotCalculator.selectedFormulas = new Set();
        }


        // Load last active tool
        const lastTool = localStorage.getItem(STORAGE_KEYS.CURRENT_TOOL);
        if (lastTool) {
            this.currentTool = lastTool;
        }
    },

    // Saves state for both tools to local storage
    saveState: function() {
        // Convert Sets to Arrays for localStorage storage
        const flowAnalyzerStateToSave = { ...flowAnalyzer, selectedFormulas: Array.from(flowAnalyzer.selectedFormulas) };
        const pivotCalculatorStateToSave = { ...pivotCalculator, selectedFormulas: Array.from(pivotCalculator.selectedFormulas) };

        localStorage.setItem(STORAGE_KEYS.FLOW_ANALYZER_STATE, JSON.stringify(flowAnalyzerStateToSave));
        localStorage.setItem(STORAGE_KEYS.PIVOT_CALCULATOR_STATE, JSON.stringify(pivotCalculatorStateToSave));
        localStorage.setItem(STORAGE_KEYS.CURRENT_TOOL, this.currentTool);
    },

    // Attaches global event listeners (e.g., Clear All Data, Keyboard Shortcuts)
    setupGlobalEventListeners: function() {
        GlobalDOMElements.clearAllDataBtn.addEventListener('click', () => this.clearAllData());

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            // Prevent shortcuts if typing in an input/textarea, except for Escape key
            if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.key !== 'Escape') {
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default form submission behavior
                if (this.currentTool === 'analyzer') {
                    FlowAnalyzer.submitEntries();
                } else if (this.currentTool === 'pivot') {
                    PivotCalculator.calculateAllLevels();
                }
            } else if (e.key.toLowerCase() === 'b' && this.currentTool === 'analyzer') {
                FlowAnalyzer.recordAction('buy', 0.5);
            } else if (e.key.toLowerCase() === 's' && this.currentTool === 'analyzer') {
                FlowAnalyzer.recordAction('sell', 0.5);
            } else if (e.key.toLowerCase() === 'r' && this.currentTool === 'analyzer') {
                FlowAnalyzer.resetCurrentCounts();
            } else if (e.key.toLowerCase() === 'i') { // 'I' for Info/Parameters section toggle (Flow Analyzer)
                if (this.currentTool === 'analyzer') {
                    FlowAnalyzer.elements.notesParamsContent.classList.toggle('active');
                    if (FlowAnalyzer.elements.notesParamsContent.classList.contains('active')) {
                        FlowAnalyzer.updateHistoryWithNotesDisplay(FlowAnalyzer.elements.noteSearchInput.value);
                        FlowAnalyzer.updateParametersDisplay();
                        FlowAnalyzer.updateJournalDisplay();
                    }
                }
            } else if (e.key === 'Escape') { // Close collapsible with escape
                if (this.currentTool === 'analyzer' && FlowAnalyzer.elements.notesParamsContent.classList.contains('active')) {
                    FlowAnalyzer.elements.notesParamsContent.classList.remove('active');
                    e.target.blur(); // Remove focus from active element
                }
            }
        });

        // Auto-save state to local storage just before the page is unloaded
        window.addEventListener('beforeunload', () => this.saveState());
    },

    // Clears all data for both tools
    clearAllData: function() {
        if (!confirm('Are you sure you want to CLEAR ALL APPLICATION DATA (including all Flow Analyzer data and all Pivot Calculator settings/inputs)? This action cannot be undone.')) {
            return;
        }

        // Reset Flow Analyzer data
        flowAnalyzer.buyCount = 0;
        flowAnalyzer.sellCount = 0;
        flowAnalyzer.selectedBuy = 0;
        flowAnalyzer.selectedSell = 0;
        flowAnalyzer.selectionStack = [];
        flowAnalyzer.historyList = [];
        flowAnalyzer.historyWithNotes = [];
        flowAnalyzer.journalEntries = [];
        flowAnalyzer.customParameters = [
            { id: 'btt', label: 'BTT', value: 1.0, subText: null }, { id: 'futlevel', label: 'FUTLEVEL', value: 1.0, subText: null },
            { id: 'vsa', label: 'VSA', value: 1.0, subText: '(0.5 for weak signs)' }, { id: 'vlevel', label: 'VLEVEL', value: 1.0, subText: '(0.5 for derivations)' },
            { id: 'wfutlevel', label: 'WFUTLEVEL', value: 0.5, subText: null },
            { id: 'mtf-confirmation', label: 'MTF CONFIRMATION', value: 1.0, subText: '(0.5=Down TF + 0.5=Up TF)' }
        ];

        // Reset Pivot Calculator data
        pivotCalculator.selectedFormulas.clear();
        pivotCalculator.allLevels = [];
        pivotCalculator.convergenceThreshold = 3;
        pivotCalculator.toleranceValue = 0.50;

        // Clear input fields for both tools explicitly
        FlowAnalyzer.elements.buyInput.value = '0.0';
        FlowAnalyzer.elements.sellInput.value = '0.0';
        PivotCalculator.elements.yesterdayHigh.value = '';
        PivotCalculator.elements.yesterdayLow.value = '';
        PivotCalculator.elements.yesterdayClose.value = '';
        PivotCalculator.elements.todayOpen.value = '';
        PivotCalculator.elements.yesterdayOpen.value = '';
        PivotCalculator.elements.resultsSection.style.display = 'none';
        PivotCalculator.elements.recurringSection.style.display = 'none';
        PivotCalculator.elements.convergenceSlider.value = 3;
        PivotCalculator.elements.toleranceInput.value = 0.50;
        PivotCalculator.elements.toleranceSlider.value = 0.5;

        // Re-initialize pivot calculator formulas to default selected
        pivotCalculator.selectedFormulas.add('formula0');
        pivotCalculator.selectedFormulas.add('formula1');
        pivotCalculator.selectedFormulas.add('formula2');

        this.saveState(); // Save the cleared state
        window.location.reload(); // Reload the page to ensure fresh state and UI
    },

    // Manages switching between Flow Analyzer and Pivot Calculator
    setupToolSwitching: function() {
        GlobalDOMElements.navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const toolToActivate = e.target.dataset.tool;
                this.switchTool(toolToActivate);
            });
        });
    },

    switchTool: function(toolName) {
        // Update active class on navigation buttons
        GlobalDOMElements.navButtons.forEach(button => {
            if (button.dataset.tool === toolName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Hide all tool sections
        GlobalDOMElements.flowAnalyzerSection.classList.remove('active');
        GlobalDOMElements.pivotCalculatorSection.classList.remove('active');

        // Show the selected tool section
        if (toolName === 'analyzer') {
            GlobalDOMElements.flowAnalyzerSection.classList.add('active');
            this.currentTool = 'analyzer';
            FlowAnalyzer.updateAllDisplays(); // Update Flow Analyzer UI when activated
            // Ensure collapsible section is collapsed when switching to it
            FlowAnalyzer.elements.notesParamsContent.classList.remove('active');
        } else if (toolName === 'pivot') {
            GlobalDOMElements.pivotCalculatorSection.classList.add('active');
            this.currentTool = 'pivot';
            PivotCalculator.initializeApp(); // (Re)Initialize Pivot Calculator UI when activated
            PivotCalculator.calculateAllLevels(); // Recalculate on switch if inputs are present
        }
        this.saveState(); // Remember the active tool
    },

    // --- Global Utility Functions (e.g., Clocks, Press-and-Hold) ---

    // Dynamically renders the HTML elements for each timezone clock
    renderTimezoneClocks: function() {
        GlobalDOMElements.timezoneClocksContainer.innerHTML = TIMEZONE_CITIES_CONFIG.map(tz => `
            <div class="time-zone">
                <span class="time-label"><i class="${tz.icon}"></i> ${tz.label}:</span>
                <span class="time-value" id="${tz.elementId}">--:--:-- --</span>
            </div>
        `).join('');
    },

    // Updates the displayed time for the local clock and all timezone clocks
    updateClocks: function() {
        const now = new Date();

        // Update the local live clock
        GlobalDOMElements.liveClock.innerText = now.toLocaleTimeString();

        // Update each specific timezone clock (FIX: Ensure correct element IDs are targeted)
        TIMEZONE_CITIES_CONFIG.forEach(tz => {
            const element = document.getElementById(tz.elementId);
            if (element) {
                element.innerText = now.toLocaleTimeString('en-US', {
                    timeZone: tz.timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
            } else {
                console.warn(`Timezone element not found for ID: ${tz.elementId}`);
            }
        });
    },

    // Starts the interval to update clocks every second
    startClocks: function() {
        this.updateClocks(); // Call once immediately to display time on load
        setInterval(() => this.updateClocks(), 1000); // Update every second
    },

    // Press and Hold Logic for Increment/Deduct Buttons (Global scope for shared interval/timeout)
    holdInterval: null,
    holdTimeout: null,
    HOLD_INITIAL_DELAY: 300,
    HOLD_REPEAT_RATE: 100,

    startHold: function(actionFunction, actionType, changeValue) {
        App.stopHold(); // Clear any existing hold timers
        actionFunction(actionType, changeValue); // Perform action immediately

        App.holdTimeout = setTimeout(() => {
            App.holdInterval = setInterval(() => {
                actionFunction(actionType, changeValue);
            }, App.HOLD_REPEAT_RATE);
        }, App.HOLD_INITIAL_DELAY);
    },

    stopHold: function() {
        clearTimeout(App.holdTimeout);
        clearInterval(App.holdInterval);
    }
};

// --- Encapsulates all functionality related to the Flow Analyzer tool ---
// Note: FlowAnalyzer.elements are initialized directly on DOMContentLoaded to ensure they exist.
// This module contains its own update functions and specific event listeners.
const FlowAnalyzer = { // Re-declared as a const with full content below for clarity
    elements: {
        buyInput: document.getElementById('buy-input'),
        sellInput: document.getElementById('sell-input'),
        incrementButtons: document.querySelectorAll('#flow-analyzer-section .btn-increment'),
        deductButtons: document.querySelectorAll('#flow-analyzer-section .btn-deduct'),
        submitEntriesBtn: document.getElementById('submitEntriesBtn'),
        resetCurrentBtn: document.getElementById('resetCurrentBtn'),
        undoLastActionBtn: document.getElementById('undoLastActionBtn'),
        selectedBuyDisplay: document.getElementById('selected-buy'),
        selectedSellDisplay: document.getElementById('selected-sell'),
        buyCountDisplay: document.getElementById('buy-count'),
        sellCountDisplay: document.getElementById('sell-count'),
        differenceDisplay: document.getElementById('difference'),
        percentageDisplay: document.getElementById('percentage'),
        conclusionText: document.getElementById('conclusion'),
        sentimentBadge: document.getElementById('sentiment-badge'),
        analysisConclusionArea: document.getElementById('analysis-conclusion-area'),
        historyContainer: document.getElementById('history'),
        toggleNotesParamsBtn: document.getElementById('toggleNotesParamsBtn'),
        notesParamsContent: document.getElementById('notes-params-content'),
        historyWithNotesContainer: document.getElementById('historyWithNotes'),
        noteSearchInput: document.getElementById('note-search'),
        parameterGrid: document.getElementById('parameter-grid'),
        newParamLabelInput: document.getElementById('new-param-label'),
        newParamValueInput: document.getElementById('new-param-value'),
        addParameterBtn: document.getElementById('addParameterBtn'),
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
    },

    updateSelectionDisplay: function() {
        this.elements.selectedBuyDisplay.innerText = flowAnalyzer.selectedBuy.toFixed(1);
        this.elements.selectedSellDisplay.innerText = flowAnalyzer.selectedSell.toFixed(1);
        this.elements.buyInput.value = flowAnalyzer.selectedBuy.toFixed(1);
        this.elements.sellInput.value = flowAnalyzer.selectedSell.toFixed(1);
    },

    updateAnalysisDisplay: function() {
        const total = flowAnalyzer.buyCount + flowAnalyzer.sellCount;
        const difference = Math.abs(flowAnalyzer.buyCount - flowAnalyzer.sellCount);
        const percentage = total ? ((difference / total) * 100).toFixed(2) : 0;

        let conclusion = '';
        if (total === 0 && flowAnalyzer.buyCount === 0 && flowAnalyzer.sellCount === 0) {
            conclusion = 'NO SIGNAL';
        } else if (flowAnalyzer.buyCount === flowAnalyzer.sellCount) {
            conclusion = 'BOTH ARE EQUAL';
        } else if (percentage <= 25) {
            conclusion = flowAnalyzer.buyCount > flowAnalyzer.sellCount ? 'BUY RETRACEMENT EXPECTED' : 'SELL RETRACEMENT EXPECTED';
        } else if (percentage > 66) {
            conclusion = flowAnalyzer.buyCount > flowAnalyzer.sellCount ? 'STRONG BUY' : 'STRONG SELL';
        } else {
            conclusion = flowAnalyzer.buyCount > flowAnalyzer.sellCount ? 'NORMAL BUY' : 'NORMAL SELL';
        }

        this.elements.buyCountDisplay.innerText = flowAnalyzer.buyCount.toFixed(1);
        this.elements.sellCountDisplay.innerText = flowAnalyzer.sellCount.toFixed(1);
        this.elements.differenceDisplay.innerText = difference.toFixed(1);
        this.elements.percentageDisplay.innerText = `${percentage}%`;
        this.elements.conclusionText.innerText = `Conclusion: ${conclusion}`;

        const style = SENTIMENT_STYLES[conclusion] || SENTIMENT_STYLES['NO SIGNAL'];
        this.elements.sentimentBadge.className = `sentiment-badge ${style.className}`;
        this.elements.sentimentBadge.innerText = style.msg;

        this.elements.analysisConclusionArea.classList.remove('highlight');
        void this.elements.analysisConclusionArea.offsetWidth;
        this.elements.analysisConclusionArea.classList.add('highlight');
    },

    updateHistoryDisplay: function() {
        if (flowAnalyzer.historyList.length === 0) {
            this.elements.historyContainer.innerHTML = '<p class="text-center text-text-dark py-4">No entries yet.</p>';
            return;
        }
        this.elements.historyContainer.innerHTML = flowAnalyzer.historyList.map(entry =>
            `<div class="history-item fade-in">
                <div class="history-data">${entry}</div>
            </div>`
        ).join('');
    },

    updateHistoryWithNotesDisplay: function(searchTerm = '') {
        const filteredHistory = flowAnalyzer.historyWithNotes.filter(entry =>
            (entry.noteTitle && entry.noteTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (entry.note && entry.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
            entry.conclusion.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.timestamp.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredHistory.length === 0 && searchTerm === '') {
            this.elements.historyWithNotesContainer.innerHTML = '<p class="text-center text-text-dark py-4">No detailed entries yet.</p>';
            return;
        } else if (filteredHistory.length === 0 && searchTerm !== '') {
            this.elements.historyWithNotesContainer.innerHTML = '<p class="text-center text-text-dark py-4">No matching entries found.</p>';
            return;
        }

        this.elements.historyWithNotesContainer.innerHTML = filteredHistory.map(entry => `
            <div class="history-item">
                <div class="history-timestamp">${entry.timestamp}</div>
                <div class="history-title-input-group">
                    <input type="text"
                        class="history-title-input"
                        placeholder="Entry Title (e.g., 'Pre-Earnings Analysis')"
                        data-entry-id="${entry.id}"
                        data-field="noteTitle"
                        value="${entry.noteTitle || ''}"
                        onchange="FlowAnalyzer.updateNoteField(${entry.id}, 'noteTitle', this.value)">
                </div>
                <div class="history-data">
                    ${entry.conclusion} | BUYS: ${flowAnalyzer.buyCount.toFixed(1)} | SELLS: ${flowAnalyzer.sellCount.toFixed(1)} | %DIFF: ${entry.percentage}%
                </div>
                <textarea
                    class="text-input"
                    rows="3"
                    placeholder="Add your trading notes for this entry..."
                    data-entry-id="${entry.id}"
                    data-field="note"
                    onchange="FlowAnalyzer.updateNoteField(${entry.id}, 'note', this.value)"
                >${entry.note || ''}</textarea>
            </div>
        `).join('');
    },

    updateNoteField: function(entryId, field, value) {
        const entry = flowAnalyzer.historyWithNotes.find(h => h.id === entryId);
        if (entry) {
            entry[field] = value;
            App.saveState();
        }
    },

    updateJournalDisplay: function() {
        if (flowAnalyzer.journalEntries.length === 0) {
            this.elements.journalEntriesContainer.innerHTML = '<p class="text-center text-text-dark py-4">No trades logged yet.</p>';
            return;
        }
        this.elements.journalEntriesContainer.innerHTML = flowAnalyzer.journalEntries.map(entry => `
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
    },

    updateParametersDisplay: function() {
        if (flowAnalyzer.customParameters.length === 0) {
            this.elements.parameterGrid.innerHTML = '<p class="text-center text-text-dark py-4 col-span-full">No parameters added yet.</p>';
            return;
        }
        this.elements.parameterGrid.innerHTML = flowAnalyzer.customParameters.map(param => `
            <div class="parameter-item">
                <button class="delete-param-btn" data-param-id="${param.id}" title="Remove Parameter"><i class="fas fa-times"></i></button>
                <div class="parameter-value text-accent-yellow">${param.value.toFixed(1)}</div>
                <div class="parameter-label">
                    ${param.label}
                    ${param.subText ? `<span class="sub-text">${param.subText}</span>` : ''}
                </div>
            </div>
        `).join('');

        this.elements.parameterGrid.querySelectorAll('.delete-param-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const paramId = event.currentTarget.dataset.paramId;
                FlowAnalyzer.removeParameter(paramId);
            });
        });
    },

    updateAllDisplays: function() {
        this.updateSelectionDisplay();
        this.updateAnalysisDisplay();
        this.updateHistoryDisplay();
        this.updateJournalDisplay();
        this.updateParametersDisplay();
    },

    recordAction: function(type, change) {
        if (type === 'buy') {
            flowAnalyzer.selectedBuy = Math.max(0, parseFloat((flowAnalyzer.selectedBuy + change).toFixed(1)));
        } else if (type === 'sell') {
            flowAnalyzer.selectedSell = Math.max(0, parseFloat((flowAnalyzer.selectedSell + change).toFixed(1)));
        }
        flowAnalyzer.selectionStack.push({ type: type, change: change });
        this.updateSelectionDisplay();
    },

    handleInputChanges: function(type, event) {
        let value = parseFloat(event.target.value);
        if (isNaN(value)) value = 0;
        value = parseFloat(value.toFixed(1));

        if (type === 'buy') {
            const oldValue = flowAnalyzer.selectedBuy;
            flowAnalyzer.selectedBuy = value;
            flowAnalyzer.selectionStack.push({ type: 'input_buy', original: oldValue, new: value });
        } else if (type === 'sell') {
            const oldValue = flowAnalyzer.selectedSell;
            flowAnalyzer.selectedSell = value;
            flowAnalyzer.selectionStack.push({ type: 'input_sell', original: oldValue, new: value });
        }
        this.updateSelectionDisplay();
    },

    undoLastAction: function() {
        const lastAction = flowAnalyzer.selectionStack.pop();
        if (!lastAction) return;

        if (lastAction.type === 'buy') {
            flowAnalyzer.selectedBuy = Math.max(0, parseFloat((flowAnalyzer.selectedBuy - lastAction.change).toFixed(1)));
        } else if (lastAction.type === 'sell') {
            flowAnalyzer.selectedSell = Math.max(0, parseFloat((flowAnalyzer.selectedSell - lastAction.change).toFixed(1)));
        } else if (lastAction.type === 'input_buy') {
            flowAnalyzer.selectedBuy = lastAction.original;
        } else if (lastAction.type === 'input_sell') {
            flowAnalyzer.selectedSell = lastAction.original;
        }
        this.updateSelectionDisplay();
    },

    submitEntries: function() {
        if (flowAnalyzer.selectedBuy === 0 && flowAnalyzer.selectedSell === 0) {
            alert('Please add some Buy or Sell flow before submitting.');
            return;
        }

        flowAnalyzer.buyCount += flowAnalyzer.selectedBuy;
        flowAnalyzer.sellCount += flowAnalyzer.selectedSell;

        const now = new Date();
        const timestamp = now.toLocaleString();

        const total = flowAnalyzer.buyCount + flowAnalyzer.sellCount;
        const difference = Math.abs(flowAnalyzer.buyCount - flowAnalyzer.sellCount);
        const percentage = total ? ((difference / total) * 100).toFixed(2) : 0;

        let conclusion = '';
        if (total === 0 && flowAnalyzer.buyCount === 0 && flowAnalyzer.sellCount === 0) {
            conclusion = 'NO SIGNAL';
        } else if (flowAnalyzer.buyCount === flowAnalyzer.sellCount) {
            conclusion = 'BOTH ARE EQUAL';
        } else if (percentage <= 25) {
            conclusion = flowAnalyzer.buyCount > flowAnalyzer.sellCount ? 'BUY RETRACEMENT EXPECTED' : 'SELL RETRACEMENT EXPECTED';
        } else if (percentage > 66) {
            conclusion = flowAnalyzer.buyCount > flowAnalyzer.sellCount ? 'STRONG BUY' : 'STRONG SELL';
        } else {
            conclusion = flowAnalyzer.buyCount > flowAnalyzer.sellCount ? 'NORMAL BUY' : 'NORMAL SELL';
        }

        const historyEntry = `${timestamp} | ${conclusion} | BUYS: ${flowAnalyzer.buyCount.toFixed(1)} | SELLS: ${flowAnalyzer.sellCount.toFixed(1)} | %DIFF: ${percentage}%`;
        flowAnalyzer.historyList.unshift(historyEntry);
        if (flowAnalyzer.historyList.length > 30) { flowAnalyzer.historyList.pop(); }

        const detailedEntry = {
            id: Date.now(), timestamp: timestamp, conclusion: conclusion,
            buyCount: flowAnalyzer.buyCount, sellCount: flowAnalyzer.sellCount, percentage: percentage,
            noteTitle: '', note: ''
        };
        flowAnalyzer.historyWithNotes.unshift(detailedEntry);
        if (flowAnalyzer.historyWithNotes.length > 30) { flowAnalyzer.historyWithNotes.pop(); }

        flowAnalyzer.selectedBuy = 0;
        flowAnalyzer.selectedSell = 0;
        flowAnalyzer.selectionStack = [];

        this.updateAllDisplays();
        App.saveState();
    },

    resetCurrentCounts: function() {
        if (!confirm('Are you sure you want to reset the current pending flow?')) { return; }
        flowAnalyzer.selectedBuy = 0;
        flowAnalyzer.selectedSell = 0;
        flowAnalyzer.selectionStack = [];
        this.updateSelectionDisplay();
    },

    addParameter: function() {
        const label = this.elements.newParamLabelInput.value.trim();
        let value = parseFloat(this.elements.newParamValueInput.value);
        if (!label) { alert('Parameter label cannot be empty.'); return; }
        if (isNaN(value)) { value = 0.0; }

        const newParam = { id: 'custom-' + Date.now(), label: label, value: parseFloat(value.toFixed(1)), subText: null };
        flowAnalyzer.customParameters.push(newParam);
        this.elements.newParamLabelInput.value = '';
        this.elements.newParamValueInput.value = 1.0;
        this.updateParametersDisplay();
        App.saveState();
    },

    removeParameter: function(paramId) {
        if (!confirm('Are you sure you want to remove this parameter?')) { return; }
        flowAnalyzer.customParameters = flowAnalyzer.customParameters.filter(param => param.id !== paramId);
        this.updateParametersDisplay();
        App.saveState();
    },

    saveTrade: function() {
        const instrument = this.elements.tradeInstrumentInput.value.trim();
        const entryPrice = parseFloat(this.elements.tradeEntryPriceInput.value);
        const exitPrice = parseFloat(this.elements.tradeExitPriceInput.value);
        const pnl = parseFloat(this.elements.tradePnlInput.value);
        const date = this.elements.tradeDateInput.value;
        const notes = this.elements.tradeNotesInput.value.trim();

        if (!instrument || !date) { alert('Instrument and Date are required to log a trade.'); return; }

        const newTrade = {
            id: Date.now(), instrument: instrument,
            entryPrice: isNaN(entryPrice) ? null : parseFloat(entryPrice.toFixed(2)),
            exitPrice: isNaN(exitPrice) ? null : parseFloat(exitPrice.toFixed(2)),
            pnl: isNaN(pnl) ? null : parseFloat(pnl.toFixed(2)),
            date: date, notes: notes
        };
        flowAnalyzer.journalEntries.unshift(newTrade);
        if (flowAnalyzer.journalEntries.length > 50) { flowAnalyzer.journalEntries.pop(); }
        this.updateJournalDisplay();
        App.saveState();
        this.clearJournalForm();
    },

    clearJournalForm: function() {
        this.elements.tradeInstrumentInput.value = '';
        this.elements.tradeEntryPriceInput.value = '';
        this.elements.tradeExitPriceInput.value = '';
        this.elements.tradePnlInput.value = '';
        this.elements.tradeDateInput.value = new Date().toISOString().split('T')[0];
        this.elements.tradeNotesInput.value = '';
    },

    clearJournal: function() {
        if (!confirm('Are you sure you want to clear ALL trading journal entries? This cannot be undone.')) { return; }
        flowAnalyzer.journalEntries = [];
        this.updateJournalDisplay();
        App.saveState();
    },

    // Setup Event Listeners specific to Flow Analyzer (called when Flow Analyzer is activated)
    setupEventListeners: function() {
        const self = this; // Reference to FlowAnalyzer

        this.elements.incrementButtons.forEach(button => {
            const action = button.dataset.action; const change = parseFloat(button.dataset.change);
            button.addEventListener('mousedown', () => App.startHold(self.recordAction.bind(self), action, change));
            button.addEventListener('mouseup', App.stopHold); button.addEventListener('mouseleave', App.stopHold);
            button.addEventListener('touchstart', (e) => { e.preventDefault(); App.startHold(self.recordAction.bind(self), action, change); }, { passive: false });
            button.addEventListener('touchend', App.stopHold); button.addEventListener('touchcancel', App.stopHold);
        });

        this.elements.deductButtons.forEach(button => {
            const action = button.dataset.action; const change = parseFloat(button.dataset.change);
            button.addEventListener('mousedown', () => App.startHold(self.recordAction.bind(self), action, change));
            button.addEventListener('mouseup', App.stopHold); button.addEventListener('mouseleave', App.stopHold);
            button.addEventListener('touchstart', (e) => { e.preventDefault(); App.startHold(self.recordAction.bind(self), action, change); }, { passive: false });
            button.addEventListener('touchend', App.stopHold); button.addEventListener('touchcancel', App.stopHold);
        });

        this.elements.buyInput.addEventListener('input', (e) => self.handleInputChanges('buy', e));
        this.elements.sellInput.addEventListener('input', (e) => self.handleInputChanges('sell', e));

        this.elements.submitEntriesBtn.addEventListener('click', () => self.submitEntries());
        this.elements.resetCurrentBtn.addEventListener('click', () => self.resetCurrentCounts());
        this.elements.undoLastActionBtn.addEventListener('click', () => self.undoLastAction());

        this.elements.toggleNotesParamsBtn.addEventListener('click', () => {
            self.elements.notesParamsContent.classList.toggle('active');
            if (self.elements.notesParamsContent.classList.contains('active')) {
                self.updateHistoryWithNotesDisplay(self.elements.noteSearchInput.value);
                self.updateParametersDisplay();
                self.updateJournalDisplay();
            }
        });

        // FIX: Ensure listener is attached to the note search input
        this.elements.noteSearchInput.addEventListener('input', (e) => self.updateHistoryWithNotesDisplay(e.target.value));

        this.elements.addParameterBtn.addEventListener('click', () => self.addParameter());

        this.elements.saveTradeBtn.addEventListener('click', () => self.saveTrade());
        this.elements.clearJournalFormBtn.addEventListener('click', () => self.clearJournalForm());
        this.elements.clearJournalBtn.addEventListener('click', () => self.clearJournal());
    }
};


// Encapsulates all functionality related to the NIFTY Pivot Calculator tool
const PivotCalculator = { // Re-declared as a const with full content below for clarity
    elements: {
        pivotCalculatorSection: document.getElementById('pivot-calculator-section'),
        yesterdayHigh: document.getElementById('yesterday-high'),
        yesterdayLow: document.getElementById('yesterday-low'),
        yesterdayClose: document.getElementById('yesterday-close'),
        todayOpen: document.getElementById('today-open'),
        yesterdayOpen: document.getElementById('yesterday-open'),
        formulaGrid: document.getElementById('formula-grid'),
        selectAllFormulasBtn: document.getElementById('selectAllFormulasBtn'),
        clearAllFormulasBtn: document.getElementById('clearAllFormulasBtn'),
        calculateLevelsBtn: document.getElementById('calculateLevelsBtn'),
        convergenceSlider: document.getElementById('convergence-slider'),
        convergenceValueDisplay: document.getElementById('convergence-value'),
        toleranceInput: document.getElementById('tolerance-input'),
        toleranceSlider: document.getElementById('tolerance-slider'),
        toleranceValueDisplay: document.getElementById('tolerance-value'),
        minConvergenceDisplay: document.getElementById('min-convergence-display'),
        toleranceDisplayRecurring: document.getElementById('tolerance-display-recurring'), // Corrected ID
        resultsSection: document.getElementById('pivot-results-section'),
        individualResultsContainer: document.getElementById('individual-results'),
        recurringSection: document.getElementById('pivot-recurring-section'),
        recurringResultsContainer: document.getElementById('recurring-results'),
    },

    initializeApp: function() {
        this.populateFormulaGrid(); // This will also attach click listeners
        this.updateFormulaSelection(); // Update UI based on loaded selection
        this.updateConvergenceDisplay(pivotCalculator.convergenceThreshold); // Set slider/display
        this.updateToleranceDisplay(pivotCalculator.toleranceValue); // Set slider/display

        // Attach specific event listeners for Pivot Calculator after UI is rendered
        this.elements.selectAllFormulasBtn.addEventListener('click', () => this.selectAllFormulas());
        this.elements.clearAllFormulasBtn.addEventListener('click', () => this.clearAllFormulas());
        this.elements.calculateLevelsBtn.addEventListener('click', () => this.calculateAllLevels());
        this.elements.convergenceSlider.addEventListener('input', (e) => this.updateConvergenceDisplay(e.target.value));
        this.elements.toleranceInput.addEventListener('input', (e) => this.updateToleranceDisplay(e.target.value));
        this.elements.toleranceSlider.addEventListener('input', (e) => this.updateToleranceDisplay(e.target.value));

         // Populate inputs from saved state if any
         if (pivotCalculator.yesterdayHigh) this.elements.yesterdayHigh.value = pivotCalculator.yesterdayHigh;
         if (pivotCalculator.yesterdayLow) this.elements.yesterdayLow.value = pivotCalculator.yesterdayLow;
         if (pivotCalculator.yesterdayClose) this.elements.yesterdayClose.value = pivotCalculator.yesterdayClose;
         if (pivotCalculator.todayOpen) this.elements.todayOpen.value = pivotCalculator.todayOpen;
         if (pivotCalculator.yesterdayOpen) this.elements.yesterdayOpen.value = pivotCalculator.yesterdayOpen;

         // Attach input listeners for saving pivot input values
         this.elements.yesterdayHigh.addEventListener('input', (e) => { pivotCalculator.yesterdayHigh = e.target.value; App.saveState(); });
         this.elements.yesterdayLow.addEventListener('input', (e) => { pivotCalculator.yesterdayLow = e.target.value; App.saveState(); });
         this.elements.yesterdayClose.addEventListener('input', (e) => { pivotCalculator.yesterdayClose = e.target.value; App.saveState(); });
         this.elements.todayOpen.addEventListener('input', (e) => { pivotCalculator.todayOpen = e.target.value; App.saveState(); });
         this.elements.yesterdayOpen.addEventListener('input', (e) => { pivotCalculator.yesterdayOpen = e.target.value; App.saveState(); });

         // Show results if they exist from a previous session
         if (pivotCalculator.allLevels.length > 0) {
            this.elements.resultsSection.style.display = 'block';
            this.elements.recurringSection.style.display = 'block';
            this.displayIndividualResultsFromState();
            this.displayRecurringLevels();
        } else {
            this.elements.resultsSection.style.display = 'none';
            this.elements.recurringSection.style.display = 'none';
        }
    },

    populateFormulaGrid: function() {
        this.elements.formulaGrid.innerHTML = pivotCalculator.formulas.map(formula => `
            <div class="formula-card" data-formula="${formula.id}">
                <div class="formula-title">${formula.name}</div>
                <div class="formula-description">${formula.description}</div>
            </div>
        `).join('');

        this.elements.formulaGrid.querySelectorAll('.formula-card').forEach(card => {
            card.addEventListener('click', () => this.toggleFormula(card.dataset.formula));
        });
    },

    toggleFormula: function(formulaId) {
        if (pivotCalculator.selectedFormulas.has(formulaId)) {
            pivotCalculator.selectedFormulas.delete(formulaId);
        } else {
            pivotCalculator.selectedFormulas.add(formulaId);
        }
        this.updateFormulaSelection();
    },

    updateFormulaSelection: function() {
        this.elements.formulaGrid.querySelectorAll('.formula-card').forEach(card => {
            const formulaId = card.dataset.formula;
            if (pivotCalculator.selectedFormulas.has(formulaId)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        App.saveState();
    },

    updateConvergenceDisplay: function(value) {
        pivotCalculator.convergenceThreshold = parseInt(value);
        this.elements.convergenceValueDisplay.textContent = value;
        this.elements.minConvergenceDisplay.textContent = value;
        App.saveState();
        if (pivotCalculator.allLevels.length > 0) { this.displayRecurringLevels(); }
    },

    updateToleranceDisplay: function(value) {
        pivotCalculator.toleranceValue = parseFloat(value);
        this.elements.toleranceValueDisplay.textContent = value.toFixed(2);
        this.elements.toleranceInput.value = value.toFixed(2); // Keep input and slider in sync
        this.elements.toleranceSlider.value = value;
        this.elements.toleranceDisplayRecurring.textContent = value.toFixed(2); // Update recurring section text
        App.saveState();
        if (pivotCalculator.allLevels.length > 0) { this.displayRecurringLevels(); }
    },

    copyToClipboard: function(text) {
        navigator.clipboard.writeText(text).then(() => {
            const notification = document.createElement('div');
            notification.textContent = `COPIED: ${text}`;
            notification.className = 'clipboard-notification';
            document.body.appendChild(notification);
            setTimeout(() => { notification.remove(); }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert(`Copied: ${text}`);
        });
    },

    calculateAllLevels: function() {
        const high = parseFloat(this.elements.yesterdayHigh.value);
        const low = parseFloat(this.elements.yesterdayLow.value);
        const close = parseFloat(this.elements.yesterdayClose.value);
        const todayOpen = parseFloat(this.elements.todayOpen.value) || null;
        const yesterdayOpen = parseFloat(this.elements.yesterdayOpen.value) || null;

        if (isNaN(high) || isNaN(low) || isNaN(close)) {
            alert('Please enter valid numbers for High, Low, and Close.');
            return;
        }

        if (high < low) {
            alert('High value cannot be less than Low value.');
            return;
        }

        if (pivotCalculator.selectedFormulas.size === 0) {
            alert('Please select at least one formula.');
            return;
        }

        pivotCalculator.allLevels = []; // Reset for new calculation
        const results = {};

        pivotCalculator.formulas.forEach(formula => {
            if (pivotCalculator.selectedFormulas.has(formula.id)) {
                const levels = formula.calculate(high, low, close, todayOpen, yesterdayOpen);

                if (levels) { // Only process if calculation was successful (e.g., if optional inputs were met)
                    results[formula.id] = { name: formula.name, levels: levels };
                    Object.entries(levels).forEach(([label, value]) => {
                        if (!isNaN(value) && isFinite(value)) { // Filter out NaN or Infinity results
                            pivotCalculator.allLevels.push({
                                formula: formula.name,
                                label: label,
                                value: parseFloat(value.toFixed(2)), // Store with 2 decimal places
                                type: label === 'PP' ? 'pivot' : (label.startsWith('R') ? 'resistance' : 'support')
                            });
                        }
                    });
                }
            }
        });

        this.displayIndividualResults(results);
        this.displayRecurringLevels();

        this.elements.resultsSection.style.display = 'block';
        this.elements.recurringSection.style.display = 'block';
        App.saveState(); // Save calculated levels
    },

    displayIndividualResults: function(results) {
        const container = this.elements.individualResultsContainer;
        container.innerHTML = '';

        if (Object.keys(results).length === 0) {
            container.innerHTML = '<p class="text-center text-text-dark py-4">No results to display. Check your inputs or formula selection.</p>';
            return;
        }

        Object.entries(results).forEach(([formulaId, data]) => {
            const formulaDiv = document.createElement('div');
            formulaDiv.className = 'section-card pivot-formula-result-card';
            formulaDiv.style.marginBottom = '16px'; // Add some spacing between formula cards

            const levelsGridHtml = Object.entries(data.levels)
                .filter(([, value]) => !isNaN(value) && isFinite(value))
                .map(([label, value]) => {
                    const type = label === 'PP' ? 'pivot' : (label.startsWith('R') ? 'resistance' : 'support');
                    return `
                        <div class="level-item ${type}" onclick="PivotCalculator.copyToClipboard('${value.toFixed(2)}')" style="cursor: pointer;" title="Click to copy">
                            <div class="level-label">${label}</div>
                            <div class="level-value">${value.toFixed(2)}</div>
                        </div>
                    `;
                }).join('');

            formulaDiv.innerHTML = `
                <h3 class="subsection-title">${data.name}</h3>
                <div class="pivot-level-grid">${levelsGridHtml}</div>
            `;
            container.appendChild(formulaDiv);
        });
    },

    displayIndividualResultsFromState: function() {
        // Reconstruct results object from pivotCalculator.allLevels
        const results = {};
        pivotCalculator.allLevels.forEach(level => {
            if (!results[level.formula]) {
                results[level.formula] = { name: level.formula, levels: {} };
            }
            results[level.formula].levels[level.label] = level.value;
        });
        this.displayIndividualResults(results);
    },


    displayRecurringLevels: function() {
        const container = this.elements.recurringResultsContainer;
        const tolerance = pivotCalculator.toleranceValue;
        const recurringLevels = [];

        // Group levels by value (within tolerance)
        const levelGroups = [];

        // Step 1: Group levels that are within tolerance of each other
        pivotCalculator.allLevels.forEach(level => {
            let foundGroup = false;
            for (let group of levelGroups) {
                // Check if this level is close enough to any level already in this group
                // We compare to the first element in the group as a representative
                if (Math.abs(group[0].value - level.value) <= tolerance) {
                    group.push(level);
                    foundGroup = true;
                    break;
                }
            }
            if (!foundGroup) {
                levelGroups.push([level]); // Start a new group
            }
        });

        // Step 2: Filter groups that meet or exceed the convergence threshold
        levelGroups.forEach(group => {
            if (group.length >= pivotCalculator.convergenceThreshold) {
                // Calculate the average value of the converging levels
                const avgValue = group.reduce((sum, level) => sum + level.value, 0) / group.length;
                // Get unique labels (e.g., R1, S1) and formulas contributing
                const labels = [...new Set(group.map(l => l.label))].sort(); // Sort labels for consistency
                const formulas = [...new Set(group.map(l => l.formula))].sort(); // Sort formulas for consistency
                
                // Determine the most common type (resistance, support, pivot) within the group
                const typeCounts = {};
                group.forEach(l => { typeCounts[l.type] = (typeCounts[l.type] || 0) + 1; });
                let commonType = 'general';
                let maxCount = 0;
                for (const type in typeCounts) {
                    if (typeCounts[type] > maxCount) {
                        maxCount = typeCounts[type];
                        commonType = type;
                    }
                }

                recurringLevels.push({
                    value: avgValue,
                    count: group.length,
                    labels: labels,
                    formulas: formulas,
                    type: commonType // Assign the most common type
                });
            }
        });

        // Sort recurring levels, typically from highest to lowest value for resistances/supports
        recurringLevels.sort((a, b) => b.value - a.value);

        // Display recurring levels
        if (recurringLevels.length > 0) {
            container.innerHTML = recurringLevels.map(level => `
                <div class="level-item recurring ${level.type}" onclick="PivotCalculator.copyToClipboard('${level.value.toFixed(2)}')" style="cursor: pointer;" title="Click to copy">
                    <div class="level-label">
                        ${level.labels.join('/')}
                        <br>
                        <span style="font-size: 10px; color: var(--color-text-tertiary);">
                            ${level.count} CONVERGING
                        </span>
                    </div>
                    <div class="level-value">${level.value.toFixed(2)}</div>
                    <div style="font-size: 10px; color: var(--color-text-tertiary); margin-top: 4px;">
                        ${level.formulas.slice(0, 3).join(', ')}${level.formulas.length > 3 ? ` +${level.formulas.length - 3} more` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center text-text-dark py-8 col-span-full">
                    <i class="fas fa-search text-4xl mb-4"></i>
                    <p>NO RECURRING LEVELS FOUND</p>
                    <p class="text-sm">TRY LOWERING THE CONVERGENCE THRESHOLD OR TOLERANCE</p>
                </div>
            `;
        }
    },

    // Setup Event Listeners specific to Pivot Calculator (called when Pivot Calculator is activated)
    setupEventListeners: function() {
        // Listeners are primarily attached in initializeApp, which is called by App.switchTool
        // No additional listeners needed here as they are part of initializeApp lifecycle.
    }
};

// --- Application Start ---
document.addEventListener('DOMContentLoaded', () => {
    App.initializeApp();
});
