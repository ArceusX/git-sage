
## Git Sage - Smart Diff Tool

> A tool for coders, by coders. See the intent behind each change for faster code review

### 🎯 Overview

Git Sage is an intelligent diff visualization tool that transforms how you review code changes. Unlike traditional diff tools that only show what changed, Git Sage categorizes changes by their semantic purpose—helping you understand _why_ the code changed.

**🔗 [Try Git Sage Live](https://git-sage.netlify.app/)** - No installation required, run it directly in your browser

<img src="https://github.com/ArceusX/git-sage/blob/master/demo/demo2.PNG" width="600" />

### ✨ Features

<img src="https://github.com/ArceusX/git-sage/blob/master/demo/demo3.PNG" width="600" />

### Powerful Code Editor

**Built on CodeMirror 6**

-   Full-featured text editor with modern editing capabilities
-   Multi-language syntax highlighting powered by CodeMirror 6
-   Side-by-side comparison view for original and modified code
-   Place breakpoints as bookmarks to mark interesting lines

**Supported Languages:**

-   Java
-   JavaScript / TypeScript
-   Python
-   C++
-   SQL
-   HTML
-   CSS
-   JSON
-   Markdown
-   YAML

### View Modes

**Categories View**

-   Automatically sorts changes into 11 semantic categories
-   Understands the intent behind modifications
-   Click any diff to highlight and scroll to relevant lines in the editor

**Classic View**

-   Traditional Git-style diff display
-   Familiar red (-) and green (+) line indicators

<img src="https://github.com/ArceusX/git-sage/blob/master/demo/demo4.PNG" width="600" />

### Smart Change Detection

Git Sage intelligently classifies changes into 11 semantic categories:

1.  **Move Code Block** - Detects when 3+ adjacent lines are relocated unchanged
2.  **Update Try/Catch** - Identifies try-catch block additions or removals
3.  **Update Import** - Tracks changes to named imports from modules
4.  **Update Comment** - Catches single-line comment changes (#, //)
5.  **Update Function Parameters** - JavaScript-specific parameter modifications
6.  **Update Literal** - Detects when expressions change to/from literals
7.  **Update Condition** - Tracks predicate changes in if/else/for statements
8.  **Rename Variable** - Identifies variable renames (RHS changes, LHS unchanged)
9.  **Delete Code** - Default category for removals
10.  **Add Code** - Default category for additions
11.  **Replace Code** - Uses similarity filters (length, distance, context) to match related lines

<img src="https://github.com/ArceusX/git-sage/blob/master/demo/demo5.PNG" width="600" />

### ⚙️ Usage

1.  **In the left (source) and right (changed) editors**
    -- Paste your texts (editor will assume .js code and use that syntax highlighting)
    -- Upload your files (for editor to read file extension and apply correct highlighting)
2.  **Select the language** for syntax highlighting (auto-detected in most cases)
2.  **Click Compare** to generate the intelligent diff analysis
3.  **Switch between views**:
    -   **Categories View** for semantic understanding of changes
    -   **Classic View** for traditional line-by-line diffs
4.  **Click on any diff** in Categories View to jump to relevant lines in the editor
5.  **Save your work** using the Save button to persist in localStorage

### 🚦 Workflow Features

-   **Detachable Results Window** - Open diffs in a separate window for side-by-side viewing
-   **Breakpoints** - Mark important lines with breakpoints for quick reference during review
-   **Export to HTML** - Download diff results to review offline or to share with your team
-   **Persistence** - Save your work to LocalStorage and restore it later with the Save button

### 💻 Development

### 🛠️ Tech Stack

-   **React 19** - UI library for building the component-based interface
-   **CodeMirror 6** - Code editor library providing syntax highlighting and editing features
-   **Chakra UI** - Component library for styling and layout
-   **Vite (Rolldown)** - Build tool and development server
-   **diff** - Library for computing text differences between files
-   **Framer Motion** - Animation library for UI transitions
-   **React Icons** - Icon library (Lucide icons)

### 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/ArceusX/git-sage

# Navigate to the project directory
cd git-sage

# Install dependencies
npm install

# Start the development server
npm run dev

```
The app will be available at `http://localhost:5173`

### 📁 Folder Structure

```
components/
    CategorySection.jsx       # Displays categorized diffs
    ChangeRenderers.jsx       # Renders individual diff changes
    CompareButton.jsx         # Triggers diff analysis
    DownloadHTMLCategories.jsx # Exports Categories View to HTML
    DownloadHTMLClassic.jsx   # Exports Classic View to HTML
    FileInputPanel.jsx        # File upload interface
    Footer.jsx                # App footer
    HelpHeader.jsx            # Help documentation overlay
    ResultsCategories.jsx     # Categories View results panel
    ResultsClassic.jsx        # Classic View results panel
    
config/
    app.config.js             # App configuration
    categories.js             # Category definitions and logic
    
utils/
    ChangeDetectors.js        # Detects specific change patterns
    DiffAnalyzer.js           # Main diff analysis engine
    LineAnalyzer.js           # Analyzes individual lines
    LineMapper.js             # Maps changes between versions

```

### 📝 License

This project is open source and available under the [MIT License](https://opensource.org/license/mit).