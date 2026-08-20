import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Network,
  Calendar,
  Clock,
  Plus,
  Save,
  Copy,
  Trash2,
  Edit3,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Tag,
  Hash,
  List,
  CheckSquare,
  DollarSign,
  Undo,
  History,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { MindmapVersion } from '../../types';
import { api } from '../../services/api';
import { MindmapCanvas } from './MindmapCanvas';
import { MINDMAP_TEMPLATES } from './mindmapUtils';

interface MindmapViewProps {
  showToast: (message: string) => void;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const MindmapView: React.FC<MindmapViewProps> = ({ showToast }) => {
  // All loaded versions from database
  const [versions, setVersions] = useState<MindmapVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active version editing state
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [versionTitle, setVersionTitle] = useState<string>('');
  const [versionNotes, setVersionNotes] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Template dropdown state
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  // New Version Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState<number>(new Date().getMonth() + 1);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newTemplateId, setNewTemplateId] = useState<string>('finance-plan');
  const [cloneFromCurrent, setCloneFromCurrent] = useState(false);

  // Edit version metadata modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Mobile / tablet sub-tab switcher for responsive view
  const [mobileTab, setMobileTab] = useState<'editor' | 'mindmap' | 'versions'>('mindmap');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<any>(null);

  // Active version object
  const activeVersion = useMemo(() => {
    return versions.find((v) => v.id === activeVersionId) || versions[0] || null;
  }, [versions, activeVersionId]);

  // Load all mindmap versions from database
  const loadVersions = async (selectLatest = false, specificId?: number) => {
    setIsLoading(true);
    try {
      const res = await api.getMindmaps();
      const loaded = res.mindmaps || [];
      setVersions(loaded);

      if (loaded.length > 0) {
        if (specificId) {
          const target = loaded.find((v) => v.id === specificId) || loaded[0];
          setActiveVersionId(target.id);
          setMarkdownContent(target.content);
          setVersionTitle(target.title);
          setVersionNotes(target.notes || '');
        } else if (selectLatest || !activeVersionId) {
          setActiveVersionId(loaded[0].id);
          setMarkdownContent(loaded[0].content);
          setVersionTitle(loaded[0].title);
          setVersionNotes(loaded[0].notes || '');
        } else {
          // If activeVersionId still exists in list, refresh content
          const current = loaded.find((v) => v.id === activeVersionId);
          if (current) {
            setMarkdownContent(current.content);
            setVersionTitle(current.title);
            setVersionNotes(current.notes || '');
          }
        }
      }
    } catch (err: any) {
      console.error('Mindmap versiyonları yüklenemedi:', err);
      showToast('Zihin haritaları yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  useEffect(() => {
    loadVersions(true);
  }, []);

  // Handle switching active version (past month version)
  const handleSelectVersion = (version: MindmapVersion) => {
    if (hasUnsavedChanges) {
      if (!confirm('Kaydedilmemiş değişiklikleriniz var. Başka bir aya geçmek istediğinize emin misiniz?')) {
        return;
      }
    }
    setActiveVersionId(version.id);
    setMarkdownContent(version.content);
    setVersionTitle(version.title);
    setVersionNotes(version.notes || '');
    setHasUnsavedChanges(false);
    showToast(`${version.month_str} (${version.title}) yüklendi.`);
  };

  // Handle content change in Markdown editor
  const handleMarkdownChange = (newContent: string) => {
    setMarkdownContent(newContent);
    setHasUnsavedChanges(true);

    // Auto-save debounce (after 2.5 seconds of inactivity)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (activeVersion) {
        saveCurrentVersion(newContent, versionTitle, versionNotes, false);
      }
    }, 2500);
  };

  // Save current version to backend
  const saveCurrentVersion = async (
    contentToSave = markdownContent,
    titleToSave = versionTitle,
    notesToSave = versionNotes,
    notify = true
  ) => {
    if (!activeVersion) return;
    setIsSaving(true);
    try {
      const res = await api.updateMindmap(activeVersion.id, {
        content: contentToSave,
        title: titleToSave,
        notes: notesToSave,
        year: activeVersion.year,
        month: activeVersion.month,
        month_str: activeVersion.month_str
      });

      setVersions((prev) =>
        prev.map((v) => (v.id === activeVersion.id ? res.mindmap : v))
      );
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (notify) {
        showToast('Zihin haritası başarıyla kaydedildi.');
      }
    } catch (err: any) {
      console.error('Kaydetme hatası:', err);
      if (notify) {
        alert(err.message || 'Kaydedilirken hata oluştu.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Group versions by Year -> List of Month versions
  const versionsByYear = useMemo(() => {
    const map = new Map<number, MindmapVersion[]>();
    for (const v of versions) {
      const y = v.year;
      if (!map.has(y)) {
        map.set(y, []);
      }
      map.get(y)!.push(v);
    }

    // Sort years descending
    const sortedYears = Array.from(map.keys()).sort((a, b) => b - a);
    return sortedYears.map((year) => ({
      year,
      items: map.get(year)!.sort((a, b) => b.month - a.month || (b.id - a.id))
    }));
  }, [versions]);

  // Insert markdown helpers into textarea at cursor position
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end);

    const replacement = `${prefix}${selectedText || 'Yeni Madde'}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);

    handleMarkdownChange(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 10);
  };

  // Load a template into the editor
  const applyTemplate = (templateMarkdown: string, templateTitle: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('Mevcut içeriğiniz şablon ile değiştirilecek. Onaylıyor musunuz?')) return;
    }
    handleMarkdownChange(templateMarkdown);
    setIsTemplateMenuOpen(false);
    showToast(`"${templateTitle}" şablonu uygulandı.`);
  };

  // Create a new version for a chosen Year / Month
  const handleCreateNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    const monthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    const monthName = MONTH_NAMES[newMonth - 1];
    const computedTitle = newTitle.trim() || `${monthName} ${newYear} Finans & Strateji`;

    let initialContent = '';
    if (cloneFromCurrent && activeVersion) {
      initialContent = markdownContent;
    } else {
      const selectedTemplate = MINDMAP_TEMPLATES.find((t) => t.id === newTemplateId);
      initialContent = selectedTemplate ? selectedTemplate.markdown : MINDMAP_TEMPLATES[0].markdown;
      // Replace title in markdown with current month name
      initialContent = initialContent.replace(/# 🎯 .*/, `# 🎯 ${monthName} ${newYear} Finans & Strateji Haritası`);
    }

    try {
      const res = await api.createMindmap({
        year: Number(newYear),
        month: Number(newMonth),
        month_str: monthStr,
        title: computedTitle,
        content: initialContent,
        notes: newNotes.trim(),
        theme: 'modern'
      });

      setIsNewModalOpen(false);
      showToast(`${monthStr} versiyonu başarıyla oluşturuldu.`);
      await loadVersions(false, res.mindmap.id);
    } catch (err: any) {
      alert(err.message || 'Yeni versiyon oluşturulamadı.');
    }
  };

  // Delete current version
  const handleDeleteVersion = async (id: number, monthStr: string) => {
    if (versions.length <= 1) {
      alert('Sistemdeki tek zihin haritası versiyonunu silemezsiniz.');
      return;
    }
    if (!confirm(`${monthStr} tarihli bu zihin haritası versiyonunu silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await api.deleteMindmap(id);
      showToast('Versiyon silindi.');
      await loadVersions(true);
    } catch (err: any) {
      alert(err.message || 'Versiyon silinemedi.');
    }
  };

  // Quick duplicate / clone active version to next month
  const handleQuickCloneToNextMonth = () => {
    if (!activeVersion) return;
    let nextM = activeVersion.month + 1;
    let nextY = activeVersion.year;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setNewYear(nextY);
    setNewMonth(nextM);
    setNewTitle(`${MONTH_NAMES[nextM - 1]} ${nextY} Finans & Strateji`);
    setNewNotes(`${activeVersion.month_str} versiyonundan uyarlandı`);
    setCloneFromCurrent(true);
    setIsNewModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[640px] space-y-3 pb-4">
      {/* Top Header / Meta Bar */}
      <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {activeVersion ? activeVersion.title : 'Finansal Zihin Haritası'}
              </h1>
              {activeVersion && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {MONTH_NAMES[activeVersion.month - 1]} {activeVersion.year}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Başlık hiyerarşisine göre ortadan dağılımlı interaktif zihin haritası ve aylık versiyon geçmişi.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Auto-save & Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 mr-2 font-medium">
            {isSaving ? (
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                Kaydediliyor...
              </span>
            ) : hasUnsavedChanges ? (
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Kaydedilmemiş değişiklikler var
              </span>
            ) : lastSavedTime ? (
              <span className="flex items-center gap-1 text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Son kayıt: {lastSavedTime}
              </span>
            ) : null}
          </div>

          <button
            onClick={() => saveCurrentVersion()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>

          <button
            onClick={() => {
              setNewYear(new Date().getFullYear());
              setNewMonth(new Date().getMonth() + 1);
              setNewTitle('');
              setNewNotes('');
              setCloneFromCurrent(false);
              setIsNewModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Versiyon / Ay</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation (Visible on Mobile/Tablet only) */}
      <div className="lg:hidden flex rounded-lg bg-slate-200/80 p-1 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            mobileTab === 'editor' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          1. Markdown Editör
        </button>
        <button
          onClick={() => setMobileTab('mindmap')}
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            mobileTab === 'mindmap' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          2. Zihin Haritası
        </button>
        <button
          onClick={() => setMobileTab('versions')}
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            mobileTab === 'versions' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          3. Aylık Versiyonlar ({versions.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3-SECTION MAIN CONTAINER                                 */}
      {/* SECTION 1: Markdown Editor (Equal Width 1)               */}
      {/* SECTION 2: Mindmap Canvas (Equal Width 2)                */}
      {/* SECTION 3: Right Sidebar (Year/Month Versions)           */}
      {/* ======================================================== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr_300px] gap-3 min-h-0">
        
        {/* ====================================================== */}
        {/* SECTION 1: MARKDOWN EDITOR                             */}
        {/* ====================================================== */}
        <div
          className={`bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col min-h-0 overflow-hidden ${
            mobileTab !== 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Editor Header & Formatting Toolbar */}
          <div className="p-2.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">1. Markdown Editörü</span>
            </div>

            {/* Quick Template Selector */}
            <div className="relative">
              <button
                onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Hazır Şablonlar</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isTemplateMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Şablon Seçiniz
                  </div>
                  {MINDMAP_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => applyTemplate(tmpl.markdown, tmpl.title)}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex flex-col cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800">{tmpl.title}</span>
                      <span className="text-[10px] text-slate-500 truncate">{tmpl.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Syntax Insert Buttons */}
          <div className="px-2.5 py-1.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-1 shrink-0 text-xs">
            <button
              onClick={() => insertFormatting('# ')}
              className="px-2 py-0.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[11px] font-bold cursor-pointer"
              title="H1 - Merkez Kök Başlık"
            >
              H1 (Kök)
            </button>
            <button
              onClick={() => insertFormatting('## ')}
              className="px-2 py-0.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[11px] font-bold cursor-pointer"
              title="H2 - Ana Dal (Ortadan Dağılır)"
            >
              H2 (Ana Dal)
            </button>
            <button
              onClick={() => insertFormatting('### ')}
              className="px-2 py-0.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[11px] font-bold cursor-pointer"
              title="H3 - Alt Dal"
            >
              H3 (Alt Dal)
            </button>
            <button
              onClick={() => insertFormatting('- ')}
              className="px-2 py-0.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[11px] font-bold cursor-pointer"
              title="Madde İşareti"
            >
              - Liste
            </button>
            <button
              onClick={() => insertFormatting('₺')}
              className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold cursor-pointer"
              title="Para Tutarı"
            >
              ₺ Tutar
            </button>
            <button
              onClick={() => insertFormatting('#')}
              className="px-2 py-0.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded text-[11px] font-bold cursor-pointer"
              title="Etiket"
            >
              # Etiket
            </button>
          </div>

          {/* Textarea Input */}
          <div className="flex-1 p-3 min-h-0 flex flex-col">
            <textarea
              ref={textareaRef}
              value={markdownContent}
              onChange={(e) => handleMarkdownChange(e.target.value)}
              placeholder="# 🎯 Merkez Başlık&#10;&#10;## 💰 Ana Kategori 1&#10;### Alt Konu&#10;- Liste maddesi 1&#10;- Liste maddesi 2&#10;&#10;## 💳 Ana Kategori 2&#10;### Alt Konu&#10;- Liste maddesi 3"
              className="w-full flex-1 p-3 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 leading-relaxed resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              spellCheck={false}
            />
          </div>

          {/* Editor Footer Info */}
          <div className="p-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
            <span>
              Satır: {markdownContent.split('\n').length} | Karakter: {markdownContent.length}
            </span>
            <span className="text-slate-500">
              💡 Değişiklikler anında 2. bölümde zihin haritasına yansır
            </span>
          </div>
        </div>

        {/* ====================================================== */}
        {/* SECTION 2: MINDMAP CANVAS (Ortadan Dağılım)           */}
        {/* ====================================================== */}
        <div
          className={`bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col min-h-0 overflow-hidden ${
            mobileTab !== 'mindmap' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">2. İnteraktif Zihin Haritası</span>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Ortadan Dağılım (Radial)
            </span>
          </div>

          <div className="flex-1 min-h-0 p-2 relative">
            <MindmapCanvas markdown={markdownContent} />
          </div>
        </div>

        {/* ====================================================== */}
        {/* SECTION 3: RIGHT SIDEBAR (Ay & Yıl Versiyonlama)       */}
        {/* ====================================================== */}
        <div
          className={`bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col min-h-0 overflow-hidden ${
            mobileTab !== 'versions' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800">3. Aylık Versiyonlar</span>
            </div>
            <button
              onClick={() => {
                setNewYear(new Date().getFullYear());
                setNewMonth(new Date().getMonth() + 1);
                setNewTitle('');
                setNewNotes('');
                setCloneFromCurrent(false);
                setIsNewModalOpen(true);
              }}
              className="p-1 text-purple-700 hover:bg-purple-100 rounded transition-colors cursor-pointer"
              title="Yeni Ay Versiyonu Ekle"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions in Sidebar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/40 flex flex-col gap-1.5 shrink-0 text-xs">
            <button
              onClick={handleQuickCloneToNextMonth}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Gelecek Aya Kopyala</span>
            </button>
          </div>

          {/* Version List Grouped by Year and Month */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-3 min-h-0 text-xs">
            {isLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Versiyonlar yükleniyor...</div>
            ) : versionsByYear.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">Kayıtlı versiyon bulunamadı.</div>
            ) : (
              versionsByYear.map((yearGroup) => (
                <div key={yearGroup.year} className="space-y-1.5">
                  {/* Year Header */}
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{yearGroup.year} Yılı</span>
                  </div>

                  {/* Month Version Cards */}
                  <div className="space-y-1.5">
                    {yearGroup.items.map((ver) => {
                      const isActive = ver.id === activeVersionId;
                      const monthName = MONTH_NAMES[ver.month - 1];

                      return (
                        <div
                          key={ver.id}
                          onClick={() => handleSelectVersion(ver)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer relative group ${
                            isActive
                              ? 'bg-purple-50/80 border-purple-300 shadow-xs ring-1 ring-purple-300'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isActive
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {monthName}
                              </span>
                              <span className="font-bold text-slate-800 text-xs truncate">
                                {ver.title}
                              </span>
                            </div>

                            {isActive && (
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded shrink-0">
                                Aktif
                              </span>
                            )}
                          </div>

                          {ver.notes && (
                            <p className="text-[11px] text-slate-500 truncate mb-1 italic">
                              {ver.notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <span>{ver.month_str}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTitle(ver.title);
                                  setEditNotes(ver.notes || '');
                                  setActiveVersionId(ver.id);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Versiyon Bilgisini Düzenle"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              {versions.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVersion(ver.id, ver.month_str);
                                  }}
                                  className="p-1 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Versiyonu Sil"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
            <span>Toplam {versions.length} versiyon</span>
            <span className="text-purple-600 font-semibold">Geçmişe Dönüş Aktif</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: NEW MONTH / VERSION MODAL                      */}
      {/* ======================================================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Yeni Ay / Versiyon Oluştur
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewVersion} className="p-5 space-y-4 text-xs">
              {/* Year & Month Picker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Yıl *
                  </label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Ay *
                  </label>
                  <select
                    value={newMonth}
                    onChange={(e) => setNewMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name} ({idx + 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Versiyon Başlığı
                </label>
                <input
                  type="text"
                  placeholder={`${MONTH_NAMES[newMonth - 1]} ${newYear} Finans & Strateji`}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Template or Clone */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Başlangıç İçeriği
                </label>

                {activeVersion && (
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-purple-50/70 border border-purple-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cloneFromCurrent}
                      onChange={(e) => setCloneFromCurrent(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold text-purple-900">
                      Mevcut ({activeVersion.month_str}) zihin haritasını bu aya kopyala
                    </span>
                  </label>
                )}

                {!cloneFromCurrent && (
                  <select
                    value={newTemplateId}
                    onChange={(e) => setNewTemplateId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MINDMAP_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Aylık Notlar / Açıklama (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  placeholder="Bu ay için özel hedefler veya revizyon notları..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Versiyonu Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT VERSION METADATA MODAL                    */}
      {/* ======================================================== */}
      {isEditModalOpen && activeVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Versiyon Bilgilerini Düzenle</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Versiyon Başlığı
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Notlar
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setVersionTitle(editTitle);
                    setVersionNotes(editNotes);
                    await saveCurrentVersion(markdownContent, editTitle, editNotes, true);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
