import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, User, Building2, Car, UserCircle, Filter } from 'lucide-react-native';
import { apiService } from '@/services/api';
import StatusBadge from '@/components/StatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import ActionSheet from '@/components/ActionSheet';

interface Account {
  id: string;
  name: string;
  account_type: 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver';
  account_status: string;
}

type AccountTypeFilter = 'all' | 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver';
type StatusFilter = 'all' | 'active' | 'inactive' | 'pending';

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  const fetchAccounts = async () => {
    try {
      setError(null);
      const accountTypeParam = accountTypeFilter !== 'all' ? accountTypeFilter : undefined;
      const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
      
      const data = await apiService.getAllAccounts(0, 100, accountTypeParam, statusParam);
      setAccounts(data.accounts);
      setTotalCount(data.total_count);
      setActiveCount(data.active_count);
      setInactiveCount(data.inactive_count);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [accountTypeFilter, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const handleStatusUpdate = async (status: string) => {
    if (!selectedAccount) return;
    
    try {
      // Determine the update method based on account type
      if (selectedAccount.account_type === 'vendor') {
        await apiService.updateVendorAccountStatus(selectedAccount.id, status);
      } else if (selectedAccount.account_type === 'vehicle_owner') {
        await apiService.updateVehicleOwnerAccountStatus(selectedAccount.id, status);
      } else if (selectedAccount.account_type === 'driver' || selectedAccount.account_type === 'quickdriver') {
        await apiService.updateDriverAccountStatus(selectedAccount.id, status);
      }
      
      // Refresh the accounts list
      fetchAccounts();
    } catch (error) {
      console.error('Failed to update account status:', error);
    } finally {
      setShowStatusSheet(false);
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusOptions = (accountType: string) => {
    if (accountType === 'vendor' || accountType === 'vehicle_owner') {
      return [
        { label: 'Active', value: 'ACTIVE', color: '#10B981' },
        { label: 'Inactive', value: 'INACTIVE', color: '#EF4444' },
        { label: 'Pending', value: 'PENDING', color: '#F59E0B' },
      ];
    } else {
      // Driver statuses
      return [
        { label: 'Online', value: 'ONLINE', color: '#10B981' },
        { label: 'Offline', value: 'OFFLINE', color: '#6B7280' },
        { label: 'Driving', value: 'DRIVING', color: '#3B82F6' },
        { label: 'Blocked', value: 'BLOCKED', color: '#EF4444' },
        { label: 'Processing', value: 'PROCESSING', color: '#F59E0B' },
      ];
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'vendor':
        return <Building2 size={20} color="#3B82F6" />;
      case 'vehicle_owner':
        return <Car size={20} color="#10B981" />;
      case 'driver':
      case 'quickdriver':
        return <UserCircle size={20} color="#8B5CF6" />;
      default:
        return <User size={20} color="#6B7280" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'vendor':
        return 'Vendor';
      case 'vehicle_owner':
        return 'Vehicle Owner';
      case 'driver':
        return 'Driver';
      case 'quickdriver':
        return 'Quick Driver';
      default:
        return type;
    }
  };

  const renderAccountItem = ({ item }: { item: Account }) => (
    <TouchableOpacity
      style={styles.accountCard}
      onLongPress={() => {
        setSelectedAccount(item);
        setShowStatusSheet(true);
      }}
    >
      <View style={styles.accountHeader}>
        <View style={styles.accountInfo}>
          <View style={styles.accountTypeRow}>
            {getAccountTypeIcon(item.account_type)}
            <Text style={styles.accountTypeLabel}>
              {getAccountTypeLabel(item.account_type)}
            </Text>
          </View>
          <Text style={styles.accountName}>{item.name}</Text>
          <Text style={styles.accountId}>ID: {item.id}</Text>
        </View>
        <StatusBadge status={item.account_status} />
      </View>
    </TouchableOpacity>
  );

  const accountTypeOptions = [
    { label: 'All Types', value: 'all' },
    { label: 'Vendors', value: 'vendor' },
    { label: 'Vehicle Owners', value: 'vehicle_owner' },
    { label: 'Drivers', value: 'driver' },
    { label: 'Quick Drivers', value: 'quickdriver' },
  ];

  const statusFilterOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Pending', value: 'pending' },
  ];

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
        <Text style={styles.subtitle}>
          {totalCount} total • {activeCount} active • {inactiveCount} inactive
        </Text>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterChip}>
            <Filter size={16} color="#6B7280" />
            <Text style={styles.filterLabel}>Type:</Text>
            <Text style={styles.filterValue}>
              {accountTypeOptions.find(opt => opt.value === accountTypeFilter)?.label || 'All'}
            </Text>
          </View>
          <View style={styles.filterChip}>
            <Filter size={16} color="#6B7280" />
            <Text style={styles.filterLabel}>Status:</Text>
            <Text style={styles.filterValue}>
              {statusFilterOptions.find(opt => opt.value === statusFilter)?.label || 'All'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search accounts by name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterButtons}>
        <FlatList
          horizontal
          data={accountTypeOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                accountTypeFilter === item.value && styles.filterButtonActive,
              ]}
              onPress={() => setAccountTypeFilter(item.value as AccountTypeFilter)}
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

      <View style={styles.filterButtons}>
        <FlatList
          horizontal
          data={statusFilterOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === item.value && styles.filterButtonActive,
              ]}
              onPress={() => setStatusFilter(item.value as StatusFilter)}
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

      {selectedAccount && (
        <ActionSheet
          visible={showStatusSheet}
          onClose={() => setShowStatusSheet(false)}
          title={`Update ${getAccountTypeLabel(selectedAccount.account_type)} Status`}
          options={getStatusOptions(selectedAccount.account_type)}
          onSelect={handleStatusUpdate}
        />
      )}
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
  filtersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filterButtons: {
    marginBottom: 12,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accountInfo: {
    flex: 1,
    gap: 8,
  },
  accountTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  accountId: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
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

