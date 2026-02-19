import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, FileText, ExternalLink } from 'lucide-react-native';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

interface DocumentItem {
  document_id: string;
  document_type: string;
  document_name: string;
  image_url: string | null;
  status: string;
  uploaded_at: string;
  car_id?: string | null;
  car_name?: string | null;
  car_number?: string | null;
}

interface DocumentsResponse {
  account_id: string;
  account_type: string;
  account_name: string;
  account_documents: DocumentItem[];
  car_documents: DocumentItem[];
  total_documents: number;
  pending_count: number;
  verified_count: number;
  invalid_count: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ensureString(p: string | string[] | undefined): string {
  if (p === undefined) return '';
  return Array.isArray(p) ? p[0] ?? '' : p;
}

export default function CarDocumentsScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{
    carId: string;
    vehicleOwnerId: string;
    carName: string;
  }>();
  const carId = ensureString(rawParams.carId);
  const vehicleOwnerId = ensureString(rawParams.vehicleOwnerId);
  const carName = ensureString(rawParams.carName);

  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);
  const [carDocuments, setCarDocuments] = useState<DocumentItem[]>([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openInBrowser = async () => {
    const url = currentDocument?.image_url;
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch (err) {
      console.error('Failed to open URL:', err);
      Alert.alert('Error', 'Could not open document in browser.');
    }
  };

  useEffect(() => {
    if (vehicleOwnerId && carId) {
      fetchDocuments();
    }
  }, [vehicleOwnerId, carId]);

  const fetchDocuments = async () => {
    try {
      setError(null);
      const data = await apiService.getAccountDocuments(vehicleOwnerId, 'vehicle_owner');
      setDocuments(data);
      const forThisCar = (data.car_documents || []).filter(
        (doc: DocumentItem) => String(doc.car_id) === String(carId)
      );
      setCarDocuments(forThisCar);
      const firstPendingIndex = forThisCar.findIndex((doc: DocumentItem) => doc.status === 'PENDING');
      if (firstPendingIndex !== -1) {
        setCurrentDocIndex(firstPendingIndex);
      } else {
        setCurrentDocIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError(err?.message || 'Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const updateDocumentStatus = async (documentId: string, status: 'VERIFIED' | 'INVALID' | 'PENDING') => {
    setUpdating(true);
    try {
      await apiService.updateDocumentStatus(
        vehicleOwnerId,
        documentId,
        'vehicle_owner',
        status
      );
      await fetchDocuments();
      Alert.alert('Success', 'Document status updated successfully');
    } catch (err: any) {
      console.error('Failed to update document:', err);
      Alert.alert('Error', err?.message || 'Failed to update document status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return '#10B981';
      case 'INVALID':
        return '#EF4444';
      case 'PENDING':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle size={20} color="#10B981" />;
      case 'INVALID':
        return <XCircle size={20} color="#EF4444" />;
      case 'PENDING':
        return <Clock size={20} color="#F59E0B" />;
      default:
        return <FileText size={20} color="#6B7280" />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchDocuments} />;
  }

  const pendingCount = carDocuments.filter((d) => d.status === 'PENDING').length;
  const verifiedCount = carDocuments.filter((d) => d.status === 'VERIFIED').length;
  const invalidCount = carDocuments.filter((d) => d.status === 'INVALID').length;

  if (carDocuments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{carName || 'Car'} - Documents</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <FileText size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No documents found for this car</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentDocument = carDocuments[currentDocIndex];
  if (!currentDocument) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No documents to display</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePrevious = () => {
    if (currentDocIndex > 0) setCurrentDocIndex(currentDocIndex - 1);
  };

  const handleNext = () => {
    if (currentDocIndex < carDocuments.length - 1) setCurrentDocIndex(currentDocIndex + 1);
  };

  const handleVerify = () => {
    Alert.alert(
      'Verify Document',
      `Are you sure you want to verify "${currentDocument.document_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify', onPress: () => updateDocumentStatus(currentDocument.document_id, 'VERIFIED') },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Document',
      `Are you sure you want to reject "${currentDocument.document_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => updateDocumentStatus(currentDocument.document_id, 'INVALID'),
        },
      ]
    );
  };

  const docsToVerify = carDocuments.filter((d) => d.status !== 'VERIFIED');
  const canVerifyAll = docsToVerify.length > 0;

  const handleVerifyAll = () => {
    Alert.alert(
      'Verify All Documents',
      `Are you sure you want to verify all ${docsToVerify.length} document(s) for this car?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify All',
          onPress: async () => {
            setUpdating(true);
            try {
              for (const doc of docsToVerify) {
                await apiService.updateDocumentStatus(
                  vehicleOwnerId,
                  doc.document_id,
                  'vehicle_owner',
                  'VERIFIED'
                );
              }
              await fetchDocuments();
              Alert.alert('Success', `All ${docsToVerify.length} document(s) verified successfully.`);
            } catch (err: any) {
              console.error('Failed to verify all documents:', err);
              Alert.alert('Error', err?.message || 'Failed to verify some documents.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{carName || 'Car'} - Documents</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total:</Text>
                <Text style={styles.statValue}>{carDocuments.length}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Pending:</Text>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pendingCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: '#10B981' }]}>Verified:</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{verifiedCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: '#EF4444' }]}>Invalid:</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{invalidCount}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.documentInfoCard}>
          <View style={styles.documentInfoHeader}>
            <View style={styles.documentInfoTitleRow}>
              {getStatusIcon(currentDocument.status)}
              <Text style={styles.documentName}>{currentDocument.document_name}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentDocument.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(currentDocument.status) }]}>
                {currentDocument.status}
              </Text>
            </View>
          </View>
          <View style={styles.documentMeta}>
            <Text style={styles.metaLabel}>Type: {currentDocument.document_type}</Text>
            <Text style={styles.metaLabel}>
              Uploaded: {new Date(currentDocument.uploaded_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.imageContainer}>
          {currentDocument.image_url ? (
            Platform.OS === 'ios' ? (
              <ScrollView
                style={styles.zoomScrollView}
                contentContainerStyle={styles.zoomScrollContent}
                maximumZoomScale={4}
                minimumZoomScale={0.5}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: currentDocument.image_url }}
                  style={styles.documentImage}
                  resizeMode="contain"
                />
              </ScrollView>
            ) : (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: currentDocument.image_url }}
                  style={styles.documentImage}
                  resizeMode="contain"
                />
              </View>
            )
          ) : (
            <View style={styles.noImageContainer}>
              <FileText size={48} color="#9CA3AF" />
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}
        </View>

        {currentDocument.image_url && (
          <TouchableOpacity style={styles.viewInBrowserLink} onPress={openInBrowser} activeOpacity={0.7}>
            <ExternalLink size={20} color="#3B82F6" />
            <Text style={styles.viewInBrowserText}>View document in browser</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.verifyButton,
              (updating || currentDocument.status === 'VERIFIED') && styles.actionButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={updating || currentDocument.status === 'VERIFIED'}
          >
            <CheckCircle size={20} color="white" />
            <Text style={styles.actionButtonText}>Verify</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.rejectButton,
              (updating || currentDocument.status === 'INVALID') && styles.actionButtonDisabled,
            ]}
            onPress={handleReject}
            disabled={updating || currentDocument.status === 'INVALID'}
          >
            <XCircle size={20} color="white" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.verifyAllButton,
              (updating || !canVerifyAll) && styles.actionButtonDisabled,
            ]}
            onPress={handleVerifyAll}
            disabled={updating || !canVerifyAll}
          >
            <CheckCircle size={20} color="white" />
            <Text style={styles.actionButtonText}>Verify All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentDocIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentDocIndex === 0}
          >
            <ChevronLeft size={24} color={currentDocIndex === 0 ? '#9CA3AF' : '#3B82F6'} />
            <Text style={[styles.navButtonText, currentDocIndex === 0 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <Text style={styles.navigationText}>
            Document {currentDocIndex + 1} of {carDocuments.length}
          </Text>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentDocIndex === carDocuments.length - 1 && styles.navButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={currentDocIndex === carDocuments.length - 1}
          >
            <Text style={[styles.navButtonText, currentDocIndex === carDocuments.length - 1 && styles.navButtonTextDisabled]}>
              Next
            </Text>
            <ChevronRight size={24} color={currentDocIndex === carDocuments.length - 1 ? '#9CA3AF' : '#3B82F6'} />
          </TouchableOpacity>
        </View>

        <View style={styles.thumbnailsContainer}>
          <Text style={styles.thumbnailsTitle}>All Documents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsScroll}>
            {carDocuments.map((doc, index) => (
              <TouchableOpacity
                key={doc.document_id}
                style={[
                  styles.thumbnail,
                  index === currentDocIndex && styles.thumbnailActive,
                ]}
                onPress={() => setCurrentDocIndex(index)}
              >
                <View style={[styles.thumbnailStatus, { backgroundColor: getStatusColor(doc.status) }]}>
                  {getStatusIcon(doc.status)}
                </View>
                <Text style={styles.thumbnailName} numberOfLines={2}>
                  {doc.document_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  documentInfoCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  documentInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  documentInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  documentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  documentMeta: {
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  imageContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomScrollView: {
    width: SCREEN_WIDTH - 80,
    height: 400,
    alignSelf: 'center',
  },
  zoomScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: SCREEN_WIDTH - 80,
    minHeight: 400,
  },
  documentImage: {
    width: SCREEN_WIDTH - 80,
    height: 400,
    borderRadius: 8,
  },
  viewInBrowserLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewInBrowserText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  noImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noImageText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  verifyButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  verifyAllButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  navigationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  thumbnailsContainer: {
    marginBottom: 20,
  },
  thumbnailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  thumbnailsScroll: {
    paddingHorizontal: 20,
  },
  thumbnail: {
    width: 120,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  thumbnailActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  thumbnailStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  thumbnailName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
