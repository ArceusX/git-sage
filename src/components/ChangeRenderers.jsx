import React from 'react';
import { Box, Text } from '@chakra-ui/react';

// Memoized renderer components
const MoveRenderer = React.memo(({ change, index }) => {
  const countLabel = change.blockSize > 1 ? ` (${change.blockSize})` : '';
  
  return (
    <Box key={index} p={3} bg="orange.50" borderRadius="md" fontSize="sm">
      <Text color="black" className="change-line-info" fontSize="md">
        Lines {change.sourceLine}-{change.sourceLine + change.blockSize - 1} → Lines {change.changedLine}-{change.changedLine + change.blockSize - 1}
        {countLabel}  
      </Text>
      <Text fontFamily="monospace" whiteSpace="pre-wrap" bg="blue.50" mt={2} p={2}>
        {change.content}
      </Text>
    </Box>
  );
});
MoveRenderer.displayName = 'MoveRenderer';

const DeleteRenderer = React.memo(({ change, index }) => {
  const isSingleLine = change.lineNumber === change.endLineNumber;
  const lineLabel = isSingleLine 
    ? `Line ${change.lineNumber}` 
    : `Lines ${change.lineNumber}-${change.endLineNumber}`;
  const totalLines = (change.lines || []).length;
  const countLabel = totalLines > 1 ? ` (${totalLines})` : '';
  
  return (
    <Box key={index} p={3} bg="purple.50" borderRadius="md" fontSize="sm">
      <Text color="black" mb={1} className="change-line-info" fontSize="md">
        {lineLabel} {countLabel}  
      </Text>
      <Box
        fontFamily="monospace"
        whiteSpace="pre-wrap"
        bg="red.100"
        p={2}
      >
        {change.lines.join('\n')}
      </Box>
    </Box>
  );
});
DeleteRenderer.displayName = 'DeleteRenderer';

const AddRenderer = React.memo(({ change, index }) => {
  const isSingleLine = change.lineNumber === change.endLineNumber;
  const lineLabel = isSingleLine 
    ? `Line ${change.lineNumber}` 
    : `Lines ${change.lineNumber}-${change.endLineNumber}`;
  const totalLines = (change.lines || []).length;
  const countLabel = totalLines > 1 ? ` (${totalLines})` : '';
  
  return (
    <Box key={index} p={3} bg="blue.50" borderRadius="md" fontSize="sm">
      <Text color="black" mb={1} className="change-line-info" fontSize="md">
        {lineLabel} {countLabel}
      </Text>
      <Box
        fontFamily="monospace"
        whiteSpace="pre-wrap"
        bg="green.100"
        p={2}
      >
        {change.lines.join('\n')}
      </Box>
    </Box>
  );
});
AddRenderer.displayName = 'AddRenderer';

const ReplaceRenderer = React.memo(({ change, index }) => {
  const del = change.deletedBlock;
  const add = change.addedBlock;

  const delLineLabel =
    del.lineNumber === del.endLineNumber
      ? `Line ${del.lineNumber}`
      : `Lines ${del.lineNumber}-${del.endLineNumber}`;

  const addLineLabel =
    add.lineNumber === add.endLineNumber
      ? `Line ${add.lineNumber}`
      : `Lines ${add.lineNumber}-${add.endLineNumber}`;

  const lineInfo =
    delLineLabel === addLineLabel
      ? delLineLabel
      : `${delLineLabel} → ${addLineLabel} `;

  const na = add.substantiveCount || add.lines.length;
  const nd = del.substantiveCount || del.lines.length;

  return (
    <Box key={index} p={3} bg="yellow.50" borderRadius="md" fontSize="sm">
      <Text color="black" mb={2} className="change-line-info" fontSize="md">
        {lineInfo}
      </Text>

      <Box mb={3}>
        <Text fontWeight="bold" color="red.700" mb={2} fontSize="md">
          - Deleted ({nd} line{nd === 1 ? "" : "s"})
        </Text>
        <Box
          fontFamily="monospace"
          whiteSpace="pre-wrap"
          bg="red.100"
          p={2}
          borderRadius="sm"
        >
          {del.lines.join('\n')}
        </Box>
      </Box>

      <Box>
        <Text fontWeight="bold" color="green.700" mb={2} fontSize="md">
          + Added ({na} line{na === 1 ? "" : "s"})
        </Text>
        <Box
          fontFamily="monospace"
          whiteSpace="pre-wrap"
          bg="green.100"
          p={2}
          borderRadius="sm"
        >
          {add.lines.join('\n')}
        </Box>
      </Box>
    </Box>
  );
});
ReplaceRenderer.displayName = 'ReplaceRenderer';

