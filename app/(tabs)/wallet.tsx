import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Phone, User, Wallet, Camera } from 'lucide-react-native';
import { apiService } from '@/services/api';
import StatusBadge from '@/components/StatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';

interface VehicleOwner {
  vehicle_owner_id: string;
  full_name: string;
  primary_number: string;
  secondary_number?: string;
  wallet_balance: number;
  aadhar_number: string;
  address: string;
  city: string;
  pincode: string;
  account_status: string;
}

export default function WalletScreen() {
  const [searchNumber, setSearchNumber] = useState('');
  const [foundOwner, setFoundOwner] = useState<VehicleOwner | null>(null);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [adding, setAdding] = useState(false);

  const handleSearch = async () => {
    if (!searchNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    setSearching(true);
    try {
      const owner = await apiService.searchVehicleOwner(searchNumber.trim());
      setFoundOwner(owner);
    } catch (error) {
      Alert.alert('Not Found', 'Vehicle owner not found with this number');
      setFoundOwner(null);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMoney = async () => {
    if (!foundOwner) {
      Alert.alert('Error', 'No vehicle owner selected');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setAdding(true);
    try {
      const formData = new FormData();
      formData.append('vehicle_owner_id', foundOwner.vehicle_owner_id);
      formData.append('transaction_value', amountInPaise.toString());
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      if (reference.trim()) {
        formData.append('reference_value', reference.trim());
      }

      const result = await apiService.addMoneyToVehicleOwner(formData);
      
      Alert.alert(
        'Success',
        `₹${amount} added successfully to ${foundOwner.full_name}'s wallet`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAmount('');
              setNotes('');
              setReference('');
              setFoundOwner(null);
              setSearchNumber('');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add money. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount).toLocaleString('en-IN')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Wallet Management</Text>
            <Text style={styles.subtitle}>Add money to vehicle owner wallets</Text>
          </View>

          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>Search Vehicle Owner</Text>
            
            <View style={styles.searchContainer}>
              <Phone size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter phone number"
                value={searchNumber}
                onChangeText={setSearchNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <LoadingSpinner size="small" color="white" />
                ) : (
                  <Search size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {foundOwner && (
              <View style={styles.ownerCard}>
                <View style={styles.ownerHeader}>
                  <View style={styles.ownerInfo}>
                    <Text style={styles.ownerName}>{foundOwner.full_name}</Text>
                    <StatusBadge status={foundOwner.account_status} />
                  </View>
                  <View style={styles.walletInfo}>
                    <Text style={styles.walletLabel}>Current Balance</Text>
                    <Text style={styles.walletBalance}>
                      {formatCurrency(foundOwner.wallet_balance)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.ownerDetails}>
                  <View style={styles.detailItem}>
                    <Phone size={16} color="#6B7280" />
                    <Text style={styles.detailText}>Primary Number : {foundOwner.primary_number}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <User size={16} color="#6B7280" />
                    <Text style={styles.detailText}>Aadhar: {foundOwner.aadhar_number}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <User size={16} color="#6B7280" />
                    <Text style={styles.detailText}>Address : {foundOwner.address}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <User size={16} color="#6B7280" />
                    <Text style={styles.detailText}>City: {foundOwner.city}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <User size={16} color="#6B7280" />
                    <Text style={styles.detailText}>Pincode : {foundOwner.pincode}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {foundOwner && (
            <View style={styles.addMoneySection}>
              <Text style={styles.sectionTitle}>Add Money</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reference (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Payment reference"
                  value={reference}
                  onChangeText={setReference}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  placeholder="Transaction notes"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity 
                style={[styles.addButton, adding && styles.addButtonDisabled]}
                onPress={handleAddMoney}
                disabled={adding}
              >
                {adding ? (
                  <LoadingSpinner size="small" color="white" />
                ) : (
                  <>
                    <Plus size={20} color="white" />
                    <Text style={styles.addButtonText}>Add Money</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  searchSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    height: 44,
  },
  ownerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  ownerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ownerInfo: {
    flex: 1,
    gap: 8,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  walletInfo: {
    alignItems: 'flex-end',
  },
  walletLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  ownerDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  addMoneySection: {
    padding: 20,
    paddingTop: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});