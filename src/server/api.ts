import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, queryAll, queryOne, execute, saveDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'ksadmin-super-secret-key-2026';

export const apiRouter = Router();

// Middleware to ensure DB is initialized
apiRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getDb();
    next();
  } catch (err: any) {
    console.error('DB Init Middleware Error:', err);
    res.status(500).json({ error: 'Veritabanı bağlantı hatası: ' + err.message });
  }
});

// Auth Helper
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli. Lütfen giriş yapın.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Oturum süresi dolmuş veya geçersiz token.' });
    }
    (req as any).user = user;
    next();
  });
}

// ----------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
    }

    const user = queryOne('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Geçersiz e-posta adresi veya şifre.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Geçersiz e-posta adresi veya şifre.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Giriş işlemi sırasında sunucu hatası.' });
  }
});

apiRouter.get('/auth/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const user = queryOne('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?', [userPayload.id]);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Tüm alanları doldurmanız gerekmektedir.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Yeni şifre ve şifre tekrarı uyuşmuyor.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    const user = queryOne('SELECT * FROM users WHERE id = ?', [userPayload.id]);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mevcut şifreniz hatalı. Lütfen kontrol edin.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newHash, user.id]
    );

    return res.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi. Güvenliğiniz için yeni şifreniz geçerlidir.'
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: 'Şifre güncellenirken bir hata oluştu: ' + err.message });
  }
});

// ----------------------------------------------------
// FINANCIAL SUMMARY ROUTE
// ----------------------------------------------------

