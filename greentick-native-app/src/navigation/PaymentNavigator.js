import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PaymentsScreen from '../screens/PaymentsScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';

const Stack = createNativeStackNavigator();

const PaymentNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="PaymentList" component={PaymentsScreen} />
      <Stack.Screen
        name="PaymentForm"
        component={PaymentFormScreen}
        options={{
          headerShown: true,
          title: 'Create Payment',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default PaymentNavigator;
