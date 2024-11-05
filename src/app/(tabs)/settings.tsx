// /src/app/(tabs)/settings.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'es', label: 'Español' },
    { code: 'ar', label: 'العربية' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'it', label: 'Italiano' },
    { code: 'ja', label: '日本語' },
    { code: 'ku', label: 'Kurdî' },
    { code: 'ru', label: 'Русский' },
    { code: 'zh', label: '中文' },
  ];

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setModalVisible(false); // Close the modal after selection
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme === 'dark' ? '#000' : '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: theme === 'dark' ? '#FFF' : '#000', fontSize: 18, marginBottom: 20 }}>
        {t('selectLanguage')}
      </Text>
      
      <TouchableOpacity
        style={{
          padding: 10,
          backgroundColor: '#4169E1',
          borderRadius: 5,
        }}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: '#FFF' }}>{t('selectLanguage')}</Text>
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '80%',
              backgroundColor: theme === 'dark' ? '#333' : '#FFF',
              borderRadius: 10,
              padding: 20,
            }}
          >
            <Text style={{ fontSize: 18, marginBottom: 10, color: theme === 'dark' ? '#FFF' : '#000' }}>
              {t('selectLanguage')}
            </Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: theme === 'dark' ? '#555' : '#DDD',
                  }}
                  onPress={() => changeLanguage(item.code)}
                >
                  <Text style={{ fontSize: 16, color: theme === 'dark' ? '#FFF' : '#000' }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={{ marginTop: 20, alignSelf: 'center' }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: '#4169E1' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SettingsScreen;
