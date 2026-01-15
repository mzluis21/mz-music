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
const JWT_SECRET = process.env.JWT_SECRET || 'chave_mestra_secreta';

// ============================================
// CONFIGURAÇÕES INICIAIS
// ============================================
app.use(cors()); 
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// CONEXÃO COM O BANCO (RENDER)
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('✅ Banco conectado com sucesso'))
  .catch(err => console.error('❌ Erro de conexão no banco:', err.message));

// ============================================
// CONFIGURAÇÃO DE UPLOAD
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
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================
const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Faça login primeiro' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
};

// ============================================
// ROTAS DO SISTEMA
// ============================================

// ROTA DE LOGIN (Única e Corrigida)
app.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE login = $1',
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    // CORREÇÃO: Usando 'senha_hash' para bater com seu banco (Image_5262a6.png)
    // Isso evita o erro "Illegal arguments: string, undefined"
    const ok = await bcrypt.compare(senha, user.senha_hash); 
    
    if (!ok) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '4h' });
    res.json({ token });
  } catch (err) {
    console.error('Erro no Login:', err.message); // Log detalhado para ver no Render
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Listar músicas (Público)
app.get('/musicas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musicas ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar músicas' });
  }
});

// Criar música (Protegido)
app.post('/musicas', autenticar, upload.fields([{ name: 'audio' }, { name: 'capa' }]), async (req, res) => {
  try {
    if (!req.files.audio) return res.status(400).json({ error: 'Arquivo de áudio é obrigatório' });

    const { nome, artista } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const audioUrl = `${baseUrl}/uploads/${req.files.audio[0].filename}`;
    const capaUrl = req.files.capa 
      ? `${baseUrl}/uploads/${req.files.capa[0].filename}` 
      : 'https://placehold.co/300';

    await pool.query(
      'INSERT INTO musicas (nome, artista, audio_url, capa_url) VALUES ($1, $2, $3, $4)',
      [nome, artista, audioUrl, capaUrl]
    );

    res.json({ isOk: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar música' });
  }
});

// Deletar música (Protegido)
app.delete('/musicas/:id', autenticar, async (req, res) => {
  try {
    await pool.query('DELETE FROM musicas WHERE id = $1', [req.params.id]);
    res.json({ isOk: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar' });
  }
});

// Inicialização
app.listen(PORT, () => {
  console.log(`🚀 Mazzoni Music rodando na porta ${PORT}`);
});