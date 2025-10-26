import LineAnalyzer from './LineAnalyzer.js';

const ChangeDetectors = {
  detectMovedBlocks(origLines, changedLines, origLineMap, changedLineMap, processedOrig, processedChanged) {
    const moves = [];
    
    for (let i = 0; i < origLines.length; i++) {
      if (processedOrig.has(i)) continue;
      const hash = LineAnalyzer.hashLine(origLines[i]);
      if (hash && changedLineMap.has(hash)) {
        const changedIndices = changedLineMap.get(hash);
        for (const j of changedIndices) {
          if (!processedChanged.has(j) && Math.abs(i - j) > 2) {
            moves.push({
              originalLine: i + 1,
              changedLine: j + 1,
              content: origLines[i]
            });
            processedOrig.add(i);
            processedChanged.add(j);
            break;
          }
        }
      }
    }
    
    return moves;
  },

  detectDeletions(origLines, changedLineMap, processedOrig) {
    const deletions = [];
    
    for (let i = 0; i < origLines.length; i++) {
      if (processedOrig.has(i)) continue;
      const hash = LineAnalyzer.hashLine(origLines[i]);
      if (hash && !changedLineMap.has(hash)) {
        deletions.push({
          lineNumber: i + 1,
          content: origLines[i]
        });
        processedOrig.add(i);
      }
    }
    
    return deletions;
  },

  detectAdditions(changedLines, origLineMap, processedChanged) {
    const additions = [];
    
    for (let i = 0; i < changedLines.length; i++) {
      if (processedChanged.has(i)) continue;
      const hash = LineAnalyzer.hashLine(changedLines[i]);
      if (hash && !origLineMap.has(hash)) {
        additions.push({
          lineNumber: i + 1,
          content: changedLines[i]
        });
        processedChanged.add(i);
      }
    }
    
    return additions;
  },

  detectImportChanges(origLine, changedLine, lineNumber) {
    if ((LineAnalyzer.isImport(origLine) || LineAnalyzer.isImport(changedLine)) && 
        origLine !== changedLine) {
      return {
        lineNumber,
        original: origLine,
        changed: changedLine
      };
    }
    return null;
  },

  detectCommentChanges(origLine, changedLine, lineNumber) {
    if (LineAnalyzer.isComment(origLine) && LineAnalyzer.isComment(changedLine)) {
      return {
        lineNumber,
        original: origLine,
        changed: changedLine
      };
    }
    return null;
  },

  detectDefaultArgChanges(origLine, changedLine, lineNumber) {
    const origDefaults = LineAnalyzer.extractDefaultArgs(origLine);
    const changedDefaults = LineAnalyzer.extractDefaultArgs(changedLine);
    
    if ((origDefaults.length > 0 || changedDefaults.length > 0) &&
        JSON.stringify(origDefaults) !== JSON.stringify(changedDefaults)) {
      return {
        lineNumber,
        original: origLine,
        changed: changedLine
      };
    }
    return null;
  },

  detectLiteralChanges(origLine, changedLine, lineNumber) {
    const origLiterals = LineAnalyzer.extractLiterals(origLine);
    const changedLiterals = LineAnalyzer.extractLiterals(changedLine);
    
    if ((origLiterals.length > 0 || changedLiterals.length > 0) &&
        JSON.stringify(origLiterals) !== JSON.stringify(changedLiterals)) {
      return {
        lineNumber,
        original: origLine,
        changed: changedLine
      };
    }
    return null;
  },

  detectRename(origLine, changedLine, lineNumber) {
    const origIds = LineAnalyzer.extractIdentifiers(origLine);
    const changedIds = LineAnalyzer.extractIdentifiers(changedLine);
    const origStructure = origLine.replace(/\b[a-zA-Z_]\w*\b/g, 'ID');
    const changedStructure = changedLine.replace(/\b[a-zA-Z_]\w*\b/g, 'ID');
    
    if (origStructure === changedStructure && 
        origIds.length > 0 && 
        changedIds.length > 0 &&
        JSON.stringify(origIds) !== JSON.stringify(changedIds)) {
      return {
        lineNumber,
        original: origLine,
        changed: changedLine
      };
    }
    return null;
  }
};

export default ChangeDetectors;