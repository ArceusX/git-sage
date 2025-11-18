import React, { forwardRef, useEffect, useState, useImperativeHandle } from 'react';
import { Box, VStack, Heading, Button, HStack, Text } from '@chakra-ui/react';
import { EditorView, keymap, gutter, GutterMarker, lineNumbers, Decoration } from '@codemirror/view';
import { EditorState, StateField, StateEffect, RangeSet } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';

import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { sql } from '@codemirror/lang-sql';

import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { yaml } from '@codemirror/lang-yaml';

// Breakpoint marker (purely visual)
class BreakpointMarker extends GutterMarker {
  toDOM() {
    const div = document.createElement('div');
    div.style.width = '10px';
    div.style.height = '10px';
    div.style.borderRadius = '50%';
    div.style.backgroundColor = 'red';
    div.style.marginTop = '4px';
    div.style.marginLeft = '2px';
    return div;
  }
}
const breakpointMarker = new BreakpointMarker();

function createBreakpointExtension(storageKey) {
  const toggleBreakpointEffect = StateEffect.define();
  const setBreakpointsEffect = StateEffect.define();
  const clearBreakpointsEffect = StateEffect.define();

  const breakpointState = StateField.define({
    create() { return RangeSet.empty; },
    update(set, tr) {
      // If the document changed dramatically (like file upload), clear breakpoints
      if (tr.docChanged) {
        const docLengthChange = tr.newDoc.length - (tr.startState.doc.length || 0);
        // If the entire document was replaced (large change), clear breakpoints
        if (Math.abs(docLengthChange) > tr.startState.doc.length * 0.5) {
          set = RangeSet.empty;
          localStorage.removeItem(`${storageKey}-breakpoints`);
          return set;
        }
      }

      // Try to map breakpoints, but catch errors if positions are invalid
      try {
        set = set.map(tr.changes);
      } catch (e) {
        // If mapping fails, clear all breakpoints
        set = RangeSet.empty;
        localStorage.removeItem(`${storageKey}-breakpoints`);
      }

      for (let effect of tr.effects) {
        if (effect.is(toggleBreakpointEffect)) {
          const pos = effect.value;
          let has = false;
          set.between(pos, pos, () => (has = true));
          set = has
            ? set.update({ filter: f => f !== pos })
            : set.update({ add: [breakpointMarker.range(pos)] });
          
          // Save breakpoints to localStorage
          const breakpoints = [];
          set.between(0, Infinity, (from) => breakpoints.push(from));
          localStorage.setItem(`${storageKey}-breakpoints`, JSON.stringify(breakpoints));
        }
        if (effect.is(setBreakpointsEffect)) {
          const positions = effect.value;
          const ranges = positions.map(pos => breakpointMarker.range(pos));
          set = RangeSet.of(ranges);
        }
        if (effect.is(clearBreakpointsEffect)) {
          set = RangeSet.empty;
          localStorage.removeItem(`${storageKey}-breakpoints`);
        }
      }
      return set;
    }
  });

  function toggle(view, pos) {
    view.dispatch({ effects: toggleBreakpointEffect.of(pos) });
  }

  function setBreakpoints(view, positions) {
    view.dispatch({ effects: setBreakpointsEffect.of(positions) });
  }

  function clearBreakpoints(view) {
    view.dispatch({ effects: clearBreakpointsEffect.of(null) });
  }

  return [
    breakpointState,
    gutter({
      class: 'cm-breakpoint-gutter',
      markers: v => v.state.field(breakpointState),
      domEventHandlers: {
        mousedown(view, line) {
          toggle(view, line.from);
          return true;
        }
      }
    }),
    { setBreakpoints, clearBreakpoints }
  ];
}

