import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Modal, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, FlatList, Dimensions, ScrollView, Linking, Share } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect, useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import ListCard from '../../components/ListCard';
import { addList, getLists, updateList, deleteList, updateListOrder, getListById } from '../../database/listService';
import { getFavoriteProducts, getProductsByList } from '../../database/productService';
import eventEmitter from '../../components/events';
import ProductCard from '../../components/ProductCard';
import base64 from 'react-native-base64';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

type ListType = {
  id: number;
  name: string;
  products?: any[];
  productCount?: number;
};

// Extend ProductType to include listName
type ExtendedProductType = ProductType & { listName: string };

export default function Home() {
  const windowWidth = Dimensions.get('window').width - 36;
  const [lists, setLists] = useState<ListType[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'rename'>('create');
  const [newListName, setNewListName] = useState('');
  const [renameListIndex, setRenameListIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [favoriteProducts, setFavoriteProducts] = useState<ExtendedProductType[]>([]); 
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(0);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Listen for product count changes
  const handleProductCountChange = useCallback(({ listId, change }: { listId: number; change: number }) => {
    setLists((prevLists) =>
      prevLists.map((list) =>
        list.id === listId ? { ...list, productCount: (list.productCount || 0) + change } : list
      )
    );
  }, []);

  // Fetch data (lists and favorite products)
  const fetchData = useCallback(async () => {
    await fetchListsWithProductCount();
    await fetchFavoriteProducts();
  }, []);

  // UseFocusEffect to trigger fetchData when the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    // Set up event listeners
    eventEmitter.on('productCountChanged', handleProductCountChange);
  
    // Cleanup listeners on component unmount
    return () => {
      eventEmitter.off('productCountChanged', handleProductCountChange);
    };
  }, []);

  // Auto-scroll favorite products
  useEffect(() => {
    const interval = setInterval(() => {
      if (favoriteProducts.length > 0) {
        let nextIndex = currentIndexRef.current + 1;
        if (nextIndex >= favoriteProducts.length) {
          nextIndex = 0;
        }
        currentIndexRef.current = nextIndex;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [favoriteProducts]);

  // Fetch lists along with product count
  const fetchListsWithProductCount = async () => {
    try {
      const dbLists = await getLists();
      const listsWithCounts = await Promise.all(
        dbLists.map(async (list) => {
          const products = await getProductsByList(list.id);
          return { ...list, productCount: products.length };
        })
      );
      setLists(listsWithCounts);
    } catch (error) {
      Alert.alert(t('error'), t('failedToFetchLists'));
    }
  };

  // Fetch favorite products and their list names
  const fetchFavoriteProducts = async () => {
    try {
      const products = await getFavoriteProducts();

      // Fetch list names for each favorite product
      const productsWithListNames = await Promise.all(
        products.map(async (product) => {
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

      const shuffledProducts = productsWithListNames.sort(() => 0.5 - Math.random());
      const selectedProducts = shuffledProducts.slice(0, 3);
      setFavoriteProducts(selectedProducts);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch favorite products.');
    }
  };

  // Save the new order of the lists
  const saveListOrder = async (newListOrder: ListType[]) => {
    try {
      // Update the order in the database
      for (let i = 0; i < newListOrder.length; i++) {
        await updateListOrder(newListOrder[i].id, i); // Update with new index
      }
      setLists(newListOrder); // Update state with new order
    } catch (error) {
      Alert.alert(t('error'), t('failedToSaveListOrder'));
    }
  };

  // Handle adding a new list
  const handleAddList = async () => {
    if (!newListName.trim()) {
      setError(t('listNameEmpty'));
      return;
    }

    if (lists.some((list) => list.name.toLowerCase() === newListName.toLowerCase())) {
      setError(t('listExists'));
      return;
    }

    try {
      const newListId = await addList(newListName);
      setNewListName('');
      setError('');
      setModalVisible(false);

      await fetchListsWithProductCount();
      eventEmitter.emit('listsUpdated');
    } catch (error) {
      Alert.alert(t('error'), t('failedToAddList'));
    }
  };

  // Handle renaming a list
  const handleRenameList = async () => {
    if (renameListIndex === null || !newListName.trim()) {
      setError(t('listNameEmpty'));
      return;
    }

    if (lists.some((list, index) => index !== renameListIndex && list.name.toLowerCase() === newListName.toLowerCase())) {
      setError(t('listWithTheSameNameExist'));
      return;
    }

    try {
      const listToRename = lists[renameListIndex];
      await updateList(listToRename.id, newListName);
      setNewListName('');
      setError('');
      setModalVisible(false);

      await fetchListsWithProductCount();
    } catch (error) {
      Alert.alert(t('error'), t('failedToRenameList'));
    }
  };

  // Handle deleting a list with confirmation
  const handleDeleteList = async (index: number) => {
    const listToDelete = lists[index];

    try {
      // Fetch the products associated with the list
      const products = await getProductsByList(listToDelete.id);

      // If there are products, prevent deletion
      if (products.length > 0) {
        Alert.alert(
          t('cannotDelete'),
          t('cannotDeleteList'),
          [{ text: 'OK', style: 'cancel' }]
        );
        return;
      }

      // Show confirmation alert before deletion
      Alert.alert(
        t('confirmDeletion'),
        t('confirmDeleteList'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('yes'),
            onPress: async () => {
              try {
                await deleteList(listToDelete.id);
                setLists((prevLists) => prevLists.filter((_, i) => i !== index));

                await fetchListsWithProductCount();
                eventEmitter.emit('listsUpdated');
              } catch (error) {
                Alert.alert(t('error'), t('failedToDeleteList'));
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      Alert.alert(t('error'), t('failedToCheckList'));
    }
  };

  // Function to handle publishing the list
  const handlePublishList = async (listId: number) => {
    try {
      // Fetch the list and its products
      const list = lists.find((l) => l.id === listId);
      const products = await getProductsByList(listId);

      // Serialize the data
      const data = {
        list,
        products,
      };
      const jsonData = JSON.stringify(data);
      const base64Data = base64.encode(jsonData);

      // Generate the link
      const link = `https://placeholder.tech/list?data=${encodeURIComponent(base64Data)}`;

      // Share the link
      await Share.share({
        message: `Check out this list: ${link}`,
      });
    } catch (error) {
      Alert.alert(t('error'), t('failedToPublishList'));
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

  // Navigate to the product list screen
  const navigateToProductList = (list: ListType) => {
    router.push({
      pathname: `/products/${list.name}`,
      params: { listId: list.id },
    });
  };

  // Open create or rename modal
  const openModal = (type: 'create' | 'rename', index?: number) => {
    if (type === 'rename' && index !== undefined) {
      setRenameListIndex(index);
      setNewListName(lists[index].name);
    }
    setModalType(type);
    setModalVisible(true);
  };

  // Render each list item using ListCard
  const renderListItem = ({ item, drag, isActive }: RenderItemParams<ListType>) => {
    return (
      <ListCard
        name={item.name}
        productCount={item.productCount || 0}
        editMode={editMode}
        onRename={() => openModal('rename', lists.indexOf(item))}
        onDelete={() => handleDeleteList(lists.indexOf(item))}
        onPress={() => navigateToProductList(item)}
        drag={drag}
        isActive={isActive}
        onPublish={() => handlePublishList(item.id)}
      />
    );
  };

  return (
    <GestureHandlerRootView className="flex-1" style={{backgroundColor: theme === 'dark' ? '#181725' : '#F0F0F3'}}>
      <View className="flex-1 p-5">
        {/* Favorite Products Carousel */}
        {favoriteProducts.length > 0 && (
          <View className="mb-4">
            <FlatList
              data={favoriteProducts}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={{ width: windowWidth }}>
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
                    onToggleFavorite={() => {}}
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
              )}
              horizontal
              pagingEnabled
              scrollEnabled
              showsHorizontalScrollIndicator={true}
              ref={flatListRef}
              onScrollToIndexFailed={() => {}}
            />
          </View>
        )}

        <View className="p-3 rounded-md" style={{backgroundColor: theme === 'dark' ? '#0c0b16' : '#F0F0F3'}}>
          <View className="flex-row mb-4 text-xl">
            {/* "Create List" Button */}
            <TouchableOpacity
              onPress={() => openModal('create')}
              className="flex-1 p-3 mr-2 rounded-xl"
              style={{backgroundColor: theme === 'dark' ? '#1e90ff' : '#007AFF'}}
            >
              <Text className="text-center" style={{ color: '#FFF' }}>{t('createList')}</Text>
            </TouchableOpacity>

            {/* Edit Mode Toggle */}
            <TouchableOpacity
              onPress={() => setEditMode(!editMode)}
              className="flex-1 p-3 rounded-xl"
              style={{backgroundColor: theme === 'dark' ? '#4B4B4B' : '#D3D3E3'}}
            >
              <Text className="text-center" style={{color: theme === 'dark' ? '#fff' : '#000'}}>
                {editMode ? t('exitEditMode') : t('editLists')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Draggable FlatList for Product Lists with RefreshControl */}
          <DraggableFlatList
            data={lists}
            className=""
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderListItem}
            onDragEnd={({ data }) => saveListOrder(data)}
          />
        </View>

        {/* Create/Rename List Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 justify-center items-center bg-black/50"
          >
            <View className="w-3/4 px-6 py-4 rounded-lg" style={{backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF'}}>
              <Text className="text-xl font-bold mb-4" style={{color: theme === 'dark' ? '#FFF' : '#000'}}>
                {modalType === 'create' ? t('enterListName') : t('renameList')}
              </Text>
              <TextInput
                value={newListName}
                onChangeText={(text) => {
                  if (text.length <= 20) {
                    setNewListName(text);
                    setError('');
                  } else {
                    setError(t('listNameTooLong'));
                  }
                }}
                placeholder={t('name')}
                placeholderClassName="text-black"
                placeholderTextColor={theme === 'dark' ? '#D3D3D3' : '#A9A9A9'}
                className="p-2 rounded-lg border"
                style={{ backgroundColor: '#FFF', color: '#000' }}
              />
              <Text className="text-right mb-1" style={{color: theme === 'dark' ? '#D3D3D3' : '000'}}>
                {newListName.length}/20
              </Text>
              {error ? <Text className="mb-2 text-red-600">{error}</Text> : null}
              <TouchableOpacity
                onPress={modalType === 'create' ? handleAddList : handleRenameList}
                className="p-2 rounded-lg mb-2"
                style={{backgroundColor: theme === 'dark' ? '#007AFF' : '#000'}}
              >
                <Text className="text-center text-lg" style={{ color: '#FFF' }}>
                  {modalType === 'create' ? t('create') : t('save')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setNewListName('');
                  setError('');
                }}
                className="p-1"
              >
                <Text className="text-center text-lg" style={{ color: theme === 'dark' ? '#777' : '#000' }}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}
