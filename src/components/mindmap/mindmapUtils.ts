import { MindmapNode } from '../../types';

// Palette of colors for top-level branches
export const BRANCH_COLORS = [
  { border: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', badge: '#dbeafe', line: '#60a5fa' }, // Blue
  { border: '#10b981', bg: '#ecfdf5', text: '#047857', badge: '#d1fae5', line: '#34d399' }, // Emerald
  { border: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9', badge: '#ede9fe', line: '#a78bfa' }, // Purple
  { border: '#f59e0b', bg: '#fffbeb', text: '#b45309', badge: '#fef3c7', line: '#fbbf24' }, // Amber
  { border: '#ec4899', bg: '#fdf2f8', text: '#be185d', badge: '#fce7f3', line: '#f472b6' }, // Pink/Rose
  { border: '#06b6d4', bg: '#ecfeff', text: '#0e7490', badge: '#cffafe', line: '#22d3ee' }, // Cyan
  { border: '#f97316', bg: '#fff7ed', text: '#c2410c', badge: '#ffedd5', line: '#fb923c' }, // Orange
  { border: '#14b8a6', bg: '#f0fdfa', text: '#0f766e', badge: '#ccfbf1', line: '#2dd4bf' }  // Teal
];

export interface LayoutNode {
  id: string;
  text: string;
  level: number;
  side: 'root' | 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
  isCollapsed: boolean;
  hasChildren: boolean;
  childrenCount: number;
  tag?: string;
  amount?: string;
  checked?: boolean;
  children: LayoutNode[];
}

/**
 * Parses markdown text into a hierarchical tree of MindmapNode
 */
export function parseMarkdownToTree(markdown: string): MindmapNode {
  const lines = markdown.split('\n');
  let rootTitle = '🎯 Finansal Zihin Haritası';
  
  // Find first H1 if available
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      rootTitle = trimmed.substring(2).trim();
      break;
    }
  }

  const root: MindmapNode = {
    id: 'node-root',
    text: rootTitle,
    level: 0,
    side: 'root',
    children: []
  };

  // Stack of active parents based on heading level / indentation
  // Level 0: root, Level 1: H2, Level 2: H3, Level 3: H4, Level 4: H5 or bullet
  const stack: { level: number; node: MindmapNode }[] = [{ level: 0, node: root }];
  let nodeCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || (trimmed.startsWith('# ') && !trimmed.startsWith('## '))) {
      // Empty line or already processed root H1
      continue;
    }

    let level = 1;
    let text = trimmed;

    // Helper to find last heading on stack
    const getLastHeadingLevel = () => {
      for (let sIdx = stack.length - 1; sIdx >= 0; sIdx--) {
        if (stack[sIdx].level <= 3) return stack[sIdx].level;
      }
      return 1;
    };

    // Check headings
    if (trimmed.startsWith('#### ')) {
      level = 3;
      text = trimmed.substring(5).trim();
    } else if (trimmed.startsWith('### ')) {
      level = 2;
      text = trimmed.substring(4).trim();
    } else if (trimmed.startsWith('## ')) {
      level = 1;
      text = trimmed.substring(3).trim();
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
      // List items: level depends on indentation
      const leadingSpaces = rawLine.search(/\S/);
      const indentLevel = Math.max(0, Math.floor(leadingSpaces / 2));
      const lastHeadingLevel = getLastHeadingLevel();
      level = Math.max(lastHeadingLevel + 1, lastHeadingLevel + 1 + indentLevel);
      text = trimmed.substring(2).trim();
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Numbered list items
      const match = trimmed.match(/^\d+\.\s(.*)/);
      text = match ? match[1].trim() : trimmed;
      const leadingSpaces = rawLine.search(/\S/);
      const indentLevel = Math.max(0, Math.floor(leadingSpaces / 2));
      const lastHeadingLevel = getLastHeadingLevel();
      level = Math.max(lastHeadingLevel + 1, lastHeadingLevel + 1 + indentLevel);
    } else {
      // Regular text block as child of current top
      const lastHeadingLevel = getLastHeadingLevel();
      level = lastHeadingLevel + 1;
    }

    // Extract tags like #tag
    let tag: string | undefined;
    const tagMatch = text.match(/#([\wığüşöçİĞÜŞÖÇ]+)/i);
    if (tagMatch) {
      tag = tagMatch[1];
    }

    const newNode: MindmapNode = {
      id: `node-${nodeCounter++}`,
      text,
      level,
      children: [],
      tag
    };

    // Pop stack until parent level is strictly lower
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    parent.children.push(newNode);
    stack.push({ level, node: newNode });
  }

  return root;
}

