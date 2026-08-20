export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface BankDefinition {
  id: number;
  name: string;
  code?: string;
  color?: string;
  is_active: number;
  created_at?: string;
}

export interface Loan {
  id: number;
  bank_name: string;
  loan_name: string;
  total_amount: number;
  monthly_installment: number;
  due_day: number;
  current_installment: number;
  total_installments: number;
  interest_rate: number;
  start_date?: string;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface CreditCard {
  id: number;
  bank_name: string;
  card_name: string;
  card_last4?: string;
  total_limit: number;
  current_debt: number;
  minimum_payment: number;
  statement_day: number;
  due_day: number;
  color_theme?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KmhAccount {
  id: number;
  bank_name: string;
  account_name: string;
  total_limit: number;
  used_amount: number;
  interest_rate: number;
  due_day: number;
  iban?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseSubItem {
  id: string;
  name: string;
  amount: number;
  category?: string;
  notes?: string;
}

export interface CardExpense {
  id: number;
  card_id?: number | null;
  card_name: string;
  amount: number;
  category: string;
  tags: string[]; // array in client, stored as JSON/comma string in DB
  expense_date: string; // YYYY-MM-DD
  description: string;
  installment_count?: number;
  sub_items: ExpenseSubItem[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseAnalytics {
  totalAmount: number;
  expenseCount: number;
  month: string; // YYYY-MM
  categoryBreakdown: { category: string; amount: number; percentage: number; count: number }[];
  tagBreakdown: { tag: string; amount: number; percentage: number; count: number }[];
  cardBreakdown: { card_name: string; amount: number; percentage: number; count: number }[];
  dailyBreakdown: { date: string; amount: number }[];
}

export interface PaymentRecord {
  id: number;
  target_type: 'loan' | 'credit_card' | 'kmh';
  target_id: number;
  target_name: string;
  bank_name: string;
  amount: number;
  payment_date: string;
  installment_number?: number;
  notes?: string;
  created_at?: string;
}

export interface UpcomingPayment {
  id: string;
  title: string;
  bankName: string;
  type: 'loan' | 'credit_card' | 'kmh';
  amount: number;
  dueDay: number;
  daysRemaining: number;
  details: string;
}

export interface MindmapVersion {
  id: number;
  year: number;
  month: number; // 1-12
  month_str: string; // 'YYYY-MM'
  title: string;
  content: string; // Markdown text
  theme?: string;
  is_active?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MindmapNode {
  id: string;
  text: string;
  level: number; // 0 for root (H1), 1 for H2, 2 for H3, etc.
  side?: 'left' | 'right' | 'root';
  children: MindmapNode[];
  isCollapsed?: boolean;
  color?: string;
  tag?: string;
}

export interface FinancialSummaryData {
  totalActiveDebt: number;
  totalMonthlyCommitment: number;
  totalCreditCardLimit: number;
  totalCreditCardDebt: number;
  totalKmhLimit: number;
  totalKmhUsed: number;
  totalLoanRemainingDebt: number;
  totalLoanMonthlyInstallment: number;
  loanCount: number;
  creditCardCount: number;
  kmhCount: number;
}
