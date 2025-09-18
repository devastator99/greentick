import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPayments } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const PaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      const data = await getPayments();
      setPayments(data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      Alert.alert('Error', 'Failed to fetch payments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPayments();
    }, [fetchPayments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const filteredPayments = useMemo(() =>
    payments.filter(payment =>
      payment.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [payments, searchQuery]
  );

  const renderItem = ({ item }) => (
    <View style={styles.paymentItem}>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentDescription}>{item.description}</Text>
        <Text style={styles.paymentAmount}>₹{item.amount.toFixed(2)}</Text>
        <Text style={styles.paymentDetails}>Status: {item.status}</Text>
        <Text style={styles.paymentDetails}>Date: {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => Alert.alert('Info', 'Viewing payment details is not yet implemented.')}>
          <Ionicons name="eye-outline" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Payments</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by description..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={filteredPayments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No payments found.</Text>}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('PaymentForm', { onGoBack: fetchPayments })}
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
  paymentItem: {
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
  paymentInfo: { flex: 1 },
  paymentDescription: { fontSize: 16, fontWeight: 'bold' },
  paymentAmount: { fontSize: 16, color: '#28a745', fontWeight: '600', marginVertical: 4 },
  paymentDetails: { fontSize: 14, color: 'gray' },
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

export default PaymentsScreen;