// Line highlight extension
function createLineHighlightExtension() {
  const highlightEffect = StateEffect.define();
  const clearHighlightEffect = StateEffect.define();

  const lineHighlightMark = Decoration.line({
    attributes: { style: 'background-color: rgba(255, 255, 0, 0.3);' }
  });

  const highlightState = StateField.define({
    create() { return Decoration.none; },
    update(decorations, tr) {
      decorations = decorations.map(tr.changes);
      
      for (let effect of tr.effects) {
        if (effect.is(highlightEffect)) {
          const lineNum = effect.value;
          const line = tr.state.doc.line(lineNum);
          decorations = Decoration.set([lineHighlightMark.range(line.from)]);
        }
        if (effect.is(clearHighlightEffect)) {
          decorations = Decoration.none;
        }
      }
      return decorations;
    },
    provide: f => EditorView.decorations.from(f)
  });

  function highlightLine(view, lineNum) {
    if (lineNum > 0 && lineNum <= view.state.doc.lines) {
      view.dispatch({ effects: highlightEffect.of(lineNum) });
      
      // Scroll to line
      const line = view.state.doc.line(lineNum);
      view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: 'center' })
      });
      
      // Clear after 10 seconds
      setTimeout(() => {
        view.dispatch({ effects: clearHighlightEffect.of(null) });
      }, 10000);
    }
  }

  return [highlightState, { highlightLine }];
}

// Language selection
function getLang(title) {
  const t = title.toLowerCase();

  // --- Core languages ---
  if (t.includes('python') || t.endsWith('.py')) return python();
  if (t.includes('java') || t.endsWith('.java')) return java();
  if (t.includes('cpp') || t.includes('c++') || t.endsWith('.cpp') || t.endsWith('.cc')) return cpp();
  if (t.includes('ts') || t.endsWith('.ts')) return javascript({ typescript: true });
  if (t.includes('js') || t.endsWith('.js')) return javascript();

  // --- Additional web/config languages ---
  if (t.includes('sql') || t.endsWith('.sql')) return sql();
  if (t.includes('html') || t.endsWith('.html') || t.endsWith('.htm')) return html();
  if (t.includes('css') || t.endsWith('.css')) return css();
  if (t.includes('json') || t.endsWith('.json')) return json();
  if (t.includes('md') || t.endsWith('.md')) return markdown();
  if (t.includes('yaml') || t.includes('yml') || t.endsWith('.yaml') || t.endsWith('.yml')) return yaml();

  // --- Fallback ---
  return javascript();
}


