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
import { Users, Car, CreditCard, TrendingUp, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface DashboardStats {
  totalVendors: number;
  totalVehicleOwners: number;
  pendingTransfers: number;
  totalTransferAmount: number;
}

export default function Dashboard() {
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

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.actionText}>Review Pending Documents</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <CreditCard size={20} color="#3B82F6" />
            <Text style={styles.actionText}>Process Transfer Requests</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <AlertCircle size={20} color="#F59E0B" />
            <Text style={styles.actionText}>Review Account Issues</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statusText}>All systems operational</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.statusText}>API services running</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statusText}>Database connected</Text>
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
  quickActions: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  recentActivity: {
    margin: 20,
    marginTop: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
});