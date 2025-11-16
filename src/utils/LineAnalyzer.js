// Pre-compile all regex patterns at module level (significant speedup)
const PATTERNS = {
  closingBrackets: /^[}\])\s]*$/,
  quotes: /^["'`]+$/,
  semicolons: /^;+$/,
  strings: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
  numbers: /\b\d+\.?\d*\b/g,
  booleans: /\b(true|false|True|False|TRUE|FALSE)\b/g,
  defaultArgs: /(\w+)\s*=\s*([^,)]+)/g,
  identifiers: /\b[a-zA-Z_]\w*\b/g,
  functions: [
    /function\s+(\w+)\s*\(/,
    /^\s*(\w+)\s*\([^)]*\)\s*\{/,
    /^\s*(\w+)\s*\([^)]*\)\s*=>/,
    /constructor\s*\(/
  ],
  functionParameters: [
    /function\s+(\w+)\s*\(([^)]*)\)/,
    /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)/,
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/,
    /(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>/,
    /async\s+function\s+(\w+)\s*\(([^)]*)\)/,
    /(?:const|let|var)\s+(\w+)\s*=\s*async\s*\(([^)]*)\)\s*=>/
  ],
  operators: /===|!==|==|!=|>=|<=|>|<|&&|\|\||!/g,
  importFrom: /from\s+['"]([^'"]+)['"]/,
  sideEffectImport: /^import\s+['"]([^'"]+)['"]/,
  requireImport: /require\(['"]([^'"]+)['"]\)/,
  stringLiterals: /["'].*?["']/g,
  templateLiterals: /`[^`]*`/g,
  inlineComments: /\/\/.*$/g,
  blockComments: /\/\*[\s\S]*?\*\//g,
  whitespace: /\s+/g
};

const LineAnalyzer = {
  // Caches for memoization
  _trimCache: new Map(),
  _commentCache: new Map(),
  _importCache: new Map(),
  _substantiveCache: new Map(),
  _literalsCache: new Map(),
  _defaultArgsCache: new Map(),
  _identifiersCache: new Map(),
  _functionNameCache: new Map(),
  _conditionCache: new Map(),
  _operatorsCache: new Map(),
  _importPathCache: new Map(),
  _structureCache: new Map(),
  _hashCache: new Map(),

  // Optimized trim with caching
  _getTrimmed(line) {
    if (this._trimCache.has(line)) {
      return this._trimCache.get(line);
    }
    const trimmed = line.trim();
    this._trimCache.set(line, trimmed);
    return trimmed;
  },

  isComment(line) {
    if (this._commentCache.has(line)) {
      return this._commentCache.get(line);
    }
    
    const trimmed = this._getTrimmed(line);
    const result = trimmed.startsWith('//') || 
           trimmed.startsWith('#') || 
           trimmed.startsWith('/*') || 
           trimmed.startsWith('*') ||
           trimmed.includes('<!--');
    
    this._commentCache.set(line, result);
    return result;
  },

  isImport(line) {
    if (this._importCache.has(line)) {
      return this._importCache.get(line);
    }
    
    const trimmed = this._getTrimmed(line);
    const result = trimmed.startsWith('import ') || 
           trimmed.startsWith('from ') ||
           trimmed.startsWith('require(') || 
           trimmed.startsWith('include ') ||
           trimmed.startsWith('using ');
    
    this._importCache.set(line, result);
    return result;
  },

  isSubstantiveLine(line) {
    if (this._substantiveCache.has(line)) {
      return this._substantiveCache.get(line);
    }
    
    const trimmed = this._getTrimmed(line);
    
    // Fast path: empty check first (most common)
    if (trimmed === '') {
      this._substantiveCache.set(line, false);
      return false;
    }
    
    // Fast path: single character checks before regex
    const firstChar = trimmed[0];
    if (trimmed.length === 1) {
      const result = firstChar !== '}' && firstChar !== ']' && 
                     firstChar !== ')' && firstChar !== '"' && 
                     firstChar !== "'" && firstChar !== '`' && 
                     firstChar !== ';';
      this._substantiveCache.set(line, result);
      return result;
    }
    
    // Check patterns (using pre-compiled regexes)
    if (PATTERNS.closingBrackets.test(trimmed) ||
        PATTERNS.quotes.test(trimmed) ||
        PATTERNS.semicolons.test(trimmed) ||
        this.isComment(line)) {
      this._substantiveCache.set(line, false);
      return false;
    }
    
    this._substantiveCache.set(line, true);
    return true;
  },

  extractLiterals(line) {
    if (this._literalsCache.has(line)) {
      return this._literalsCache.get(line);
    }
    
    const literals = [];
    
    // Reset lastIndex for global regexes to avoid stale state
    PATTERNS.strings.lastIndex = 0;
    const strings = line.match(PATTERNS.strings) || [];
    literals.push(...strings);
    
    PATTERNS.numbers.lastIndex = 0;
    const numbers = line.match(PATTERNS.numbers) || [];
    literals.push(...numbers);
    
    PATTERNS.booleans.lastIndex = 0;
    const booleans = line.match(PATTERNS.booleans) || [];
    literals.push(...booleans);
    
    this._literalsCache.set(line, literals);
    return literals;
  },

  extractDefaultArgs(line) {
    if (this._defaultArgsCache.has(line)) {
      return this._defaultArgsCache.get(line);
    }
    
    PATTERNS.defaultArgs.lastIndex = 0;
    const result = line.match(PATTERNS.defaultArgs) || [];
    
    this._defaultArgsCache.set(line, result);
    return result;
  },

  extractIdentifiers(line) {
    if (this._identifiersCache.has(line)) {
      return this._identifiersCache.get(line);
    }
    
    PATTERNS.identifiers.lastIndex = 0;
    const result = line.match(PATTERNS.identifiers) || [];
    
    this._identifiersCache.set(line, result);
    return result;
  },

  extractFunctionName(line) {
    if (this._functionNameCache.has(line)) {
      return this._functionNameCache.get(line);
    }
    
    // Use pre-compiled patterns
    for (const pattern of PATTERNS.functions) {
      pattern.lastIndex = 0;
      const match = line.match(pattern);
      if (match) {
        const result = match[1] || 'constructor';
        this._functionNameCache.set(line, result);
        return result;
      }
    }
    
    this._functionNameCache.set(line, null);
    return null;
  },

  extractCondition(line) {
    if (this._conditionCache.has(line)) {
      return this._conditionCache.get(line);
    }
    
    // Find first '(' and matching ')'
    const startIdx = line.indexOf('(');
    if (startIdx === -1) {
      this._conditionCache.set(line, null);
      return null;
    }
    
    let depth = 0;
    let endIdx = -1;
    
    for (let i = startIdx; i < line.length; i++) {
      const char = line[i];
      if (char === '(') depth++;
      else if (char === ')') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    
    if (endIdx === -1) {
      this._conditionCache.set(line, null);
      return null;
    }
    
    const result = line.substring(startIdx + 1, endIdx).trim();
    this._conditionCache.set(line, result);
    return result;
  },

  extractOperators(condition) {
    if (this._operatorsCache.has(condition)) {
      return this._operatorsCache.get(condition);
    }
    
    const operators = [];
    PATTERNS.operators.lastIndex = 0;
    let match;
    
    while ((match = PATTERNS.operators.exec(condition)) !== null) {
      operators.push(match[0]);
    }
    
    this._operatorsCache.set(condition, operators);
    return operators;
  },

  extractImportPath(line) {
    if (this._importPathCache.has(line)) {
      return this._importPathCache.get(line);
    }
    
    const trimmed = this._getTrimmed(line);
    
    // Try patterns in order of likelihood
    PATTERNS.importFrom.lastIndex = 0;
    let match = trimmed.match(PATTERNS.importFrom);
    if (match) {
      this._importPathCache.set(line, match[1]);
      return match[1];
    }
    
    PATTERNS.sideEffectImport.lastIndex = 0;
    match = trimmed.match(PATTERNS.sideEffectImport);
    if (match) {
      this._importPathCache.set(line, match[1]);
      return match[1];
    }
    
    PATTERNS.requireImport.lastIndex = 0;
    match = trimmed.match(PATTERNS.requireImport);
    if (match) {
      this._importPathCache.set(line, match[1]);
      return match[1];
    }
    
    this._importPathCache.set(line, null);
    return null;
  },

  /**
   * Parse a line to extract function information
   * Returns { name: string, params: string } or null if not a function
   */
  parseFunction(line) {
    const trimmed = line.trim();

    for (const regex of PATTERNS.functionParameters) {
      const m = trimmed.match(regex);
      if (m) return { name: m[1], params: (m[2] || '').trim() };
    }
    return null;
  },

  getLineStructure(line) {
    if (this._structureCache.has(line)) {
      return this._structureCache.get(line);
    }
    
    // Apply replacements using pre-compiled patterns
    PATTERNS.stringLiterals.lastIndex = 0;
    PATTERNS.templateLiterals.lastIndex = 0;
    PATTERNS.inlineComments.lastIndex = 0;
    PATTERNS.blockComments.lastIndex = 0;
    PATTERNS.numbers.lastIndex = 0;
    PATTERNS.identifiers.lastIndex = 0;
    PATTERNS.whitespace.lastIndex = 0;
    
    const result = line
      .replace(PATTERNS.stringLiterals, 'STRING')
      .replace(PATTERNS.templateLiterals, 'TEMPLATE')
      .replace(PATTERNS.inlineComments, 'COMMENT')
      .replace(PATTERNS.blockComments, 'COMMENT')
      .replace(PATTERNS.numbers, 'NUMBER')
      .replace(PATTERNS.identifiers, 'ID')
      .replace(PATTERNS.whitespace, ' ')
      .trim();
    
    this._structureCache.set(line, result);
    return result;
  },

  hashLine(line) {
    if (this._hashCache.has(line)) {
      return this._hashCache.get(line);
    }
    
    PATTERNS.whitespace.lastIndex = 0;
    const result = line.trim().replace(PATTERNS.whitespace, ' ');
    
    this._hashCache.set(line, result);
    return result;
  },

  // Cache management
  clearCaches() {
    this._trimCache.clear();
    this._commentCache.clear();
    this._importCache.clear();
    this._substantiveCache.clear();
    this._literalsCache.clear();
    this._defaultArgsCache.clear();
    this._identifiersCache.clear();
    this._functionNameCache.clear();
    this._conditionCache.clear();
    this._operatorsCache.clear();
    this._importPathCache.clear();
    this._structureCache.clear();
    this._hashCache.clear();
  },

  getCacheStats() {
    return {
      trim: this._trimCache.size,
      comment: this._commentCache.size,
      import: this._importCache.size,
      substantive: this._substantiveCache.size,
      literals: this._literalsCache.size,
      defaultArgs: this._defaultArgsCache.size,
      identifiers: this._identifiersCache.size,
      functionName: this._functionNameCache.size,
      condition: this._conditionCache.size,
      operators: this._operatorsCache.size,
      importPath: this._importPathCache.size,
      structure: this._structureCache.size,
      hash: this._hashCache.size,
      totalEntries: this._trimCache.size + this._commentCache.size + 
                    this._importCache.size + this._substantiveCache.size +
                    this._literalsCache.size + this._defaultArgsCache.size +
                    this._identifiersCache.size + this._functionNameCache.size +
                    this._conditionCache.size + this._operatorsCache.size +
                    this._importPathCache.size + this._structureCache.size +
                    this._hashCache.size
    };
  }
};

export default LineAnalyzer;