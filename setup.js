app.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE login = $1',
      [usuario]
    );

    if (!result.rows.length)
      return res.status(401).json({ error: 'Usuário inválido' });

    const user = result.rows[0];

    // CORREÇÃO: Usando senha_hash para bater com seu setup.js
    const ok = await bcrypt.compare(senha, user.senha_hash); 
    
    if (!ok) return res.status(401).json({ error: 'Senha errada' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '4h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erro no login' });
  }
});