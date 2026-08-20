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
