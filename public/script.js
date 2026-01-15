// CONFIGURAÇÃO DA API
const ApiDataSdk = {
    baseUrl: 'https://mz-music-backend.onrender.com',

    formatUrl: (path) => {
        if (!path) return 'https://placehold.co/300';
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${ApiDataSdk.baseUrl}${cleanPath}`;
    },

    getHeaders: () => ({
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    })
};

// ESTADO GLOBAL
const appState = {
    playlist: [],
    filteredPlaylist: [],
    currentMusicIndex: 0,
    isPlaying: false
};

// MAPEAMENTO DO DOM (Ajustado para o seu HTML específico)
const DOM = {
    audioPlayer: document.getElementById('audio-player'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    progressBar: document.getElementById('progress-bar'),
    progressFill: document.getElementById('progress-fill'),
    currentTimeEl: document.getElementById('current-time'),
    durationTimeEl: document.getElementById('duration-time'),
    playerCover: document.getElementById('player-cover'),
    playerTitle: document.getElementById('player-title'),
    playerArtist: document.getElementById('player-artist'),
    homeMusicGrid: document.getElementById('home-music-grid'),
    musicasGrid: document.getElementById('musicas-grid'),
    searchInput: document.getElementById('search-input'),
    loginForm: document.getElementById('login-form'),
    adminForm: document.getElementById('admin-form'),
    adminMusicList: document.getElementById('admin-music-list')
};

// LÓGICA DE INTERFACE
const UI = {
    renderAll() {
        const list = (appState.filteredPlaylist.length > 0 || (DOM.searchInput && DOM.searchInput.value)) 
                     ? appState.filteredPlaylist 
                     : appState.playlist;

        if (DOM.homeMusicGrid) DOM.homeMusicGrid.innerHTML = appState.playlist.slice(0, 6).map(m => this.card(m)).join('');
        if (DOM.musicasGrid) DOM.musicasGrid.innerHTML = list.map(m => this.card(m)).join('');
        if (DOM.adminMusicList) this.renderAdminList();

        document.getElementById('total-songs').textContent = appState.playlist.length;
        document.getElementById('total-artists').textContent = new Set(appState.playlist.map(m => m.artista)).size;
    },

    card(m) {
        return `
        <div class="music-card-modern" onclick="Player.playById('${m.id}')">
            <div class="card-image">
                <img src="${ApiDataSdk.formatUrl(m.capa_url)}" alt="${m.nome}" onerror="this.src='https://placehold.co/300'">
                <div class="card-overlay"><i class="fas fa-play"></i></div>
            </div>
            <div class="card-info">
                <div class="card-title">${m.nome}</div>
                <div class="card-artist">${m.artista}</div>
            </div>
        </div>`;
    },

    renderAdminList() {
        DOM.adminMusicList.innerHTML = appState.playlist.map(m => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${ApiDataSdk.formatUrl(m.capa_url)}" style="width: 40px; height: 40px; border-radius: 4px; object-cover;">
                    <div>
                        <div style="font-weight: bold; font-size: 14px;">${m.nome}</div>
                        <div style="font-size: 12px; color: #888;">${m.artista}</div>
                    </div>
                </div>
                <button onclick="Admin.deleteMusic('${m.id}')" style="color: #ff4444; background: none; border: none; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
};

// LÓGICA DO PLAYER (Correção do erro 404)
const Player = {
    async playById(id) {
        const index = appState.playlist.findIndex(m => String(m.id) === String(id));
        if (index < 0) return;

        appState.currentMusicIndex = index;
        const m = appState.playlist[index];

        const audioUrl = ApiDataSdk.formatUrl(m.audio_url);
        DOM.audioPlayer.src = audioUrl;
        
        DOM.playerTitle.textContent = m.nome;
        DOM.playerArtist.textContent = m.artista;
        DOM.playerCover.src = ApiDataSdk.formatUrl(m.capa_url);

        try {
            await DOM.audioPlayer.play();
            appState.isPlaying = true;
            DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
            document.getElementById('visualizer').classList.add('active');
        } catch (err) {
            console.error("Erro ao tocar:", err);
            alert("Erro 404: O arquivo de música não foi encontrado ou foi apagado do servidor.");
        }
    },

    toggle() {
        if (!DOM.audioPlayer.src) return;
        if (DOM.audioPlayer.paused) {
            DOM.audioPlayer.play();
            appState.isPlaying = true;
        } else {
            DOM.audioPlayer.pause();
            appState.isPlaying = false;
        }
        DOM.btnPlayPause.innerHTML = appState.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }
};

// LÓGICA ADMINISTRATIVA (Upload)
const Admin = {
    async login(e) {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                window.navigateTo('admin');
            } else {
                document.getElementById('login-error').classList.remove('hidden');
            }
        } catch (e) { alert("Erro ao logar"); }
    },

    async deleteMusic(id) {
        if (!confirm("Excluir música?")) return;
        try {
            await fetch(`${ApiDataSdk.baseUrl}/musicas/${id}`, {
                method: 'DELETE',
                headers: ApiDataSdk.getHeaders()
            });
            initData();
        } catch (e) { alert("Erro ao deletar"); }
    }
};

// NAVEGAÇÃO
window.navigateTo = (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');
    window.scrollTo(0,0);
};

// INICIALIZAÇÃO E EVENTOS
async function initData() {
    try {
        const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`);
        appState.playlist = await res.json();
        UI.renderAll();
    } catch (e) { console.error("Erro ao carregar dados"); }
}

