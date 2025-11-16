import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Badge,
  Collapse,
  useDisclosure
} from "@chakra-ui/react";
import { MdArrowDropDown, MdArrowDropUp } from 'react-icons/md';

import { ChangeRenderers } from './';

const CategorySection = ({ title, changes, color, categoryKey, className, onChangeClick }) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });
  
  const renderChange = useCallback((change, index) => {
    switch (categoryKey) {
      case "moveCodeBlock":
        return ChangeRenderers.renderMove(change, index);
        
      case "deleteCode":
        return ChangeRenderers.renderDelete(change, index);
        
      case "addCode":
        return ChangeRenderers.renderAdd(change, index);

      case 'replaceCode':
      case "updateTryCatch":
        return ChangeRenderers.renderReplace(change, index);

      default:
        return ChangeRenderers.renderUpdate(change, index);
    }
  }, [categoryKey]);
  
  const handleChangeClick = useCallback((change) => {
    if (onChangeClick) {
      // Handle different property names that might exist on change object
      const sourceLineNumber = change.lineNumber || change.sourceLine;
      const changedLineNumber = change.changedLineNumber || change.changedLine || sourceLineNumber;
      
      onChangeClick({
        sourceLineNumber,
        changedLineNumber
      });
    }
  }, [onChangeClick]);
  
  if (!changes || changes.length === 0) return null;
  
  // Memoize the entire changes list to prevent re-rendering all items
  const changeItems = useMemo(() => 
    changes.map((change, index) => (
      <Box 
        key={index}
        className={`change-item change-${categoryKey}-${index}`}
        data-change-index={index}
        data-line-number={change.lineNumber || 'unknown'}
        onClick={() => handleChangeClick(change)}
        cursor="pointer"
        _hover={{ bg: 'gray.50' }}
        borderRadius="md"
        transition="background-color 0.2s"
      >
        {renderChange(change, index)}
      </Box>
    )),
    [changes, categoryKey, handleChangeClick, renderChange]
  );
  
  return (
    <Box 
      className={`category-section ${className}`}
      mb={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      overflow="hidden"
      data-category={categoryKey}
      data-count={changes.length}
    >
      <Flex
        className={`category-header ${className}-header`}
        bg={color}
        p={3}
        cursor="pointer"
        onClick={onToggle}
        align="center"
        justify="space-between"
        data-expanded={isOpen}
      >
        <HStack className="category-title-container" spacing={3}>
          <Heading size="sm" color="white" className="category-title">
            {title}
          </Heading>
          <Badge 
            className="category-badge"
            colorScheme="blackAlpha" 
            variant="solid"
            fontSize="md"
          >
            {changes.length}
          </Badge>
        </HStack>
        {isOpen ? (
          <MdArrowDropUp size={24} color="white" className="category-icon-collapse" />
        ) : (
          <MdArrowDropDown size={24} color="white" className="category-icon-expand" />
        )}
      </Flex>
      <Collapse in={isOpen}>
        <VStack 
          className={`category-content ${className}-content`}
          align="stretch" 
          p={4} 
          spacing={3}
        >
          {changeItems}
        </VStack>
      </Collapse>
    </Box>
  );
};

export default CategorySection;