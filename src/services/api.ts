import {
  User,
  Loan,
  CreditCard,
  KmhAccount,
  BankDefinition,
  PaymentRecord,
  FinancialSummaryData,
  UpcomingPayment,
  CardExpense,
  ExpenseAnalytics,
  MindmapVersion,
  UrlMonitorCategory,
  UrlMonitoredItem,
  UrlMonitorHistoryItem,
  UrlMonitorStats,
  DiffLine
} from '../types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('ksadmin_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  try {
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (text && text.trim().startsWith('{') && text.trim().endsWith('}')) {
        data = JSON.parse(text);
      } else {
        data = { error: text || `Sunucu geçersiz yanıt verdi (${res.status} ${res.statusText})` };
      }
    }
  } catch (err: any) {
    data = { error: `Sunucu yanıtı okunamadı (${res.status} ${res.statusText}): ${err.message}` };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // If unauthorized, clear token and notify auth context
      localStorage.removeItem('ksadmin_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    let errorMsg = data?.error;
    if (!errorMsg || typeof errorMsg !== 'string' || errorMsg.trim() === '') {
      if (res.status === 405) {
        errorMsg = 'Sunucu 405 Method Not Allowed döndürdü. Coolify uygulamanız "Static Site" olarak ayarlanmış olabilir; lütfen Coolify ayarlarından Build Pack olarak "Dockerfile" veya "Node.js" seçiniz.';
      } else if (res.status === 502 || res.status === 504) {
        errorMsg = 'Sunucuya ulaşılamıyor (502/504 Ağ Hatası). Coolify container veya port ayarlarını (Port 3000) kontrol edin.';
      } else if (res.status === 404) {
        errorMsg = 'API servisi bulunamadı (404). Sunucu başlatma komutunun çalıştığından emin olun.';
      } else {
        errorMsg = `İşlem gerçekleştirilemedi (${res.status} ${res.statusText || 'Bilinmeyen Hata'}).`;
      }
    }
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });
    return handleResponse(res);
  },

  // Summary
  async getSummary(): Promise<{ summary: FinancialSummaryData; upcomingPayments: UpcomingPayment[] }> {
    const res = await fetch(`${API_BASE}/financial/summary`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Loans
  async getLoans(): Promise<{ loans: Loan[] }> {
    const res = await fetch(`${API_BASE}/financial/loans`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createLoan(data: Partial<Loan>): Promise<{ success: boolean; loan: Loan }> {
    const res = await fetch(`${API_BASE}/financial/loans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateLoan(id: number, data: Partial<Loan>): Promise<{ success: boolean; loan: Loan }> {
    const res = await fetch(`${API_BASE}/financial/loans/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteLoan(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/financial/loans/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async payLoanInstallment(id: number, note?: string): Promise<{ success: boolean; message: string; loan: Loan }> {
    const res = await fetch(`${API_BASE}/financial/loans/${id}/pay-installment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ note })
    });
    return handleResponse(res);
  },

  // Credit Cards
  async getCreditCards(): Promise<{ creditCards: CreditCard[] }> {
    const res = await fetch(`${API_BASE}/financial/credit-cards`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createCreditCard(data: Partial<CreditCard>): Promise<{ success: boolean; card: CreditCard }> {
    const res = await fetch(`${API_BASE}/financial/credit-cards`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCreditCard(id: number, data: Partial<CreditCard>): Promise<{ success: boolean; card: CreditCard }> {
    const res = await fetch(`${API_BASE}/financial/credit-cards/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteCreditCard(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/financial/credit-cards/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async payCreditCard(id: number, amount: number, note?: string): Promise<{ success: boolean; message: string; card: CreditCard }> {
    const res = await fetch(`${API_BASE}/financial/credit-cards/${id}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount, note })
    });
    return handleResponse(res);
  },

  // KMH / Ek Hesap
  async getKmhAccounts(): Promise<{ kmhAccounts: KmhAccount[] }> {
    const res = await fetch(`${API_BASE}/financial/kmh`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createKmh(data: Partial<KmhAccount>): Promise<{ success: boolean; kmh: KmhAccount }> {
    const res = await fetch(`${API_BASE}/financial/kmh`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateKmh(id: number, data: Partial<KmhAccount>): Promise<{ success: boolean; kmh: KmhAccount }> {
    const res = await fetch(`${API_BASE}/financial/kmh/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteKmh(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/financial/kmh/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async adjustKmh(id: number, data: { new_used_amount?: number; payment_amount?: number; note?: string }): Promise<{ success: boolean; kmh: KmhAccount }> {
    const res = await fetch(`${API_BASE}/financial/kmh/${id}/adjust`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Definitions
  async getBankDefinitions(): Promise<{ banks: BankDefinition[] }> {
    const res = await fetch(`${API_BASE}/financial/definitions/banks`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createBankDefinition(data: { name: string; code?: string; color?: string }): Promise<{ success: boolean; bank: BankDefinition }> {
    const res = await fetch(`${API_BASE}/financial/definitions/banks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Payments
  async getPayments(): Promise<{ payments: PaymentRecord[] }> {
    const res = await fetch(`${API_BASE}/financial/payments`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deletePayment(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/financial/payments/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Credit Card Expenses & Analytics
  async getExpenses(params?: { month?: string; card_id?: number; category?: string; tag?: string; search?: string }): Promise<{ expenses: CardExpense[] }> {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', params.month);
    if (params?.card_id) query.set('card_id', String(params.card_id));
    if (params?.category) query.set('category', params.category);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/financial/expenses${queryString}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getExpenseAnalytics(month?: string): Promise<{ analytics: ExpenseAnalytics }> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    const res = await fetch(`${API_BASE}/financial/expenses/analytics${query}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createExpense(data: Partial<CardExpense> & { update_card_debt?: boolean }): Promise<{ success: boolean; expense: CardExpense }> {
    const res = await fetch(`${API_BASE}/financial/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateExpense(id: number, data: Partial<CardExpense>): Promise<{ success: boolean; expense: CardExpense }> {
    const res = await fetch(`${API_BASE}/financial/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteExpense(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/financial/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Mindmap Versions & Hierarchy
  async getMindmaps(params?: { year?: number; month?: number; month_str?: string }): Promise<{ mindmaps: MindmapVersion[] }> {
    const query = new URLSearchParams();
    if (params?.year) query.set('year', String(params.year));
    if (params?.month) query.set('month', String(params.month));
    if (params?.month_str) query.set('month_str', params.month_str);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/financial/mindmaps${queryString}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getMindmapById(id: number): Promise<{ mindmap: MindmapVersion }> {
    const res = await fetch(`${API_BASE}/financial/mindmaps/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createMindmap(data: Partial<MindmapVersion>): Promise<{ success: boolean; mindmap: MindmapVersion; message: string }> {
    const res = await fetch(`${API_BASE}/financial/mindmaps`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateMindmap(id: number, data: Partial<MindmapVersion>): Promise<{ success: boolean; mindmap: MindmapVersion; message: string }> {
    const res = await fetch(`${API_BASE}/financial/mindmaps/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteMindmap(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/financial/mindmaps/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Export & Import (Backup / Restore)
  getBackupUrl(): string {
    const token = localStorage.getItem('ksadmin_token');
    return `${API_BASE}/financial/backup/export?token=${token}`;
  },

  async importBackup(backupData: any, mode: 'replace' | 'append' = 'replace'): Promise<{ success: boolean; message: string; counts?: any }> {
    const res = await fetch(`${API_BASE}/financial/backup/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ backupData, mode })
    });
    return handleResponse(res);
  },

  // ==========================================
  // URL MONITOR & WEB TRACKER CLIENT METHODS
  // ==========================================

  async getUrlCategories(): Promise<{ success: boolean; categories: UrlMonitorCategory[] }> {
    const res = await fetch(`${API_BASE}/url-monitor/categories`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createUrlCategory(data: { name: string; color?: string; icon?: string }): Promise<{ success: boolean; category: UrlMonitorCategory }> {
    const res = await fetch(`${API_BASE}/url-monitor/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateUrlCategory(id: number, data: { name?: string; color?: string; icon?: string }): Promise<{ success: boolean; category: UrlMonitorCategory }> {
    const res = await fetch(`${API_BASE}/url-monitor/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteUrlCategory(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/url-monitor/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getUrlMonitoredItems(params?: { category_id?: string | number; has_changes?: string | boolean; search?: string }): Promise<{
    success: boolean;
    items: UrlMonitoredItem[];
    stats: UrlMonitorStats;
  }> {
    const query = new URLSearchParams();
    if (params?.category_id !== undefined) query.append('category_id', String(params.category_id));
    if (params?.has_changes !== undefined) query.append('has_changes', String(params.has_changes));
    if (params?.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/url-monitor/items${qs}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getUrlMonitoredItemById(id: number): Promise<{
    success: boolean;
    item: UrlMonitoredItem;
    history: UrlMonitorHistoryItem[];
    baselineDiff: {
      hasChanged: boolean;
      diffLines: DiffLine[];
      summary: string;
      addedCount: number;
      removedCount: number;
      unchangedCount: number;
      changePercentage: number;
    };
  }> {
    const res = await fetch(`${API_BASE}/url-monitor/items/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async testFetchUrl(url: string): Promise<{
    success: boolean;
    snapshot: {
      success: boolean;
      httpStatus: number;
      title: string;
      text: string;
      hash: string;
      error?: string;
    };
  }> {
    const res = await fetch(`${API_BASE}/url-monitor/test-fetch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url })
    });
    return handleResponse(res);
  },

  async createUrlMonitoredItem(data: {
    category_id?: number | null;
    title?: string;
    url: string;
    is_tracked?: number;
    check_interval_hours?: number;
    notes?: string;
    initial_content?: string;
  }): Promise<{ success: boolean; message: string; item: UrlMonitoredItem }> {
    const res = await fetch(`${API_BASE}/url-monitor/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateUrlMonitoredItem(id: number, data: Partial<UrlMonitoredItem>): Promise<{ success: boolean; message: string; item: UrlMonitoredItem }> {
    const res = await fetch(`${API_BASE}/url-monitor/items/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteUrlMonitoredItem(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/url-monitor/items/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async checkUrlItemNow(id: number): Promise<{
    success: boolean;
    message: string;
    item: UrlMonitoredItem;
    history: UrlMonitorHistoryItem[];
    baselineDiff: {
      hasChanged: boolean;
      diffLines: DiffLine[];
      summary: string;
      addedCount: number;
      removedCount: number;
      unchangedCount: number;
      changePercentage: number;
    };
    error?: string;
  }> {
    const res = await fetch(`${API_BASE}/url-monitor/items/${id}/check`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async checkAllUrlItems(): Promise<{ success: boolean; message: string; checkedCount: number; changedCount: number }> {
    const res = await fetch(`${API_BASE}/url-monitor/check-all`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async acknowledgeUrlChanges(id: number): Promise<{
    success: boolean;
    message: string;
    item: UrlMonitoredItem;
    history: UrlMonitorHistoryItem[];
    baselineDiff: any;
  }> {
    const res = await fetch(`${API_BASE}/url-monitor/items/${id}/acknowledge`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async toggleUrlItemTracking(id: number): Promise<{
    success: boolean;
    message: string;
    item: UrlMonitoredItem;
  }> {
    const res = await fetch(`${API_BASE}/url-monitor/items/${id}/toggle-track`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};

