import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, getCurrentUser } from '../api/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for a stored token on app startup
    const loadStoredData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUser = await AsyncStorage.getItem('currentUser');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load auth data from storage', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredData();
  }, []);

  const login = async (email, password) => {
    try {
      const tokenData = await loginUser(email, password);
      const authToken = tokenData.access_token;

      setToken(authToken);
      await AsyncStorage.setItem('authToken', authToken);

      // After setting the token, apiRequest will use it automatically
      const userData = await getCurrentUser();
      setUser(userData);
      await AsyncStorage.setItem('currentUser', JSON.stringify(userData));

    } catch (error) {
      console.error('Login failed:', error);
      // Optionally re-throw or handle the error for the UI
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    try {
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem('authToken');
    } catch (e) {
      console.error('Failed to remove auth data from storage', e);
    }
  };

  const updateUser = async (newUserData) => {
    if (newUserData) {
      setUser(newUserData);
      try {
        await AsyncStorage.setItem('currentUser', JSON.stringify(newUserData));
      } catch (e) {
        console.error('Failed to save updated user data to storage', e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
