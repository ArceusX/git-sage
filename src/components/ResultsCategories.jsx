import React, { useMemo } from 'react';
import { Box } from '@chakra-ui/react';

import CategorySection from './CategorySection';
import { DownloadHTMLCategories } from './';
import { categories } from '../config';

// Memoized CategorySection to prevent re-rendering when siblings update
const MemoizedCategorySection = React.memo(CategorySection);

const ResultsCategories = ({ analysis, onChangeClick, appName }) => {
  if (!analysis) return null;
  
  // OPTIMIZATION 7: Filter out empty categories to avoid rendering unused sections
  const activeCategories = useMemo(() => 
    categories.filter(({ key }) => analysis[key]?.length > 0),
    [analysis]
  );
  
  return (
    <Box my={8}>
      {/* Download button at the top */}
      <Box mb={6} display="flex" justifyContent="center">
        <DownloadHTMLCategories
          analysis={analysis}
          categories={categories}
          appName={appName}
        />
      </Box>

      <Box className="results-display-categories">
        {/* Only render those with changes */}
        {activeCategories.map(({ key, title, color, className }) => (
          <MemoizedCategorySection
            key={key}
            title={title}
            changes={analysis[key]}
            color={color}
            categoryKey={key}
            className={className}
            onChangeClick={onChangeClick}
          />
        ))}
      </Box>
      
    </Box>
  );
};

export default ResultsCategories;