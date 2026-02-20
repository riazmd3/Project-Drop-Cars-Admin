import AsyncStorage from '@react-native-async-storage/async-storage';

// const BASE_URL = 'http://10.115.254.247:8000/api';
// const BASE_URL = 'http://10.116.186.247:8000/api';
// const BASE_URL = 'https://drop-cars-api-1049299844333.asia-south2.run.app/api';
const BASE_URL = 'https://drop-cars-api-207918408785.asia-south2.run.app/api';


class ApiService {
  private async getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem('auth_token');
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, skipLogoutOnError = false): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = await this.getAuthHeaders();
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          // Handle different error response formats
          if (typeof errorJson === 'string') {
            errorMessage = errorJson;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.detail) {
            errorMessage = Array.isArray(errorJson.detail) 
              ? errorJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
              : errorJson.detail;
          } else if (errorJson.error) {
            errorMessage = errorJson.error;
          } else {
            errorMessage = JSON.stringify(errorJson);
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        // Log the full error for debugging

        if(response.status === 404){
          console.log("Users not found:");
        }else{
        console.error(`API Error [${response.status}]:`, {
          url,
          status: response.status,
          error: errorMessage,
          errorText,
        });
        }


        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      // console.error('API request failed:', error);
      // Only logout on authentication errors (401, 403), not on other errors like 422, 404, etc.
      // Don't logout on skipLogoutOnError flag (used for login)
      if (!skipLogoutOnError && error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        // Check for authentication-related errors
        if (errorMessage.includes('not authenticated') || 
            errorMessage.includes('unauthorized') || 
            errorMessage.includes('401') ||
            errorMessage.includes('403') ||
            errorMessage.includes('token')) {
          this.logout();
        }
      }
      throw error;
    }
  }

  // Auth
  async login(credentials: { username: string; password: string }): Promise<{ access_token: string; token_type: string; admin: any }> {
    const response = await this.makeRequest<{ access_token: string; token_type: string; admin: any }>('/admin/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, true); // Skip logout on login errors
    
    if (response.access_token) {
      await AsyncStorage.setItem('auth_token', response.access_token);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
  }

  // Unified Accounts
  async getAllAccounts(
    skip = 0, 
    limit = 100, 
    accountType?: 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver' | 'car',
    statusFilter?: 'active' | 'inactive' | 'pending' | string
  ): Promise<{
    accounts: Array<{
      id: string;
      name: string;
      account_type: string;
      account_status: string;
    }>;
    total_count: number;
    active_count: number;
    inactive_count: number;
  }> {
    let queryParams = `skip=${skip}&limit=${limit}`;
    if (accountType) {
      queryParams += `&account_type=${accountType}`;
    }
    if (statusFilter) {
      queryParams += `&status_filter=${statusFilter}`;
    }
    return this.makeRequest(`/admin/accounts?${queryParams}`);
  }

  async getAccountDetails(accountId: string, accountType: 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver'): Promise<any> {
    return this.makeRequest(`/admin/accounts/${accountId}?account_type=${accountType}`);
  }

  // Document Verification
  async getAccountDocuments(
    accountId: string, 
    accountType: 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver'
  ): Promise<{
    account_id: string;
    account_type: string;
    account_name: string;
    account_documents: Array<{
      document_id: string;
      document_type: string;
      document_name: string;
      image_url: string | null;
      status: string;
      uploaded_at: string;
      car_id: string | null;
      car_name: string | null;
      car_number: string | null;
    }>;
    car_documents: Array<{
      document_id: string;
      document_type: string;
      document_name: string;
      image_url: string | null;
      status: string;
      uploaded_at: string;
      car_id: string;
      car_name: string;
      car_number: string;
    }>;
    total_documents: number;
    pending_count: number;
    verified_count: number;
    invalid_count: number;
  }> {
    return this.makeRequest(`/admin/accounts/${accountId}/documents?account_type=${accountType}`);
  }

  async updateDocumentStatus(
    accountId: string,
    documentId: string,
    accountType: 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver',
    status: 'PENDING' | 'VERIFIED' | 'INVALID'
  ): Promise<{
    message: string;
    document_id: string;
    document_type: string;
    new_status: string;
  }> {
    return this.makeRequest(`/admin/accounts/${accountId}/documents/${documentId}/status?account_type=${accountType}&status=${status}`, {
      method: 'PATCH',
    });
  }

  // Unified Account Status Update
  async updateAccountStatus(
    accountId: string,
    accountType: 'vendor' | 'vehicle_owner' | 'driver' | 'quickdriver' | 'car',
    status: string
  ): Promise<{
    message: string;
    id: string;
    new_status: string;
  }> {
    // Ensure accountId is a string
    const accountIdStr = String(accountId);
    
    if (accountType === 'car') {
      return this.makeRequest(`/admin/cars/${accountIdStr}/account-status`, {
        method: 'PATCH',
        body: JSON.stringify({ account_status: status }),
      });
    }
    
    // Use account_type as-is - vehicle_owner should stay as vehicle_owner, not mapped to driver
    // The backend expects the exact account_type: vendor, vehicle_owner, driver, quickdriver
    
    return this.makeRequest(`/admin/accounts/${accountIdStr}/status?account_type=${accountType}`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: status }),
    });
  }

  // Vendors
  async getVendors(skip = 0, limit = 100): Promise<{ vendors: any[]; total_count: number }> {
    return this.makeRequest(`/admin-vendor/vendors?skip=${skip}&limit=${limit}`);
  }

  async getVendorDetails(vendorId: string): Promise<any> {
    return this.makeRequest(`/admin/vendors/${vendorId}`);
  }

  async updateVendorAccountStatus(vendorId: string, status: string): Promise<any> {
    return this.makeRequest(`/admin/vendors/${vendorId}/account-status`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: status }),
    });
  }

  async updateVendorDocumentStatus(vendorId: string, status: string): Promise<any> {
    return this.makeRequest(`/admin/vendors/${vendorId}/document-status`, {
      method: 'PATCH',
      body: JSON.stringify({ document_status: status }),
    });
  }

  // Vehicle Owners
  async getVehicleOwners(skip = 0, limit = 100): Promise<{ vehicle_owners: any[]; total_count: number }> {
    return this.makeRequest(`/admin-vehcile-owner/vehicle-owners?skip=${skip}&limit=${limit}`);
  }

  async getVehicleOwnerDetails(vehicleOwnerId: string): Promise<any> {
    return this.makeRequest(`/admin/vehicle-owners/${vehicleOwnerId}`);
  }

  async updateVehicleOwnerAccountStatus(vehicleOwnerId: string, status: string): Promise<any> {
    return this.makeRequest(`/admin/vehicle-owners/${vehicleOwnerId}/account-status`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: status }),
    });
  }

  async updateVehicleOwnerDocumentStatus(vehicleOwnerId: string, status: string): Promise<any> {
    return this.makeRequest(`/admin/vehicle-owners/${vehicleOwnerId}/document-status`, {
      method: 'PATCH',
      body: JSON.stringify({ document_status: status }),
    });
  }

  // Cars
  async getCars(
    skip = 0,
    limit = 100,
    statusFilter?: 'ONLINE' | 'DRIVING' | 'BLOCKED' | 'PROCESSING' | string,
    carTypeFilter?: string,
    vehicleOwnerId?: string
  ): Promise<{
    cars: Array<{
      id: string;
      vehicle_owner_id: string;
      car_name: string;
      car_type: string;
      car_number: string;
      year_of_the_car: string;
      car_status: string;
      vehicle_owner_name: string;
      created_at: string;
    }>;
    total_count: number;
    online_count: number;
    blocked_count: number;
    processing_count: number;
    driving_count: number;
  }> {
    let queryParams = `skip=${skip}&limit=${limit}`;
    if (statusFilter) {
      queryParams += `&status_filter=${statusFilter}`;
    }
    if (carTypeFilter) {
      queryParams += `&car_type_filter=${carTypeFilter}`;
    }
    if (vehicleOwnerId) {
      queryParams += `&vehicle_owner_id=${vehicleOwnerId}`;
    }
    return this.makeRequest(`/admin/cars?${queryParams}`);
  }

  async updateCarAccountStatus(carId: string, status: string): Promise<any> {
    return this.makeRequest(`/admin/cars/${carId}/account-status`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: status }),
    });
  }

  async updateCarDocumentStatus(carId: string, documentType: string, status: string): Promise<any> {
    return this.makeRequest(`/admin/cars/${carId}/document-status?document_type=${documentType}`, {
      method: 'PATCH',
      body: JSON.stringify({ document_status: status }),
    });
  }

  // Drivers
  async updateDriverAccountStatus(driverId: string, status: string): Promise<any> {
    return this.makeRequest(`/admin/drivers/${driverId}/account-status`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: status }),
    });
  }

  async updateDriverDocumentStatus(driverId: string, status: string): Promise<any> {
    return this.makeRequest(`/admin/drivers/${driverId}/document-status`, {
      method: 'PATCH',
      body: JSON.stringify({ document_status: status }),
    });
  }

  // Orders
  async getOrders(skip = 0, limit = 100): Promise<{
    orders: any[];
    total_count: number;
    skip: number;
    limit: number;
  }> {
    return this.makeRequest(`/admin/orders?skip=${skip}&limit=${limit}`);
  }

  // Transfers
  async getPendingTransfers(skip = 0, limit = 100): Promise<{ transactions: any[]; total_count: number }> {
    return this.makeRequest(`/admin/transfers/pending?skip=${skip}&limit=${limit}`);
  }

  async processTransfer(transactionId: string, action: 'approve' | 'reject', notes?: string): Promise<any> {
    return this.makeRequest(`/admin/transfers/${transactionId}/process`, {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    });
  }

  async getTransferDetails(transactionId: string): Promise<any> {
    return this.makeRequest(`/admin/transfers/${transactionId}`);
  }

   async getAdminProfile(): Promise<any> {
    return this.makeRequest(`/admin/profile`);
  }

 async getAdminLedger(): Promise<any> {
    return this.makeRequest(`/admin/acccount-ledger`);
  }

  // Wallet Management
  async searchVehicleOwner(primaryNumber: string): Promise<any> {
    return this.makeRequest('/admin/search-vehicle-owner', {
      method: 'POST',
      body: JSON.stringify({ primary_number: primaryNumber }),
    });
  }

  async addMoneyToVehicleOwner(formData: FormData): Promise<any> {
    const token = await this.getAuthToken();
    const response = await fetch(`${BASE_URL}/admin/add-money-to-vehicle-owner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
}

export const apiService = new ApiService();

import axios from 'axios';

// const API_BASE_URL = 'http://10.115.254.247:8000';
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT automatically
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// ✅ 1️⃣ Search User (JSON BODY)
export const searchUserDetails = async (
  role: string,
  primaryNumber: string
) => {
  const response = await api.post(
    '/admin/search-user/details',
    {
      role: role,
      primary_number: primaryNumber,
    }
  );

  return response.data;
};


// ✅ 2️⃣ Reset Password (JSON BODY)
export const resetUserPassword = async (
  role: string,
  id: string,
  password: string
) => {
  const response = await api.post(
    '/admin/search-user/reset-password',
    {
      role: role,
      id: id,
      password: password,
    }
  );

  return response.data;
};