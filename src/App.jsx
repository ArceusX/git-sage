import React, { useState } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  HStack,
  Heading,
  Button,
  Flex,
} from '@chakra-ui/react';
import FileInputPanel from './components/FileInputPanel.jsx';
import ResultsDisplay from './components/ResultsDisplay.jsx';
import DiffAnalyzer from './utils/DiffAnalyzer.js'; // adjust path if needed

const App = () => {
  const [originalText, setOriginalText] = useState('');
  const [changedText, setChangedText] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleFileUpload = (setter) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setter(event.target.result);
      reader.readAsText(file);
    }
  };

  const handleCompare = () => {
    const result = DiffAnalyzer.analyze(originalText, changedText);
    setAnalysis(result);
  };

  return (
    <ChakraProvider>
      <Box minH="100vh" w="100vw" bg="#F9FAFA" py={6}>
      <VStack
        spacing={6}
        align="stretch"
        w={['90%', null, '80%']} // base=90%, md and above=80%
        mx="auto"
      >
          <Heading textAlign="center" color="teal.600">
            Better Git - Smart Diff Tool
          </Heading>

          {/* Make the HStack fill the full width */}
          <HStack align="start" spacing={6} w="100%">
            {/* Make each FileInputPanel flex-grow */}
            <Box flex="1">
              <FileInputPanel
                title="Original Text"
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                onFileUpload={handleFileUpload(setOriginalText)}
              />
            </Box>
            <Box flex="1">
              <FileInputPanel
                title="Changed Text"
                value={changedText}
                onChange={(e) => setChangedText(e.target.value)}
                onFileUpload={handleFileUpload(setChangedText)}
              />
            </Box>
          </HStack>

          <Flex justify="center">
            <Button
              size="lg"
              w="400px"
              bg="blue.100"   
              color="black"
              _hover={{ bg: "blue.200" }}
              onClick={handleCompare}
            >
              Compare
            </Button>
          </Flex>
          <Box w="100%">
            <ResultsDisplay analysis={analysis} />
          </Box>
        </VStack>
      </Box>
    </ChakraProvider>
  );
};

export default App;