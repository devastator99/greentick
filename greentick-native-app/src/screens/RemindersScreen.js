import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getReminders, deleteReminder } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const RemindersScreen = ({ navigation }) => {
  const [reminders, setReminders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      const data = await getReminders();
      setReminders(data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      Alert.alert('Error', 'Failed to fetch reminders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReminders();
    }, [fetchReminders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReminders();
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(id);
              fetchReminders(); // Refresh list
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reminder.');
            }
          },
        },
      ]
    );
  };

  const filteredReminders = useMemo(() =>
    reminders.filter(reminder =>
      reminder.message.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [reminders, searchQuery]
  );

  const renderItem = ({ item }) => (
    <View style={styles.reminderItem}>
      <View style={styles.reminderInfo}>
        <Text style={styles.reminderMessage}>{item.message}</Text>
        <Text style={styles.reminderDetails}>Status: {item.status} | Freq: {item.frequency}</Text>
        <Text style={styles.reminderDetails}>Send Time: {new Date(item.send_time).toLocaleString()}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.navigate('ReminderForm', { reminder: item, onGoBack: fetchReminders })}>
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
      <Text style={styles.headerTitle}>Reminders</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by message..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={filteredReminders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No reminders found.</Text>}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ReminderForm', { onGoBack: fetchReminders })}
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
  reminderItem: {
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
  reminderInfo: { flex: 1, marginBottom: 10 },
  reminderMessage: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  reminderDetails: { fontSize: 14, color: 'gray' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f1f1', paddingTop: 10, marginTop: 5 },
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

export default RemindersScreen;
