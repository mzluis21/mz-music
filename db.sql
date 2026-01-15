-- 1. Limpa tudo
DROP TABLE IF EXISTS musicas;
DROP TABLE IF EXISTS usuarios;


-- 2. Cria a tabela de usuários com o nome de coluna CORRETO para o seu código
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  login VARCHAR(50) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL
);

-- 3. Cria a tabela de músicas
CREATE TABLE musicas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  artista VARCHAR(255) NOT NULL,
  audio_url TEXT NOT NULL,
  capa_url TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Insere o admin (usando senha_hash)
INSERT INTO usuarios (login, senha_hash) 
VALUES ('admin', '$2b$10$76YmP1N.R1.f7.G.tMvYueP/3mI0ZlGvD5.N7K0Z1p2O3m4n5o6p7');

SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios';

SELECT * FROM usuarios;