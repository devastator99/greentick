import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import CustomerNavigator from './CustomerNavigator';
import ReminderNavigator from './ReminderNavigator';
import PaymentNavigator from './PaymentNavigator';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'ios-stats-chart' : 'ios-stats-chart-outline';
          } else if (route.name === 'Customers') {
            iconName = focused ? 'ios-people' : 'ios-people-outline';
          } else if (route.name === 'Reminders') {
            iconName = focused ? 'ios-notifications' : 'ios-notifications-outline';
          } else if (route.name === 'Payments') {
            iconName = focused ? 'ios-card' : 'ios-card-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'ios-person-circle' : 'ios-person-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomerNavigator} />
      <Tab.Screen name="Reminders" component={ReminderNavigator} />
      <Tab.Screen name="Payments" component={PaymentNavigator} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
