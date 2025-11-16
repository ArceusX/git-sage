# Git Sage - Smart Diff Tool

> A tool for coders, by coders. See the intent behind each change for faster code review

## 🎯 Overview

Git Sage is an intelligent diff visualization tool that transforms how you review code changes. Unlike traditional diff tools that only show what changed, Git Sage categorizes changes by their semantic purpose—helping you understand *why* the code changed.

**🔗 [Try Git Sage Live](https://git-sage.netlify.app/)**

<img src="https://github.com/ArceusX/git-sage/blob/master/demo/demo2.PNG" width="700" />

## ✨ Features

<img src="https://github.com/ArceusX/git-sage/blob/master/demo/demo3.PNG" width="700" /> 

### View Modes

**Categories View** 
- Automatically sorts changes into 11 semantic categories
- Understands the intent behind modifications
- Click any diff to highlight and scroll to relevant lines


**Classic View**
- Traditional Git-style diff display
- Familiar red (-) and green (+) line indicators

<img src="https://github.com/ArceusX/git-sage/blob/master/demo/demo4.PNG" width="700" />

### Smart Change Detection

Git Sage intelligently classifies changes into:

1. **Move Code Block** - Detects when 3+ adjacent lines are relocated unchanged
2. **Update Try/Catch** - Identifies try-catch block additions or removals
3. **Update Import** - Tracks changes to named imports from modules
4. **Update Comment** - Catches single-line comment changes (#, //)
5. **Update Function Parameters** - JavaScript-specific parameter modifications
6. **Update Literal** - Detects when expressions change to/from literals
7. **Update Condition** - Tracks predicate changes in if/else/for statements
8. **Rename Variable** - Identifies variable renames (RHS changes, LHS unchanged)
9. **Delete Code** - Default category for removals
10. **Add Code** - Default category for additions
11. **Replace Code** - Uses similarity filters (length, distance, context) to match related lines

<img src="https://github.com/ArceusX/git-sage/blob/master/demo/demo5.PNG" width="700" />
  
### Workflow Use

- **Detachable Results Window** - Open diffs in a separate window for side-by-side viewing
- **Export to HTML** - Download diff results for offline review or documentation
- **LocalStorage Persistence** - Save your work and restore it later
- **Side-by-Side Editor** - Compare original and modified code easily

## 🚀 Getting Started

### Installation
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

### Folder Structure

```
components/
      CategorySection.jsx
      ChangeRenderers.jsx
      CompareButton.jsx
      DownloadHTMLCategories.jsx
      DownloadHTMLClassic.jsx
      FileInputPanel.jsx
      Footer.jsx
      HelpHeader.jsx
      ResultsCategories.jsx
      ResultsClassic.jsx

config/
      app.config.js
      categories.js
      
utils/
      ChangeDetectors.js
      DiffAnalyzer.js
      LineAnalyzer.js
      LineMapper.js
```