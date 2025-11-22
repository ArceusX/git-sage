import { Button, theme } from '@chakra-ui/react';

const DownloadHTMLCategories = ({ analysis, appName, categories, sourceFileName, changedFileName }) => {
const generateHTML = () => {
  if (!analysis) return '';

  const resolveColor = (token) => {
    const [name, shade] = token.split('.');
    return theme.colors?.[name]?.[shade] || '#CBD5E0';
  };

  const displaySourceName = sourceFileName || '______';
  const displayChangedName = changedFileName || '______';

  let html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        max-width: 800px; 
        margin: 20px auto; 
        padding: 20px; 
        background: #F7FAFC;
        line-height: 1.5;
      }
      h2.app-heading {
        color: #319795;
        text-align: center;
        margin-bottom: 8px;
      }
      .timestamp {
        text-align: center;
        font-size: 1.15rem;
        color: red;
        margin-bottom: 8px;
      }
      .filenames {
        text-align: center;
        font-size: 1.15rem;
        color: green;
        margin-bottom: 30px;
      }
      .category-section {
        margin-bottom: 16px;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        overflow: hidden;
      }
      .category-header {
        padding: 8px 12px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .category-title-container {
        display: flex;
        align-items: center;
      }
      .category-title {
        font-size: 1rem;
        font-weight: 600;
      }
      .category-badge {
        background: rgba(0, 0, 0, 0.36);
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.875rem;
        margin-left: 12px;
        font-weight: 500;
      }
      .category-content {
        padding: 16px;
        background: white;
      }
      .change-item {
        padding: 12px;
        border-radius: 6px;
        font-size: 0.875rem;
      }
      .change-line-info {
        color: black;
        margin-bottom: 8px;
        font-size: 1rem;
      }
      .code-block {
        font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        white-space: pre-wrap;
        padding: 8px;
      }
      .code-block-deleted {
        background: #FED7D7;
      }
      .code-block-added {
        background: #C6F6D5;
      }
      .code-block-neutral {
        background: #EBF8FF;
      }
      .removed-label {
        font-weight: bold;
        color: #C53030;
        margin-bottom: 6px;
        font-size: 1rem;
      }
      .added-label {
        font-weight: bold;
        color: #2F855A;
        margin-bottom: 6px;
        font-size: 0.875rem;
      }
    </style>
  </head>
  <body>
    <h2 class="app-heading">${appName}</h2>
    <p class="timestamp">
      Downloaded on ${new Date().toLocaleString()}
    </p>
    <p class="filenames">
      Source: ${displaySourceName} | Changed: ${displayChangedName}
    </p>
  `;

    html += `<div class="results-display-categories">`;
    categories.forEach(({ key, title, color }) => {
      const changes = analysis[key];
      if (changes && changes.length > 0) {
        const categoryClassName = `category-${key}`;
        html += `
  <div class="category-section ${categoryClassName}" data-category="${key}" data-count="${changes.length}">
    <div class="category-header ${categoryClassName}-header" data-expanded="true" style="background-color: ${resolveColor(color)};">
      <div class="category-title-container">
        <span class="category-title">${title}</span>
        <span class="category-badge">${changes.length}</span>
      </div>
    </div>
    <div class="category-content ${categoryClassName}-content">
`;
        changes.forEach((change, index) => {
          const isLast = index === changes.length - 1;
          const marginBottom = isLast ? '0' : '12px';
          const lineNumber = change.lineNumber || change.sourceLine || 'unknown';
          const totalLines = (change.lines || []).length;
          const countLabel = totalLines > 1 ? ` (${totalLines})` : '';
          
          if (key === 'moveCodeBlock') {
            html += `
      <div class="change-item change-${key}-${index}" data-change-index="${index}" data-line-number="${lineNumber}" style="margin-bottom: ${marginBottom}; background: #FFFAF0;">
        <div class="change-line-info">Lines ${change.sourceLine}-${change.sourceLine + change.blockSize - 1} → Lines ${change.changedLine}-${change.changedLine + change.blockSize - 1}</div>
        <div class="code-block code-block-neutral" style="margin-top: 8px;">${change.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
`;
          } else if (key === 'deleteCode') {
            const lineLabel = change.lineNumber === change.endLineNumber 
              ? `Line ${change.lineNumber}` 
              : `Lines ${change.lineNumber}-${change.endLineNumber}`;
            const linesContent = (change.lines || []).join('\n');
            html += `
      <div class="change-item change-${key}-${index}" data-change-index="${index}" data-line-number="${lineNumber}" style="margin-bottom: ${marginBottom}; background: #FAF5FF;">
        <div class="change-line-info" style="margin-bottom: 4px;">${lineLabel} ${countLabel}</div>
        <div class="code-block code-block-deleted">${linesContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
`;
          } else if (key === 'addCode') {
            const lineLabel = change.lineNumber === change.endLineNumber 
              ? `Line ${change.lineNumber}` 
              : `Lines ${change.lineNumber}-${change.endLineNumber}`;
            const linesContent = (change.lines || []).join('\n');
            html += `
      <div class="change-item change-${key}-${index}" data-change-index="${index}" data-line-number="${lineNumber}" style="margin-bottom: ${marginBottom}; background: #EBF8FF;">
        <div class="change-line-info" style="margin-bottom: 4px;">${lineLabel} ${countLabel}</div>
        <div class="code-block code-block-added">${linesContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
`;
          } else if (
            key === 'replaceCode' ||
            key === 'updateTryCatch') {
            const del = change.deletedBlock || {};
            const add = change.addedBlock || {};
            const delLineLabel = del.lineNumber === del.endLineNumber ? `Line ${del.lineNumber}` : `Lines ${del.lineNumber}-${del.endLineNumber}`;
            const addLineLabel = add.lineNumber === add.endLineNumber ? `Line ${add.lineNumber}` : `Lines ${add.lineNumber}-${add.endLineNumber}`;
            const lineInfo = delLineLabel === addLineLabel ? delLineLabel : `${delLineLabel} → ${addLineLabel}`;
            const delContent = (del.lines || []).join('\n');
            const addContent = (add.lines || []).join('\n');
            const delLines = (del.lines || []).length;
            const addLines = (add.lines || []).length;
            
            html += `
      <div class="change-item change-${key}-${index}" data-change-index="${index}" data-line-number="${lineNumber}" style="margin-bottom: ${marginBottom}; background: #FFFFF0;">
        <div class="change-line-info">${lineInfo}</div>
        <div style="margin-bottom: 12px;">
          <div class="removed-label">- Removed (${delLines} lines):</div>
          <div class="code-block code-block-deleted" style="border-radius: 2px;">${delContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        <div>
          <div class="added-label">+ Added (${addLines} lines):</div>
          <div class="code-block code-block-added" style="border-radius: 2px;">${addContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      </div>
`;
          } else {
            // Update categories (updateComment, updateImport, etc.)
            const isMergedBlock = Array.isArray(change.sourceLines) && Array.isArray(change.changedLines);
            
            if (isMergedBlock) {
              // Merged block format
              const isSingleLineSource = change.lineNumber === change.endLineNumber;
              const isSingleLineChanged = (change.changedLineNumber || change.lineNumber) === (change.changedEndLineNumber || change.endLineNumber);
              
              const sourceLineLabel = isSingleLineSource 
                ? `Line ${change.lineNumber}` 
                : `Lines ${change.lineNumber}-${change.endLineNumber}`;
              
              const changedLineLabel = isSingleLineChanged
                ? `Line ${change.changedLineNumber || change.lineNumber}`
                : `Lines ${change.changedLineNumber || change.lineNumber}-${change.changedEndLineNumber || change.endLineNumber}`;
              
              const lineInfo = sourceLineLabel === changedLineLabel
                ? sourceLineLabel
                : `${sourceLineLabel} → ${changedLineLabel}`;
              
              const sourceContent = change.sourceLines.join('\n');
              const changedContent = change.changedLines.join('\n');
              
              html += `
      <div class="change-item change-${key}-${index}" data-change-index="${index}" data-line-number="${lineNumber}" style="margin-bottom: ${marginBottom}; background: #F7FAFC;">
        <div class="change-line-info" style="margin-bottom: 4px;">${lineInfo}</div>
        <div class="code-block code-block-deleted" style="margin-bottom: 4px;">${sourceContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="code-block code-block-added">${changedContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
`;
            } else {
              // Single-line change format
              const sourceLineLabel = `Line ${change.lineNumber}`;
              const changedLineLabel = change.changedLineNumber 
                ? `Line ${change.changedLineNumber}`
                : sourceLineLabel;
              
              const lineInfo = sourceLineLabel === changedLineLabel
                ? sourceLineLabel
                : `${sourceLineLabel} → ${changedLineLabel}`;
              
              const source = change.source || '';
              const changed = change.changed || '';
              
              html += `
      <div class="change-item change-${key}-${index}" data-change-index="${index}" data-line-number="${lineNumber}" style="margin-bottom: ${marginBottom}; background: #F7FAFC;">
        <div class="change-line-info" style="margin-bottom: 4px;">${lineInfo}</div>
        <div class="code-block code-block-deleted" style="padding: 4px; margin-bottom: 4px;">${source.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="code-block code-block-added" style="padding: 4px;">${changed.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
`;
            }
          }
        });
        html += `
    </div>
  </div>
`;
      }
    });

    html += `</div></body></html>`;

    return html;
  };

const handleDownloadHTML = () => {
  const htmlContent = generateHTML();
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `diff-categories-${Date.now()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

  if (!analysis) return null;

  return (
    <Button
      bg="orange.100"
      size="md"
      w="30%"
      minW="300px"
      mx="auto"
      onClick={handleDownloadHTML}>
      Download Categories View
    </Button>
  );
};

export default DownloadHTMLCategories;