import { CONFIG } from './config';

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string | null;
}

const API = {
  async createExpense(data: { date: string; category: string; amount: string | number; memo: string }): Promise<ApiResponse> {
    return this.post('expenses', 'create', data);
  },

  async createIncome(data: { date: string; category: string; amount: string | number; memo: string }): Promise<ApiResponse> {
    return this.post('income', 'create', data);
  },

  async createSavings(data: { date: string; category: string; amount: string | number; memo: string }): Promise<ApiResponse> {
    return this.post('savings', 'create', data);
  },

  async createInvestment(data: Record<string, string | number>): Promise<ApiResponse> {
    return this.post('investments_transactions', 'create', data);
  },

  async get(params: URLSearchParams): Promise<ApiResponse> {
    try {
      if (!CONFIG.API_URL) throw new Error('API_URL이 설정되지 않았습니다.');
      const response = await fetch(`${CONFIG.API_URL}?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success !== undefined) return result;
      return { success: true, data: result, error: null };
    } catch (error) {
      console.error('API GET Error:', error);
      return { success: false, data: null, error: (error as Error).message };
    }
  },

  async post(sheet: string, action: string, data: Record<string, unknown>): Promise<ApiResponse> {
    try {
      if (!CONFIG.API_URL) throw new Error('API_URL이 설정되지 않았습니다.');
      const payload = { sheet, action, ...data };
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        cache: 'no-cache',
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success !== undefined) return result;
      return { success: true, data: result, error: null };
    } catch (error) {
      console.error('API POST Error:', error);
      return { success: false, data: null, error: (error as Error).message };
    }
  },
};

export default API;