/**
 * Calculates node dimensions based on text length and level
 */
function estimateNodeSize(text: string, level: number): { width: number; height: number } {
  const clean = text.replace(/#[\wığüşöçİĞÜŞÖÇ]+/g, '').trim();
  const charLength = Math.max(8, clean.length);
  
  if (level === 0) {
    // Central Root node
    const width = Math.min(280, Math.max(160, charLength * 9.5 + 40));
    return { width, height: 48 };
  } else if (level === 1) {
    // Level 1 main category
    const width = Math.min(240, Math.max(130, charLength * 8 + 32));
    return { width, height: 40 };
  } else {
    // Sub items
    const width = Math.min(220, Math.max(110, charLength * 7.2 + 28));
    return { width, height: 34 };
  }
}

/**
 * Computes dual-sided balanced radial layout ("Ortadan Dağılım")
 */
export function computeRadialLayout(
  rootNode: MindmapNode,
  collapsedMap: Record<string, boolean> = {}
): {
  nodes: LayoutNode[];
  connections: {
    from: LayoutNode;
    to: LayoutNode;
    color: string;
    path: string;
  }[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number };
} {
  const rootSize = estimateNodeSize(rootNode.text, 0);
  const layoutRoot: LayoutNode = {
    id: rootNode.id,
    text: rootNode.text,
    level: 0,
    side: 'root',
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
    colorIndex: 0,
    isCollapsed: !!collapsedMap[rootNode.id],
    hasChildren: rootNode.children.length > 0,
    childrenCount: rootNode.children.length,
    tag: rootNode.tag,
    children: []
  };

  const allLayoutNodes: LayoutNode[] = [layoutRoot];
  const connections: { from: LayoutNode; to: LayoutNode; color: string; path: string }[] = [];

  const mainBranches = rootNode.children;
  if (mainBranches.length === 0 || layoutRoot.isCollapsed) {
    return {
      nodes: allLayoutNodes,
      connections: [],
      bounds: {
        minX: -rootSize.width / 2 - 40,
        maxX: rootSize.width / 2 + 40,
        minY: -rootSize.height / 2 - 40,
        maxY: rootSize.height / 2 + 40,
        width: rootSize.width + 80,
        height: rootSize.height + 80
      }
    };
  }

  // Distribute main branches evenly: Right and Left
  const rightBranches: MindmapNode[] = [];
  const leftBranches: MindmapNode[] = [];

  mainBranches.forEach((branch, idx) => {
    if (idx % 2 === 0) {
      rightBranches.push(branch);
    } else {
      leftBranches.push(branch);
    }
  });

  // Helper to measure vertical height of subtree
  function measureSubtreeHeight(node: MindmapNode, lvl: number): number {
    if (collapsedMap[node.id] || node.children.length === 0) {
      const s = estimateNodeSize(node.text, lvl);
      return s.height + 16; // node height + gap
    }
    let total = 0;
    for (const child of node.children) {
      total += measureSubtreeHeight(child, lvl + 1);
    }
    const s = estimateNodeSize(node.text, lvl);
    return Math.max(s.height + 16, total);
  }

  // Recursive layout placement for one side ('right' or 'left')
  function layoutBranch(
    node: MindmapNode,
    parentX: number,
    parentY: number,
    parentWidth: number,
    side: 'right' | 'left',
    level: number,
    colorIndex: number,
    startY: number,
    availableHeight: number,
    parentNode: LayoutNode
  ): LayoutNode {
    const size = estimateNodeSize(node.text, level);
    const horizontalGap = level === 1 ? 75 : 55;
    const isRight = side === 'right';

    const currentX = isRight
      ? parentX + parentWidth / 2 + horizontalGap + size.width / 2
      : parentX - parentWidth / 2 - horizontalGap - size.width / 2;

    const currentY = startY + availableHeight / 2;

    const isCollapsed = !!collapsedMap[node.id];
    const layoutNode: LayoutNode = {
      id: node.id,
      text: node.text,
      level,
      side,
      x: currentX,
      y: currentY,
      width: size.width,
      height: size.height,
      colorIndex,
      isCollapsed,
      hasChildren: node.children.length > 0,
      childrenCount: node.children.length,
      tag: node.tag,
      children: []
    };

    allLayoutNodes.push(layoutNode);
    parentNode.children.push(layoutNode);

    // Compute Bezier Connection Path
    const colorScheme = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];
    const startX = isRight ? parentX + parentWidth / 2 : parentX - parentWidth / 2;
    const startYPos = parentY;
    const endX = isRight ? currentX - size.width / 2 : currentX + size.width / 2;
    const endYPos = currentY;

    // Smooth cubic curve
    const dx = endX - startX;
    const cp1x = startX + dx * 0.5;
    const cp1y = startYPos;
    const cp2x = startX + dx * 0.5;
    const cp2y = endYPos;

    const path = `M ${startX} ${startYPos} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endYPos}`;
    connections.push({
      from: parentNode,
      to: layoutNode,
      color: colorScheme.line,
      path
    });

    // Layout children if not collapsed
    if (!isCollapsed && node.children.length > 0) {
      const childHeights = node.children.map((c) => measureSubtreeHeight(c, level + 1));
      const totalChildHeight = childHeights.reduce((a, b) => a + b, 0);

      let childY = currentY - totalChildHeight / 2;
      node.children.forEach((child, cIdx) => {
        const h = childHeights[cIdx];
        layoutBranch(
          child,
          currentX,
          currentY,
          size.width,
          side,
          level + 1,
          colorIndex,
          childY,
          h,
          layoutNode
        );
        childY += h;
      });
    }

    return layoutNode;
  }

  // Layout Right Side
  if (rightBranches.length > 0) {
    const rightHeights = rightBranches.map((b) => measureSubtreeHeight(b, 1));
    const totalRightHeight = rightHeights.reduce((a, b) => a + b, 0);
    let rightY = -totalRightHeight / 2;

    rightBranches.forEach((branch, idx) => {
      const h = rightHeights[idx];
      const colorIdx = (idx * 2) % BRANCH_COLORS.length;
      layoutBranch(
        branch,
        0,
        0,
        rootSize.width,
        'right',
        1,
        colorIdx,
        rightY,
        h,
        layoutRoot
      );
      rightY += h;
    });
  }

  // Layout Left Side
  if (leftBranches.length > 0) {
    const leftHeights = leftBranches.map((b) => measureSubtreeHeight(b, 1));
    const totalLeftHeight = leftHeights.reduce((a, b) => a + b, 0);
    let leftY = -totalLeftHeight / 2;

    leftBranches.forEach((branch, idx) => {
      const h = leftHeights[idx];
      const colorIdx = (idx * 2 + 1) % BRANCH_COLORS.length;
      layoutBranch(
        branch,
        0,
        0,
        rootSize.width,
        'left',
        1,
        colorIdx,
        leftY,
        h,
        layoutRoot
      );
      leftY += h;
    });
  }

  // Calculate bounding box for auto-zoom/fit
  let minX = -rootSize.width / 2;
  let maxX = rootSize.width / 2;
  let minY = -rootSize.height / 2;
  let maxY = rootSize.height / 2;

  for (const n of allLayoutNodes) {
    minX = Math.min(minX, n.x - n.width / 2 - 20);
    maxX = Math.max(maxX, n.x + n.width / 2 + 20);
    minY = Math.min(minY, n.y - n.height / 2 - 20);
    maxY = Math.max(maxY, n.y + n.height / 2 + 20);
  }

  return {
    nodes: allLayoutNodes,
    connections,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(600, maxX - minX + 80),
      height: Math.max(400, maxY - minY + 80)
    }
  };
}

