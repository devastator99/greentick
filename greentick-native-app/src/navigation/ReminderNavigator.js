import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RemindersScreen from '../screens/RemindersScreen';
import ReminderFormScreen from '../screens/ReminderFormScreen';

const Stack = createNativeStackNavigator();

const ReminderNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ReminderList" component={RemindersScreen} />
      <Stack.Screen
        name="ReminderForm"
        component={ReminderFormScreen}
        options={{
          headerShown: true,
          title: 'Reminder Details',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default ReminderNavigator;
