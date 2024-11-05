import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Text, Alert, Platform, Linking } from 'react-native';
import SearchBar from '../../components/SearchBar';
import ProductCard from '../../components/ProductCard';
import { getAllProducts, getFavoriteProductsCount, toggleFavorite, updateProduct } from '../../database/productService';
import EventEmitter from '../../components/events'; // Import EventEmitter to listen for product updates
import { getListById } from '../../database/listService';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { use } from 'i18next';
import { useTheme } from '../../context/ThemeContext';

type ExtendedProductType = ProductType & { listName: string };

const SearchScreen: React.FC = () => {
  const [products, setProducts] = useState<ExtendedProductType[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ExtendedProductType[]>([]);
  const [searchText, setSearchText] = useState('');
  const { t } = useTranslation();
  const { theme } = useTheme();

  useEffect(() => {
    fetchProducts();

    // Set up event listeners for product updates
    const handleProductUpdates = () => fetchProducts();
    EventEmitter.on('productAdded', handleProductUpdates);
    EventEmitter.on('productUpdated', handleProductUpdates);

    return () => {
      EventEmitter.off('productAdded', handleProductUpdates);
      EventEmitter.off('productUpdated', handleProductUpdates);
    };
  }, []);

   // Fetch all products and their list names
  const fetchProducts = useCallback(async () => {
    try {
      const allProducts = await getAllProducts();

      // Construct the products with list names and location
      const productsWithListNames = await Promise.all(
        allProducts.map(async (product) => {
          let listName = '';
          if (product.list_id) {
            const list = await getListById(product.list_id);
            listName = list?.name || '';
          }

          // Construct the location object
          const location =
            product.latitude && product.longitude
              ? { latitude: product.latitude, longitude: product.longitude }
              : undefined;

          return { ...product, listName, location };
        })
      );

      setProducts(productsWithListNames);
      // Apply current search filter to the new product list
      setFilteredProducts(productsWithListNames);
    } catch (error) {
      console.error(t('failedToFetchProducts'), error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  // Handle search functionality
  const handleSearch = useCallback(
    (text: string) => {
      setSearchText(text);

      if (!text.trim()) {
        // If search text is empty, show all products
        setFilteredProducts(products);
      } else {
        const lowercasedText = text.toLowerCase();
        const filtered = products.filter((product) =>
          product.name.toLowerCase().includes(lowercasedText) ||
          (product.placeName && product.placeName.toLowerCase().includes(lowercasedText)) ||
          (product.listName && product.listName.toLowerCase().includes(lowercasedText)) ||
          (product.city && product.city.toLowerCase().includes(lowercasedText)) ||
          (product.country && product.country.toLowerCase().includes(lowercasedText))
        );
        setFilteredProducts(filtered);
      }
    },
    [products]
  );

  // Handle toggling favorite status
  const handleToggleFavorite = useCallback(
    async (productId: number) => {
      const productToToggle = products.find((p) => p.id === productId);
      if (!productToToggle) return;

      const newFavoriteStatus = !productToToggle.isFavorite;

      // Check if adding a favorite exceeds the limit
      if (newFavoriteStatus) {
        try {
          const favoriteCount = await getFavoriteProductsCount();
          if (favoriteCount >= 20) {
            Alert.alert(t('limitReached'), t('favoriteLimitMessage'));
            return;
          }
        } catch (error) {
          Alert.alert(t('error'), t('favoriteProductCountError'));
          return;
        }
      }

      try {
        // Use toggleFavorite function to update the favorite status
        await toggleFavorite(productToToggle.id, newFavoriteStatus);

        // Emit an event to notify other screens about the update
        EventEmitter.emit('productUpdated');

        // Update local state for both filtered and original products
        const updateProductState = (productList: ExtendedProductType[]) =>
          productList.map((product) =>
            product.id === productId ? { ...product, isFavorite: newFavoriteStatus } : product
          );

        setProducts((prevProducts) => updateProductState(prevProducts));
        setFilteredProducts((prevProducts) => updateProductState(prevProducts));
      } catch (error) {
        Alert.alert(t('error'), t('failedToUpdateProduct'));
      }
    },
    [products]
  );

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
          listName={item.listName || ''}
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
      {/* Search Bar */}
      <View className="mb-4">
        <SearchBar onSearch={handleSearch} />
      </View>

      {/* Product List */}
      <View className='rounded-xl p-4 mb-40' style={{backgroundColor: theme === 'dark' ? '#0c0b16' : '#ececec'}}>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="text-center mt-4" style={{color: theme === 'dark' ? '#ececec' : '#2a2a35'}}>
              {t('noProductsFound')}
            </Text>
          }
        />
      </View>
    </View>
  );
};

export default SearchScreen;
