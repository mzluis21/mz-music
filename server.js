require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// ============================================
// BANCO POSTGRES (RENDER)
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Teste de conexão
pool.connect()
  .then(() => console.log('✅ Banco conectado'))
  .catch(err => console.error('❌ Erro no banco:', err.message));

// ============================================
// UPLOAD
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ============================================
// CONFIG
// ============================================
app.use(cors()); // ← apenas uma vez
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// AUTH
// ============================================
const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Faça login' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// ============================================
// ROTAS
// ============================================

// Login
app.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE login = $1',
      [usuario]
    );

    if (!result.rows.length)
      return res.status(401).json({ error: 'Usuário inválido' });

    const user = result.rows[0];
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ error: 'Senha errada' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '4h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erro no login' });
  }
});

app.get('/teste', (req, res) => {
  res.json({ ok: true });
});


// Listar músicas
app.get('/musicas', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM musicas ORDER BY criado_em DESC'
  );
  res.json(result.rows);
});

// Criar música
app.post(
  '/musicas',
  autenticar,
  upload.fields([{ name: 'audio' }, { name: 'capa' }]),
  async (req, res) => {
    if (!req.files.audio)
      return res.status(400).json({ error: 'Áudio obrigatório' });

    const { nome, artista } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const audioUrl = `${baseUrl}/uploads/${req.files.audio[0].filename}`;
    const capaUrl = req.files.capa
      ? `${baseUrl}/uploads/${req.files.capa[0].filename}`
      : 'https://placehold.co/150';

    await pool.query(
      'INSERT INTO musicas (nome, artista, audio_url, capa_url) VALUES ($1,$2,$3,$4)',
      [nome, artista, audioUrl, capaUrl]
    );

    res.json({ isOk: true });
  }
);

// Deletar música
app.delete('/musicas/:id', autenticar, async (req, res) => {
  await pool.query('DELETE FROM musicas WHERE id = $1', [req.params.id]);
  res.json({ isOk: true });
});

// ============================================
// START
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Online na porta ${PORT}`);
});

