// root layout
import i18n from '../i18n';
import { Stack } from 'expo-router/stack';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useEffect, useState } from 'react';
import { initializeDatabase } from '../database/database';

function RootLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [language, setLanguage] = useState(i18n.language); // State to track the language change

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize the database
        await initializeDatabase();
        console.log('Database initialized successfully');

        // Set the initial language based on locale
        const locale = Localization.locale.split('-')[0];
        i18n.changeLanguage(locale === 'tr' ? 'tr' : 'en');
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    if (!isInitialized) {
      initializeApp();
    }

    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng); // Trigger re-render by setting the new language
    };

    i18n.on('languageChanged', handleLanguageChange);

    // Cleanup listener on component unmount
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [isInitialized]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme === 'dark' ? '#000' : '#e1dce7' },
        headerTitleStyle: { color: theme === 'dark' ? '#e1dce7' : '#000' },
      }}
    >
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false, title: t("home") }} 
      />
      <Stack.Screen 
        name="products" 
        options={{ title: t("products") }} 
      />
      <Stack.Screen
        name="import-list"
        options={{ title: t("importListScreen") }}
      />
    </Stack>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <RootLayout />
    </ThemeProvider>
  );
}
