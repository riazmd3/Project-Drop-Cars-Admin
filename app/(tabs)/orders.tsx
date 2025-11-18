import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Package, MapPin, User, Car, Building2, Calendar, DollarSign, ChevronRight } from 'lucide-react-native';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

interface Order {
  id: string;
  source: string;
  destination: string;
  trip_type: string;
  customer_name: string;
  customer_phone: string;
  total_price: number;
  order_status: string;
  created_at: string;
  vendor?: any;
  assignments?: any[];
  end_records?: any[];
  driver?: any;
  car?: any;
  vehicle_owner?: any;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = async () => {
    try {
      setError(null);
      const data = await apiService.getOrders(0, 100);
      setOrders(data.orders);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_phone?.includes(searchQuery) ||
    order.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      case 'PENDING':
        return '#F59E0B';
      case 'IN_PROGRESS':
      case 'IN PROGRESS':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Order ID: {item.id.substring(0, 8)}...</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.order_status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.order_status) }]}>
                {item.order_status || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.routeInfo}>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#3B82F6" />
              <Text style={styles.locationText} numberOfLines={1}>{item.source || 'N/A'}</Text>
            </View>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#10B981" />
              <Text style={styles.locationText} numberOfLines={1}>{item.destination || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.customerInfo}>
            <View style={styles.infoRow}>
              <User size={14} color="#6B7280" />
              <Text style={styles.infoText}>{item.customer_name || 'N/A'}</Text>
            </View>
            <Text style={styles.phoneText}>{item.customer_phone || 'N/A'}</Text>
          </View>

          <View style={styles.priceRow}>
            <DollarSign size={16} color="#10B981" />
            <Text style={styles.priceText}>{formatCurrency(item.total_price || 0)}</Text>
            <Text style={styles.tripType}>{item.trip_type || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity
              onPress={() => setShowDetailsModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Order Basic Info */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Order Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>{selectedOrder.id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.order_status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.order_status) }]}>
                    {selectedOrder.order_status || 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trip Type:</Text>
                <Text style={styles.detailValue}>{selectedOrder.trip_type || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Price:</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedOrder.total_price || 0)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created At:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedOrder.created_at)}</Text>
              </View>
            </View>

            {/* Route Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Route</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source:</Text>
                <Text style={styles.detailValue}>{selectedOrder.source || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Destination:</Text>
                <Text style={styles.detailValue}>{selectedOrder.destination || 'N/A'}</Text>
              </View>
            </View>

            {/* Customer Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Customer</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{selectedOrder.customer_name || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{selectedOrder.customer_phone || 'N/A'}</Text>
              </View>
            </View>

            {/* Vendor Information */}
            {selectedOrder.vendor && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Vendor</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.vendor.full_name || selectedOrder.vendor.name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.vendor.primary_number || selectedOrder.vendor.phone || 'N/A'}</Text>
                </View>
                {selectedOrder.vendor.vendor_id && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vendor ID:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vendor.vendor_id}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Driver Information */}
            {selectedOrder.driver && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Driver</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.driver.full_name || selectedOrder.driver.name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.driver.primary_number || selectedOrder.driver.phone || 'N/A'}</Text>
                </View>
                {selectedOrder.driver.driver_status && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.driver.driver_status}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Car Information */}
            {selectedOrder.car && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Car</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.car.car_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Number:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.car.car_number || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.car.car_type || 'N/A'}</Text>
                </View>
                {selectedOrder.car.car_status && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.car.car_status}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Vehicle Owner Information */}
            {selectedOrder.vehicle_owner && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Vehicle Owner</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.vehicle_owner.full_name || selectedOrder.vehicle_owner.name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.vehicle_owner.primary_number || selectedOrder.vehicle_owner.phone || 'N/A'}</Text>
                </View>
              </View>
            )}

            {/* Assignments */}
            {selectedOrder.assignments && selectedOrder.assignments.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Assignments ({selectedOrder.assignments.length})</Text>
                {selectedOrder.assignments.map((assignment: any, index: number) => (
                  <View key={index} style={styles.assignmentCard}>
                    <Text style={styles.assignmentTitle}>Assignment {index + 1}</Text>
                    {assignment.assigned_at && (
                      <Text style={styles.assignmentText}>Assigned: {formatDate(assignment.assigned_at)}</Text>
                    )}
                    {assignment.status && (
                      <Text style={styles.assignmentText}>Status: {assignment.status}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* End Records */}
            {selectedOrder.end_records && selectedOrder.end_records.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>End Records ({selectedOrder.end_records.length})</Text>
                {selectedOrder.end_records.map((record: any, index: number) => (
                  <View key={index} style={styles.endRecordCard}>
                    <Text style={styles.recordTitle}>End Record {index + 1}</Text>
                    {record.ended_at && (
                      <Text style={styles.recordText}>Ended: {formatDate(record.ended_at)}</Text>
                    )}
                    {record.final_amount && (
                      <Text style={styles.recordText}>Final Amount: {formatCurrency(record.final_amount)}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchOrders} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>{totalCount} total orders</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order ID, customer, phone, or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />

      {renderOrderDetails()}
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderCard: {
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 10,
    marginBottom: 12,
  },
  routeInfo: {
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  customerInfo: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  phoneText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  tripType: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 'auto',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  assignmentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  assignmentText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  endRecordCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  recordText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
});

