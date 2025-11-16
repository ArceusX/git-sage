import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Text,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
} from '@chakra-ui/react';

const HelpHeader = React.memo(({ subtitle, helpText }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Memoized function to parse text and highlight content in backticks
  const parseText = useCallback((text) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <Box
            key={i}
            as="span"
            bg="yellow.100"
            px={1}
            py={0.5}
            borderRadius="sm"
            fontFamily="mono"
            fontSize="sm"
            className="help-code-highlight"
          >
            {part.slice(1, -1)}
          </Box>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, []);

  // Memoize the entire parsed help content
  const parsedHelpContent = useMemo(() => {
    return Object.entries(helpText).map(([section, lines]) => ({
      section,
      lines: lines.map((line) => parseText(line))
    }));
  }, [helpText, parseText]);

  // Memoize tab list
  const tabList = useMemo(() => {
    return Object.keys(helpText).map((section) => (
      <Tab key={section} fontWeight="medium">{section}</Tab>
    ));
  }, [helpText]);

  return (
    <Box
      mx="auto"  
      w="100%" 
      maxW={1000}
      textAlign="center"
      className="help-header-container"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      p={4}
      boxShadow="md"
      bg="white"
    >
      <Box className="subtitle-container" display="flex" alignItems="center" gap={4} flexWrap="wrap">
        <Text className="help-subtitle"
          fontSize="lg" color="green" fontStyle="italic" flex="1">
          {subtitle}
        </Text>
        <Button onClick={onOpen} colorScheme="cyan" size="md" className="help-button">
          Help
        </Button>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent
          maxW="800px"
          w="90%"
          maxH="70vh"
          overflowY="auto"
          display="flex"
          flexDirection="column"
        >
          <ModalHeader fontSize="2xl" textAlign="center" pb={2}>Help</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Tabs colorScheme="blue" variant="enclosed">
              <TabList>
                {tabList}
              </TabList>

              <TabPanels>
                {parsedHelpContent.map(({ section, lines }) => (
                  <TabPanel key={section} pt={6}>
                    <VStack align="stretch" spacing={lines.length >= 10 ? 4 : 6}>
                      {lines.map((parsedLine, idx) => (
                        <Text key={idx} fontSize="md" lineHeight="tall">
                          {parsedLine}
                        </Text>
                      ))}
                    </VStack>
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
});

HelpHeader.displayName = 'HelpHeader';

export default HelpHeader;