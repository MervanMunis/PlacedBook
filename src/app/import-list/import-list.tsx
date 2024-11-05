import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import base64 from 'react-native-base64';
import ProductCard from '../../components/ProductCard';
import { getLists } from '../../database/listService';
import { addProduct } from '../../database/productService';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Define the expected route params type
type ImportListScreenParams = {
  data: string;
};

const ImportListScreen = () => {
  // Use expo-router's useLocalSearchParams to access URL parameters directly
  const { data } = useLocalSearchParams<ImportListScreenParams>();
  const router = useRouter();
  const [listData, setListData] = useState<any>(null);
  const [availableLists, setAvailableLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Decode and parse the incoming list data
  useEffect(() => {
    if (data) {
      try {
        const base64Data = decodeURIComponent(data);
        const jsonData = base64.decode(base64Data);
        const parsedData = JSON.parse(jsonData);
        setListData(parsedData);
      } catch (error) {
        Alert.alert('Error', 'Failed to import the list. Please check the data format.');
        console.error('Data parsing error:', error);
      }
    }
  }, [data]);

  // Load available lists for the user to choose where to save products
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const lists = await getLists();
        setAvailableLists(lists);
      } catch (error) {
        Alert.alert('Error', 'Failed to load existing lists.');
        console.error('Error loading lists:', error);
      }
    };
    fetchLists();
  }, []);

  // Handle saving the products to the selected list
  const handleSaveList = async () => {
    if (!listData || !selectedListId) {
      Alert.alert('Warning', 'Please select a list to save the products.');
      return;
    }

    setLoading(true);
    try {
      for (const product of listData.products) {
        await addProduct({ ...product, list_id: selectedListId });
      }
      Alert.alert('Success', 'Products saved to the selected list.');
      router.back(); // Use router.back() to navigate back
    } catch (error) {
      Alert.alert('Error', 'Failed to save the products.');
      console.error('Save products error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!listData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        {listData.list.name}
      </Text>
      
      <FlatList
        data={listData.products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ProductCard {...item} />}
      />

      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 8 }}>
        Select a list to import products:
      </Text>
      <FlatList
        data={availableLists}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 10,
              backgroundColor: selectedListId === item.id ? '#6c5ce7' : '#dfe6e9',
              marginVertical: 5,
              borderRadius: 5,
            }}
            onPress={() => setSelectedListId(item.id)}
          >
            <Text style={{ color: selectedListId === item.id ? '#ffffff' : '#2d3436' }}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={{
          backgroundColor: '#0984e3',
          padding: 15,
          borderRadius: 5,
          marginTop: 20,
          alignItems: 'center',
        }}
        onPress={handleSaveList}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Save Products to Selected List</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ImportListScreen;
