import { Box, Text } from '@chakra-ui/react';

const ChangeRenderers = {
  renderMovedBlock(change, index) {
    return (
      <Box key={index} p={3} bg="gray.50" borderRadius="md" fontSize="sm">
        <Text color="gray.600" mb={1}>
          Line {change.originalLine} → Line {change.changedLine}
        </Text>
        <Text fontFamily="monospace" whiteSpace="pre-wrap">
          {change.content}
        </Text>
      </Box>
    );
  },

  renderDeletion(change, index) {
    return (
      <Box key={index} p={3} bg="red.50" borderRadius="md" fontSize="sm">
        <Text color="gray.600" mb={1}>Line {change.lineNumber}</Text>
        <Text 
          fontFamily="monospace" 
          whiteSpace="pre-wrap"
          bg="red.200"
          textDecoration="line-through"
          p={1}
        >
          {change.content}
        </Text>
      </Box>
    );
  },

  renderAddition(change, index) {
    return (
      <Box key={index} p={3} bg="green.50" borderRadius="md" fontSize="sm">
        <Text color="gray.600" mb={1}>Line {change.lineNumber}</Text>
        <Text 
          fontFamily="monospace" 
          whiteSpace="pre-wrap"
          bg="green.200"
          p={1}
        >
          {change.content}
        </Text>
      </Box>
    );
  },

  renderModification(change, index) {
    return (
      <Box key={index} p={3} bg="gray.50" borderRadius="md" fontSize="sm">
        <Text color="gray.600" mb={1}>Line {change.lineNumber}</Text>
        <Text 
          fontFamily="monospace" 
          whiteSpace="pre-wrap"
          bg="red.200"
          textDecoration="line-through"
          p={1}
          mb={1}
        >
          {change.original}
        </Text>
        <Text 
          fontFamily="monospace" 
          whiteSpace="pre-wrap"
          bg="green.200"
          p={1}
        >
          {change.changed}
        </Text>
      </Box>
    );
  }
};

export default ChangeRenderers;