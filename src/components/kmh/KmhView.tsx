import React, { useState } from 'react';
import {
  WalletCards,
  Plus,
  Edit2,
  Trash2,
  Percent,
  TrendingDown,
  Coins,
  Copy,
  Check
} from 'lucide-react';
import { KmhAccount, BankDefinition } from '../../types';
import { Modal } from '../common/Modal';

interface KmhViewProps {
  kmhAccounts: KmhAccount[];
  banks: BankDefinition[];
  isLoading: boolean;
  onSaveKmh: (data: Partial<KmhAccount>) => Promise<void>;
  onDeleteKmh: (id: number) => Promise<void>;
  onAdjustKmh: (id: number, data: { new_used_amount?: number; payment_amount?: number; note?: string }) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const KmhView: React.FC<KmhViewProps> = ({
  kmhAccounts,
  banks,
  isLoading,
  onSaveKmh,
  onDeleteKmh,
  onAdjustKmh,
  isAddModalOpen,
  setIsAddModalOpen
}) => {
  const [editingKmh, setEditingKmh] = useState<KmhAccount | null>(null);
  const [deletingKmhId, setDeletingKmhId] = useState<number | null>(null);
  const [adjustModalKmh, setAdjustModalKmh] = useState<KmhAccount | null>(null);
  const [adjustMode, setAdjustMode] = useState<'pay' | 'set'>('pay');
  const [adjustValue, setAdjustValue] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState('');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<KmhAccount>>({
    bank_name: '',
    account_name: '',
    total_limit: undefined,
    used_amount: 0,
    interest_rate: 5.00,
    due_day: 1,
    iban: '',
    notes: ''
  });

  const formatCurrency = (val: number) => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAdd = () => {
    setFormData({
      bank_name: banks[0]?.name || '',
      account_name: '',
      total_limit: undefined,
      used_amount: 0,
      interest_rate: 5.00,
      due_day: 1,
      iban: '',
      notes: ''
    });
    setEditingKmh(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (kmh: KmhAccount) => {
    setEditingKmh(kmh);
    setFormData({
      id: kmh.id,
      bank_name: kmh.bank_name,
      account_name: kmh.account_name,
      total_limit: kmh.total_limit,
      used_amount: kmh.used_amount,
      interest_rate: kmh.interest_rate,
      due_day: kmh.due_day,
      iban: kmh.iban || '',
      notes: kmh.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveKmh(formData);
      setIsAddModalOpen(false);
      setEditingKmh(null);
    } catch (err: any) {
      alert(err.message || 'KMH hesabı kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAdjust = (kmh: KmhAccount) => {
    setAdjustModalKmh(kmh);
    setAdjustMode('pay');
    setAdjustValue(kmh.used_amount);
    setAdjustNote('');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalKmh) return;
    setIsSubmitting(true);
    try {
      if (adjustMode === 'pay') {
        await onAdjustKmh(adjustModalKmh.id, {
          payment_amount: adjustValue,
          note: adjustNote || 'KMH hesabı borç ödemesi yapıldı'
        });
      } else {
        await onAdjustKmh(adjustModalKmh.id, {
          new_used_amount: adjustValue,
          note: adjustNote || 'KMH kullanılan bakiye güncellendi'
        });
      }
      setAdjustModalKmh(null);
    } catch (err: any) {
      alert(err.message || 'Bakiye güncellenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  // Aggregates
  let totalKmhLimit = 0;
  let totalKmhUsed = 0;

  kmhAccounts.forEach((k) => {
    totalKmhLimit += Number(k.total_limit || 0);
    totalKmhUsed += Number(k.used_amount || 0);
  });

  const availableKmhTotal = Math.max(0, totalKmhLimit - totalKmhUsed);
  const usedRatio = totalKmhLimit > 0 ? Math.round((totalKmhUsed / totalKmhLimit) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <WalletCards className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Kredili Mevduat Hesabı (KMH / Ek Hesap)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Banka ek hesap limitleri, kullanılan tutarlar, faiz oranları ve bakiye kapatma yönetimi.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni KMH Tanımla</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Toplam Kullanılan KMH Borcu</span>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(totalKmhUsed)}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold mt-1 block">%{usedRatio} Limit Kullanımı</span>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Toplam KMH Tanımlı Limit</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalKmhLimit)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Kullanılabilir Boş Limit</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrency(availableKmhTotal)}
          </div>
        </div>
      </div>

      {/* KMH Accounts Grid */}
      {kmhAccounts.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
          <WalletCards className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Kayıtlı KMH / Ek Hesap bulunamadı</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Bankalarınızdaki kredili mevduat hesaplarını tanımlayarak anlık kullanılan eksi bakiyelerinizi kontrol altında tutun.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            İlk KMH Hesabını Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kmhAccounts.map((kmh) => {
            const available = Math.max(0, kmh.total_limit - kmh.used_amount);
            const pct = kmh.total_limit > 0 ? Math.round((kmh.used_amount / kmh.total_limit) * 100) : 0;
            const isFull = pct >= 90;

            return (
              <div
                key={kmh.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                        {kmh.bank_name}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">
                        {kmh.account_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(kmh)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="KMH Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingKmhId(kmh.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="KMH Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Numbers */}
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Kullanılan Tutar (Borç)</span>
                      <span className="text-sm font-bold text-red-600">
                        {formatCurrency(kmh.used_amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Kullanılabilir Boş Limit</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(available)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                      <span className="text-slate-600 font-medium">Toplam KMH Limiti</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(kmh.total_limit)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Limit Kullanımı</span>
                      <span className={`font-mono font-bold ${isFull ? 'text-red-600' : 'text-slate-700'}`}>
                        %{pct}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full transition-all duration-500 ${
                          isFull ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Details / IBAN */}
                  <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Aylık Faiz Oranı:</span>
                      <span className="text-slate-800 font-bold">%{kmh.interest_rate}</span>
                    </div>
                    {kmh.iban && (
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="font-mono text-slate-700 truncate">{kmh.iban}</span>
                        <button
                          onClick={() => copyToClipboard(kmh.iban!)}
                          className="ml-2 p-1 text-slate-400 hover:text-blue-600 shrink-0"
                          title="IBAN Kopyala"
                        >
                          {copiedIban === kmh.iban ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {kmh.notes && (
                    <p className="mt-2.5 text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                      {kmh.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Hesap Kesim: Ayın {kmh.due_day}. günü
                  </span>
                  <button
                    onClick={() => handleOpenAdjust(kmh)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-amber-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Bakiye Güncelle / Öde</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit KMH Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingKmh(null);
        }}
        title={editingKmh ? 'KMH Hesabını Düzenle' : 'Yeni KMH Hesabı Tanımla'}
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
                list="bank-kmh-suggestions"
                required
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Örn: Akbank, Ziraat"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="bank-kmh-suggestions">
                {banks.map((b) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Hesap Adı / Tanım *
              </label>
              <input
                type="text"
                required
                value={formData.account_name || ''}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="Örn: Artı Para (Maaş Hesabı)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Toplam KMH Limiti (₺) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.total_limit || ''}
                onChange={(e) => setFormData({ ...formData, total_limit: parseFloat(e.target.value) || 0 })}
                placeholder="30000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Şu An Kullanılan Tutar (₺)
              </label>
              <input
                type="number"
                step="any"
                value={formData.used_amount ?? 0}
                onChange={(e) => setFormData({ ...formData, used_amount: parseFloat(e.target.value) || 0 })}
                placeholder="5000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-red-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Aylık Faiz Oranı (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.interest_rate ?? 5.0}
                onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })}
                placeholder="5.00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Hesap / IBAN No (Opsiyonel)
              </label>
              <input
                type="text"
                value={formData.iban || ''}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Faiz Tahakkuk / Vade Günü
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.due_day || 1}
                onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value, 10) || 1 })}
                placeholder="1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              placeholder="Örn: Otomatik fatura talimatı bağlı"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingKmh(null);
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
              {isSubmitting ? 'Kaydediliyor...' : editingKmh ? 'Güncelle' : 'Hesabı Ekle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust KMH Modal */}
      <Modal
        isOpen={!!adjustModalKmh}
        onClose={() => setAdjustModalKmh(null)}
        title="KMH Bakiyesi Güncelle / Borç Kapat"
        maxWidth="md"
      >
        {adjustModalKmh && (
          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Hesap:</span>
                <span className="font-bold text-slate-900">{adjustModalKmh.bank_name} - {adjustModalKmh.account_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Mevcut Borç (Kullanılan):</span>
                <span className="font-bold text-red-600 text-sm">{formatCurrency(adjustModalKmh.used_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Toplam Limit:</span>
                <span className="font-semibold text-slate-700">{formatCurrency(adjustModalKmh.total_limit)}</span>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAdjustMode('pay');
                  setAdjustValue(adjustModalKmh.used_amount);
                }}
                className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all ${
                  adjustMode === 'pay' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Borç Ödeme Yap
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustMode('set');
                  setAdjustValue(adjustModalKmh.used_amount);
                }}
                className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all ${
                  adjustMode === 'set' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yeni Borç Bakiyesi Gir
              </button>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                {adjustMode === 'pay' ? 'Ödenecek / Kapatılacak Tutar (₺) *' : 'Yeni Kullanılan Bakiye (₺) *'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max={adjustModalKmh.total_limit}
                required
                value={adjustValue}
                onChange={(e) => setAdjustValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                İşlem Açıklaması
              </label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Örn: Maaş yattı, bakiye sıfırlandı"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustModalKmh(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
              >
                {isSubmitting ? 'İşleniyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingKmhId}
        onClose={() => setDeletingKmhId(null)}
        title="KMH Hesabını Sil"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700">
            Bu KMH tanımını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDeletingKmhId(null)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Vazgeç
            </button>
            <button
              onClick={async () => {
                if (deletingKmhId) {
                  await onDeleteKmh(deletingKmhId);
                  setDeletingKmhId(null);
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
