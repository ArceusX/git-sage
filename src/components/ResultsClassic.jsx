import React, { useMemo, useEffect } from 'react';
import { Box, VStack, HStack, Text } from '@chakra-ui/react';
import { diffLines } from 'diff';
import { DownloadHTMLClassic } from './';

const ResultsClassic = ({ sourceText, changedText, onDiffGenerated, appName, logo }) => {
  
  const borderColor = 'gray.200';
  const sourceLineColor = 'yellow.50';
  const changedLineColor = 'purple.50';  

  // Use established diff algorithm (much faster and more accurate)
  const diffResult = useMemo(() => {
    if (!sourceText && !changedText) return [];

    const changes = diffLines(sourceText, changedText);
    const result = [];
    let sourceLineNum = 1;
    let changedLineNum = 1;
    
    changes.forEach(part => {
      const lines = part.value.split('\n');
      // Remove empty last line if exists
      if (lines[lines.length - 1] === '') lines.pop();
      
      lines.forEach(line => {
        if (part.added) {
          result.push({
            type: 'added',
            sourceLine: null,
            changedLine: changedLineNum++,
            content: line
          });
        } else if (part.removed) {
          result.push({
            type: 'deleted',
            sourceLine: sourceLineNum++,
            changedLine: null,
            content: line
          });
        } else {
          result.push({
            type: 'unchanged',
            sourceLine: sourceLineNum++,
            changedLine: changedLineNum++,
            content: line
          });
        }
      });
    });

    return result;
  }, [sourceText, changedText]);

  // Pass the diff result back to App for download
  useEffect(() => {
    if (onDiffGenerated && diffResult.length > 0) {
      onDiffGenerated(diffResult);
    }
  }, [diffResult, onDiffGenerated]);

  const stats = useMemo(() => {
    return diffResult.reduce((acc, line) => {
      const key = line.type === 'deleted' ? 'deletions' 
                : line.type === 'added' ? 'additions' 
                : 'unchanged';
      acc[key] += 1;
      return acc;
    }, { deletions: 0, additions: 0, unchanged: 0 });
  }, [diffResult]);

  if (!sourceText && !changedText) {
    return null;
  }

  return (
    <Box my={8}>
      {/* Download button at the top */}
      <Box display="flex" justifyContent="center" mb={6}>
        <DownloadHTMLClassic
          diffResult={diffResult}
          appName={appName}
        />
      </Box>

      <Box 
        className="results-display-classic"
        bg="white" 
        borderRadius="md" 
        border="1px solid" 
        borderColor="gray.300"
        overflow="hidden"
      >
        <Box 
          className="classic-diff-header"
          bg="blue.50" 
          px={4} 
          py={3} 
          borderBottom="1px solid" 
          borderColor="gray.300"
        >
          <HStack spacing={3} fontSize="md" ml="130px">
            <Text color="red.600" fontWeight="semibold">
              -{stats.deletions} Lines
            </Text>
            <Text color="green.600" fontWeight="semibold">
              +{stats.additions} Lines
            </Text>
            <Text color="purple.600" fontWeight="semibold">
              = {stats.unchanged} Lines
            </Text>
          </HStack>
        </Box>
        
        <VStack className="classic-diff-lines" spacing={0} align="stretch">
          {diffResult.map((line, index) => {
            const bgColor =
                line.type === 'deleted' ? 'red.100' 
              : line.type === 'added' 
              ? 'green.100' : 'white';

            return (
              <HStack
                key={index}
                className={`diff-line diff-line-${line.type}`}
                data-line-type={line.type}
                spacing={0}
                borderBottom="1px solid"
                borderColor={borderColor}
              >
                {/* Source line number */}
                <Box
                  className="line-number line-number-source"
                  minW="50px"
                  maxW="50px"
                  px={2}
                  py={1}
                  borderRight="1px solid"
                  borderColor={borderColor}
                  textAlign="right"
                  fontFamily="monospace"
                  fontSize="sm"
                  fontWeight="bold"
                  bg={line.type === "added" ? "white" : sourceLineColor}
                  color="black"
                  userSelect="none"
                >
                  {line.sourceLine || ''}
                </Box>

                {/* Changed line number */}
                <Box
                  className="line-number line-number-changed"
                  minW="50px"
                  maxW="50px"
                  px={2}
                  py={1}
                  borderRight="1px solid"
                  borderColor={borderColor}
                  textAlign="right"
                  fontFamily="monospace"
                  fontSize="sm"
                  fontWeight="bold"
                  bg={line.type === "deleted" ? "white" : changedLineColor}
                  userSelect="none"
                >
                  {line.changedLine || ''}
                </Box>

                {/* Line prefix indicator */}
                <Box
                  className={`line-prefix line-prefix-${line.type}`}
                  minW="30px"
                  maxW="30px"
                  px={2}
                  py={1}
                  fontFamily="monospace"
                  fontSize="sm"
                  fontWeight="bold"
                  color={line.type === 'deleted' ? 'red.600' : line.type === 'added' ? 'green.600' : 'black'}
                  userSelect="none"
                >
                  {line.type === 'deleted' ? '-' : line.type === 'added' ? '+' : ' '}
                </Box>

                {/* Line content */}
                <Box
                  className={`line-content line-content-${line.type}`}
                  flex="1"
                  px={2}
                  py={1}
                  fontFamily="monospace"
                  fontSize="sm"
                  bg={bgColor}
                  whiteSpace="pre"
                  overflow="auto"
                  color={line.type === 'deleted' ? 'red.800' : line.type === 'added' ? 'green.800' : 'black'}
                >
                  {line.content}
                </Box>
              </HStack>
            );
          })}
        </VStack>
      </Box>
    </Box>
  );
};

export default ResultsClassic;