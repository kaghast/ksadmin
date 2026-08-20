import crypto from 'node:crypto';
import { DiffLine } from '../types';

/**
 * Clean and normalize HTML content to readable, diffable text
 */
export function extractCleanTextFromHtml(html: string): { title: string; text: string } {
  if (!html) return { title: '', text: '' };

  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let title = '';
  if (titleMatch && titleMatch[1]) {
    title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Remove scripts, styles, noscript, svg, iframes, comments
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ');

  // Replace block elements with linebreaks
  cleaned = cleaned
    .replace(/<(?:p|div|h[1-6]|li|tr|article|section|header|footer|blockquote|br)[^>]*>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, ' ');

  // Decode common HTML entities
  cleaned = decodeHtmlEntities(cleaned);

  // Split into lines, trim, filter out empty lines, collapse spaces
  const lines = cleaned
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0);

  const text = lines.join('\n');
  return { title, text };
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([a-f0-9]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&uuml;/gi, 'ü')
    .replace(/&Uuml;/gi, 'Ü')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&Ouml;/gi, 'Ö')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&Ccedil;/gi, 'Ç')
    .replace(/&scedil;/gi, 'ş')
    .replace(/&Scedil;/gi, 'Ş')
    .replace(/&yacute;/gi, 'ı')
    .replace(/&Yacute;/gi, 'İ')
    .replace(/&thorn;/gi, 'ş')
    .replace(/&THORN;/gi, 'Ş')
    .replace(/&eth;/gi, 'ğ')
    .replace(/&ETH;/gi, 'Ğ')
    .replace(/&euro;/gi, '€')
    .replace(/&copy;/gi, '©')
    .replace(/&trade;/gi, '™')
    .replace(/&reg;/gi, '®');
}

export function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
}

/**
 * Fetch URL content safely with timeout and User-Agent headers
 */
export async function fetchUrlSnapshot(targetUrl: string): Promise<{
  success: boolean;
  httpStatus: number;
  title: string;
  text: string;
  hash: string;
  error?: string;
}> {
  try {
    let finalUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(finalUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KSAdminMonitor/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    clearTimeout(timeoutId);

    const httpStatus = response.status;
    const rawHtml = await response.text();

    const { title, text } = extractCleanTextFromHtml(rawHtml);
    const hash = computeHash(text);

    return {
      success: true,
      httpStatus,
      title: title || finalUrl,
      text,
      hash
    };
  } catch (err: any) {
    let errMsg = err.message || 'URL içeriği alınamadı';
    if (err.name === 'AbortError') {
      errMsg = 'İstek zaman aşımına uğradı (12sn timeout)';
    }
    return {
      success: false,
      httpStatus: 0,
      title: '',
      text: '',
      hash: '',
      error: errMsg
    };
  }
}

/**
 * Compute line-by-line Myers / LCS difference between two text snapshots
 */
export function computeTextDiff(
  oldText: string = '',
  newText: string = ''
): {
  hasChanged: boolean;
  diffLines: DiffLine[];
  summary: string;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  changePercentage: number;
} {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  if (oldText === newText) {
    const diffLines: DiffLine[] = oldLines.map((line, idx) => ({
      type: 'unchanged',
      text: line,
      oldNum: idx + 1,
      newNum: idx + 1
    }));
    return {
      hasChanged: false,
      diffLines,
      summary: 'Değişiklik yok (İçerik birebir aynı)',
      addedCount: 0,
      removedCount: 0,
      unchangedCount: oldLines.length,
      changePercentage: 0
    };
  }

  // LCS Matrix DP
  const m = oldLines.length;
  const n = newLines.length;
  
  // Optimization for large pages: limit to first 2000 lines if exceeded
  const maxLines = 1500;
  const safeOldLines = oldLines.slice(0, maxLines);
  const safeNewLines = newLines.slice(0, maxLines);
  const safeM = safeOldLines.length;
  const safeN = safeNewLines.length;

  const dp: number[][] = Array.from({ length: safeM + 1 }, () => new Array(safeN + 1).fill(0));

  for (let i = 1; i <= safeM; i++) {
    for (let j = 1; j <= safeN; j++) {
      if (safeOldLines[i - 1] === safeNewLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to reconstruct diff
  let i = safeM;
  let j = safeN;
  const rawDiff: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && safeOldLines[i - 1] === safeNewLines[j - 1]) {
      rawDiff.push({
        type: 'unchanged',
        text: safeOldLines[i - 1],
        oldNum: i,
        newNum: j
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({
        type: 'added',
        text: safeNewLines[j - 1],
        newNum: j
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({
        type: 'removed',
        text: safeOldLines[i - 1],
        oldNum: i
      });
      i--;
    }
  }

  const diffLines = rawDiff.reverse();

  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  for (const item of diffLines) {
    if (item.type === 'added') addedCount++;
    else if (item.type === 'removed') removedCount++;
    else unchangedCount++;
  }

  const totalLines = Math.max(1, addedCount + removedCount + unchangedCount);
  const changePercentage = Math.min(100, Math.round(((addedCount + removedCount) / totalLines) * 100));

  let summary = '';
  if (addedCount === 0 && removedCount === 0) {
    summary = 'Değişiklik yok';
  } else {
    const parts: string[] = [];
    if (addedCount > 0) parts.push(`+${addedCount} satır eklendi`);
    if (removedCount > 0) parts.push(`-${removedCount} satır silindi`);
    parts.push(`(%${changePercentage} değişim)`);
    summary = parts.join(', ');
  }

  return {
    hasChanged: addedCount > 0 || removedCount > 0,
    diffLines,
    summary,
    addedCount,
    removedCount,
    unchangedCount,
    changePercentage
  };
}
