import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { addCustomer, updateCustomer } from '../api/api';

const CustomerFormScreen = ({ route, navigation }) => {
  const { customer, onGoBack } = route.params || {};
  const isEditing = !!customer;

  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Customer' : 'Add Customer' });
  }, [isEditing, navigation]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const customerData = { name, phone, notes };
      if (isEditing) {
        await updateCustomer(customer.id, customerData);
      } else {
        await addCustomer(customerData);
      }
      onGoBack(); // Refresh the list on the previous screen
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Failed to save customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Customer Name"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Additional notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title={isEditing ? 'Update Customer' : 'Add Customer'} onPress={handleSubmit} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
});

export default CustomerFormScreen;
