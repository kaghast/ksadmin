import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard as CardIcon,
  Tags,
  Plus,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PieChart,
  TrendingUp,
  Layers,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tag,
  ShoppingBag,
  ListPlus,
  Receipt,
  Sparkles,
  ArrowUpDown,
  X
} from 'lucide-react';
import { CreditCard, CardExpense, ExpenseSubItem, ExpenseAnalytics } from '../../types';
import { api } from '../../services/api';

const DEFAULT_CATEGORIES = [
  { name: 'Market & Gıda', color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { name: 'Akaryakıt & Ulaşım', color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-700 border-blue-200' },
  { name: 'Restoran & Yemek', color: 'bg-orange-500', bgLight: 'bg-orange-50 text-orange-700 border-orange-200' },
  { name: 'Giyim & Moda', color: 'bg-purple-500', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
  { name: 'Elektronik & Teknoloji', color: 'bg-indigo-500', bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { name: 'Sağlık & Eczane', color: 'bg-rose-500', bgLight: 'bg-rose-50 text-rose-700 border-rose-200' },
  { name: 'Ev & Yaşam', color: 'bg-teal-500', bgLight: 'bg-teal-50 text-teal-700 border-teal-200' },
  { name: 'Fatura & Abonelik', color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-700 border-amber-200' },
  { name: 'Eğlence & Tatil', color: 'bg-pink-500', bgLight: 'bg-pink-50 text-pink-700 border-pink-200' },
  { name: 'Eğitim & Kitap', color: 'bg-cyan-500', bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { name: 'Diğer', color: 'bg-slate-500', bgLight: 'bg-slate-50 text-slate-700 border-slate-200' }
];

const POPULAR_TAGS = [
  'online', 'migros', 'a101', 'bim', 'trendyol', 'amazon', 'yemeksepeti',
  'getir', 'akaryakit', 'restoran', 'teknoloji', 'haftasonu', 'zorunlu', 'keyfi'
];

interface ExpensesViewProps {
  creditCards: CreditCard[];
  onRefreshCards?: () => Promise<void>;
  showToast: (message: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  creditCards,
  onRefreshCards,
  showToast
}) => {
  // Current month state format: 'YYYY-MM'
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [expenses, setExpenses] = useState<CardExpense[]>([]);
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expanded accordion states for sub-items
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<number[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CardExpense | null>(null);

  // Load data
  const loadExpensesData = async () => {
    setIsLoading(true);
    try {
      const [expRes, anaRes] = await Promise.all([
        api.getExpenses({
          month: selectedMonth,
          card_id: selectedCardId !== 'all' ? Number(selectedCardId) : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          tag: selectedTag || undefined,
          search: searchQuery || undefined
        }),
        api.getExpenseAnalytics(selectedMonth)
      ]);

      setExpenses(expRes.expenses || []);
      setAnalytics(anaRes.analytics || null);
    } catch (err: any) {
      console.error('Harcamalar yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpensesData();
  }, [selectedMonth, selectedCardId, selectedCategory, selectedTag, searchQuery]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const formatMonthTitle = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  };

  // Toggle sub-items view
  const toggleExpand = (id: number) => {
    setExpandedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Delete expense
  const handleDelete = async (id: number) => {
    if (!confirm('Bu harcama kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteExpense(id);
      showToast('Harcama kaydı silindi.');
      loadExpensesData();
      if (onRefreshCards) onRefreshCards();
    } catch (err: any) {
      alert(err.message || 'Harcama silinemedi.');
    }
  };

  const handleEdit = (expense: CardExpense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const getCategoryColor = (categoryName: string) => {
    const found = DEFAULT_CATEGORIES.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    return found ? found.color : 'bg-slate-500';
  };

  const getCategoryBadgeClass = (categoryName: string) => {
    const found = DEFAULT_CATEGORIES.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    return found ? found.bgLight : 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Tags className="w-6 h-6 text-blue-600" />
            <span>Kredi Kartı Harcama & Kategori Takibi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kredi kartı harcamalarınızı kategorilere, etiketlere ve alt kırılımlara ayırarak aylık bazda analiz edin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white text-slate-700 rounded-md transition-colors cursor-pointer"
              title="Önceki Ay"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs sm:text-sm font-semibold text-slate-800 capitalize min-w-[120px] text-center">
              {formatMonthTitle(selectedMonth)}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white text-slate-700 rounded-md transition-colors cursor-pointer"
              title="Sonraki Ay"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Harcama Ekle</span>
          </button>
        </div>
      </div>

      {/* Month Summary Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly Expenses */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {formatMonthTitle(selectedMonth)} Toplamı
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
            ₺{(analytics?.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Toplam <span className="font-semibold text-slate-700">{analytics?.expenseCount || 0}</span> harcama işlemi
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              En Yüksek Kategori
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-slate-900 truncate">
            {analytics?.categoryBreakdown?.[0]?.category || 'Henüz Kayıt Yok'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {analytics?.categoryBreakdown?.[0] ? (
              <>
                <span className="font-semibold text-emerald-600">
                  ₺{analytics.categoryBreakdown[0].amount.toLocaleString('tr-TR')}
                </span>{' '}
                ({analytics.categoryBreakdown[0].percentage}%)
              </>
            ) : (
              'Bu ay için harcama bulunamadı'
            )}
          </div>
        </div>

        {/* Top Tag */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              En Çok Kullanılan Etiket
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-slate-900 truncate">
            {analytics?.tagBreakdown?.[0] ? `#${analytics.tagBreakdown[0].tag}` : 'Etiket Yok'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {analytics?.tagBreakdown?.[0] ? (
              <>
                <span className="font-semibold text-purple-600">
                  ₺{analytics.tagBreakdown[0].amount.toLocaleString('tr-TR')}
                </span>{' '}
                ({analytics.tagBreakdown[0].count} işlem)
              </>
            ) : (
              'Etiketli harcama bulunamadı'
            )}
          </div>
        </div>

        {/* Sub-breakdown Stats */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Alt Kırılımlı Harcamalar
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
            {expenses.filter((e) => e.sub_items && e.sub_items.length > 0).length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Detaylandırılmış alt kırılım kalemi
          </div>
        </div>
      </div>

      {/* Distribution Breakdowns Section: Categories & Tags (Aylık Dağılım Paneli) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown (Kategori Dağılımı) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Aylık Kategori Dağılımı
              </h2>
            </div>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Filtreyi Temizle
              </button>
            )}
          </div>

          {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
            <div className="space-y-3.5">
              {analytics.categoryBreakdown.map((cat) => {
                const isSelected = selectedCategory === cat.category;
                return (
                  <div
                    key={cat.category}
                    onClick={() => setSelectedCategory(isSelected ? 'all' : cat.category)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getCategoryColor(cat.category)}`} />
                        <span className="font-semibold text-slate-800 truncate">{cat.category}</span>
                        <span className="text-slate-400 text-[11px]">({cat.count} işlem)</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900">
                          ₺{cat.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-slate-500 font-medium ml-1.5 text-[11px]">
                          %{cat.percentage}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getCategoryColor(cat.category)}`}
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Bu ay için kayıtlı kategori harcaması bulunamadı.
            </div>
          )}
        </div>

        {/* Tag Breakdown & Card Breakdown (Etiket ve Kart Dağılımı) */}
        <div className="space-y-6">
          {/* Tag Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-purple-600" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Aylık Etiket (Tag) Dağılımı
                </h2>
              </div>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag('')}
                  className="text-xs text-purple-600 hover:text-purple-800 font-semibold cursor-pointer"
                >
                  Filtreyi Temizle
                </button>
              )}
            </div>

            {analytics?.tagBreakdown && analytics.tagBreakdown.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analytics.tagBreakdown.map((t) => {
                  const isSelected = selectedTag.toLowerCase() === t.tag.toLowerCase();
                  return (
                    <button
                      key={t.tag}
                      onClick={() => setSelectedTag(isSelected ? '' : t.tag)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-purple-50/70 hover:bg-purple-100 text-purple-800 border-purple-200'
                      }`}
                    >
                      <span>#{t.tag}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-purple-700 text-white' : 'bg-purple-200 text-purple-900'}`}>
                        ₺{t.amount.toLocaleString('tr-TR')}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Bu ay için etiketli harcama bulunmuyor. Harcama eklerken #etiket belirtebilirsiniz.
              </div>
            )}
          </div>

          {/* Card Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
              <CardIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Kart Bazlı Harcama Dağılımı
              </h3>
            </div>

            {analytics?.cardBreakdown && analytics.cardBreakdown.length > 0 ? (
              <div className="space-y-2">
                {analytics.cardBreakdown.map((c) => (
                  <div key={c.card_name} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{c.card_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">₺{c.amount.toLocaleString('tr-TR')}</span>
                      <span className="text-[11px] text-slate-500 font-mono">%{c.percentage}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 text-xs py-4">Kart harcaması bulunamadı.</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Expense Table & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Açıklama, alt kırılım veya kart ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Card Filter */}
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Tüm Kartlar</option>
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bank_name} - {c.card_name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Tüm Kategoriler</option>
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Active Tag Filter Indicator */}
            {selectedTag && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold border border-purple-200">
                <span>Etiket: #{selectedTag}</span>
                <button onClick={() => setSelectedTag('')} className="hover:text-purple-950">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Toplam <span className="font-bold text-slate-800">{expenses.length}</span> kayıt gösteriliyor
          </div>
        </div>

        {/* Expenses List */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Harcamalar yükleniyor...</div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700">Bu ay veya filtreye uygun harcama kaydı bulunamadı.</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Yeni bir harcama ekleyebilir, market veya alışverişlerinizi alt kırılımlarıyla kaydedebilirsiniz.
            </p>
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Harcamayı Ekle</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {expenses.map((expense) => {
              const hasSubItems = expense.sub_items && expense.sub_items.length > 0;
              const isExpanded = expandedExpenseIds.includes(expense.id);
              const subItemsTotal = hasSubItems
                ? expense.sub_items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
                : 0;

              return (
                <div key={expense.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Info & Breakdown toggle */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getCategoryBadgeClass(expense.category)}`}>
                          {expense.category}
                        </span>

                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {expense.description || expense.category}
                        </span>

                        {expense.installment_count && expense.installment_count > 1 && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                            {expense.installment_count} Taksit
                          </span>
                        )}

                        {hasSubItems && (
                          <button
                            onClick={() => toggleExpand(expense.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] font-semibold border border-amber-200 cursor-pointer transition-colors"
                          >
                            <Layers className="w-3 h-3 text-amber-600" />
                            <span>{expense.sub_items.length} Alt Kırılım</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <CardIcon className="w-3.5 h-3.5 text-slate-400" />
                          {expense.card_name}
                        </span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(expense.expense_date).toLocaleDateString('tr-TR')}
                        </span>

                        {expense.notes && (
                          <span className="text-slate-500 italic truncate max-w-xs">
                            Not: {expense.notes}
                          </span>
                        )}
                      </div>

                      {/* Tags list */}
                      {expense.tags && expense.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {expense.tags.map((tag) => (
                            <span
                              key={tag}
                              onClick={() => setSelectedTag(tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-800 rounded text-[10px] font-medium cursor-pointer transition-colors border border-slate-200"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Amount and Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-extrabold text-slate-900">
                          ₺{expense.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </div>
                        {expense.installment_count && expense.installment_count > 1 && (
                          <div className="text-[10px] text-slate-400">
                            Aylık ₺{(expense.amount / expense.installment_count).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Harcamayı Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Harcamayı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-breakdown Expandable Section (Alt Kırılımlar Tablosu) */}
                  {hasSubItems && isExpanded && (
                    <div className="mt-4 pt-3 border-t border-dashed border-slate-200 bg-slate-50/80 rounded-lg p-3.5 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>Harcama Alt Kırılım Detayları</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Kırılımlar Toplamı: <strong className="text-slate-800">₺{subItemsTotal.toLocaleString('tr-TR')}</strong>
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {expense.sub_items.map((sub, idx) => {
                          const pct = expense.amount > 0 ? ((sub.amount / expense.amount) * 100).toFixed(1) : '0';
                          return (
                            <div
                              key={sub.id || idx}
                              className="flex items-center justify-between bg-white px-3 py-2 rounded-md border border-slate-200 shadow-2xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-400 text-[11px]">{idx + 1}.</span>
                                <span className="font-semibold text-slate-900">{sub.name}</span>
                                {sub.category && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    {sub.category}
                                  </span>
                                )}
                                {sub.notes && (
                                  <span className="text-[11px] text-slate-500 italic">({sub.notes})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400 font-mono">%{pct}</span>
                                <span className="font-bold text-slate-900">
                                  ₺{Number(sub.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expense Add / Edit Modal */}
      {isModalOpen && (
        <ExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          expense={editingExpense}
          creditCards={creditCards}
          onSaved={() => {
            setIsModalOpen(false);
            showToast(editingExpense ? 'Harcama güncellendi.' : 'Yeni harcama başarıyla eklendi.');
            loadExpensesData();
            if (onRefreshCards) onRefreshCards();
          }}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------
// EXPENSE ADD / EDIT MODAL WITH SUB-BREAKDOWN CRUD
// ----------------------------------------------------

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: CardExpense | null;
  creditCards: CreditCard[];
  onSaved: () => void;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  creditCards,
  onSaved
}) => {
  const isEdit = !!expense;

  const [cardId, setCardId] = useState<string>(
    expense?.card_id ? String(expense.card_id) : (creditCards[0]?.id ? String(creditCards[0].id) : '')
  );
  const [cardName, setCardName] = useState<string>(
    expense?.card_name || (creditCards[0] ? `${creditCards[0].bank_name} - ${creditCards[0].card_name}` : '')
  );
  const [amount, setAmount] = useState<string>(expense?.amount ? String(expense.amount) : '');
  const [category, setCategory] = useState<string>(expense?.category || 'Market & Gıda');
  const [expenseDate, setExpenseDate] = useState<string>(
    expense?.expense_date || new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState<string>(expense?.description || '');
  const [installmentCount, setInstallmentCount] = useState<number>(expense?.installment_count || 1);
  const [notes, setNotes] = useState<string>(expense?.notes || '');
  const [updateCardDebt, setUpdateCardDebt] = useState<boolean>(!isEdit);

  // Tags state
  const [tags, setTags] = useState<string[]>(expense?.tags || []);
  const [tagInput, setTagInput] = useState<string>('');

  // Sub-items (Alt Kırılımlar) state
  const [subItems, setSubItems] = useState<ExpenseSubItem[]>(
    expense?.sub_items && expense.sub_items.length > 0 ? expense.sub_items : []
  );

  const [subName, setSubName] = useState<string>('');
  const [subAmount, setSubAmount] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update cardName when cardId changes
  const handleCardChange = (cId: string) => {
    setCardId(cId);
    const found = creditCards.find((c) => String(c.id) === cId);
    if (found) {
      setCardName(`${found.bank_name} - ${found.card_name}`);
    }
  };

  // Add tag
  const handleAddTag = (t: string) => {
    const clean = t.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Sub-items management
  const handleAddSubItem = () => {
    if (!subName.trim() || !subAmount) return;
    const num = Number(subAmount);
    if (isNaN(num) || num <= 0) return;

    const newItem: ExpenseSubItem = {
      id: String(Date.now()),
      name: subName.trim(),
      amount: num,
      category: subCategory.trim() || undefined
    };

    setSubItems([...subItems, newItem]);
    setSubName('');
    setSubAmount('');
    setSubCategory('');
  };

  const handleRemoveSubItem = (id: string) => {
    setSubItems(subItems.filter((i) => i.id !== id));
  };

  // Calculate sum of sub-items
  const subItemsTotal = useMemo(() => {
    return subItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [subItems]);

  const syncAmountWithSubItems = () => {
    if (subItemsTotal > 0) {
      setAmount(String(subItemsTotal));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Lütfen geçerli bir harcama tutarı giriniz.');
      return;
    }

    if (!cardName.trim()) {
      setErrorMsg('Lütfen bir kredi kartı seçiniz.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        card_id: cardId ? Number(cardId) : null,
        card_name: cardName,
        amount: numAmount,
        category,
        tags,
        expense_date: expenseDate,
        description: description.trim() || category,
        installment_count: Number(installmentCount) || 1,
        sub_items: subItems,
        notes: notes.trim(),
        update_card_debt: updateCardDebt
      };

      if (isEdit && expense) {
        await api.updateExpense(expense.id, payload);
      } else {
        await api.createExpense(payload);
      }

      onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Harcama kaydedilirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEdit ? 'Harcamayı Düzenle' : 'Yeni Kredi Kartı Harcaması Ekle'}
              </h3>
              <p className="text-xs text-slate-500">
                Kategori, etiket ve alt kırılımlarla harcama kaydı oluşturun.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Card Selection & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Kredi Kartı *
              </label>
              <select
                required
                value={cardId}
                onChange={(e) => handleCardChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {creditCards.length > 0 ? (
                  creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.bank_name} - {c.card_name} {c.card_last4 ? `(•• ${c.card_last4})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="">Kart bulunamadı</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Ana Kategori *
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Description & Total Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Harcama Başlığı / Açıklama *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: Haftalık Market Alışverişi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Toplam Tutar (₺) *
                </label>
                {subItemsTotal > 0 && Number(amount) !== subItemsTotal && (
                  <button
                    type="button"
                    onClick={syncAmountWithSubItems}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Alt Kalemlerden Al (₺{subItemsTotal.toLocaleString('tr-TR')})
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Date & Installments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Harcama Tarihi *
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Taksit Sayısı
              </label>
              <select
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Tek Çekim (Peşin)</option>
                <option value={2}>2 Taksit</option>
                <option value={3}>3 Taksit</option>
                <option value={4}>4 Taksit</option>
                <option value={5}>5 Taksit</option>
                <option value={6}>6 Taksit</option>
                <option value={9}>9 Taksit</option>
                <option value={12}>12 Taksit</option>
              </select>
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Etiketler (Tags)
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-semibold border border-purple-200"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-purple-950 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Etiket yaz ve Enter'a bas..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-semibold text-xs cursor-pointer"
                >
                  Ekle
                </button>
              </div>
            </div>

            {/* Popular tags suggestions */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 pt-1">
              <span className="text-slate-400">Öneriler:</span>
              {POPULAR_TAGS.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => handleAddTag(pt)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 rounded transition-colors cursor-pointer"
                >
                  +{pt}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-breakdown CRUD Section (Alt Kırılımlar) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Alt Kırılımlar (Sub-items)
                </span>
              </div>
              <span className="text-slate-500 text-[11px]">
                Örnek: 30.000 TL Market için (Migros 12.000 TL, Kasap 10.000 TL, A101 8.000 TL)
              </span>
            </div>

            {/* List existing sub-items */}
            {subItems.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {subItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      {item.category && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">
                        ₺{Number(item.amount).toLocaleString('tr-TR')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between px-2 pt-1 font-semibold text-slate-700 text-xs">
                  <span>Alt Kalemler Toplamı:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₺{subItemsTotal.toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>
            )}

            {/* Sub-item inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <input
                type="text"
                placeholder="Kalem Adı (örn: Migros, Kasap)"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                className="sm:col-span-6 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Tutar (₺)"
                value={subAmount}
                onChange={(e) => setSubAmount(e.target.value)}
                className="sm:col-span-4 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubItem}
                className="sm:col-span-2 flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg py-1.5 px-3 cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ekle</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
              Ek Açıklama & Notlar
            </label>
            <input
              type="text"
              placeholder="Harcamaya dair özel notlar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Option: Add to current card debt */}
          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={updateCardDebt}
                onChange={(e) => setUpdateCardDebt(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Bu harcama tutarını seçilen kredi kartının güncel borcuna da ekle</span>
            </label>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Kaydediliyor...' : isEdit ? 'Değişiklikleri Kaydet' : 'Harcamayı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
