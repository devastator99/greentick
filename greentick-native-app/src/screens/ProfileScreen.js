import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { updateBusinessProfile, getBusinessProfile } from '../api/api';

const ProfileScreen = () => {
  const { user, logout, updateUser } = useContext(AuthContext);

  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [businessWhatsapp, setBusinessWhatsapp] = useState(user?.business_whatsapp || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const profileData = await getBusinessProfile();
        if (profileData) {
          setBusinessName(profileData.business_name || '');
          setBusinessWhatsapp(profileData.business_whatsapp || '');
        }
      } catch (err) {
        setError('Failed to load profile data.');
      }
    };

    fetchBusinessData();
  }, []);

  const handleUpdate = async () => {
    setLoading(true);
    setError('');
    try {
      const updatedProfile = await updateBusinessProfile({ 
        business_name: businessName, 
        business_whatsapp: businessWhatsapp 
      });
      // Combine existing user data with updated business profile data
      const updatedUserData = { ...user, ...updatedProfile };
      updateUser(updatedUserData); 
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Profile</Text>
      
      <View style={styles.formContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.readOnlyInput]}
          value={user?.email}
          editable={false}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={[styles.input, styles.readOnlyInput]}
          value={user?.phone}
          editable={false}
        />

        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your Business Name"
          value={businessName}
          onChangeText={setBusinessName}
        />

        <Text style={styles.label}>Business WhatsApp</Text>
        <TextInput
          style={styles.input}
          placeholder="WhatsApp Business Number"
          value={businessWhatsapp}
          onChangeText={setBusinessWhatsapp}
          keyboardType="phone-pad"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }}/>
        ) : (
          <Button title="Save Changes" onPress={handleUpdate} />
        )}

        <View style={styles.logoutButtonContainer}>
            <Button title="Logout" onPress={logout} color="#dc3545" />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
  formContainer: { paddingHorizontal: 20 },
  label: { fontSize: 16, marginBottom: 8, color: '#333' },
  input: { height: 50, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, marginBottom: 20, paddingHorizontal: 12, backgroundColor: '#fff' },
  readOnlyInput: { backgroundColor: '#e9ecef' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 12 },
  logoutButtonContainer: { marginTop: 30, borderWidth: 1, borderColor: '#dc3545', borderRadius: 8 },
});

export default ProfileScreen;
