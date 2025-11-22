import React from 'react';
import {
  Box,
  Flex,
  Image,
  Text,
  Link,
  IconButton,
  VStack,
  HStack,
} from '@chakra-ui/react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

const ScrollToTopIcon = () => (
  <Box
    className="scroll-to-top-icon"
    borderWidth="2px"
    borderColor="currentColor"
    borderRadius="full"
    p={2}                  
    display="flex"
    alignItems="center"
    justifyContent="center"
    w="40px"
    h="40px"
  >
    <svg
      width="24"          
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 15 12 9 6 15" transform="scale(1.4) translate(-3,-3)"/>
    </svg>
  </Box>
);

const Footer = ({ appConfig }) => {
  const iconSize = appConfig.meta.iconSize ?? 36;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box 
      className="footer-container"
      bg="green.100" 
      color="black" 
      py={9} 
      px={6}
      mb={6}
    >
      <Flex
        className="footer-content"
        maxW="6xl"
        mx="auto"
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align="center"
        gap={6}
      >
        {/* Left Section */}
        <HStack className="footer-branding" spacing={3}>
          <Image
            className="footer-logo"
            src={appConfig.meta.icon}
            alt={appConfig.meta.appName}
            boxSize={`${iconSize}px`}
          />
          <Text className="footer-app-name" fontSize="xl" fontWeight="semibold">
            {appConfig.meta.appName}
          </Text>
        </HStack>

        {/* Middle Section */}
        <VStack className="footer-contact" spacing={1}>
          <Text className="footer-author">🧑‍💻 {appConfig.personal.author}</Text>
          <Link
            className="footer-email"
            href={`mailto:${appConfig.personal.email}`}
            color="blue.600"
            _hover={{ color: 'blue.400' }}
          >
            📧 {appConfig.personal.email}
          </Link>
        </VStack>

        {/* Right Section */}
        <HStack className="footer-actions" spacing={4}>
          {appConfig.personal.github && (
            <IconButton
              className="footer-github-button"
              as="a"
              href={appConfig.personal.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              icon={<FaGithub size={iconSize} />}
              variant="ghost"
              color="blue.600"
              _hover={{ color: 'blue.400' }}
            />
          )}
          {appConfig.personal.linkedin && (
            <IconButton
              className="footer-linkedin-button"
              as="a"
              href={appConfig.personal.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              icon={<FaLinkedin size={iconSize} />}
              variant="ghost"
              color="blue.600"
              _hover={{ color: 'blue.400' }}
            />
          )}
          <IconButton
            className="footer-scroll-top-button"
            onClick={scrollToTop}
            aria-label="Scroll to top"
            variant="ghost"
            color="red.500"
            _hover={{ color: 'red.400' }}
            icon={<ScrollToTopIcon />}
          />
        </HStack>
      </Flex>
    </Box>
  );
};

export default Footer;