apiRouter.get('/financial/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const loans = queryAll('SELECT * FROM loans WHERE status = "active" ORDER BY due_day ASC');
    const creditCards = queryAll('SELECT * FROM credit_cards ORDER BY due_day ASC');
    const kmhAccounts = queryAll('SELECT * FROM kmh_accounts ORDER BY bank_name ASC');

    // 1. Krediler Hesaplama
    let totalLoanInitialAmount = 0;
    let totalLoanRemainingDebt = 0;
    let totalLoanMonthlyInstallment = 0;

    loans.forEach((l: any) => {
      totalLoanInitialAmount += Number(l.total_amount || 0);
      const remainingInstallments = Math.max(0, Number(l.total_installments) - Number(l.current_installment));
      totalLoanRemainingDebt += remainingInstallments * Number(l.monthly_installment || 0);
      totalLoanMonthlyInstallment += Number(l.monthly_installment || 0);
    });

    // 2. Kredi Kartları Hesaplama
    let totalCreditCardLimit = 0;
    let totalCreditCardDebt = 0;
    let totalCreditCardMinPayment = 0;

    creditCards.forEach((c: any) => {
      totalCreditCardLimit += Number(c.total_limit || 0);
      totalCreditCardDebt += Number(c.current_debt || 0);
      totalCreditCardMinPayment += Number(c.minimum_payment || 0);
    });

    // 3. KMH Hesaplama
    let totalKmhLimit = 0;
    let totalKmhUsed = 0;

    kmhAccounts.forEach((k: any) => {
      totalKmhLimit += Number(k.total_limit || 0);
      totalKmhUsed += Number(k.used_amount || 0);
    });

    // 4. Genel Toplamlar
    const totalActiveDebt = totalLoanRemainingDebt + totalCreditCardDebt + totalKmhUsed;
    const totalTotalLimits = totalCreditCardLimit + totalKmhLimit;
    const totalMonthlyCommitment = totalLoanMonthlyInstallment + totalCreditCardMinPayment;

    // 5. Yaklaşan Ödeme Takvimi (Tarih sıralı)
    const today = new Date();
    const currentDay = today.getDate();

    interface UpcomingItem {
      id: string;
      title: string;
      bankName: string;
      type: 'loan' | 'credit_card' | 'kmh';
      amount: number;
      dueDay: number;
      daysRemaining: number;
      details: string;
    }

    const upcomingPayments: UpcomingItem[] = [];

    loans.forEach((l: any) => {
      const remainingCount = Number(l.total_installments) - Number(l.current_installment);
      if (remainingCount > 0) {
        let diff = l.due_day - currentDay;
        if (diff < 0) diff += 30; // Sonraki ay döngüsü
        upcomingPayments.push({
          id: `loan-${l.id}`,
          title: l.loan_name,
          bankName: l.bank_name,
          type: 'loan',
          amount: Number(l.monthly_installment),
          dueDay: l.due_day,
          daysRemaining: diff,
          details: `Taksit: ${l.current_installment + 1}/${l.total_installments}`
        });
      }
    });

    creditCards.forEach((c: any) => {
      if (Number(c.current_debt) > 0) {
        let diff = c.due_day - currentDay;
        if (diff < 0) diff += 30;
        upcomingPayments.push({
          id: `card-${c.id}`,
          title: `${c.card_name} (${c.card_last4 ? '•••• ' + c.card_last4 : 'Kart'})`,
          bankName: c.bank_name,
          type: 'credit_card',
          amount: Number(c.minimum_payment) > 0 ? Number(c.minimum_payment) : Number(c.current_debt),
          dueDay: c.due_day,
          daysRemaining: diff,
          details: `Dönem Borcu: ₺${Number(c.current_debt).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
        });
      }
    });

    upcomingPayments.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return res.json({
      summary: {
        totalActiveDebt,
        totalMonthlyCommitment,
        totalCreditCardLimit,
        totalCreditCardDebt,
        totalKmhLimit,
        totalKmhUsed,
        totalLoanRemainingDebt,
        totalLoanMonthlyInstallment,
        loanCount: loans.length,
        creditCardCount: creditCards.length,
        kmhCount: kmhAccounts.length
      },
      upcomingPayments: upcomingPayments.slice(0, 10)
    });
  } catch (err: any) {
    console.error('Summary error:', err);
    return res.status(500).json({ error: 'Finansal özet yüklenemedi.' });
  }
});

// ----------------------------------------------------
// KREDİLER (LOANS) ROUTES
// ----------------------------------------------------

apiRouter.get('/financial/loans', authenticateToken, (req: Request, res: Response) => {
  try {
    const loans = queryAll('SELECT * FROM loans ORDER BY created_at DESC');
    return res.json({ loans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/financial/loans', authenticateToken, (req: Request, res: Response) => {
  try {
    const {
      bank_name,
      loan_name,
      total_amount,
      monthly_installment,
      due_day,
      current_installment,
      total_installments,
      interest_rate,
      start_date,
      notes
    } = req.body;

    if (!bank_name || !loan_name || !total_amount || !monthly_installment || !due_day || !total_installments) {
      return res.status(400).json({ error: 'Lütfen zorunlu kredi alanlarını eksiksiz doldurunuz.' });
    }

    const result = execute(`
      INSERT INTO loans (
        bank_name, loan_name, total_amount, monthly_installment,
        due_day, current_installment, total_installments, interest_rate, start_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bank_name.trim(),
      loan_name.trim(),
      Number(total_amount),
      Number(monthly_installment),
      Number(due_day),
      Number(current_installment || 0),
      Number(total_installments),
      Number(interest_rate || 0),
      start_date || null,
      notes ? notes.trim() : null
    ]);

    const created = queryOne('SELECT * FROM loans WHERE id = ?', [result.lastInsertId]);
    return res.status(201).json({ success: true, loan: created });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kredi eklenemedi: ' + err.message });
  }
});

apiRouter.put('/financial/loans/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      bank_name,
      loan_name,
      total_amount,
      monthly_installment,
      due_day,
      current_installment,
      total_installments,
      interest_rate,
      start_date,
      notes,
      status
    } = req.body;

    const existing = queryOne('SELECT * FROM loans WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Kredi bulunamadı.' });
    }

    execute(`
      UPDATE loans SET
        bank_name = ?,
        loan_name = ?,
        total_amount = ?,
        monthly_installment = ?,
        due_day = ?,
        current_installment = ?,
        total_installments = ?,
        interest_rate = ?,
        start_date = ?,
        notes = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      bank_name?.trim() || existing.bank_name,
      loan_name?.trim() || existing.loan_name,
      Number(total_amount ?? existing.total_amount),
      Number(monthly_installment ?? existing.monthly_installment),
      Number(due_day ?? existing.due_day),
      Number(current_installment ?? existing.current_installment),
      Number(total_installments ?? existing.total_installments),
      Number(interest_rate ?? existing.interest_rate),
      start_date ?? existing.start_date,
      notes !== undefined ? notes?.trim() : existing.notes,
      status || existing.status,
      id
    ]);

    const updated = queryOne('SELECT * FROM loans WHERE id = ?', [id]);
    return res.json({ success: true, loan: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kredi güncellenemedi: ' + err.message });
  }
});

apiRouter.delete('/financial/loans/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM loans WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Kredi bulunamadı.' });
    }

    execute('DELETE FROM loans WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Kredi kaydı başarıyla silindi.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Taksit Ödeme / İlerletme
apiRouter.post('/financial/loans/:id/pay-installment', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const loan = queryOne('SELECT * FROM loans WHERE id = ?', [id]);
    if (!loan) {
      return res.status(404).json({ error: 'Kredi bulunamadı.' });
    }

    const nextInstallment = Number(loan.current_installment) + 1;
    if (nextInstallment > Number(loan.total_installments)) {
      return res.status(400).json({ error: 'Bu kredinin tüm taksitleri zaten ödenmiştir.' });
    }

    const isCompleted = nextInstallment === Number(loan.total_installments);

    execute(`
      UPDATE loans SET
        current_installment = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [nextInstallment, isCompleted ? 'completed' : 'active', id]);

    // Ödeme kaydı ekle
    const todayStr = new Date().toISOString().split('T')[0];
    execute(`
      INSERT INTO payment_records (target_type, target_id, target_name, bank_name, amount, payment_date, installment_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'loan',
      loan.id,
      loan.loan_name,
      loan.bank_name,
      loan.monthly_installment,
      todayStr,
      nextInstallment,
      note || `${nextInstallment}. taksit ödemesi yapıldı.`
    ]);

    const updated = queryOne('SELECT * FROM loans WHERE id = ?', [id]);
    return res.json({
      success: true,
      message: `${nextInstallment}. taksit başarıyla ödendi olarak işaretlendi.`,
      loan: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// KREDİ KARTLARI (CREDIT CARDS) ROUTES
// ----------------------------------------------------

apiRouter.get('/financial/credit-cards', authenticateToken, (req: Request, res: Response) => {
  try {
    const creditCards = queryAll('SELECT * FROM credit_cards ORDER BY created_at DESC');
    return res.json({ creditCards });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/financial/credit-cards', authenticateToken, (req: Request, res: Response) => {
  try {
    const {
      bank_name,
      card_name,
      card_last4,
      total_limit,
      current_debt,
      minimum_payment,
      statement_day,
      due_day,
      color_theme,
      notes
    } = req.body;

    if (!bank_name || !card_name || total_limit === undefined || !statement_day || !due_day) {
      return res.status(400).json({ error: 'Lütfen zorunlu kredi kartı alanlarını doldurunuz.' });
    }

    const calculatedMin = minimum_payment !== undefined && minimum_payment !== '' 
      ? Number(minimum_payment) 
      : Math.round(Number(current_debt || 0) * 0.3); // Varsayılan %30 asgari oran

    const result = execute(`
      INSERT INTO credit_cards (
        bank_name, card_name, card_last4, total_limit,
        current_debt, minimum_payment, statement_day, due_day, color_theme, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bank_name.trim(),
      card_name.trim(),
      card_last4 ? card_last4.trim() : null,
      Number(total_limit),
      Number(current_debt || 0),
      calculatedMin,
      Number(statement_day),
      Number(due_day),
      color_theme || 'slate',
      notes ? notes.trim() : null
    ]);

    const created = queryOne('SELECT * FROM credit_cards WHERE id = ?', [result.lastInsertId]);
    return res.status(201).json({ success: true, card: created });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kredi kartı eklenemedi: ' + err.message });
  }
});

