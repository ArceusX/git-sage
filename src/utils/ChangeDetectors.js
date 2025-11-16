import { LineAnalyzer } from './';

// --- Hoisted regexes / constants (avoid re-creating them) ---
const CONTROL_FLOW_REGEX = /^\s*(else\s+)?(if|while|for|switch)\s*\(/;

// --- Line-level meta cache to avoid repeated expensive parsing ---
const lineMetaCache = new Map();

function buildMeta(line) {
  // NOTE: keep all fields deterministic and derived only from the line text.
  const hash = LineAnalyzer.hashLine(line);
  const isComment = LineAnalyzer.isComment(line);
  const isImport = LineAnalyzer.isImport(line);
  const identifiers = LineAnalyzer.extractIdentifiers(line);
  const identifiersSet = new Set(identifiers);
  const literals = LineAnalyzer.extractLiterals(line);
  const funcName = LineAnalyzer.extractFunctionName(line);
  const structure = line.replace(/\b[a-zA-Z_]\w*\b/g, 'ID');
  const importPath = LineAnalyzer.extractImportPath(line);
  const stripped = line.trim();

  // condition and operators may be undefined for many lines;
  // compute only when relevant
  const condition = LineAnalyzer.extractCondition(line);
  const operators = condition ? LineAnalyzer.extractOperators(condition) : [];

  // substantive check: non-empty and not a comment
  const isSubstantive = stripped !== '' && !isComment;

  return {
    text: line,
    hash,
    isComment,
    isImport,
    identifiers,
    identifiersSet,
    literals,
    funcName,
    structure,
    importPath,
    condition,
    operators,
    isSubstantive,
    stripped
  };
}

function getMeta(line) {
  // Key by exact line text (fast). If many identical lines exist,
  // their computed meta is reused.
  const key = line;
  let m = lineMetaCache.get(key);
  if (!m) {
    m = buildMeta(line);
    lineMetaCache.set(key, m);
  }
  return m;
}

// --- Small helpers used across detectors ---
function arraysEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function countSubstantive(lines) {
  let cnt = 0;
  for (const l of lines) {
    const meta = getMeta(l);
    if (meta.isSubstantive) cnt++;
  }
  return cnt;
}

function isWhitespaceOrComment(line) {
  const meta = getMeta(line);
  return !meta.isSubstantive;
}

// --- Main detector module ---
const ChangeDetectors = {
  detectConditionChange(sourceLine, changedLine, lineNumber, changedLineNumber) {
    // Must be control flow statements
    if (!CONTROL_FLOW_REGEX.test(sourceLine) || !CONTROL_FLOW_REGEX.test(changedLine)) {
      return null;
    }

    // Extract keywords and ensure they match exactly (including else prefix)
    const sourceMatch = sourceLine.match(/^\s*(else\s+)?(if|while|for|switch)/);
    const changedMatch = changedLine.match(/^\s*(else\s+)?(if|while|for|switch)/);

    if (!sourceMatch || !changedMatch) return null;

    const sourceKeyword = sourceMatch[0].trim();
    const changedKeyword = changedMatch[0].trim();

    if (sourceKeyword !== changedKeyword) {
      return null; // Keywords changed - let Replace Code handle it
    }

    // Use cached meta for conditions/operators
    const sourceMeta = getMeta(sourceLine);
    const changedMeta = getMeta(changedLine);

    const sourceCondition = sourceMeta.condition;
    const changedCondition = changedMeta.condition;

    if (!sourceCondition || !changedCondition) return null;

    const sourceOps = sourceMeta.operators || [];
    const changedOps = changedMeta.operators || [];

    // Check if operators changed (fast element-wise compare)
    const operatorsChanged = !arraysEqual(sourceOps, changedOps);
    if (!operatorsChanged) return null;

    // Extract identifiers from conditions (cached)
    const sourceIds = sourceMeta.identifiers || [];
    const changedIds = changedMeta.identifiers || [];

    const sourceSet = new Set(sourceIds);
    const changedSet = new Set(changedIds);

    // Case 1: Exact same identifiers, operators changed
    if (this.setsEqual(sourceSet, changedSet)) {
      return {
        lineNumber,
        changedLineNumber: changedLineNumber || lineNumber,
        source: sourceLine,
        changed: changedLine,
        oldCondition: sourceCondition,
        newCondition: changedCondition
      };
    }

    // Case 2: Source identifiers are subset of changed (subcondition added)
    if (this.isSubset(sourceSet, changedSet)) {
      return {
        lineNumber,
        changedLineNumber: changedLineNumber || lineNumber,
        source: sourceLine,
        changed: changedLine,
        oldCondition: sourceCondition,
        newCondition: changedCondition
      };
    }

    // Case 3: Changed identifiers are subset of source (subcondition removed)
    if (this.isSubset(changedSet, sourceSet)) {
      return {
        lineNumber,
        changedLineNumber: changedLineNumber || lineNumber,
        source: sourceLine,
        changed: changedLine,
        oldCondition: sourceCondition,
        newCondition: changedCondition
      };
    }

    // Otherwise, too different → let Replace Code handle it
    return null;
  },

  detectImportChanges(sourceLine, changedLine, lineNumber, changedLineNumber) {
    const sourceMeta = getMeta(sourceLine);
    const changedMeta = getMeta(changedLine);

    const sourceIsImport = sourceMeta.isImport;
    const changedIsImport = changedMeta.isImport;

    // Both must be import statements
    if (!sourceIsImport || !changedIsImport) {
      return null;
    }

    // If lines are identical, no change
    if (sourceLine.trim() === changedLine.trim()) {
      return null;
    }

    // Extract the module path using regex (more reliable than cached method)
    const sourcePathMatch = sourceLine.match(/from\s+['"]([^'"]+)['"]/);
    const changedPathMatch = changedLine.match(/from\s+['"]([^'"]+)['"]/);
    
    // Both lines must have valid import paths
    if (!sourcePathMatch || !changedPathMatch) {
      return null;
    }
    
    const sourcePath = sourcePathMatch[1];
    const changedPath = changedPathMatch[1];

    // If paths match, this is a change to the same import
    if (sourcePath === changedPath) {
      return {
        lineNumber,
        changedLineNumber: changedLineNumber || lineNumber,
        source: sourceLine,
        changed: changedLine,
        path: sourcePath
      };
    }

    return null;
  },

  detectImportBlockChanges(deletionBlocks, additionBlocks, categories, processedDeletions, processedAdditions) {
    // Build maps of path -> deletion/addition info
    const deletionsByPath = new Map();
    const additionsByPath = new Map();

    // Track which blocks contain ONLY comments and import lines
    const pureImportBlocks = {
      deletions: new Map(), // blockIndex -> count of import lines
      additions: new Map()
    };

    // Collect all import lines from deletion blocks
    for (let i = 0; i < deletionBlocks.length; i++) {
      if (processedDeletions.has(i)) continue;

      const block = deletionBlocks[i];
      let importCount = 0;
      let isPureBlock = true;

      // Check if block contains only comments and imports
      for (const line of block.lines) {
        const meta = getMeta(line);
        if (meta.isImport) {
          importCount++;
        } else if (!meta.isComment && line.trim() !== '') {
          // Contains something other than comments/imports/blank lines
          isPureBlock = false;
          break;
        }
      }

      if (isPureBlock && importCount > 0) {
        pureImportBlocks.deletions.set(i, importCount);
      }

      // Collect import lines
      for (let lineIdx = 0; lineIdx < block.lines.length; lineIdx++) {
        const line = block.lines[lineIdx];
        const meta = getMeta(line);
        if (!meta.isImport) continue;

        const path = meta.importPath;
        if (path) {
          if (!deletionsByPath.has(path)) {
            deletionsByPath.set(path, []);
          }
          deletionsByPath.get(path).push({
            blockIndex: i,
            lineIndexInBlock: lineIdx,
            line: line,
            lineNumber: block.lineNumber + lineIdx
          });
        }
      }
    }

    // Collect all import lines from addition blocks
    for (let j = 0; j < additionBlocks.length; j++) {
      if (processedAdditions.has(j)) continue;

      const block = additionBlocks[j];
      let importCount = 0;
      let isPureBlock = true;

      // Check if block contains only comments and imports
      for (const line of block.lines) {
        const meta = getMeta(line);
        if (meta.isImport) {
          importCount++;
        } else if (!meta.isComment && line.trim() !== '') {
          // Contains something other than comments/imports/blank lines
          isPureBlock = false;
          break;
        }
      }

      if (isPureBlock && importCount > 0) {
        pureImportBlocks.additions.set(j, importCount);
      }

      // Collect import lines
      for (let lineIdx = 0; lineIdx < block.lines.length; lineIdx++) {
        const line = block.lines[lineIdx];
        const meta = getMeta(line);
        if (!meta.isImport) continue;

        const path = meta.importPath;
        if (path) {
          if (!additionsByPath.has(path)) {
            additionsByPath.set(path, []);
          }
          additionsByPath.get(path).push({
            blockIndex: j,
            lineIndexInBlock: lineIdx,
            line: line,
            lineNumber: block.lineNumber + lineIdx
          });
        }
      }
    }

    // Match deletions and additions by path
    const blocksWithMatchedImports = {
      deletions: new Map(), // blockIndex -> count of matched imports
      additions: new Map()
    };

    for (const [path, deletions] of deletionsByPath.entries()) {
      const additions = additionsByPath.get(path);

      if (additions && additions.length > 0) {
        // Match each deletion with the first unmatched addition for the same path
        for (const deletion of deletions) {
          for (const addition of additions) {
            // Check if the lines are different (if same, just mark as matched)
            if (deletion.line.trim() !== addition.line.trim()) {
              categories.updateImport.push({
                lineNumber: deletion.lineNumber,
                changedLineNumber: addition.lineNumber,
                source: deletion.line,
                changed: addition.line,
                path: path
              });
            }

            // Track that these blocks had matched imports
            const delCount = blocksWithMatchedImports.deletions.get(deletion.blockIndex) || 0;
            blocksWithMatchedImports.deletions.set(deletion.blockIndex, delCount + 1);

            const addCount = blocksWithMatchedImports.additions.get(addition.blockIndex) || 0;
            blocksWithMatchedImports.additions.set(addition.blockIndex, addCount + 1);

            break;
          }
        }
      }
    }

    // Mark blocks as processed if they are "pure" (only comments + imports)
    // AND all their imports were matched
    for (const [blockIdx, totalImports] of pureImportBlocks.deletions.entries()) {
      const matchedImports = blocksWithMatchedImports.deletions.get(blockIdx) || 0;
      if (matchedImports === totalImports) {
        processedDeletions.add(blockIdx);
      }
    }

    for (const [blockIdx, totalImports] of pureImportBlocks.additions.entries()) {
      const matchedImports = blocksWithMatchedImports.additions.get(blockIdx) || 0;
      if (matchedImports === totalImports) {
        processedAdditions.add(blockIdx);
      }
    }
  },

  detectCommentChanges(sourceLine, changedLine, lineNumber, changedLineNumber) {
    const sMeta = getMeta(sourceLine);
    const cMeta = getMeta(changedLine);
    if (sMeta.isComment && cMeta.isComment) {
      return {
        lineNumber,
        changedLineNumber: changedLineNumber || lineNumber,
        source: sourceLine,
        changed: changedLine
      };
    }
    return null;
  },

  mergeAdjacentComments(comments, sourceLines, changedLines) {
    if (comments.length === 0) return [];

    // Sort by line number (source file line number)
    comments.sort((a, b) => a.lineNumber - b.lineNumber);

    const merged = [];
    let currentBlock = {
      lineNumber: comments[0].lineNumber,
      endLineNumber: comments[0].lineNumber,
      changedLineNumber: comments[0].changedLineNumber,
      changedEndLineNumber: comments[0].changedLineNumber,
      sourceLines: [comments[0].source],
      changedLines: [comments[0].changed],
      substantiveCount: 1
    };

    for (let i = 1; i < comments.length; i++) {
      const comment = comments[i];
      const prevComment = comments[i - 1];

      // Check if comments are adjacent in ORIGINAL file
      const sourceGap = comment.lineNumber - prevComment.lineNumber - 1;
      // Check if comments are adjacent in CHANGED file
      const changedGap = comment.changedLineNumber - prevComment.changedLineNumber - 1;

      // Only merge if adjacent in both files (or very close)
      let canMerge = false;

      if (sourceGap === 0 && changedGap === 0) {
        // Directly adjacent in both files
        canMerge = true;
      } else if (sourceGap >= 0 && sourceGap <= 10 && changedGap >= 0 && changedGap <= 10) {
        // Check if gaps contain only whitespace/comments in both files
        let sourceGapOk = true;
        let changedGapOk = true;

        // Check source file gap
        for (let offset = 1; offset <= sourceGap; offset++) {
          const checkLineNum = prevComment.lineNumber + offset;
          const sourceLineIndex = checkLineNum - 1;
          const sourceLine = sourceLineIndex < sourceLines.length ? sourceLines[sourceLineIndex] : '';

          if (sourceLine.trim() !== '' && !getMeta(sourceLine).isComment) {
            sourceGapOk = false;
            break;
          }
        }

        // Check changed file gap
        for (let offset = 1; offset <= changedGap; offset++) {
          const checkLineNum = prevComment.changedLineNumber + offset;
          const changedLineIndex = checkLineNum - 1;
          const changedLine = changedLineIndex < changedLines.length ? changedLines[changedLineIndex] : '';

          if (changedLine.trim() !== '' && !getMeta(changedLine).isComment) {
            changedGapOk = false;
            break;
          }
        }

        canMerge = sourceGapOk && changedGapOk;
      }

      if (canMerge) {
        // Merge: just add the new comment (we're not including gap lines for now)
        currentBlock.sourceLines.push(comment.source);
        currentBlock.changedLines.push(comment.changed);
        currentBlock.endLineNumber = comment.lineNumber;
        currentBlock.changedEndLineNumber = comment.changedLineNumber;
        currentBlock.substantiveCount++;
      } else {
        // Start new block
        merged.push(currentBlock);
        currentBlock = {
          lineNumber: comment.lineNumber,
          endLineNumber: comment.lineNumber,
          changedLineNumber: comment.changedLineNumber,
          changedEndLineNumber: comment.changedLineNumber,
          sourceLines: [comment.source],
          changedLines: [comment.changed],
          substantiveCount: 1
        };
      }
    }

    merged.push(currentBlock);
    return merged;
  },

  // -------------------------------------

  detectFunctionParamChanges(sourceLine, changedLine, lineNumber, changedLineNumber) {
    const sourceFunc = LineAnalyzer.parseFunction(sourceLine);
    const changedFunc = LineAnalyzer.parseFunction(changedLine);
    
    // Early returns for non-matches
    if (!sourceFunc || !changedFunc) return null;
    if (sourceFunc.name !== changedFunc.name) return null;
    if (sourceFunc.params === changedFunc.params) return null;
    
    // Only parameters changed - this is what we want
    return {
      lineNumber,
      changedLineNumber: changedLineNumber || lineNumber,
      source: sourceLine,
      changed: changedLine,
    };
  },

  // -------------------------------------

  detectLiteralChanges(sourceLine, changedLine, lineNumber, changedLineNumber) {
    // Check for assignment with = or :
    const hasAssignment = (sourceLine.includes('=') || sourceLine.includes(':')) &&
                          (changedLine.includes('=') || changedLine.includes(':'));

    if (!hasAssignment) {
      return null;
    }

    // Determine separator (= or :)
    let separator = '=';
    if (sourceLine.includes(':') && changedLine.includes(':')) {
      // Check if it's more likely a : assignment (e.g., object property)
      const colonIndex = sourceLine.indexOf(':');
      const equalsIndex = sourceLine.indexOf('=');
      if (colonIndex !== -1 && (equalsIndex === -1 || colonIndex < equalsIndex)) {
        separator = ':';
      }
    }

    // Split by separator
    const sourceParts = sourceLine.split(separator);
    const changedParts = changedLine.split(separator);

    if (sourceParts.length < 2 || changedParts.length < 2) {
      return null;
    }

    // Get left (variable name) and right (value) sides
    const sourceLeft = sourceParts[0].trim();
    const changedLeft = changedParts[0].trim();
    const sourceRight = sourceParts.slice(1).join(separator).trim().replace(/[;,]$/, '');
    const changedRight = changedParts.slice(1).join(separator).trim().replace(/[;,]$/, '');

    // Left side must be the same (not a rename)
    if (sourceLeft !== changedLeft) {
      return null;
    }

    // Right side must be different
    if (sourceRight === changedRight) {
      return null;
    }

    // Check if right side contains literals (not just variables/function calls)
    const sourceLiterals = getMeta(sourceRight).literals || LineAnalyzer.extractLiterals(sourceRight);
    const changedLiterals = getMeta(changedRight).literals || LineAnalyzer.extractLiterals(changedRight);

    // Must have at least one literal on either side
    if ((sourceLiterals && sourceLiterals.length === 0) && (changedLiterals && changedLiterals.length === 0)) {
      return null;
    }

    // If both sides are just identifiers (no literals), it's variable-to-variable
    const sourceIsJustIdentifier = /^[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)*$/.test(sourceRight);
    const changedIsJustIdentifier = /^[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)*$/.test(changedRight);

    if (sourceIsJustIdentifier && changedIsJustIdentifier) {
      return null;  // Variable to variable assignment, not a literal change
    }

    return {
      lineNumber,
      changedLineNumber: changedLineNumber || lineNumber,
      source: sourceLine,
      changed: changedLine
    };
  },

  detectRename(sourceLine, changedLine, lineNumber, changedLineNumber) {
    // Case 1: Assignment-based rename (variable assignment)
    const hasAssignment = sourceLine.includes('=') && changedLine.includes('=');

    if (hasAssignment) {
      const sourceParts = sourceLine.split('=');
      const changedParts = changedLine.split('=');

      if (sourceParts.length >= 2 && changedParts.length >= 2) {
        const sourceLeft = sourceParts[0].trim();
        const changedLeft = changedParts[0].trim();
        const sourceRight = sourceParts.slice(1).join('=').trim();
        const changedRight = changedParts.slice(1).join('=').trim();

        // Left of = changed, right of = same indicates rename
        if (sourceLeft !== changedLeft && sourceRight === changedRight) {
          return {
            lineNumber,
            changedLineNumber: changedLineNumber || lineNumber,
            source: sourceLine,
            changed: changedLine
          };
        }
      }
    }

    // Case 2: Function declaration rename
    const funcPattern = /^(\s*function\s+)(\w+)(\s*\(.*\)\s*\{?.*)$/;
    const sourceMatch = sourceLine.match(funcPattern);
    const changedMatch = changedLine.match(funcPattern);

    if (sourceMatch && changedMatch) {
      const sourceName = sourceMatch[2];
      const changedName = changedMatch[2];
      const sourceParams = sourceMatch[3];
      const changedParams = changedMatch[3];

      // Function name changed, parameters same = rename
      if (sourceName !== changedName && sourceParams === changedParams) {
        return {
          lineNumber,
          changedLineNumber: changedLineNumber || lineNumber,
          source: sourceLine,
          changed: changedLine
        };
      }
    }

    return null;
  },

  detectMovedBlocks(sourceLines, changedLines, sourceLineMap, changedLineMap, processedSource, processedChanged) {
    const moves = [];
    const minSubstantiveLines = 3;

    // Try to find blocks of consecutive lines that moved together
    for (let i = 0; i < sourceLines.length - minSubstantiveLines + 1; i++) {
      if (processedSource.has(i)) continue;

      // Try different block sizes, starting from largest possible
      for (let blockSize = Math.min(20, sourceLines.length - i); blockSize >= minSubstantiveLines; blockSize--) {
        let blockMatches = true;
        let matchStartIndex = -1;
        let substantiveCount = 0;

        // Count substantive lines in this potential block (use cached meta)
        for (let offset = 0; offset < blockSize; offset++) {
          if (getMeta(sourceLines[i + offset]).isSubstantive) {
            substantiveCount++;
          }
        }

        // Skip if not enough substantive lines
        if (substantiveCount < minSubstantiveLines) {
          continue;
        }

        // Check if all lines in this block exist somewhere in changed file
        for (let offset = 0; offset < blockSize; offset++) {
          const lineIndex = i + offset;
          if (processedSource.has(lineIndex)) {
            blockMatches = false;
            break;
          }

          const hash = getMeta(sourceLines[lineIndex]).hash;
          if (!hash || !changedLineMap.has(hash)) {
            blockMatches = false;
            break;
          }

          // For first line, find where it could start in changed file
          if (offset === 0) {
            const possibleStarts = changedLineMap.get(hash);
            for (const startIdx of possibleStarts) {
              // Minimum of 3 lines of code (excluding comments or whitespace) to be considered a block
              if (!processedChanged.has(startIdx) && Math.abs(startIdx - lineIndex) > 2) {
                matchStartIndex = startIdx;
                break;
              }
            }
            if (matchStartIndex === -1) {
              blockMatches = false;
              break;
            }
          } else {
            // Check if subsequent lines match at the expected offset
            const expectedIndex = matchStartIndex + offset;
            if (expectedIndex >= changedLines.length) {
              blockMatches = false;
              break;
            }
            const expectedHash = getMeta(changedLines[expectedIndex]).hash;
            if (hash !== expectedHash || processedChanged.has(expectedIndex)) {
              blockMatches = false;
              break;
            }
          }
        }

        // If we found a matching block, record it
        if (blockMatches && matchStartIndex !== -1) {
          const blockLines = [];
          for (let offset = 0; offset < blockSize; offset++) {
            blockLines.push(sourceLines[i + offset]);
            processedSource.add(i + offset);
            processedChanged.add(matchStartIndex + offset);
          }

          moves.push({
            sourceLine: i + 1,
            changedLine: matchStartIndex + 1,
            blockSize: blockSize,
            substantiveLines: substantiveCount,
            content: blockLines.join('\n')
          });

          // Move to next unprocessed line
          i += blockSize - 1;
          break;
        }
      }
    }

    return moves;
  },

  detectDeletions(sourceLines, changedLineMap, processedSource) {
    const deletions = [];

    for (let i = 0; i < sourceLines.length; i++) {
      if (processedSource.has(i)) continue;
      const hash = getMeta(sourceLines[i]).hash;
      if (hash && !changedLineMap.has(hash)) {
        deletions.push({
          lineNumber: i + 1,
          content: sourceLines[i]
        });
        processedSource.add(i);
      }
    }

    return deletions;
  },

  mergeAdjacentDeletions(deletions, allLines) {
    if (deletions.length === 0) return [];

    deletions.sort((a, b) => a.lineNumber - b.lineNumber);

    const merged = [];
    let currentBlock = {
      lineNumber: deletions[0].lineNumber,
      endLineNumber: deletions[0].lineNumber,
      lines: [deletions[0].content],
      substantiveCount: 1
    };

    for (let i = 1; i < deletions.length; i++) {
      const deletion = deletions[i];
      const prevDeletion = deletions[i - 1];

      // Calculate gap between previous deletion and current deletion
      const gapStart = prevDeletion.lineNumber + 1;
      const gapEnd = deletion.lineNumber - 1;
      const gapSize = gapEnd - gapStart + 1;

      let canMerge = true;
      const gapLines = [];

      if (gapSize < 0) {
        // Adjacent lines
        canMerge = true;
      } else if (gapSize > 10) {
        canMerge = false;
      } else {
        for (let lineNum = gapStart; lineNum <= gapEnd; lineNum++) {
          const lineIndex = lineNum - 1;
          if (lineIndex >= 0 && lineIndex < allLines.length) {
            const gapLine = allLines[lineIndex];
            const isWhitespace = gapLine.trim() === '';
            const isComment = getMeta(gapLine).isComment;

            if (!isWhitespace && !isComment) {
              canMerge = false;
              break;
            }
            gapLines.push(gapLine);
          }
        }
      }

      if (canMerge) {
        currentBlock.lines.push(...gapLines);
        currentBlock.lines.push(deletion.content);
        currentBlock.endLineNumber = deletion.lineNumber;
        currentBlock.substantiveCount++;
      } else {
        merged.push(currentBlock);
        currentBlock = {
          lineNumber: deletion.lineNumber,
          endLineNumber: deletion.lineNumber,
          lines: [deletion.content],
          substantiveCount: 1
        };
      }
    }

    merged.push(currentBlock);
    return merged;
  },

  detectAdditions(changedLines, sourceLineMap, processedChanged) {
    const additions = [];

    for (let i = 0; i < changedLines.length; i++) {
      if (processedChanged.has(i)) continue;
      const hash = getMeta(changedLines[i]).hash;
      if (hash && !sourceLineMap.has(hash)) {
        additions.push({
          lineNumber: i + 1,
          content: changedLines[i]
        });
        processedChanged.add(i);
      }
    }

    return additions;
  },

  mergeAdjacentAdditions(additions, allLines) {
    if (additions.length === 0) return [];

    additions.sort((a, b) => a.lineNumber - b.lineNumber);

    const merged = [];
    let currentBlock = {
      lineNumber: additions[0].lineNumber,
      endLineNumber: additions[0].lineNumber,
      lines: [additions[0].content],
      substantiveCount: 1
    };

    for (let i = 1; i < additions.length; i++) {
      const addition = additions[i];
      const prevAddition = additions[i - 1];

      // Calculate gap between previous addition and current addition
      const gapStart = prevAddition.lineNumber + 1;
      const gapEnd = addition.lineNumber - 1;
      const gapSize = gapEnd - gapStart + 1;

      // Check if gap contains only whitespace/comments
      let canMerge = true;
      const gapLines = [];

      if (gapSize < 0) {
        // Adjacent lines (no gap)
        canMerge = true;
      } else if (gapSize > 10) {
        // Gap too large
        canMerge = false;
      } else {
        // Check each line in the gap
        for (let lineNum = gapStart; lineNum <= gapEnd; lineNum++) {
          const lineIndex = lineNum - 1;
          if (lineIndex >= 0 && lineIndex < allLines.length) {
            const gapLine = allLines[lineIndex];
            const isWhitespace = gapLine.trim() === '';
            const isComment = getMeta(gapLine).isComment;

            if (!isWhitespace && !isComment) {
              canMerge = false;
              break;
            }
            gapLines.push(gapLine);
          }
        }
      }

      if (canMerge) {
        // Merge: add gap lines and the new addition
        currentBlock.lines.push(...gapLines);
        currentBlock.lines.push(addition.content);
        currentBlock.endLineNumber = addition.lineNumber;
        currentBlock.substantiveCount++;
      } else {
        // Start new block
        merged.push(currentBlock);
        currentBlock = {
          lineNumber: addition.lineNumber,
          endLineNumber: addition.lineNumber,
          lines: [addition.content],
          substantiveCount: 1
        };
      }
    }

    merged.push(currentBlock);
    return merged;
  },

  detectReplacements(deletions, additions, sourceLines, changedLines) {
    const replacements = [];
    const usedDeletions = new Set();
    const usedAdditions = new Set();

    // Configuration
    const MAX_SIZE_RATIO = 7;
    const MAX_DISTANCE = 100;
    const CONTEXT_WINDOW = 5;
    const MIN_CONTEXT_MATCH = 0.6;

    for (let i = 0; i < deletions.length; i++) {
      if (usedDeletions.has(i)) continue;

      const deletion = deletions[i];
      let bestMatch = null;
      let bestScore = 0;

      for (let j = 0; j < additions.length; j++) {
        if (usedAdditions.has(j)) continue;

        const addition = additions[j];

        // ========================================
        // FILTER 1: Size Similarity
        // ========================================
        const delSize = deletion.lines.length;
        const addSize = addition.lines.length;
        const sizeRatio = Math.max(delSize, addSize) / Math.min(delSize, addSize);

        if (sizeRatio > MAX_SIZE_RATIO) {
          continue; // Too different in size
        }

        // ========================================
        // FILTER 2: Line Proximity
        // ========================================
        const distance = Math.abs(deletion.lineNumber - addition.lineNumber);

        if (distance > MAX_DISTANCE) {
          continue; // Too far apart
        }

        // ========================================
        // FILTER 3: Full Context Matching (context window)
        // ========================================
        const delContext = this.getReplacementContext(
          sourceLines,
          deletion.lineNumber,
          deletion.endLineNumber,
          CONTEXT_WINDOW
        );

        const addContext = this.getReplacementContext(
          changedLines,
          addition.lineNumber,
          addition.endLineNumber,
          CONTEXT_WINDOW
        );

        const contextScore = this.compareReplacementContexts(delContext, addContext);

        if (contextScore >= MIN_CONTEXT_MATCH) {
          // Found a potential match - track the best one
          if (contextScore > bestScore) {
            bestScore = contextScore;
            bestMatch = j;
          }
        }
      }

      // If we found a match, create a replacement
      if (bestMatch !== null) {
        replacements.push({
          deletedBlock: deletion,
          addedBlock: additions[bestMatch],
          contextScore: bestScore
        });

        usedDeletions.add(i);
        usedAdditions.add(bestMatch);
      }
    }

    // Return replacements and remaining unmatched blocks
    return {
      replacements,
      remainingDeletions: deletions.filter((_, i) => !usedDeletions.has(i)),
      remainingAdditions: additions.filter((_, i) => !usedAdditions.has(i))
    };
  },

  getReplacementContext(lines, lineNumber, endLineNumber, contextSize) {
    const before = [];
    const after = [];

    // Convert to 0-based index
    const startIdx = lineNumber - 1;
    const endIdx = endLineNumber - 1;

    // Get context BEFORE (contextSize lines before lineNumber)
    for (let i = startIdx - contextSize; i < startIdx; i++) {
      if (i >= 0 && i < lines.length) {
        const hash = getMeta(lines[i]).hash;
        before.push(hash || '');
      }
    }

    // Get context AFTER (contextSize lines after endLineNumber)
    for (let i = endIdx + 1; i <= endIdx + contextSize; i++) {
      if (i >= 0 && i < lines.length) {
        const hash = getMeta(lines[i]).hash;
        after.push(hash || '');
      }
    }

    return { before, after };
  },

  compareReplacementContexts(ctx1, ctx2) {
    // Must have some context to compare
    if ((ctx1.before.length === 0 && ctx1.after.length === 0)) {
      return 0;
    }

    // Compare BEFORE context
    let beforeMatches = 0;
    const beforeLength = Math.max(ctx1.before.length, ctx2.before.length);

    for (let i = 0; i < Math.min(ctx1.before.length, ctx2.before.length); i++) {
      if (ctx1.before[i] === ctx2.before[i]) {
        beforeMatches++;
      }
    }

    const beforeRatio = beforeLength > 0 ? beforeMatches / beforeLength : 0;

    // Compare AFTER context
    let afterMatches = 0;
    const afterLength = Math.max(ctx1.after.length, ctx2.after.length);

    for (let i = 0; i < Math.min(ctx1.after.length, ctx2.after.length); i++) {
      if (ctx1.after[i] === ctx2.after[i]) {
        afterMatches++;
      }
    }

    const afterRatio = afterLength > 0 ? afterMatches / afterLength : 0;

    // Return average of before and after match ratios
    return (beforeRatio + afterRatio) / 2;
  },

  detectTryCatchChanges(sourceLines, changedLines, sourceLineMap, changedLineMap, processedSource, processedChanged) {
    const addedBlocks = [];
    const deletedBlocks = [];

    // Detect ADDED try-catch blocks (in changed, not in source)
    for (let i = 0; i < changedLines.length; i++) {
      if (processedChanged.has(i)) continue;

      const line = changedLines[i];
      const trimmed = getMeta(line).stripped;

      if (trimmed === 'try {' || trimmed.startsWith('try {')) {
        const hash = getMeta(line).hash;
        if (sourceLineMap.has(hash)) continue;

        const blockStart = i;
        let blockEnd = i;
        let braceCount = 1;
        let foundCatch = false;
        let foundFinally = false;
        const blockLines = [line];

        for (let j = i + 1; j < changedLines.length; j++) {
          const currentLine = changedLines[j];
          const currentTrimmed = getMeta(currentLine).stripped;
          blockLines.push(currentLine);

          if (currentTrimmed.startsWith('} catch') ||
              (braceCount === 1 && currentTrimmed.startsWith('catch'))) {
            foundCatch = true;
          }

          if (currentTrimmed.startsWith('} finally') ||
              (braceCount === 1 && currentTrimmed.startsWith('finally'))) {
            foundFinally = true;
          }

          for (const char of currentLine) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }

          blockEnd = j;

          if (braceCount === 0 && (foundCatch || foundFinally)) {
            break;
          }

          if (j - i > 200) break;
        }

        if (!foundCatch && !foundFinally) continue;

        const keyLinesToCheck = [
          blockLines[0],
          blockLines.find(l => getMeta(l).stripped.startsWith('catch')),
          blockLines.find(l => getMeta(l).stripped.startsWith('finally'))
        ].filter(Boolean);

        let isNewBlock = true;
        for (const keyLine of keyLinesToCheck) {
          const keyHash = getMeta(keyLine).hash;
          if (sourceLineMap.has(keyHash)) {
            isNewBlock = false;
            break;
          }
        }

        if (!isNewBlock) continue;

        for (let k = blockStart; k <= blockEnd; k++) {
          processedChanged.add(k);
        }

        const wrappedCode = this.extractTryBlockContent(blockLines);

        // Find corresponding source lines for wrapped code
        const wrappedSourcePositions = [];
        const wrappedSourceLines = [];

        for (const wrappedLine of wrappedCode) {
          const hash = getMeta(wrappedLine).hash;
          if (sourceLineMap.has(hash)) {
            const positions = sourceLineMap.get(hash);
            for (const pos of positions) {
              if (!processedSource.has(pos)) {
                wrappedSourcePositions.push(pos);
                wrappedSourceLines.push(sourceLines[pos]);
                processedSource.add(pos);
                break;
              }
            }
          }
        }

        addedBlocks.push({
          lineNumber: blockStart + 1,
          endLineNumber: blockEnd + 1,
          lines: blockLines,
          hasCatch: foundCatch,
          hasFinally: foundFinally,
          wrappedCode: wrappedCode,
          wrappedSourcePositions: wrappedSourcePositions,
          wrappedSourceLines: wrappedSourceLines,
          substantiveCount: countSubstantive(blockLines)
        });

        i = blockEnd;
      }
    }

    // Detect DELETED try-catch blocks (in source, not in changed)
    for (let i = 0; i < sourceLines.length; i++) {
      if (processedSource.has(i)) continue;

      const line = sourceLines[i];
      const trimmed = getMeta(line).stripped;

      if (trimmed === 'try {' || trimmed.startsWith('try {')) {
        const hash = getMeta(line).hash;
        if (changedLineMap.has(hash)) continue;

        const blockStart = i;
        let blockEnd = i;
        let braceCount = 1;
        let foundCatch = false;
        let foundFinally = false;
        const blockLines = [line];

        for (let j = i + 1; j < sourceLines.length; j++) {
          const currentLine = sourceLines[j];
          const currentTrimmed = getMeta(currentLine).stripped;
          blockLines.push(currentLine);

          if (currentTrimmed.startsWith('} catch') ||
              (braceCount === 1 && currentTrimmed.startsWith('catch'))) {
            foundCatch = true;
          }

          if (currentTrimmed.startsWith('} finally') ||
              (braceCount === 1 && currentTrimmed.startsWith('finally'))) {
            foundFinally = true;
          }

          for (const char of currentLine) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }

          blockEnd = j;

          if (braceCount === 0 && (foundCatch || foundFinally)) {
            break;
          }

          if (j - i > 200) break;
        }

        if (!foundCatch && !foundFinally) continue;

        const keyLinesToCheck = [
          blockLines[0],
          blockLines.find(l => getMeta(l).stripped.startsWith('catch')),
          blockLines.find(l => getMeta(l).stripped.startsWith('finally'))
        ].filter(Boolean);

        let isDeletedBlock = true;
        for (const keyLine of keyLinesToCheck) {
          const keyHash = getMeta(keyLine).hash;
          if (changedLineMap.has(keyHash)) {
            isDeletedBlock = false;
            break;
          }
        }

        if (!isDeletedBlock) continue;

        for (let k = blockStart; k <= blockEnd; k++) {
          processedSource.add(k);
        }

        const wrappedCode = this.extractTryBlockContent(blockLines);

        // Find corresponding changed lines for wrapped code
        const wrappedChangedPositions = [];
        const wrappedChangedLines = [];

        for (const wrappedLine of wrappedCode) {
          const hash = getMeta(wrappedLine).hash;
          if (changedLineMap.has(hash)) {
            const positions = changedLineMap.get(hash);
            for (const pos of positions) {
              if (!processedChanged.has(pos)) {
                wrappedChangedPositions.push(pos);
                wrappedChangedLines.push(changedLines[pos]);
                processedChanged.add(pos);
                break;
              }
            }
          }
        }

        deletedBlocks.push({
          lineNumber: blockStart + 1,
          endLineNumber: blockEnd + 1,
          lines: blockLines,
          hasCatch: foundCatch,
          hasFinally: foundFinally,
          wrappedCode: wrappedCode,
          wrappedChangedPositions: wrappedChangedPositions,
          wrappedChangedLines: wrappedChangedLines,
          substantiveCount: countSubstantive(blockLines)
        });

        i = blockEnd;
      }
    }

    // Match deleted blocks with added blocks to find replacements
    const replacements = [];
    const usedDeleted = new Set();
    const usedAdded = new Set();

    for (let i = 0; i < deletedBlocks.length; i++) {
      if (usedDeleted.has(i)) continue;

      const deleted = deletedBlocks[i];
      let bestMatch = null;
      let bestScore = 0;

      for (let j = 0; j < addedBlocks.length; j++) {
        if (usedAdded.has(j)) continue;

        const added = addedBlocks[j];
        const score = this.calculateTryCatchSimilarity(deleted, added);

        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = j;
        }
      }

      if (bestMatch !== null) {
        replacements.push({
          deletedBlock: deleted,
          addedBlock: addedBlocks[bestMatch],
          similarityScore: bestScore
        });
        usedDeleted.add(i);
        usedAdded.add(bestMatch);
      }
    }

    return {
      replacements,
      remainingDeletions: deletedBlocks.filter((_, i) => !usedDeleted.has(i)),
      remainingAdditions: addedBlocks.filter((_, i) => !usedAdded.has(i))
    };
  },

  calculateTryCatchSimilarity(block1, block2) {
    const code1 = block1.wrappedCode.join('\n');
    const code2 = block2.wrappedCode.join('\n');

    // Normalize the code for comparison
    const normalize = (code) => {
      return code
        .replace(/\s+/g, ' ')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim();
    };

    const norm1 = normalize(code1);
    const norm2 = normalize(code2);

    // If identical, return perfect score
    if (norm1 === norm2) return 1.0;

    // Calculate character-level similarity
    const maxLen = Math.max(norm1.length, norm2.length);
    if (maxLen === 0) return 0;

    const minLen = Math.min(norm1.length, norm2.length);
    let matches = 0;

    for (let i = 0; i < minLen; i++) {
      if (norm1[i] === norm2[i]) matches++;
    }

    return matches / maxLen;
  },

  // Helper to extract the code wrapped in the try block
  extractTryBlockContent(blockLines) {
    const wrappedLines = [];
    let insideTry = false;
    let braceCount = 0;

    for (const line of blockLines) {
      const trimmed = getMeta(line).stripped;

      if (trimmed === 'try {' || trimmed.startsWith('try {')) {
        insideTry = true;
        braceCount = 1;
        continue;
      }

      if (insideTry) {
        // Count braces
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        // Exit try block when braces balance
        if (braceCount === 0) {
          insideTry = false;
          break;
        }

        wrappedLines.push(line);
      }
    }

    return wrappedLines;
  },

  setsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (let item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  },

  isSubset(subset, superset) {
    if (subset.size >= superset.size) return false;
    for (let item of subset) {
      if (!superset.has(item)) return false;
    }
    return true;
  },

  normalizeExpression(line) {
    // Remove all whitespace for comparison
    return line.replace(/\s+/g, '');
  },

  calculateIdentifierSimilarity(arr1, arr2) {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  },
};

export default ChangeDetectors;
