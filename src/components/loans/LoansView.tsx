import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  TrendingDown,
  Percent,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Loan, BankDefinition } from '../../types';
import { Modal } from '../common/Modal';

interface LoansViewProps {
  loans: Loan[];
  banks: BankDefinition[];
  isLoading: boolean;
  onSaveLoan: (data: Partial<Loan>) => Promise<void>;
  onDeleteLoan: (id: number) => Promise<void>;
  onPayInstallment: (id: number, note?: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const LoansView: React.FC<LoansViewProps> = ({
  loans,
  banks,
  isLoading,
  onSaveLoan,
  onDeleteLoan,
  onPayInstallment,
  isAddModalOpen,
  setIsAddModalOpen
}) => {
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingLoanId, setDeletingLoanId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payInstallmentModal, setPayInstallmentModal] = useState<Loan | null>(null);
  const [paymentNote, setPaymentNote] = useState('');

  // Form states
  const [formData, setFormData] = useState<Partial<Loan>>({
    bank_name: '',
    loan_name: '',
    total_amount: undefined,
    monthly_installment: undefined,
    due_day: 1,
    current_installment: 0,
    total_installments: 12,
    interest_rate: 0,
    notes: '',
    status: 'active'
  });

  const formatCurrency = (val: number) => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAdd = () => {
    setFormData({
      bank_name: banks[0]?.name || '',
      loan_name: '',
      total_amount: undefined,
      monthly_installment: undefined,
      due_day: 1,
      current_installment: 0,
      total_installments: 12,
      interest_rate: 0,
      notes: '',
      status: 'active'
    });
    setEditingLoan(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      id: loan.id,
      bank_name: loan.bank_name,
      loan_name: loan.loan_name,
      total_amount: loan.total_amount,
      monthly_installment: loan.monthly_installment,
      due_day: loan.due_day,
      current_installment: loan.current_installment,
      total_installments: loan.total_installments,
      interest_rate: loan.interest_rate,
      notes: loan.notes || '',
      status: loan.status
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveLoan(formData);
      setIsAddModalOpen(false);
      setEditingLoan(null);
    } catch (err: any) {
      alert(err.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPay = async (loan: Loan) => {
    try {
      await onPayInstallment(loan.id, paymentNote || `${loan.current_installment + 1}. taksit ödendi.`);
      // Confetti celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      setPayInstallmentModal(null);
      setPaymentNote('');
    } catch (err: any) {
      alert(err.message || 'Taksit ödenemedi.');
    }
  };

  const filteredLoans = loans.filter((l) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return l.status === 'active' && l.current_installment < l.total_installments;
    if (filterStatus === 'completed') return l.status === 'completed' || l.current_installment >= l.total_installments;
    return true;
  });

  // Aggregates for loan summary header
  let totalRemainingDebt = 0;
  let totalMonthlyInstallments = 0;

  loans.filter(l => l.status === 'active').forEach(l => {
    const remainingCount = Math.max(0, l.total_installments - l.current_installment);
    totalRemainingDebt += remainingCount * l.monthly_installment;
    totalMonthlyInstallments += Number(l.monthly_installment);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Kredi & Taksit Yönetimi
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Banka kredilerinizin taksit takibi, kalan borç hesapları ve ödeme planları.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kredi Ekle</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Toplam Kalan Kredi Borcu</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalRemainingDebt)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Aylık Toplam Taksit Yükü</span>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(totalMonthlyInstallments)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Aktif Kredi Sayısı</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {loans.filter(l => l.status === 'active').length} Adet
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            filterStatus === 'active'
              ? 'bg-white border border-slate-200 text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Aktif Krediler ({loans.filter(l => l.status === 'active' && l.current_installment < l.total_installments).length})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            filterStatus === 'completed'
              ? 'bg-white border border-slate-200 text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Biten / Kapatılan ({loans.filter(l => l.status === 'completed' || l.current_installment >= l.total_installments).length})
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            filterStatus === 'all'
              ? 'bg-white border border-slate-200 text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tümü ({loans.length})
        </button>
      </div>

      {/* Loans Grid */}
      {filteredLoans.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Bu filtrede kredi bulunamadı</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Yeni bir kredi tanımlayarak taksit planınızı ve kalan borcunuzu hemen takip etmeye başlayabilirsiniz.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            Kredi Tanımla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLoans.map((loan) => {
            const remainingCount = Math.max(0, loan.total_installments - loan.current_installment);
            const remainingDebt = remainingCount * loan.monthly_installment;
            const progressPercent = Math.min(100, Math.round((loan.current_installment / loan.total_installments) * 100));
            const isFinished = loan.current_installment >= loan.total_installments || loan.status === 'completed';

            return (
              <div
                key={loan.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
              >
                <div>
                  {/* Top Bar: Bank & Title */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {loan.bank_name}
                        </span>
                        {isFinished ? (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Tamamlandı
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Ödeme Günü: Ayın {loan.due_day}. Günü
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2 truncate">
                        {loan.loan_name}
                      </h3>
                    </div>

                    {/* Actions: Edit / Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(loan)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Krediyi Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingLoanId(loan.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Krediyi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Key Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Aylık Taksit</span>
                      <div className="text-sm font-bold text-red-600 mt-0.5">
                        {formatCurrency(loan.monthly_installment)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Kalan Toplam Borç</span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {formatCurrency(remainingDebt)}
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-500 font-medium">Toplam Çekilen</span>
                      <div className="text-sm font-bold text-slate-700 mt-0.5">
                        {formatCurrency(loan.total_amount)}
                      </div>
                    </div>
                  </div>

                  {/* Installment Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        Taksit: {loan.current_installment} / {loan.total_installments}
                      </span>
                      <span className="text-slate-500 font-medium">
                        %{progressPercent} Tamamlandı ({remainingCount} Taksit Kaldı)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${progressPercent}%` }}
                        className={`h-full transition-all duration-500 ${
                          isFinished ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                      />
                    </div>
                  </div>

                  {loan.notes && (
                    <p className="mt-3 text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                      Not: {loan.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {loan.interest_rate > 0 && <span>Faiz: %{loan.interest_rate} &bull; </span>}
                    <span>Vade Günü: {loan.due_day}</span>
                  </div>

                  {!isFinished && (
                    <button
                      onClick={() => setPayInstallmentModal(loan)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{loan.current_installment + 1}. Taksiti Öde</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Loan Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingLoan(null);
        }}
        title={editingLoan ? 'Kredi Bilgilerini Düzenle' : 'Yeni Kredi Tanımla'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Banka Adı *
              </label>
              <input
                type="text"
                list="bank-suggestions"
                required
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Örn: Garanti BBVA"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="bank-suggestions">
                {banks.map((b) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Kredi Adı / Tanımı *
              </label>
              <input
                type="text"
                required
                value={formData.loan_name || ''}
                onChange={(e) => setFormData({ ...formData, loan_name: e.target.value })}
                placeholder="Örn: İhtiyaç Kredisi, Konut Kredisi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Toplam Çekilen Kredi Tutarı (₺) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.total_amount || ''}
                onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                placeholder="100000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Aylık Taksit Tutarı (₺) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.monthly_installment || ''}
                onChange={(e) => setFormData({ ...formData, monthly_installment: parseFloat(e.target.value) || 0 })}
                placeholder="5500"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-red-600 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Ödeme Günü (Ayın Günü) *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={formData.due_day || ''}
                onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value, 10) || 1 })}
                placeholder="15"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Kaçıncı Taksitte? (Ödenen) *
              </label>
              <input
                type="number"
                min="0"
                max={formData.total_installments || 120}
                required
                value={formData.current_installment ?? 0}
                onChange={(e) => setFormData({ ...formData, current_installment: parseInt(e.target.value, 10) || 0 })}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Toplam Taksit Sayısı *
              </label>
              <input
                type="number"
                min="1"
                max="120"
                required
                value={formData.total_installments || ''}
                onChange={(e) => setFormData({ ...formData, total_installments: parseInt(e.target.value, 10) || 1 })}
                placeholder="24"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Aylık Faiz Oranı (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.interest_rate || ''}
                onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })}
                placeholder="3.89"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Kredi Durumu
              </label>
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Aktif (Ödeniyor)</option>
                <option value="completed">Tamamlandı / Kapandı</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
              Notlar / Açıklama
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Örn: Erken kapama opsiyonlu, dosya masrafı ödendi vb."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingLoan(null);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
            >
              {isSubmitting ? 'Kaydediliyor...' : editingLoan ? 'Güncelle' : 'Krediyi Ekle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Installment Quick Modal */}
      <Modal
        isOpen={!!payInstallmentModal}
        onClose={() => setPayInstallmentModal(null)}
        title="Taksit Ödemesi Onayı"
        maxWidth="md"
      >
        {payInstallmentModal && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-sm font-bold text-slate-900">{payInstallmentModal.loan_name}</div>
              <div className="text-slate-500 mt-0.5">{payInstallmentModal.bank_name}</div>
              
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Ödenecek Taksit:</span>
                <span className="font-bold text-blue-600 text-sm">
                  {payInstallmentModal.current_installment + 1} / {payInstallmentModal.total_installments}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-700 font-medium">Taksit Tutarı:</span>
                <span className="font-bold text-slate-900 text-base">
                  {formatCurrency(payInstallmentModal.monthly_installment)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                İşlem Notu (Opsiyonel)
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Örn: Garanti internet şubesinden ödendi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayInstallmentModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleQuickPay(payInstallmentModal)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ödendi Olarak Kaydet</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingLoanId}
        onClose={() => setDeletingLoanId(null)}
        title="Krediyi Sil"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700">
            Bu kredi tanımını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDeletingLoanId(null)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Vazgeç
            </button>
            <button
              onClick={async () => {
                if (deletingLoanId) {
                  await onDeleteLoan(deletingLoanId);
                  setDeletingLoanId(null);
                }
              }}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              Sil
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