apiRouter.put('/financial/credit-cards/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      bank_name,
      card_name,
      card_last4,
      total_limit,
      current_debt,
      minimum_payment,
      statement_day,
      due_day,
      color_theme,
      notes
    } = req.body;

    const existing = queryOne('SELECT * FROM credit_cards WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Kredi kartı bulunamadı.' });
    }

    execute(`
      UPDATE credit_cards SET
        bank_name = ?,
        card_name = ?,
        card_last4 = ?,
        total_limit = ?,
        current_debt = ?,
        minimum_payment = ?,
        statement_day = ?,
        due_day = ?,
        color_theme = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      bank_name?.trim() || existing.bank_name,
      card_name?.trim() || existing.card_name,
      card_last4 !== undefined ? card_last4?.trim() : existing.card_last4,
      Number(total_limit ?? existing.total_limit),
      Number(current_debt ?? existing.current_debt),
      Number(minimum_payment ?? existing.minimum_payment),
      Number(statement_day ?? existing.statement_day),
      Number(due_day ?? existing.due_day),
      color_theme || existing.color_theme,
      notes !== undefined ? notes?.trim() : existing.notes,
      id
    ]);

    const updated = queryOne('SELECT * FROM credit_cards WHERE id = ?', [id]);
    return res.json({ success: true, card: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kredi kartı güncellenemedi: ' + err.message });
  }
});

apiRouter.delete('/financial/credit-cards/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM credit_cards WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Kredi kartı bulunamadı.' });
    }

    execute('DELETE FROM credit_cards WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Kredi kartı başarıyla silindi.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Kredi Kartı Ödeme Yapma
apiRouter.post('/financial/credit-cards/:id/pay', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;
    const card = queryOne('SELECT * FROM credit_cards WHERE id = ?', [id]);
    if (!card) {
      return res.status(404).json({ error: 'Kredi kartı bulunamadı.' });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Geçerli bir ödeme tutarı giriniz.' });
    }

    const newDebt = Math.max(0, Number(card.current_debt) - payAmount);
    const newMin = Math.max(0, Number(card.minimum_payment) - payAmount);

    execute(`
      UPDATE credit_cards SET
        current_debt = ?,
        minimum_payment = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newDebt, newMin, id]);

    const todayStr = new Date().toISOString().split('T')[0];
    execute(`
      INSERT INTO payment_records (target_type, target_id, target_name, bank_name, amount, payment_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'credit_card',
      card.id,
      card.card_name,
      card.bank_name,
      payAmount,
      todayStr,
      note || `₺${payAmount.toLocaleString('tr-TR')} kart ödemesi yapıldı.`
    ]);

    const updated = queryOne('SELECT * FROM credit_cards WHERE id = ?', [id]);
    return res.json({
      success: true,
      message: 'Kart ödemesi başarıyla işlendi.',
      card: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// KREDİLİ MEVDUAT HESABI (KMH / EK HESAP) ROUTES
// ----------------------------------------------------

apiRouter.get('/financial/kmh', authenticateToken, (req: Request, res: Response) => {
  try {
    const kmhAccounts = queryAll('SELECT * FROM kmh_accounts ORDER BY created_at DESC');
    return res.json({ kmhAccounts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/financial/kmh', authenticateToken, (req: Request, res: Response) => {
  try {
    const {
      bank_name,
      account_name,
      total_limit,
      used_amount,
      interest_rate,
      due_day,
      iban,
      notes
    } = req.body;

    if (!bank_name || !account_name || total_limit === undefined) {
      return res.status(400).json({ error: 'Banka adı, hesap adı ve limit alanları zorunludur.' });
    }

    const result = execute(`
      INSERT INTO kmh_accounts (
        bank_name, account_name, total_limit, used_amount,
        interest_rate, due_day, iban, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bank_name.trim(),
      account_name.trim(),
      Number(total_limit),
      Number(used_amount || 0),
      Number(interest_rate || 5.00),
      Number(due_day || 1),
      iban ? iban.trim() : null,
      notes ? notes.trim() : null
    ]);

    const created = queryOne('SELECT * FROM kmh_accounts WHERE id = ?', [result.lastInsertId]);
    return res.status(201).json({ success: true, kmh: created });
  } catch (err: any) {
    return res.status(500).json({ error: 'KMH hesabı eklenemedi: ' + err.message });
  }
});

