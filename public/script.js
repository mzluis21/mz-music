// ============================================
// CONFIGURAÇÕES E SDK
// ============================================
const ApiDataSdk = {
    baseUrl: 'https://mz-music-backend.onrender.com',

    // CORREÇÃO: Função para transformar caminhos relativos (/uploads/...) em URLs absolutas
    formatUrl: (path) => {
        if (!path) return 'https://placehold.co/300';
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${ApiDataSdk.baseUrl}${cleanPath}`;
    },

    getHeaders: () => {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    init: async (handler) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`);
            const data = await res.json();
            handler.onDataChanged(data);
        } catch (e) {
            console.error("Erro ao carregar músicas:", e);
        }
    },

    create: async (formData) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`, {
                method: 'POST',
                headers: ApiDataSdk.getHeaders(),
                body: formData
            });
            if (res.ok) {
                await ApiDataSdk.init(dataHandler);
                return { isOk: true };
            }
            return { isOk: false };
        } catch (e) { return { isOk: false }; }
    },

    delete: async (id) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas/${id}`, {
                method: 'DELETE',
                headers: ApiDataSdk.getHeaders()
            });
            if (res.ok) await ApiDataSdk.init(dataHandler);
        } catch (e) { console.error(e); }
    }
};

// ============================================
// ESTADO DO APP
// ============================================
const appState = {
    playlist: [],
    filteredPlaylist: [],
    currentMusicIndex: 0,
    isPlaying: false,
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
    searchInput: document.getElementById('search-input'),
    loginError: document.getElementById('login-error')
};

