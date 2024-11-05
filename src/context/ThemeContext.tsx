// src/context/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Appearance, View, useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(colorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    // Load the theme from AsyncStorage on initialization
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('theme');
        if (storedTheme) {
          setTheme(storedTheme as Theme);
        } else {
          // If no theme is stored, use system preference as the initial theme
          setTheme(colorScheme === 'dark' ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Failed to load theme from AsyncStorage:', error);
      }
    };

    loadTheme();
  }, [colorScheme]);

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme); // Save the theme to AsyncStorage
    } catch (error) {
      console.error('Failed to save theme to AsyncStorage:', error);
    }
  };

  // Use inline style instead of NativeWind className for debugging
  const backgroundColor = theme === 'dark' ? '#000' : '#FFF';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <View style={{ flex: 1, backgroundColor }}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

// Export ThemeContext and a custom hook for accessing the theme
export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export { ThemeContext };
