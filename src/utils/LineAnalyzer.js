const LineAnalyzer = {
  isComment(line) {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || 
           trimmed.startsWith('#') || 
           trimmed.startsWith('/*') || 
           trimmed.startsWith('*') ||
           trimmed.includes('<!--');
  },

  isImport(line) {
    const trimmed = line.trim();
    return trimmed.startsWith('import ') || 
           trimmed.startsWith('from ') ||
           trimmed.startsWith('require(') || 
           trimmed.startsWith('include ') ||
           trimmed.startsWith('using ');
  },

  extractLiterals(line) {
    const literals = [];
    const strings = line.match(/(["'`])(?:(?=(\\?))\2.)*?\1/g) || [];
    literals.push(...strings);
    const numbers = line.match(/\b\d+\.?\d*\b/g) || [];
    literals.push(...numbers);
    const booleans = line.match(/\b(true|false|True|False|TRUE|FALSE)\b/g) || [];
    literals.push(...booleans);
    return literals;
  },

  extractDefaultArgs(line) {
    return line.match(/(\w+)\s*=\s*([^,)]+)/g) || [];
  },

  extractIdentifiers(line) {
    return line.match(/\b[a-zA-Z_]\w*\b/g) || [];
  },

  hashLine(line) {
    return line.trim().replace(/\s+/g, ' ');
  }
};

export default LineAnalyzer;