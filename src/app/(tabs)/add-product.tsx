
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import ProductCard from '../../components/ProductCard';
import { addProduct } from '../../database/productService';
import { getLists } from '../../database/listService';
import eventEmitter from '../../components/events';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Modal, Platform, ActivityIndicator, } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import * as Localization from 'expo-localization';

interface List {
  id: number;
  name: string;
}

// Define type for the location property
type LocationType = {
  latitude: number;
  longitude: number;
} | undefined;

export default function AddProductTab() {
  const [lists, setLists] = useState<{ label: string; value: number }[]>([]);
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [locationClicked, setLocationClicked ] = useState(false);
  const [selectedImageOption, setSelectedImageOption] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [newProduct, setNewProduct] = useState({
    name: '',
    placeName: '',
    price: '',
    imageUrl: '',
    location: undefined as LocationType,
    city: '',
    country: '',
    date: new Date(),
  });

  const [locale, setLocale] = useState(Localization.locale);

  // Update locale when i18n language changes
  useEffect(() => {
    setLocale(i18n.language === 'tr' ? 'tr-TR' : 'en-US');
  }, [i18n.language]);

  // Date picker change handler
  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || newProduct.date;
    setNewProduct({ ...newProduct, date: currentDate });
  };

  // Fetch lists from the database
  const fetchListsFromDb = async () => {
    try {
      const dbLists: List[] = await getLists();
      const formattedLists = dbLists.map((list: List) => ({
        label: list.name,
        value: list.id,
      }));
      setLists(formattedLists);
    } catch (error) {
      Alert.alert(t('error'), t('failedToFetchLists'));
    }
  };

  useEffect(() => {
    // Initial fetch of lists
    fetchListsFromDb();

    // Set up EventEmitter listener for list updates
    const updateListsListener = async () => {
      await fetchListsFromDb();
    };

    eventEmitter.on('listsUpdated', updateListsListener);

    // Cleanup listener on component unmount
    return () => {
      eventEmitter.off('listsUpdated', updateListsListener);
    };
  }, []);

  // Handle image selection from gallery
  const pickImageFromGallery = async () => {
    setLocationClicked(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('permissionDenied'), t('permissionToAccessGallery'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setNewProduct({ ...newProduct, imageUrl: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert(t('error'), t('failedToPickImage'));
    }
  };

  // Handle taking a photo with the camera
  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('permissionDenied'), t('permissionToAccessCamera'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setNewProduct({ ...newProduct, imageUrl: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert(t('error'), t('failedToTakePhoto'));
    }
  };

  // Handle image option selection
  const handleImageOptionChange = (option: string) => {
    if (option === 'gallery') {
      pickImageFromGallery();
    } else if (option === 'camera') {
      takePhoto();
    }
    setSelectedImageOption(null);
  };

  // Fetch current location and display map
  const handleAddLocation = async () => {
    setLocationClicked(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionDenied'), t('permissionToAccessLocation'));
        setLocationClicked(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      setNewProduct({ ...newProduct, location: { latitude, longitude } });
      setMapVisible(true);
    } catch (error) {
      Alert.alert(t('error'), t('failedToFetchCurrentLocation'));
    } finally {
      setLocationClicked(false);  // Stop loading when done
    }
  };

  // Reverse geocode to get city and country
  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    try {
      const [location] = await Location.reverseGeocodeAsync({ latitude, longitude });
      setNewProduct({
        ...newProduct,
        city: location.city || '',
        country: location.country || '',
        location: { latitude, longitude },
      });
    } catch (error) {
      Alert.alert(t('error'), t('Unable to fetch location info.'));
    }
  };

  // Add this to the createProduct function after a product is added
  const createProduct = async () => {
    if (!newProduct.name || !newProduct.placeName || !selectedList) {
      Alert.alert(t('error'), t('pleaseFillAllRequiredFields'));
      return;
    }

    const productDetails = {
      ...newProduct,
      list_id: selectedList,
      date: newProduct.date,
      location: newProduct.location || undefined,
    };

    try {
      await addProduct(productDetails);
      Alert.alert(t('success'), t('productAddedToList'));

      // Emit event to notify other screens about product updates
      eventEmitter.emit('productsUpdated');
      
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('failedToAddProduct');
      Alert.alert(t('error'), errorMessage);
    }
  };

  // Reset form after adding a product
  const resetForm = () => {
    setNewProduct({
      name: '',
      placeName: '',
      price: '',
      imageUrl: '',
      location: undefined,
      city: '',
      country: '',
      date: new Date(),
    });
    setSelectedList(null);
  };

  const handleInputChange = (field: string, value: string, maxLength: number) => {
    if (value.length <= maxLength) {
      setNewProduct((prevProduct) => ({ ...prevProduct, [field]: value }));
    }
  };
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1" style={{backgroundColor: theme === 'dark' ? '#181725' : '#F0F0F3'}}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="p-4 rounded-xl" style={{backgroundColor: theme === 'dark' ? '#0c0b16' : '#f8f8f8'}}>
          <Text className="text-2xl text-center font-bold mb-4" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>{t('addProduct')}</Text>
            <ProductCard
              imageUrl={newProduct.imageUrl || ''}
              name={newProduct.name || ''}
              placeName={newProduct.placeName || ''}
              listName={lists.find((list) => list.value === selectedList)?.label || ''}
              city={newProduct.city || ''}
              country={newProduct.country || ''}
              price={newProduct.price ? `${newProduct.price}` : ''}
              date={newProduct.date}
              isFavorite={false}
              onToggleFavorite={() => {}}
              onLocationPress={() => setMapVisible(true)}
              location={undefined}
            />

          {/* List Picker */}
          <View className="mt-4 mb-3">
            <Text className="font-semibold mb-1" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>
              {t("selectList")} <Text className="text-red-500">*</Text>
            </Text>
            <View 
              className="flex-row border rounded-md p-3"
              style={{backgroundColor: theme === 'dark' ? '#181725' : '#fdfcfd', borderColor: theme === 'dark' ? '#ececec' : '#181725'}}
            >
              <RNPickerSelect
                onValueChange={(value) => setSelectedList(value)}
                items={lists}
                placeholder={{ label: t('selectList') + '...', value: null, color: theme === 'dark' ? '#ececec' : '#181725'}}
                value={selectedList}
                style={{
                  inputIOS: { height: 24, paddingLeft: 10, color: theme === 'dark' ? '#ececec' : '#181725', fontSize: 14, },
                  inputAndroid: { height: 24, paddingLeft: 10, color: theme === 'dark' ? '#ececec' : '#181725',  fontSize: 16, },
                }}
              />
            </View>
          </View>

          {/* Product Name Input */}
          <View className="">
            <Text className="font-semibold" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>
              {t("productName")} <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder={t("productName")}
              selectionColor={'#cfdc3f'}
              placeholderTextColor={theme === 'dark' ? '#ececec' : '#181725'}
              value={newProduct.name}
              onChangeText={(text) => handleInputChange('name', text, 24)}
              className="border rounded-md p-3 text-lg"
              style={{ color: theme === 'dark' ? '#ececec' : '#181725', backgroundColor: theme === 'dark' ? '#181725' : '#fdfcfd', borderColor: theme === 'dark' ? '#ececec' : '#181725'}}
            />
            <Text className="text-sm text-right" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>{newProduct.name.length}/24</Text>
          </View>

          {/* Place Name Input */}
          <View className="">
            <Text className="font-semibold" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>
              {t('placeName')} <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              selectionColor={'#cfdc3f'}
              placeholder={t('placeName')}
              placeholderTextColor={theme === 'dark' ? '#ececec' : '#181725'}
              value={newProduct.placeName}
              onChangeText={(text) => handleInputChange('placeName', text, 24)}
              className="border rounded-md p-3 text-lg"
              style={{ color: theme === 'dark' ? '#ececec' : '#181725', backgroundColor: theme === 'dark' ? '#181725' : '#fdfcfd', borderColor: theme === 'dark' ? '#ececec' : '#181725'}}
            />
            <Text className="text-sm text-right" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>{newProduct.placeName.length}/24</Text>
          </View>

          {/* Price Input */}
          <View className="">
            <Text className="font-semibold" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>{t("price")}</Text>
            <TextInput
              placeholder={t("price")}
              selectionColor={'#cfdc3f'}
              placeholderTextColor={theme === 'dark' ? '#ececec' : '#181725'}
              value={newProduct.price}
              onChangeText={(text) => handleInputChange('price', text, 8)}
              className="border rounded-md p-3 text-lg"
              style={{ color: theme === 'dark' ? '#ececec' : '#181725', backgroundColor: theme === 'dark' ? '#181725' : '#fdfcfd', borderColor: theme === 'dark' ? '#ececec' : '#181725'}}
            />
            <Text className="text-sm text-right" style={{color: theme === 'dark' ? '#ececec' : '#181725'}}>{newProduct.price.length}/8</Text>
          </View>

          <View className="flex flex-row items-center mb-4">
            {/* Date Picker */}
            <View className="mb-1">
              <DateTimePicker
                value={newProduct.date}
                mode="date"
                display="default"
                locale={locale}
                onChange={handleDateChange}
              />
            </View>

            {/* Image Upload Icon */}
            <View className="ml-4">
              <RNPickerSelect
                onValueChange={handleImageOptionChange}
                items={[
                  { label: t('pickFromGallery'), value: 'gallery' },
                  { label: t('takePhoto'), value: 'camera' },
                ]}
                placeholder={{ label: t('selectImageOption'), value: null, }}
                value={selectedImageOption}
              >
                <TouchableOpacity className="p-2">
                  <Ionicons name="camera" size={30} color={theme === 'dark' ? '#ececec' : '#181725'} />
                </TouchableOpacity>
              </RNPickerSelect>
            </View>

            {/* Location Icon */}
            <TouchableOpacity 
              onPress={handleAddLocation} 
              className="p-2"
              disabled={locationClicked}
            >
              {locationClicked ? (
                <ActivityIndicator size="small" color={theme === 'dark' ? '#ececec' : '#181725'} />
              ) : (
                <Ionicons name="location" size={30} color={theme === 'dark' ? '#ececec' : '#181725'} />
              )}
            </TouchableOpacity>
          </View>

          {/* Buttons Row: Add Product and Clear Fields */}
          <View className="flex flex-row justify-between">
            <TouchableOpacity onPress={createProduct} className="p-3 rounded-md flex-1 mr-2" style={{backgroundColor: theme === 'dark' ? '#66BB6A' : '#29d300'}}>
              <Text className="text-center text-lg text-white">{t('addProduct')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetForm} className="p-3 rounded-md flex-1 ml-2" style={{backgroundColor: theme === 'dark' ? '#EF5350' : '#f91a00'}}>
              <Text className="text-center text-lg text-white">{t('clearFields')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Map Modal */}
        <Modal animationType="slide" transparent={true} visible={mapVisible} onRequestClose={() => setMapVisible(false)}>
          <View className="flex-1 bg-black bg-opacity-50 justify-center">
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: newProduct.location?.latitude || 37.78825,
                longitude: newProduct.location?.longitude || -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                reverseGeocodeLocation(latitude, longitude);
                setMapVisible(false);
              }}
            >
              {newProduct.location && <Marker coordinate={newProduct.location} title={t("selectedLocation")} />}
            </MapView>
            {/* Cancel Button on Map */}
            <TouchableOpacity onPress={() => setMapVisible(false)} className="absolute top-10 right-4 mt-10 bg-red-500 py-2 px-6 rounded-lg">
              <Text className="text-white text-center text-xl">{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
