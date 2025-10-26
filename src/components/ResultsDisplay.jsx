import React from 'react';
import { Box } from '@chakra-ui/react';
import CategorySection from './CategorySection';

const ResultsDisplay = ({ analysis }) => {
  if (!analysis) return null;

  const categories = [
    { key: 'other', title: 'Other Changes', color: 'purple.500', type: 'other' },
    { key: 'updateComment', title: 'Update Comment', color: 'gray.500', type: 'updateComment' },
    { key: 'updateDefaultArgs', title: 'Update Default Arguments', color: 'blue.500', type: 'updateDefaultArgs' },
    { key: 'updateLiteral', title: 'Update Literal/Constant', color: 'cyan.500', type: 'updateLiteral' },
    { key: 'renameVariable', title: 'Rename Variable/Function', color: 'orange.500', type: 'renameVariable' },
    { key: 'encapsulateFunction', title: 'Encapsulate in Function', color: 'pink.500', type: 'encapsulateFunction' },
    { key: 'moveCodeBlock', title: 'Move Code Block', color: 'indigo.500', type: 'moveCodeBlock' },
    { key: 'deleteCode', title: 'Delete Code', color: 'red.500', type: 'deleteCode' },
    { key: 'addCode', title: 'Add Code', color: 'green.500', type: 'addCode' },
    { key: 'reorderStatements', title: 'Reorder Statements', color: 'yellow.500', type: 'reorderStatements' },
    { key: 'updateImport', title: 'Update Import/Dependency', color: 'teal.500', type: 'updateImport' }
  ];

  return (
    <Box>
      {categories.map(({ key, title, color, type }) => (
        <CategorySection
          key={key}
          title={title}
          changes={analysis[key]}
          color={color}
          type={type}
        />
      ))}
    </Box>
  );
};

export default ResultsDisplay;