/* =========================================
   CONFIGURAÇÃO E ESTADO GLOBAL
   ========================================= */
const API_URL = 'https://mz-music-backend.onrender.com';

const AppState = {
    playlist: [],
    currentMusicIndex: 0,
    isPlaying: false
};

/* =========================================
   SELEÇÃO DE ELEMENTOS DO DOM
   ========================================= */
const DOM = {
    // Navegação e Páginas
    menuToggle: document.getElementById('menu-toggle'),
    mobileMenu: document.getElementById('mobile-menu'),
    menuIcon: document.querySelector('#menu-toggle i'),
    navLinks: document.querySelectorAll('[data-page]'),
    pages: document.querySelectorAll('.page'),

    // Player
    audioPlayer: document.getElementById('audio-player'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    progressFill: document.getElementById('progress-fill'),
    playerCover: document.getElementById('player-cover'),
    playerTitle: document.getElementById('player-title'),
    playerArtist: document.getElementById('player-artist'),

    // Grids e Listas
    homeGrid: document.getElementById('home-music-grid'),
    adminList: document.getElementById('admin-music-list'),
    
    // Login e Admin
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    btnLogout: document.getElementById('btn-logout')
};

/* =========================================
   SISTEMA DE SEGURANÇA (LOGIN RÍGIDO)
   ========================================= */
const Auth = {
    init() {
        if (DOM.loginForm) {
            DOM.loginForm.onsubmit = (e) => {
                e.preventDefault();
                
                const userField = document.getElementById('username');
                const passField = document.getElementById('password');

                const user = userField.value.trim().toLowerCase();
                const pass = passField.value.trim();

                // SENHA ATUALIZADA: mazzoni2026
                if (user === 'admin' && pass === 'mazzoni2026') {
                    localStorage.setItem('mz_admin_token', 'autenticado_com_sucesso');
                    DOM.loginError.classList.add('hidden');
                    
                    userField.value = '';
                    passField.value = '';

                    // Navega para o Admin após validar
                    Navigation.goTo('admin');
                } else {
                    localStorage.removeItem('mz_admin_token');
                    DOM.loginError.classList.remove('hidden');
                    alert("Acesso negado: Somente o administrador pode acessar.");
                }
            };
        }

        if (DOM.btnLogout) {
            DOM.btnLogout.onclick = () => {
                localStorage.removeItem('mz_admin_token');
                Navigation.goTo('home');
            };
        }
    },

    isLoggedIn() {
        return localStorage.getItem('mz_admin_token') === 'autenticado_com_sucesso';
    }
};

/* =========================================
   NAVEGAÇÃO COM BLOQUEIO DE SEGURANÇA
   ========================================= */
const Navigation = {
    init() {
        // Menu Hamburguer
        if (DOM.menuToggle) {
            DOM.menuToggle.onclick = (e) => {
                e.stopPropagation();
                DOM.mobileMenu.classList.toggle('active');
                this.updateMenuIcon();
            };
        }

        // Cliques nos links (Home, Músicas, Admin)
        DOM.navLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const pageId = link.getAttribute('data-page');
                this.goTo(pageId);
                DOM.mobileMenu?.classList.remove('active');
                this.updateMenuIcon();
            };
        });
    },

    updateMenuIcon() {
        if (DOM.menuIcon && DOM.mobileMenu) {
            DOM.menuIcon.className = DOM.mobileMenu.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
        }
    },

    goTo(pageId) {
        // BLOQUEIO CRÍTICO: Se tentar ir para 'admin' sem estar logado, ele te joga pro 'login'
        if (pageId === 'admin' && !Auth.isLoggedIn()) {
            console.warn("Tentativa de acesso não autorizado bloqueada.");
            pageId = 'login';
        }

        // Esconde todas as páginas e mostra a escolhida
        DOM.pages.forEach(p => p.classList.add('hidden'));
        const target = document.getElementById(`page-${pageId}`);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        }

        // Se entrou no admin legalmente, carrega a lista de gerenciamento
        if (pageId === 'admin') Admin.renderList();
    }
};

/* =========================================
   RECURSOS DO PLAYER E DADOS
   ========================================= */
function formatUrl(path) {
    if (!path) return 'https://via.placeholder.com/300?text=Sem+Capa';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const cleanPath = path.replace(/^\/+/, '');
    return `${API_URL}/${cleanPath}`;
}

const Player = {
    init() {
        if (!DOM.audioPlayer) return;
        DOM.btnPlayPause.onclick = () => this.toggle();
        DOM.audioPlayer.ontimeupdate = () => {
            const pct = (DOM.audioPlayer.currentTime / DOM.audioPlayer.duration) * 100;
            if (DOM.progressFill) DOM.progressFill.style.width = `${pct}%`;
        };
    },

    loadAndPlay(id) {
        const music = AppState.playlist.find(m => String(m.id) === String(id));
        if (!music) return;
        AppState.currentMusicIndex = AppState.playlist.indexOf(music);
        DOM.audioPlayer.src = formatUrl(music.audio_url);
        DOM.playerTitle.textContent = music.nome;
        DOM.playerArtist.textContent = music.artista;
        DOM.playerCover.src = formatUrl(music.capa_url);
        DOM.audioPlayer.play();
        DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
    },

    toggle() {
        if (DOM.audioPlayer.paused) {
            DOM.audioPlayer.play();
            DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            DOM.audioPlayer.pause();
            DOM.btnPlayPause.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
};

const Admin = {
    renderList() {
        if (!DOM.adminList) return;
        DOM.adminList.innerHTML = AppState.playlist.map(m => `
            <div class="flex items-center justify-between bg-gray-800 p-2 mb-2 rounded border border-gray-700">
                <div class="flex items-center gap-2">
                    <img src="${formatUrl(m.capa_url)}" class="w-10 h-10 object-cover rounded">
                    <span class="text-white text-sm font-medium">${m.nome}</span>
                </div>
                <button onclick="deleteMusic('${m.id}')" class="text-red-500 p-2 hover:bg-red-500/10 rounded">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
};

const Data = {
    async load() {
        try {
            const res = await fetch(`${API_URL}/musicas`);
            AppState.playlist = await res.json();
            this.render();
        } catch (e) { console.error("Erro API:", e); }
    },

    render() {
        if (DOM.homeGrid) {
            DOM.homeGrid.innerHTML = AppState.playlist.map(m => `
                <div class="bg-gray-800 p-3 rounded-lg cursor-pointer hover:scale-105 transition" 
                     onclick="Player.loadAndPlay('${m.id}')">
                    <img src="${formatUrl(m.capa_url)}" class="w-full aspect-square object-cover rounded-md mb-2">
                    <div class="text-white font-bold truncate text-sm">${m.nome}</div>
                    <div class="text-gray-400 text-xs truncate">${m.artista}</div>
                </div>
            `).join('');
        }
    }
};

/* =========================================
   INICIALIZAÇÃO FINAL
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    Navigation.init();
    Auth.init();
    Player.init();
    Data.load();
});

// Funções Globais
window.deleteMusic = async (id) => {
    if (!Auth.isLoggedIn()) return alert("Ação não autorizada.");
    if (!confirm("Excluir música?")) return;
    await fetch(`${API_URL}/musicas/${id}`, { method: 'DELETE' });
    Data.load();
    setTimeout(() => Admin.renderList(), 500);
};