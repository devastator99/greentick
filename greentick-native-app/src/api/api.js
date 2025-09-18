import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://127.0.0.1:8000'; // Your FastAPI backend URL

// Helper to get the auth token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (e) {
    console.error('Failed to get auth token from storage', e);
    return null;
  }
};

// General API request function
export const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'An API error occurred');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Auth specific API calls
export const loginUser = async (email, password) => {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const body = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

  try {
    const response = await fetch(`${API_URL}/auth/token`, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    return data;
  } catch (error) {
    console.error('Login API Error:', error);
    throw error;
  }
};

export const signupUser = async (email, password, phone, businessName) => {
  return apiRequest('/auth/signup', 'POST', {
    email,
    password,
    phone,
    business_name: businessName,
    business_whatsapp: phone, // Assuming business WhatsApp is the same as phone for now
  });
};

// Dashboard
export const getDashboardStats = () => {
  // In a real-world app, this might be a single, optimized endpoint.
  return Promise.all([
    apiRequest('/customers/'),
    apiRequest('/reminders/?status=pending'),
    apiRequest('/payments/stats/summary'),
  ]);
};

export const getRecentActivity = () => {
  return Promise.all([
    apiRequest('/reminders/?limit=5'),
    apiRequest('/payments/?limit=5'),
  ]);
};

// Customers
export const getCustomers = () => apiRequest('/customers/');
export const addCustomer = (customerData) => apiRequest('/customers/', 'POST', customerData);
export const updateCustomer = (id, customerData) => apiRequest(`/customers/${id}`, 'PUT', customerData);
export const deleteCustomer = (id) => apiRequest(`/customers/${id}`, 'DELETE');

// Reminders
export const getReminders = () => apiRequest('/reminders/');
export const addReminder = (reminderData) => apiRequest('/reminders/', 'POST', reminderData);
export const updateReminder = (id, reminderData) => apiRequest(`/reminders/${id}`, 'PUT', reminderData);
export const deleteReminder = (id) => apiRequest(`/reminders/${id}`, 'DELETE');

// Payments
export const getPayments = () => apiRequest('/payments/');
export const addPayment = (paymentData) => apiRequest('/payments/', 'POST', paymentData);

// Profile
export const updateBusinessProfile = (profileData) => apiRequest('/auth/business-profile', 'PUT', profileData);

export const getCurrentUser = () => apiRequest('/auth/users/me');

export const getBusinessProfile = () => apiRequest('/auth/business-profile');

