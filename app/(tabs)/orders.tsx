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

// pickup_drop_location can be either:
// 1. Object with numeric keys: { "0": "City1", "1": "City2", "2": "City3", ... }
// 2. Object with pickup/drop structure: { pickup: {...}, drop: {...}, intermediate_stops: [...] }
type PickupDropLocation = 
  | { [key: string]: string } // Numeric keys format: "0", "1", "2", etc.
  | {
      pickup?: {
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        coordinates?: { lat: number; lng: number };
      };
      drop?: {
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        coordinates?: { lat: number; lng: number };
      };
      intermediate_stops?: Array<{
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        coordinates?: { lat: number; lng: number };
        stop_order?: number;
      }>;
    };

interface Order {
  id: number | string;
  source: string;
  source_order_id?: number;
  vendor_id?: string;
  trip_type: string;
  car_type?: string;
  pickup_drop_location?: PickupDropLocation;
  start_date_time?: string;
  customer_name: string;
  customer_number: string;
  trip_status: string;
  pick_near_city?: string[];
  trip_distance?: number;
  trip_time?: string;
  estimated_price?: number;
  vendor_price?: number;
  platform_fees_percent?: number;
  closed_vendor_price?: number;
  closed_driver_price?: number;
  commision_amount?: number;
  created_at: string;
  vendor?: {
    id: string;
    full_name: string;
    primary_number: string;
    secondary_number?: string;
    gpay_number?: string;
    aadhar_number?: string;
    address?: string;
    wallet_balance?: number;
    bank_balance?: number;
    created_at?: string;
  };
  assignments?: Array<{
    id: number;
    order_id: number;
    vehicle_owner_id?: string;
    driver_id?: string;
    car_id?: string;
    assignment_status: string;
    assigned_at?: string;
    expires_at?: string;
    cancelled_at?: string;
    completed_at?: string;
    created_at?: string;
  }>;
  end_records?: Array<{
    id: number;
    order_id: number;
    driver_id?: string;
    start_km?: number;
    end_km?: number;
    contact_number?: string;
    img_url?: string;
    close_speedometer_image?: string;
    created_at?: string;
    updated_at?: string;
  }>;
  assigned_driver?: {
    id: string;
    full_name: string;
    primary_number: string;
    secondary_number?: string;
    licence_number?: string;
    address?: string;
    driver_status?: string;
    created_at?: string;
  };
  assigned_car?: {
    id: string;
    car_name: string;
    car_type: string;
    car_number: string;
    car_status?: string;
    rc_front_img_url?: string;
    rc_back_img_url?: string;
    insurance_img_url?: string;
    fc_img_url?: string;
    car_img_url?: string;
    created_at?: string;
  };
  vehicle_owner?: {
    id: string;
    full_name: string;
    primary_number: string;
    secondary_number?: string;
    address?: string;
    account_status?: string;
    created_at?: string;
  };
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

  // Helper function to get location string from pickup_drop_location
  const getLocationString = (location: PickupDropLocation | undefined): string => {
    if (!location) return '';
    
    // Check if it's numeric keys format
    if (typeof location === 'object' && !('pickup' in location)) {
      const keys = Object.keys(location).sort((a, b) => Number(a) - Number(b));
      return keys.map(key => (location as any)[key] || '').join(' ').toLowerCase();
    }
    
    // Structured format
    const pickup = (location as any).pickup?.address || (location as any).pickup?.city || '';
    const drop = (location as any).drop?.address || (location as any).drop?.city || '';
    const stops = (location as any).intermediate_stops || [];
    const stopsText = stops.map((stop: any) => stop.address || stop.city || '').join(' ');
    return `${pickup} ${drop} ${stopsText}`.toLowerCase();
  };

  const filteredOrders = orders.filter(order => {
    if (!order || !order.id) return false;
    const query = searchQuery.toLowerCase();
    const locationText = getLocationString(order.pickup_drop_location);
    
    return (
      String(order.id || '').toLowerCase().includes(query) ||
      (order.customer_name && String(order.customer_name).toLowerCase().includes(query)) ||
      (order.customer_number && String(order.customer_number).includes(searchQuery)) ||
      locationText.includes(query)
    );
  });