const UpdateRenderer = React.memo(({ change, index }) => {
  const isMergedBlock = Array.isArray(change.sourceLines) && Array.isArray(change.changedLines);
  
  if (isMergedBlock) {
    const isSingleLineSource = change.lineNumber === change.endLineNumber;
    const isSingleLineChanged = change.changedLineNumber === change.changedEndLineNumber;
    
    const sourceLineLabel = isSingleLineSource 
      ? `Line ${change.lineNumber}` 
      : `Lines ${change.lineNumber}-${change.endLineNumber}`;
    
    const changedLineLabel = isSingleLineChanged
      ? `Line ${change.changedLineNumber}`
      : `Lines ${change.changedLineNumber}-${change.changedEndLineNumber}`;
    
    const lineInfo = sourceLineLabel === changedLineLabel
      ? sourceLineLabel
      : `${sourceLineLabel} → ${changedLineLabel} `;
    
    return (
      <Box key={index} p={3} bg="gray.50" borderRadius="md" fontSize="sm">
        <Text color="black" mb={1} className="change-line-info" fontSize="md">
          {lineInfo}
        </Text>
        <Text 
          fontFamily="monospace" 
          whiteSpace="pre-wrap"
          bg="red.100"
          p={2}
          mb={1}
        >
          {change.sourceLines.join('\n')}
        </Text>
        <Text 
          fontFamily="monospace" 
          whiteSpace="pre-wrap"
          bg="green.100"
          p={2}
        >
          {change.changedLines.join('\n')}
        </Text>
      </Box>
    );
  } else {
    const sourceLineLabel = `Line ${change.lineNumber}`;
    const changedLineLabel = change.changedLineNumber 
      ? `Line ${change.changedLineNumber}`
      : sourceLineLabel;
    
    const lineInfo = sourceLineLabel === changedLineLabel
      ? sourceLineLabel
      : `${sourceLineLabel} → ${changedLineLabel} `;
    
    return (
      <Box key={index} p={3} bg="gray.50" borderRadius="md" fontSize="sm">
        <Text color="black" mb={1} className="change-line-info" fontSize="md">
          {lineInfo}
        </Text>
        <Text 
          fontFamily="monospace" 
          whiteSpace="pre-wrap"
          bg="red.100"
          p={1}
          mb={1}
        >
          {change.source}
        </Text>
        <Text 
          fontFamily="monospace" 
          whiteSpace="pre-wrap"
          bg="green.100"
          p={1}
        >
          {change.changed}
        </Text>
      </Box>
    );
  }
});
UpdateRenderer.displayName = 'UpdateRenderer';

const ChangeRenderers = {
  renderMove(change, index) {
    return <MoveRenderer change={change} index={index} />;
  },

  renderDelete(change, index) {
    return <DeleteRenderer change={change} index={index} />;
  },

  renderAdd(change, index) {
    return <AddRenderer change={change} index={index} />;
  },

  renderReplace(change, index) {
    return <ReplaceRenderer change={change} index={index} />;
  },

  renderUpdate(change, index) {
    return <UpdateRenderer change={change} index={index} />;
  },
};

export default ChangeRenderers;