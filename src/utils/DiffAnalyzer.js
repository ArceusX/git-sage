import { LineAnalyzer, LineMapper, ChangeDetectors } from './';

const DiffAnalyzer = {
  isLineInCategories(lineNum, categories) {
    const allCategories = [
      ...categories.moveCodeBlock,
      ...categories.updateTryCatch,
      ...categories.deleteCode,
      ...categories.addCode,
      ...categories.replaceCode,
      ...categories.updateImport,
      ...categories.updateComment,
      ...categories.updateFunctionParams,
      ...categories.updateLiteral,
      ...categories.updateCondition,
      ...categories.renameVariable,
    ];
    
    for (const change of allCategories) {
      // Check deleted block
      if (change.deletedBlock) {
        const del = change.deletedBlock;
        if (lineNum >= del.lineNumber && lineNum <= del.endLineNumber) {
          return true;
        }
      }
      
      // Check added block
      if (change.addedBlock) {
        const add = change.addedBlock;
        if (lineNum >= add.lineNumber && lineNum <= add.endLineNumber) {
          return true;
        }
      }
      
      // Check multi-line block range (only for actual blocks, not single lines)
      if (change.lineNumber && change.endLineNumber && 
          change.lineNumber !== change.endLineNumber) {
        if (lineNum >= change.lineNumber && lineNum <= change.endLineNumber) {
          return true;
        }
      }
      
      // Check single-line changes
      if (change.lineNumber === lineNum || change.changedLineNumber === lineNum) {
        return true;
      }
    }
    
    return false;
  },

  analyze(source, changed) {
    const sourceLines = source.split('\n');
    const changedLines = changed.split('\n');
    
    // OPTIMIZATION 1: Cache line hashes upfront
    const sourceHashes = sourceLines.map(line => LineAnalyzer.hashLine(line));
    const changedHashes = changedLines.map(line => LineAnalyzer.hashLine(line));
    
    const categories = {
      moveCodeBlock: [],
      updateTryCatch: [],
      updateImport: [],
      updateComment: [],
      updateFunctionParams: [],
      updateLiteral: [],
      updateCondition: [],
      renameVariable: [],
      deleteCode: [],
      addCode: [],
      replaceCode: [],
    };

    const sourceLineMap = LineMapper.buildMap(sourceLines);
    const changedLineMap = LineMapper.buildMap(changedLines);
    const processedSource = new Set();
    const processedChanged = new Set();

    // Small local cache for any metadata we compute repeatedly in this module.
    const localMetaCache = new Map();
    function getLocalMeta(line) {
      if (localMetaCache.has(line)) return localMetaCache.get(line);
      const meta = {
        ids: LineAnalyzer.extractIdentifiers(line),
        literals: LineAnalyzer.extractLiterals(line),
        funcName: LineAnalyzer.extractFunctionName(line),
        structure: line.replace(/\b[a-zA-Z_]\w*\b/g, 'ID'),
        hash: LineAnalyzer.hashLine(line),
        stripped: line.trim(),
      };
      localMetaCache.set(line, meta);
      return meta;
    }

    // Utility: element-wise array equality (fast, no allocations)
    function arraysEqual(a, b) {
      if (a === b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }



    // Step 1: Detect moved blocks
    categories.moveCodeBlock = ChangeDetectors.detectMovedBlocks(
      sourceLines, changedLines, sourceLineMap, changedLineMap, processedSource, processedChanged
    );

    // Step 2: Detect try-catch additions, deletions, and replacements
    const tryCatchResult = ChangeDetectors.detectTryCatchChanges(
      sourceLines,
      changedLines,
      sourceLineMap,
      changedLineMap,
      processedSource,
      processedChanged
    );

    // Combine all try-catch changes into one category with type indicators
    categories.updateTryCatch = [
      // Replacements: try-catch → try-catch with different wrapped code
      ...tryCatchResult.replacements.map(r => ({
        ...r,
        type: 'replaced'
      })),
      
      // Additions: original source code → full try-catch
      ...tryCatchResult.remainingAdditions.map(block => {
        let deletedBlock;
        
        if (block.wrappedSourcePositions && block.wrappedSourcePositions.length > 0) {
          const minPos = Math.min(...block.wrappedSourcePositions);
          const maxPos = Math.max(...block.wrappedSourcePositions);
          const sourceLines_extracted = block.wrappedSourcePositions.map(pos => sourceLines[pos]);
          
          deletedBlock = {
            lineNumber: minPos + 1,
            endLineNumber: maxPos + 1,
            lines: sourceLines_extracted,
            substantiveCount: sourceLines_extracted.filter(l => l.trim() && !l.trim().startsWith('//')).length
          };
        } else {
          // Fallback: use wrapped code
          deletedBlock = {
            lineNumber: block.lineNumber,
            endLineNumber: block.endLineNumber,
            lines: block.wrappedCode,
            substantiveCount: block.wrappedCode.filter(l => l.trim() && !l.trim().startsWith('//')).length
          };
        }
        
        return {
          deletedBlock: deletedBlock,
          addedBlock: block,
          type: 'added'
        };
      }),
      
      // Deletions: full try-catch → wrapped code (no try)
      ...tryCatchResult.remainingDeletions.map(block => ({
        deletedBlock: {
          lineNumber: block.lineNumber,
          endLineNumber: block.endLineNumber,
          lines: block.lines,
          substantiveCount: block.substantiveCount
        },
        addedBlock: {
          lineNumber: block.wrappedChangedPositions && block.wrappedChangedPositions.length > 0
            ? Math.min(...block.wrappedChangedPositions) + 1
            : block.lineNumber,
          endLineNumber: block.wrappedChangedPositions && block.wrappedChangedPositions.length > 0
            ? Math.max(...block.wrappedChangedPositions) + 1
            : block.endLineNumber,
          lines: block.wrappedChangedPositions && block.wrappedChangedPositions.length > 0
            ? block.wrappedChangedLines
            : block.wrappedCode,
          substantiveCount: (block.wrappedChangedLines || block.wrappedCode).filter(l => l.trim() && !l.trim().startsWith('//')).length
        },
        type: 'deleted'
      }))
    ];

    // Step 3: Detect deletions
    const allDeletions = ChangeDetectors.detectDeletions(
      sourceLines, changedLineMap, processedSource
    );
    
    // Step 4: Detect additions
    const allAdditions = ChangeDetectors.detectAdditions(
      changedLines, sourceLineMap, processedChanged
    );

    // Step 5: Process single-line delete/add pairs for specific categories BEFORE merging
    const processedDeletionIndices = new Set();
    const processedAdditionIndices = new Set();
    
    this.processSingleLinePairs(
      allDeletions,
      allAdditions,
      categories,
      processedDeletionIndices,
      processedAdditionIndices,
      sourceLines,
      changedLines,
      { getLocalMeta, arraysEqual }
    );

    // Filter out processed single-line changes
    const remainingDeletions = allDeletions.filter((_, i) => !processedDeletionIndices.has(i));
    const remainingAdditions = allAdditions.filter((_, i) => !processedAdditionIndices.has(i));

    // Step 6: Merge adjacent deletions and additions into blocks
    categories.deleteCode = ChangeDetectors.mergeAdjacentDeletions(remainingDeletions, sourceLines);
    categories.addCode = ChangeDetectors.mergeAdjacentAdditions(remainingAdditions, changedLines);

    // Step 7: Detect replacements (only on remaining blocks after merging)
    const replacementResult = ChangeDetectors.detectReplacements(
      categories.deleteCode,
      categories.addCode,
      sourceLines,
      changedLines
    );

    categories.replaceCode = replacementResult.replacements;
    categories.deleteCode = replacementResult.remainingDeletions;
    categories.addCode = replacementResult.remainingAdditions;

    // Step 8: Line-by-line detection for any remaining unprocessed lines
    // FIXED: Check against actual categories instead of processedSource/processedChanged
    for (let i = 0; i < Math.max(sourceLines.length, changedLines.length); i++) {
      const sourceLine = sourceLines[i] || '';
      const changedLine = changedLines[i] || '';
      const lineNumber = i + 1;

      if (this.isLineInCategories(lineNumber, categories)) {
        continue;
      }
      
      // OPTIMIZATION: Skip if both are literally empty strings
      if (sourceLine === '' && changedLine === '') continue;
      
      // OPTIMIZATION: Use cached hashes
      if (sourceHashes[i] === changedHashes[i]) continue;

      const changedLineNumber = i + 1;
      let detected = false;

      // Try each detector in order
      const importChange = ChangeDetectors.detectImportChanges(sourceLine, changedLine, lineNumber, changedLineNumber);
      if (importChange) {
        categories.updateImport.push(importChange);
        detected = true;
      }

      if (!detected) {
        const functionParamChange = ChangeDetectors.detectFunctionParamChanges(sourceLine, changedLine, lineNumber, changedLineNumber);
        if (functionParamChange) {
          categories.updateFunctionParams.push(functionParamChange);
          detected = true;
        }
      }

      if (!detected) {
        const literalChange = ChangeDetectors.detectLiteralChanges(sourceLine, changedLine, lineNumber, changedLineNumber);
        if (literalChange) {
          categories.updateLiteral.push(literalChange);
          detected = true;
        }
      }

      if (!detected) {
        const renameChange = ChangeDetectors.detectRename(sourceLine, changedLine, lineNumber, changedLineNumber);
        if (renameChange) {
          categories.renameVariable.push(renameChange);
          detected = true;
        }
      }

      if (!detected) {
        const commentChange = ChangeDetectors.detectCommentChanges(sourceLine, changedLine, lineNumber, changedLineNumber);
        if (commentChange) {
          categories.updateComment.push(commentChange);
          detected = true;
        }
      }

      // Note: We don't add to processedSource/processedChanged here anymore
      // The isLineInCategories check will handle this on next iteration
    }

    // Step 9: Merge adjacent comments
    categories.updateComment = ChangeDetectors.mergeAdjacentComments(
      categories.updateComment,
      sourceLines,
      changedLines
    );

    return categories;
  },

  calculateStructuralSimilarity(line1, line2) {
    const struct1 = LineAnalyzer.getLineStructure(line1);
    const struct2 = LineAnalyzer.getLineStructure(line2);
    
    // Exact structural match
    if (struct1 === struct2) return 1.0;
    
    // Calculate character-level similarity
    const maxLen = Math.max(struct1.length, struct2.length);
    if (maxLen === 0) return 0;
    
    const minLen = Math.min(struct1.length, struct2.length);
    let matches = 0;
    
    for (let i = 0; i < minLen; i++) {
      if (struct1[i] === struct2[i]) matches++;
    }
    
    return matches / maxLen;
  },

  areLinesRelated(deletionLine, additionLine, deletionLineNum, additionLineNum, sourceLines, changedLines) {
    // OPTIMIZATION 3: Quick length check first (very cheap)
    const len1 = deletionLine.length;
    const len2 = additionLine.length;
    const lengthRatio = Math.min(len1, len2) / Math.max(len1, len2);
    
    if (lengthRatio < 0.4) return false; // Too different in length - skip expensive calculation
    
    // Calculate structural similarity only if passed length check
    const similarity = this.calculateStructuralSimilarity(deletionLine, additionLine);
    
    // HIGH SIMILARITY (80%+): Definitely related, ignore distance
    if (similarity >= 0.8) {
      return true;
    }
    
    // MEDIUM SIMILARITY (50-80%): Check relative position
    if (similarity >= 0.5) {
      const deletionPercent = deletionLineNum / sourceLines.length;
      const additionPercent = additionLineNum / changedLines.length;
      const relativeDistance = Math.abs(deletionPercent - additionPercent);
      
      // Within 20% of same relative file position
      return relativeDistance <= 0.2;
    }
    
    // LOW SIMILARITY (<50%): Not related
    return false;
  },

  processSingleLinePairs(deletionBlocks, additionBlocks, categories, processedDeletions, processedAdditions, sourceLines, changedLines, helpers = {}) {
    const { getLocalMeta: externalGetLocalMeta, arraysEqual: externalArraysEqual } = helpers;
    const getMetaLocal = externalGetLocalMeta || (line => ({
      ids: LineAnalyzer.extractIdentifiers(line),
      literals: LineAnalyzer.extractLiterals(line),
      funcName: LineAnalyzer.extractFunctionName(line),
      structure: line.replace(/\b[a-zA-Z_]\w*\b/g, 'ID')
    }));
    
    const arrEqual = externalArraysEqual || ((a,b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    });

    // Pre-compute metadata once instead of per comparison
    const deletionMetadata = deletionBlocks.map(d => getMetaLocal(d.content));
    const additionMetadata = additionBlocks.map(a => getMetaLocal(a.content));
    
    // Optimization: Limit comparisons for very large diffs
    const MAX_COMPARISONS_PER_DELETION = 50;
    
    // For each deletion (single-line format before merging)
    for (let i = 0; i < deletionBlocks.length; i++) {
      const deletion = deletionBlocks[i];
      
      if (processedDeletions.has(i)) continue;

      const deletionLine = deletion.content;
      const deletionLineNum = deletion.lineNumber;
      const delMeta = deletionMetadata[i];
      
      let comparisons = 0;

      // Look for a matching addition
      for (let j = 0; j < additionBlocks.length; j++) {
        const addition = additionBlocks[j];
        
        if (processedAdditions.has(j)) continue;

        const additionLine = addition.content;
        const additionLineNum = addition.lineNumber;
        const addMeta = additionMetadata[j];
        
        // Optimization: Stop after max comparisons
        if (++comparisons > MAX_COMPARISONS_PER_DELETION) break;
        
        // *** FIX: Check Import changes FIRST before relatedness check ***
        // Import changes can have low structural similarity but should still be detected
        let categorized = false;
        
        const importChange = ChangeDetectors.detectImportChanges(deletionLine, additionLine, deletionLineNum, additionLineNum);
        if (importChange) {
          categories.updateImport.push(importChange);
          processedDeletions.add(i);
          processedAdditions.add(j);
          categorized = true;
          break;
        }
        
        // Check if lines are related using hybrid similarity approach
        // (Only if not already categorized as import)
        if (!this.areLinesRelated(deletionLine, additionLine, deletionLineNum, additionLineNum, sourceLines, changedLines)) {
          continue;
        }
        
        // Try to categorize this pair (skip import since we already checked)

        // 2. Check Comment changes
        if (!categorized) {
          const commentChange = ChangeDetectors.detectCommentChanges(deletionLine, additionLine, deletionLineNum, additionLineNum);
          if (commentChange) {
            categories.updateComment.push(commentChange);
            processedDeletions.add(i);
            processedAdditions.add(j);
            categorized = true;
            break;
          }
        }

        // 3. Check Condition changes
        if (!categorized) {
          const conditionChange = ChangeDetectors.detectConditionChange(deletionLine, additionLine, deletionLineNum, additionLineNum);
          if (conditionChange) {
            categories.updateCondition.push(conditionChange);
            processedDeletions.add(i);
            processedAdditions.add(j);
            categorized = true;
            break;
          }
        }

        // 4. Check Function Parameter changes (use pre-computed function names)
        if (!categorized) {
          const funcParamChange = ChangeDetectors.detectFunctionParamChanges(
            deletionLine, 
            additionLine, 
            deletionLineNum, 
            additionLineNum
          );
          if (funcParamChange) {
            categories.updateFunctionParams.push(funcParamChange);
            processedDeletions.add(i);
            processedAdditions.add(j);
            categorized = true;
            break;
          }
        }

        // 5. Check Literal changes (use pre-computed data)
        if (!categorized) {
          const literalChange = ChangeDetectors.detectLiteralChanges(deletionLine, additionLine, deletionLineNum, additionLineNum);
          if (literalChange) {
            // Use pre-computed structures and identifiers
            if (delMeta.structure === addMeta.structure && 
                !arrEqual(delMeta.ids, addMeta.ids)) {
              categorized = false;
            } else {
              categories.updateLiteral.push(literalChange);
              processedDeletions.add(i);
              processedAdditions.add(j);
              categorized = true;
              break;
            }
          }
        }

        // 6. Check Rename (use pre-computed literals)
        if (!categorized) {
          const renameChange = ChangeDetectors.detectRename(deletionLine, additionLine, deletionLineNum, additionLineNum);
          if (renameChange) {
            // Use pre-computed literals
            if (delMeta.literals.length > 0 && addMeta.literals.length > 0 &&
                !arrEqual(delMeta.literals, addMeta.literals)) {
              categorized = false;
            } else {
              categories.renameVariable.push(renameChange);
              processedDeletions.add(i);
              processedAdditions.add(j);
              categorized = true;
              break;
            }
          }
        }

        if (categorized) break;
      }
    }
  },
};

export default DiffAnalyzer;
