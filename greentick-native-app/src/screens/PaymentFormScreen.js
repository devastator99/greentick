import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getCustomers, addPayment } from '../api/api';

const PaymentFormScreen = ({ route, navigation }) => {
  const { onGoBack } = route.params || {};

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sendLink, setSendLink] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: 'Create Payment' });
    getCustomers().then(setCustomers).catch(err => setError('Failed to load customers.'));
  }, [navigation]);

  const handleSubmit = async () => {
    if (!selectedCustomer || !amount) {
      setError('Please select a customer and enter an amount.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const paymentData = {
        customer_id: selectedCustomer,
        amount: parseFloat(amount),
        description,
        send_payment_link: sendLink,
      };

      await addPayment(paymentData);
      onGoBack();
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Failed to create payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Customer</Text>
      <Picker
        selectedValue={selectedCustomer}
        onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Select a customer..." value={null} />
        {customers.map(c => (
          <Picker.Item key={c.id} label={c.name} value={c.id} />
        ))}
      </Picker>

      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Payment description"
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.switchContainer}>
        <Text style={styles.label}>Send payment link via WhatsApp</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={sendLink ? "#007bff" : "#f4f3f4"}
          onValueChange={setSendLink}
          value={sendLink}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title="Create Payment" onPress={handleSubmit} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  label: { fontSize: 16, marginBottom: 8, color: '#333' },
  input: { height: 50, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, marginBottom: 20, paddingHorizontal: 12, backgroundColor: '#f8f9fa' },
  picker: { backgroundColor: '#f8f9fa', marginBottom: 20, borderWidth: 1, borderColor: '#ccc' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 12 },
});

export default PaymentFormScreen;
