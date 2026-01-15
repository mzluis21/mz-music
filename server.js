require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

// Configurações
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Permite arquivos grandes
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Conexão Banco de Dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('✅ Banco conectado'))
  .catch(err => console.error('❌ Erro banco:', err.message));

// --- MIDDLEWARE DE SEGURANÇA (O Porteiro) ---
const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Pega o token depois do "Bearer"

  if (!token) return res.status(401).json({ error: 'Acesso negado. Faça login.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sessão inválida/expirada' });
    req.user = user;
    next();
  });
};

// --- ROTAS ---

// 1. ROTA ESPECIAL PARA CRIAR SEU USUÁRIO (Rode uma vez e apague depois se quiser)
app.get('/setup-admin', async (req, res) => {
    try {
        // Cria a tabela se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                login VARCHAR(50) UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL
            );
        `);
        
        // Cria o usuário admin (Senha: mazzoni2026)
        const senhaForte = await bcrypt.hash('mazzoni2026', 10);
        
        // Tenta inserir (se já existir, ignora)
        await pool.query(`
            INSERT INTO usuarios (login, senha_hash) 
            VALUES ('admin', $1) 
            ON CONFLICT (login) DO NOTHING
        `, [senhaForte]);

        res.send("✅ Usuário 'admin' com senha 'mazzoni2026' criado/verificado com sucesso!");
    } catch (e) {
        res.status(500).send("Erro no setup: " + e.message);
    }
});

// 2. LOGIN (Gera o Token)
app.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE login = $1', [usuario]);

    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não existe' });

    const user = result.rows[0];
    if (await bcrypt.compare(senha, user.senha_hash)) {
        // Senha correta: Gerar Token
        const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Senha incorreta' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. LISTAR (Público)
app.get('/musicas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musicas ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. SALVAR (Protegido 🔒)
app.post('/musicas', autenticar, async (req, res) => {
  try {
    const { nome, artista, audio_url, capa_url } = req.body;
    if (!nome || !artista || !audio_url) return res.status(400).json({ error: 'Dados incompletos' });

    const capa = capa_url || 'https://placehold.co/300';
    await pool.query(
      'INSERT INTO musicas (nome, artista, audio_url, capa_url) VALUES ($1, $2, $3, $4)',
      [nome, artista, audio_url, capa]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar' });
  }
});

// 5. DELETAR (Protegido 🔒)
app.delete('/musicas/:id', autenticar, async (req, res) => {
  try {
    await pool.query('DELETE FROM musicas WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar' });
  }
});

app.listen(PORT, () => console.log(`Servidor seguro rodando na porta ${PORT}`));