function setupEvents() {
    // Login
    if (DOM.loginForm) DOM.loginForm.onsubmit = Admin.login;

    // Admin Upload (Mantendo seus campos)
    if (DOM.adminForm) {
        DOM.adminForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('nome', document.getElementById('music-name').value);
            formData.append('artista', document.getElementById('artist-name').value);
            
            const audioFile = document.getElementById('audio-file').files[0];
            const coverFile = document.getElementById('cover-file').files[0];
            const audioUrl = document.getElementById('audio-url').value;
            const coverUrl = document.getElementById('cover-url').value;

            if (audioFile) formData.append('audio', audioFile);
            else if (audioUrl) formData.append('audio_url', audioUrl);

            if (coverFile) formData.append('capa', coverFile);
            else if (coverUrl) formData.append('capa_url', coverUrl);

            try {
                const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                    body: formData
                });
                if (res.ok) {
                    DOM.adminForm.reset();
                    alert("Música adicionada!");
                    initData();
                }
            } catch (e) { alert("Erro ao enviar"); }
        };
    }

    // Player
    DOM.btnPlayPause.onclick = Player.toggle;
    DOM.btnNext.onclick = () => Player.playById(appState.playlist[(appState.currentMusicIndex + 1) % appState.playlist.length]?.id);
    DOM.btnPrev.onclick = () => Player.playById(appState.playlist[(appState.currentMusicIndex - 1 + appState.playlist.length) % appState.playlist.length]?.id);

    DOM.audioPlayer.ontimeupdate = () => {
        const pct = (DOM.audioPlayer.currentTime / DOM.audioPlayer.duration) * 100 || 0;
        DOM.progressFill.style.width = pct + '%';
        DOM.currentTimeEl.textContent = formatTime(DOM.audioPlayer.currentTime);
        if (DOM.audioPlayer.duration) DOM.durationTimeEl.textContent = formatTime(DOM.audioPlayer.duration);
    };

    DOM.progressBar.onclick = (e) => {
        const rect = DOM.progressBar.getBoundingClientRect();
        DOM.audioPlayer.currentTime = ((e.clientX - rect.left) / rect.width) * DOM.audioPlayer.duration;
    };

    // Navegação Menu
    document.querySelectorAll('[data-page]').forEach(el => {
        el.onclick = (e) => {
            e.preventDefault();
            window.navigateTo(el.dataset.page);
        };
    });

    if(DOM.searchInput) {
        DOM.searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            appState.filteredPlaylist = appState.playlist.filter(m => 
                m.nome.toLowerCase().includes(term) || m.artista.toLowerCase().includes(term)
            );
            UI.renderAll();
        };
    }
    
    document.getElementById('btn-logout').onclick = () => {
        localStorage.removeItem('auth_token');
        location.reload();
    };

    // Auxiliares de Upload (Preview)
    document.getElementById('audio-upload-area').onclick = () => document.getElementById('audio-file').click();
    document.getElementById('cover-upload-area').onclick = () => document.getElementById('cover-file').click();
}

function formatTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

window.playRandomMusic = () => {
    if (appState.playlist.length > 0) {
        const rand = appState.playlist[Math.floor(Math.random() * appState.playlist.length)];
        Player.playById(rand.id);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    initData();
});