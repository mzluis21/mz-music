CREATE DATABASE mazzoni_music;
USE mazzoni_music;

-- Correção: Adicionei o nome 'usuarios' e usei 'senha_hash' para bater com o backend
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(50) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS musicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    artista VARCHAR(255) NOT NULL,
    audio_url VARCHAR(500) NOT NULL,
    capa_url VARCHAR(500),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);