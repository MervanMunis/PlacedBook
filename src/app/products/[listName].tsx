import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Text, Alert, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl, Linking } from 'react-native';
import { useLocalSearchParams, usePathname } from 'expo-router';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import ProductCard from '../../components/ProductCard';
import { getProductsByList, updateProduct, deleteProduct, getFavoriteProductsCount } from '../../database/productService';
import { getLists } from '../../database/listService';
import EventEmitter from '../../components/events';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import * as Localization from 'expo-localization';

const ProductListScreen = () => {
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const { theme } = useTheme();
  const rawListName = pathname.split('/').pop();
  const listName = rawListName ? decodeURIComponent(rawListName) : '';
  const listId = params.listId ? Number(params.listId) : undefined;

  const [productList, setProductList] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [lists, setLists] = useState<ListType[]>([]);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [originalLocation, setOriginalLocation] = useState<LocationType>(undefined);
  const { t, i18n } = useTranslation();

  const [locale, setLocale] = useState(Localization.locale);

  // Update locale when i18n language changes
  useEffect(() => {
    setLocale(i18n.language === 'tr' ? 'tr-TR' : 'en-US');
  }, [i18n.language]);

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (event.type === 'set' && selectedDate) {
      setSelectedProduct((prev) => prev ? { ...prev, date: selectedDate.toISOString() } : null);
    }
    setDatePickerVisible(false); // Hide date picker after selection
  };

  const fetchProducts = useCallback(async () => {
    if (!listId) {
      setLoading(false);
      return;
    }

    try {
      const products = await getProductsByList(listId);
      const updatedProducts = products.map((product) => ({
        ...product,
        location: product.latitude && product.longitude
          ? { latitude: product.latitude, longitude: product.longitude }
          : undefined,
      }));
      setProductList(updatedProducts);
    } catch (error) {
      Alert.alert(t('error'), t('failedToFetchProducts'));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  const fetchLists = useCallback(async () => {
    try {
      const dbLists = await getLists();
      setLists(dbLists);
    } catch (error) {
      Alert.alert(t('error'), t('failedToFetchLists'));
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchLists();

    const productsUpdatedListener = fetchProducts;
    EventEmitter.on('productUpdated', productsUpdatedListener);

    return () => {
      EventEmitter.off('productUpdated', productsUpdatedListener);
    };
  }, [fetchProducts, fetchLists]);

  const handleDeleteProduct = useCallback((productId: number) => {
    Alert.alert(
      t('confirmDeletion'),
      t('confirmDeleteProduct'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('yes'),
          onPress: async () => {
            try {
              await deleteProduct(productId);
              fetchProducts();
              EventEmitter.emit('productCountChanged', { listId, change: -1 });
              EventEmitter.emit('productUpdated'); // Notify other screens
              Alert.alert('Success', 'Product deleted successfully.');
            } catch (error) {
              Alert.alert(t('error'), t('failedToDeleteProduct'));
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [fetchProducts, listId]);

  const handleEditProduct = useCallback((product: ProductType) => {
    setSelectedProduct(product);
    setEditModalVisible(true);
  }, []);

  const handleToggleFavorite = useCallback(async (productId: number) => {
    const productToToggle = productList.find((p) => p.id === productId);
    if (!productToToggle) return;

    const newFavoriteStatus = !productToToggle.isFavorite;

    // If the user is trying to favorite a product
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
      await updateProduct(
        productToToggle.id,
        productToToggle.name,
        productToToggle.placeName,
        productToToggle.price,
        productToToggle.imageUrl,
        productToToggle.city,
        productToToggle.country,
        productToToggle.date ? new Date(productToToggle.date) : undefined,
        productToToggle.list_id || listId,
        newFavoriteStatus,
        productToToggle.location?.latitude,
        productToToggle.location?.longitude
      );

      // Update the local state
      const updatedProducts = productList.map((product) => {
        if (product.id === productId) {
          return { ...product, isFavorite: newFavoriteStatus };
        }
        return product;
      });
      setProductList(updatedProducts);

      // Emit event to notify other screens
      EventEmitter.emit('productUpdated');
    } catch (error) {
      Alert.alert(t('error'), t('failedToUpdateProduct'));
    }
  }, [productList, listId]);

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
   
  const handleInputChange = (field: keyof ProductType, value: string, maxLength: number) => {
    if (value.length <= maxLength) {
      setSelectedProduct((prevProduct) => (prevProduct ? { ...prevProduct, [field]: value } : null));
    }
  };

  const handleSaveEdit = useCallback(async () => {
    if (!selectedProduct) return;

    // Validation: Check required fields
    if (!selectedProduct.name || !selectedProduct.placeName || !selectedProduct.list_id) {
      Alert.alert(t('error'), t('pleaseFillAllRequiredFields'));
      return;
    }

    const previousListId = selectedProduct.list_id;
    const newListId = selectedProduct.list_id;

    const { latitude, longitude } = selectedProduct.location || {};

    try {
      await updateProduct(
        selectedProduct.id,
        selectedProduct.name,
        selectedProduct.placeName,
        selectedProduct.price,
        selectedProduct.imageUrl,
        selectedProduct.city,
        selectedProduct.country,
        selectedProduct.date ? new Date(selectedProduct.date) : undefined,
        selectedProduct.list_id,
        selectedProduct.isFavorite,
        latitude,
        longitude
      );

      if (previousListId !== newListId) {
        if (previousListId) {
          EventEmitter.emit('productCountChanged', { listId: previousListId, change: -1 });
        }
        if (newListId) {
          EventEmitter.emit('productCountChanged', { listId: newListId, change: 1 });
        }
      }

      fetchProducts();
      EventEmitter.emit('productUpdated');

      setEditModalVisible(false);
      setSelectedProduct(null);
      Alert.alert(t('success'), t('productUpdated'));
    } catch (error) {
      Alert.alert(t('error'), t('failedToUpdateProduct'));
    }
  }, [selectedProduct, fetchProducts]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && selectedProduct) {
      setSelectedProduct({ ...selectedProduct, imageUrl: result.assets[0].uri });
    }
  };

  const handleAddLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionDenied'), t('permissionToAccessLocation'));
      return;
    }

    let initialLocation;
    if (selectedProduct?.location) {
      initialLocation = selectedProduct.location;
    } else {
      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      initialLocation = { latitude, longitude };
    }

    setOriginalLocation(initialLocation);
    setSelectedProduct((prev) =>
      prev ? { ...prev, location: initialLocation } : null
    );
    setMapVisible(true);
  };

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    try {
      const [location] = await Location.reverseGeocodeAsync({ latitude, longitude });
      setSelectedProduct((prev) =>
        prev
          ? {
              ...prev,
              city: location.city || '',
              country: location.country || '',
              location: { latitude, longitude },
            }
          : null
      );
    } catch (error) {
      Alert.alert(t('error'), t('unableToFetchLocationInfo'));
    }
  };

  const renderRightActions = (productId: number) => (
    <Animated.View
      entering={SlideInRight}
      className="bg-red-500 w-24 justify-center items-center rounded-r-lg"
    >
      <TouchableOpacity
        onPress={() => handleDeleteProduct(productId)}
        className="flex justify-center items-center h-full"
      >
        <Text className="text-white font-bold text-lg">{t('delete')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderLeftActions = (product: ProductType) => (
    <Animated.View
      entering={SlideInLeft}
      className="bg-blue-500 w-24 h-full justify-center items-center rounded-l-lg"
    >
      <TouchableOpacity
        onPress={() => handleEditProduct(product)}
        className="flex justify-center items-center h-full"
      >
        <Text className="text-white font-bold text-lg">{t('edit')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderItem = useCallback(
    ({ item }: { item: ProductType }) => (
      <View className="mb-3">
        <Swipeable
          renderLeftActions={() => renderLeftActions(item)}
          renderRightActions={() => renderRightActions(item.id)}
          overshootLeft={false}
          overshootRight={false}
          friction={2}
        >
          <ProductCard
            imageUrl={item.imageUrl}
            name={item.name}
            placeName={item.placeName}
            listName={listName || ''}
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
        </Swipeable>
      </View>
    ),
    [handleToggleFavorite, openMap]
  );

  return (
    <GestureHandlerRootView className="flex-1" style={{backgroundColor: theme === 'dark' ? '#181725' : '#F0F0F3'}}>
      <View className="p-4">
        <View className="flex-row items-center rounded-lg py-3 mb-4" style={{backgroundColor: theme === 'dark' ? '#0c0b16' : '#ececec'}}>
          <Ionicons name="list" size={24} color={theme === 'dark' ? '#ececec' : '#4a4a4a'} className="mx-4" />
          <Text className="text-3xl text-center font-bold" style={{color: theme === 'dark' ? '#ececec' : '#2a2a35'}}>{listName} {productList.length} {t('products')}</Text>
        </View>

        <View className="flex-col p-3 rounded-md mb-44" style={{backgroundColor: theme === 'dark' ? '#0c0b16' : '#ececec'}}>
          {loading ? (
            <Text className="text-center mt-4" style={{color: theme === 'dark' ? '#ececec' : '#2a2a35'}}>{t('loading')}</Text>
          ) : productList.length > 0 ? (
            <FlatList
              data={productList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text className="text-center mt-4" style={{color: theme === 'dark' ? '#ececec' : '#2a2a35'}}>{t('noProductsAvailable')}</Text>
          )}
        </View>

        <Modal
          visible={editModalVisible}
          transparent={true}
          onRequestClose={() => setEditModalVisible(false)}
          animationType="slide"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 justify-center items-center bg-black/50"
          >
          <View className="w-7/12 p-4 rounded-lg" style={{backgroundColor: theme === 'dark' ? '#181725' : '#f8f8f8'}}>
            <Text className="text-lg font-semibold mb-2 text-center" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>{t('editProduct')}</Text>
              <View 
                className="flex-row items-center justify-between px-3 border rounded-lg mb-2" 
                style={{backgroundColor: theme === 'dark' ? '#181725' : '#fdfcfd', borderColor: theme === 'dark' ? '#ececec' : '#181725'}}
              >
                <RNPickerSelect
                  onValueChange={(value) =>
                    setSelectedProduct((prev) => (prev ? { ...prev, list_id: value } : null))
                  }
                  items={lists.map((list) => ({ label: list.name, value: list.id }))}
                  placeholder={{ label: t('selectList') + '...', value: null, color: theme === 'dark' ? '#ececec' : '#181725' }}
                  value={selectedProduct?.list_id}
                  style={{
                    inputIOS: { height: 24, paddingLeft: 10, color: theme === 'dark' ? '#ececec' : '#181725', fontSize: 14, },
                    inputAndroid: { height: 24, paddingLeft: 10, color: theme === 'dark' ? '#ececec' : '#181725',  fontSize: 16, },
                  }}
                />
                <Ionicons name="chevron-down" size={20} color={theme === 'dark' ? '#ececec' : '#4a4a4a'} />
              </View>

              <TextInput
                placeholder={t('productName')}
                placeholderTextColor={theme === 'dark' ? '#ececec' : '#181725'}
                value={selectedProduct?.name}
                onChangeText={(text) => handleInputChange('name', text, 20)}
                className="border rounded-lg p-2 mb-2 text-base"
                style={{ color: theme === 'dark' ? '#ececec' : '#181725', backgroundColor: theme === 'dark' ? '#181725' : '#fdfcfd', borderColor: theme === 'dark' ? '#ececec' : '#181725' }}
              />

              <TextInput
                placeholder={t('placeName')}
                
                value={selectedProduct?.placeName}
                onChangeText={(text) => handleInputChange('placeName', text, 24)}
                className="border rounded-lg p-2 mb-2 text-base"
                style={{ color: theme === 'dark' ? '#ececec' : '#181725', backgroundColor: theme === 'dark' ? '#181725' : '#fdfcfd', borderColor: theme === 'dark' ? '#ececec' : '#181725' }}
              />

              <TextInput
                placeholder={t('price')}
                placeholderTextColor={theme === 'dark' ? '#ececec' : '#181725'}
                value={selectedProduct?.price}
                onChangeText={(text) => handleInputChange('price', text, 8)}
                className="border rounded-lg p-2 mb-2 text-base"
                style={{ color: theme === 'dark' ? '#ececec' : '#181725', backgroundColor: theme === 'dark' ? '#181725' : '#fdfcfd', borderColor: theme === 'dark' ? '#ececec' : '#181725'}}
              />
                
              <View className="flex-row items-center my-1 mb-2">
                <DateTimePicker
                    value={selectedProduct?.date ? new Date(selectedProduct.date) : new Date()}
                    mode="date"
                    display="default"
                    locale={locale}
                    onChange={handleDateChange}
                  />
                <TouchableOpacity
                  onPress={handlePickImage}
                  className="p-2 rounded-lg items-center justify-center ml-2"
                >
                  <Ionicons name="camera" size={20} color={theme === 'dark' ? '#ececec' : '#181725'} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAddLocation}
                  className="p-2 rounded-lg items-center justify-center ml-2"
                >
                  <Ionicons name="location" size={20} color={theme === 'dark' ? '#ececec' : '#181725'} />
                </TouchableOpacity>
              </View>

              <Modal
                visible={mapVisible}
                transparent={true}
                onRequestClose={() => setMapVisible(false)}
                animationType="slide"
              >
                <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
                  <MapView
                    style={{ width: '100%', height: '100%' }}
                    initialRegion={{
                      latitude:
                        selectedProduct?.location?.latitude ||
                        originalLocation?.latitude ||
                        37.78825,
                      longitude:
                        selectedProduct?.location?.longitude ||
                        originalLocation?.longitude ||
                        -122.4324,
                      latitudeDelta: 0.0922,
                      longitudeDelta: 0.0421,
                    }}
                    onPress={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      reverseGeocodeLocation(latitude, longitude);
                      setMapVisible(false);
                    }}
                  >
                    {selectedProduct?.location && (
                      <Marker coordinate={selectedProduct.location} title="Selected Location" />
                    )}
                  </MapView>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedProduct((prev) =>
                        prev ? { ...prev, location: originalLocation } : null
                      );
                      setMapVisible(false);
                    }}
                    className="absolute top-10 right-4 mt-10 bg-red-500 py-2 px-6 rounded-lg"
                  >
                    <Text className="text-white text-center text-xl">{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </Modal>

              <TouchableOpacity
                onPress={handleSaveEdit}
                className="py-2 rounded-lg"
                style={{backgroundColor: theme === 'dark' ? '#66BB6A' : '#29d300'}}
              >
                <Text className="text-white text-center text-base">{t('saveChanges')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                className="py-2 mt-1 rounded-lg"
                style={{backgroundColor: theme === 'dark' ? '#EF5350' : '#f91a00'}}
              >
                <Text className="text-white text-center text-base">{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
};

export default ProductListScreen;
