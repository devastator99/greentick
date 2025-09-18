import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getCustomers, addReminder, updateReminder } from '../api/api';

const ReminderFormScreen = ({ route, navigation }) => {
  const { reminder, onGoBack } = route.params || {};
  const isEditing = !!reminder;

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(reminder?.customer_id || null);
  const [message, setMessage] = useState(reminder?.message || '');
  const [date, setDate] = useState(reminder ? new Date(reminder.send_time) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [frequency, setFrequency] = useState(reminder?.frequency || 'one_time');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Reminder' : 'Add Reminder' });
    getCustomers().then(setCustomers).catch(err => setError('Failed to load customers.'));
  }, [isEditing, navigation]);

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const reminderData = {
        customer_id: selectedCustomer,
        message,
        send_time: date.toISOString(),
        frequency,
      };

      if (isEditing) {
        await updateReminder(reminder.id, reminderData);
      } else {
        await addReminder(reminderData);
      }
      onGoBack();
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Failed to save reminder.');
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

      <Text style={styles.label}>Message</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Reminder message"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <Text style={styles.label}>Send Time</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
        <Text>{date.toLocaleString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Text style={styles.label}>Frequency</Text>
      <Picker
        selectedValue={frequency}
        onValueChange={(itemValue) => setFrequency(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="One-time" value="one_time" />
        <Picker.Item label="Daily" value="daily" />
        <Picker.Item label="Weekly" value="weekly" />
        <Picker.Item label="Monthly" value="monthly" />
      </Picker>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title={isEditing ? 'Update Reminder' : 'Schedule Reminder'} onPress={handleSubmit} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  label: { fontSize: 16, marginBottom: 8, color: '#333' },
  input: { height: 50, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, marginBottom: 20, paddingHorizontal: 12, backgroundColor: '#f8f9fa' },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  picker: { backgroundColor: '#f8f9fa', marginBottom: 20, borderWidth: 1, borderColor: '#ccc' },
  dateButton: { height: 50, justifyContent: 'center', paddingHorizontal: 12, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, marginBottom: 20, backgroundColor: '#f8f9fa' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 12 },
});

export default ReminderFormScreen;
