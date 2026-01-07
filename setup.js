const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Usando a URL que você me passou
const pool = new Pool({
  connectionString: 'postgresql://mazzoni_user:b3iEUQaCisgWeXa1Bc2SsutNhObasmIs@dpg-d57iar6uk2gs73d2qh60-a.virginia-postgres.render.com/mazzoni_music',
  ssl: { rejectUnauthorized: false }
});

async function init() {
  try {
    console.log("⏳ Criando tabelas no Render...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        login TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS musicas (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        artista TEXT,
        audio_url TEXT NOT NULL,
        capa_url TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const senhaHashed = await bcrypt.hash('admin123', 10);
    await pool.query('INSERT INTO usuarios (login, senha_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING', ['admin', senhaHashed]);
    console.log("✅ Sucesso! Tabelas prontas e usuário 'admin' criado.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro:", err);
    process.exit(1);
  }
}
init();