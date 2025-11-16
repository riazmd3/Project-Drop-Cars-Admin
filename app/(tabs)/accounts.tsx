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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Building2, Car, UserCircle, FileText } from 'lucide-react-native';
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
}

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

  const handleAccountPress = (account: Account) => {
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

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        return 'Driver';
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
    
    return (
      <TouchableOpacity
        style={[
          styles.accountCard,
          isInactive && styles.accountCardInactive,
        ]}
        onPress={() => handleAccountPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.accountContent}>
          <View style={styles.accountInfo}>
            <View style={styles.accountTypeRow}>
              {getAccountTypeIcon(item.account_type)}
              <Text style={styles.accountTypeLabel}>
                {getAccountTypeLabel(item.account_type)}
              </Text>
            </View>
            <Text style={styles.accountName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.accountId} numberOfLines={1}>ID: {item.id}</Text>
          </View>

          <View style={styles.accountActions}>
            {item.account_type !== 'car' && (
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={() => handleAccountPress(item)}
              >
                <FileText size={14} color="#3B82F6" />
              </TouchableOpacity>
            )}
            
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>{statusLabel}</Text>
              <Switch
                value={toggleValue}
                onValueChange={(value) => handleToggleStatus(item, value)}
                disabled={isUpdating}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={toggleValue ? '#FFFFFF' : '#9CA3AF'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
          placeholder="Search by name or ID..."
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
            { label: 'Quick Drivers', value: 'quickdriver' },
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
  accountContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  accountId: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verifyButton: {
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  toggleContainer: {
    alignItems: 'center',
    gap: 4,
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
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
