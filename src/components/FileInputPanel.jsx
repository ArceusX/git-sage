import React, { useRef, useMemo, useState } from 'react';
import { Box, VStack, Heading, Button, HStack, Text } from '@chakra-ui/react';

const FileInputPanel = ({ title, value, onChange, onFileUpload }) => {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [uploadInfo, setUploadInfo] = useState(null);
  const panelType = title.toLowerCase().includes('original') ? 'original' : 'changed';
  
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const lines = useMemo(() => {
    return value.split('\n');
  }, [value]);

  const handleTextChange = (e) => {
    onChange(e);
    // Clear upload info when user manually edits
    if (uploadInfo) {
      setUploadInfo(null);
    }
  };

  const handleFileUploadInternal = (e) => {
    const file = e.target.files[0];
    if (file) {
      const uploadDate = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setUploadInfo({
        fileName: file.name,
        date: uploadDate
      });
    }
    onFileUpload(e);
  };

  // Calculate height for exactly 20 rows
  const lineHeight = 1.5; // em
  const fontSize = 14; // px (sm in Chakra)
  const padding = 8; // px (p={2})
  const calculatedHeight = (lineHeight * fontSize * 20) + (padding * 2);

  return (
    <Box 
      className={`file-input-panel file-input-${panelType}`}
      flex={1} 
      display="flex" 
      flexDirection="column"
      data-panel-type={panelType}
    >
      <VStack 
        className="file-input-content"
        align="stretch" 
        spacing={3} 
        flex="1"
      >
        <HStack 
          className="file-input-header"
          justify="space-between" 
          align="center"
          h="50px"
        >
          <Heading
            className={`file-input-title file-input-title-${panelType}`}
            size={{ md: "sm", lg: "md" }}
          >
            {title}
          </Heading>
          <Text 
            className="file-upload-info"
            fontSize="md" 
            color="gray.600"
            fontStyle="italic"
          >
            {uploadInfo && (
              <>
                Uploaded{' '}
                <Text 
                  as="span" 
                  bg="red.50" 
                  px={1}
                  borderRadius="sm"
                  className="uploaded-filename"
                >
                  {uploadInfo.fileName}
                </Text>
                {' '}on {uploadInfo.date}
              </>
            )}
          </Text>
        </HStack>
        
        <Box
          className="file-input-editor-wrapper"
          position="relative"
          height={`${calculatedHeight}px`}
          display="flex"
          bg="white"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.300"
          overflow="hidden"
        >
          {/* Line numbers */}
          <Box
            ref={lineNumbersRef}
            className="line-numbers-column"
            bg="gray.50"
            borderRight="1px solid"
            borderColor="gray.300"
            overflow="hidden"
            fontFamily="monospace"
            fontSize="sm"
            lineHeight={lineHeight}
            color="gray.500"
            userSelect="none"
            minW="50px"
            maxW="50px"
            textAlign="right"
            pr={2}
            py={2}
          >
            {lines.map((line, index) => (
              <Box
                key={index}
                className={`line-number ${line.trim() === '' ? 'line-number-blank' : 'line-number-visible'}`}
                data-line={index + 1}
                height={`${lineHeight}em`}
              >
                {line.trim() !== '' ? index + 1 : ''}
              </Box>
            ))}
          </Box>

          {/* Textarea */}
          <Box
            as="textarea"
            ref={textareaRef}
            className={`file-input-textarea file-input-textarea-${panelType}`}
            value={value}
            onChange={handleTextChange}
            onScroll={handleScroll}
            placeholder={`Paste ${title.toLowerCase()} here...`}
            fontFamily="monospace"
            fontSize="sm"
            resize="none"
            flex="1"
            bg="transparent"
            border="none"
            outline="none"
            p={2}
            lineHeight={lineHeight}
            spellCheck="false"
            wrap="off"
            _focus={{ outline: 'none' }}
            sx={{
              '&::-webkit-scrollbar': {
                width: '12px',
                height: '12px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '6px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#555',
              },
            }}
          />
        </Box>

        <Button
          className={`file-upload-button file-upload-button-${panelType}`}
          as="label"
          variant="outline"
          cursor="pointer"
          bg="green.100"       
          color="black" 
          w="50%"
          minW="250px"              
          mx="auto"
          size="lg"
          _hover={{ bg: 'green.200' }}
        >
          Upload File
          <input
            type="file"
            hidden
            onChange={handleFileUploadInternal}
            className="file-upload-input"
          />
        </Button>
      </VStack>
    </Box>
  );
};

export default FileInputPanel;