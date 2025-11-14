import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://172.20.10.7:8000/api';

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

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed Force Logout:', error);
      this.logout()
      throw error;
    }
  }

  // Auth
  async login(credentials: { username: string; password: string }): Promise<{ access_token: string }> {
    const response = await this.makeRequest<{ access_token: string }>('/admin/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.access_token) {
      await AsyncStorage.setItem('auth_token', response.access_token);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
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