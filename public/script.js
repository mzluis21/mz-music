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
        } catch (e) { console.error("Erro ao carregar músicas:", e); }
    }
};

const appState = {
    playlist: [],
    filteredPlaylist: [],
    currentMusicIndex: 0,
    isPlaying: false
};

const DOM = {
    get audioPlayer() { return document.getElementById('audio-player'); },
    get btnPlayPause() { return document.getElementById('btn-play-pause'); },
    get btnPrev() { return document.getElementById('btn-prev'); },
    get btnNext() { return document.getElementById('btn-next'); },
    get progressBar() { return document.getElementById('progress-bar'); },
    get progressFill() { return document.getElementById('progress-fill'); },
    get currentTimeEl() { return document.getElementById('current-time'); },
    get durationTimeEl() { return document.getElementById('duration-time'); },
    get playerCover() { return document.getElementById('player-cover'); },
    get playerTitle() { return document.getElementById('player-title'); },
    get playerArtist() { return document.getElementById('player-artist'); },
    get homeMusicGrid() { return document.getElementById('home-music-grid'); },
    get musicasGrid() { return document.getElementById('musicas-grid'); },
    get searchInput() { return document.getElementById('search-input'); },
    get loginForm() { return document.getElementById('login-form'); },
    get menuToggle() { return document.getElementById('menu-toggle'); },
    get mobileMenu() { return document.getElementById('mobile-menu'); },
    get closeMenu() { return document.getElementById('close-menu'); }
};

const UI = {
    renderAll() {
        const list = (appState.filteredPlaylist.length > 0 || (DOM.searchInput && DOM.searchInput.value)) 
                     ? appState.filteredPlaylist 
                     : appState.playlist;

        if(DOM.homeMusicGrid) DOM.homeMusicGrid.innerHTML = appState.playlist.slice(0, 6).map(m => UI.card(m)).join('');
        if(DOM.musicasGrid) DOM.musicasGrid.innerHTML = list.map(m => UI.card(m)).join('');
        
        const songsEl = document.getElementById('total-songs');
        const artistsEl = document.getElementById('total-artists');
        if(songsEl) songsEl.textContent = appState.playlist.length;
        if(artistsEl) artistsEl.textContent = new Set(appState.playlist.map(m => m.artista)).size;
    },

    card(m) {
        return `
        <div class="cursor-pointer group" onclick="Player.playById('${m.id}')">
            <div class="relative aspect-square overflow-hidden rounded-xl mb-2 bg-white/5 shadow-lg">
                <img src="${ApiDataSdk.formatUrl(m.capa_url)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <i class="fas fa-play text-white text-2xl"></i>
                </div>
            </div>
            <div class="font-bold text-sm truncate text-white">${m.nome}</div>
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
        
        if(DOM.audioPlayer) {
            DOM.audioPlayer.src = ApiDataSdk.formatUrl(m.audio_url);
            if(DOM.playerTitle) DOM.playerTitle.textContent = m.nome;
            if(DOM.playerArtist) DOM.playerArtist.textContent = m.artista;
            if(DOM.playerCover) DOM.playerCover.src = ApiDataSdk.formatUrl(m.capa_url);
            DOM.audioPlayer.play();
            appState.isPlaying = true;
            if(DOM.btnPlayPause) DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
        }
    },

    toggle() {
        if (!DOM.audioPlayer || !DOM.audioPlayer.src) return;
        if (DOM.audioPlayer.paused) {
            DOM.audioPlayer.play();
            appState.isPlaying = true;
        } else {
            DOM.audioPlayer.pause();
            appState.isPlaying = false;
        }
        if(DOM.btnPlayPause) DOM.btnPlayPause.innerHTML = appState.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }
};

window.navigateTo = (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`page-${page}`);
    if(target) target.classList.remove('hidden');
    
    if(DOM.mobileMenu) {
        DOM.mobileMenu.classList.add('hidden');
        DOM.mobileMenu.classList.remove('flex');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function setupEvents() {
    if (DOM.menuToggle) DOM.menuToggle.onclick = () => { DOM.mobileMenu?.classList.remove('hidden'); DOM.mobileMenu?.classList.add('flex'); };
    if (DOM.closeMenu) DOM.closeMenu.onclick = () => { DOM.mobileMenu?.classList.add('hidden'); DOM.mobileMenu?.classList.remove('flex'); };

    if(DOM.searchInput) {
        DOM.searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            appState.filteredPlaylist = appState.playlist.filter(m => 
                m.nome.toLowerCase().includes(term) || m.artista.toLowerCase().includes(term)
            );
            UI.renderAll();
        };
    }

    if(DOM.btnPlayPause) DOM.btnPlayPause.onclick = Player.toggle;
    if(DOM.btnNext) DOM.btnNext.onclick = () => Player.playById(appState.playlist[(appState.currentMusicIndex + 1) % appState.playlist.length]?.id);
    if(DOM.btnPrev) DOM.btnPrev.onclick = () => Player.playById(appState.playlist[(appState.currentMusicIndex - 1 + appState.playlist.length) % appState.playlist.length]?.id);

    if(DOM.audioPlayer) {
        DOM.audioPlayer.ontimeupdate = () => {
            const pct = (DOM.audioPlayer.currentTime / DOM.audioPlayer.duration) * 100 || 0;
            if(DOM.progressFill) DOM.progressFill.style.width = pct + '%';
            if(DOM.currentTimeEl) DOM.currentTimeEl.textContent = formatTime(DOM.audioPlayer.currentTime);
            if(DOM.audioPlayer.duration && DOM.durationTimeEl) DOM.durationTimeEl.textContent = formatTime(DOM.audioPlayer.duration);
        };
    }

    if(DOM.progressBar) {
        DOM.progressBar.onclick = (e) => {
            const rect = DOM.progressBar.getBoundingClientRect();
            DOM.audioPlayer.currentTime = ((e.clientX - rect.left) / rect.width) * DOM.audioPlayer.duration;
        };
    }

    document.querySelectorAll('[data-page]').forEach(a => {
        a.onclick = (e) => {
            e.preventDefault();
            window.navigateTo(e.currentTarget.dataset.page);
        };
    });

    const logoutBtn = document.getElementById('btn-logout');
    if(logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem('auth_token'); location.reload(); };
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