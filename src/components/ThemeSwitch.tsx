// ThemeSwitch.tsx
import React, { useContext, useEffect } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

const ThemeSwitch: React.FC = () => {
  // Access `theme` and `toggleTheme` safely
  const themeContext = useContext(ThemeContext);

  // Guard against undefined context
  if (!themeContext) {
    throw new Error("ThemeSwitch must be used within a ThemeProvider");
  }

  const { theme, toggleTheme } = themeContext;
  const isDarkMode = theme === 'dark';

  // Animation for sliding effect
  const animatedValue = React.useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isDarkMode ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isDarkMode]);
  
  const toggleSwitch = () => {
    Animated.timing(animatedValue, {
      toValue: isDarkMode ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    toggleTheme();
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24], 
  });

  return (
    <TouchableOpacity onPress={toggleSwitch} activeOpacity={0.7}>
      <View className="flex-row items-center w-12 h-6 rounded-full" style={{backgroundColor: theme === 'dark' ? '#101113' : 'white'}}>
        <Animated.View
          style={{
            transform: [{ translateX }],
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: isDarkMode ? '#333' : 'white',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isDarkMode ? (
            <Ionicons name="moon" size={12} color="white" />
          ) : (
            <Ionicons name="sunny" size={12} color="black" />
          )}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default ThemeSwitch;