apiRouter.put('/financial/kmh/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      bank_name,
      account_name,
      total_limit,
      used_amount,
      interest_rate,
      due_day,
      iban,
      notes
    } = req.body;

    const existing = queryOne('SELECT * FROM kmh_accounts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'KMH hesabı bulunamadı.' });
    }

    execute(`
      UPDATE kmh_accounts SET
        bank_name = ?,
        account_name = ?,
        total_limit = ?,
        used_amount = ?,
        interest_rate = ?,
        due_day = ?,
        iban = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      bank_name?.trim() || existing.bank_name,
      account_name?.trim() || existing.account_name,
      Number(total_limit ?? existing.total_limit),
      Number(used_amount ?? existing.used_amount),
      Number(interest_rate ?? existing.interest_rate),
      Number(due_day ?? existing.due_day),
      iban !== undefined ? iban?.trim() : existing.iban,
      notes !== undefined ? notes?.trim() : existing.notes,
      id
    ]);

    const updated = queryOne('SELECT * FROM kmh_accounts WHERE id = ?', [id]);
    return res.json({ success: true, kmh: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'KMH hesabı güncellenemedi: ' + err.message });
  }
});

apiRouter.delete('/financial/kmh/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM kmh_accounts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'KMH hesabı bulunamadı.' });
    }

    execute('DELETE FROM kmh_accounts WHERE id = ?', [id]);
    return res.json({ success: true, message: 'KMH hesabı başarıyla silindi.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// KMH Bakiye / Ödeme İşlemi
apiRouter.post('/financial/kmh/:id/adjust', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { new_used_amount, payment_amount, note } = req.body;
    const kmh = queryOne('SELECT * FROM kmh_accounts WHERE id = ?', [id]);
    if (!kmh) {
      return res.status(404).json({ error: 'KMH hesabı bulunamadı.' });
    }

    let finalUsed = Number(kmh.used_amount);
    let recordAmount = 0;

    if (payment_amount !== undefined) {
      const pay = Number(payment_amount);
      finalUsed = Math.max(0, finalUsed - pay);
      recordAmount = pay;
    } else if (new_used_amount !== undefined) {
      const diff = Number(new_used_amount) - finalUsed;
      finalUsed = Math.max(0, Number(new_used_amount));
      recordAmount = Math.abs(diff);
    }

    execute(`
      UPDATE kmh_accounts SET
        used_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [finalUsed, id]);

    if (recordAmount > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      execute(`
        INSERT INTO payment_records (target_type, target_id, target_name, bank_name, amount, payment_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'kmh',
        kmh.id,
        kmh.account_name,
        kmh.bank_name,
        recordAmount,
        todayStr,
        note || `KMH bakiyesi güncellendi (Yeni bakiye: ₺${finalUsed.toLocaleString('tr-TR')})`
      ]);
    }

    const updated = queryOne('SELECT * FROM kmh_accounts WHERE id = ?', [id]);
    return res.json({ success: true, kmh: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DEFINITIONS & LOOKUPS (TANIM TABANLI BANKALAR)
// ----------------------------------------------------

apiRouter.get('/financial/definitions/banks', authenticateToken, (req: Request, res: Response) => {
  try {
    const banks = queryAll('SELECT * FROM bank_definitions WHERE is_active = 1 ORDER BY name ASC');
    return res.json({ banks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/financial/definitions/banks', authenticateToken, (req: Request, res: Response) => {
  try {
    const { name, code, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Banka adı zorunludur.' });
    }

    const existing = queryOne('SELECT id FROM bank_definitions WHERE name = ?', [name.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Bu banka zaten tanımlı.' });
    }

    const result = execute(
      'INSERT INTO bank_definitions (name, code, color) VALUES (?, ?, ?)',
      [name.trim(), code ? code.trim() : null, color || '#2563eb']
    );

    const created = queryOne('SELECT * FROM bank_definitions WHERE id = ?', [result.lastInsertId]);
    return res.status(201).json({ success: true, bank: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// PAYMENT RECORDS / TRANSACTIONS
// ----------------------------------------------------

apiRouter.get('/financial/payments', authenticateToken, (req: Request, res: Response) => {
  try {
    const payments = queryAll('SELECT * FROM payment_records ORDER BY payment_date DESC, id DESC LIMIT 50');
    return res.json({ payments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/financial/payments/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    execute('DELETE FROM payment_records WHERE id = ?', [id]);
    return res.json({ success: true, message: 'İşlem kaydı silindi.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CREDIT CARD EXPENSES (HARCAMALAR, ETİKETLER, ALT KIRILIMLAR & ANALİTİK)
// ----------------------------------------------------

function parseExpenseRow(row: any) {
  if (!row) return null;
  let parsedTags: string[] = [];
  if (row.tags) {
    try {
      const parsed = JSON.parse(row.tags);
      if (Array.isArray(parsed)) parsedTags = parsed;
      else parsedTags = String(row.tags).split(',').map((t) => t.trim()).filter(Boolean);
    } catch {
      parsedTags = String(row.tags).split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  let parsedSubItems: any[] = [];
  if (row.sub_items) {
    try {
      const parsed = JSON.parse(row.sub_items);
      if (Array.isArray(parsed)) parsedSubItems = parsed;
    } catch {
      parsedSubItems = [];
    }
  }

  return {
    ...row,
    id: Number(row.id),
    card_id: row.card_id ? Number(row.card_id) : null,
    amount: Number(row.amount),
    installment_count: row.installment_count ? Number(row.installment_count) : 1,
    tags: parsedTags,
    sub_items: parsedSubItems
  };
}

apiRouter.get('/financial/expenses', authenticateToken, (req: Request, res: Response) => {
  try {
    const { month, card_id, category, tag, search } = req.query;

    let sql = 'SELECT * FROM card_expenses WHERE 1=1';
    const params: any[] = [];

    if (month && typeof month === 'string') {
      sql += ' AND expense_date LIKE ?';
      params.push(`${month}%`);
    }

    if (card_id) {
      sql += ' AND card_id = ?';
      params.push(Number(card_id));
    }

    if (category && typeof category === 'string' && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (tag && typeof tag === 'string' && tag.trim()) {
      sql += ' AND (tags LIKE ? OR sub_items LIKE ?)';
      params.push(`%${tag.trim()}%`, `%${tag.trim()}%`);
    }

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (description LIKE ? OR notes LIKE ? OR sub_items LIKE ? OR card_name LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY expense_date DESC, id DESC';

    const rows = queryAll(sql, params);
    const expenses = rows.map(parseExpenseRow);
    return res.json({ expenses });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/financial/expenses/analytics', authenticateToken, (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    const targetMonth = (typeof month === 'string' && month.length === 7) 
      ? month 
      : new Date().toISOString().substring(0, 7);

    const rows = queryAll('SELECT * FROM card_expenses WHERE expense_date LIKE ? ORDER BY expense_date ASC', [`${targetMonth}%`]);
    const expenses = rows.map(parseExpenseRow);

    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const expenseCount = expenses.length;

    // Category breakdown
    const categoryMap: { [cat: string]: { amount: number; count: number } } = {};
    for (const exp of expenses) {
      const cat = exp.category || 'Diğer';
      if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
      categoryMap[cat].amount += exp.amount;
      categoryMap[cat].count += 1;
    }

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? Number(((data.amount / totalAmount) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Tag breakdown (hem ana etiketler hem de alt kalem isimleri / etiketleri)
    const tagMap: { [tag: string]: { amount: number; count: number } } = {};
    for (const exp of expenses) {
      const tagsList = exp.tags || [];
      for (const t of tagsList) {
        const cleanTag = t.trim().toLowerCase();
        if (!cleanTag) continue;
        if (!tagMap[cleanTag]) tagMap[cleanTag] = { amount: 0, count: 0 };
        tagMap[cleanTag].amount += exp.amount;
        tagMap[cleanTag].count += 1;
      }
    }

    const tagBreakdown = Object.entries(tagMap)
      .map(([tag, data]) => ({
        tag,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? Number(((data.amount / totalAmount) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Card breakdown
    const cardMap: { [card: string]: { amount: number; count: number } } = {};
    for (const exp of expenses) {
      const card = exp.card_name || 'Bilinmeyen Kart';
      if (!cardMap[card]) cardMap[card] = { amount: 0, count: 0 };
      cardMap[card].amount += exp.amount;
      cardMap[card].count += 1;
    }

    const cardBreakdown = Object.entries(cardMap)
      .map(([card_name, data]) => ({
        card_name,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? Number(((data.amount / totalAmount) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Daily breakdown for charts
    const dailyMap: { [date: string]: number } = {};
    for (const exp of expenses) {
      const date = exp.expense_date;
      dailyMap[date] = (dailyMap[date] || 0) + exp.amount;
    }

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      analytics: {
        month: targetMonth,
        totalAmount,
        expenseCount,
        categoryBreakdown,
        tagBreakdown,
        cardBreakdown,
        dailyBreakdown
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/financial/expenses', authenticateToken, (req: Request, res: Response) => {
  try {
    const {
      card_id,
      card_name,
      amount,
      category,
      tags,
      expense_date,
      description,
      installment_count,
      sub_items,
      notes,
      update_card_debt
    } = req.body;

    if (!card_name || amount === undefined || amount === null || !category || !expense_date) {
      return res.status(400).json({ error: 'Kart adı, tutar, kategori ve harcama tarihi zorunludur.' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ error: 'Geçersiz harcama tutarı.' });
    }

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '');
    const subItemsJson = Array.isArray(sub_items) ? JSON.stringify(sub_items) : '[]';

    const result = execute(
      `INSERT INTO card_expenses (
        card_id, card_name, amount, category, tags, expense_date,
        description, installment_count, sub_items, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card_id ? Number(card_id) : null,
        card_name.trim(),
        numericAmount,
        category.trim(),
        tagsJson,
        expense_date,
        description ? description.trim() : '',
        installment_count ? Number(installment_count) : 1,
        subItemsJson,
        notes ? notes.trim() : ''
      ]
    );

    // If update_card_debt is checked, automatically update current_debt of selected credit card
    if (update_card_debt && card_id) {
      const card = queryOne('SELECT * FROM credit_cards WHERE id = ?', [Number(card_id)]);
      if (card) {
        const newDebt = Number(card.current_debt || 0) + numericAmount;
        execute('UPDATE credit_cards SET current_debt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newDebt, Number(card_id)]);
      }
    }

    const created = queryOne('SELECT * FROM card_expenses WHERE id = ?', [result.lastInsertId]);
    return res.status(201).json({ success: true, expense: parseExpenseRow(created) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/financial/expenses/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM card_expenses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Harcama kaydı bulunamadı.' });
    }

    const {
      card_id,
      card_name,
      amount,
      category,
      tags,
      expense_date,
      description,
      installment_count,
      sub_items,
      notes
    } = req.body;

    const tagsJson = tags !== undefined ? (Array.isArray(tags) ? JSON.stringify(tags) : String(tags)) : existing.tags;
    const subItemsJson = sub_items !== undefined ? (Array.isArray(sub_items) ? JSON.stringify(sub_items) : String(sub_items)) : existing.sub_items;

    execute(
      `UPDATE card_expenses SET
        card_id = ?,
        card_name = ?,
        amount = ?,
        category = ?,
        tags = ?,
        expense_date = ?,
        description = ?,
        installment_count = ?,
        sub_items = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        card_id !== undefined ? (card_id ? Number(card_id) : null) : existing.card_id,
        card_name !== undefined ? card_name.trim() : existing.card_name,
        amount !== undefined ? Number(amount) : existing.amount,
        category !== undefined ? category.trim() : existing.category,
        tagsJson,
        expense_date !== undefined ? expense_date : existing.expense_date,
        description !== undefined ? description.trim() : existing.description,
        installment_count !== undefined ? Number(installment_count) : existing.installment_count,
        subItemsJson,
        notes !== undefined ? notes.trim() : existing.notes,
        id
      ]
    );

    const updated = queryOne('SELECT * FROM card_expenses WHERE id = ?', [id]);
    return res.json({ success: true, expense: parseExpenseRow(updated) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/financial/expenses/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    execute('DELETE FROM card_expenses WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Harcama kaydı başarıyla silindi.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DATABASE EXPORT & IMPORT (BACKUP / RESTORE)
// ----------------------------------------------------

apiRouter.get('/financial/backup/export', authenticateToken, (req: Request, res: Response) => {
  try {
    const users = queryAll('SELECT id, email, name, role, created_at, updated_at FROM users');
    const loans = queryAll('SELECT * FROM loans');
    const creditCards = queryAll('SELECT * FROM credit_cards');
    const kmhAccounts = queryAll('SELECT * FROM kmh_accounts');
    const bankDefinitions = queryAll('SELECT * FROM bank_definitions');
    const paymentRecords = queryAll('SELECT * FROM payment_records');
    const cardExpenses = queryAll('SELECT * FROM card_expenses');
    const appSettings = queryAll('SELECT * FROM app_settings');

    const backupData = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      appName: 'KSADMIN',
      data: {
        users,
        loans,
        creditCards,
        kmhAccounts,
        bankDefinitions,
        paymentRecords,
        cardExpenses,
        appSettings
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ksadmin-backup-${new Date().toISOString().split('T')[0]}.json`);
    return res.json(backupData);
  } catch (err: any) {
    return res.status(500).json({ error: 'Yedek alınamadı: ' + err.message });
  }
});

