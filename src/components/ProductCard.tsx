// ProductCard.tsx
import React from 'react';
import { View, Image, Text, TouchableOpacity } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import "../../global.css";
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

type ProductCardProps = {
  imageUrl?: string;
  name: string;
  placeName: string;
  listName: string;
  city?: string;
  country?: string;
  price?: string;
  date?: Date;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLocationPress: () => void;
  location?: { latitude: number; longitude: number };
};

// Helper function to format the date to DD.MM.YYYY
const formatDate = (date?: Date): string => {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const ProductCard: React.FC<ProductCardProps> = ({
  imageUrl,
  name,
  placeName,
  listName,
  city,
  country,
  price,
  date,
  isFavorite,
  location,
  onToggleFavorite,
  onLocationPress,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Define color variables for better readability
  const textColor = theme === 'dark' ? '#FFF' : '#000'; // Black text in light mode
  const backgroundColor = theme === 'dark' ? '#000' : '#f4f4f4';
  const iconColor = isFavorite ? 'red' : 'gray';

  return (
    <View
      className="flex-row p-4 rounded-lg border"
      style={{ backgroundColor: backgroundColor, borderColor: theme === 'dark' ? '#43fbff' : '#006567' }}
    >
      <Image
        source={{ uri: imageUrl || 'https://via.placeholder.com/100' }}
        className="w-24 h-24 rounded-md mr-4"
        resizeMode="cover"
      />
      <View className="flex-1 justify-between text-base">
        <View className="flex-row items-center justify-between">
          <Text
            className="text-base font-bold mr-1"
            numberOfLines={1}
            style={{ color: textColor }}
          >
            {name}
          </Text>

          {/* Favorite Icon */}
          <TouchableOpacity onPress={onToggleFavorite}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={iconColor} />
          </TouchableOpacity>
        </View>

        <Text
          className="text-sm font-semibold mb-1"
          numberOfLines={2}
          style={{ color: textColor }}
        >
          {placeName}
        </Text>

        {/* Location and Date Row */}
        <View className="flex-row items-center">
          <View className="items-center">
            {/* Location Icon */}
            <TouchableOpacity onPress={onLocationPress} className="flex-row items-center">
              {(city || country) && (
                <Text
                  className="text-sm mr-1"
                  numberOfLines={2}
                  style={{ color: textColor }}
                >
                  {city ? (city.length > 12 ? `${city.slice(0, 12)}...` : city) : ''}
                  {city && country ? ', ' : ''}
                  {country ? (country.length > 12 ? `${country.slice(0, 12)}...` : country) : ''}
                </Text>
              )}
              {(city || country) && (
                <Ionicons name="location" size={12} color="#3B82F6" />
              )}
            </TouchableOpacity>
          </View>

          {/* Fixed Date on the Right Side */}
          <Text
            className="text-sm ml-auto"
            numberOfLines={1}
            style={{ color: textColor }}
          >
            {formatDate(date)}
          </Text>
        </View>

        {/* Product Price and List Name */}
        <View className="flex-row items-center justify-between mt-2">
          {/* List Name */}
          <Text
            className="text-sm mb-1"
            numberOfLines={1}
            style={{ color: textColor }}
          >
            {t('list')}: {listName}
          </Text>
          {price ? (
            <Text className="text-sm font-bold" style={{ color: 'green' }}>
              {price}
            </Text>
          ) : (
            <Text className="text-sm font-bold" style={{ color: textColor }}></Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default ProductCard;
