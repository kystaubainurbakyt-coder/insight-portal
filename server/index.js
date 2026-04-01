const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const path = require('path');
const fs = require('fs');

const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- 1. БАПТАУЛАР ---
// --- 1. БАПТАУЛАР ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://insight-frontend.onrender.com',
  'https://kystaubainurbakyt-coder.github.io',
  'https://kystaubainurbakyt.github.io'
];

const isAllowedDynamicOrigin = (origin) =>
  /https:\/\/.*\.github\.io$/.test(origin) ||
  /https:\/\/.*\.vercel\.app$/.test(origin);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Полезно для запуска сервер-сервер
    if (allowedOrigins.includes(origin) || isAllowedDynamicOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

const runtimeAllowedOrigins = new Set([
  ...allowedOrigins,
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
]);

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const isDynamicAllowedOrigin = requestOrigin && isAllowedDynamicOrigin(requestOrigin);

  if (requestOrigin && (runtimeAllowedOrigins.has(requestOrigin) || isDynamicAllowedOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));
// ... қалған код

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

pool
  .query('SELECT NOW()')
  .then(() => console.log('PostgreSQL connection OK'))
  .catch((err) => console.error('PostgreSQL connection error:', err));

const ensureAdminUser = async () => {
  try {
    const adminEmail = 'admin@gmail.com';
    const adminPassword = '123123';

    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await pool.query(
      `INSERT INTO users (email, password, fullname, purpose, balance, has_author_rights, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminEmail, hashedPassword, 'Administrator', 'admin', 0, true, true]
    );

    console.log('Admin user created: admin@gmail.com');
  } catch (err) {
    console.error('Admin seed error:', err);
  }
};

ensureAdminUser();

const ensureFavoritesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        article_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_article_unique
      ON favorites (user_id, article_id)
    `);
  } catch (err) {
    console.error('Favorites table setup error:', err);
  }
};

ensureFavoritesTable();

// --- 3. MULTER ---
const upload = multer({ storage: multer.memoryStorage() });

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
        let imageUrl = null;

        if (req.file) {
            imageUrl = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'insight-portal',
                        resource_type: 'image'
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result.secure_url);
                    }
                );

                uploadStream.end(req.file.buffer);
            });
        }

        const newArticle = await pool.query(
            "INSERT INTO articles (title, content, region, author_name, image_url, user_id, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *",
            [title, content, region, author_name, imageUrl, user_id]
        );
        res.json(newArticle.rows[0]);
    } catch (err) {
        console.error('Create article error:', err);
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
    if (!user_id || !article_id) {
        return res.status(400).json({ error: 'user_id and article_id are required' });
    }
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

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Сервер ${PORT} портында қосулы`);
    });
}

module.exports = app;
