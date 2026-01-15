const ApiDataSdk = {
    baseUrl: window.location.hostname.includes('onrender.com') 
             ? window.location.origin 
             : 'https://mz-music-backend.onrender.com', 

    formatUrl: (path) => {
        if (!path) return 'https://placehold.co/300';
        if (path.startsWith('http')) return path;
        return `${ApiDataSdk.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    },

    getHeaders: () => ({
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }),

    init: async (handler) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`);
            const data = await res.json();
            handler.onDataChanged(data);
        } catch (e) { console.error(e); }
    }
};

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
    playerCover: document.getElementById('player-cover'),
    playerTitle: document.getElementById('player-title'),
    playerArtist: document.getElementById('player-artist'),
    homeMusicGrid: document.getElementById('home-music-grid'),
    musicasGrid: document.getElementById('musicas-grid'),
    adminMusicList: document.getElementById('admin-music-list'),
    loginForm: document.getElementById('login-form'),
    adminForm: document.getElementById('admin-form'),
    searchInput: document.getElementById('search-input'),
    loginError: document.getElementById('login-error'),
    menuToggle: document.getElementById('menu-toggle'), // Gatilho do menu
    mobileMenu: document.getElementById('mobile-menu')  // O menu em si
};

const UI = {
    renderAll() {
        const list = appState.filteredPlaylist.length > 0 || (DOM.searchInput?.value) 
                     ? appState.filteredPlaylist 
                     : appState.playlist;

        if(DOM.homeMusicGrid) DOM.homeMusicGrid.innerHTML = appState.playlist.slice(0, 6).map(m => UI.card(m)).join('');
        if(DOM.musicasGrid) DOM.musicasGrid.innerHTML = list.map(m => UI.card(m)).join('');
        
        if(DOM.adminMusicList) {
            DOM.adminMusicList.innerHTML = appState.playlist.map(m => `
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                    <div class="flex items-center gap-3 truncate">
                        <img src="${ApiDataSdk.formatUrl(m.capa_url)}" class="w-10 h-10 object-cover rounded">
                        <div class="truncate text-xs">
                            <div class="font-bold">${m.nome}</div>
                            <div class="text-gray-500">${m.artista}</div>
                        </div>
                    </div>
                    <button onclick="Admin.handleDelete('${m.id}')" class="text-red-500 p-2"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
        }

        document.getElementById('total-songs').textContent = appState.playlist.length;
        document.getElementById('total-artists').textContent = new Set(appState.playlist.map(m => m.artista)).size;
    },

    card(m) {
        return `
        <div class="cursor-pointer group" onclick="Player.playById('${m.id}')">
            <div class="relative aspect-square overflow-hidden rounded-xl mb-2 bg-white/5">
                <img src="${ApiDataSdk.formatUrl(m.capa_url)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <i class="fas fa-play text-white text-2xl"></i>
                </div>
            </div>
            <div class="font-bold text-sm truncate">${m.nome}</div>
            <div class="text-xs text-gray-500 truncate">${m.artista}</div>
        </div>`;
    }
};

const Player = {
    playById(id) {
        const index = appState.playlist.findIndex(m => String(m.id) === String(id));
        if (index < 0) return;
        appState.currentMusicIndex = index;
        const m = appState.playlist[index];
        DOM.audioPlayer.src = ApiDataSdk.formatUrl(m.audio_url);
        DOM.playerTitle.textContent = m.nome;
        DOM.playerArtist.textContent = m.artista;
        DOM.playerCover.src = ApiDataSdk.formatUrl(m.capa_url);
        DOM.audioPlayer.play();
        appState.isPlaying = true;
        DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
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

const Admin = {
    async handleDelete(id) {
        if (!confirm("Excluir música?")) return;
        await fetch(`${ApiDataSdk.baseUrl}/musicas/${id}`, {
            method: 'DELETE',
            headers: ApiDataSdk.getHeaders()
        });
        ApiDataSdk.init({ onDataChanged: (data) => { appState.playlist = data; UI.renderAll(); } });
    }
};

// Lógica de Navegação e Menu Hambúrguer
window.navigateTo = (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${page}`)?.classList.remove('hidden');
    
    // Fecha o menu mobile sempre que navegar
    DOM.mobileMenu.classList.add('hidden');
    DOM.mobileMenu.classList.remove('flex');
    window.scrollTo(0,0);
};

function setupEvents() {
    // Evento do Hambúrguer
    if (DOM.menuToggle && DOM.mobileMenu) {
        DOM.menuToggle.onclick = () => {
            DOM.mobileMenu.classList.remove('hidden');
            DOM.mobileMenu.classList.add('flex');
        };
        
        document.getElementById('close-menu').onclick = () => {
            DOM.mobileMenu.classList.add('hidden');
            DOM.mobileMenu.classList.remove('flex');
        };
    }

    // Busca
    DOM.searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        appState.filteredPlaylist = appState.playlist.filter(m => 
            m.nome.toLowerCase().includes(term) || m.artista.toLowerCase().includes(term)
        );
        UI.renderAll();
    };

    // Controles Player
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

    // Login
    DOM.loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(`${ApiDataSdk.baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: DOM.username.value, senha: DOM.password.value })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('auth_token', data.token);
            window.navigateTo('admin');
        } else {
            DOM.loginError.textContent = data.error;
            DOM.loginError.classList.remove('hidden');
        }
    };

    // Admin Upload
    document.getElementById('audio-upload-area').onclick = () => document.getElementById('audio-file').click();
    document.getElementById('cover-upload-area').onclick = () => document.getElementById('cover-file').click();

    document.getElementById('audio-file').onchange = (e) => {
        appState.audioFileData = e.target.files[0];
        document.getElementById('audio-placeholder').textContent = "✓ " + e.target.files[0].name;
    };

    document.getElementById('cover-file').onchange = (e) => {
        appState.coverFileData = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = document.getElementById('cover-preview-img');
            img.src = ev.target.result;
            img.classList.remove('hidden');
            document.getElementById('cover-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    DOM.adminForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('nome', document.getElementById('music-name').value);
        fd.append('artista', document.getElementById('artist-name').value);
        fd.append('audio', appState.audioFileData);
        if (appState.coverFileData) fd.append('capa', appState.coverFileData);

        const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`, {
            method: 'POST',
            headers: ApiDataSdk.getHeaders(),
            body: fd
        });
        if (res.ok) {
            alert("Sucesso!");
            DOM.adminForm.reset();
            ApiDataSdk.init({ onDataChanged: (data) => { appState.playlist = data; UI.renderAll(); } });
        }
    };

    // Cliques de Navegação
    document.querySelectorAll('[data-page]').forEach(a => {
        a.onclick = (e) => {
            e.preventDefault();
            window.navigateTo(e.currentTarget.dataset.page);
        };
    });

    document.getElementById('btn-logout').onclick = () => { localStorage.removeItem('auth_token'); location.reload(); };
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
    ApiDataSdk.init({ onDataChanged: (data) => { appState.playlist = data; UI.renderAll(); } });
});