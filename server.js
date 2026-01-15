require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chave_mestra_secreta';

// ============================================
// CONFIGURAÇÕES INICIAIS (CORREÇÃO DE LIMITE)
// ============================================
app.use(cors());

// AQUI ESTÁ A CORREÇÃO MÁGICA PARA O TRAVAMENTO
// Permite JSONs gigantes (Base64 de áudio/imagem)
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// ROTA DE LOGIN
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

    // Verifica a senha
    const ok = await bcrypt.compare(senha, user.senha_hash); 
    
    if (!ok) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '4h' });
    res.json({ token });
  } catch (err) {
    console.error('Erro no Login:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Listar músicas (Público)
app.get('/musicas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musicas ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar músicas' });
  }
});

// ========================================================
// ROTA DE CRIAR MÚSICA (ATUALIZADA PARA BASE64/LINKS)
// ========================================================
// Removemos o 'multer' daqui porque o frontend agora manda JSON
app.post('/musicas', autenticar, async (req, res) => {
  try {
    // Recebe os dados direto do corpo da requisição (JSON)
    // audio_url e capa_url podem ser Links OU Base64 gigante
    const { nome, artista, audio_url, capa_url } = req.body;

    // Validação simples
    if (!nome || !artista || !audio_url) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando (Nome, Artista ou Áudio)' });
    }

    // Define uma capa padrão se não vier nada
    const capaFinal = capa_url || 'https://placehold.co/300';

    await pool.query(
      'INSERT INTO musicas (nome, artista, audio_url, capa_url) VALUES ($1, $2, $3, $4)',
      [nome, artista, audio_url, capaFinal]
    );

    console.log(`✅ Música "${nome}" salva com sucesso!`);
    res.json({ isOk: true });

  } catch (err) {
    console.error("Erro ao salvar música:", err.message);
    res.status(500).json({ error: 'Erro ao salvar música no banco de dados' });
  }
});

// Deletar música (Protegido)
app.delete('/musicas/:id', autenticar, async (req, res) => {
  try {
    await pool.query('DELETE FROM musicas WHERE id = $1', [req.params.id]);
    res.json({ isOk: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar' });
  }
});

// Inicialização
app.listen(PORT, () => {
  console.log(`🚀 Mazzoni Music rodando na porta ${PORT}`);
});