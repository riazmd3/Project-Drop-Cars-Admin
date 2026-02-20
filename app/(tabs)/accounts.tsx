import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Switch,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Building2, Car, UserCircle, FileText, Info, Power } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

interface Account {
  id: string;
  name: string;
  account_type: 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver' | 'car';
  account_status: string;
  driver_status?: string; // For drivers and quickdrivers
  primary_number?: string; // Mobile number
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'N/A';
  }
  return `₹${Number(value).toFixed(2)}`;
};

export default function AccountsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [accountDetails, setAccountDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [accountMobileNumbers, setAccountMobileNumbers] = useState<Record<string, string>>({});

  const fetchAccounts = async () => {
    try {
      setError(null);
      const accountTypeParam = accountTypeFilter !== 'all' ? accountTypeFilter : undefined;
      const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
      
      const data = await apiService.getAllAccounts(0, 100, accountTypeParam, statusParam);
      
      // Sort accounts: inactive/pending/blocked first, then active/online
      const sortedAccounts = [...data.accounts].sort((a, b) => {
        const aStatus = getStatusForAccount(a);
        const bStatus = getStatusForAccount(b);
        const aInactive = isInactiveStatus(aStatus, a.account_type);
        const bInactive = isInactiveStatus(bStatus, b.account_type);
        
        if (aInactive && !bInactive) return -1;
        if (!aInactive && bInactive) return 1;
        return 0;
      });
      
      setAccounts(sortedAccounts);
      
      // Fetch mobile numbers for non-car accounts in the background (non-blocking)
      // This runs asynchronously without blocking the UI
      (async () => {
        const mobileNumberPromises = sortedAccounts
          .filter(acc => acc.account_type !== 'car' && !accountMobileNumbers[acc.id])
          .slice(0, 20) // Limit to first 20 to avoid too many requests
          .map(async (account) => {
            try {
              const details = await apiService.getAccountDetails(
                account.id,
                account.account_type as 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver'
              );
              const accountData = details.vendor || details.vehicle_owner || details.driver || details.quickdriver || details;
              return {
                id: account.id,
                mobile: accountData?.primary_number || ''
              };
            } catch (error) {
              return { id: account.id, mobile: '' };
            }
          });
        
        const mobileNumbers = await Promise.all(mobileNumberPromises);
        const mobileMap = mobileNumbers.reduce((acc, item) => {
          if (item.mobile) {
            acc[item.id] = item.mobile;
          }
          return acc;
        }, {} as Record<string, string>);
        
        if (Object.keys(mobileMap).length > 0) {
          setAccountMobileNumbers(prev => ({ ...prev, ...mobileMap }));
        }
      })();
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusForAccount = (account: Account): string => {
    // For drivers and quickdrivers, use driver_status
    if (account.account_type === 'driver' || account.account_type === 'quickdriver') {
      return account.driver_status || account.account_status || 'BLOCKED';
    }
    // For vendors and vehicle_owners, use account_status
    return account.account_status || 'Inactive';
  };

  const isInactiveStatus = (status: string, accountType: string): boolean => {
    if (accountType === 'vendor' || accountType === 'vehicle_owner') {
      return status === 'INACTIVE' || status === 'Inactive' || status === 'PENDING';
    } else if (accountType === 'driver' || accountType === 'quickdriver') {
      return status === 'BLOCKED' || status === 'OFFLINE' || status === 'PROCESSING';
    }
    return false;
  };

  const isActiveStatus = (status: string, accountType: string): boolean => {
    if (accountType === 'vendor' || accountType === 'vehicle_owner') {
      return status === 'ACTIVE' || status === 'Active';
    } else if (accountType === 'driver' || accountType === 'quickdriver') {
      return status === 'ONLINE' || status === 'DRIVING';
    }
    return false;
  };

  const getToggleStatus = (account: Account): boolean => {
    const status = getStatusForAccount(account);
    return isActiveStatus(status, account.account_type);
  };

  const getTargetStatus = (account: Account, toggleValue: boolean): string => {
    if (account.account_type === 'vendor' || account.account_type === 'vehicle_owner') {
      return toggleValue ? 'Active' : 'Inactive';
    } else if (account.account_type === 'driver' || account.account_type === 'quickdriver') {
      return toggleValue ? 'ONLINE' : 'BLOCKED';
    }
    return toggleValue ? 'Active' : 'Inactive';
  };

  const handleToggleStatus = async (account: Account, newValue: boolean) => {
    const newStatus = getTargetStatus(account, newValue);
    
    // Ensure account ID is a string
    const accountId = String(account.id);
    
    // Optimistically update UI
    setAccounts(accounts.map(acc => {
      if (acc.id === account.id) {
        if (account.account_type === 'driver' || account.account_type === 'quickdriver') {
          return { ...acc, driver_status: newStatus };
        } else {
          return { ...acc, account_status: newStatus };
        }
      }
      return acc;
    }));

    setUpdatingStatus(prev => new Set(prev).add(account.id));

    try {
      await apiService.updateAccountStatus(accountId, account.account_type, newStatus);
      // Refresh to get accurate data
      await fetchAccounts();
    } catch (error: any) {
      // Revert on error
      setAccounts(accounts.map(acc => {
        if (acc.id === account.id) {
          return account; // Restore original account object
        }
        return acc;
      }));
      
      Alert.alert('Error', error?.message || 'Failed to update account status');
    } finally {
      setUpdatingStatus(prev => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [accountTypeFilter, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const handleDocumentPress = (account: Account) => {
    // Only navigate to documents for non-car accounts
    if (account.account_type !== 'car') {
      router.push({
        pathname: '/account-documents',
        params: {
          accountId: account.id,
          accountType: account.account_type,
          accountName: account.name,
        },
      });
    }
  };

  const handleInfoPress = async (account: Account) => {
    // Only show info for non-car accounts
    if (account.account_type === 'car') {
      Alert.alert('Info', 'Car accounts do not have detailed information available.');
      return;
    }

    setSelectedAccount(account);
    setShowInfoModal(true);
    setLoadingDetails(true);
    setAccountDetails(null);

    try {
      const details = await apiService.getAccountDetails(
        account.id,
        account.account_type as 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver'
      );
      setAccountDetails(details);
      
      // Store mobile number if available
      const accountData = details.vendor || details.vehicle_owner || details.driver || details.quickdriver || details;
      if (accountData?.primary_number) {
        setAccountMobileNumbers(prev => ({
          ...prev,
          [account.id]: accountData.primary_number
        }));
      }
    } catch (error: any) {
      console.error('Failed to fetch account details:', error);
      Alert.alert('Error', error?.message || 'Failed to load account details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchQuery.toLowerCase();
    const mobileNumber = accountMobileNumbers[account.id] || account.primary_number || '';
    return (
      account.name.toLowerCase().includes(searchLower) ||
      account.id.toLowerCase().includes(searchLower) ||
      mobileNumber.toLowerCase().includes(searchLower)
    );
  });

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'vendor':
        return <Building2 size={18} color="#3B82F6" />;
      case 'vehicle_owner':
        return <Car size={18} color="#10B981" />;
      case 'driver':
      case 'quickdriver':
        return <UserCircle size={18} color="#8B5CF6" />;
      case 'car':
        return <Car size={18} color="#F59E0B" />;
      default:
        return <UserCircle size={18} color="#6B7280" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'vendor':
        return 'Vendor';
      case 'vehicle_owner':
        return 'Driver';
      case 'driver':
        return 'Duty Driver';
      case 'quickdriver':
        return 'Quick Driver';
      case 'car':
        return 'Car';
      default:
        return type;
    }
  };

  const getStatusLabel = (account: Account): string => {
    const status = getStatusForAccount(account);
    if (account.account_type === 'vendor' || account.account_type === 'vehicle_owner') {
      if (status === 'Active' || status === 'ACTIVE') return 'Active';
      return 'Inactive';
    } else if (account.account_type === 'driver' || account.account_type === 'quickdriver') {
      if (status === 'ONLINE' || status === 'DRIVING') return 'Online';
      return 'Blocked';
    }
    return status;
  };

  const renderAccountItem = ({ item }: { item: Account }) => {
    const status = getStatusForAccount(item);
    const isInactive = isInactiveStatus(status, item.account_type);
    const isUpdating = updatingStatus.has(item.id);
    const toggleValue = getToggleStatus(item);
    const statusLabel = getStatusLabel(item);
    const mobileNumber = accountMobileNumbers[item.id] || item.primary_number || '';
    
    return (
      <View
        style={[
          styles.accountCard,
          isInactive && styles.accountCardInactive,
        ]}
      >
        {/* Top Line: Name and Mobile Number */}
        <View style={styles.accountTopLine}>
          <View style={styles.accountTypeRow}>
            {getAccountTypeIcon(item.account_type)}
            <Text style={styles.accountTypeLabel}>
              {getAccountTypeLabel(item.account_type)}
            </Text>
          </View>
          <View style={styles.accountNameMobileContainer}>
            <Text style={styles.accountName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            {mobileNumber ? (
              <Text style={styles.accountMobile} numberOfLines={1} ellipsizeMode="tail">
                {mobileNumber}
              </Text>
            ) : (
              <Text style={styles.accountId} numberOfLines={1} ellipsizeMode="tail">
                ID: {item.id}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Line: Three Buttons */}
        <View style={styles.accountActions}>
          {/* Info Button */}
          {item.account_type !== 'car' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleInfoPress(item)}
            >
              <Info size={16} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Info</Text>
            </TouchableOpacity>
          )}

          {/* Document Button */}
          {item.account_type !== 'car' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDocumentPress(item)}
            >
              <FileText size={16} color="#10B981" />
              <Text style={styles.actionButtonText}>Document</Text>
            </TouchableOpacity>
          )}

          {/* Toggle Button */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleToggleStatus(item, !toggleValue)}
            disabled={isUpdating}
          >
            <Power size={16} color={toggleValue ? "#10B981" : "#6B7280"} />
            <Text style={[styles.toggleButtonText, { color: toggleValue ? "#10B981" : "#6B7280" }]}>
              {statusLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAccountDetailsModal = () => {
    if (!selectedAccount || !showInfoModal) return null;

    const account = accountDetails ? (accountDetails.vendor || accountDetails.vehicle_owner || accountDetails.driver || accountDetails.quickdriver || accountDetails) : null;

    return (
      <Modal
        visible={showInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Account Details</Text>
            <TouchableOpacity
              onPress={() => setShowInfoModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          {loadingDetails ? (
            <View style={styles.modalLoadingContainer}>
              <LoadingSpinner />
            </View>
          ) : account ? (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Basic Information</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{account.full_name || account.name || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID:</Text>
                  <Text style={styles.detailValue}>{account.id || account.vendor_id || account.vehicle_owner_id || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Type:</Text>
                  <Text style={styles.detailValue}>{getAccountTypeLabel(selectedAccount.account_type)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: getStatusForAccount(selectedAccount) === 'ACTIVE' || getStatusForAccount(selectedAccount) === 'ONLINE' ? '#10B981' : '#EF4444' }]}>
                    {getStatusLabel(selectedAccount)}
                  </Text>
                </View>

                {account.primary_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Primary Number:</Text>
                    <Text style={styles.detailValue}>{account.primary_number}</Text>
                  </View>
                )}

                {account.secondary_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Secondary Number:</Text>
                    <Text style={styles.detailValue}>{account.secondary_number}</Text>
                  </View>
                )}

                {account.aadhar_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Aadhar Number:</Text>
                    <Text style={styles.detailValue}>{account.aadhar_number}</Text>
                  </View>
                )}

                {account.licence_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Licence Number:</Text>
                    <Text style={styles.detailValue}>{account.licence_number}</Text>
                  </View>
                )}

                {account.gpay_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>GPay Number:</Text>
                    <Text style={styles.detailValue}>{account.gpay_number}</Text>
                  </View>
                )}

                {account.address && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{account.address}</Text>
                  </View>
                )}

                {account.city && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>City:</Text>
                    <Text style={styles.detailValue}>{account.city}</Text>
                  </View>
                )}

                {account.pincode && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pincode:</Text>
                    <Text style={styles.detailValue}>{account.pincode}</Text>
                  </View>
                )}

                {account.wallet_balance !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Wallet Balance:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(account.wallet_balance)}</Text>
                  </View>
                )}

                {account.bank_balance !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bank Balance:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(account.bank_balance)}</Text>
                  </View>
                )}

                {account.created_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created At:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(account.created_at).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Cars Section for Vehicle Owners */}
              {accountDetails.cars && accountDetails.cars.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Cars ({accountDetails.cars.length})</Text>
                  {accountDetails.cars.map((car: any, index: number) => (
                    <View key={car.id || index} style={styles.carCard}>
                      <Text style={styles.carName}>{car.car_name}</Text>
                      <Text style={styles.carDetails}>
                        {car.car_type} • {car.car_number} • {car.year_of_the_car}
                      </Text>
                      <Text style={styles.carStatus}>Status: {car.car_status}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Drivers Section for Vehicle Owners */}
              {accountDetails.drivers && accountDetails.drivers.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Drivers ({accountDetails.drivers.length})</Text>
                  {accountDetails.drivers.map((driver: any, index: number) => (
                    <View key={driver.id || index} style={styles.driverCard}>
                      <Text style={styles.driverName}>{driver.full_name}</Text>
                      <Text style={styles.driverDetails}>
                        {driver.primary_number} • {driver.licence_number}
                      </Text>
                      <Text style={styles.driverStatus}>Status: {driver.driver_status}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.modalLoadingContainer}>
              <Text style={styles.emptyText}>No account details available</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchAccounts} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <Text style={styles.subtitle}>{accounts.length} total accounts</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, mobile number, or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Account Type Filters */}
      <View style={styles.filterButtons}>
        <FlatList
          horizontal
          data={[
            { label: 'All Types', value: 'all' },
            { label: 'Vendors', value: 'vendor' },
            { label: 'Drivers', value: 'vehicle_owner' },
            { label: 'Duty Drivers', value: 'quickdriver' },
          ]}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                accountTypeFilter === item.value && styles.filterButtonActive,
              ]}
              onPress={() => setAccountTypeFilter(item.value as any)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  accountTypeFilter === item.value && styles.filterButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterButtonsContainer}
        />
      </View>

      {/* Status Filters */}
      <View style={styles.filterButtons}>
        <FlatList
          horizontal
          data={[
            { label: 'All Statuses', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
            { label: 'Pending', value: 'pending' },
          ]}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === item.value && styles.filterButtonActive,
              ]}
              onPress={() => setStatusFilter(item.value as any)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === item.value && styles.filterButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterButtonsContainer}
        />
      </View>

      <FlatList
        data={filteredAccounts}
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No accounts found</Text>
          </View>
        }
      />

      {renderAccountDetailsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  filterButtons: {
    marginBottom: 8,
  },
  filterButtonsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  accountCardInactive: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  accountTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  accountNameMobileContainer: {
    flex: 1,
    gap: 4,
  },
  accountInfo: {
    flex: 1,
    gap: 6,
    marginRight: 12,
  },
  accountTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  accountMobile: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  accountId: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 2,
    textAlign: 'right',
  },
  carCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  carName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  carDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  carStatus: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  driverCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  driverDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  driverStatus: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
