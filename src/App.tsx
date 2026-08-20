import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { LoginView } from './components/auth/LoginView';
import { OverviewView } from './components/dashboard/OverviewView';
import { LoansView } from './components/loans/LoansView';
import { CreditCardsView } from './components/credit-cards/CreditCardsView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { KmhView } from './components/kmh/KmhView';
import { PaymentsView } from './components/payments/PaymentsView';
import { SettingsView } from './components/settings/SettingsView';
import { api } from './services/api';
import {
  Loan,
  CreditCard,
  KmhAccount,
  BankDefinition,
  PaymentRecord,
  FinancialSummaryData,
  UpcomingPayment
} from './types';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

function DashboardContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [kmhAccounts, setKmhAccounts] = useState<KmhAccount[]>([]);
  const [banks, setBanks] = useState<BankDefinition[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Modal open triggers
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isAddKmhModalOpen, setIsAddKmhModalOpen] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const loadAllData = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      const [summaryRes, loansRes, cardsRes, kmhRes, banksRes, paymentsRes] = await Promise.all([
        api.getSummary(),
        api.getLoans(),
        api.getCreditCards(),
        api.getKmhAccounts(),
        api.getBankDefinitions(),
        api.getPayments()
      ]);

      setSummary(summaryRes.summary);
      setUpcomingPayments(summaryRes.upcomingPayments);
      setLoans(loansRes.loans);
      setCreditCards(cardsRes.creditCards);
      setKmhAccounts(kmhRes.kmhAccounts);
      setBanks(banksRes.banks);
      setPayments(paymentsRes.payments);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Loan actions
  const handleSaveLoan = async (data: Partial<Loan>) => {
    if (data.id) {
      await api.updateLoan(data.id, data);
      showToast('Kredi bilgileri başarıyla güncellendi.');
    } else {
      await api.createLoan(data);
      showToast('Yeni kredi başarıyla eklendi.');
    }
    await loadAllData();
  };

  const handleDeleteLoan = async (id: number) => {
    await api.deleteLoan(id);
    showToast('Kredi kaydı silindi.');
    await loadAllData();
  };

  const handlePayLoanInstallment = async (id: number, note?: string) => {
    const res = await api.payLoanInstallment(id, note);
    showToast(res.message || 'Taksit ödendi olarak kaydedildi.');
    await loadAllData();
  };

  // Credit Card actions
  const handleSaveCard = async (data: Partial<CreditCard>) => {
    if (data.id) {
      await api.updateCreditCard(data.id, data);
      showToast('Kredi kartı başarıyla güncellendi.');
    } else {
      await api.createCreditCard(data);
      showToast('Yeni kredi kartı başarıyla eklendi.');
    }
    await loadAllData();
  };

  const handleDeleteCard = async (id: number) => {
    await api.deleteCreditCard(id);
    showToast('Kredi kartı kaydı silindi.');
    await loadAllData();
  };

  const handlePayCard = async (id: number, amount: number, note?: string) => {
    await api.payCreditCard(id, amount, note);
    showToast(`₺${amount.toLocaleString('tr-TR')} kart ödemesi işlendi.`);
    await loadAllData();
  };

  // KMH actions
  const handleSaveKmh = async (data: Partial<KmhAccount>) => {
    if (data.id) {
      await api.updateKmh(data.id, data);
      showToast('KMH hesabı başarıyla güncellendi.');
    } else {
      await api.createKmh(data);
      showToast('Yeni KMH hesabı başarıyla tanımlandı.');
    }
    await loadAllData();
  };

  const handleDeleteKmh = async (id: number) => {
    await api.deleteKmh(id);
    showToast('KMH hesabı silindi.');
    await loadAllData();
  };

  const handleAdjustKmh = async (id: number, data: { new_used_amount?: number; payment_amount?: number; note?: string }) => {
    await api.adjustKmh(id, data);
    showToast('KMH bakiyesi başarıyla güncellendi.');
    await loadAllData();
  };

  // Bank definition action
  const handleAddBank = async (name: string, code?: string, color?: string) => {
    await api.createBankDefinition({ name, code, color });
    showToast(`${name} banka tanımlarına eklendi.`);
    await loadAllData();
  };

  // Payment record deletion
  const handleDeletePayment = async (id: number) => {
    await api.deletePayment(id);
    showToast('İşlem kaydı silindi.');
    await loadAllData();
  };

  // On database import completion
  const handleDataImported = async () => {
    showToast('Veritabanı yedeği yüklendi ve veriler güncellendi.');
    await loadAllData();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-wider uppercase text-slate-800">KSADMIN Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <OverviewView
                summary={summary}
                upcomingPayments={upcomingPayments}
                loans={loans}
                creditCards={creditCards}
                kmhAccounts={kmhAccounts}
                setActiveTab={setActiveTab}
                onOpenAddLoan={() => {
                  setActiveTab('loans');
                  setIsAddLoanModalOpen(true);
                }}
                onOpenAddCard={() => {
                  setActiveTab('cards');
                  setIsAddCardModalOpen(true);
                }}
                onOpenAddKmh={() => {
                  setActiveTab('kmh');
                  setIsAddKmhModalOpen(true);
                }}
                onPayLoan={handlePayLoanInstallment}
              />
            )}

            {activeTab === 'loans' && (
              <LoansView
                loans={loans}
                banks={banks}
                isLoading={isDataLoading}
                onSaveLoan={handleSaveLoan}
                onDeleteLoan={handleDeleteLoan}
                onPayInstallment={handlePayLoanInstallment}
                isAddModalOpen={isAddLoanModalOpen}
                setIsAddModalOpen={setIsAddLoanModalOpen}
              />
            )}

            {activeTab === 'cards' && (
              <CreditCardsView
                creditCards={creditCards}
                banks={banks}
                isLoading={isDataLoading}
                onSaveCard={handleSaveCard}
                onDeleteCard={handleDeleteCard}
                onPayCard={handlePayCard}
                isAddModalOpen={isAddCardModalOpen}
                setIsAddModalOpen={setIsAddCardModalOpen}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView
                creditCards={creditCards}
                onRefreshCards={loadAllData}
                showToast={showToast}
              />
            )}

            {activeTab === 'kmh' && (
              <KmhView
                kmhAccounts={kmhAccounts}
                banks={banks}
                isLoading={isDataLoading}
                onSaveKmh={handleSaveKmh}
                onDeleteKmh={handleDeleteKmh}
                onAdjustKmh={handleAdjustKmh}
                isAddModalOpen={isAddKmhModalOpen}
                setIsAddModalOpen={setIsAddKmhModalOpen}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsView
                payments={payments}
                isLoading={isDataLoading}
                onDeletePayment={handleDeletePayment}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                banks={banks}
                onAddBank={handleAddBank}
                onDataImported={handleDataImported}
              />
            )}
          </div>
        </main>
      </div>

      {/* Bottom Nav for Mobile */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-white border-emerald-200 text-emerald-800'
                : 'bg-white border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
