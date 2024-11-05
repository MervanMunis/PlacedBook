import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import "../../../global.css";
import { useTranslation } from 'react-i18next';
import ThemeSwitch from '../../components/ThemeSwitch';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false, 
        headerStyle: { 
          backgroundColor: theme === 'dark' ? '#000' : '#F0F0F3' 
        },
        headerTitleStyle: { color: theme === 'dark' ? '#e1dce7' : '#000' },
        tabBarStyle: {
          height: 80,
          borderRadius: 56,
          backgroundColor: theme === 'dark' ? '#101113' : '#f4f5fb',
          paddingBottom: 10,
          paddingTop: 10,
          position: 'absolute',
          bottom: 2,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: '#4169E1',
        tabBarInactiveTintColor: '#d3d3e3',
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIconStyle: { marginBottom: 12 },
          headerLeft: () => (
            <View className='ml-4'>
              <ThemeSwitch />
            </View>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? '#e6e0ff' : 'transparent',
                padding: 10,
                borderRadius: 30,
              }}
            >
              <FontAwesome
                size={28}
                name="home"
                color={color}
                style={focused ? { shadowColor: '#7a4dff', shadowRadius: 10, shadowOpacity: 0.5 } : {}}
              />
            </View>
          ),
        }}
      />

      {/* Search Tab, placed to the right of Home */}
      <Tabs.Screen
        name="search-screen"
        options={{
          title: t('searchScreen'),
          tabBarIconStyle: { marginBottom: 12 },
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? '#e6e0ff' : 'transparent',
                padding: 10,
                borderRadius: 30,
              }}
            >
              <FontAwesome
                size={28}
                name="search"
                color={color}
                style={focused ? { shadowColor: '#7a4dff', shadowRadius: 10, shadowOpacity: 0.5 } : {}}
              />
            </View>
          ),
        }}
      />

      {/* Add Product Tab, centered and elevated */}
      <Tabs.Screen
        name="add-product"
        options={{
          title: t('addProduct'),
          tabBarIconStyle: { marginBottom: 12 },
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? '#e6e0ff' : 'transparent',
                padding: 4,
                borderRadius: 30,
                position: 'absolute',
                bottom: 0, // adjust to elevate the icon
                zIndex: 1, // bring icon to the front
              }}
            >
              <FontAwesome
                size={60}
                name="plus-circle"
                color={color}
                style={focused ? { shadowColor: '#7a4dff', shadowRadius: 10, shadowOpacity: 0.5 } : {}}
              />
            </View>
          ),
        }}
      />

      {/* Favorites Tab */}
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("favorites"),
          tabBarIconStyle: { marginBottom: 12 },
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? '#e6e0ff' : 'transparent',
                padding: 10,
                borderRadius: 30,
              }}
            >
              <FontAwesome
                size={28}
                name="heart"
                color={color}
                style={focused ? { shadowColor: '#7a4dff', shadowRadius: 10, shadowOpacity: 0.5 } : {}}
              />
            </View>
          ),
        }}
      />

      {/* Settings Tab */}
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIconStyle: { marginBottom: 12 },
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? '#e6e0ff' : 'transparent',
                padding: 10,
                borderRadius: 30,
              }}
            >
              <FontAwesome
                size={28}
                name="cog"
                color={color}
                style={focused ? { shadowColor: '#7a4dff', shadowRadius: 10, shadowOpacity: 0.5 } : {}}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