apiRouter.post('/financial/backup/import', authenticateToken, (req: Request, res: Response) => {
  try {
    const { backupData, mode = 'replace' } = req.body;

    if (!backupData || !backupData.data) {
      return res.status(400).json({ error: 'Geçersiz yedek dosyası formatı. data alanı bulunamadı.' });
    }

    const {
      loans = [],
      creditCards = [],
      kmhAccounts = [],
      bankDefinitions = [],
      paymentRecords = [],
      cardExpenses = [],
      appSettings = []
    } = backupData.data;

    // If replace mode, clear current financial tables (keep admin users intact)
    if (mode === 'replace') {
      execute('DELETE FROM loans');
      execute('DELETE FROM credit_cards');
      execute('DELETE FROM kmh_accounts');
      execute('DELETE FROM payment_records');
      execute('DELETE FROM card_expenses');
      if (bankDefinitions.length > 0) {
        execute('DELETE FROM bank_definitions');
      }
    }

    // Import bank definitions
    if (Array.isArray(bankDefinitions) && bankDefinitions.length > 0) {
      for (const b of bankDefinitions) {
        if (b.name) {
          execute(
            'INSERT OR IGNORE INTO bank_definitions (name, code, color) VALUES (?, ?, ?)',
            [b.name, b.code || null, b.color || '#2563eb']
          );
        }
      }
    }

    // Import loans
    let importedLoansCount = 0;
    if (Array.isArray(loans)) {
      for (const l of loans) {
        execute(
          `INSERT INTO loans (
            bank_name, loan_name, total_amount, monthly_installment, due_day,
            current_installment, total_installments, interest_rate, notes, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            l.bank_name,
            l.loan_name,
            l.total_amount,
            l.monthly_installment,
            l.due_day || 1,
            l.current_installment || 0,
            l.total_installments || 12,
            l.interest_rate || 0,
            l.notes || '',
            l.status || 'active',
            l.created_at || new Date().toISOString(),
            l.updated_at || new Date().toISOString()
          ]
        );
        importedLoansCount++;
      }
    }

    // Import credit cards
    let importedCardsCount = 0;
    if (Array.isArray(creditCards)) {
      for (const c of creditCards) {
        execute(
          `INSERT INTO credit_cards (
            bank_name, card_name, card_last4, total_limit, current_debt,
            minimum_payment, statement_day, due_day, color_theme, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.bank_name,
            c.card_name,
            c.card_last4 || '',
            c.total_limit,
            c.current_debt || 0,
            c.minimum_payment || 0,
            c.statement_day || 1,
            c.due_day || 10,
            c.color_theme || 'emerald',
            c.notes || '',
            c.created_at || new Date().toISOString(),
            c.updated_at || new Date().toISOString()
          ]
        );
        importedCardsCount++;
      }
    }

    // Import KMH accounts
    let importedKmhCount = 0;
    if (Array.isArray(kmhAccounts)) {
      for (const k of kmhAccounts) {
        execute(
          `INSERT INTO kmh_accounts (
            bank_name, account_name, total_limit, used_amount,
            interest_rate, due_day, iban, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            k.bank_name,
            k.account_name,
            k.total_limit,
            k.used_amount || 0,
            k.interest_rate || 0,
            k.due_day || 1,
            k.iban || '',
            k.notes || '',
            k.created_at || new Date().toISOString(),
            k.updated_at || new Date().toISOString()
          ]
        );
        importedKmhCount++;
      }
    }

    // Import payment records
    let importedPaymentsCount = 0;
    if (Array.isArray(paymentRecords)) {
      for (const p of paymentRecords) {
        execute(
          `INSERT INTO payment_records (
            target_type, target_id, target_name, bank_name,
            amount, payment_date, installment_number, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.target_type,
            p.target_id || 0,
            p.target_name,
            p.bank_name,
            p.amount,
            p.payment_date,
            p.installment_number || null,
            p.notes || '',
            p.created_at || new Date().toISOString()
          ]
        );
        importedPaymentsCount++;
      }
    }

    // Import Card Expenses
    let importedExpensesCount = 0;
    if (Array.isArray(cardExpenses)) {
      for (const exp of cardExpenses) {
        const tagsStr = typeof exp.tags === 'string' ? exp.tags : JSON.stringify(exp.tags || []);
        const subItemsStr = typeof exp.sub_items === 'string' ? exp.sub_items : JSON.stringify(exp.sub_items || []);

        execute(
          `INSERT INTO card_expenses (
            card_id, card_name, amount, category, tags, expense_date,
            description, installment_count, sub_items, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            exp.card_id ? Number(exp.card_id) : null,
            exp.card_name,
            exp.amount,
            exp.category,
            tagsStr,
            exp.expense_date,
            exp.description || '',
            exp.installment_count || 1,
            subItemsStr,
            exp.notes || '',
            exp.created_at || new Date().toISOString(),
            exp.updated_at || new Date().toISOString()
          ]
        );
        importedExpensesCount++;
      }
    }

    return res.json({
      success: true,
      message: `Yedek başarıyla yüklendi (${importedLoansCount} kredi, ${importedCardsCount} kredi kartı, ${importedKmhCount} KMH, ${importedExpensesCount} harcama kaydı, ${importedPaymentsCount} ödeme kaydı).`,
      counts: {
        loans: importedLoansCount,
        creditCards: importedCardsCount,
        kmhAccounts: importedKmhCount,
        cardExpenses: importedExpensesCount,
        paymentRecords: importedPaymentsCount
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Yedek içeri aktarılamadı: ' + err.message });
  }
});
