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
import ChangeRenderers from './ChangeRenderers';

const CategorySection = ({ title, changes, color, type }) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  
  const renderChange = (change, index) => {
    switch (type) {
      case "moveCodeBlock":
        return ChangeRenderers.renderMovedBlock(change, index);
      case "deleteCode":
        return ChangeRenderers.renderDeletion(change, index);
      case "addCode":
        return ChangeRenderers.renderAddition(change, index);
      default:
        return ChangeRenderers.renderModification(change, index);
    }
  };
  
  if (!changes || changes.length === 0) return null;
  
  // Create a safe className from the title
  const categoryClassName = `category-${type}`;
  
  return (
    <Box 
      className={`category-section ${categoryClassName}`}
      mb={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      overflow="hidden"
      data-category={type}
      data-count={changes.length}
    >
      <Flex
        className={`category-header ${categoryClassName}-header`}
        bg={color}
        p={3}
        cursor="pointer"
        onClick={onToggle}
        align="center"
        justify="space-between"
        data-expanded={isOpen}
      >
        <HStack className="category-title-container">
          <Heading size="sm" color="white" className="category-title">
            {title}
          </Heading>
          <Badge 
            className="category-badge"
            colorScheme="whiteAlpha" 
            variant="solid"
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
          className={`category-content ${categoryClassName}-content`}
          align="stretch" 
          p={4} 
          spacing={3}
        >
          {changes.map((change, index) => (
            <Box 
              key={index}
              className={`change-item change-${type}-${index}`}
              data-change-index={index}
              data-line-number={change.lineNumber || change.originalLine || 'unknown'}
            >
              {renderChange(change, index)}
            </Box>
          ))}
        </VStack>
      </Collapse>
    </Box>
  );
};

export default CategorySection;