const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Usando as configurações do seu .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetAdmin() {
  try {
    console.log("⏳ Resetando senha do admin no banco do Render...");
    const hash = await bcrypt.hash('admin123', 10);
    
    // Este comando atualiza a senha se o admin já existir ou cria se não existir
    await pool.query(`
      INSERT INTO usuarios (login, senha_hash) 
      VALUES ($1, $2) 
      ON CONFLICT (login) 
      DO UPDATE SET senha_hash = EXCLUDED.senha_hash
    `, ['admin', hash]);
    
    console.log("✅ Sucesso! Senha do 'admin' agora é 'admin123'");
  } catch (err) {
    console.error("❌ Erro ao resetar:", err.message);
  } finally {
    await pool.end();
  }
}

resetAdmin();