// Built-in Templates
export const MINDMAP_TEMPLATES = [
  {
    id: 'finance-plan',
    title: 'Aylık Finans & Bütçe Planı',
    description: 'Gelirler, sabit giderler, kredi kartları ve birikim hedefleri',
    markdown: `# 🎯 2026 Ağustos Finans & Strateji Haritası

## 💰 Gelir & Nakit Akışı
### 💼 Maaş & Sabit Gelir
- Kemal Şahin Maaş: ₺85.000
- Prim & Ek Gelir: ₺15.000
### 📈 Pasif Gelirler
- Vadeli Mevduat Faizi: ₺6.200
- Temettü / Fon Getirileri: ₺3.800
### ⏳ Beklenen Tahsilatlar
- Danışmanlık Projesi: ₺20.000

## 💳 Kredi Kartı & Harcamalar
### 🛒 Zorunlu Giderler
- Market & Mutfak: ₺18.500
- Akaryakıt & Ulaşım: ₺6.000
- Faturalar & Abonelikler: ₺4.200
### 🏖️ Yaşam & Sosyal
- Dışarıda Yemek & Kafe: ₺5.500
- Giyim & Alışveriş: ₺4.000
### 💳 Kart Limit Stratejisi
- Garanti Bonus: Ekstre kapatılacak
- Yapı Kredi World: Dönem borcu ödenecek

## 🏦 Krediler & Borç Kapatma
### 📉 Aktif Krediler
- Konut Kredisi: Taksit 14/120 (₺18.450)
- İhtiyaç Kredisi: Taksit 8/24 (₺7.800)
### 🎯 Erken Kapatma Planı
- İhtiyaç Kredisi 2027 başında kapatılacak
### 🛡️ KMH / Ek Hesap
- Garanti Avans Hesap: Borç sıfırlandı
- Akbank Artı Para: Acil durum için hazır

## 🚀 Tasarruf & Yatırımlar
### 🥇 Değerli Madenler & Altın
- Aylık 2 Gram Fiziki Altın
- Altın Fonu (ZGold): ₺10.000
### 📊 Borsa & Eurobond
- BIST30 Temettü Hisseleri: ₺15.000
- Yabancı Teknoloji Fonları: ₺8.000
### 🛡️ Acil Durum Fonu
- Hedef: ₺300.000 (Mevcut: ₺180.000)`
  },
  {
    id: 'debt-payoff',
    title: 'Borç & Kredi Kapatma Yol Haritası',
    description: 'Kartlar, tüketici kredileri ve KMH hesapları kapatma stratejisi',
    markdown: `# 🛡️ Borç Kapatma & Finansal Özgürlük Ağacı

## ⚡ Yüksek Faizli Borçlar (Öncelik 1)
### 💳 Kredi Kartları Borçları
- Garanti Bonus Kart (₺45.000) #acil
- Akbank Axess (₺28.000)
### 🏦 KMH Hesapları (Faiz Günlük)
- Yapı Kredi Esnek Hesap: Sıfırla
- Garanti Avans Hesap: Kapalı tut

## 📅 Orta Vadeli Krediler (Öncelik 2)
### 🚗 Taşıt / İhtiyaç Kredisi
- Kalan Taksit: 10 Ay
- Aylık Taksit: ₺12.400
- Toplu Ödeme İndirimi Sorulacak

## 🏡 Uzun Vadeli Düşük Faizli (Öncelik 3)
### 🏠 Konut Kredisi
- Sabit Düşük Faiz (%1.89)
- Enflasyona karşı eritilecek
- Erken kapatma zorunlu değil

## 💡 Borç Tasarruf Kaynakları
### ✂️ Kısılabilecek Giderler
- Abonelik iptalleri: ₺1.200
- Dışarıda yemek azaltımı: ₺4.000
### 💵 Ek Gelir Yaratma
- Freelance İşler: ₺15.000
- İkinci El Eşya Satışı: ₺8.000`
  },
  {
    id: 'invest-strategy',
    title: 'Yatırım & Varlık Büyütme Portföyü',
    description: 'Hisse, fon, altın, eurobond ve döviz dağılım planı',
    markdown: `# 📈 Varlık & Yatırım Dağılım Haritası

## 💎 Sabit Getirili Varlıklar (%35)
### 🥇 Altın & Emtia
- Fiziki Gram & Çeyrek Altın
- Darphane Altın Sertifikası (ALTINS1)
### 🏦 Vadeli Mevduat & Para Piyasası Fonu
- Günlük Nemalanan Fon (PPF)
- 32 Günlük Vadeli Mevduat

## 🚀 Büyüme & Hisse Senetleri (%45)
### 🇹🇷 BIST 100 / Temettü 25
- Türk Hava Yolları, TÜPRAŞ, Ereğli
- Fon: TTE, TI2, MAC
### 🇺🇸 Yabancı Hisse & Teknoloji
- S&P 500 Endeks Fonu
- Nasdaq Teknoloji Şirketleri

## 🏠 Gayrimenkul & Alternatif (%20)
### 🏘️ Gayrimenkul Yatırım Ortaklıkları (GYO)
- Kira Getirili GYO Fonları
### 🛡️ Acil Durum Likit Kasa
- 3 Aylık Sabit Masraf Kasası`
  },
  {
    id: 'blank',
    title: 'Boş Şablon',
    description: 'Kendi zihin haritanızı sıfırdan oluşturun',
    markdown: `# 🎯 Zihin Haritası Başlığı

## 🌟 Birinci Ana Dal
### 📌 Alt Konu 1
- Detay 1
- Detay 2
### 📌 Alt Konu 2
- Detay 3

## 🚀 İkinci Ana Dal
### 📌 Alt Konu 3
- Detay 4
### 📌 Alt Konu 4
- Detay 5`
  }
];
