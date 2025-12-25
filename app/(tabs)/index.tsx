import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { User, DollarSign, TrendingUp, Eye, LogOut } from 'lucide-react-native';
import {apiService} from '../../services/api';

interface ProfileData {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  organization_id: string;
  balance: number;
  created_at: string;
}

interface LedgerEntry {
  id: string;
  order_id: number;
  entry_type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_before: number;
  balance_after: number;
  notes: string;
  created_at: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllLedger, setShowAllLedger] = useState(false);
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const data = await apiService.getAdminProfile();
      setProfile(data);
    } catch (error) {
      Alert.alert('Error', 'Network error while fetching profile');
    }
  };


    const fetchLedger = async () => {
    try {
      const data = await apiService.getAdminLedger();
      setLedger(data);
    } catch (error) {
      Alert.alert('Error', 'Network error while fetching profile');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchLedger()]);
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } finally {
      router.replace('/login');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const displayedLedger = showAllLedger ? ledger : ledger.slice(0, 5);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back!</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={16} color="#B91C1C" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

        </View>

        {/* Profile Card */}
        {profile && (
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileIcon}>
                <User size={24} color="#3B82F6" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.username}>{profile.username}</Text>
                <Text style={styles.role}>{profile.role}</Text>
              </View>
            </View>
            
            <View style={styles.balanceContainer}>
              <View style={styles.balanceIcon}>
                <DollarSign size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceAmount}>
                  {formatCurrency(profile.balance)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Ledger Section */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeader}>
            <View style={styles.ledgerTitleContainer}>
              <TrendingUp size={20} color="#6366F1" />
              <Text style={styles.ledgerTitle}>Account Ledger</Text>
            </View>
            {ledger.length > 5 && (
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() => setShowAllLedger(!showAllLedger)}
              >
                <Eye size={16} color="#6366F1" />
                <Text style={styles.viewMoreText}>
                  {showAllLedger ? 'Show Less' : 'View More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {displayedLedger.length > 0 ? (
            <View style={styles.ledgerList}>
              {displayedLedger.map((entry, index) => (
                <View key={entry.id} style={styles.ledgerItem}>
                  <View style={styles.ledgerItemHeader}>
                    <View style={styles.ledgerItemLeft}>
                      <View
                        style={[
                          styles.entryTypeBadge,
                          entry.entry_type === 'CREDIT'
                            ? styles.creditBadge
                            : styles.debitBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.entryTypeText,
                            entry.entry_type === 'CREDIT'
                              ? styles.creditText
                              : styles.debitText,
                          ]}
                        >
                          {entry.entry_type}
                        </Text>
                      </View>
                      <Text style={styles.orderText}>Order #{entry.order_id}</Text>
                    </View>
                    <Text
                      style={[
                        styles.amountText,
                        entry.entry_type === 'CREDIT'
                          ? styles.creditAmount
                          : styles.debitAmount,
                      ]}
                    >
                      {entry.entry_type === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(entry.amount)}
                    </Text>
                  </View>
                  
                  <Text style={styles.notesText}>{entry.notes}</Text>
                  
                  <View style={styles.ledgerItemFooter}>
                    <Text style={styles.balanceText}>
                      Balance: {formatCurrency(entry.balance_before)} → {formatCurrency(entry.balance_after)}
                    </Text>
                    <Text style={styles.dateText}>
                      {formatDate(entry.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No ledger entries found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  profileCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  ledgerSection: {
    margin: 20,
    marginTop: 0,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ledgerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ledgerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginLeft: 4,
  },
  ledgerList: {
    gap: 12,
  },
  ledgerItem: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ledgerItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ledgerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  entryTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  creditBadge: {
    backgroundColor: '#DCFCE7',
  },
  debitBadge: {
    backgroundColor: '#FEE2E2',
  },
  entryTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  creditText: {
    color: '#16A34A',
  },
  debitText: {
    color: '#DC2626',
  },
  orderText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  creditAmount: {
    color: '#16A34A',
  },
  debitAmount: {
    color: '#DC2626',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  ledgerItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 12,
    color: '#64748B',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
  },
logoutButton: {
  position: 'absolute',
  top: 60,
  right: 20,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: '#FEE2E2',
  borderWidth: 1,
  borderColor: '#FCA5A5',
},

logoutText: {
  marginLeft: 6,
  fontSize: 14,
  fontWeight: '600',
  color: '#B91C1C',
},
});