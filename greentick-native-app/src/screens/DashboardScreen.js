import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';
import { getDashboardStats, getRecentActivity } from '../api/api';
import StatCard from '../components/StatCard';

const DashboardScreen = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalCustomers: 0, activeReminders: 0, totalRevenue: 0, deliveryRate: 0 });
  const [recentReminders, setRecentReminders] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [customers, reminders, paymentStats] = await getDashboardStats();
      const [remindersActivity, paymentsActivity] = await getRecentActivity();

      setStats({
        totalCustomers: customers.length,
        activeReminders: reminders.length,
        totalRevenue: paymentStats.total_amount || 0,
        deliveryRate: paymentStats.completion_rate || 0,
      });
      setRecentReminders(remindersActivity);
      setRecentPayments(paymentsActivity);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderActivityItem = ({ item, type }) => (
    <View style={styles.activityItem}>
      <Text style={styles.activityText}>{type === 'reminder' ? item.message : item.description}</Text>
      <Text style={styles.activitySubText}>{type === 'reminder' ? `Status: ${item.status}` : `Amount: ₹${item.amount}`}</Text>
    </View>
  );

  if (loading && !refreshing) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.headerTitle}>Dashboard</Text>
      <Text style={styles.welcomeText}>Welcome, {user?.business_name || user?.email}</Text>

      <View style={styles.statsGrid}>
        <StatCard icon="ios-people" title="Total Customers" value={stats.totalCustomers} color="#17a2b8" />
        <StatCard icon="ios-notifications" title="Active Reminders" value={stats.activeReminders} color="#ffc107" />
        <StatCard icon="ios-card" title="Total Revenue" value={`₹${stats.totalRevenue.toFixed(2)}`} color="#28a745" />
        <StatCard icon="ios-send" title="Delivery Rate" value={`${stats.deliveryRate}%`} color="#dc3545" />
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Reminders</Text>
        <FlatList
          data={recentReminders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => renderActivityItem({ item, type: 'reminder' })}
          ListEmptyComponent={<Text style={styles.emptyText}>No recent reminders.</Text>}
        />
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>
        <FlatList
          data={recentPayments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => renderActivityItem({ item, type: 'payment' })}
          ListEmptyComponent={<Text style={styles.emptyText}>No recent payments.</Text>}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 5 },
  welcomeText: { fontSize: 18, color: '#6c757d', paddingHorizontal: 20, marginBottom: 20 },
  statsGrid: { paddingHorizontal: 15 },
  activitySection: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  activityItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  activityText: { fontSize: 16, fontWeight: '500' },
  activitySubText: { fontSize: 14, color: 'gray', marginTop: 4 },
  emptyText: { textAlign: 'center', color: 'gray', marginTop: 20 },
});

export default DashboardScreen;
