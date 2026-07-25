import type { AuthResponse, ApiResponse, PaginatedResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
    this.loadStoredAuth();
  }

  private loadStoredAuth() {
    try {
      const stored = localStorage.getItem('sb_user');
      if (stored) {
        const user = JSON.parse(stored);
        this.token = user?.access_token || null;
      }
    } catch {
      // ignore
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async fetchCsrfToken() {
    try {
      const res = await fetch(`${this.baseUrl}/api/csrf-token`);
      const data = await res.json();
      this.csrfToken = data.csrfToken;
      return data.csrfToken;
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (res.status === 401) {
      this.clearToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (res.status === 403) {
      throw new Error('CSRF token invalid');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || `HTTP ${res.status}`);
    }

    return data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async patch<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await this.post<AuthResponse>('/api/auth/login', { username, password });
    if (res.success && res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async signup(data: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    terms: boolean;
    referral_code?: string;
  }): Promise<AuthResponse> {
    return this.post('/api/auth/signup', data);
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    return this.post('/api/auth/forgot-password', { email });
  }

  async resetPassword(token: string, new_password: string): Promise<ApiResponse> {
    return this.post('/api/auth/reset-password', { token, new_password });
  }

  async changePassword(current_password: string, new_password: string): Promise<ApiResponse> {
    return this.post('/api/auth/change-password', { current_password, new_password });
  }

  async getMe(): Promise<ApiResponse<{ user: any }>> {
    return this.get('/api/auth/me');
  }

  // User PIN
  async setPin(userId: string, pin: string): Promise<ApiResponse> {
    return this.post(`/api/auth/users/${userId}/set-pin`, { pin });
  }

  async verifyPin(userId: string, pin: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/api/auth/users/${userId}/verify-pin`, { pin });
  }

  // Withdrawal accounts
  async addWithdrawalAccount(userId: string, account: any): Promise<ApiResponse<{ account: any }>> {
    return this.post(`/api/auth/users/${userId}/withdrawal-accounts`, { account });
  }

  async removeWithdrawalAccount(userId: string, accountId: string): Promise<ApiResponse> {
    return this.delete(`/api/auth/users/${userId}/withdrawal-accounts/${accountId}`);
  }

  // Deposits
  async createDeposit(data: {
    userId: string;
    amount: number;
    method: string;
    transactionId?: string;
    screenshotUrl: string;
  }): Promise<ApiResponse<{ deposit: any }>> {
    return this.post('/api/deposits', data);
  }

  async getUserDeposits(userId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/api/deposits/${userId}`);
  }

  // Withdrawals
  async createWithdrawal(data: {
    userId: string;
    amount: number;
    method?: string;
    details?: any;
  }): Promise<ApiResponse<{ withdrawal: any }>> {
    return this.post('/api/withdrawals', data);
  }

  async getUserWithdrawals(userId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/api/withdrawals/${userId}`);
  }

  // Aviator
  async getAviatorState(): Promise<ApiResponse<any>> {
    return this.get('/api/aviator/state');
  }

  async requestAviatorCrash(): Promise<ApiResponse> {
    return this.post('/api/aviator/crash', {});
  }

  async updateAviatorSettings(settings: any): Promise<ApiResponse> {
    return this.post('/api/aviator/settings', settings);
  }

  async placeAviatorBet(betData: any): Promise<ApiResponse> {
    return this.post('/api/aviator/bet', betData);
  }

  async cashoutAviatorBet(userId: string, betNum: number): Promise<ApiResponse> {
    return this.post('/api/aviator/cashout', { userId, betNum });
  }

  async cancelAviatorBet(userId: string, betNum: number, betId: string): Promise<ApiResponse> {
    return this.post('/api/aviator/cancel-bet', { userId, betNum, betId });
  }

  async getBetHistory(userId: string): Promise<ApiResponse<{ bets: any[], stats: any }>> {
    return this.get(`/api/aviator/bet-history?userId=${userId}`);
  }

  // Admin
  async adminLogin(username: string, password: string): Promise<AuthResponse> {
    const res = await this.post<AuthResponse>('/api/admin/login', { username, password });
    if (res.success && res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getDeposits(status?: string): Promise<ApiResponse<any[]>> {
    const query = status ? `?status=${status}` : '';
    return this.get(`/api/admin/deposits${query}`);
  }

  async approveDeposit(id: string, action: 'approve' | 'reject', note?: string): Promise<ApiResponse> {
    return this.post(`/api/admin/deposits/${id}`, { action, admin_note: note });
  }

  async getWithdrawals(status?: string): Promise<ApiResponse<any[]>> {
    const query = status ? `?status=${status}` : '';
    return this.get(`/api/admin/withdrawals${query}`);
  }

  async processWithdrawal(id: string, action: 'approve' | 'reject', note?: string): Promise<ApiResponse> {
    return this.post(`/api/admin/withdrawals/${id}`, { action, admin_note: note });
  }

  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    is_active?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams(params as any).toString();
    return this.get(`/api/admin/users?${query}`);
  }

  async getUser(id: string): Promise<ApiResponse<any>> {
    return this.get(`/api/admin/users/${id}`);
  }

  async updateUser(id: string, data: any): Promise<ApiResponse> {
    return this.put(`/api/admin/users/${id}`, data);
  }

  async toggleUserStatus(id: string): Promise<ApiResponse> {
    return this.post(`/api/admin/users/${id}/toggle-status`, {});
  }

  async resetUserPin(id: string, pin: string): Promise<ApiResponse> {
    return this.post(`/api/admin/users/${id}/reset-pin`, { pin });
  }

  async bulkUserAction(userIds: string[], action: string, reason?: string): Promise<ApiResponse> {
    return this.post('/api/admin/users/bulk', { userIds, action, reason });
  }

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    actorType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams(params as any).toString();
    return this.get(`/api/admin/audit?${query}`);
  }

  async getAdminAccounts(): Promise<ApiResponse<any[]>> {
    return this.get('/api/admin/accounts');
  }

  async createAdminAccount(data: any): Promise<ApiResponse> {
    return this.post('/api/admin/accounts', data);
  }

  async updateAdminAccount(id: string, data: any): Promise<ApiResponse> {
    return this.put(`/api/admin/accounts/${id}`, data);
  }

  async deleteAdminAccount(id: string): Promise<ApiResponse> {
    return this.delete(`/api/admin/accounts/${id}`);
  }

  async changeAdminPassword(newPassword: string): Promise<ApiResponse> {
    return this.post('/api/admin/change-password', { newPassword });
  }

  async getGames(): Promise<ApiResponse<any[]>> {
    return this.get('/api/admin/games');
  }

  async createGame(data: any): Promise<ApiResponse> {
    return this.post('/api/admin/games', data);
  }

  async updateGame(id: string, data: any): Promise<ApiResponse> {
    return this.put(`/api/admin/games/${id}`, data);
  }

  async deleteGame(id: string): Promise<ApiResponse> {
    return this.delete(`/api/admin/games/${id}`);
  }

  async getLandingContent(): Promise<ApiResponse<any>> {
    return this.get('/api/admin/landing');
  }

  async updateLandingContent(data: any): Promise<ApiResponse> {
    return this.put('/api/admin/landing', data);
  }

  async getWallet(): Promise<ApiResponse<any>> {
    return this.get('/api/admin/wallet');
  }

  async updateWallet(data: any): Promise<ApiResponse> {
    return this.put('/api/admin/wallet', data);
  }

  async getTransactions(params?: any): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams(params as any).toString();
    return this.get(`/api/admin/transactions?${query}`);
  }

  async getSupportTickets(params?: any): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams(params as any).toString();
    return this.get(`/api/admin/support?${query}`);
  }

  async replySupportTicket(id: string, reply: string): Promise<ApiResponse> {
    return this.post(`/api/admin/support/${id}/reply`, { reply });
  }

  async closeSupportTicket(id: string): Promise<ApiResponse> {
    return this.post(`/api/admin/support/${id}/close`, {});
  }

  async uploadImage(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-CSRF-Token': this.csrfToken || ''
      },
      body: formData,
      credentials: 'include'
    });
    
    return res.json();
  }
}

export const api = new ApiClient();

export default api;