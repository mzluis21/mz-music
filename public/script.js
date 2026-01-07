// ============================================
// 1. SDK REAL (CONECTA NO BACKEND)
// ============================================
const ApiDataSdk = {
    baseUrl: 'https://mz-music-backend.onrender.com',

    // Pega o token para rotas protegidas
    getHeaders: () => {
        const token = localStorage.getItem('token'); // Padronizado com seu teste
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
            handler.onDataChanged([]); 
            return { isOk: false };
        }
    },

    // Envia música nova
    create: async (formData) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`, {
                method: 'POST',
                headers: ApiDataSdk.getHeaders(),
                body: formData 
            });

            if (res.status === 401 || res.status === 403) {
                alert('Sessão expirada. Faça login novamente.');
                Auth.logout();
                return { isOk: false };
            }

            if (!res.ok) throw new Error('Erro no upload');
            
            // Recarrega a lista
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
    delete: async (id) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas/${id}`, {
                method: 'DELETE',
                headers: ApiDataSdk.getHeaders()
            });

            if (res.status === 401) {
                Auth.logout();
                return { isOk: false };
            }

            const list = await fetch(`${ApiDataSdk.baseUrl}/musicas`);
            const data = await list.json();
            dataHandler.onDataChanged(data);
            
            return { isOk: true };
        } catch (e) { return { isOk: false }; }
    }
};

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
        
        // Home
        DOM.homeMusicGrid.innerHTML = list.slice(0, 6).map(m => UI.card(m)).join('') || '<p style="color:#aaa">Sem músicas ainda.</p>';
        
        // Músicas
        DOM.musicasGrid.innerHTML = list.map(m => UI.card(m)).join('');
        
        // Lista Admin (CORRIGIDO: url_capa e id)
        DOM.adminMusicList.innerHTML = list.map(m => `
            <div class="music-item flex items-center justify-between p-2 bg-black/20 mb-2 rounded">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${m.url_capa}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;" onerror="this.src='https://placehold.co/40'">
                    <div>
                        <h4 style="margin:0">${m.nome}</h4>
                        <small style="color:#aaa">${m.artista}</small>
                    </div>
                </div>
                <button class="text-red-500 p-2" onclick="Admin.delete('${m.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        if (list.length === 0) {
            DOM.emptyMusicas?.classList.remove('hidden');
            DOM.emptyAdmin?.classList.remove('hidden');
        } else {
            DOM.emptyMusicas?.classList.add('hidden');
            DOM.emptyAdmin?.classList.add('hidden');
        }

        document.getElementById('total-songs').textContent = list.length;
        document.getElementById('total-artists').textContent = new Set(list.map(m => m.artista)).size;
    },

    card(m) {
        // CORRIGIDO: url_capa e id
        return `
        <div class="music-card cursor-pointer bg-zinc-900 p-4 rounded-xl hover:bg-zinc-800 transition" onclick="Player.play('${m.id}')">
            <img src="${m.url_capa}" class="w-full aspect-square object-cover rounded-lg mb-3" onerror="this.src='https://placehold.co/150'">
            <div class="music-info">
                <h3 class="font-bold truncate">${m.nome}</h3>
                <p class="text-gray-400 text-sm mb-3">${m.artista}</p>
                <button class="bg-green-500 text-black px-4 py-1 rounded-full text-xs font-bold"><i class="fas fa-play"></i> Tocar</button>
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

            if (res.ok) {
                localStorage.setItem('token', data.token);
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
        localStorage.removeItem('token');
        appState.isLoggedIn = false;
        window.navigateTo('home');
    },

    check() {
        if (localStorage.getItem('token')) appState.isLoggedIn = true;
    }
};