// ============================================
// UI - RENDERIZAÇÃO
// ============================================
const UI = {
    renderAll() {
        const list = appState.filteredPlaylist.length > 0 || DOM.searchInput.value !== "" 
                     ? appState.filteredPlaylist 
                     : appState.playlist;

        // Renderiza Home (Sempre os primeiros 6 da lista original)
        DOM.homeMusicGrid.innerHTML = appState.playlist.slice(0, 6).map(m => UI.card(m)).join('');

        // Renderiza Músicas
        DOM.musicasGrid.innerHTML = list.map(m => UI.card(m)).join('');
        
        // Renderiza Admin
        DOM.adminMusicList.innerHTML = appState.playlist.map(m => `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                <div class="flex items-center gap-3">
                    <img src="${ApiDataSdk.formatUrl(m.url_capa)}" class="w-10 h-10 object-cover rounded">
                    <div><div class="text-sm font-bold">${m.nome}</div><div class="text-xs text-gray-500">${m.artista}</div></div>
                </div>
                <button onclick="ApiDataSdk.delete('${m.id}')" class="text-red-500 hover:bg-red-500/20 p-2 rounded-lg transition"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        document.getElementById('total-songs').textContent = appState.playlist.length;
        document.getElementById('total-artists').textContent = new Set(appState.playlist.map(m => m.artista)).size;
    },

    card(m) {
        return `
        <div class="cursor-pointer group" onclick="Player.playById('${m.id}')">
            <div class="relative aspect-square overflow-hidden rounded-xl mb-2">
                <img src="${ApiDataSdk.formatUrl(m.url_capa)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500" onerror="this.src='https://placehold.co/300'">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i class="fas fa-play text-white text-2xl"></i></div>
            </div>
            <div class="font-bold text-sm truncate">${m.nome}</div>
            <div class="text-xs text-gray-500 truncate">${m.artista}</div>
        </div>`;
    }
};

const dataHandler = { onDataChanged: (data) => { appState.playlist = data; UI.renderAll(); } };

// ============================================
// LÓGICA DO PLAYER
// ============================================
const Player = {
    playById(id) {
        const index = appState.playlist.findIndex(m => m.id === id);
        if (index < 0) return;
        appState.currentMusicIndex = index;
        const m = appState.playlist[index];

        DOM.audioPlayer.src = ApiDataSdk.formatUrl(m.url_audio);
        DOM.playerTitle.textContent = m.nome;
        DOM.playerArtist.textContent = m.artista;
        DOM.playerCover.src = ApiDataSdk.formatUrl(m.url_capa);
        
        DOM.audioPlayer.play();
        appState.isPlaying = true;
        DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
    },

    toggle() {
        if (!DOM.audioPlayer.src && appState.playlist.length > 0) return Player.playById(appState.playlist[0].id);
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

// ============================================
// EVENTOS E LOGIN
// ============================================
function setupEvents() {
    // Menu
    document.getElementById('menu-toggle').onclick = () => document.getElementById('mobile-menu').classList.toggle('active');

    // Pesquisa
    DOM.searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        appState.filteredPlaylist = appState.playlist.filter(m => 
            m.nome.toLowerCase().includes(term) || m.artista.toLowerCase().includes(term)
        );
        UI.renderAll();
    };

    // Controles Player
    DOM.btnPlayPause.onclick = Player.toggle;
    DOM.btnNext.onclick = () => {
        const nextIdx = (appState.currentMusicIndex + 1) % appState.playlist.length;
        Player.playById(appState.playlist[nextIdx].id);
    };
    DOM.btnPrev.onclick = () => {
        const prevIdx = (appState.currentMusicIndex - 1 + appState.playlist.length) % appState.playlist.length;
        Player.playById(appState.playlist[prevIdx].id);
    };

    DOM.audioPlayer.ontimeupdate = () => {
        const pct = (DOM.audioPlayer.currentTime / DOM.audioPlayer.duration) * 100 || 0;
        DOM.progressFill.style.width = pct + '%';
        DOM.currentTimeEl.textContent = formatTime(DOM.audioPlayer.currentTime);
        if (DOM.audioPlayer.duration) DOM.durationTimeEl.textContent = formatTime(DOM.audioPlayer.duration);
    };

    DOM.progressBar.onclick = (e) => {
        const rect = DOM.progressBar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        DOM.audioPlayer.currentTime = pct * DOM.audioPlayer.duration;
    };

    // Login
    DOM.loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const usuario = document.getElementById('username').value;
        const senha = document.getElementById('password').value;
        
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                window.navigateTo('admin');
            } else {
                DOM.loginError.textContent = "Acesso negado";
                DOM.loginError.classList.remove('hidden');
            }
        } catch (e) {
            DOM.loginError.textContent = "Erro no servidor";
            DOM.loginError.classList.remove('hidden');
        }
    };

    // Admin Upload
    DOM.adminForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('nome', document.getElementById('music-name').value);
        fd.append('artista', document.getElementById('artist-name').value);
        fd.append('audio', appState.audioFileData);
        fd.append('capa', appState.coverFileData);

        const btn = document.querySelector('.btn-submit');
        btn.disabled = true; btn.textContent = "Subindo...";

        const success = await ApiDataSdk.create(fd);
        if (success.isOk) {
            DOM.adminForm.reset();
            alert("Música salva!");
        }
        btn.disabled = false; btn.textContent = "Salvar Música";
    };

    // Estética Upload
    document.getElementById('audio-upload-area').onclick = () => document.getElementById('audio-file').click();
    document.getElementById('cover-upload-area').onclick = () => document.getElementById('cover-file').click();
    document.getElementById('audio-file').onchange = (e) => {
        appState.audioFileData = e.target.files[0];
        document.getElementById('audio-placeholder').classList.add('hidden');
        document.getElementById('audio-preview').classList.remove('hidden');
    };
    document.getElementById('cover-file').onchange = (e) => {
        appState.coverFileData = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('cover-preview-img').src = ev.target.result;
            document.getElementById('cover-preview-img').classList.remove('hidden');
            document.getElementById('cover-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('btn-logout').onclick = () => {
        localStorage.removeItem('token');
        window.location.reload();
    };

    document.querySelectorAll('[data-page]').forEach(a => a.onclick = (e) => navigateTo(e.currentTarget.dataset.page));
}

function formatTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

window.navigateTo = (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');
    window.scrollTo(0,0);
};

window.playRandomMusic = () => {
    if (appState.playlist.length > 0) {
        const rand = Math.floor(Math.random() * appState.playlist.length);
        Player.playById(appState.playlist[rand].id);
        window.navigateTo('musicas');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    ApiDataSdk.init(dataHandler);
});