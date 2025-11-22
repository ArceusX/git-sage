const logo = './categories.png';

export const subtitle =
  "A tool for coders, by coders. See the intent behind each change for faster code review";

export const helpText = {
  Modes: [
    "1. `Categories View` sorts each diff into one of 11 categories based on semantic purpose. The classifier sorts into the narrowest possible category, but defaults to generic delete, add, or replace if it cannot find a narrower one. ",
    "2. `Classic View` shows diffs between the texts as red - lines and green + lines like the way Git does it",
  ],
  "Save Policy": [
    "1. Text in the split panels are not automatically saved, and will be cleared on page refresh, unless...",
    "2. You save your progress to localStorage (restorable later) by clicking the `Save` button",
    "3. The `Clear` button deletes your save in localStorage. It does not clear the current text content, but you can easily clear it by refreshing the app",
  ],
  "Results Window": [
    "1. `Open in New Window`: Detach the diff results in a new window. You can now view both the diffs and the text content side-by-side with ease",
    "2. `Download <x> View`: Download results as HTML file",
    "3. While in `Categories View`, click on a diff to highlight the relevant lines and scroll to those lines",
  ],
  "Categories": [
    "1. `Move Code Block`: 3 or more adjacent lines are moved unchangedly",
    "2. `Update Try/Catch`: A try-catch block is added or removed",
    "3. `Update Import`: Set of named imports from a module changes",
    "4. `Update Comment`: Catch only single-line #, //",
    "5. `Update Function Parameters`: Specific to Javascript",
    "6. `Update Literal`: RHS expression changes from or into literal",
    "7. `Update Condition`: Predicate of if/else/for, etc changes",
    "8. `Rename Variable`: RHS expression changes, but LHS is unchanged",
    "9. `Delete Code`: Default if no other category applies ",
    "10. `Add Code`: Default if no other category applies",
    "11. `Replace Code`: Use various similarity filters (length, distance, context) to infer related lines"
  ],
  "Syntax Highlight": [
    "These languages are supported: ",
    "1. `Java`",
    "2. `JavaScript / TypeScript`",
    "3. `Python`",
    "4. `C++`",
    "5. `SQL`",
    "6. `HTML`",
    "7. `CSS`",
    "8. `JSON`",
    "9. `Markdown`",
    "10. `YAML`"
  ],
};

export const appConfig = {
  meta: {
    appName: "Git Sage - Smart Diff Tool",
    icon: logo,
  },

  personal: {
    author: "Triet Lieu",
    email: "trielieu@gmail.com",
    github: "https://github.com/ArceusX/git-sage",
  },
};
