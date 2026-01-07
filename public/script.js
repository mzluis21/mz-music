/**
 * MAZZONI MUSIC - SCRIPT PRINCIPAL
 * Integração completa com Backend no Render
 */

const ApiDataSdk = {
    // URL do seu serviço de BACKEND no Render
    baseUrl: 'https://mz-music-backend.onrender.com',

    // Auxiliar para garantir que URLs de imagem/áudio funcionem
    formatUrl: (path) => {
        if (!path) return 'https://placehold.co/300';
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${ApiDataSdk.baseUrl}${cleanPath}`;
    },

    // Pega o token de admin para rotas protegidas
    getHeaders: () => {
        const token = localStorage.getItem('auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    // Busca músicas do banco de dados
    init: async (handler) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`);
            if (!res.ok) throw new Error('Erro ao buscar músicas');
            const data = await res.json();
            handler.onDataChanged(data);
        } catch (e) {
            console.error("Erro de conexão:", e);
            handler.onDataChanged([]); 
        }
    },

    // Envia nova música (Upload de arquivos)
    create: async (formData) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas`, {
                method: 'POST',
                headers: ApiDataSdk.getHeaders(),
                body: formData
            });
            return { isOk: res.ok };
        } catch (e) {
            console.error("Erro no upload:", e);
            return { isOk: false };
        }
    },

    // Remove música do banco
    delete: async (id) => {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/musicas/${id}`, {
                method: 'DELETE',
                headers: ApiDataSdk.getHeaders()
            });
            return { isOk: res.ok };
        } catch (e) {
            console.error("Erro ao deletar:", e);
            return { isOk: false };
        }
    }
};

// ============================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================
const appState = {
    playlist: [],
    filteredPlaylist: [],
    currentMusicIndex: 0,
    isPlaying: false,
    audioFileData: null,
    coverFileData: null
};

// Mapeamento de elementos do HTML
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
// UI - RENDERIZAÇÃO NA TELA
// ============================================
const UI = {
    renderAll() {
        const list = appState.filteredPlaylist.length > 0 || DOM.searchInput.value !== "" 
                     ? appState.filteredPlaylist 
                     : appState.playlist;

        // Home Page (Destaques - Primeiras 6)
        DOM.homeMusicGrid.innerHTML = appState.playlist.slice(0, 6).map(m => UI.card(m)).join('');
        
        // Página de Músicas
        DOM.musicasGrid.innerHTML = list.map(m => UI.card(m)).join('');
        
        // Lista no Painel Admin
        DOM.adminMusicList.innerHTML = appState.playlist.map(m => `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 mb-2">
                <div class="flex items-center gap-3">
                    <img src="${ApiDataSdk.formatUrl(m.capa_url)}" class="w-10 h-10 object-cover rounded">
                    <div>
                        <div class="text-sm font-bold">${m.nome}</div>
                        <div class="text-xs text-gray-500">${m.artista}</div>
                    </div>
                </div>
                <button onclick="Admin.handleDelete('${m.id}')" class="text-red-500 p-2 hover:bg-red-500/10 rounded-full transition">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // Atualiza contadores na Home
        if(document.getElementById('total-songs')) {
            document.getElementById('total-songs').textContent = appState.playlist.length;
            document.getElementById('total-artists').textContent = new Set(appState.playlist.map(m => m.artista)).size;
        }
    },

    card(m) {
        return `
        <div class="cursor-pointer group" onclick="Player.playById('${m.id}')">
            <div class="relative aspect-square overflow-hidden rounded-xl mb-2">
                <img src="${ApiDataSdk.formatUrl(m.capa_url)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500" onerror="this.src='https://placehold.co/300'">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <i class="fas fa-play text-white text-2xl"></i>
                </div>
            </div>
            <div class="font-bold text-sm truncate">${m.nome}</div>
            <div class="text-xs text-gray-500 truncate">${m.artista}</div>
        </div>`;
    }
};

const dataHandler = { onDataChanged: (data) => { appState.playlist = data; UI.renderAll(); } };

// ============================================
// PLAYER DE ÁUDIO
// ============================================
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
// ADMIN E AUTENTICAÇÃO
// ============================================
const Auth = {
    async handleLogin(usuario, senha) {
        try {
            const res = await fetch(`${ApiDataSdk.baseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha })
            });
            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('auth_token', data.token);
                DOM.loginError.classList.add('hidden');
                window.navigateTo('admin');
            } else {
                DOM.loginError.textContent = data.error || "Acesso Negado";
                DOM.loginError.classList.remove('hidden');
            }
        } catch (e) {
            DOM.loginError.textContent = "Erro ao conectar com servidor";
            DOM.loginError.classList.remove('hidden');
        }
    }
};

