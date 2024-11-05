import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, Alert, Linking, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ProductCard from '../../components/ProductCard';
import { getFavoriteProducts, getFavoriteProductsCount, toggleFavorite, updateProduct } from '../../database/productService';
import { getListById } from '../../database/listService';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

type ExtendedProductType = ProductType & { listName: string };

const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState<ExtendedProductType[]>([]);
  const [favoriteCount, setFavoriteCount] = useState<number>(0); // State for favorite count
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Fetch the favorited products and count from the database
  const fetchFavorites = async () => {
    try {
      const [favoriteProducts, count] = await Promise.all([
        getFavoriteProducts(),
        getFavoriteProductsCount(),
      ]);
  
      const productsWithListNames = await Promise.all(
        favoriteProducts.map(async (product) => {
          let listName = '';
          if (product.list_id) {
            const list = await getListById(product.list_id);
            listName = list?.name || '';
          }
  
          // Construct the location object from latitude and longitude
          const location =
            product.latitude && product.longitude
              ? { latitude: product.latitude, longitude: product.longitude }
              : undefined;
  
          return {
            ...product,
            listName,
            location,
          };
        })
      );
  
      setFavorites(productsWithListNames);
      setFavoriteCount(count);
    } catch (error) {
      Alert.alert(t('error'), t('failedToFetchFavorites'));
    } finally {
      setLoading(false);
    }
  };  

  // Re-fetch favorites when the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  // Handle toggling favorite status
  const handleToggleFavorite = async (productId: number) => {
    const updatedFavorites = favorites.filter((product) => product.id !== productId);

    try {
      // Update the product's favorite status in the database
      const productToUpdate = favorites.find((product) => product.id === productId);
      if (productToUpdate) {
        await toggleFavorite(productToUpdate.id, false);

        setFavorites(updatedFavorites);
        setFavoriteCount((prevCount) => prevCount - 1);
      }
    } catch (error) {
      console.error('Update product error:', error);
      Alert.alert(t('error'), t('failedToUpdateProduct'));
    }
  };

  // Function to open the map app with the provided coordinates
  const openMap = useCallback(async (latitude: number, longitude: number, placeName: string = 'Selected Location') => {
    // Encode the place name to handle spaces or special characters in URLs
    const encodedPlaceName = encodeURIComponent(placeName);
  
    // URLs for each map provider
    const appleMapsUrl = `maps:0,0?q=${encodedPlaceName}&ll=${latitude},${longitude}`;
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const googleMapsAppUrl = `comgooglemaps://?q=${latitude},${longitude}&center=${latitude},${longitude}`;
    const yandexMapsUrl = `yandexmaps://maps.yandex.ru/?pt=${longitude},${latitude}&text=${encodedPlaceName}&z=12`;
  
    const options = [];
  
    // Check if Apple Maps is available (iOS only)
    if (Platform.OS === 'ios' && await Linking.canOpenURL(appleMapsUrl)) {
      options.push({ title: t('openInAppleMaps'), url: appleMapsUrl });
    }
  
    // Check if Google Maps App is available
    if (await Linking.canOpenURL(googleMapsAppUrl)) {
      options.push({ title: t('openInGoogleMaps'), url: googleMapsAppUrl });
    } else if (await Linking.canOpenURL(googleMapsUrl)) {
      // Fallback to Google Maps web if app isn't installed
      options.push({ title: t('openInGoogleMaps'), url: googleMapsUrl });
    }
  
    // Check if Yandex Maps is available
    if (await Linking.canOpenURL(yandexMapsUrl)) {
      options.push({ title: t('openInYandexMaps'), url: yandexMapsUrl });
    }
  
    // Display available map options to the user
    if (options.length > 0) {
      Alert.alert(
        t('chooseMap'),
        t('selectMapToViewLocation'),
        [
          // Map options buttons
          ...options.map((option) => ({
            text: option.title,
            onPress: () => Linking.openURL(option.url),
          })),
          // Add Cancel button
          {
            text: t('cancel'), // Localized "Cancel" text
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    } else {
      Alert.alert(t('error'), t('noMapApplicationsAvailable'));
    }
  }, []);   

  // Render product items
  const renderItem = useCallback(
    ({ item }: { item: ExtendedProductType }) => (
      <View className="mb-4">
        <ProductCard
          imageUrl={item.imageUrl}
          name={item.name}
          placeName={item.placeName}
          listName={item.listName}
          city={item.city}
          country={item.country}
          price={item.price}
          date={item.date ? new Date(item.date) : undefined}
          isFavorite={item.isFavorite}
          onToggleFavorite={() => handleToggleFavorite(item.id)}
          onLocationPress={() => {
            if (item.location?.latitude && item.location?.longitude) {
              openMap(item.location.latitude, item.location.longitude, item.placeName || 'Selected Location');
            } else {
              Alert.alert(t('locationNotAvailable'));
            }
          }}
          location={item.location}
        />
      </View>
    ),
    [handleToggleFavorite, openMap]
  );

  return (
    <View className="flex-1 p-4" style={{backgroundColor: theme === 'dark' ? '#181725' : '#F0F0F3'}}>
      <View className="rounded-md py-4 mb-4" style={{backgroundColor: theme === 'dark' ? '#0c0b16' : '#ececec'}}>
        <Text className="text-xl text-center" style={{color: theme === 'dark' ? '#ececec' : '#2a2a35'}}>
          {t('favoriteProductsCount')} {favoriteCount}
        </Text>
      </View>
      {loading ? (
          <Text className="text-center mt-4" style={{color: theme === 'dark' ? 'gray' : 'white'}}>{t('loading')}</Text>
        ) : favorites.length > 0 ? (
          <View className='p-4 rounded-xl mb-40' style={{backgroundColor: theme === 'dark' ? '#0c0b16' : '#ececec'}}>
            <FlatList
              data={favorites}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : (
          <Text className="text-center mt-4" style={{color: theme === 'dark' ? 'gray' : 'white'}}>{t('noFavoriteProducts')}</Text>
      )}
    </View>
  );
};

export default FavoritesScreen;
