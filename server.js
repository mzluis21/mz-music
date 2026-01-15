require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');
const multer = require('multer'); // <--- IMPORTANTE: Importando o Multer

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

// --- CONFIGURAÇÃO DO MULTER (UPLOAD) ---
// Usamos memoryStorage para pegar o arquivo na memória RAM antes de salvar
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB por arquivo
});

// Configurações do Express
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Conexão Banco de Dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('✅ Banco conectado'))
  .catch(err => console.error('❌ Erro banco:', err.message));

// --- HELPER: CONVERTER BUFFER PARA BASE64 ---
// Isso transforma o arquivo binário em texto para salvar no seu banco atual
const bufferToDataURI = (buffer, mimetype) => {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// --- MIDDLEWARE DE SEGURANÇA ---
const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: 'Acesso negado. Faça login.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sessão inválida/expirada' });
    req.user = user;
    next();
  });
};

// --- ROTAS ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            res.send(`<h1>🎵 Backend Online!</h1><p>Use o Frontend para acessar.</p>`);
        }
    });
});

app.get('/setup-admin', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                login VARCHAR(50) UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL
            );
        `);
        // Cria tabela de músicas se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS musicas (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                artista TEXT NOT NULL,
                audio_url TEXT NOT NULL,
                capa_url TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        const senhaForte = await bcrypt.hash('mazzoni2026', 10);
        await pool.query(`
            INSERT INTO usuarios (login, senha_hash) 
            VALUES ('admin', $1) 
            ON CONFLICT (login) DO NOTHING
        `, [senhaForte]);
        res.send("✅ Admin e Tabelas configurados!");
    } catch (e) {
        res.status(500).send("Erro no setup: " + e.message);
    }
});

app.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE login = $1', [usuario]);

    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não existe' });

    const user = result.rows[0];
    if (await bcrypt.compare(senha, user.senha_hash)) {
        const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Senha incorreta' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/musicas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musicas ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROTA DE POST ATUALIZADA (O PULO DO GATO 🐈) ---
// upload.fields diz ao backend para esperar arquivos específicos
app.post('/musicas', autenticar, upload.fields([
    { name: 'audio_file', maxCount: 1 }, 
    { name: 'cover_file', maxCount: 1 }
]), async (req, res) => {
  try {
    // 1. Pegamos os dados de texto
    const { nome, artista, audio_url, capa_url } = req.body;

    // 2. Processamos o Áudio
    let finalAudioUrl = audio_url; // Pode ser link do YouTube/Spotify se o usuario mandou texto
    
    // Se o usuário mandou um arquivo de áudio, convertemos ele aqui no servidor
    if (req.files && req.files['audio_file']) {
        const file = req.files['audio_file'][0];
        // Converte buffer -> string base64
        finalAudioUrl = bufferToDataURI(file.buffer, file.mimetype);
    }

    // 3. Processamos a Capa
    let finalCapaUrl = capa_url || 'https://via.placeholder.com/300';
    
    if (req.files && req.files['cover_file']) {
        const file = req.files['cover_file'][0];
        finalCapaUrl = bufferToDataURI(file.buffer, file.mimetype);
    }

    // Validação
    if (!nome || !artista || !finalAudioUrl) {
        return res.status(400).json({ error: 'Nome, Artista e Áudio são obrigatórios.' });
    }

    // 4. Salva no Banco
    await pool.query(
      'INSERT INTO musicas (nome, artista, audio_url, capa_url) VALUES ($1, $2, $3, $4)',
      [nome, artista, finalAudioUrl, finalCapaUrl]
    );

    res.json({ success: true, message: "Música salva com sucesso!" });

  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).json({ error: 'Erro ao processar upload. O arquivo pode ser muito grande para o banco.' });
  }
});

app.delete('/musicas/:id', autenticar, async (req, res) => {
  try {
    await pool.query('DELETE FROM musicas WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar' });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));