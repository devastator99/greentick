import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCustomers, deleteCustomer } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const CustomersScreen = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      Alert.alert('Error', 'Failed to fetch customers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCustomers();
    }, [fetchCustomers])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(id);
              fetchCustomers(); // Refresh list
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer.');
            }
          },
        },
      ]
    );
  };

  const filteredCustomers = useMemo(() =>
    customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
    ),
    [customers, searchQuery]
  );

  const renderItem = ({ item }) => (
    <View style={styles.customerItem}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerPhone}>{item.phone}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.navigate('CustomerForm', { customer: item, onGoBack: fetchCustomers })}>
          <Ionicons name="create-outline" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 16 }}>
          <Ionicons name="trash-outline" size={24} color="#dc3545" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Customers</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or phone..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No customers found.</Text>}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CustomerForm', { onGoBack: fetchCustomers })}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 10 },
  searchInput: {
    height: 50,
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: 'bold' },
  customerPhone: { fontSize: 14, color: 'gray', marginTop: 4 },
  actions: { flexDirection: 'row' },
  emptyText: { textAlign: 'center', color: 'gray', marginTop: 50 },
  fab: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
});

export default CustomersScreen;
