import initSqlJs, { Database } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'ksadmin.sqlite');

let dbInstance: Database | null = null;
let SQL: any = null;

const DEFAULT_ADMIN_EMAIL = 'kemalsahin@gmail.com';
const DEFAULT_ADMIN_PASS = '123**654';

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create DATA_DIR, fallback to current dir', e);
    }
  }

  if (!SQL) {
    SQL = await initSqlJs();
  }

  let dbBuffer: Buffer | null = null;
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      dbBuffer = fs.readFileSync(DB_FILE_PATH);
    } catch (err) {
      console.error('Failed reading existing SQLite DB file:', err);
    }
  }

  dbInstance = dbBuffer ? new SQL.Database(dbBuffer) : new SQL.Database();
  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite DB to disk:', err);
  }
}

function initSchema(db: Database) {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Kemal Şahin',
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tanım tabanlı Bankalar Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      color TEXT DEFAULT '#2563eb',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Krediler Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      loan_name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      monthly_installment REAL NOT NULL,
      due_day INTEGER NOT NULL,
      current_installment INTEGER NOT NULL,
      total_installments INTEGER NOT NULL,
      interest_rate REAL DEFAULT 0,
      start_date TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Kredi Kartları Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS credit_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      card_name TEXT NOT NULL,
      card_last4 TEXT,
      total_limit REAL NOT NULL,
      current_debt REAL NOT NULL DEFAULT 0,
      minimum_payment REAL DEFAULT 0,
      statement_day INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      color_theme TEXT DEFAULT 'slate',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Kredili Mevduat Hesabı (KMH / Ek Hesap) Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS kmh_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      total_limit REAL NOT NULL,
      used_amount REAL NOT NULL DEFAULT 0,
      interest_rate REAL DEFAULT 0,
      due_day INTEGER DEFAULT 1,
      iban TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ödeme ve İşlem Kayıtları Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL, -- 'loan', 'credit_card', 'kmh'
      target_id INTEGER NOT NULL,
      target_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      installment_number INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Kredi Kartı Harcamaları ve Alt Kırılımlar Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS card_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER,
      card_name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      tags TEXT DEFAULT '',
      expense_date TEXT NOT NULL,
      description TEXT,
      installment_count INTEGER DEFAULT 1,
      sub_items TEXT DEFAULT '[]',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sistem Ayarları Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Mindmap Aylık Versiyonlar Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS mindmap_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      month_str TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      theme TEXT DEFAULT 'modern',
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // URL Takip Kategorileri Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS url_monitor_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#2563eb',
      icon TEXT DEFAULT 'Globe',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // URL Takip Öğeleri Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS url_monitored_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      selector TEXT,
      check_interval_hours INTEGER DEFAULT 24,
      last_checked_at DATETIME,
      last_changed_at DATETIME,
      has_changes INTEGER DEFAULT 0,
      is_tracked INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      http_status INTEGER DEFAULT 200,
      initial_snapshot_content TEXT,
      last_snapshot_content TEXT,
      content_hash TEXT,
      change_summary TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES url_monitor_categories (id) ON DELETE SET NULL
    );
  `);

  // Migration: Ensure is_tracked column exists on url_monitored_items
  try {
    db.run('ALTER TABLE url_monitored_items ADD COLUMN is_tracked INTEGER DEFAULT 1');
  } catch (e) {
    // Column already exists
  }

  // URL Değişiklik ve Snapshot Geçmişi Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS url_monitor_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      http_status INTEGER DEFAULT 200,
      has_changed INTEGER DEFAULT 0,
      previous_content TEXT,
      current_content TEXT,
      content_hash TEXT,
      diff_summary TEXT,
      diff_details TEXT,
      change_type TEXT DEFAULT 'unchanged',
      notes TEXT,
      FOREIGN KEY (item_id) REFERENCES url_monitored_items (id) ON DELETE CASCADE
    );
  `);

  // Initial Seed for URL Monitor Categories if empty
  const urlCategoryCheck = db.exec("SELECT id FROM url_monitor_categories LIMIT 1");
  if (!urlCategoryCheck.length || !urlCategoryCheck[0].values.length) {
    const defaultCategories = [
      { name: 'Finans & Bankacılık', color: '#2563eb', icon: 'Landmark' },
      { name: 'E-Ticaret & Fiyat Takibi', color: '#16a34a', icon: 'ShoppingCart' },
      { name: 'Resmi Kurum & Mevzuat', color: '#7c3aed', icon: 'Scale' },
      { name: 'Haber & Bülten', color: '#ea580c', icon: 'Newspaper' },
      { name: 'Teknoloji & Yazılım', color: '#0891b2', icon: 'Code' }
    ];

    for (const cat of defaultCategories) {
      db.run('INSERT INTO url_monitor_categories (name, color, icon) VALUES (?, ?, ?)', [cat.name, cat.color, cat.icon]);
    }
  }

  // Initial Seed for URL Monitored Items if empty
  const urlItemCheck = db.exec("SELECT id FROM url_monitored_items LIMIT 1");
  if (!urlItemCheck.length || !urlItemCheck[0].values.length) {
    const catRows = queryAll<{ id: number; name: string }>('SELECT id, name FROM url_monitor_categories');
    const finCat = catRows.find(c => c.name.includes('Finans'))?.id || 1;
    const mevzuatCat = catRows.find(c => c.name.includes('Mevzuat'))?.id || 3;
    const ecomCat = catRows.find(c => c.name.includes('Ticaret'))?.id || 2;

    const initialTcmbContent = `Türkiye Cumhuriyet Merkez Bankası (TCMB)
Para Politikası Kurulu (PPK) Faiz Kararları
Giriş Tarihi: 01.08.2026

1. Politika Faizi (1 Hafta Vadeli Repo İhale Faiz Oranı): %47.50
2. Gecelik Borçlanma Faizi: %46.00
3. Gecelik Borç Verme Faizi: %50.50
4. Geç Likidite Penceresi Borç Verme Faizi: %53.50

Karar Özeti:
Kurul, enflasyonun ana eğiliminde belirgin ve kalıcı bir düşüş sağlanana kadar sıkı para politikası duruşunun sürdürüleceğini belirtmiştir.`;

    const updatedTcmbContent = `Türkiye Cumhuriyet Merkez Bankası (TCMB)
Para Politikası Kurulu (PPK) Faiz Kararları
Giriş Tarihi: 18.08.2026 (Yeni Karar)

1. Politika Faizi (1 Hafta Vadeli Repo İhale Faiz Oranı): %45.00
2. Gecelik Borçlanma Faizi: %43.50
3. Gecelik Borç Verme Faizi: %48.00
4. Geç Likidite Penceresi Borç Verme Faizi: %51.00

Karar Özeti:
Kurul, aylık enflasyon göstergelerindeki iyileşme doğrultusunda politika faizinde 250 baz puan indirime gidilmesine karar vermiştir.`;

    const diffJsonTcmb = JSON.stringify([
      { type: 'unchanged', text: 'Türkiye Cumhuriyet Merkez Bankası (TCMB)' },
      { type: 'unchanged', text: 'Para Politikası Kurulu (PPK) Faiz Kararları' },
      { type: 'removed', text: 'Giriş Tarihi: 01.08.2026' },
      { type: 'added', text: 'Giriş Tarihi: 18.08.2026 (Yeni Karar)' },
      { type: 'unchanged', text: '' },
      { type: 'removed', text: '1. Politika Faizi (1 Hafta Vadeli Repo İhale Faiz Oranı): %47.50' },
      { type: 'removed', text: '2. Gecelik Borçlanma Faizi: %46.00' },
      { type: 'removed', text: '3. Gecelik Borç Verme Faizi: %50.50' },
      { type: 'removed', text: '4. Geç Likidite Penceresi Borç Verme Faizi: %53.50' },
      { type: 'added', text: '1. Politika Faizi (1 Hafta Vadeli Repo İhale Faiz Oranı): %45.00' },
      { type: 'added', text: '2. Gecelik Borçlanma Faizi: %43.50' },
      { type: 'added', text: '3. Gecelik Borç Verme Faizi: %48.00' },
      { type: 'added', text: '4. Geç Likidite Penceresi Borç Verme Faizi: %51.00' },
      { type: 'unchanged', text: '' },
      { type: 'unchanged', text: 'Karar Özeti:' },
      { type: 'removed', text: 'Kurul, enflasyonun ana eğiliminde belirgin ve kalıcı bir düşüş sağlanana kadar sıkı para politikası duruşunun sürdürüleceğini belirtmiştir.' },
      { type: 'added', text: 'Kurul, aylık enflasyon göstergelerindeki iyileşme doğrultusunda politika faizinde 250 baz puan indirime gidilmesine karar vermiştir.' }
    ]);

    // Item 1: TCMB
    db.run(`
      INSERT INTO url_monitored_items (
        category_id, title, url, check_interval_hours, last_checked_at, last_changed_at,
        has_changes, status, http_status, initial_snapshot_content, last_snapshot_content,
        change_summary, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      finCat,
      'TCMB Politika Faiz Oranları & PPK Kararı',
      'https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/temel+faaliyetler/para+politikasi/faizler',
      12,
      '2026-08-20 09:15:00',
      '2026-08-18 14:00:00',
      1,
      'active',
      200,
      initialTcmbContent,
      updatedTcmbContent,
      '+6 satır eklendi, -6 satır silindi (Faiz oranları değişti)',
      'Aylık PPK toplantı kararları takibi'
    ]);

    const tcmbItemId = (db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number) || 1;

    // History 1: Baseline
    db.run(`
      INSERT INTO url_monitor_history (item_id, checked_at, http_status, has_changed, previous_content, current_content, diff_summary, diff_details, change_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tcmbItemId,
      '2026-08-01 10:00:00',
      200,
      0,
      '',
      initialTcmbContent,
      'İlk kayıt oluşturuldu (Referans Baseline)',
      '[]',
      'initial'
    ]);

    // History 2: Change detected
    db.run(`
      INSERT INTO url_monitor_history (item_id, checked_at, http_status, has_changed, previous_content, current_content, diff_summary, diff_details, change_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tcmbItemId,
      '2026-08-18 14:00:00',
      200,
      1,
      initialTcmbContent,
      updatedTcmbContent,
      'Faiz indirimi ve karar metni değişikliği tespit edildi (+6 / -6 satır)',
      diffJsonTcmb,
      'changed'
    ]);

    // Item 2: Resmi Gazete
    const resmigazeteContent = `T.C. Resmi Gazete
Kuruluş: 7 Ekim 1920
Sayı: 33412 - 20 Ağustos 2026 Perşembe

YÜRÜTME VE İDARE BÖLÜMÜ
YÖNETMELİKLER
–– Bankacılık Düzenleme ve Denetleme Kurumu Yönetmeliğinde Değişiklik Yapılmasına Dair Yönetmelik
–– Sermaye Piyasası Kurulu Yatırım Hizmetleri Tebliği (III-37.1) Güncellemesi

İLÂNLAR
a - Yargı İlânları
b - Artırma, Eksiltme ve İhale İlânları
c - Çeşitli İlânlar`;

    db.run(`
      INSERT INTO url_monitored_items (
        category_id, title, url, check_interval_hours, last_checked_at, last_changed_at,
        has_changes, status, http_status, initial_snapshot_content, last_snapshot_content,
        change_summary, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mevzuatCat,
      'T.C. Resmi Gazete - Günlük Sayı',
      'https://www.resmigazete.gov.tr',
      6,
      '2026-08-20 06:30:00',
      '2026-08-20 06:30:00',
      0,
      'active',
      200,
      resmigazeteContent,
      resmigazeteContent,
      'Son kontrolde değişiklik tespit edilmedi (Güncel)',
      'Günlük mevzuat ve tebliğ takibi'
    ]);

    const rgItemId = (db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number) || 2;

    db.run(`
      INSERT INTO url_monitor_history (item_id, checked_at, http_status, has_changed, previous_content, current_content, diff_summary, diff_details, change_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      rgItemId,
      '2026-08-20 06:30:00',
      200,
      0,
      resmigazeteContent,
      resmigazeteContent,
      'İlk kayıt oluşturuldu',
      '[]',
      'initial'
    ]);

    // Item 3: Apple MacBook Fiyat Takibi
    const initialAppleContent = `Apple Türkiye - MacBook Pro 14 inç
M4 Pro Çip, 24 GB Birleşik Bellek, 512 GB SSD
Fiyat: 84.999,00 TL
Stok Durumu: Hemen Teslim (1-2 iş günü)
Ücretsiz Kargo ve 14 Gün İade Garantisi`;

    const updatedAppleContent = `Apple Türkiye - MacBook Pro 14 inç
M4 Pro Çip, 24 GB Birleşik Bellek, 512 GB SSD
Fiyat: 89.999,00 TL (Fiyat Güncellendi)
Stok Durumu: Hemen Teslim (1-2 iş günü)
Ücretsiz Kargo ve 14 Gün İade Garantisi`;

    const diffJsonApple = JSON.stringify([
      { type: 'unchanged', text: 'Apple Türkiye - MacBook Pro 14 inç' },
      { type: 'unchanged', text: 'M4 Pro Çip, 24 GB Birleşik Bellek, 512 GB SSD' },
      { type: 'removed', text: 'Fiyat: 84.999,00 TL' },
      { type: 'added', text: 'Fiyat: 89.999,00 TL (Fiyat Güncellendi)' },
      { type: 'unchanged', text: 'Stok Durumu: Hemen Teslim (1-2 iş günü)' },
      { type: 'unchanged', text: 'Ücretsiz Kargo ve 14 Gün İade Garantisi' }
    ]);

    db.run(`
      INSERT INTO url_monitored_items (
        category_id, title, url, check_interval_hours, last_checked_at, last_changed_at,
        has_changes, status, http_status, initial_snapshot_content, last_snapshot_content,
        change_summary, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ecomCat,
      'Apple MacBook Pro 14" M4 Pro Fiyatı',
      'https://www.apple.com/tr/shop/buy-mac/macbook-pro',
      24,
      '2026-08-19 18:45:00',
      '2026-08-19 18:45:00',
      1,
      'active',
      200,
      initialAppleContent,
      updatedAppleContent,
      '+1 satır / -1 satır (Fiyat: 84.999 TL → 89.999 TL)',
      'Ekipman yenileme bütçe takibi'
    ]);

    const appleItemId = (db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number) || 3;

    db.run(`
      INSERT INTO url_monitor_history (item_id, checked_at, http_status, has_changed, previous_content, current_content, diff_summary, diff_details, change_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      appleItemId,
      '2026-08-10 12:00:00',
      200,
      0,
      '',
      initialAppleContent,
      'İlk kayıt oluşturuldu',
      '[]',
      'initial'
    ]);

    db.run(`
      INSERT INTO url_monitor_history (item_id, checked_at, http_status, has_changed, previous_content, current_content, diff_summary, diff_details, change_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      appleItemId,
      '2026-08-19 18:45:00',
      200,
      1,
      initialAppleContent,
      updatedAppleContent,
      'Fiyat değişikliği tespit edildi (84.999 TL -> 89.999 TL)',
      diffJsonApple,
      'changed'
    ]);
  }


  // Initial Seed for Mindmap if empty
  const mindmapCheck = db.exec("SELECT id FROM mindmap_versions LIMIT 1");
  if (!mindmapCheck.length || !mindmapCheck[0].values.length) {
    const defaultMarkdown = `# 🎯 2026 Ağustos Finans & Strateji Haritası

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
- Yapı Kredi World: Asgari değil, dönem borcu ödenecek

## 🏦 Krediler & Borç Kapatma
### 📉 Aktif Krediler
- Konut Kredisi: Taksit 14/120 (₺18.450)
- İhtiyaç Kredisi: Taksit 8/24 (₺7.800)
### 🎯 Erken Kapatma Planı
- İhtiyaç Kredisi 2027 başında toplu kapatılacak
### 🛡️ KMH / Ek Hesap
- Garanti Avans Hesap: Borç sıfırlandı
- Akbank Artı Para: Acil durum için hazır tutuluyor

## 🚀 Tasarruf & Yatırımlar
### 🥇 Değerli Madenler & Altın
- Aylık 2 Gram Fiziki Altın alımı
- Altın Fonu (ZGold): ₺10.000
### 📊 Borsa & Eurobond
- BIST30 Temettü Hisseleri: ₺15.000
- Yabancı Teknoloji Fonları (AFT/TTE): ₺8.000
### 🛡️ Acil Durum Fonu (6 Aylık)
- Hedef: ₺300.000 (Mevcut: ₺180.000)`;

    const defaultJulyMarkdown = `# 🎯 2026 Temmuz Finans & Bütçe Özeti

## 💰 Gelirler
### 💼 Maaş & Prim
- Net Maaş: ₺85.000
- Bayram İkramiyesi: ₺12.500

## 💳 Kart Harcamaları
### 🏖️ Tatil & Seyahat
- Otel & Uçak Rezervasyonu: ₺32.000
- Yeme İçme: ₺9.000
### 🛒 Ev & Market
- Süpermarket Harcamaları: ₺16.200

## 🏦 Krediler
### 📉 Taksitler
- Konut Kredisi Taksiti: ₺18.450
- İhtiyaç Kredisi Taksiti: ₺7.800

## 🚀 Yatırımlar
### 🥇 Birikim
- Altın & Fon: ₺20.000`;

    db.run(
      'INSERT INTO mindmap_versions (year, month, month_str, title, content, theme, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [2026, 8, '2026-08', 'Ağustos 2026 Finans & Strateji Haritası', defaultMarkdown, 'modern', 'Ağustos ayı bütçe ve borç yönetim planı']
    );
    db.run(
      'INSERT INTO mindmap_versions (year, month, month_str, title, content, theme, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [2026, 7, '2026-07', 'Temmuz 2026 Finans & Bütçe Özeti', defaultJulyMarkdown, 'emerald', 'Temmuz ayı tatil ve birikim haritası']
    );
  }

  // Admin kullanıcısını kontrol et / yoksa oluştur
  const userCheck = db.exec("SELECT id, email, password_hash FROM users WHERE email = '" + DEFAULT_ADMIN_EMAIL + "'");
  if (!userCheck.length || !userCheck[0].values.length) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASS, salt);
    db.run(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [DEFAULT_ADMIN_EMAIL, hash, 'Kemal Şahin', 'admin']
    );
  }

  // Varsayılan Banka Tanımlarını Ekle
  const defaultBanks = [
    { name: 'Garanti BBVA', code: 'GARAN', color: '#008542' },
    { name: 'İş Bankası', code: 'ISCTR', color: '#003399' },
    { name: 'Yapı Kredi', code: 'YKBNK', color: '#002d72' },
    { name: 'Akbank', code: 'AKBNK', color: '#e30613' },
    { name: 'Ziraat Bankası', code: 'TCZB', color: '#e21838' },
    { name: 'QNB Finansbank', code: 'QNBFB', color: '#4a154b' },
    { name: 'Vakıfbank', code: 'VAKBN', color: '#ffb612' },
    { name: 'Enpara.com', code: 'ENP', color: '#782b90' },
    { name: 'TEB', code: 'TEB', color: '#00965e' },
    { name: 'DenizBank', code: 'DENIZ', color: '#005ba4' },
    { name: 'Kuveyt Türk', code: 'KUVYT', color: '#006937' },
    { name: 'Halkbank', code: 'HALKB', color: '#005f9e' }
  ];

  for (const b of defaultBanks) {
    const exists = db.exec(`SELECT id FROM bank_definitions WHERE name = '${b.name.replace(/'/g, "''")}'`);
    if (!exists.length || !exists[0].values.length) {
      db.run('INSERT INTO bank_definitions (name, code, color) VALUES (?, ?, ?)', [b.name, b.code, b.color]);
    }
  }
}

// Utility SQL runner to transform results to objects
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params.length) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const list = queryAll<T>(sql, params);
  return list.length ? list[0] : null;
}

export function execute(sql: string, params: any[] = []): { changes: number; lastInsertId: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDb();
  const lastIdRes = dbInstance.exec('SELECT last_insert_rowid() as id');
  const lastInsertId = (lastIdRes[0]?.values[0]?.[0] as number) || 0;
  return { changes: 1, lastInsertId };
}
