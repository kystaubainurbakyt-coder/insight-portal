const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// --- 1. БАПТАУЛАР ---
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// --- 2. ДЕРЕКТЕР ҚОРЫ (PostgreSQL) ---

// Бұл жерде ешқандай қауіп жоқ, екеуі де жұмыс істейді:
const pool = new Pool(
  process.env.DATABASE_URL 
    ? {
        // РЕНДЕР ҮШІН (Интернетте тұрғанда):
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        // СЕНІҢ КОМПЬЮТЕРІҢ ҮШІН (Localhost):
        user: 'postgres',
        host: 'localhost',
        database: 'makala_db',
        password: '1234',
        port: 5432,
      }
);

// --- 3. MULTER ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- 4. РОУТТАР ---

// Тіркелу
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, fullname, purpose } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            "INSERT INTO users (email, password, fullname, purpose, balance, has_author_rights, is_admin) VALUES ($1, $2, $3, $4, 0, false, false) RETURNING id, email, fullname, balance, has_author_rights, is_admin",
            [email, hashedPassword, fullname, purpose]
        );
        res.json({ user: newUser.rows[0] });
    } catch (err) {
        res.status(400).json({ message: "Тіркелу қатесі: " + err.message });
    }
});

// Кіру
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(400).json({ message: "Пайдаланушы табылмады" });
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(400).json({ message: "Құпия сөз қате" });
        const { password: _, ...userData } = user.rows[0];
        res.json({ user: userData });
    } catch (err) {
        res.status(500).send("Сервер қатесі");
    }
});

// Баланс толтыру
app.post('/api/users/add-balance', async (req, res) => {
    const { user_id, amount } = req.body;
    try {
        const result = await pool.query(
            "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
            [amount, user_id]
        );
        res.json({ balance: result.rows[0].balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Авторлық құқықты сатып алу
app.post('/api/users/buy-rights', async (req, res) => {
    const { user_id } = req.body;
    const price = 5000;
    try {
        const userResult = await pool.query("SELECT balance FROM users WHERE id = $1", [user_id]);
        const currentBalance = userResult.rows[0].balance;
        if (currentBalance < price) {
            return res.status(400).json({ message: "Баланста ақша жеткіліксіз!" });
        }
        const updatedUser = await pool.query(
            "UPDATE users SET balance = balance - $1, has_author_rights = true WHERE id = $2 RETURNING *",
            [price, user_id]
        );
        res.json({ message: "Енді сіз авторсыз!", user: updatedUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- МАҚАЛАЛАР ---

// Жаңа мақала қосу
app.post('/api/articles', upload.single('image'), async (req, res) => {
    try {
        const { title, content, region, author_name, user_id } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const newArticle = await pool.query(
            "INSERT INTO articles (title, content, region, author_name, image_url, user_id, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *",
            [title, content, region, author_name, imageUrl, user_id]
        );
        res.json(newArticle.rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Мақаланы сақтау қатесі" });
    }
});

// Жарияланған мақалаларды алу
app.get('/api/articles', async (req, res) => {
    try {
        const allArticles = await pool.query("SELECT * FROM articles WHERE status = 'approved' ORDER BY id DESC");
        res.json(allArticles.rows);
    } catch (err) {
        res.status(500).send("Деректерді алу мүмкін болмады");
    }
});

// Көрілім санын арттыру
app.put('/api/articles/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE articles SET views = COALESCE(views, 0) + 1 WHERE id = $1", [id]);
        res.json({ message: "Көрілім саналды" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Мақаланы өшіру
app.delete('/api/articles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM articles WHERE id = $1", [id]);
        res.json({ message: "Мақала сәтті өшірілді!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ПІКІРЛЕР ---

// Пікірлерді алу
app.get('/api/articles/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const comments = await pool.query(
            'SELECT * FROM comments WHERE article_id = $1 ORDER BY created_at DESC',
            [id]
        );
        res.json(comments.rows);
    } catch (err) {
        res.status(500).send("Пікірлерді алу қатесі");
    }
});

// Жаңа пікір қосу
app.post('/api/comments', async (req, res) => {
    try {
        const { article_id, user_id, author_name, content } = req.body;
        const newComment = await pool.query(
            'INSERT INTO comments (article_id, user_id, author_name, content) VALUES ($1, $2, $3, $4) RETURNING *',
            [article_id, user_id, author_name, content]
        );
        res.json(newComment.rows[0]);
    } catch (err) {
        res.status(500).send("Пікір қалдыру қатесі");
    }
});

// --- ТАҢДАУЛЫЛАР ---

// Таңдаулыға қосу
app.post('/api/favorites', async (req, res) => {
    const { user_id, article_id } = req.body;
    try {
        await pool.query(
            "INSERT INTO favorites (user_id, article_id) VALUES ($1, $2) ON CONFLICT (user_id, article_id) DO NOTHING",
            [user_id, article_id]
        );
        res.json({ message: "Сақталды" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Таңдаулыларды алу
app.get('/api/favorites/:user_id', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT a.* FROM articles a JOIN favorites f ON a.id = f.article_id WHERE f.user_id = $1",
            [req.params.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ХАБАРЛАМАЛАР ---

// Хабарламаларды алу
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Хабарламаларды оқылды деп белгілеу
app.put('/api/notifications/read/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1',
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- АДМИН ПАНЕЛЬ ---

// Тексерілетін мақалаларды алу
app.get('/api/admin/pending-articles', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM articles WHERE status = 'pending' ORDER BY id DESC"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Мақала статусын өзгерту + хабарлама жіберу
// ✅ ТЕК БІР РЕТ — екі функция біріктірілді
app.put('/api/admin/articles/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, reason, userId } = req.body;
    try {
        await pool.query(
            'UPDATE articles SET status = $1, rejection_reason = $2 WHERE id = $3',
            [status, reason || null, id]
        );
        if (userId) {
            const msg = status === 'approved'
                ? 'Сіздің мақалаңыз сәтті жарияланды!'
                : `Мақалаңыз қабылданбады. Себебі: ${reason}`;
            await pool.query(
                'INSERT INTO notifications (user_id, article_id, message) VALUES ($1, $2, $3)',
                [userId, id, msg]
            );
        }
        res.json({ success: true, message: 'Статус өзгертілді' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- СЕРВЕРДІ ҚОСУ ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Сервер ${PORT} портында қосулы`);
});