// ============================================
    // 1. SDK REAL (CONECTA NO BACKEND)
    // ============================================
    // --- DEPOIS (MUDE PARA ESTE) ---
    const ApiDataSdk = {
    baseUrl: 'https://mz-music-backend.onrender.com',
        // Pega o token salvo para provar que é admin
        getHeaders: () => {
            const token = localStorage.getItem('auth_token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            return headers;
        },

        // Carrega as músicas do servidor
        init: async (handler) => {
            try {
                const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`);
                if (!res.ok) throw new Error('Falha ao buscar dados');
                const data = await res.json();
                handler.onDataChanged(data);
                return { isOk: true };
            } catch (e) {
                console.error("Erro de conexão:", e);
                // Se der erro, mostra lista vazia
                handler.onDataChanged([]); 
                return { isOk: false };
            }
        },

        // Envia música nova (COM ARQUIVOS REAIS)
        create: async (formData) => {
            try {
                const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`, {
                    method: 'POST',
                    headers: ApiDataSdk.getHeaders(), // Envia o Token
                    body: formData // Envia os Arquivos
                });

                if (res.status === 401 || res.status === 403) {
                    alert('Sessão expirada. Faça login novamente.');
                    Auth.logout();
                    return { isOk: false };
                }

                if (!res.ok) throw new Error('Erro no upload');
                
                // Recarrega a lista após salvar
                const list = await fetch(`${ApiDataSdk.baseUrl}/musicas`);
                const data = await list.json();
                dataHandler.onDataChanged(data);
                
                return { isOk: true };
            } catch (e) {
                console.error(e);
                return { isOk: false };
            }
        },

        // Deleta música
        delete: async (item) => {
            try {
                const res = await fetch(`${ApiDataSdk.baseUrl}/musicas/${item.__backendId}`, {
                    method: 'DELETE',
                    headers: ApiDataSdk.getHeaders()
                });

                if (res.status === 401) {
                    Auth.logout();
                    return { isOk: false };
                }

                // Recarrega a lista
                const list = await fetch(`${ApiDataSdk.baseUrl}/musicas`);
                const data = await list.json();
                dataHandler.onDataChanged(data);
                
                return { isOk: true };
            } catch (e) { return { isOk: false }; }
        }
    };
    
    // Substitui o SDK antigo pelo novo
    window.dataSdk = ApiDataSdk;

    // ============================================
    // ESTADO E VARIÁVEIS GLOBAIS
    // ============================================
    const appState = {
        playlist: [],
        currentMusicIndex: 0,
        isPlaying: false,
        isLoggedIn: false,
        audioFileData: null,
        coverFileData: null
    };

    const DOM = {
        audioPlayer: document.getElementById('audio-player'),
        btnPlayPause: document.getElementById('btn-play-pause'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        progressBar: document.getElementById('progress-bar'),
        progressFill: document.getElementById('progress-fill'),
        currentTimeEl: document.getElementById('current-time'),
        durationTimeEl: document.getElementById('duration-time'),
        volumeBar: document.getElementById('volume-bar'),
        volumeFill: document.getElementById('volume-fill'),
        playerCover: document.getElementById('player-cover'),
        playerTitle: document.getElementById('player-title'),
        playerArtist: document.getElementById('player-artist'),
        homeMusicGrid: document.getElementById('home-music-grid'),
        musicasGrid: document.getElementById('musicas-grid'),
        adminMusicList: document.getElementById('admin-music-list'),
        loginForm: document.getElementById('login-form'),
        adminForm: document.getElementById('admin-form'),
        emptyMusicas: document.getElementById('empty-musicas'),
        emptyAdmin: document.getElementById('empty-admin'),
        searchInput: document.getElementById('search-input'),
        loginError: document.getElementById('login-error')
    };

    // ============================================
    // UI - RENDERIZAÇÃO
    // ============================================
    const UI = {
        renderAll() {
            const list = appState.playlist;
            
            // Home (Top 6)
            DOM.homeMusicGrid.innerHTML = list.slice(0, 6).map(m => UI.card(m)).join('') || '<p style="color:#aaa">Sem músicas ainda.</p>';
            
            // Todas as Músicas
            DOM.musicasGrid.innerHTML = list.map(m => UI.card(m)).join('');
            
            // Lista Admin
            DOM.adminMusicList.innerHTML = list.map(m => `
                <div class="music-item">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <img src="${m.capa_url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;" onerror="this.src='https://placehold.co/40'">
                        <div>
                            <h4 style="margin:0">${m.nome}</h4>
                            <small style="color:#aaa">${m.artista}</small>
                        </div>
                    </div>
                    <button class="btn-delete" onclick="Admin.delete('${m.__backendId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');

            // Mostra/Esconde mensagens de vazio
            if (list.length === 0) {
                DOM.emptyMusicas.classList.remove('hidden');
                DOM.emptyAdmin.classList.remove('hidden');
            } else {
                DOM.emptyMusicas.classList.add('hidden');
                DOM.emptyAdmin.classList.add('hidden');
            }

            // Atualiza contadores
            document.getElementById('total-songs').textContent = list.length;
            document.getElementById('total-artists').textContent = new Set(list.map(m => m.artista)).size;
        },

        card(m) {
            return `
            <div class="music-card" onclick="Player.play('${m.__backendId}')">
                <img src="${m.capa_url}" class="music-cover" onerror="this.src='https://placehold.co/150'">
                <div class="music-info">
                    <h3>${m.nome}</h3>
                    <p>${m.artista}</p>
                    <button class="btn-play"><i class="fas fa-play"></i> Tocar</button>
                </div>
            </div>`;
        }
    };

    const dataHandler = { onDataChanged: (data) => { appState.playlist = data; UI.renderAll(); } };

    // ============================================
    // AUTH E ADMIN
    // ============================================
    const Auth = {
        async login(u, p) {
            try {
                const res = await fetch(`${ApiDataSdk.baseUrl}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario: u, senha: p })
                });
                const data = await res.json();

                if (res.ok && data.isOk) {
                    localStorage.setItem('auth_token', data.token);
                    appState.isLoggedIn = true;
                    DOM.loginError.classList.add('hidden');
                    window.navigateTo('admin');
                } else {
                    DOM.loginError.textContent = data.error || 'Login inválido';
                    DOM.loginError.classList.remove('hidden');
                }
            } catch (e) {
                DOM.loginError.textContent = 'Erro ao conectar no servidor';
                DOM.loginError.classList.remove('hidden');
            }
        },

        logout() {
            localStorage.removeItem('auth_token');
            appState.isLoggedIn = false;
            window.navigateTo('home');
        },

        check() {
            if (localStorage.getItem('auth_token')) appState.isLoggedIn = true;
        }
    };

    const Admin = {
        async add() {
            const formData = new FormData();
            formData.append('nome', document.getElementById('music-name').value);
            formData.append('artista', document.getElementById('artist-name').value);
            
            if (appState.audioFileData) formData.append('audio', appState.audioFileData);
            if (appState.coverFileData) formData.append('capa', appState.coverFileData);

            // CORREÇÃO: Pegar o botão antes e guardar texto
            const btn = document.querySelector('.btn-submit');
            const conteudoOriginal = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            btn.disabled = true;

            const res = await window.dataSdk.create(formData);

            if (res.isOk) {
                btn.innerHTML = '<i class="fas fa-check"></i> Sucesso!';
                btn.style.background = '#10b981';
                DOM.adminForm.reset();
                appState.audioFileData = null;
                appState.coverFileData = null;
                
                document.getElementById('audio-preview').classList.add('hidden');
                document.getElementById('audio-placeholder').classList.remove('hidden');
                document.getElementById('cover-preview').classList.add('hidden');
                document.getElementById('cover-placeholder').classList.remove('hidden');
            } else {
                btn.innerHTML = '<i class="fas fa-times"></i> Erro';
                btn.style.background = '#ef4444';
            }

            setTimeout(() => {
                btn.innerHTML = conteudoOriginal;
                btn.style.background = '';
                btn.disabled = false;
            }, 2000);
        },

        async delete(id) {
            if (confirm('Tem certeza que deseja excluir esta música?')) {
                await window.dataSdk.delete({ __backendId: id });
            }
        }
    };

    // ============================================
    // PLAYER DE MÚSICA (CORRIGIDO)
    // ============================================
    function formatTime(s) { 
        if (isNaN(s) || !isFinite(s)) return '0:00';
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`; 
    }

    function updateBtn() { 
        if (appState.isPlaying) {
            DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            DOM.btnPlayPause.innerHTML = '<i class="fas fa-play" style="margin-left: 3px;"></i>';
        }
    }

    const Player = {
        play(id) {
            const index = typeof id === 'string' ? appState.playlist.findIndex(m => m.__backendId === id) : id;
            if (index < 0) return;

            appState.currentMusicIndex = index;
            const m = appState.playlist[index];

            DOM.audioPlayer.src = m.audio_url; 
            DOM.playerTitle.textContent = m.nome;
            DOM.playerArtist.textContent = m.artista;
            DOM.playerCover.src = m.capa_url || 'https://placehold.co/60';
            
            DOM.audioPlayer.play()
                .then(() => {
                    appState.isPlaying = true;
                    updateBtn();
                })
                .catch(e => console.log("Clique no play para iniciar"));
        },

        toggle() {
            if (appState.playlist.length === 0) return;
            
            if (DOM.audioPlayer.paused) {
                if (!DOM.audioPlayer.src) Player.play(0);
                else { 
                    DOM.audioPlayer.play(); 
                    appState.isPlaying = true; 
                }
            } else {
                DOM.audioPlayer.pause();
                appState.isPlaying = false;
            }
            updateBtn();
        },

        next() { Player.play((appState.currentMusicIndex + 1) % appState.playlist.length); },
        prev() { Player.play((appState.currentMusicIndex - 1 + appState.playlist.length) % appState.playlist.length); },
        
        playRandom() {
            if (appState.playlist.length === 0) return;
            const r = Math.floor(Math.random() * appState.playlist.length);
            Player.play(r);
            window.navigateTo('musicas');
        },
        
        seek(pct) {
            if (DOM.audioPlayer.duration) DOM.audioPlayer.currentTime = pct * DOM.audioPlayer.duration;
        },

        setVolume(percent) {
            const volume = Math.max(0, Math.min(1, percent));
            DOM.audioPlayer.volume = volume;
            if (DOM.volumeFill) DOM.volumeFill.style.width = (volume * 100) + '%';
        }
    };

    // ============================================
    // SETUP E EVENTOS
    // ============================================
    function setupEvents() {
        // Player Controls
        DOM.btnPlayPause.onclick = Player.toggle;
        DOM.btnNext.onclick = Player.next;
        DOM.btnPrev.onclick = Player.prev;
        
        // Time Update
        DOM.audioPlayer.ontimeupdate = () => {
            const pct = (DOM.audioPlayer.currentTime / DOM.audioPlayer.duration) * 100;
            DOM.progressFill.style.width = pct + '%';
            DOM.currentTimeEl.textContent = formatTime(DOM.audioPlayer.currentTime);
            
            // GARANTIA EXTRA: Atualiza tempo total se estiver zerado
            if (DOM.durationTimeEl.textContent === '0:00' && DOM.audioPlayer.duration > 0) {
                DOM.durationTimeEl.textContent = formatTime(DOM.audioPlayer.duration);
            }
        };

        // EVENTO NOVO: Tempo Total
        DOM.audioPlayer.onloadedmetadata = () => {
            DOM.durationTimeEl.textContent = formatTime(DOM.audioPlayer.duration);
        };
        
        // Seek Bar Click
        DOM.progressBar.onclick = (e) => {
            const rect = DOM.progressBar.getBoundingClientRect();
            Player.seek((e.clientX - rect.left) / rect.width);
        };

        // --- VOLUME CONTROL ---
        if (DOM.volumeBar) {
            DOM.volumeBar.onclick = (e) => {
                const rect = DOM.volumeBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                Player.setVolume(percent);
            };
        }

        // Mute Toggle
        const volIcon = document.querySelector('.volume-control i');
        if (volIcon) {
            volIcon.onclick = () => {
                if (DOM.audioPlayer.volume > 0) {
                    Player.setVolume(0);
                    volIcon.className = 'fas fa-volume-mute';
                } else {
                    Player.setVolume(1);
                    volIcon.className = 'fas fa-volume-up';
                }
            };
        }

        // Forms
        DOM.loginForm.onsubmit = (e) => { 
            e.preventDefault(); 
            Auth.login(document.getElementById('username').value, document.getElementById('password').value); 
        };
        
        DOM.adminForm.onsubmit = (e) => { 
            e.preventDefault(); 
            Admin.add(); 
        };

        // Fallback imagem capa
        DOM.playerCover.onerror = () => { DOM.playerCover.src = 'https://placehold.co/60'; };

        // Arquivos
        document.getElementById('audio-upload-area').onclick = (e) => { if (!e.target.closest('.btn-remove')) document.getElementById('audio-file').click(); };
        document.getElementById('cover-upload-area').onclick = (e) => { if (!e.target.closest('.btn-remove')) document.getElementById('cover-file').click(); };

        document.getElementById('audio-file').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                appState.audioFileData = file;
                document.getElementById('audio-filename').textContent = file.name;
                document.getElementById('audio-size').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
                document.getElementById('audio-placeholder').classList.add('hidden');
                document.getElementById('audio-preview').classList.remove('hidden');
            }
        };

        document.getElementById('cover-file').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                appState.coverFileData = file;
                const reader = new FileReader();
                reader.onload = (ev) => document.getElementById('cover-preview-img').src = ev.target.result;
                reader.readAsDataURL(file);
                document.getElementById('cover-filename').textContent = file.name;
                document.getElementById('cover-placeholder').classList.add('hidden');
                document.getElementById('cover-preview').classList.remove('hidden');
            }
        };
        
        document.getElementById('remove-audio').onclick = (e) => {
            e.stopPropagation();
            appState.audioFileData = null;
            document.getElementById('audio-file').value = '';
            document.getElementById('audio-preview').classList.add('hidden');
            document.getElementById('audio-placeholder').classList.remove('hidden');
        };
        
        document.getElementById('remove-cover').onclick = (e) => {
            e.stopPropagation();
            appState.coverFileData = null;
            document.getElementById('cover-file').value = '';
            document.getElementById('cover-preview').classList.add('hidden');
            document.getElementById('cover-placeholder').classList.remove('hidden');
        };

        // Navegação
        document.querySelectorAll('nav a, .mobile-menu a').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                window.navigateTo(e.target.dataset.page);
            };
        });
        
        document.getElementById('menu-toggle').onclick = () => {
             document.getElementById('mobile-menu').classList.toggle('active');
        };
        
        document.getElementById('btn-logout').onclick = Auth.logout;
        document.getElementById('search-input').oninput = UI.renderMusicasPage;
    }

    // Funções Globais
    window.navigateTo = (page) => {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById(`page-${page}`).classList.remove('hidden');
        document.getElementById('mobile-menu').classList.remove('active');
        window.scrollTo(0, 0);
    };
    window.Player = Player;
    window.Admin = Admin;
    window.playRandomMusic = Player.playRandom;

    // INICIAR
    document.addEventListener('DOMContentLoaded', async () => {
        setupEvents();
        Auth.check();
        await window.dataSdk.init(dataHandler);
    });

    