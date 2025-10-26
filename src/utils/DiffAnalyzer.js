import LineAnalyzer from './LineAnalyzer.js';
import LineMapper from './LineMapper.js';
import ChangeDetectors from './ChangeDetectors.js';

const DiffAnalyzer = {
  analyze(original, changed) {
    const origLines = original.split('\n');
    const changedLines = changed.split('\n');
    
    const categories = {
      other: [],
      updateComment: [],
      updateDefaultArgs: [],
      updateLiteral: [],
      renameVariable: [],
      encapsulateFunction: [],
      moveCodeBlock: [],
      deleteCode: [],
      addCode: [],
      reorderStatements: [],
      updateImport: []
    };

    const origLineMap = LineMapper.buildMap(origLines);
    const changedLineMap = LineMapper.buildMap(changedLines);
    const processedOrig = new Set();
    const processedChanged = new Set();

    // Detect moved blocks
    categories.moveCodeBlock = ChangeDetectors.detectMovedBlocks(
      origLines, changedLines, origLineMap, changedLineMap, processedOrig, processedChanged
    );

    // Detect deletions
    categories.deleteCode = ChangeDetectors.detectDeletions(
      origLines, changedLineMap, processedOrig
    );

    // Detect additions
    categories.addCode = ChangeDetectors.detectAdditions(
      changedLines, origLineMap, processedChanged
    );

    // Detect specific types of changes line by line
    for (let i = 0; i < Math.max(origLines.length, changedLines.length); i++) {
      const origLine = origLines[i] || '';
      const changedLine = changedLines[i] || '';
      
      if (processedOrig.has(i) || processedChanged.has(i)) continue;
      if (LineAnalyzer.hashLine(origLine) === LineAnalyzer.hashLine(changedLine)) continue;

      const lineNumber = i + 1;
      let detected = false;

      // Try each detector in order
      const importChange = ChangeDetectors.detectImportChanges(origLine, changedLine, lineNumber);
      if (importChange) {
        categories.updateImport.push(importChange);
        detected = true;
      }

      if (!detected) {
        const commentChange = ChangeDetectors.detectCommentChanges(origLine, changedLine, lineNumber);
        if (commentChange) {
          categories.updateComment.push(commentChange);
          detected = true;
        }
      }

      if (!detected) {
        const defaultArgChange = ChangeDetectors.detectDefaultArgChanges(origLine, changedLine, lineNumber);
        if (defaultArgChange) {
          categories.updateDefaultArgs.push(defaultArgChange);
          detected = true;
        }
      }

      if (!detected) {
        const literalChange = ChangeDetectors.detectLiteralChanges(origLine, changedLine, lineNumber);
        if (literalChange) {
          categories.updateLiteral.push(literalChange);
          detected = true;
        }
      }

      if (!detected) {
        const renameChange = ChangeDetectors.detectRename(origLine, changedLine, lineNumber);
        if (renameChange) {
          categories.renameVariable.push(renameChange);
          detected = true;
        }
      }

      if (!detected && origLine.trim() && changedLine.trim()) {
        categories.other.push({
          lineNumber,
          original: origLine,
          changed: changedLine
        });
      }

      if (detected) {
        processedOrig.add(i);
        processedChanged.add(i);
      }
    }

    return categories;
  }
};

export default DiffAnalyzer;