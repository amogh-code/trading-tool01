# trading-tool01
Dev by Surya Dev
Co-Dev by Amogh Kris
# QuantumFlow Analyzer

QuantumFlow Analyzer is an intuitive web-based tool designed to help traders and analysts track buy/sell sentiment in real-time. It provides clear visual feedback on market flow, calculates key metrics, and allows users to record and review their analytical entries with personalized notes.

## Features

- **Real-time Sentiment Tracking:** Quickly record buy and sell impulses with a simple click or keyboard shortcut.
- **Dynamic Analysis:** Instantly calculates total buys, total sells, difference, and percentage difference.
- **Intelligent Conclusion:** Provides a clear conclusion (e.g., "Strong Buy," "Sell Retracement Expected," "Neutral") based on the current flow.
- **Visual Sentiment Badges:** Color-coded badges give a quick overview of the market sentiment.
- **Comprehensive History:** Stores the last 30 analysis outputs for quick review.
- **Detailed Entry Notes:** Add personalized notes to each historical entry to track thought processes or market conditions at the time of analysis.
- **Keyboard Shortcuts:** Streamlined workflow with intuitive keyboard commands (B, S, Enter, R, N, Esc).
- **Undo Last Action:** Correct mistakes easily.
- **Persistent Data:** All data (current counts, history, notes) is saved locally in your browser's storage, so you don't lose your work on refresh.
- **Clean, Apple-inspired Interface:** A modern, minimalist design for an intuitive user experience.

## Technologies Used

- **HTML5:** For the core structure of the web application.
- **CSS3:** For styling, including custom properties (variables) for easy theming, responsive design, and an "Apple interface" aesthetic.
- **JavaScript (ES6+):** For all interactive functionalities, data management, and DOM manipulation.
- **Tailwind CSS (CDN):** Used for utility-first CSS classes, speeding up development and providing a robust base.
- **Font Awesome (CDN):** For modern and intuitive icons.
- **Google Fonts (Inter):** For a clean and readable typeface.

## Getting Started

To run this application locally:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/QuantumFlow-Analyzer.git](https://github.com/YOUR_USERNAME/QuantumFlow-Analyzer.git)
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd QuantumFlow-Analyzer
    ```
3.  **Open `index.html`:**
    Simply open the `index.html` file in your web browser. There's no build step required for this client-side application.

## How to Use

-   **Record Actions:** Click the **"Buy (+0.5)"** or **"Sell (+0.5)"** buttons, or use keyboard shortcuts `B` (for Buy) and `S` (for Sell). Each click adds 0.5 to the respective pending count.
-   **Submit Entry:** Click the **"Submit Entry"** button or press `Enter` to add the pending selections to your total counts and history. The analysis will update automatically.
-   **Reset Current:** Click **"Reset Current"** or press `R` to clear the current Buy and Sell totals, pending selections, and all history.
-   **Undo:** Click **"Undo"** to reverse the last `Buy` or `Sell` selection you made before submission.
-   **Notes & Parameters:** Click **"Notes & Params"** or press `N` to open a modal where you can review your trading parameters and add notes to each historical entry.
-   **Clear History:** Click the **trashcan icon** in the header to clear only the history records.

## Project Structure
