import React, { useState } from 'react';
import {
  CreditCard as CardIcon,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  Coins,
  CheckCircle2,
  Percent,
  Wallet
} from 'lucide-react';
import { CreditCard, BankDefinition } from '../../types';
import { Modal } from '../common/Modal';

interface CreditCardsViewProps {
  creditCards: CreditCard[];
  banks: BankDefinition[];
  isLoading: boolean;
  onSaveCard: (data: Partial<CreditCard>) => Promise<void>;
  onDeleteCard: (id: number) => Promise<void>;
  onPayCard: (id: number, amount: number, note?: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const CreditCardsView: React.FC<CreditCardsViewProps> = ({
  creditCards,
  banks,
  isLoading,
  onSaveCard,
  onDeleteCard,
  onPayCard,
  isAddModalOpen,
  setIsAddModalOpen
}) => {
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);
  const [payModalCard, setPayModalCard] = useState<CreditCard | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<CreditCard>>({
    bank_name: '',
    card_name: '',
    card_last4: '',
    total_limit: undefined,
    current_debt: 0,
    minimum_payment: 0,
    statement_day: 1,
    due_day: 10,
    color_theme: 'blue',
    notes: ''
  });

  const formatCurrency = (val: number) => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAdd = () => {
    setFormData({
      bank_name: banks[0]?.name || '',
      card_name: '',
      card_last4: '',
      total_limit: undefined,
      current_debt: 0,
      minimum_payment: 0,
      statement_day: 1,
      due_day: 10,
      color_theme: 'blue',
      notes: ''
    });
    setEditingCard(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormData({
      id: card.id,
      bank_name: card.bank_name,
      card_name: card.card_name,
      card_last4: card.card_last4 || '',
      total_limit: card.total_limit,
      current_debt: card.current_debt,
      minimum_payment: card.minimum_payment,
      statement_day: card.statement_day,
      due_day: card.due_day,
      color_theme: card.color_theme || 'emerald',
      notes: card.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveCard(formData);
      setIsAddModalOpen(false);
      setEditingCard(null);
    } catch (err: any) {
      alert(err.message || 'Kredi kartı kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPay = (card: CreditCard) => {
    setPayModalCard(card);
    setPayAmount(card.minimum_payment > 0 ? card.minimum_payment : card.current_debt);
    setPaymentNote('');
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalCard) return;
    setIsSubmitting(true);
    try {
      await onPayCard(payModalCard.id, payAmount, payNote);
      setPayModalCard(null);
    } catch (err: any) {
      alert(err.message || 'Ödeme işlenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregates
  let totalLimit = 0;
  let totalDebt = 0;
  let totalMinPayment = 0;

  creditCards.forEach((c) => {
    totalLimit += Number(c.total_limit || 0);
    totalDebt += Number(c.current_debt || 0);
    totalMinPayment += Number(c.minimum_payment || 0);
  });

  const availableTotal = Math.max(0, totalLimit - totalDebt);
  const overallUsedPct = totalLimit > 0 ? Math.round((totalDebt / totalLimit) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CardIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Kredi Kartı Yönetimi
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Kredi kartı limitleri, dönem borçları, asgari ödeme tutarları ve son ödeme günleri.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kart Ekle</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Toplam Kart Borcu</span>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(totalDebt)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">%{overallUsedPct} Limit Kullanımı</span>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Toplam Kart Limiti</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalLimit)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Kullanılabilir Limit</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrency(availableTotal)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Asgari Ödeme Yükü</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {formatCurrency(totalMinPayment)}
          </div>
        </div>
      </div>

      {/* Card Visual Grid */}
      {creditCards.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
          <CardIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Kayıtlı kredi kartı bulunamadı</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Kredi kartlarınızı tanımlayarak dönem borçlarınızı ve hesap kesim / son ödeme tarihlerini anlık takip edin.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            İlk Kartı Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creditCards.map((card) => {
            const availableLimit = Math.max(0, card.total_limit - card.current_debt);
            const usedPct = card.total_limit > 0 ? Math.round((card.current_debt / card.total_limit) * 100) : 0;
            const isHighDebt = usedPct > 80;

            return (
              <div
                key={card.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Visual Card Accent Top Border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        {card.bank_name}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {card.card_name}
                      </h3>
                      {card.card_last4 && (
                        <span className="text-xs text-slate-500 font-mono">
                          •••• •••• •••• {card.card_last4}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(card)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Kartı Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCardId(card.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Kartı Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Debt Numbers */}
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Güncel Dönem Borcu</span>
                      <span className="text-sm font-bold text-red-600">
                        {formatCurrency(card.current_debt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Asgari Ödeme</span>
                      <span className="font-bold text-amber-600">
                        {formatCurrency(card.minimum_payment)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                      <span className="text-slate-600 font-medium">Kullanılabilir Limit</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(availableLimit)} / {formatCurrency(card.total_limit)}
                      </span>
                    </div>
                  </div>

                  {/* Limit Usage Progress Bar */}
                  <div className="mt-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Limit Doluluk Oranı</span>
                      <span className={`font-mono font-bold ${isHighDebt ? 'text-red-600' : 'text-slate-700'}`}>
                        %{usedPct}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${usedPct}%` }}
                        className={`h-full transition-all duration-500 ${
                          isHighDebt ? 'bg-red-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Statement & Due Dates */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-slate-50 rounded border border-slate-200">
                    <div>
                      <span className="text-slate-500">Hesap Kesim:</span>
                      <span className="font-bold text-slate-800 ml-1">Ayın {card.statement_day}'i</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Son Ödeme:</span>
                      <span className="font-bold text-blue-600 ml-1">Ayın {card.due_day}'i</span>
                    </div>
                  </div>

                  {card.notes && (
                    <p className="mt-2.5 text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                      {card.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Pay Action */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Limit: {formatCurrency(card.total_limit)}
                  </span>
                  <button
                    onClick={() => handleOpenPay(card)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Borç Öde</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Card Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCard(null);
        }}
        title={editingCard ? 'Kredi Kartını Düzenle' : 'Yeni Kredi Kartı Ekle'}
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
                list="bank-card-suggestions"
                required
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Örn: Yapı Kredi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="bank-card-suggestions">
                {banks.map((b) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Kart Adı *
              </label>
              <input
                type="text"
                required
                value={formData.card_name || ''}
                onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
                placeholder="Örn: World Platinum, Maximum"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Toplam Kart Limiti (₺) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.total_limit || ''}
                onChange={(e) => setFormData({ ...formData, total_limit: parseFloat(e.target.value) || 0 })}
                placeholder="75000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Güncel Dönem Borcu (₺)
              </label>
              <input
                type="number"
                step="any"
                value={formData.current_debt ?? 0}
                onChange={(e) => {
                  const debt = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    current_debt: debt,
                    minimum_payment: Math.round(debt * 0.3)
                  });
                }}
                placeholder="15000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-red-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Asgari Ödeme Tutarı (₺)
              </label>
              <input
                type="number"
                step="any"
                value={formData.minimum_payment ?? 0}
                onChange={(e) => setFormData({ ...formData, minimum_payment: parseFloat(e.target.value) || 0 })}
                placeholder="4500"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-amber-600 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Hesap Kesim Günü *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={formData.statement_day || ''}
                onChange={(e) => setFormData({ ...formData, statement_day: parseInt(e.target.value, 10) || 1 })}
                placeholder="10"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Son Ödeme Günü *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={formData.due_day || ''}
                onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value, 10) || 1 })}
                placeholder="20"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Kart Son 4 Hane
              </label>
              <input
                type="text"
                maxLength={4}
                value={formData.card_last4 || ''}
                onChange={(e) => setFormData({ ...formData, card_last4: e.target.value })}
                placeholder="1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
              Notlar
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Örn: Yıllık aidatsız kart, otomatik ödeme talimatı var"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingCard(null);
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
              {isSubmitting ? 'Kaydediliyor...' : editingCard ? 'Güncelle' : 'Kartı Ekle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Card Modal */}
      <Modal
        isOpen={!!payModalCard}
        onClose={() => setPayModalCard(null)}
        title="Kredi Kartı Borcu Ödeme"
        maxWidth="md"
      >
        {payModalCard && (
          <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Kart:</span>
                <span className="font-bold text-slate-900">{payModalCard.bank_name} - {payModalCard.card_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Toplam Borç:</span>
                <span className="font-bold text-red-600 text-sm">{formatCurrency(payModalCard.current_debt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Asgari Tutar:</span>
                <span className="font-bold text-amber-600">{formatCurrency(payModalCard.minimum_payment)}</span>
              </div>
            </div>

            {/* Quick amount selectors */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPayAmount(payModalCard.minimum_payment)}
                className="flex-1 py-2 px-2 bg-white hover:bg-slate-50 text-amber-700 border border-slate-200 rounded-lg font-semibold text-center shadow-xs"
              >
                Asgari Tutarı Öde ({formatCurrency(payModalCard.minimum_payment)})
              </button>
              <button
                type="button"
                onClick={() => setPayAmount(payModalCard.current_debt)}
                className="flex-1 py-2 px-2 bg-white hover:bg-slate-50 text-emerald-700 border border-slate-200 rounded-lg font-semibold text-center shadow-xs"
              >
                Tüm Borcu Kapat ({formatCurrency(payModalCard.current_debt)})
              </button>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Ödenecek Tutar (₺) *
              </label>
              <input
                type="number"
                step="any"
                min="1"
                max={payModalCard.current_debt}
                required
                value={payAmount || ''}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Açıklama / Not
              </label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Örn: Garanti vadesiz hesaptan ödendi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayModalCard(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
              >
                {isSubmitting ? 'İşleniyor...' : 'Ödemeyi Kaydet'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingCardId}
        onClose={() => setDeletingCardId(null)}
        title="Kredi Kartını Sil"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700">
            Bu kredi kartını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDeletingCardId(null)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Vazgeç
            </button>
            <button
              onClick={async () => {
                if (deletingCardId) {
                  await onDeleteCard(deletingCardId);
                  setDeletingCardId(null);
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