// Main component
const FileInputPanel = forwardRef(({ title, value, onChange, onFileUpload }, ref) => {
  const editorContainerRef = React.useRef(null);
  const [editor, setEditor] = useState(null);
  const [actionInfo, setActionInfo] = useState(null);
  const [lineHeight, setLineHeight] = useState(22);
  const storageKey = `fileInputPanel-${title.replace(/\s+/g, '-').toLowerCase()}`;

  // Create extensions once (no useMemo needed since we only create them once anyway)
  const breakpointExtRef = React.useRef(null);
  const highlightExtRef = React.useRef(null);

  if (!breakpointExtRef.current) {
    breakpointExtRef.current = createBreakpointExtension(storageKey);
  }
  if (!highlightExtRef.current) {
    highlightExtRef.current = createLineHighlightExtension();
  }

  const breakpointExt = breakpointExtRef.current;
  const highlightExt = highlightExtRef.current;

  // Expose highlightLine method to parent
  useImperativeHandle(ref, () => ({
    highlightLine: (lineNum) => {
      if (editor && highlightExt[1]) {
        highlightExt[1].highlightLine(editor, lineNum);
      }
    }
  }), [editor, highlightExt]);

  // Initialize editor only once
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const saved = localStorage.getItem(storageKey) || value || '\u200B'; // zero-width space

    const state = EditorState.create({
      doc: saved,
      extensions: [
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        getLang(title),
        oneDark,
        EditorView.lineWrapping,
        // Gutter order: line numbers first, breakpoint column second
        lineNumbers(),
        breakpointExt[0],
        breakpointExt[1],
        highlightExt[0],
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            let val = update.state.doc.toString();
            if (val === '\u200B') val = ''; // strip ZWSP
            onChange({ target: { value: val } });
          }
        })
      ]
    });

    const view = new EditorView({ state, parent: editorContainerRef.current });
    setEditor(view);

    // Restore breakpoints from localStorage
    const savedBreakpoints = localStorage.getItem(`${storageKey}-breakpoints`);
    if (savedBreakpoints) {
      try {
        const positions = JSON.parse(savedBreakpoints);
        if (Array.isArray(positions) && positions.length > 0) {
          breakpointExt[2].setBreakpoints(view, positions);
        }
      } catch (e) {
        console.error('Failed to restore breakpoints:', e);
      }
    }

    return () => view.destroy(); // destroy only once on unmount
  }, []);

  // Calculate line height once when editor is ready
  useEffect(() => {
    if (!editor) return;
    const lineEl = editor.dom.querySelector('.cm-line');
    if (lineEl && lineEl.offsetHeight) {
      setLineHeight(lineEl.offsetHeight);
    }
  }, [editor]);

  // Apply max height when line height changes
  useEffect(() => {
    if (editorContainerRef.current) {
      editorContainerRef.current.style.maxHeight = `${lineHeight * 40}px`;
    }
  }, [lineHeight]);

  // Handlers
  const handleSave = () => {
    if (!editor) return;
    let val = editor.state.doc.toString();
    if (val === '\u200B') val = ''; // strip ZWSP
    localStorage.setItem(storageKey, val);
    const saveDate = new Date().toLocaleString();
    setActionInfo({ type: 'save', text: `Save text on ${saveDate}` });
  };

  const handleClear = () => {
    if (!editor) return;
    // Only clear localStorage, keep editor content
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}-breakpoints`);
    const date = new Date().toLocaleString();
    setActionInfo({ type: 'clear', text: `Clear save on ${date}` });
  };

  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file || !editor) return onFileUpload(e);

    const uploadDate = new Date().toLocaleString();
    setActionInfo({ type: 'upload', fileName: file.name, date: uploadDate });

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target.result || '\u200B';
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: content } });
    };
    reader.readAsText(file);
    onFileUpload(e);
  };

  return (
    <Box flex={1} display="flex" flexDirection="column">
      <VStack align="stretch" spacing={3} flex="1">
        <HStack justify="space-between" align="center" h="40px">
          <Heading size={{ base: 'md' }}>{title}</Heading>
          {actionInfo && (
            <Text fontSize="md" color="gray.700" fontStyle="italic">
              {actionInfo.type === 'upload' ? (
                <>
                  Upload{' '}
                  <Box as="span" bg="yellow.50" px={1} borderRadius="md">
                    {actionInfo.fileName}
                  </Box>{' '}
                  on {actionInfo.date}
                </>
              ) : (
                actionInfo.text
              )}
            </Text>
          )}
        </HStack>

        <Box
          ref={editorContainerRef}
          flex="1"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.300"
          bg="#282c34"
          overflow="auto"
          minHeight="360px"
          sx={{
            '.cm-gutters': { display: 'flex !important', flexDirection: 'row !important' },
            '.cm-scroller': { overflow: 'visible' },
            '.cm-breakpoint-gutter': {
              width: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            },
            '.cm-content': { fontSize: '14px' },
            '.cm-line': { fontSize: '14px' }      
          }}
        />

        <HStack justify="space-between" mt={2}>
          <Button colorScheme="blue" variant="outline" onClick={handleSave}>💾 Save</Button>
          <Button as="label" cursor="pointer" bg="green.100" _hover={{ bg: 'green.200' }}>
            Upload File
            <input type="file" hidden onChange={handleUpload} />
          </Button>
          <Button colorScheme="red" variant="outline" onClick={handleClear}>✕ Clear</Button>
        </HStack>
      </VStack>
    </Box>
  );
});

FileInputPanel.displayName = 'FileInputPanel';
export default FileInputPanel;