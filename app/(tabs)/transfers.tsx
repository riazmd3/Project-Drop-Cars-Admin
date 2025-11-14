import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, CircleCheck as CheckCircle, Circle as XCircle, IndianRupee } from 'lucide-react-native';
import { apiService } from '@/services/api';
import StatusBadge from '@/components/StatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

interface TransferTransaction {
  id: string;
  vendor_id: string;
  requested_amount: number;
  wallet_balance_before: number;
  bank_balance_before: number;
  status: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function TransfersScreen() {
  const [transfers, setTransfers] = useState<TransferTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    try {
      setError(null);
      const data = await apiService.getPendingTransfers(0, 100);
      setTransfers(data.transactions);
    } catch (error) {
      setError('Failed to load transfer requests. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransfers();
  };

  const handleTransferAction = (transfer: TransferTransaction, action: 'approve' | 'reject') => {
    Alert.prompt(
      `${action === 'approve' ? 'Approve' : 'Reject'} Transfer`,
      'Add a note (optional):',
      async (notes) => {
        try {
          await apiService.processTransfer(transfer.id, action, notes || undefined);
          // Remove processed transfer from list
          setTransfers(transfers.filter(t => t.id !== transfer.id));
          
          Alert.alert(
            'Success',
            `Transfer ${action === 'approve' ? 'approved' : 'rejected'} successfully`
          );
        } catch (error) {
          Alert.alert('Error', `Failed to ${action} transfer. Please try again.`);
        }
      },
      'plain-text',
      '',
    );
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransferItem = ({ item }: { item: TransferTransaction }) => (
    <View style={styles.transferCard}>
      <View style={styles.transferHeader}>
        <View style={styles.transferInfo}>
          <Text style={styles.vendorId}>Vendor: {item.vendor_id.substring(0, 8)}...</Text>
          <StatusBadge status={item.status} type="transfer" />
        </View>
        <Text style={styles.requestedAmount}>{formatCurrency(item.requested_amount)}</Text>
      </View>
      
      <View style={styles.balanceInfo}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Wallet Before</Text>
          <Text style={styles.balanceValue}>{formatCurrency(item.wallet_balance_before)}</Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Bank Before</Text>
          <Text style={styles.balanceValue}>{formatCurrency(item.bank_balance_before)}</Text>
        </View>
      </View>
      
      <Text style={styles.requestDate}>Requested: {formatDate(item.created_at)}</Text>
      
      {item.admin_notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Admin Notes:</Text>
          <Text style={styles.notesText}>{item.admin_notes}</Text>
        </View>
      )}
      
      {item.status === 'Pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleTransferAction(item, 'approve')}
          >
            <CheckCircle size={16} color="white" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleTransferAction(item, 'reject')}
          >
            <XCircle size={16} color="white" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchTransfers} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transfer Requests</Text>
        <Text style={styles.subtitle}>{transfers.length} pending requests</Text>
      </View>

      {transfers.length === 0 ? (
        <View style={styles.emptyState}>
          <Clock size={48} color="#6B7280" />
          <Text style={styles.emptyTitle}>No Pending Transfers</Text>
          <Text style={styles.emptySubtitle}>All transfer requests have been processed</Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          renderItem={renderTransferItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
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
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  transferCard: {
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
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  transferInfo: {
    flex: 1,
    gap: 8,
  },
  vendorId: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  requestedAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  requestDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  notesContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#92400E',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});