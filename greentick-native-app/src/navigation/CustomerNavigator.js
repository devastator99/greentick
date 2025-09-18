import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';

const Stack = createNativeStackNavigator();

const CustomerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use the header from the screen components
      }}
    >
      <Stack.Screen name="CustomerList" component={CustomersScreen} />
      <Stack.Screen
        name="CustomerForm"
        component={CustomerFormScreen}
        options={{
          headerShown: true, // Show header for the form screen
          title: 'Customer Details',
          presentation: 'modal', // Optional: makes it feel like a modal
        }}
      />
    </Stack.Navigator>
  );
};

export default CustomerNavigator;
