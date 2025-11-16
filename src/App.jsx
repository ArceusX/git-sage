import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChakraProvider,
  Box,
  VStack,
  Stack,
  Heading,
  Button,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Image,
} from '@chakra-ui/react';
import { 
  FileInputPanel, 
  ResultsCategories, 
  ResultsClassic, 
  CompareButton,
  DownloadHTMLCategories,
  DownloadHTMLClassic,
  HelpHeader,
  Footer,
} from './components';
import { categories } from './config';
import { DiffAnalyzer } from './utils';
import { subtitle, helpText, appConfig} from './config/app.config';

const logo = '/categories.png';

// Memoized components to prevent unnecessary re-renders
const MemoizedFileInputPanel = React.memo(FileInputPanel);
const MemoizedResultsCategories = React.memo(ResultsCategories);
const MemoizedResultsClassic = React.memo(ResultsClassic);

const App = ({appName = "Git Sage - Smart Diff Tool"}) => {
  const [sourceText, setSourceText] = useState('');
  const [changedText, setChangedText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [classicDiff, setClassicDiff] = useState(null);
  const [resultsWindow, setResultsWindow] = useState(null);
  const [portalRoot, setPortalRoot] = useState(null);
  
  // Refs for FileInputPanel components
  const sourceTextRef = useRef(null);
  const changedTextRef = useRef(null);

  // Memoized file upload handler factory
  const handleFileUpload = useCallback((setter) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setter(event.target.result);
      reader.readAsText(file);
    }
  }, []);

  // Memoized individual handlers
  const handleSourceFileUpload = useMemo(() => handleFileUpload(setSourceText), [handleFileUpload]);
  const handleChangedFileUpload = useMemo(() => handleFileUpload(setChangedText), [handleFileUpload]);

  // Memoized compare handler
  const handleCompare = useCallback(() => {
    const result = DiffAnalyzer.analyze(sourceText, changedText);
    setAnalysis(result);
  }, [sourceText, changedText]);

  // Memoized change click handler
  const handleChangeClick = useCallback(({ sourceLineNumber, changedLineNumber }) => {
    if (sourceTextRef.current) {
      sourceTextRef.current.scrollToLine(sourceLineNumber);
    }
    if (changedTextRef.current) {
      changedTextRef.current.scrollToLine(changedLineNumber);
    }
    
    // Scroll the page to show the file input panels
    const sourcePanel = document.querySelector('.file-input-panel.source-text');
    if (sourcePanel) {
      sourcePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const openResultsWindow = useCallback(() => {
    // Close existing window if open
    if (resultsWindow && !resultsWindow.closed) {
      resultsWindow.close();
    }

    const newWindow = window.open('', 'Results', 'width=1200,height=800,left=100,top=100');
    
    if (newWindow) {
      // Get all stylesheets from the main document
      const stylesheets = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            if (sheet.href) {
              return `<link rel="stylesheet" href="${sheet.href}">`;
            } else if (sheet.ownerNode) {
              return `<style>${Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n')}</style>`;
            }
          } catch (e) {
            // Cross-origin stylesheets can't be accessed
            if (sheet.href) {
              return `<link rel="stylesheet" href="${sheet.href}">`;
            }
          }
          return '';
        })
        .join('\n');

      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${appName} - Results</title>
            <meta charset="UTF-8">
            ${stylesheets}
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                background-color: #F9FAFA;
              }
              #root {
                width: 100%;
                height: 100%;
              }
            </style>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `);
      newWindow.document.close();
      
      const root = newWindow.document.getElementById('root');
      setPortalRoot(root);
      setResultsWindow(newWindow);

      // Handle window close
      newWindow.addEventListener('beforeunload', () => {
        setResultsWindow(null);
        setPortalRoot(null);
      });
    }
  }, [resultsWindow, appName]);

  const closeResultsWindow = useCallback(() => {
    if (resultsWindow && !resultsWindow.closed) {
      resultsWindow.close();
    }
    setResultsWindow(null);
    setPortalRoot(null);
  }, [resultsWindow]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (resultsWindow && !resultsWindow.closed) {
        resultsWindow.close();
      }
    };
  }, [resultsWindow]);

  // Memoize results content
  const resultsContent = useMemo(() => {
    if (!analysis) return null;
    
    return (
      <Tabs colorScheme="teal">
        <TabList display="flex">
          <Tab flex="1">Categories View</Tab>
          <Tab flex="1">Classic View</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <MemoizedResultsCategories 
              analysis={analysis} 
              onChangeClick={handleChangeClick}
              appName={appName}
            />
          </TabPanel>
          <TabPanel>
            <MemoizedResultsClassic 
              sourceText={sourceText} 
              changedText={changedText}
              onDiffGenerated={setClassicDiff}
              appName={appName}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    );
  }, [analysis, handleChangeClick, appName, sourceText, changedText]);

  return (
    <ChakraProvider>
      <Box className="app-container" minH="100vh" w="98vw" bg="#F9FAFA" py={6}>
        <VStack
          className="app-content"
          spacing={6}
          align="stretch"
          w={{ base: '92%', md: '88%', "2xl": '80%'}}
          mx="auto"
        >

          <Stack className="app-heading" 
            direction="row" justify="center" align="center" spacing={4}>
            <Image src={logo} width="60px" height="60px" alt="App Logo" />
            <Heading color="teal.600" fontSize="2xl">
              {appName}
            </Heading>
          </Stack>

          <HelpHeader
            subtitle={subtitle}
            helpText={helpText}
          />
          <Stack
            className="file-inputs"
            direction={{ base: "column", lg: "row" }}
            spacing={6}
            w="100%"
            align="start"
          >
            <Box w={{ base: "100%", lg: "50%" }}>
              <MemoizedFileInputPanel
                ref={sourceTextRef}
                title="Source Text"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                onFileUpload={handleSourceFileUpload}
                panelType="source"
              />
            </Box>
            <Box w={{ base: "100%", lg: "50%" }}>
              <MemoizedFileInputPanel
                ref={changedTextRef}
                title="Changed Text"
                value={changedText}
                onChange={(e) => setChangedText(e.target.value)}
                onFileUpload={handleChangedFileUpload}
                panelType="changed"
              />
            </Box>
          </Stack>

          <Flex className="compare-button-wrapper" justify="center">
            <CompareButton onCompare={handleCompare} />
          </Flex>
          
          {/* Open in New Window button - only on desktop */}
          {analysis && (
            <Flex gap={4} justify="center" wrap="wrap">
              <Box display={{ base: 'none', md: 'block' }}>
                {resultsWindow && !resultsWindow.closed ? (
                  <Button colorScheme="red" onClick={closeResultsWindow} w={240}>
                    Close Results Window
                  </Button>
                ) : (
                  <Button onClick={openResultsWindow} colorScheme="pink" w={240}>
                    Open in New Window
                  </Button>
                )}
              </Box>
            </Flex>
          )}

          {/* Results display - either in main window or hidden when in portal */}
          <Box className="results-display" w="100%" mt={4}>
            {!portalRoot && resultsContent}
          </Box>
        </VStack>
      </Box>

      {/* Portal to render results in popup window */}
      {portalRoot && resultsWindow && !resultsWindow.closed && 
        createPortal(
          <ChakraProvider>
            <Box p={4} bg="#F9FAFA" minH="100vh">
              <Heading size="lg" mb={4} color="teal.600">
                {appName} - Results
              </Heading>
              {resultsContent}
            </Box>
          </ChakraProvider>,
          portalRoot
        )
      }
      <Footer appConfig={appConfig} />
    </ChakraProvider>
  );
};

export default App;