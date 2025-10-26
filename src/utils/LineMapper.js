import LineAnalyzer from './LineAnalyzer.js';

const LineMapper = {
  buildMap(lines) {
    const lineMap = new Map();
    lines.forEach((line, i) => {
      const hash = LineAnalyzer.hashLine(line);
      if (hash) {
        if (!lineMap.has(hash)) lineMap.set(hash, []);
        lineMap.get(hash).push(i);
      }
    });
    return lineMap;
  }
};

export default LineMapper;