const Admin = {
    async add() {
        const formData = new FormData();
        formData.append('nome', document.getElementById('music-name').value);
        formData.append('artista', document.getElementById('artist-name').value);
        
        if (appState.audioFileData) formData.append('audio', appState.audioFileData);
        if (appState.coverFileData) formData.append('capa', appState.coverFileData);

        const btn = document.querySelector('.btn-submit');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;

        const res = await window.dataSdk.create(formData);

        if (res.isOk) {
            btn.innerHTML = '<i class="fas fa-check"></i> Sucesso!';
            DOM.adminForm.reset();
            appState.audioFileData = null;
            appState.coverFileData = null;
            document.getElementById('audio-preview').classList.add('hidden');
            document.getElementById('audio-placeholder').classList.remove('hidden');
            document.getElementById('cover-preview-img').classList.add('hidden');
            document.getElementById('cover-placeholder').classList.remove('hidden');
        } else {
            btn.innerHTML = '<i class="fas fa-times"></i> Erro';
        }

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    },

    async delete(id) {
        if (confirm('Tem certeza que deseja excluir esta música?')) {
            await window.dataSdk.delete(id);
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
    DOM.btnPlayPause.innerHTML = appState.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play" style="margin-left: 3px;"></i>';
}

const Player = {
    play(id) {
        // CORRIGIDO: id em vez de __backendId
        const index = typeof id === 'string' ? appState.playlist.findIndex(m => m.id === id) : id;
        if (index < 0) return;

        appState.currentMusicIndex = index;
        const m = appState.playlist[index];

        // CORRIGIDO: url_audio e url_capa
        DOM.audioPlayer.src = m.url_audio; 
        DOM.playerTitle.textContent = m.nome;
        DOM.playerArtist.textContent = m.artista;
        DOM.playerCover.src = m.url_capa || 'https://placehold.co/60';
        
        DOM.audioPlayer.play()
            .then(() => {
                appState.isPlaying = true;
                updateBtn();
            })
            .catch(e => console.log("Erro ao tocar áudio"));
    },

    toggle() {
        if (appState.playlist.length === 0) return;
        if (DOM.audioPlayer.paused) {
            if (!DOM.audioPlayer.src) Player.play(0);
            else { DOM.audioPlayer.play(); appState.isPlaying = true; }
        } else {
            DOM.audioPlayer.pause();
            appState.isPlaying = false;
        }
        updateBtn();
    },

    next() { Player.play((appState.currentMusicIndex + 1) % appState.playlist.length); },
    prev() { Player.play((appState.currentMusicIndex - 1 + appState.playlist.length) % appState.playlist.length); },
    
    seek(pct) {
        if (DOM.audioPlayer.duration) DOM.audioPlayer.currentTime = pct * DOM.audioPlayer.duration;
    },

    setVolume(percent) {
        const v = Math.max(0, Math.min(1, percent));
        DOM.audioPlayer.volume = v;
        if (DOM.volumeFill) DOM.volumeFill.style.width = (v * 100) + '%';
    }
};

// ============================================
// SETUP E EVENTOS
// ============================================
function setupEvents() {
    DOM.btnPlayPause.onclick = Player.toggle;
    DOM.btnNext.onclick = Player.next;
    DOM.btnPrev.onclick = Player.prev;
    
    DOM.audioPlayer.ontimeupdate = () => {
        const pct = (DOM.audioPlayer.currentTime / DOM.audioPlayer.duration) * 100;
        DOM.progressFill.style.width = pct + '%';
        DOM.currentTimeEl.textContent = formatTime(DOM.audioPlayer.currentTime);
        if (DOM.durationTimeEl.textContent === '0:00' && DOM.audioPlayer.duration > 0) {
            DOM.durationTimeEl.textContent = formatTime(DOM.audioPlayer.duration);
        }
    };

    DOM.audioPlayer.onloadedmetadata = () => {
        DOM.durationTimeEl.textContent = formatTime(DOM.audioPlayer.duration);
    };
    
    DOM.progressBar.onclick = (e) => {
        const rect = DOM.progressBar.getBoundingClientRect();
        Player.seek((e.clientX - rect.left) / rect.width);
    };

    if (DOM.volumeBar) {
        DOM.volumeBar.onclick = (e) => {
            const rect = DOM.volumeBar.getBoundingClientRect();
            Player.setVolume((e.clientX - rect.left) / rect.width);
        };
    }

    DOM.loginForm.onsubmit = (e) => { 
        e.preventDefault(); 
        Auth.login(document.getElementById('username').value, document.getElementById('password').value); 
    };
    
    DOM.adminForm.onsubmit = (e) => { 
        e.preventDefault(); 
        Admin.add(); 
    };

    // Uploads
    document.getElementById('audio-upload-area').onclick = () => document.getElementById('audio-file').click();
    document.getElementById('cover-upload-area').onclick = () => document.getElementById('cover-file').click();

    document.getElementById('audio-file').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            appState.audioFileData = file;
            document.getElementById('audio-placeholder').classList.add('hidden');
            document.getElementById('audio-preview').classList.remove('hidden');
        }
    };

    document.getElementById('cover-file').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            appState.coverFileData = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('cover-preview-img').src = ev.target.result;
                document.getElementById('cover-preview-img').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
            document.getElementById('cover-placeholder').classList.add('hidden');
        }
    };

    document.querySelectorAll('[data-page]').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            window.navigateTo(link.dataset.page);
        };
    });

    document.getElementById('menu-toggle').onclick = () => document.getElementById('mobile-menu').classList.toggle('active');
    document.getElementById('btn-logout').onclick = Auth.logout;
}

window.navigateTo = (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');
    window.scrollTo(0, 0);
};

window.playRandomMusic = () => {
    if (appState.playlist.length > 0) {
        const r = Math.floor(Math.random() * appState.playlist.length);
        Player.play(r);
        window.navigateTo('musicas');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    setupEvents();
    Auth.check();
    await window.dataSdk.init(dataHandler);
});