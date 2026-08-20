import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Calendar,
  ExternalLink,
  Trash2,
  Edit3,
  Check,
  X,
  Layers,
  FileText,
  History,
  Tag,
  Filter,
  Eye,
  EyeOff,
  Bookmark,
  Play,
  Pause,
  FolderPlus,
  CheckSquare,
  Square,
  Sparkles,
  Link,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../../services/api';
import {
  UrlMonitoredItem,
  UrlMonitorCategory,
  UrlMonitorHistoryItem,
  UrlMonitorStats,
  DiffLine
} from '../../types';

export const UrlMonitorView: React.FC = () => {
  // Main Data States
  const [items, setItems] = useState<UrlMonitoredItem[]>([]);
  const [categories, setCategories] = useState<UrlMonitorCategory[]>([]);
  const [stats, setStats] = useState<UrlMonitorStats>({
    totalItems: 0,
    changedItemsCount: 0,
    checkedTodayCount: 0,
    categoriesCount: 0
  });

  // Selection & Sidebar States
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<{
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
  } | null>(null);

  const [activeSidebarTab, setActiveSidebarTab] = useState<'diff' | 'history' | 'preview'>('diff');
  const [diffFilterOnlyChanges, setDiffFilterOnlyChanges] = useState<boolean>(false);

  // Filters & Search
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>('all');
  const [changeFilter, setChangeFilter] = useState<'all' | 'tracked' | 'untracked' | 'changed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading & Action States
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isCheckingSingle, setIsCheckingSingle] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isTogglingTrack, setIsTogglingTrack] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<UrlMonitoredItem> | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<UrlMonitoredItem | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<UrlMonitorCategory | null>(null);

  // Add/Edit Form State
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formIsTracked, setFormIsTracked] = useState<number>(1);
  const [formInterval, setFormInterval] = useState<number>(24);
  const [formNotes, setFormNotes] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text?: string; title?: string; error?: string } | null>(null);

  // Category Modal Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#2563eb');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('#2563eb');

  // Load Data
  const loadData = useCallback(async (preserveSelection = true) => {
    setIsLoading(true);
    try {
      let hasChangesParam: string | undefined = undefined;
      let isTrackedParam: string | undefined = undefined;

      if (changeFilter === 'changed') {
        hasChangesParam = '1';
      } else if (changeFilter === 'tracked') {
        isTrackedParam = '1';
      } else if (changeFilter === 'untracked') {
        isTrackedParam = '0';
      }

      const [catsRes, itemsRes] = await Promise.all([
        api.getUrlCategories(),
        api.getUrlMonitoredItems({
          category_id: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
          has_changes: hasChangesParam,
          search: searchQuery || undefined
        })
      ]);

      if (catsRes.success) setCategories(catsRes.categories);
      if (itemsRes.success) {
        let filteredItems = itemsRes.items;
        if (changeFilter === 'tracked') {
          filteredItems = filteredItems.filter(i => i.is_tracked !== 0);
        } else if (changeFilter === 'untracked') {
          filteredItems = filteredItems.filter(i => i.is_tracked === 0);
        }

        setItems(filteredItems);
        setStats(itemsRes.stats);

        // Auto select first item if none selected or keep current selection
        if (filteredItems.length > 0) {
          if (!preserveSelection || !selectedItemId || !filteredItems.some(i => i.id === selectedItemId)) {
            loadItemDetail(filteredItems[0].id);
          } else {
            loadItemDetail(selectedItemId);
          }
        } else {
          setSelectedItemId(null);
          setSelectedItemDetail(null);
        }
      }
    } catch (err: any) {
      console.error('Error loading URL monitor data:', err);
      showToast('Veriler yüklenirken hata oluştu', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategoryId, changeFilter, searchQuery, selectedItemId]);

  useEffect(() => {
    loadData(true);
  }, [selectedCategoryId, changeFilter]);

  // Load Single Item Detail with Diff and History
  const loadItemDetail = async (id: number) => {
    setSelectedItemId(id);
    setIsDetailLoading(true);
    try {
      const res = await api.getUrlMonitoredItemById(id);
      if (res.success) {
        setSelectedItemDetail(res);
      }
    } catch (err: any) {
      console.error('Error loading item detail:', err);
      showToast('Detay yüklenemedi', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Check Single URL Live
  const handleCheckSingle = async (id: number) => {
    setIsCheckingSingle(true);
    try {
      const res = await api.checkUrlItemNow(id);
      if (res.success) {
        showToast(res.message);
        setSelectedItemDetail(res);
        setItems(prev => prev.map(item => (item.id === id ? res.item : item)));
        const itemsRes = await api.getUrlMonitoredItems();
        if (itemsRes.success) setStats(itemsRes.stats);
      } else {
        showToast(res.error || 'Tarama başarısız oldu', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Tarama yapılamadı', 'error');
    } finally {
      setIsCheckingSingle(false);
    }
  };

  // Check All URLs Live
  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    try {
      const res = await api.checkAllUrlItems();
      if (res.success) {
        showToast(res.message);
        await loadData(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Toplu tarama hatası', 'error');
    } finally {
      setIsCheckingAll(false);
    }
  };

  // Toggle URL Item Tracking (Takip Et / Takip Etme)
  const handleToggleTracking = async (id: number) => {
    setIsTogglingTrack(true);
    try {
      const res = await api.toggleUrlItemTracking(id);
      if (res.success) {
        showToast(res.message);
        await loadData(true);
        if (selectedItemId === id) {
          loadItemDetail(id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Takip durumu değiştirilemedi', 'error');
    } finally {
      setIsTogglingTrack(false);
    }
  };

  // Acknowledge Changes (Set Current as New Baseline)
  const handleAcknowledge = async (id: number) => {
    setIsAcknowledging(true);
    try {
      const res = await api.acknowledgeUrlChanges(id);
      if (res.success) {
        showToast('Değişiklik onaylandı ve yeni referans olarak kaydedildi.');
        setSelectedItemDetail(res);
        setItems(prev => prev.map(item => (item.id === id ? res.item : item)));
        setStats(prev => ({
          ...prev,
          changedItemsCount: Math.max(0, prev.changedItemsCount - 1)
        }));
      }
    } catch (err: any) {
      showToast(err.message || 'İşlem tamamlanamadı', 'error');
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Open Add/Edit Modal
  const openAddModal = () => {
    setEditingItem(null);
    setFormCategoryId(
      selectedCategoryId !== 'all' && selectedCategoryId !== 'uncategorized'
        ? String(selectedCategoryId)
        : categories[0]?.id
        ? String(categories[0].id)
        : ''
    );
    setFormTitle('');
    setFormUrl('');
    setFormIsTracked(1);
    setFormInterval(24);
    setFormNotes('');
    setTestResult(null);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (item: UrlMonitoredItem) => {
    setEditingItem(item);
    setFormCategoryId(item.category_id ? String(item.category_id) : '');
    setFormTitle(item.title);
    setFormUrl(item.url);
    setFormIsTracked(item.is_tracked !== undefined ? item.is_tracked : 1);
    setFormInterval(item.check_interval_hours || 24);
    setFormNotes(item.notes || '');
    setTestResult(null);
    setIsAddEditModalOpen(true);
  };

  // Test URL in Modal
  const handleTestUrlInModal = async () => {
    if (!formUrl || !formUrl.trim()) {
      showToast('Lütfen önce bir URL girin', 'error');
      return;
    }
    setIsTestingUrl(true);
    setTestResult(null);
    try {
      const res = await api.testFetchUrl(formUrl.trim());
      if (res.success && res.snapshot.success) {
        setTestResult({
          success: true,
          title: res.snapshot.title,
          text: res.snapshot.text
        });
        if (!formTitle && res.snapshot.title) {
          setFormTitle(res.snapshot.title);
        }
        showToast('Sayfa başarıyla test edildi ve içerik çekildi.');
      } else {
        setTestResult({
          success: false,
          error: res.snapshot.error || 'Sayfa içeriği çekilemedi'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Bağlantı hatası'
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Save URL (Create or Update)
  const handleSaveUrlItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl || !formUrl.trim()) {
      showToast('URL alanı zorunludur', 'error');
      return;
    }

    try {
      if (editingItem?.id) {
        // Update
        await api.updateUrlMonitoredItem(editingItem.id, {
          category_id: formCategoryId ? Number(formCategoryId) : null,
          title: formTitle.trim() || formUrl.trim(),
          url: formUrl.trim(),
          is_tracked: formIsTracked,
          check_interval_hours: Number(formInterval),
          notes: formNotes
        });
        showToast('URL kaydı güncellendi.');
        setIsAddEditModalOpen(false);
        await loadData(true);
        if (selectedItemId === editingItem.id) {
          loadItemDetail(editingItem.id);
        }
      } else {
        // Create
        const res = await api.createUrlMonitoredItem({
          category_id: formCategoryId ? Number(formCategoryId) : null,
          title: formTitle.trim(),
          url: formUrl.trim(),
          is_tracked: formIsTracked,
          check_interval_hours: Number(formInterval),
          notes: formNotes,
          initial_content: testResult?.success ? testResult.text : undefined
        });
        showToast(formIsTracked === 1 ? 'URL takibe alındı ve ilk snapshot kaydedildi.' : 'URL yer imi olarak eklendi.');
        setIsAddEditModalOpen(false);
        await loadData(false);
        if (res.item?.id) {
          loadItemDetail(res.item.id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Kaydetme işlemi başarısız', 'error');
    }
  };

  // Delete URL Item
  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.deleteUrlMonitoredItem(deleteConfirmItem.id);
      showToast(`"${deleteConfirmItem.title}" listeden silindi.`);
      setDeleteConfirmItem(null);
      if (selectedItemId === deleteConfirmItem.id) {
        setSelectedItemId(null);
        setSelectedItemDetail(null);
      }
      await loadData(false);
    } catch (err: any) {
      showToast(err.message || 'Silme işlemi başarısız', 'error');
    }
  };

  // Category Management Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createUrlCategory({
        name: newCatName.trim(),
        color: newCatColor
      });
      setNewCatName('');
      showToast('Yeni kategori oluşturuldu.');
      const catsRes = await api.getUrlCategories();
      if (catsRes.success) setCategories(catsRes.categories);
    } catch (err: any) {
      showToast(err.message || 'Kategori eklenemedi', 'error');
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editCatName.trim()) return;
    try {
      await api.updateUrlCategory(id, {
        name: editCatName.trim(),
        color: editCatColor
      });
      setEditingCatId(null);
      showToast('Kategori güncellendi.');
      const catsRes = await api.getUrlCategories();
      if (catsRes.success) setCategories(catsRes.categories);
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Kategori güncellenemedi', 'error');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirmCategory) return;
    try {
      await api.deleteUrlCategory(deleteConfirmCategory.id);
      showToast(`"${deleteConfirmCategory.name}" kategorisi silindi.`);
      if (selectedCategoryId === deleteConfirmCategory.id) setSelectedCategoryId('all');
      setDeleteConfirmCategory(null);
      const catsRes = await api.getUrlCategories();
      if (catsRes.success) setCategories(catsRes.categories);
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Kategori silinemedi', 'error');
    }
  };

  // Preset Colors for Categories
  const categoryColorPresets = [
    '#2563eb', // Blue
    '#16a34a', // Green
    '#7c3aed', // Purple
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#e11d48', // Rose
    '#d97706', // Amber
    '#4f46e5'  // Indigo
  ];

  // Helper date formatting
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Active item detail references
  const currentItem = selectedItemDetail?.item;
  const isCurrentItemTracked = currentItem ? currentItem.is_tracked !== 0 : false;
  const currentDiff = selectedItemDetail?.baselineDiff;
  const diffLines = currentDiff?.diffLines || [];

  // Filtered diff lines
  const displayedDiffLines = diffFilterOnlyChanges
    ? diffLines.filter(l => l.type !== 'unchanged')
    : diffLines;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1700px] mx-auto p-4 gap-4 overflow-hidden select-none">
      {/* ======================================================== */}
      {/* TOP HEADER & STATS BAR                                   */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center justify-center shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Web Sayfası & URL Değişiklik Takipçisi</span>
              <span className="text-[11px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                Otomatik Diff & Snapshot
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Kategori bazlı URL'leri düzenleyin, takip durumunu belirleyin ve değişiklikleri satır satır inceleyin.
            </p>
          </div>
        </div>

        {/* Quick Stats & Main Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* Stat Badges */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 text-xs">
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <span>Toplam URL:</span>
              <span className="font-bold text-slate-900">{stats.totalItems}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-rose-600 font-medium">
              <span className="relative flex h-2 w-2">
                {stats.changedItemsCount > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Değişen:</span>
              <span className="font-bold">{stats.changedItemsCount}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bugün Taranan:</span>
              <span className="font-bold">{stats.checkedTodayCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            title="Kategorileri Düzenle / Sil"
          >
            <Tag className="w-3.5 h-3.5 text-slate-600" />
            <span>Kategorileri Yönet ({categories.length})</span>
          </button>

          <button
            onClick={handleCheckAll}
            disabled={isCheckingAll || items.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            title="Tüm takip edilen aktif URL'leri hemen canlı tara"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAll ? 'animate-spin' : ''}`} />
            <span>{isCheckingAll ? 'Taranıyor...' : 'Tümünü Kontrol Et'}</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni URL Ekle</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2-COLUMN MAIN CONTENT (LEFT: LIST, RIGHT: SIDEBAR)       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* ====================================================== */}
        {/* LEFT COLUMN: FILTER TABS & URL LIST (5 COLS)           */}
        {/* ====================================================== */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden h-full">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="URL adı, web adresi veya notlarda ara..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadData(true)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    loadData(true);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tracking & Change Status Filter Bar */}
            <div className="flex items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setChangeFilter('all')}
                  className={`px-2 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                    changeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tümü ({stats.totalItems})
                </button>
                <button
                  onClick={() => setChangeFilter('changed')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                    changeFilter === 'changed'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-rose-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Değişenler ({stats.changedItemsCount})</span>
                </button>
                <button
                  onClick={() => setChangeFilter('tracked')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                    changeFilter === 'tracked'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Takip Edilenler</span>
                </button>
                <button
                  onClick={() => setChangeFilter('untracked')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                    changeFilter === 'untracked'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  <Bookmark className="w-3 h-3" />
                  <span>Takip Edilmeyenler</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                {items.length} Kayıt
              </span>
            </div>

            {/* Category Pills Slider with Quick Manage */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                  selectedCategoryId === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tüm Kategoriler
              </button>

              {categories.map(cat => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors shrink-0 ${
                      isSelected
                        ? 'text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                    style={{
                      backgroundColor: isSelected ? (cat.color || '#2563eb') : undefined
                    }}
                  >
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: isSelected ? '#ffffff' : (cat.color || '#2563eb')
                        }}
                      />
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] px-1 rounded-full ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {cat.item_count || 0}
                      </span>
                    </button>

                    {/* Quick Edit Category Action in Pill */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingCatId(cat.id);
                        setEditCatName(cat.name);
                        setEditCatColor(cat.color || '#2563eb');
                        setIsCategoryModalOpen(true);
                      }}
                      className={`p-0.5 rounded transition-colors hover:scale-110 cursor-pointer ${
                        isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                      }`}
                      title={`"${cat.name}" kategorisini düzenle / sil`}
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}

              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 transition-colors cursor-pointer shrink-0"
                title="Yeni Kategori Ekle veya Yönet"
              >
                <Plus className="w-3 h-3 text-slate-500" />
                <span>Kategori Ekle</span>
              </button>
            </div>
          </div>

          {/* URL Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {isLoading ? (
              <div className="py-16 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">URL kayıtları yükleniyor...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-14 px-4 text-center space-y-3 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-800">URL Kaydı Bulunamadı</h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    {searchQuery || selectedCategoryId !== 'all' || changeFilter !== 'all'
                      ? 'Filtreleme kriterlerinize uygun kayıt bulunamadı.'
                      : 'Henüz bir web adresi eklemediniz.'}
                  </p>
                </div>
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>İlk URL'yi Ekle</span>
                </button>
              </div>
            ) : (
              items.map(item => {
                const isSelected = selectedItemId === item.id;
                const isTracked = item.is_tracked !== 0;
                const hasChange = isTracked && item.has_changes === 1;

                return (
                  <div
                    key={item.id}
                    onClick={() => loadItemDetail(item.id)}
                    className={`group relative p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-400 shadow-sm ring-1 ring-blue-400/30'
                        : hasChange
                        ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300 hover:bg-rose-50/50'
                        : !isTracked
                        ? 'bg-slate-50/40 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Status indicator bar on left */}
                    <div
                      className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
                        !isTracked
                          ? 'bg-slate-300'
                          : hasChange
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                      }`}
                    />

                    <div className="pl-1.5 space-y-2">
                      {/* Top Row: Category + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.category_name ? (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md truncate"
                              style={{
                                backgroundColor: `${item.category_color || '#2563eb'}18`,
                                color: item.category_color || '#2563eb'
                              }}
                            >
                              {item.category_name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              Genel
                            </span>
                          )}

                          {isTracked ? (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Her {item.check_interval_hours || 24}s</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Bookmark className="w-2.5 h-2.5" />
                              <span>Yer İmi</span>
                            </span>
                          )}
                        </div>

                        {/* Change / Tracking Status Badge */}
                        {!isTracked ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                            <EyeOff className="w-3 h-3 text-slate-400" />
                            <span>Takip Kapalı</span>
                          </span>
                        ) : hasChange ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            <span>Değişiklik Var</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Referansla Aynı</span>
                          </span>
                        )}
                      </div>

                      {/* Title & URL */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <span className="truncate max-w-[280px] font-mono text-[10px] text-slate-400">
                            {item.url}
                          </span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-slate-400 hover:text-blue-600 p-0.5"
                            title="Yeni sekmede aç"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>

                      {/* Change Summary Snippet if changed and tracked */}
                      {isTracked && item.change_summary && (
                        <div
                          className={`text-[11px] px-2 py-1 rounded-md font-medium ${
                            hasChange
                              ? 'bg-rose-100/60 text-rose-800 border border-rose-200/60'
                              : 'bg-slate-100/80 text-slate-600'
                          }`}
                        >
                          {item.change_summary}
                        </div>
                      )}

                      {/* Bottom Row: Dates & Quick Action buttons */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {isTracked ? (
                            <span title="Son Kontrol Tarihi">
                              Kontrol: <strong className="text-slate-600 font-semibold">{formatDate(item.last_checked_at)}</strong>
                            </span>
                          ) : (
                            <span>
                              Kayıt: <strong className="text-slate-600 font-semibold">{formatDate(item.created_at)}</strong>
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Quick Toggle Tracking Button */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleTracking(item.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              isTracked
                                ? 'hover:text-amber-700 hover:bg-amber-50 text-slate-400'
                                : 'hover:text-blue-600 hover:bg-blue-50 text-blue-600'
                            }`}
                            title={isTracked ? 'Takibi Durdur (Yer İmine Dönüştür)' : 'Takibi Başlat (Değişiklikleri İzle)'}
                          >
                            {isTracked ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </button>

                          {isTracked && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleCheckSingle(item.id);
                              }}
                              className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded text-slate-500 transition-colors"
                              title="Şimdi Canlı Kontrol Et"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openEditModal(item);
                            }}
                            className="p-1 hover:text-slate-900 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                            title="Düzenle"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteConfirmItem(item);
                            }}
                            className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded text-slate-500 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ====================================================== */}
        {/* RIGHT COLUMN: DETAIL & DIFF SIDEBAR (7 COLS)           */}
        {/* ====================================================== */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden h-full">
          {selectedItemId && currentItem ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Detail Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {currentItem.category_name ? (
                        <span
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${currentItem.category_color || '#2563eb'}20`,
                            color: currentItem.category_color || '#2563eb'
                          }}
                        >
                          {currentItem.category_name}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-md">
                          Genel
                        </span>
                      )}

                      {/* Change Status or Untracked Status Badge */}
                      {!isCurrentItemTracked ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <Bookmark className="w-3 h-3 text-amber-700" />
                          <span>Takip Kapalı (Yer İmi)</span>
                        </span>
                      ) : currentItem.has_changes === 1 ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                          <span>Değişiklik Tespit Edildi</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Referansla Aynı (Güncel)</span>
                        </span>
                      )}

                      {isCurrentItemTracked && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          HTTP {currentItem.http_status || 200}
                        </span>
                      )}
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight line-clamp-1">
                      {currentItem.title}
                    </h2>

                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-mono">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={currentItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate max-w-md flex items-center gap-1"
                      >
                        <span>{currentItem.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* Sidebar Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* If Tracked -> Check Single & Acknowledge */}
                    {isCurrentItemTracked && (
                      <>
                        <button
                          onClick={() => handleCheckSingle(currentItem.id)}
                          disabled={isCheckingSingle}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          title="Bu URL'yi hemen canlı tara"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSingle ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">{isCheckingSingle ? 'Taranıyor...' : 'Şimdi Tara'}</span>
                        </button>

                        {currentItem.has_changes === 1 && (
                          <button
                            onClick={() => handleAcknowledge(currentItem.id)}
                            disabled={isAcknowledging}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            title="Bu değişikliği onayla ve mevcut içeriği yeni referans yap"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Değişikliği Onayla</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Toggle Tracking Quick Button */}
                    <button
                      onClick={() => handleToggleTracking(currentItem.id)}
                      disabled={isTogglingTrack}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                        isCurrentItemTracked
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-xs'
                      }`}
                      title={isCurrentItemTracked ? 'Otomatik takibi durdur' : 'Değişiklik takibini başlat'}
                    >
                      {isCurrentItemTracked ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Takibi Durdur</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Takibi Başlat</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => openEditModal(currentItem)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                      title="URL Bilgilerini Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmItem(currentItem)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs transition-colors cursor-pointer"
                      title="URL Kaydını Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tracking vs Non-Tracking Content */}
                {isCurrentItemTracked ? (
                  <>
                    {/* Important Dates Summary Card */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-medium block">İlk Referans Kaydı</span>
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(currentItem.created_at)}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-medium block">Son Değişim Tarihi</span>
                        <span
                          className={`font-bold text-[11px] flex items-center gap-1 ${
                            currentItem.has_changes ? 'text-rose-600 font-extrabold' : 'text-slate-700'
                          }`}
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatDate(currentItem.last_changed_at)}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-medium block">Son Kontrol Zamanı</span>
                        <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {formatDate(currentItem.last_checked_at)}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-medium block">Kontrol Sıklığı</span>
                        <span className="font-bold text-slate-700 text-[11px]">
                          Her {currentItem.check_interval_hours || 24} Saatte Bir
                        </span>
                      </div>
                    </div>

                    {/* Navigation Tabs for Sidebar */}
                    <div className="flex items-center justify-between border-b border-slate-200 pt-1">
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <button
                          onClick={() => setActiveSidebarTab('diff')}
                          className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                            activeSidebarTab === 'diff'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                          <span>Değişiklik Görünümü (Diff)</span>
                          {currentDiff && currentDiff.hasChanged && (
                            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              +{currentDiff.addedCount} / -{currentDiff.removedCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => setActiveSidebarTab('history')}
                          className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                            activeSidebarTab === 'history'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <History className="w-4 h-4" />
                          <span>Kontrol Geçmişi</span>
                          <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                            {selectedItemDetail?.history.length || 0}
                          </span>
                        </button>

                        <button
                          onClick={() => setActiveSidebarTab('preview')}
                          className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                            activeSidebarTab === 'preview'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Son Sayfa Metni</span>
                        </button>
                      </div>

                      {activeSidebarTab === 'diff' && (
                        <button
                          onClick={() => setDiffFilterOnlyChanges(!diffFilterOnlyChanges)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                            diffFilterOnlyChanges
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Filter className="w-3 h-3" />
                          <span>{diffFilterOnlyChanges ? 'Sadece Değişenler' : 'Tüm Satırlar'}</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* ====================================================== */}
              {/* SIDEBAR MAIN CONTENT                                   */}
              {/* ====================================================== */}
              <div className="flex-1 overflow-y-auto p-4">
                {isDetailLoading ? (
                  <div className="py-20 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Bilgiler hazırlanıyor...</p>
                  </div>
                ) : !isCurrentItemTracked ? (
                  /* ================================================== */
                  /* UNTRACKED URL VIEW (NO SCANNING HISTORY DISPLAYED) */
                  /* ================================================== */
                  <div className="space-y-5 max-w-2xl mx-auto py-2">
                    {/* Notice Banner */}
                    <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                        <Bookmark className="w-4 h-4 text-amber-700" />
                        <span>Takip Etme Modu Aktif (Sadece Yer İmi)</span>
                      </div>
                      <p className="text-xs text-amber-800/90 leading-relaxed">
                        Bu URL adresi yer imi ve hızlı erişim amacıyla listelenmektedir. Sayfa arka planda taranmaz, içerik diff karşılaştırması yapılmaz ve tarama geçmişi tutulmaz.
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={() => handleToggleTracking(currentItem.id)}
                          disabled={isTogglingTrack}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Bu URL İçin Takibi Başlat (Değişiklikleri İzle)</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Access Card */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                      <div className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
                        URL Detayları & Hızlı Erişim
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-[10px] text-slate-400 font-medium block">Web Adresi</span>
                            <span className="font-mono text-slate-800 text-xs truncate block">{currentItem.url}</span>
                          </div>
                          <a
                            href={currentItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-slate-300 hover:border-blue-300 rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs"
                          >
                            <span>Web Sitesine Git</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                            <span className="text-[10px] text-slate-400 font-medium block">Kategori</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {currentItem.category_name || 'Genel (Kategorisiz)'}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                            <span className="text-[10px] text-slate-400 font-medium block">Kayıt Tarihi</span>
                            <span className="font-bold text-slate-800 text-xs">{formatDate(currentItem.created_at)}</span>
                          </div>
                        </div>

                        {currentItem.notes && (
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                            <span className="text-[10px] text-slate-400 font-medium block">Kullanıcı Notları</span>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap">{currentItem.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : activeSidebarTab === 'diff' ? (
                  /* ================================================== */
                  /* TAB 1: VISUAL DIFF VIEWER                          */
                  /* ================================================== */
                  <div className="space-y-4">
                    {/* Diff Metrics Banner */}
                    <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm">
                      <div className="space-y-0.5">
                        <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                          Referans Kaydına Göre Fark
                        </div>
                        <div className="font-semibold text-slate-200">
                          {currentDiff?.summary || 'Değişiklik analiz sonucu bekleniyor'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                          +{currentDiff?.addedCount || 0} Eklendi
                        </span>
                        <span className="text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
                          -{currentDiff?.removedCount || 0} Silindi
                        </span>
                        <span className="text-blue-300 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded">
                          %{currentDiff?.changePercentage || 0} Değişim
                        </span>
                      </div>
                    </div>

                    {/* Diff Lines Table */}
                    {diffLines.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                        Karşılaştırma için henüz içerik verisi bulunmuyor. "Şimdi Tara" butonuna basarak sayfayı kontrol edebilirsiniz.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-300 overflow-hidden font-mono text-xs bg-slate-950 shadow-inner">
                        <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                          <span className="font-bold text-slate-300">
                            Satır Bazlı Karşılaştırma (Referans vs Son Snapshot)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {displayedDiffLines.length} satır görüntüleniyor
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
                          {displayedDiffLines.map((line, idx) => {
                            const isAdded = line.type === 'added';
                            const isRemoved = line.type === 'removed';

                            return (
                              <div
                                key={idx}
                                className={`flex items-start text-[11px] leading-relaxed transition-colors ${
                                  isAdded
                                    ? 'bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/40'
                                    : isRemoved
                                    ? 'bg-rose-950/50 text-rose-200 hover:bg-rose-900/40'
                                    : 'bg-transparent text-slate-400 hover:bg-slate-900/50'
                                }`}
                              >
                                {/* Line Prefix (+/-) */}
                                <div
                                  className={`w-8 shrink-0 text-center select-none font-bold py-1 border-r border-slate-800 ${
                                    isAdded
                                      ? 'text-emerald-400 bg-emerald-900/30'
                                      : isRemoved
                                      ? 'text-rose-400 bg-rose-900/30'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {isAdded ? '+' : isRemoved ? '-' : ' '}
                                </div>

                                {/* Line Text Content */}
                                <div className="flex-1 px-3 py-1 break-all whitespace-pre-wrap">
                                  {line.text || <span className="opacity-30 italic">(boş satır)</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeSidebarTab === 'history' ? (
                  /* ================================================== */
                  /* TAB 2: TIMELINE & AUDIT HISTORY                    */
                  /* ================================================== */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                      <span className="font-semibold text-slate-800">
                        Bu URL İçin Yapılan Kontrol Kayıtları ({selectedItemDetail?.history.length || 0})
                      </span>
                      <span className="text-[11px]">En yeniden eskiye sıralı</span>
                    </div>

                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {selectedItemDetail?.history.map((record) => {
                        const isChanged = record.has_changed === 1 || record.change_type === 'changed';
                        const isInitial = record.change_type === 'initial';
                        const isError = record.change_type === 'error' || record.http_status >= 400;

                        return (
                          <div key={record.id} className="relative group">
                            {/* Timeline circle icon */}
                            <div
                              className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 bg-white ${
                                isChanged
                                  ? 'border-rose-500 text-rose-600 ring-4 ring-rose-50'
                                  : isInitial
                                  ? 'border-blue-500 text-blue-600 ring-4 ring-blue-50'
                                  : isError
                                  ? 'border-amber-500 text-amber-600'
                                  : 'border-emerald-500 text-emerald-600'
                              }`}
                            >
                              {isChanged ? '!' : isInitial ? '★' : isError ? '✕' : '✓'}
                            </div>

                            <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 font-bold text-slate-900">
                                  <span>{formatDate(record.checked_at)}</span>
                                  {isInitial && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.2 rounded">
                                      Başlangıç / Referans
                                    </span>
                                  )}
                                  {isChanged && (
                                    <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.2 rounded">
                                      Değişiklik Algılandı
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                    record.http_status === 200
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  HTTP {record.http_status}
                                </span>
                              </div>

                              <p className="text-xs text-slate-700">
                                {record.diff_summary || 'Periyodik kontrol yapıldı'}
                              </p>

                              {record.notes && (
                                <div className="text-[11px] text-slate-500 italic">
                                  Not: {record.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ================================================== */
                  /* TAB 3: CURRENT RAW TEXT SNAPSHOT                   */
                  /* ================================================== */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        Sayfadan Çekilen Son Metin Snapshot
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        SHA256: {currentItem.content_hash?.substring(0, 12)}...
                      </span>
                    </div>

                    <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap select-text border border-slate-800">
                      {currentItem.last_snapshot_content || 'Metin içeriği boş veya alınamadı'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty selection state for right sidebar */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 bg-slate-50/50">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs border border-blue-100">
                <Globe className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-slate-900">Bir URL Seçin</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sol taraftaki listeden bir URL'ye tıklayarak sayfa detaylarını, takip durumunu veya canlı diff değişimlerini görüntüleyin.
                </p>
              </div>
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni URL Ekle</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT MONITORED URL                        */}
      {/* ======================================================== */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingItem?.id ? 'URL Kaydını Düzenle' : 'Yeni Web Sayfası Ekle'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    URL adresini girin, takip etmek isteyip istemediğinizi seçin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUrlItem} className="p-5 space-y-4 text-xs">
              {/* URL Input with Test Button */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Web Sayfası URL Adresi *</span>
                  <span className="text-[10px] text-slate-400 font-normal">https://...</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://www.ornek.com/sayfa-adresi"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTestUrlInModal}
                    disabled={isTestingUrl || !formUrl}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg font-semibold shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                    <span>{isTestingUrl ? 'Test Ediliyor...' : 'Sayfayı Test Et'}</span>
                  </button>
                </div>
              </div>

              {/* Test Result Feedback Box */}
              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{testResult.success ? 'Sayfa Başarıyla Çekildi!' : 'Bağlantı Hatası'}</span>
                  </div>
                  {testResult.success ? (
                    <p className="text-[10px] line-clamp-2 font-mono text-emerald-700">
                      Örnek İçerik: {testResult.text?.substring(0, 180)}...
                    </p>
                  ) : (
                    <p>{testResult.error}</p>
                  )}
                </div>
              )}

              {/* TRACKING MODE SELECTION (Takip Et / Takip Etme) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Takip Seçeneği</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormIsTracked(1)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formIsTracked === 1
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          formIsTracked === 1 ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {formIsTracked === 1 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-xs text-slate-900">Aktif Olarak Takip Et</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-6">
                      İçerik düzenli taranır, sayfa değişiklikleri tespit edilir ve diff geçmişi tutulur.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormIsTracked(0)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formIsTracked === 0
                        ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          formIsTracked === 0 ? 'border-amber-600 bg-amber-600' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {formIsTracked === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-xs text-slate-900">Takip Etme (Sadece Yer İmi)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-6">
                      Otomatik tarama yapılmaz, tarama geçmişi ve diff gösterilmez.
                    </p>
                  </button>
                </div>
              </div>

              {/* Title & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Başlık / Tanım</label>
                  <input
                    type="text"
                    placeholder="Örn: Garanti Faiz Oranları Sayfası"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Kategori</label>
                  <select
                    value={formCategoryId}
                    onChange={e => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Kategorisiz / Genel</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Check Interval (Only if tracked) */}
              {formIsTracked === 1 && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Otomatik Kontrol Sıklığı</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { hours: 6, label: '6 Saat' },
                      { hours: 12, label: '12 Saat' },
                      { hours: 24, label: '24 Saat (Günlük)' },
                      { hours: 48, label: '48 Saat' }
                    ].map(opt => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setFormInterval(opt.hours)}
                        className={`py-2 px-2 rounded-lg border text-center font-semibold text-[11px] transition-colors cursor-pointer ${
                          formInterval === opt.hours
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Notlar & Açıklama (İsteğe Bağlı)</label>
                <textarea
                  rows={2}
                  placeholder="Bu URL hakkında notlar..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {editingItem?.id ? 'Değişiklikleri Kaydet' : formIsTracked === 1 ? 'URL Takibini Başlat' : 'Yer İmi Olarak Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CATEGORY MANAGEMENT MODAL (EDIT / DELETE)       */}
      {/* ======================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">URL Kategorilerini Yönet</h3>
                  <p className="text-[11px] text-slate-500">
                    Kategori adlarını ve renklerini düzenleyin veya silin
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Add Category Form */}
              <form
                onSubmit={handleCreateCategory}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
              >
                <span className="font-bold text-slate-800 text-xs block">Yeni Kategori Ekle</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Örn: Finans, E-Devlet, İlanlar, Raporlar"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1 bg-white px-2 rounded-lg border border-slate-300">
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={e => setNewCatColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      title="Kategori Rengi Seç"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Ekle
                  </button>
                </div>

                {/* Color Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Hızlı Renk:</span>
                  {categoryColorPresets.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        newCatColor === color ? 'scale-125 ring-2 ring-slate-800' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </form>

              {/* Category List with Edit & Delete */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-xs block">
                  Mevcut Kategoriler ({categories.length})
                </span>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      Henüz oluşturulmuş kategori bulunmuyor.
                    </div>
                  ) : (
                    categories.map(cat => (
                      <div
                        key={cat.id}
                        className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                      >
                        {editingCatId === cat.id ? (
                          /* INLINE EDIT CATEGORY FORM */
                          <div className="flex items-center gap-2 flex-1 animate-in fade-in duration-100">
                            <input
                              type="text"
                              required
                              value={editCatName}
                              onChange={e => setEditCatName(e.target.value)}
                              className="flex-1 px-2.5 py-1 bg-white border border-blue-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Kategori adı"
                            />
                            <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-slate-300 shrink-0">
                              <input
                                type="color"
                                value={editCatColor}
                                onChange={e => setEditCatColor(e.target.value)}
                                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(cat.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCatId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium shrink-0 cursor-pointer"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          /* DISPLAY CATEGORY ROW */
                          <>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                                style={{ backgroundColor: cat.color || '#2563eb' }}
                              />
                              <span className="font-bold text-slate-800 text-xs truncate">{cat.name}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-full shrink-0 font-semibold">
                                {cat.item_count || 0} URL
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatId(cat.id);
                                  setEditCatName(cat.name);
                                  setEditCatColor(cat.color || '#2563eb');
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Kategoriyi Düzenle (İsim & Renk)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmCategory(cat)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Kategoriyi Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCatId(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE URL CONFIRMATION MODAL                   */}
      {/* ======================================================== */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">URL Kaydını Sil</h3>
                  <p className="text-[11px] text-slate-500">Listeden Kaldırma Onayı</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{deleteConfirmItem.title}</div>
                <div className="font-mono text-[11px] text-slate-500 truncate">{deleteConfirmItem.url}</div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Bu URL ve kaydedilen tüm geçmiş kayıtları kalıcı olarak silinecektir. Devam etmek istiyor musunuz?
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmItem(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleDeleteItem}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Evet, Sil</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DELETE CATEGORY CONFIRMATION MODAL              */}
      {/* ======================================================== */}
      {deleteConfirmCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Kategoriyi Sil</h3>
                  <p className="text-[11px] text-slate-500">Kategori Silme Onayı</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirmCategory(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: deleteConfirmCategory.color || '#2563eb' }}
                />
                <span className="font-bold text-slate-900 text-sm">{deleteConfirmCategory.name}</span>
                <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-semibold ml-auto">
                  {deleteConfirmCategory.item_count || 0} URL Bağlı
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed">
                <strong>"{deleteConfirmCategory.name}"</strong> kategorisini silmek üzeresiniz. Bu kategoriye ait olan tüm URL'ler silinmeyecek, sadece <em>"Genel (Kategorisiz)"</em> durumuna aktarılacaktır.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCategory(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kategoriyi Sil</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOAST FEEDBACK NOTIFICATION                              */}
      {/* ======================================================== */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
