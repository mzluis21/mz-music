// server.js (VERSÃO FINAL COM ACESSO PELO CELULAR)
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// PEGAR IP AUTOMATICAMENTE (REDE LOCAL)
const localIP = "192.168.100.14"; // SEU IP local fixo
const JWT_SECRET = 'SEGREDO_MAZZONI';

// ============================================
// 1. CONFIGURAÇÃO DE UPLOAD
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ============================================
// 2. BANCO DE DADOS (XAMPP PADRÃO)
// ============================================
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'mazzoni_music',
    waitForConnections: true,
    connectionLimit: 10
});

// ============================================
// 3. CONFIGURAÇÕES DO SITE
// ============================================
app.use(cors());
app.use(express.json());

// Pastas publicamente acessíveis
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// 4. MIDDLEWARE DE AUTENTICAÇÃO
// ============================================
const autenticar = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Faça login' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// ============================================
// 5. ROTAS
// ============================================

// Login
app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE login = ?', [usuario]);
        if (rows.length === 0) return res.status(401).json({ error: 'Usuário não existe' });

        const valida = await bcrypt.compare(senha, rows[0].senha_hash);
        if (!valida) return res.status(401).json({ error: 'Senha errada' });

        const token = jwt.sign({ id: rows[0].id }, JWT_SECRET, { expiresIn: '4h' });
        res.json({ isOk: true, token });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Listar Músicas
app.get('/musicas', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM musicas ORDER BY criado_em DESC');
        const lista = rows.map(m => ({ ...m, __backendId: m.id.toString() }));
        res.json(lista);
    } catch {
        res.status(500).json({ error: 'Erro ao listar' });
    }
});

// Criar música
app.post('/musicas', autenticar, upload.fields([{ name: 'audio' }, { name: 'capa' }]), async (req, res) => {
    try {
        if (!req.files.audio) return res.status(400).json({ error: 'Sem áudio' });

        const { nome, artista } = req.body;

        const audioUrl = `http://${localIP}:${PORT}/uploads/${req.files.audio[0].filename}`;

        const capaUrl = req.files.capa
            ? `http://${localIP}:${PORT}/uploads/${req.files.capa[0].filename}`
            : 'https://placehold.co/150';

        const [result] = await pool.execute(
            'INSERT INTO musicas (nome, artista, audio_url, capa_url) VALUES (?, ?, ?, ?)',
            [nome, artista, audioUrl, capaUrl]
        );

        res.json({ isOk: true, id: result.insertId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao salvar' });
    }
});

// Deletar música
app.delete('/musicas/:id', autenticar, async (req, res) => {
    try {
        await pool.execute('DELETE FROM musicas WHERE id = ?', [req.params.id]);
        res.json({ isOk: true });
    } catch {
        res.status(500).json({ error: 'Erro ao deletar' });
    }
});

// ============================================
// 6. INICIALIZAÇÃO
// ============================================
app.listen(PORT, "0.0.0.0", async () => {
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE login = ?', ['admin']);
        if (rows.length === 0) {
            const hash = await bcrypt.hash('1234', 10);
            await pool.query('INSERT INTO usuarios (login, senha_hash) VALUES (?, ?)', ['admin', hash]);
            console.log("✅ Admin criado com sucesso");
        }
    } catch (e) {
        console.log("⚠️ Banco de dados não conectado. Verifique o XAMPP.");
    }

    console.log(`🚀 Servidor no PC: http://localhost:${PORT}`);
    console.log(`📱 Acesse pelo celular: http://${localIP}:${PORT}`);
});
