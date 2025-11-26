// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Store original resolveRequest
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  resolveRequest: (context, realModuleName, platform, moduleName) => {
    // Only handle web platform
    if (platform === 'web') {
      const callingFile = context?.originModulePath;
      
      // Check if this is a React Native internal module import
      const isReactNativeInternal = callingFile && 
        (callingFile.includes('node_modules/react-native') || callingFile.includes('react-native\\')) && 
        !callingFile.includes('react-native-web');
      
      // Handle Platform utility specifically - this one we DO need
      if (realModuleName.includes('Utilities/Platform') && 
          !realModuleName.includes('react-native-web')) {
        try {
          return {
            type: 'sourceFile',
            filePath: require.resolve('react-native-web/dist/exports/Platform'),
          };
        } catch (e) {
          // Continue to default
        }
      }
      
      // For ALL relative imports from React Native internal files, return empty
      // These are internal modules that don't exist in react-native-web
      // react-native-web provides its own implementations of public APIs
      if ((realModuleName.startsWith('./') || realModuleName.startsWith('../')) && isReactNativeInternal) {
        return { type: 'empty' };
      }
      
      // Also catch absolute imports to React Native internal modules
      // These are native-specific modules not available on web
      if (isReactNativeInternal) {
        // Patterns that indicate internal/native modules
        const internalPatterns = [
          'RCT',           // Native bridge modules
          'Native',        // Native modules
          'Turbo',         // Turbo modules
          'DevTools',      // Dev tools
          'PlatformColor', // Platform colors
          'BaseViewConfig', // View configs
          'ViewConfig',    // View configs
          'AccessibilityInfo', // Accessibility
          'legacySendAccessibilityEvent', // Accessibility
        ];
        
        if (internalPatterns.some(pattern => realModuleName.includes(pattern))) {
          return { type: 'empty' };
        }
      }
    }
    
    // Use default resolution for everything else
    if (originalResolveRequest) {
      return originalResolveRequest(context, realModuleName, platform, moduleName);
    }
    return context.resolveRequest(context, realModuleName, platform, moduleName);
  },
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    'react-native': require.resolve('react-native-web'),
  },
};

module.exports = config;
