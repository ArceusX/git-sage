import { Button } from '@chakra-ui/react';

const DownloadHTMLClassic = ({ diffResult, appName, sourceFileName, changedFileName }) => {
  const generateHTML = () => {
    if (!diffResult || !diffResult.length) return '';

    const stats = diffResult.reduce((acc, line) => {
      const key = line.type === 'deleted' ? 'deletions' 
                : line.type === 'added' ? 'additions' 
                : 'unchanged';
      acc[key] += 1;
      return acc;
    }, { deletions: 0, additions: 0, unchanged: 0 });

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
      max-width: 1000px; 
      margin: 20px auto; 
      padding: 20px; 
      background: #F7FAFC;
      line-height: 1.5;
    }
    h2 {
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
    .stats {
      background: #EBF8FF;
      padding: 12px 16px;
      border-bottom: 1px solid #CBD5E0;
      margin-left: 130px;
      font-size: 0.95rem;
    }
    .stats span {
      margin-right: 16px;
      font-weight: 600;
    }
    .stats .deletions {
      color: #C53030;
    }
    .stats .additions {
      color: #2F855A;
    }
    .stats .unchanged {
      color: #6B46C1;
    }
    .diff-container {
      background: white;
      border: 1px solid #CBD5E0;
      border-radius: 8px;
      overflow: hidden;
    }
    .diff-line {
      display: flex;
      border-bottom: 1px solid #E2E8F0;
    }
    .line-number {
      width: 48px;
      padding: 4px 6px;
      text-align: right;
      font-family: monospace;
      font-size: 0.875rem;
      font-weight: bold;
      border-right: 1px solid #E2E8F0;
      user-select: none;
    }
    .line-number-source {
      background: #FEFCBF;
      color: black;
    }
    .line-number-changed {
      background: #E9D8FD;
    }
    .line-number-source[data-type="added"],
    .line-number-changed[data-type="deleted"] {
      background: white;
    }
    .line-prefix {
      min-width: 30px;
      max-width: 30px;
      padding: 4px 8px;
      font-family: monospace;
      font-size: 0.875rem;
      font-weight: bold;
      user-select: none;
    }
    .line-content {
      flex: 1;
      padding: 4px 8px;
      font-family: monospace;
      font-size: 0.875rem;
      white-space: pre;
      overflow-x: auto;
    }
    .diff-deleted .line-prefix {
      color: #C53030;
    }
    .diff-deleted .line-content {
      background: #FED7D7;
      color: #742A2A;
    }
    .diff-added .line-prefix {
      color: #2F855A;
    }
    .diff-added .line-content {
      background: #C6F6D5;
      color: #22543D;
    }
    .diff-unchanged .line-content {
      background: white;
      color: black;
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
  
  <div class="diff-container">
    <div class="stats">
      <span class="deletions">-${stats.deletions} Lines</span>
      <span class="additions">+${stats.additions} Lines</span>
      <span class="unchanged">=${stats.unchanged} Lines</span>
    </div>
`;

    diffResult.forEach((line) => {
      const prefix = line.type === 'deleted' ? '-' : line.type === 'added' ? '+' : ' ';
      const escapedContent = (line.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      html += `    <div class="diff-line diff-${line.type}">
      <div class="line-number line-number-source" data-type="${line.type}">${line.sourceLine || ''}</div>
      <div class="line-number line-number-changed" data-type="${line.type}">${line.changedLine || ''}</div>
      <div class="line-prefix">${prefix}</div>
      <div class="line-content">${escapedContent}</div>
    </div>
`;
    });

    html += `  </div>
</body>
</html>`;

    return html;
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diff-classic-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!diffResult || !diffResult.length) return null;

  return (
    <Button
      bg="orange.100"
      size="md"
      w="30%"
      minW="300px"
      mx="auto"
      onClick={handleDownloadHTML}>
      Download Classic View
    </Button>
  );
};

export default DownloadHTMLClassic;