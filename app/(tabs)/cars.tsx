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
import { Search, Car } from 'lucide-react-native';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

interface CarItem {
  id: string;
  vehicle_owner_id: string;
  car_name: string;
  car_type: string;
  car_number: string;
  year_of_the_car: string;
  car_status: string;
  vehicle_owner_name: string;
  created_at: string;
}

type StatusFilter = 'all' | 'ONLINE' | 'DRIVING' | 'BLOCKED' | 'PROCESSING';

export default function CarsScreen() {
  const [cars, setCars] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [drivingCount, setDrivingCount] = useState(0);

  const fetchCars = async () => {
    try {
      setError(null);
      const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
      
      const data = await apiService.getCars(0, 100, statusParam);
      
      // Sort cars: blocked/processing first, then online/driving
      const sortedCars = [...data.cars].sort((a, b) => {
        const aInactive = a.car_status === 'BLOCKED' || a.car_status === 'PROCESSING';
        const bInactive = b.car_status === 'BLOCKED' || b.car_status === 'PROCESSING';
        
        if (aInactive && !bInactive) return -1;
        if (!aInactive && bInactive) return 1;
        return 0;
      });
      
      setCars(sortedCars);
      setTotalCount(data.total_count);
      setOnlineCount(data.online_count);
      setBlockedCount(data.blocked_count);
      setProcessingCount(data.processing_count);
      setDrivingCount(data.driving_count);
    } catch (error) {
      console.error('Failed to fetch cars:', error);
      setError('Failed to load cars. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCars();
  };

  const isInactiveStatus = (status: string): boolean => {
    return status === 'BLOCKED' || status === 'PROCESSING';
  };

  const isActiveStatus = (status: string): boolean => {
    return status === 'ONLINE' || status === 'DRIVING';
  };

  const getToggleStatus = (car: CarItem): boolean => {
    return isActiveStatus(car.car_status);
  };

  const getTargetStatus = (car: CarItem, toggleValue: boolean): string => {
    return toggleValue ? 'ONLINE' : 'BLOCKED';
  };

  const handleToggleStatus = async (car: CarItem, newValue: boolean) => {
    const newStatus = getTargetStatus(car, newValue);
    const carId = String(car.id);
    
    // Optimistically update UI
    setCars(cars.map(c => 
      c.id === car.id 
        ? { ...c, car_status: newStatus }
        : c
    ));

    setUpdatingStatus(prev => new Set(prev).add(car.id));

    try {
      await apiService.updateCarAccountStatus(carId, newStatus);
      // Refresh to get accurate data
      await fetchCars();
    } catch (error: any) {
      // Revert on error
      setCars(cars.map(c => 
        c.id === car.id 
          ? { ...c, car_status: car.car_status }
          : c
      ));
      
      Alert.alert('Error', error?.message || 'Failed to update car status');
    } finally {
      setUpdatingStatus(prev => {
        const next = new Set(prev);
        next.delete(car.id);
        return next;
      });
    }
  };

  const filteredCars = cars.filter(car =>
    car.car_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    car.car_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    car.vehicle_owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'ONLINE':
        return 'Online';
      case 'DRIVING':
        return 'Driving';
      case 'BLOCKED':
        return 'Blocked';
      case 'PROCESSING':
        return 'Processing';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ONLINE':
        return '#10B981';
      case 'DRIVING':
        return '#3B82F6';
      case 'BLOCKED':
        return '#EF4444';
      case 'PROCESSING':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const renderCarItem = ({ item }: { item: CarItem }) => {
    const isInactive = isInactiveStatus(item.car_status);
    const isUpdating = updatingStatus.has(item.id);
    const toggleValue = getToggleStatus(item);
    const statusLabel = getStatusLabel(item.car_status);
    
    return (
      <TouchableOpacity
        style={[
          styles.carCard,
          isInactive && styles.carCardInactive,
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.carContent}>
          <View style={styles.carInfo}>
            <View style={styles.carHeader}>
              <Car size={18} color="#3B82F6" />
              <Text style={styles.carName} numberOfLines={1}>{item.car_name}</Text>
            </View>
            <Text style={styles.carNumber}>{item.car_number}</Text>
            <Text style={styles.carType}>{item.car_type} • {item.year_of_the_car}</Text>
            <Text style={styles.ownerName}>Owner: {item.vehicle_owner_name}</Text>
            <Text style={styles.carId} numberOfLines={1}>ID: {item.id}</Text>
          </View>

          <View style={styles.carActions}>
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
    return <ErrorMessage message={error} onRetry={fetchCars} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cars</Text>
        <Text style={styles.subtitle}>
          {totalCount} total • {onlineCount} online • {blockedCount} blocked
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by car name, number, or owner..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Status Filters */}
      <View style={styles.filterButtons}>
        <FlatList
          horizontal
          data={[
            { label: 'All Statuses', value: 'all' },
            { label: 'Online', value: 'ONLINE' },
            { label: 'Driving', value: 'DRIVING' },
            { label: 'Blocked', value: 'BLOCKED' },
            { label: 'Processing', value: 'PROCESSING' },
          ]}
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
        data={filteredCars}
        renderItem={renderCarItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No cars found</Text>
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
  carCard: {
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
  carCardInactive: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  carContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carInfo: {
    flex: 1,
    gap: 6,
    marginRight: 12,
  },
  carHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  carNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  carType: {
    fontSize: 12,
    color: '#6B7280',
  },
  ownerName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  carId: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  carActions: {
    alignItems: 'center',
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

