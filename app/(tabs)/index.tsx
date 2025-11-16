import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Car, CreditCard, TrendingUp, Clock, Wallet, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface DashboardStats {
  totalVendors: number;
  totalVehicleOwners: number;
  pendingTransfers: number;
  totalTransferAmount: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalVendors: 0,
    totalVehicleOwners: 0,
    pendingTransfers: 0,
    totalTransferAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [vendorsData, vehicleOwnersData, transfersData] = await Promise.all([
        apiService.getAllAccounts(0, 1, 'vendor'),
        apiService.getAllAccounts(0, 1, 'vehicle_owner'),
        apiService.getPendingTransfers(0, 100),
      ]);

      const totalTransferAmount = transfersData.transactions.reduce(
        (sum: number, transaction: any) => sum + transaction.requested_amount,
        0
      );

      setStats({
        totalVendors: vendorsData.total_count,
        totalVehicleOwners: vehicleOwnersData.total_count,
        pendingTransfers: transfersData.total_count,
        totalTransferAmount,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome to the admin panel</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <View style={styles.statIcon}>
              <Users size={24} color="#3B82F6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.totalVendors}</Text>
              <Text style={styles.statLabel}>Total Vendors</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.successCard]}>
            <View style={styles.statIcon}>
              <Car size={24} color="#10B981" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.totalVehicleOwners}</Text>
              <Text style={styles.statLabel}>Vehicle Owners</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.warningCard]}>
            <View style={styles.statIcon}>
              <Clock size={24} color="#F59E0B" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.pendingTransfers}</Text>
              <Text style={styles.statLabel}>Pending Transfers</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.trendCard]}>
            <View style={styles.statIcon}>
              <TrendingUp size={24} color="#8B5CF6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{formatCurrency(stats.totalTransferAmount)}</Text>
              <Text style={styles.statLabel}>Transfer Amount</Text>
            </View>
          </View>
        </View>

        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>Quick Navigation</Text>
          <View style={styles.navigationGrid}>
            <TouchableOpacity 
              style={styles.navBox}
              onPress={() => router.push('/(tabs)/accounts')}
            >
              <View style={[styles.navIconContainer, { backgroundColor: '#EFF6FF' }]}>
                <Users size={28} color="#3B82F6" />
              </View>
              <Text style={styles.navLabel}>Accounts</Text>
              <ChevronRight size={20} color="#9CA3AF" style={styles.navArrow} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navBox}
              onPress={() => router.push('/(tabs)/cars')}
            >
              <View style={[styles.navIconContainer, { backgroundColor: '#F0FDF4' }]}>
                <Car size={28} color="#10B981" />
              </View>
              <Text style={styles.navLabel}>Cars</Text>
              <ChevronRight size={20} color="#9CA3AF" style={styles.navArrow} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navBox}
              onPress={() => router.push('/(tabs)/transfers')}
            >
              <View style={[styles.navIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <CreditCard size={28} color="#F59E0B" />
              </View>
              <Text style={styles.navLabel}>Transfers</Text>
              <ChevronRight size={20} color="#9CA3AF" style={styles.navArrow} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navBox}
              onPress={() => router.push('/(tabs)/wallet')}
            >
              <View style={[styles.navIconContainer, { backgroundColor: '#F3E8FF' }]}>
                <Wallet size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.navLabel}>Wallet</Text>
              <ChevronRight size={20} color="#9CA3AF" style={styles.navArrow} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  trendCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  navigationSection: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  navBox: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  navLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  navArrow: {
    marginLeft: 8,
  },
});