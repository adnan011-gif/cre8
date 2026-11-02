const rawBase = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

/**
 * Shared error parser for all fetch calls in the app.
 * Extracts the error message from a failed HTTP response,
 * supporting both Python FastAPI (detail) and Node.js (error/message) formats.
 *
 * Usage: if (!response.ok) throw new Error(await parseApiError(response));
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const body = await response.clone().json().catch(() => ({}));
    return body.detail || body.error?.message || body.error || body.message || `HTTP ${response.status} ${response.statusText}`;
  } catch {
    try {
      const text = await response.clone().text();
      return text || `HTTP ${response.status} ${response.statusText}`;
    } catch {
      return `HTTP ${response.status} ${response.statusText}`;
    }
  }
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Public so admin dashboard can call arbitrary endpoints
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {

    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle backend error response format
        if (data.error && typeof data.error === 'object' && data.error.message) {
          return {
            error: data.error.message,
          };
        }
        return {
          error: data.error || data.message || 'An error occurred',
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Authentication endpoints
  async signIn(email: string, password: string) {
    return this.request('/users/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signUp(email: string, password: string, name: string) {
    return this.request('/users/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName: name }),
    });
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return { error: 'No refresh token available' };
    }

    return this.request('/users/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Email verification code flow
  async sendCode(email: string) {
    return this.request('/users/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async sendCodeForSignUp(email: string) {
    return this.request('/users/send-code-signup', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyCode(email: string, code: string) {
    return this.request('/users/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async signInWithVerification(email: string, password: string, verificationToken: string) {
    return this.request('/users/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password, verificationToken }),
    });
  }

  async signUpWithVerification(email: string, password: string, fullName: string, verificationToken: string, userRole?: string) {
    return this.request('/users/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, verificationToken, userRole }),
    });
  }

  async forgotPassword(email: string) {
    return this.request('/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, verificationToken: string, password: string) {
    return this.request('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, verificationToken, password }),
    });
  }

  async logout() {
    return this.request('/users/logout', {
      method: 'POST',
    });
  }

  // User profile endpoints
  async getCurrentUser() {
    return this.request('/users/profile');
  }

  async updateUserProfile(profileData: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async updateRoleSpecificProfile(roleData: any) {
    return this.request('/users/profile/role-specific', {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }
  // Persona endpoints
  async extractPersonaFromYouTube(channelId: string) {
    return this.request('/youtube/extract-persona', {
      method: 'POST',
      body: JSON.stringify({ channelId }),
    });
  }

  async saveManualPersona(persona: any) {
    return this.request('/youtube/manual-persona', {
      method: 'POST',
      body: JSON.stringify({ persona }),
    });
  }
  async updatePersona(personaData: any) {
    return this.request('/users/persona', {
      method: 'PUT',
      body: JSON.stringify(personaData),
    });
  }

  async addPastOutput(outputData: any) {
    return this.request('/users/past-outputs', {
      method: 'POST',
      body: JSON.stringify(outputData),
    });
  }

  async deleteUserAccount() {
    return this.request('/users/account', {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Asset library endpoints
  async saveAsset(assetData: {
    type: 'image' | 'video' | 'thumbnail' | 'poster' | 'ad_creative' | 'short' | 'clip' | 'audio';
    hub: 'studio' | 'store' | 'agent' | 'echo';
    campaignId?: string;
    title?: string;
    description?: string;
    url: string;
    metadata?: any;
    tags?: string[];
  }) {
    return this.request('/assets', {
      method: 'POST',
      body: JSON.stringify(assetData),
    });
  }

  async getAssets(filters?: { hub?: string; type?: string; campaignId?: string }) {
    const params = new URLSearchParams();
    if (filters?.hub) params.append('hub', filters.hub);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.campaignId) params.append('campaignId', filters.campaignId);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/assets${query}`);
  }

  async deleteAsset(assetId: string) {
    return this.request(`/assets/${assetId}`, {
      method: 'DELETE',
    });
  }

  // Store endpoints
  async createProduct(productData: { name: string; description?: string; price: number; image?: string }) {
    return this.request('/store/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async getProducts() {
    return this.request('/store/products');
  }

  async updateProduct(productId: string, productData: any) {
    return this.request(`/store/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(productId: string) {
    return this.request(`/store/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async getPublicStorefront(creatorId: string) {
    return this.request(`/store/public/${creatorId}`);
  }

  async createCheckoutSession(checkoutData: { productId: string; customerEmail: string }) {
    return this.request('/store/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutData),
    });
  }

  async confirmMockPayment(sessionId: string) {
    return this.request('/store/checkout/confirm-mock', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async getCreatorOrders() {
    return this.request('/store/orders');
  }

  async updateOrderStatus(orderId: string, status: 'paid' | 'fulfilled' | 'refunded') {
    return this.request(`/store/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Agency endpoints
  async getAgencyProfile() {
    return this.request('/agency/profile');
  }

  async createAgencyProfile(agencyName: string) {
    return this.request('/agency/profile', {
      method: 'POST',
      body: JSON.stringify({ agencyName }),
    });
  }

  async getAgencyRoster() {
    return this.request('/agency/roster');
  }

  async addCreatorToRoster(creatorEmail: string, role: 'view' | 'act-as' = 'view') {
    return this.request('/agency/roster/add', {
      method: 'POST',
      body: JSON.stringify({ creatorEmail, role }),
    });
  }

  async removeCreatorFromRoster(creatorId: string) {
    return this.request(`/agency/roster/${creatorId}`, { method: 'DELETE' });
  }

  async updateCreatorRole(creatorId: string, role: 'view' | 'act-as') {
    return this.request(`/agency/roster/${creatorId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async actAsCreator(creatorId: string) {
    return this.request(`/agency/act-as/${creatorId}`, { method: 'POST' });
  }

  async getAgencyPerformance() {
    return this.request('/agency/performance');
  }

  async getAgencyAuditLog() {
    return this.request('/agency/audit');
  }

  // Ads / Campaign Planner endpoints
  async getAdProducts() {
    return this.request('/ads/products');
  }

  async generateAdCopy(productId: string, platform?: string, targetAudience?: string) {
    return this.request('/ads/generate-copy', {
      method: 'POST',
      body: JSON.stringify({ productId, platform, targetAudience }),
    });
  }

  async getAdCreatives() {
    return this.request('/ads/creatives');
  }

  async exportCampaignPack(data: {
    productId: string;
    adCopy: string;
    selectedAssetIds: string[];
    platform?: string;
    targetAudience?: string;
    budget?: string;
  }) {
    return this.request('/ads/export-pack', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Wallet endpoints
  async getWallet() {
    return this.request('/wallet');
  }

  async depositToWallet(amount: number) {
    return this.request('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async confirmWalletDeposit(sessionId: string) {
    return this.request('/wallet/confirm-deposit', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async spendFromWallet(amount: number, description?: string) {
    return this.request('/wallet/spend', {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    });
  }

  // Promotion endpoints
  async promoteProduct(productId: string, budget: number) {
    return this.request(`/store/products/${productId}/promote`, {
      method: 'POST',
      body: JSON.stringify({ budget }),
    });
  }

  async unPromoteProduct(productId: string) {
    return this.request(`/store/products/${productId}/unpromote`, {
      method: 'POST',
    });
  }

  // Performance Watcher endpoint
  async analyzePostPerformance(post: {
    title: string;
    type?: string;
    content?: string;
    metrics: { views?: number; likes?: number; comments?: number; shares?: number; engagement_rate?: number };
  }) {
    return this.request('/performance/analyze', {
      method: 'POST',
      body: JSON.stringify({ post }),
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
