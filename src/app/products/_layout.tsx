import { Stack } from 'expo-router/stack';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';

export default function ProductLayout() {
  const { theme } = useTheme();
  return (
    <Stack>
      <Stack.Screen 
        name="[listName]"
        options={{ 
          headerShown: false, 
          headerStyle: {
            backgroundColor: theme === 'dark' ? '#000' : '#e1dce7',
          }, 
        }} 
      />
    </Stack>
  );
}
