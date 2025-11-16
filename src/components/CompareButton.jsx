import { Box, Button, Flex, Text, HStack } from "@chakra-ui/react";

const CompareButton = ({ onCompare }) => {
  return (
    <Flex className="compare-button-container" justify="center" gap={8}>
      <Button
        size="md"
        leftIcon={<Text as="span" fontSize="lg">✓</Text>}
        colorScheme="cyan"
        w={240}
        onClick={onCompare}
      >
        Compare
      </Button>
    </Flex>
  );
};

export default CompareButton;