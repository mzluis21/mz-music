const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuração para o Banco do Render com SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function reset() {
  try {
    console.log("⏳ Iniciando reset do admin no Render...");
    
    // Criando o hash da senha 'admin123'
    const hash = await bcrypt.hash('admin123', 10);
    
    // 1. Garante que a tabela tem a coluna senha_hash
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        login VARCHAR(50) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL
      );
    `);

    // 2. Insere ou atualiza o admin
    await pool.query(`
      INSERT INTO usuarios (login, senha_hash) 
      VALUES ($1, $2) 
      ON CONFLICT (login) 
      DO UPDATE SET senha_hash = EXCLUDED.senha_hash;
    `, ['admin', hash]);

    console.log("✅ Admin configurado com sucesso!");
    console.log("👤 Usuário: admin");
    console.log("🔑 Senha: admin123");

  } catch (err) {
    console.error("❌ Erro no reset.js:", err.message);
  } finally {
    await pool.end();
  }
}

reset();