const Admin = {
    async handleDelete(id) {
        if (confirm("Deseja excluir esta música permanentemente?")) {
            const success = await ApiDataSdk.delete(id);
            if (success) ApiDataSdk.init(dataHandler);
        }
    }
};

// ============================================
// EVENTOS E INICIALIZAÇÃO
// ============================================
function setupEvents() {
    // Busca
    DOM.searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        appState.filteredPlaylist = appState.playlist.filter(m => 
            m.nome.toLowerCase().includes(term) || m.artista.toLowerCase().includes(term)
        );
        UI.renderAll();
    };

    // Controles do Player
    DOM.btnPlayPause.onclick = Player.toggle;
    DOM.btnNext.onclick = () => Player.playById(appState.playlist[(appState.currentMusicIndex + 1) % appState.playlist.length]?.id);
    DOM.btnPrev.onclick = () => Player.playById(appState.playlist[(appState.currentMusicIndex - 1 + appState.playlist.length) % appState.playlist.length]?.id);

    // Barra de Progresso
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

    // Login Form
    DOM.loginForm.onsubmit = (e) => {
        e.preventDefault();
        Auth.handleLogin(document.getElementById('username').value, document.getElementById('password').value);
    };

    // Upload de Músicas (Admin)
    DOM.adminForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('nome', document.getElementById('music-name').value);
        fd.append('artista', document.getElementById('artist-name').value);
        fd.append('audio', appState.audioFileData);
        if (appState.coverFileData) fd.append('capa', appState.coverFileData);

        const btn = DOM.adminForm.querySelector('button[type="submit"]');
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subindo...';

        const res = await ApiDataSdk.create(fd);
        if (res.isOk) {
            alert("Música adicionada com sucesso!");
            DOM.adminForm.reset();
            ApiDataSdk.init(dataHandler);
        } else {
            alert("Erro ao enviar. Verifique se o arquivo é um áudio válido.");
        }
        btn.disabled = false;
        btn.innerHTML = 'Salvar Música';
    };

    // Eventos de clique nas áreas de upload
    document.getElementById('audio-upload-area').onclick = () => document.getElementById('audio-file').click();
    document.getElementById('cover-upload-area').onclick = () => document.getElementById('cover-file').click();

    document.getElementById('audio-file').onchange = (e) => {
        appState.audioFileData = e.target.files[0];
        document.getElementById('audio-placeholder').textContent = "✓ " + e.target.files[0].name;
        document.getElementById('audio-placeholder').classList.add('text-green-500', 'font-bold');
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

    // Navegação entre páginas (SPA)
    document.querySelectorAll('[data-page]').forEach(a => {
        a.onclick = (e) => {
            e.preventDefault();
            navigateTo(e.currentTarget.dataset.page);
        };
    });

    document.getElementById('btn-logout').onclick = () => {
        localStorage.removeItem('auth_token');
        window.location.reload();
    };

    // Toggle Menu Mobile
    const menuToggle = document.getElementById('menu-toggle');
    if(menuToggle) {
        menuToggle.onclick = () => {
            document.getElementById('mobile-menu').classList.toggle('hidden');
            document.getElementById('mobile-menu').classList.toggle('flex');
        };
    }
}

// Helpers
function formatTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

window.navigateTo = (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`page-${page}`);
    if(target) target.classList.remove('hidden');
    
    // Esconde menu mobile ao navegar
    const mobileMenu = document.getElementById('mobile-menu');
    if(mobileMenu) {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
    }
    window.scrollTo(0,0);
};

window.playRandomMusic = () => {
    if (appState.playlist.length > 0) {
        const rand = appState.playlist[Math.floor(Math.random() * appState.playlist.length)];
        Player.playById(rand.id);
    }
};

// Iniciar Aplicação
document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    ApiDataSdk.init(dataHandler);
});
