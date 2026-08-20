import React, { useState, useRef } from 'react';
import {
  Settings,
  Lock,
  Building2,
  Database,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Server,
  Cloud,
  FileJson,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BankDefinition } from '../../types';
import { api } from '../../services/api';

interface SettingsViewProps {
  banks: BankDefinition[];
  onAddBank: (name: string, code?: string, color?: string) => Promise<void>;
  onDataImported?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ banks, onAddBank, onDataImported }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Bank add state
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankColor, setNewBankColor] = useState('#2563eb');
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [bankMsg, setBankMsg] = useState<string | null>(null);

  // Import / Export states
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword !== confirmPassword) {
      setPassError('Yeni şifre ve şifre tekrarı uyuşmuyor.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword, confirmPassword);
      setPassSuccess(res.message || 'Şifreniz başarıyla güncellendi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Şifre değiştirilemedi. Lütfen mevcut şifrenizi kontrol ediniz.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    setIsAddingBank(true);
    setBankMsg(null);
    try {
      await onAddBank(newBankName.trim(), newBankCode.trim() || undefined, newBankColor);
      setBankMsg('Banka tanımı başarıyla eklendi.');
      setNewBankName('');
      setNewBankCode('');
    } catch (err: any) {
      setBankMsg(err.message || 'Banka eklenemedi.');
    } finally {
      setIsAddingBank(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = api.getBackupUrl();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setIsImporting(true);

    try {
      const fileText = await file.text();
      let backupData;
      try {
        backupData = JSON.parse(fileText);
      } catch (parseErr) {
        throw new Error('Seçilen dosya geçerli bir JSON formatında değil.');
      }

      if (!backupData || !backupData.data) {
        throw new Error('Geçersiz KSADMIN yedek dosyası. "data" bloğu bulunamadı.');
      }

      const res = await api.importBackup(backupData, importMode);
      setImportStatus({
        type: 'success',
        message: res.message || 'Veritabanı yedeği başarıyla içeri aktarıldı.'
      });

      if (onDataImported) {
        await onDataImported();
      }
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: err.message || 'Yedek içeri aktarılırken bir hata oluştu.'
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Yönetici & Sistem Ayarları
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Giriş güvenliği, şifre değiştirme, tanım veritabanı ve tam veritabanı yedekleme / geri yükleme yönetimi.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Password Management */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Yönetici Şifresini Değiştir</h2>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 mb-5 text-xs text-slate-700 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900">Tek Yönetici Hesabı</div>
              <div className="text-slate-500 mt-0.5">
                Aktif Yönetici: <span className="font-mono text-blue-600 font-semibold">{user?.email || 'kemalsahin@gmail.com'}</span>
              </div>
            </div>
          </div>

          {passError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{passError}</span>
            </div>
          )}

          {passSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{passSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Mevcut Şifreniz *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mevcut şifrenizi girin (Varsayılan: 123**654)"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Yeni Şifre *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter yeni şifre"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Yeni Şifre Tekrarı *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifreyi tekrar girin"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isChangingPass ? 'Güncelleniyor...' : 'Şifreyi Güvenle Güncelle'}
            </button>
          </form>
        </div>

        {/* Right Column: Definitions / Banks Management */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Tanım Tabanlı Bankalar</h2>
          </div>

          <p className="text-xs text-slate-500">
            Kredi, kart ve KMH tanımlarken kullanılan banka parametre havuzudur.
          </p>

          {/* Add Bank Form */}
          <form onSubmit={handleCreateBank} className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div className="font-bold text-slate-900">Yeni Banka Tanımı Ekle</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Banka Adı</label>
                <input
                  type="text"
                  required
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Örn: Fibabanka"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Banka Kodu</label>
                <input
                  type="text"
                  value={newBankCode}
                  onChange={(e) => setNewBankCode(e.target.value)}
                  placeholder="Örn: FIBA"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAddingBank}
              className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 rounded-lg font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingBank ? 'Ekleniyor...' : 'Bankayı Tanımlara Ekle'}</span>
            </button>
            {bankMsg && <p className="text-[11px] text-blue-600 font-semibold text-center">{bankMsg}</p>}
          </form>

          {/* Existing Banks Badges */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kayıtlı Bankalar ({banks.length})</span>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {banks.map((b) => (
                <span
                  key={b.id}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>{b.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Database Export & Import Management */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Veritabanı Yedekleme & Geri Yükleme (Export / Import)</h2>
        </div>

        {importStatus && (
          <div
            className={`mb-6 p-4 rounded-xl border text-xs flex items-start gap-3 ${
              importStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">
                {importStatus.type === 'success' ? 'İşlem Başarılı' : 'Hata Oluştu'}
              </div>
              <p className="mt-0.5">{importStatus.message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
          {/* Export Box */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Veritabanı Export (Dışa Aktar)</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Tüm kredilerinizi, kredi kartlarınızı, KMH hesaplarınızı, banka tanımlarınızı ve ödeme kayıtlarınızı tek bir JSON dosyası olarak bilgisayarınıza indirin.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold shadow-xs transition-all cursor-pointer"
              >
                <FileJson className="w-4 h-4 text-blue-600" />
                <span>Yedek Dosyasını İndir (.json)</span>
              </button>
            </div>
          </div>

          {/* Import Box */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Veritabanı Import (İçe Aktar)</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Daha önce aldığınız bir KSADMIN JSON yedek dosyasını yükleyerek tüm verilerinizi anında geri yükleyin veya mevcut kayıtlara ekleyin.
              </p>

              {/* Import Mode Selector */}
              <div className="pt-1">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-blue-600"
                    />
                    <span>Üzerine Yaz (Tümünü Değiştir)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600"
                    />
                    <span>Mevcut Verilere Ekle</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Yedek Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>JSON Yedek Dosyası Seç & Yükle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Coolify & Docker Deployment Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
          <Server className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Coolify & Kalıcı SQLite Volume Bilgisi</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
          <p className="text-slate-500 leading-relaxed">
            KSADMIN, verilerini sunucuda <strong className="text-slate-800">/app/data/ksadmin.sqlite</strong> dosyasında saklar. Coolify üzerinde dağıtım yaparken bu klasöre bir persistent volume bağlayarak verilerinizin konteyner yeniden başlasa dahi korunmasını sağlayabilirsiniz.
          </p>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
            <div>Port: <span className="text-blue-600 font-bold">3000</span></div>
            <div>Docker Build: <span className="text-blue-600 font-bold">Dockerfile</span></div>
            <div>Volume Mount: <span className="text-blue-600 font-bold">/app/data</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
