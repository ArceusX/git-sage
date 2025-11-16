import React, { useRef, useMemo, useState, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { Box, VStack, Heading, Button, HStack, Text } from '@chakra-ui/react';

const initialLineCount = 15;
const fontSize = 15;
const lineHeight = 1.5;
const padding = 8;

const textInitialHeight = lineHeight * fontSize * initialLineCount + padding * 2;

const FileInputPanel = forwardRef(({ title, value, onChange, onFileUpload }, ref) => {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const breakpointsRef = useRef(null);
  const [actionInfo, setActionInfo] = useState(null);
  const [breakpoints, setBreakpoints] = useState(new Set());
  const panelType = title.toLowerCase().includes('source') ? 'source' : 'changed';
  const storageKey = `fileInputPanel-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const breakpointsStorageKey = `${storageKey}-breakpoints`;
  const [isInitialized, setIsInitialized] = useState(false);

  useImperativeHandle(ref, () => ({
    scrollToLine: (lineNumber) => {
      const lineNumberElement = lineNumbersRef.current?.querySelector(`.line-number[data-line="${lineNumber}"]`);
      if (lineNumberElement && textareaRef.current) {
        textareaRef.current.scrollTop = (lineNumber - 1) * lineHeight * fontSize;
        lineNumberElement.style.backgroundColor = '#FEF08A';
        lineNumberElement.style.transition = 'background-color 0.3s';
        setTimeout(() => { lineNumberElement.style.backgroundColor = ''; }, 12000);
      }
    }
  }));

  useEffect(() => {
    if (!isInitialized) {
      try {
        const savedContent = localStorage.getItem(storageKey);
        if (savedContent && savedContent !== value) {
          onChange({ target: { value: savedContent } });
        }
        
        const savedBreakpoints = localStorage.getItem(breakpointsStorageKey);
        if (savedBreakpoints) {
          setBreakpoints(new Set(JSON.parse(savedBreakpoints)));
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
      setIsInitialized(true);
    }
  }, [storageKey, breakpointsStorageKey, isInitialized, onChange, value]);

  const handleScroll = (e) => { 
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = e.target.scrollTop; 
    if (breakpointsRef.current) breakpointsRef.current.scrollTop = e.target.scrollTop;
  };
  
  const lines = useMemo(() => value.split('\n'), [value]);

  const toggleBreakpoint = useCallback((lineNumber) => {
    setBreakpoints(prev => {
      const newBreakpoints = new Set(prev);
      if (newBreakpoints.has(lineNumber)) {
        newBreakpoints.delete(lineNumber);
      } else {
        newBreakpoints.add(lineNumber);
      }
      return newBreakpoints;
    });
  }, []);

  const updateValue = useCallback((newVal) => {
    if (breakpoints.size > 0) {
      const oldArr = value.split('\n');
      const newArr = newVal.split('\n');
      
      let prefixLen = 0;
      const minLen = Math.min(oldArr.length, newArr.length);
      while (prefixLen < minLen && oldArr[prefixLen] === newArr[prefixLen]) {
        prefixLen++;
      }
      
      let suffixLen = 0;
      while (suffixLen < minLen - prefixLen && 
             oldArr[oldArr.length - 1 - suffixLen] === newArr[newArr.length - 1 - suffixLen]) {
        suffixLen++;
      }
      
      const newBreakpoints = new Set();
      const lineDiff = newArr.length - oldArr.length;
      
      breakpoints.forEach(lineNum => {
        const idx = lineNum - 1;
        
        if (idx < prefixLen) {
          newBreakpoints.add(lineNum);
        }
        else if (idx >= oldArr.length - suffixLen) {
          const newLine = lineNum + lineDiff;
          if (newLine > 0 && newLine <= newArr.length) {
            newBreakpoints.add(newLine);
          }
        }
        else {
          const content = oldArr[idx];
          if (content.trim() !== '') {
            const oldMiddleStart = prefixLen;
            const occurrenceIdx = oldArr.slice(oldMiddleStart, idx)
              .filter(line => line === content).length;
            
            const newMiddleStart = prefixLen;
            const newMiddleEnd = newArr.length - suffixLen;
            let currentOccurrence = 0;
            
            for (let i = newMiddleStart; i < newMiddleEnd; i++) {
              if (newArr[i] === content) {
                if (currentOccurrence === occurrenceIdx) {
                  newBreakpoints.add(i + 1);
                  break;
                }
                currentOccurrence++;
              }
            }
          }
        }
      });
      
      setBreakpoints(newBreakpoints);
    }
    
    onChange({ target: { value: newVal } });
  }, [breakpoints, value, onChange]);

  const handleTextChange = useCallback((e) => { 
    const newVal = e.target.value;
    updateValue(newVal);
    if (actionInfo) setActionInfo(null); 
  }, [updateValue, actionInfo]);

  const insertAtSelection = (text) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    updateValue(newValue);
    requestAnimationFrame(() => { textarea.selectionStart = textarea.selectionEnd = start + text.length; });
  };

  const handleKeyDown = useCallback((e) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const currentLineStart = value.lastIndexOf('\n', start - 1) + 1;

    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = '  ';
      const linesArr = value.split('\n');
      const startLine = value.substring(0, start).split('\n').length - 1;
      const endLine = value.substring(0, end).split('\n').length - 1;

      if (startLine === endLine && !selected.includes('\n')) {
        if (e.shiftKey) {
          if (value.substring(currentLineStart, currentLineStart + indent.length) === indent) {
            const newValue = value.substring(0, currentLineStart) + value.substring(currentLineStart + indent.length);
            updateValue(newValue);
            requestAnimationFrame(() => { textarea.selectionStart = start - indent.length; textarea.selectionEnd = end - indent.length; });
          }
        } else {
          const newValue = value.substring(0, currentLineStart) + indent + value.substring(currentLineStart);
          updateValue(newValue);
          requestAnimationFrame(() => { textarea.selectionStart = start + indent.length; textarea.selectionEnd = end + indent.length; });
        }
      } else {
        const modified = [...linesArr];
        for (let i = startLine; i <= endLine; i++) {
          if (e.shiftKey) {
            if (modified[i].startsWith(indent)) modified[i] = modified[i].slice(indent.length);
          } else modified[i] = indent + modified[i];
        }
        const newValue = modified.join('\n');
        updateValue(newValue);
        return;
      }
      return;
    }

    if (e.key === 'Enter') {
      const currentLine = value.substring(currentLineStart, start);
      const indentMatch = currentLine.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
      e.preventDefault();
      insertAtSelection('\n' + indent);
      return;
    }

    const pairs = {'(':')','[':']','{':'}','"':'"',"'":"'",'`':'`'};
    if (pairs[e.key] && !e.shiftKey) {
      e.preventDefault();
      insertAtSelection(e.key + pairs[e.key]);
      textarea.selectionStart--;
      textarea.selectionEnd--;
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const startLine = value.substring(0, start).split('\n').length - 1;
      const endLine = value.substring(0, end).split('\n').length - 1;
      const linesCopy = value.split('\n');
      const allCommented = linesCopy.slice(startLine, endLine+1).every(l => l.trim().startsWith('//') || l.trim().startsWith('/*'));
      for (let i = startLine; i <= endLine; i++) {
        if (allCommented) {
          linesCopy[i] = linesCopy[i].replace(/^\s*\/\/?/, '').replace(/^\s*\/\*/, '').replace(/\*\/$/, '');
        } else {
          linesCopy[i] = '//' + linesCopy[i];
        }
      }
      updateValue(linesCopy.join('\n'));
      return;
    }
  }, [value, updateValue, insertAtSelection]);

  const handleFileUploadInternal = (e) => {
    const file = e.target.files[0];
    if (file) {
      const uploadDate = new Date().toLocaleString();
      setActionInfo({ type: 'upload', fileName: file.name, date: uploadDate });
    }
    onFileUpload(e);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, value);
      localStorage.setItem(breakpointsStorageKey, JSON.stringify([...breakpoints]));
      const saveDate = new Date().toLocaleString();
      setActionInfo({ type: 'save', text: `Save text on ${saveDate}` });
    } catch (error) {
      alert(`Failed to save: ${error.message}`);
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(breakpointsStorageKey);
      setBreakpoints(new Set());
      const clearDate = new Date().toLocaleString();
      setActionInfo({ type: 'clear', text: `Clear save on ${clearDate}` });
    } catch (error) {
      console.error('Failed to clear from localStorage:', error);
    }
  };

  const lineNumbers = useMemo(() => 
    lines.map((line, index) => (
      <Box key={index} className={`line-number ${line.trim()===''?'line-number-blank':'line-number-visible'}`} data-line={index+1} height={`${lineHeight}em`}>
        {line.trim()!=='' ? index+1 : ''}
      </Box>
    )), [lines]);

  const breakpointCells = useMemo(() => 
    lines.map((line, index) => (
      <Box 
        key={index} 
        className={`breakpoint-cell ${breakpoints.has(index+1) ? 'breakpoint-active' : ''}`}
        data-line={index+1} 
        height={`${lineHeight}em`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        onClick={() => toggleBreakpoint(index+1)}
        _hover={{ bg: 'gray.200' }}
      >
        {breakpoints.has(index+1) && (
          <Box 
            className="breakpoint-dot"
            width="10px" 
            height="10px" 
            borderRadius="50%" 
            bg="red.500"
          />
        )}
      </Box>
    )), [lines, breakpoints, toggleBreakpoint]);

  return (
    <Box className={`file-input-panel file-input-${panelType}`} flex={1} display="flex" flexDirection="column" data-panel-type={panelType}>
      <VStack className="file-panel-content" align="stretch" spacing={3} flex="1">
        <HStack className="file-panel-header" justify="space-between" align="center" h="50px">
          <Heading className="file-panel-title" size={{ md:'sm', lg:'md' }}>{title}</Heading>
          <Text className="file-action-info" fontSize="md" color="gray.600" fontStyle="italic">
            {actionInfo && actionInfo.type === 'upload' && (
              <>
                <Text as="span">Upload </Text>
                <Text as="span" bg="yellow.50" px={1} borderRadius="sm">{actionInfo.fileName}</Text>
                <Text as="span"> on {actionInfo.date}</Text>
              </>
            )}
            {actionInfo && (actionInfo.type === 'save' || actionInfo.type === 'clear') && (
              <Text as="span">{actionInfo.text}</Text>
            )}
          </Text>
        </HStack>
        <Box className="file-editor-container" position="relative" height={`${textInitialHeight}px`} display="flex" bg="white" borderRadius="md" border="1px solid" borderColor="gray.300" overflow="hidden">
          <Box className="line-numbers-container" ref={lineNumbersRef} bg="gray.50" borderRight="1px solid" borderColor="gray.300" overflow="hidden" fontFamily="monospace" fontSize={fontSize} lineHeight={lineHeight} color="gray.500" userSelect="none" minW="50px" maxW="50px" textAlign="right" pr={2} py={2}>
            {lineNumbers}
          </Box>
          <Box className="breakpoints-container" ref={breakpointsRef}
            bg="gray.50" borderRight="1px solid" borderColor="gray.300" overflow="hidden" fontFamily="monospace" fontSize={fontSize} lineHeight={lineHeight} userSelect="none" w="20px" py={2}>
            {breakpointCells}
          </Box>
          <Box className="file-textarea" as="textarea" ref={textareaRef} value={value} onChange={handleTextChange} onScroll={handleScroll} onKeyDown={handleKeyDown} placeholder={`Paste ${title.toLowerCase()} here...`} fontFamily="monospace" fontSize={fontSize} resize="none" flex="1" bg="transparent" border="none" outline="none" p={2} lineHeight={lineHeight} spellCheck="false" wrap="off" _focus={{ outline:'none' }} sx={{'&::-webkit-scrollbar':{width:'12px',height:'12px'},'&::-webkit-scrollbar-track':{background:'#f1f1f1'},'&::-webkit-scrollbar-thumb':{background:'#888',borderRadius:'6px'},'&::-webkit-scrollbar-thumb:hover':{background:'#555'}}} />
        </Box>
        <Box className="file-actions-container" position="relative" w="100%" textAlign="center" mt={2}>
          <Button className="file-save-button" size="md" colorScheme="blue" variant="outline" w="20%" minW="80px" position="absolute" left={0} top="50%" transform="translateY(-50%)" onClick={handleSave}>
            💾<Text as="span" display={{ md:'inline', base:'none' }} ml={2}>Save</Text>
          </Button>
          <Button className={`file-upload-button file-upload-button-${panelType}`} as="label" variant="outline" cursor="pointer" w="36%" minW="160px" bg="green.100" color="black" mx="auto" _hover={{bg:'green.200'}}>
            Upload File
            <input type="file" hidden onChange={handleFileUploadInternal} />
          </Button>
          <Button className="file-clear-button" size="md" colorScheme="red" variant="outline" w="20%" minW="80px" position="absolute" right={0} top="50%" transform="translateY(-50%)" onClick={handleClear}>
            <Text className="clear-button-text" as="span" display={{ md:'inline', base:'none' }} mr={2}>Clear</Text>
            ✕
          </Button>
        </Box>
      </VStack>
    </Box>
  );
});

FileInputPanel.displayName = 'FileInputPanel';
export default FileInputPanel;