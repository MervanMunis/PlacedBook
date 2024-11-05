// SearchBar.tsx

import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

type SearchBarProps = {
  onSearch: (text: string) => void;
};

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchText, setSearchText] = useState('');
  const { t } = useTranslation();
  const { theme } = useTheme();

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      onSearch(text);
    },
    [onSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchText('');
    onSearch('');
  }, [onSearch]);

  return (
    <View className="flex-row items-center p-3 rounded-full border" 
      style={{
        backgroundColor: theme === 'dark' ? '#181725' : '#F0F0F3',
        borderColor: theme === 'dark'
        ? '#43fbff'
        : '#006567'
      }}
    >
      {/* Search Icon */}
      <Ionicons name="search" size={24} color={theme === 'dark' ? '#ececec' : '#2a2a35'} className="mr-2" />

      {/* Search Input */}
      <TextInput
        value={searchText}
        onChangeText={handleSearchChange}
        placeholder={t("searchPlaceholder")}
        placeholderTextColor={theme === 'dark' ? '#ececec' : '#2a2a35'}
        className="flex-1 text-base px-2"
        style={{color: theme === 'dark' ? '#43fbff' : 'black'}}
      />

      {/* Clear Button */}
      {searchText.length > 0 && (
        <TouchableOpacity onPress={clearSearch} className="p-1">
          <Ionicons name="close-circle" size={24} color={theme === 'dark' ? '#ececec' : '#2a2a35'} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default React.memo(SearchBar);
