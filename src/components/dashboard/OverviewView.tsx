import React from 'react';
import {
  TrendingUp,
  CreditCard,
  Building2,
  WalletCards,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Tags,
  Network,
  Globe
} from 'lucide-react';
import { FinancialSummaryData, UpcomingPayment, Loan, CreditCard as CardType, KmhAccount } from '../../types';
import { ActiveTab } from '../layout/Sidebar';

interface OverviewViewProps {
  summary: FinancialSummaryData | null;
  upcomingPayments: UpcomingPayment[];
  loans: Loan[];
  creditCards: CardType[];
  kmhAccounts: KmhAccount[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddLoan: () => void;
  onOpenAddCard: () => void;
  onOpenAddKmh: () => void;
  onPayLoan: (loanId: number) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  summary,
  upcomingPayments,
  loans,
  creditCards,
  kmhAccounts,
  setActiveTab,
  onOpenAddLoan,
  onOpenAddCard,
  onOpenAddKmh,
  onPayLoan
}) => {
  if (!summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Distribution calculations
  const totalDebt = summary.totalActiveDebt || 1;
  const loanPct = Math.round((summary.totalLoanRemainingDebt / totalDebt) * 100) || 0;
  const cardPct = Math.round((summary.totalCreditCardDebt / totalDebt) * 100) || 0;
  const kmhPct = Math.max(0, 100 - loanPct - cardPct);

  // Bank based consolidation
  const bankTotals: { [key: string]: { bank: string; total: number; loans: number; cards: number; kmh: number } } = {};

  loans.forEach((l) => {
    if (!bankTotals[l.bank_name]) {
      bankTotals[l.bank_name] = { bank: l.bank_name, total: 0, loans: 0, cards: 0, kmh: 0 };
    }
    const rem = (l.total_installments - l.current_installment) * l.monthly_installment;
    bankTotals[l.bank_name].loans += rem;
    bankTotals[l.bank_name].total += rem;
  });

  creditCards.forEach((c) => {
    if (!bankTotals[c.bank_name]) {
      bankTotals[c.bank_name] = { bank: c.bank_name, total: 0, loans: 0, cards: 0, kmh: 0 };
    }
    bankTotals[c.bank_name].cards += Number(c.current_debt || 0);
    bankTotals[c.bank_name].total += Number(c.current_debt || 0);
  });

  kmhAccounts.forEach((k) => {
    if (!bankTotals[k.bank_name]) {
      bankTotals[k.bank_name] = { bank: k.bank_name, total: 0, loans: 0, cards: 0, kmh: 0 };
    }
    bankTotals[k.bank_name].kmh += Number(k.used_amount || 0);
    bankTotals[k.bank_name].total += Number(k.used_amount || 0);
  });

  const sortedBanks = Object.values(bankTotals).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Finansal Durum & Borç Özeti
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Krediler, kredi kartları ve KMH bakiyelerinin anlık konsolide görünümü.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddLoan}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Kredi Ekle</span>
          </button>
          <button
            onClick={onOpenAddCard}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Kart Ekle</span>
          </button>
          <button
            onClick={onOpenAddKmh}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>KMH Ekle</span>
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Tags className="w-4 h-4" />
            <span>Kart Harcamaları</span>
          </button>
          <button
            onClick={() => setActiveTab('mindmap')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Network className="w-4 h-4" />
            <span>Zihin Haritası</span>
          </button>
          <button
            onClick={() => setActiveTab('url-monitor')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Web / URL Takip</span>
          </button>
        </div>
      </div>

      {/* 4 Professional Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Active Debt */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              Toplam Aktif Borç
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatCurrency(summary.totalActiveDebt)}
            </div>
          </div>
          <div className="text-blue-600 text-xs font-medium mt-3 flex items-center gap-1">
            <span>{summary.loanCount} Kredi &bull; {summary.creditCardCount} Kart &bull; {summary.kmhCount} KMH</span>
          </div>
        </div>

        {/* Monthly Total Commitment */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              Aylık Toplam Taksit & Yükümlülük
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-red-600">
              {formatCurrency(summary.totalMonthlyCommitment)}
            </div>
          </div>
          <div className="text-slate-500 text-xs mt-3 flex items-center justify-between">
            <span>Taksitler: {formatCurrency(summary.totalLoanMonthlyInstallment)}</span>
            <span
              onClick={() => setActiveTab('loans')}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              Takvim &rarr;
            </span>
          </div>
        </div>

        {/* Credit Cards Debt */}
        <div
          onClick={() => setActiveTab('cards')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              Kredi Kartları Borcu
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {formatCurrency(summary.totalCreditCardDebt)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs mt-3">
            <span className="text-slate-500">Limit: {formatCurrency(summary.totalCreditCardLimit)}</span>
            <span className="text-indigo-600 font-semibold">
              %{summary.totalCreditCardLimit > 0 ? Math.round((summary.totalCreditCardDebt / summary.totalCreditCardLimit) * 100) : 0} Dolu
            </span>
          </div>
        </div>

        {/* KMH Used */}
        <div
          onClick={() => setActiveTab('kmh')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              KMH / Ek Hesap Kullanımı
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {formatCurrency(summary.totalKmhUsed)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs mt-3">
            <span className="text-slate-500">Limit: {formatCurrency(summary.totalKmhLimit)}</span>
            <span className="text-emerald-600 font-semibold">
              %{summary.totalKmhLimit > 0 ? 100 - Math.round((summary.totalKmhUsed / summary.totalKmhLimit) * 100) : 100} Müsait
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Upcoming Payments & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Payments Table / List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Yaklaşan Ödemeler Takvimi
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Vade Gününe Göre Sıralı</span>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            {upcomingPayments.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">Yaklaşan veya bekleyen aktif ödeme bulunmuyor.</p>
                <p className="text-xs text-slate-500 mt-1">Borç ve kredilerinizi girdikçe ödeme takvimi otomatik oluşacaktır.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingPayments.map((item) => {
                  const isUrgent = item.daysRemaining <= 3;
                  const isSoon = item.daysRemaining <= 7;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center font-bold text-xs shrink-0 ${
                            item.type === 'loan'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.type === 'credit_card'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span className="text-xs font-bold leading-none">{item.dueDay}</span>
                          <span className="text-[9px] font-normal leading-tight">.GÜN</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                            <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-white text-slate-700 border border-slate-200 shrink-0">
                              {item.bankName}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.details}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency(item.amount)}
                          </div>
                          <div className="text-xs mt-0.5">
                            {isUrgent ? (
                              <span className="text-red-600 font-semibold flex items-center justify-end gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                {item.daysRemaining === 0 ? 'Bugün son gün' : `${item.daysRemaining} gün kaldı`}
                              </span>
                            ) : isSoon ? (
                              <span className="text-amber-600 font-semibold">
                                {item.daysRemaining} gün kaldı
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium">
                                {item.daysRemaining} gün sonra
                              </span>
                            )}
                          </div>
                        </div>

                        {item.type === 'loan' && (
                          <button
                            onClick={() => {
                              const rawId = parseInt(item.id.replace('loan-', ''), 10);
                              onPayLoan(rawId);
                            }}
                            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
                            title="Taksiti Ödendi Olarak İşaretle"
                          >
                            Öde
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Distribution & Banks */}
        <div className="space-y-6">
          {/* Debt Breakdown Pill Bar */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Borç Dağılım Oranları
            </h3>
            
            {/* Visual multi-segmented bar */}
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
              <div
                style={{ width: `${loanPct}%` }}
                className="bg-blue-600 h-full rounded-l-full transition-all duration-500"
                title={`Krediler: %${loanPct}`}
              />
              <div
                style={{ width: `${cardPct}%` }}
                className="bg-indigo-600 h-full transition-all duration-500"
                title={`Kredi Kartları: %${cardPct}`}
              />
              <div
                style={{ width: `${kmhPct}%` }}
                className="bg-amber-500 h-full rounded-r-full transition-all duration-500"
                title={`KMH / Ek Hesap: %${kmhPct}`}
              />
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                  <span className="text-slate-700 font-medium">Krediler</span>
                </div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(summary.totalLoanRemainingDebt)} <span className="text-slate-400 font-normal">(%{loanPct})</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                  <span className="text-slate-700 font-medium">Kredi Kartları</span>
                </div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(summary.totalCreditCardDebt)} <span className="text-slate-400 font-normal">(%{cardPct})</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span className="text-slate-700 font-medium">KMH / Ek Hesap</span>
                </div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(summary.totalKmhUsed)} <span className="text-slate-400 font-normal">(%{kmhPct})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Summary List */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bankalara Göre Borç
                </h3>
              </div>
            </div>

            {sortedBanks.length === 0 ? (
              <p className="text-xs text-slate-400">Tanımlı aktif borç bulunmuyor.</p>
            ) : (
              <div className="space-y-3">
                {sortedBanks.map((b) => (
                  <div key={b.bank} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900">{b.bank}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(b.total)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      {b.loans > 0 && <span>Kredi: {formatCurrency(b.loans)}</span>}
                      {b.cards > 0 && <span>Kart: {formatCurrency(b.cards)}</span>}
                      {b.kmh > 0 && <span>KMH: {formatCurrency(b.kmh)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