  const getStatusColor = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      case 'PENDING':
        return '#F59E0B';
      case 'DRIVING':
      case 'IN_PROGRESS':
      case 'IN PROGRESS':
      case 'ASSIGNED':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN');
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
            <Text style={styles.orderId}>Order ID: {item.id ? String(item.id).substring(0, 8) + '...' : 'N/A'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.trip_status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.trip_status) }]}>
                {item.trip_status || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.routeInfo}>
            {(() => {
              const location = item.pickup_drop_location;
              if (!location) {
                return (
                  <>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.locationText} numberOfLines={1}>N/A</Text>
                    </View>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#10B981" />
                      <Text style={styles.locationText} numberOfLines={1}>N/A</Text>
                    </View>
                  </>
                );
              }

              // Check if it's numeric keys format (actual API format)
              if (typeof location === 'object' && !('pickup' in location)) {
                const keys = Object.keys(location).sort((a, b) => Number(a) - Number(b));
                const fromCity = (location as any)['0'] || 'N/A';
                const toCity = (location as any)[keys[keys.length - 1]] || 'N/A';
                const intermediateCount = keys.length > 2 ? keys.length - 2 : 0;

                return (
                  <>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        From: {fromCity}
                      </Text>
                    </View>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#10B981" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        To: {toCity}
                      </Text>
                    </View>
                    {intermediateCount > 0 && (
                      <View style={styles.locationRow}>
                        <Text style={[styles.locationText, { fontSize: 12, color: '#6B7280' }]}>
                          +{intermediateCount} intermediate stop{intermediateCount > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </>
                );
              }

              // Structured format (fallback)
              const structuredLoc = location as any;
              const isMulticity = (item.trip_type?.toLowerCase().includes('multicity') || 
                                 item.trip_type?.toLowerCase().includes('multi city') || 
                                 item.trip_type?.toLowerCase().includes('multy city'));
              
              if (isMulticity && structuredLoc) {
                return (
                  <>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        From: {structuredLoc.pickup?.address || structuredLoc.pickup?.city || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#10B981" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        To: {structuredLoc.drop?.address || structuredLoc.drop?.city || 'N/A'}
                      </Text>
                    </View>
                    {structuredLoc.intermediate_stops && structuredLoc.intermediate_stops.length > 0 && (
                      <View style={styles.locationRow}>
                        <Text style={[styles.locationText, { fontSize: 12, color: '#6B7280' }]}>
                          +{structuredLoc.intermediate_stops.length} intermediate stop{structuredLoc.intermediate_stops.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </>
                );
              }

              // Regular trip
              return (
                <>
                  <View style={styles.locationRow}>
                    <MapPin size={16} color="#3B82F6" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {structuredLoc.pickup?.address || structuredLoc['0'] || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.locationRow}>
                    <MapPin size={16} color="#10B981" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {structuredLoc.drop?.address || structuredLoc['1'] || 'N/A'}
                    </Text>
                  </View>
                </>
              );
            })()}
          </View>

          <View style={styles.customerInfo}>
            <View style={styles.infoRow}>
              <User size={14} color="#6B7280" />
              <Text style={styles.infoText}>{item.customer_name || 'N/A'}</Text>
            </View>
            <Text style={styles.phoneText}>{item.customer_number || 'N/A'}</Text>
          </View>

          <View style={styles.priceRow}>
            <DollarSign size={16} color="#10B981" />
            <Text style={styles.priceText}>
              {item.closed_vendor_price 
                ? formatCurrency(item.closed_vendor_price)
                : item.estimated_price 
                ? formatCurrency(item.estimated_price)
                : 'N/A'}
            </Text>
            <Text style={styles.tripType}>{item.trip_type || 'N/A'}</Text>
            {item.car_type && (
              <Text style={[styles.tripType, { marginLeft: 6 }]}>{item.car_type}</Text>
            )}
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
                <Text style={styles.detailValue}>{selectedOrder.id ? String(selectedOrder.id) : 'N/A'}</Text>
              </View>
              {selectedOrder.source_order_id && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Source Order ID:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.source_order_id}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source:</Text>
                <Text style={styles.detailValue}>{selectedOrder.source || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.trip_status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.trip_status) }]}>
                    {selectedOrder.trip_status || 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trip Type:</Text>
                <Text style={styles.detailValue}>{selectedOrder.trip_type || 'N/A'}</Text>
              </View>
              {selectedOrder.car_type && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Car Type:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.car_type}</Text>
                </View>
              )}
              {selectedOrder.start_date_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start Date/Time:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedOrder.start_date_time)}</Text>
                </View>
              )}
              {selectedOrder.trip_distance && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trip Distance:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.trip_distance} km</Text>
                </View>
              )}
              {selectedOrder.trip_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trip Time:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.trip_time}</Text>
                </View>
              )}
              {selectedOrder.pick_near_city && selectedOrder.pick_near_city.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pick Near Cities:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.pick_near_city.join(', ')}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created At:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedOrder.created_at)}</Text>
              </View>
            </View>

            {/* Pricing Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Pricing</Text>
              {selectedOrder.estimated_price && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estimated Price:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedOrder.estimated_price)}</Text>
                </View>
              )}
              {selectedOrder.vendor_price && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vendor Price:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedOrder.vendor_price)}</Text>
                </View>
              )}
              {selectedOrder.platform_fees_percent && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Platform Fees:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.platform_fees_percent}%</Text>
                </View>
              )}
              {selectedOrder.closed_vendor_price && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Closed Vendor Price:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedOrder.closed_vendor_price)}</Text>
                </View>
              )}
              {selectedOrder.closed_driver_price && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Closed Driver Price:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedOrder.closed_driver_price)}</Text>
                </View>
              )}
              {selectedOrder.commision_amount && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Commission Amount:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedOrder.commision_amount)}</Text>
                </View>
              )}
            </View>

            {/* Route Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Route</Text>
              {(() => {
                const location = selectedOrder.pickup_drop_location;
                if (!location) {
                  return <Text style={styles.detailValue}>N/A</Text>;
                }

                // Check if it's numeric keys format (actual API format)
                if (typeof location === 'object' && !('pickup' in location)) {
                  const keys = Object.keys(location).sort((a, b) => Number(a) - Number(b));
                  const isMulticity = keys.length > 2;

                  return (
                    <>
                      {keys.map((key, index) => {
                        const city = (location as any)[key] || 'N/A';
                        const stopNumber = index + 1;
                        let stopLabel = '';
                        
                        if (isMulticity) {
                          if (index === 0) {
                            stopLabel = 'Stop 1: From';
                          } else if (index === keys.length - 1) {
                            stopLabel = `Stop ${stopNumber}: To`;
                          } else {
                            stopLabel = `Stop ${stopNumber}: Intermediate`;
                          }
                        } else {
                          stopLabel = index === 0 ? 'From' : 'To';
                        }

                        return (
                          <View key={key} style={[styles.stopCard, { marginBottom: 12 }]}>
                            <Text style={[styles.detailLabel, { fontWeight: '600', marginBottom: 8 }]}>
                              {stopLabel}
                            </Text>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Location:</Text>
                              <Text style={styles.detailValue}>{city}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </>
                  );
                }

                // Structured format (fallback)
                const structuredLoc = location as any;
                const isMulticity = (selectedOrder.trip_type?.toLowerCase().includes('multicity') || 
                                   selectedOrder.trip_type?.toLowerCase().includes('multi city') || 
                                   selectedOrder.trip_type?.toLowerCase().includes('multy city'));
                
                if (isMulticity && structuredLoc) {
                  return (
                    <>
                      {/* Pickup (First Stop) */}
                      {structuredLoc.pickup && (
                        <View style={[styles.stopCard, { marginBottom: 12 }]}>
                          <Text style={[styles.detailLabel, { fontWeight: '600', marginBottom: 8 }]}>Stop 1: Pickup</Text>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Address:</Text>
                            <Text style={styles.detailValue}>{structuredLoc.pickup.address || 'N/A'}</Text>
                          </View>
                          {structuredLoc.pickup.city && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>City:</Text>
                              <Text style={styles.detailValue}>{structuredLoc.pickup.city}</Text>
                            </View>
                          )}
                          {structuredLoc.pickup.state && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>State:</Text>
                              <Text style={styles.detailValue}>{structuredLoc.pickup.state}</Text>
                            </View>
                          )}
                          {structuredLoc.pickup.pincode && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Pincode:</Text>
                              <Text style={styles.detailValue}>{structuredLoc.pickup.pincode}</Text>
                            </View>
                          )}
                          {structuredLoc.pickup.coordinates && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Coordinates:</Text>
                              <Text style={styles.detailValue}>
                                {structuredLoc.pickup.coordinates.lat}, {structuredLoc.pickup.coordinates.lng}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Intermediate Stops */}
                      {structuredLoc.intermediate_stops && structuredLoc.intermediate_stops.length > 0 && (
                        <>
                          {structuredLoc.intermediate_stops
                            .sort((a: any, b: any) => (a.stop_order || 0) - (b.stop_order || 0))
                            .map((stop: any, index: number) => (
                              <View key={index} style={[styles.stopCard, { marginBottom: 12 }]}>
                                <Text style={[styles.detailLabel, { fontWeight: '600', marginBottom: 8 }]}>
                                  Stop {index + 2}: {stop.city || 'Intermediate Stop'}
                                </Text>
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Address:</Text>
                                  <Text style={styles.detailValue}>{stop.address || 'N/A'}</Text>
                                </View>
                                {stop.city && (
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>City:</Text>
                                    <Text style={styles.detailValue}>{stop.city}</Text>
                                  </View>
                                )}
                                {stop.state && (
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>State:</Text>
                                    <Text style={styles.detailValue}>{stop.state}</Text>
                                  </View>
                                )}
                                {stop.pincode && (
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Pincode:</Text>
                                    <Text style={styles.detailValue}>{stop.pincode}</Text>
                                  </View>
                                )}
                                {stop.coordinates && (
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Coordinates:</Text>
                                    <Text style={styles.detailValue}>
                                      {stop.coordinates.lat}, {stop.coordinates.lng}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ))}
                        </>
                      )}

                      {/* Drop (Last Stop) */}
                      {structuredLoc.drop && (
                        <View style={[styles.stopCard, { marginBottom: 12 }]}>
                          <Text style={[styles.detailLabel, { fontWeight: '600', marginBottom: 8 }]}>
                            Stop {structuredLoc.intermediate_stops ? structuredLoc.intermediate_stops.length + 2 : 2}: Drop
                          </Text>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Address:</Text>
                            <Text style={styles.detailValue}>{structuredLoc.drop.address || 'N/A'}</Text>
                          </View>
                          {structuredLoc.drop.city && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>City:</Text>
                              <Text style={styles.detailValue}>{structuredLoc.drop.city}</Text>
                            </View>
                          )}
                          {structuredLoc.drop.state && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>State:</Text>
                              <Text style={styles.detailValue}>{structuredLoc.drop.state}</Text>
                            </View>
                          )}
                          {structuredLoc.drop.pincode && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Pincode:</Text>
                              <Text style={styles.detailValue}>{structuredLoc.drop.pincode}</Text>
                            </View>
                          )}
                          {structuredLoc.drop.coordinates && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Coordinates:</Text>
                              <Text style={styles.detailValue}>
                                {structuredLoc.drop.coordinates.lat}, {structuredLoc.drop.coordinates.lng}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  );
                }

                // Regular trip - numeric keys format
                return (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>From:</Text>
                      <Text style={styles.detailValue}>{(location as any)['0'] || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>To:</Text>
                      <Text style={styles.detailValue}>{(location as any)['1'] || 'N/A'}</Text>
                    </View>
                  </>
                );
              })()}
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
                <Text style={styles.detailValue}>{selectedOrder.customer_number || 'N/A'}</Text>
              </View>
            </View>

            {/* Vendor Information */}
            {selectedOrder.vendor && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Vendor</Text>
                {selectedOrder.vendor.id && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vendor ID:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vendor.id}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.vendor.full_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Primary Phone:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.vendor.primary_number || 'N/A'}</Text>
                </View>
                {selectedOrder.vendor.secondary_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Secondary Phone:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vendor.secondary_number}</Text>
                  </View>
                )}
                {selectedOrder.vendor.gpay_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>GPay Number:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vendor.gpay_number}</Text>
                  </View>
                )}
                {selectedOrder.vendor.aadhar_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Aadhar Number:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vendor.aadhar_number}</Text>
                  </View>
                )}
                {selectedOrder.vendor.address && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vendor.address}</Text>
                  </View>
                )}
                {selectedOrder.vendor.wallet_balance !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Wallet Balance:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedOrder.vendor.wallet_balance)}</Text>
                  </View>
                )}
                {selectedOrder.vendor.bank_balance !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bank Balance:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedOrder.vendor.bank_balance)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Driver Information */}
            {selectedOrder.assigned_driver && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Assigned Driver</Text>
                {selectedOrder.assigned_driver.id && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Driver ID:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.assigned_driver.id}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.assigned_driver.full_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Primary Phone:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.assigned_driver.primary_number || 'N/A'}</Text>
                </View>
                {selectedOrder.assigned_driver.secondary_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Secondary Phone:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.assigned_driver.secondary_number}</Text>
                  </View>
                )}
                {selectedOrder.assigned_driver.licence_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>License Number:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.assigned_driver.licence_number}</Text>
                  </View>
                )}
                {selectedOrder.assigned_driver.address && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.assigned_driver.address}</Text>
                  </View>
                )}
                {selectedOrder.assigned_driver.driver_status && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.assigned_driver.driver_status}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Car Information */}
            {selectedOrder.assigned_car && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Assigned Car</Text>
                {selectedOrder.assigned_car.id && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Car ID:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.assigned_car.id}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.assigned_car.car_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Number:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.assigned_car.car_number || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.assigned_car.car_type || 'N/A'}</Text>
                </View>
                {selectedOrder.assigned_car.car_status && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.assigned_car.car_status}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Vehicle Owner Information */}
            {selectedOrder.vehicle_owner && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Vehicle Owner</Text>
                {selectedOrder.vehicle_owner.id && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Owner ID:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vehicle_owner.id}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.vehicle_owner.full_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Primary Phone:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.vehicle_owner.primary_number || 'N/A'}</Text>
                </View>
                {selectedOrder.vehicle_owner.secondary_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Secondary Phone:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vehicle_owner.secondary_number}</Text>
                  </View>
                )}
                {selectedOrder.vehicle_owner.address && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vehicle_owner.address}</Text>
                  </View>
                )}
                {selectedOrder.vehicle_owner.account_status && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Status:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.vehicle_owner.account_status}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Assignments */}
            {selectedOrder.assignments && selectedOrder.assignments.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Assignments ({selectedOrder.assignments.length})</Text>
                {selectedOrder.assignments.map((assignment: any, index: number) => (
                  <View key={index} style={styles.assignmentCard}>
                    <Text style={styles.assignmentTitle}>Assignment {index + 1}</Text>
                    {assignment.id && (
                      <Text style={styles.assignmentText}>ID: {assignment.id}</Text>
                    )}
                    {assignment.assignment_status && (
                      <Text style={styles.assignmentText}>Status: {assignment.assignment_status}</Text>
                    )}
                    {assignment.vehicle_owner_id && (
                      <Text style={styles.assignmentText}>Vehicle Owner ID: {assignment.vehicle_owner_id}</Text>
                    )}
                    {assignment.driver_id && (
                      <Text style={styles.assignmentText}>Driver ID: {assignment.driver_id}</Text>
                    )}
                    {assignment.car_id && (
                      <Text style={styles.assignmentText}>Car ID: {assignment.car_id}</Text>
                    )}
                    {assignment.assigned_at && (
                      <Text style={styles.assignmentText}>Assigned: {formatDate(assignment.assigned_at)}</Text>
                    )}
                    {assignment.expires_at && (
                      <Text style={styles.assignmentText}>Expires: {formatDate(assignment.expires_at)}</Text>
                    )}
                    {assignment.cancelled_at && (
                      <Text style={styles.assignmentText}>Cancelled: {formatDate(assignment.cancelled_at)}</Text>
                    )}
                    {assignment.completed_at && (
                      <Text style={styles.assignmentText}>Completed: {formatDate(assignment.completed_at)}</Text>
                    )}
                    {assignment.created_at && (
                      <Text style={styles.assignmentText}>Created: {formatDate(assignment.created_at)}</Text>
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
                    {record.id && (
                      <Text style={styles.recordText}>ID: {record.id}</Text>
                    )}
                    {record.driver_id && (
                      <Text style={styles.recordText}>Driver ID: {record.driver_id}</Text>
                    )}
                    {record.start_km !== undefined && (
                      <Text style={styles.recordText}>Start KM: {record.start_km}</Text>
                    )}
                    {record.end_km !== undefined && (
                      <Text style={styles.recordText}>End KM: {record.end_km}</Text>
                    )}
                    {record.contact_number && (
                      <Text style={styles.recordText}>Contact: {record.contact_number}</Text>
                    )}
                    {record.img_url && (
                      <Text style={styles.recordText}>Image URL: {record.img_url.substring(0, 50)}...</Text>
                    )}
                    {record.close_speedometer_image && (
                      <Text style={styles.recordText}>Speedometer Image: {record.close_speedometer_image.substring(0, 50)}...</Text>
                    )}
                    {record.created_at && (
                      <Text style={styles.recordText}>Created: {formatDate(record.created_at)}</Text>
                    )}
                    {record.updated_at && (
                      <Text style={styles.recordText}>Updated: {formatDate(record.updated_at)}</Text>
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
        keyExtractor={(item) => String(item.id || Math.random().toString())}
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
  stopCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
});

