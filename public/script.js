/* =========================================
   CONFIGURAÇÃO E ESTADO GLOBAL
   ========================================= */
// URL do seu servidor backend no Render
const API_URL = 'https://mz-music-backend.onrender.com';

// Objeto que armazena os dados atuais do aplicativo (Músicas, Player, Login)
const AppState = {
    playlist: [],           // Lista original vinda do servidor
    filteredPlaylist: [],   // Lista após busca/filtro
    currentMusicIndex: 0,   // Índice da música que está tocando agora
    isPlaying: false,       // Estado do player (tocando ou pausado)
    isAdmin: false,         // Estado de administrador
    audioFile: null,        // Armazena o arquivo de áudio selecionado no upload
    coverFile: null         // Armazena a imagem da capa selecionada no upload
};

/* =========================================
   SELEÇÃO DE ELEMENTOS DO DOM (HTML)
   ========================================= */
const DOM = {
    // Elementos de Navegação e Menu
    menuToggle: document.getElementById('menu-toggle'),
    mobileMenu: document.getElementById('mobile-menu'),
    menuIcon: document.querySelector('#menu-toggle i'),
    navLinks: document.querySelectorAll('[data-page]'),
    pages: document.querySelectorAll('.page'),

    // Controles do Player de Áudio
    audioPlayer: document.getElementById('audio-player'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    progressBar: document.getElementById('progress-bar'),
    progressFill: document.getElementById('progress-fill'),
    currentTime: document.getElementById('current-time'),
    durationTime: document.getElementById('duration-time'),
    volumeBar: document.getElementById('volume-bar'),
    volumeFill: document.getElementById('volume-fill'),
    
    // Informações da Música no Player
    playerCover: document.getElementById('player-cover'),
    playerTitle: document.getElementById('player-title'),
    playerArtist: document.getElementById('player-artist'),
    visualizer: document.getElementById('visualizer'),

    // Listas, Grids e Busca
    homeGrid: document.getElementById('home-music-grid'),
    musicasGrid: document.getElementById('musicas-grid'),
    searchInput: document.getElementById('search-input'),
    emptyMusicas: document.getElementById('empty-musicas'),
    loadingIndicator: document.getElementById('loading-indicator') || createLoadingElement(),
    
    // Estatísticas do Rodapé/Painel
    totalSongs: document.getElementById('total-songs'),
    totalArtists: document.getElementById('total-artists'),

    // Área de Admin e Login
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    adminForm: document.getElementById('admin-form'),
    adminList: document.getElementById('admin-music-list'),
    emptyAdmin: document.getElementById('empty-admin'),
    btnLogout: document.getElementById('btn-logout'),

    // Campos de Upload de Arquivos
    audioInput: document.getElementById('audio-file'),
    coverInput: document.getElementById('cover-file'),
    audioPreview: document.getElementById('audio-preview'),
    coverPreview: document.getElementById('cover-preview'),
    audioPlaceholder: document.getElementById('audio-placeholder'),
    coverPlaceholder: document.getElementById('cover-placeholder'),
    btnRemoveAudio: document.getElementById('remove-audio'),
    btnRemoveCover: document.getElementById('remove-cover')
};

/* =========================================
   FUNÇÕES UTILITÁRIAS (UTILS)
   ========================================= */

// Cria o balão de "Carregando" caso não exista no HTML
function createLoadingElement() {
    const el = document.createElement('div');
    el.id = 'loading-indicator';
    el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
    el.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 10px 20px; border-radius: 50px; z-index: 9999; display: none;';
    document.body.appendChild(el);
    return el;
}

// Formata a URL (Resolve se é link externo, base64 ou caminho do servidor)
function formatUrl(path) {
    if (!path) return 'https://via.placeholder.com/300?text=Sem+Capa';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path.startsWith('/') ? path : '/' + path}`;
}

// Converte segundos em formato MM:SS
function formatTime(s) {
    if (isNaN(s)) return "0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Formata o tamanho do arquivo (KB, MB...)
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Converte o arquivo selecionado em uma String Base64 para envio
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

/* =========================================
   MÓDULOS PRINCIPAIS
   ========================================= */

// 1. GESTÃO DE NAVEGAÇÃO E MENU
const Navigation = {
    init() {
        // Evento do botão hambúrguer
        if(DOM.menuToggle) {
            DOM.menuToggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita fechar o menu ao clicar no próprio botão
                DOM.mobileMenu.classList.toggle('active');
                this.updateMenuIcon();
            });
        }

        // Evento para fechar o menu ao clicar em qualquer link de página
        DOM.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.getAttribute('data-page');
                this.goTo(pageId);
                if(DOM.mobileMenu) {
                    DOM.mobileMenu.classList.remove('active');
                    this.updateMenuIcon();
                }
            });
        });

        // Fecha o menu automaticamente se clicar em qualquer lugar fora dele
        document.addEventListener('click', (e) => {
            if (DOM.mobileMenu && DOM.mobileMenu.classList.contains('active')) {
                if (!DOM.mobileMenu.contains(e.target) && !DOM.menuToggle.contains(e.target)) {
                    DOM.mobileMenu.classList.remove('active');
                    this.updateMenuIcon();
                }
            }
        });
    },

    // Troca o ícone de Barras pelo ícone de X
    updateMenuIcon() {
        if (!DOM.menuIcon) return;
        if (DOM.mobileMenu.classList.contains('active')) {
            DOM.menuIcon.classList.replace('fa-bars', 'fa-times');
        } else {
            DOM.menuIcon.classList.replace('fa-times', 'fa-bars');
        }
    },

    // Troca de página (Home, Músicas, Login, Admin)
    goTo(pageId) {
        const token = localStorage.getItem('token');
        // Proteção: Se tentar ir para Admin sem estar logado, vai para Login
        if (pageId === 'admin' && !token) pageId = 'login';
        // Se já estiver logado e tentar ir para Login, vai direto para Admin
        if (pageId === 'login' && token) pageId = 'admin';

        DOM.pages.forEach(p => p.classList.add('hidden'));
        const target = document.getElementById(`page-${pageId}`);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
        
        if (pageId === 'admin') Admin.renderList();
    }
};

// 2. SISTEMA DO PLAYER DE ÁUDIO
const Player = {
    init() {
        if(!DOM.audioPlayer) return;

        // Botoes do Player
        DOM.btnPlayPause.addEventListener('click', () => this.toggle());
        DOM.btnNext.addEventListener('click', () => this.next());
        DOM.btnPrev.addEventListener('click', () => this.prev());

        // Eventos nativos do elemento de áudio
        DOM.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        DOM.audioPlayer.addEventListener('ended', () => this.next());
        DOM.audioPlayer.addEventListener('loadedmetadata', () => {
            DOM.durationTime.textContent = formatTime(DOM.audioPlayer.duration);
        });
        
        // Clique na barra de progresso para pular tempo
        if(DOM.progressBar) {
            DOM.progressBar.addEventListener('click', (e) => {
                const width = DOM.progressBar.clientWidth;
                const clickX = e.offsetX;
                const duration = DOM.audioPlayer.duration;
                if(duration) DOM.audioPlayer.currentTime = (clickX / width) * duration;
            });
        }

        // Controle de Volume
        if(DOM.volumeBar) {
            DOM.volumeBar.addEventListener('click', (e) => {
                const width = DOM.volumeBar.clientWidth;
                const clickX = e.offsetX;
                const volume = Math.max(0, Math.min(1, clickX / width));
                DOM.audioPlayer.volume = volume;
                DOM.volumeFill.style.width = `${volume * 100}%`;
            });
        }
    },

    // Carrega uma música pelo ID e começa a tocar
    loadAndPlay(id) {
        const index = AppState.playlist.findIndex(m => String(m.id) === String(id));
        if (index === -1) return;

        AppState.currentMusicIndex = index;
        const music = AppState.playlist[index];

        DOM.audioPlayer.src = formatUrl(music.audio_url);
        DOM.playerTitle.textContent = music.nome;
        DOM.playerArtist.textContent = music.artista;
        DOM.playerCover.src = formatUrl(music.capa_url);
        DOM.playerCover.style.display = 'block';
        this.play();
    },

    play() {
        DOM.audioPlayer.play()
            .then(() => {
                AppState.isPlaying = true;
                DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
                if(DOM.visualizer) DOM.visualizer.style.display = 'flex';
            })
            .catch(e => console.error("Erro ao tocar:", e));
    },

    pause() {
        DOM.audioPlayer.pause();
        AppState.isPlaying = false;
        DOM.btnPlayPause.innerHTML = '<i class="fas fa-play"></i>';
        if(DOM.visualizer) DOM.visualizer.style.display = 'none';
    },

    toggle() {
        if (DOM.audioPlayer.paused) this.play();
        else this.pause();
    },

    next() {
        if (AppState.playlist.length === 0) return;
        let nextIndex = (AppState.currentMusicIndex + 1) % AppState.playlist.length;
        this.loadAndPlay(AppState.playlist[nextIndex].id);
    },

    prev() {
        if (AppState.playlist.length === 0) return;
        let prevIndex = (AppState.currentMusicIndex - 1 + AppState.playlist.length) % AppState.playlist.length;
        this.loadAndPlay(AppState.playlist[prevIndex].id);
    },

    // Atualiza a barra visual de progresso
    updateProgress() {
        const { currentTime, duration } = DOM.audioPlayer;
        if (!duration) return;
        const pct = (currentTime / duration) * 100;
        DOM.progressFill.style.width = `${pct}%`;
        DOM.currentTime.textContent = formatTime(currentTime);
    },

    playRandom() {
        if (AppState.playlist.length === 0) return;
        const randIndex = Math.floor(Math.random() * AppState.playlist.length);
        this.loadAndPlay(AppState.playlist[randIndex].id);
    }
};

// 3. GESTÃO DE DADOS (API) E RENDERIZAÇÃO
const Data = {
    // Busca as músicas no backend
    async load() {
        DOM.loadingIndicator.style.display = 'block';
        try {
            const res = await fetch(`${API_URL}/musicas`);
            if (!res.ok) throw new Error('Falha na conexão');
            AppState.playlist = await res.json();
            this.renderAll();
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            AppState.playlist = [];
            this.renderAll();
        } finally {
            DOM.loadingIndicator.style.display = 'none';
        }
    },

    // Renderiza as listas na Home e na página de Músicas
    renderAll() {
        const term = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const filtered = AppState.playlist.filter(m => 
            m.nome.toLowerCase().includes(term) || m.artista.toLowerCase().includes(term)
        );

        // Grid da Home (mostra as primeiras 8)
        if (DOM.homeGrid) {
            const destaques = AppState.playlist.slice(0, 8);
            DOM.homeGrid.innerHTML = destaques.length ? destaques.map(m => this.createCard(m)).join('') : '<p class="p-5 text-gray-500">Nenhuma música disponível.</p>';
        }

        // Grid da página de Pesquisa
        if (DOM.musicasGrid) {
            DOM.musicasGrid.innerHTML = filtered.map(m => this.createCard(m)).join('');
            if(DOM.emptyMusicas) {
                filtered.length === 0 ? DOM.emptyMusicas.classList.remove('hidden') : DOM.emptyMusicas.classList.add('hidden');
            }
        }

        // Atualiza números das estatísticas
        if(DOM.totalSongs) DOM.totalSongs.textContent = AppState.playlist.length;
        if(DOM.totalArtists) DOM.totalArtists.textContent = new Set(AppState.playlist.map(m => m.artista)).size;
    },

    // Cria o código HTML de cada card de música
    createCard(m) {
        return `
        <div class="music-card-modern bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition duration-300" 
             onclick="Player.loadAndPlay('${m.id}')" style="background: #1f1f1f; margin: 10px; border-radius: 10px;">
            <div class="relative" style="width: 100%; aspect-ratio: 1/1; overflow: hidden;">
                <img src="${formatUrl(m.capa_url)}" class="w-full h-full object-cover">
                <div class="overlay absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <i class="fas fa-play text-white text-3xl"></i>
                </div>
            </div>
            <div class="p-3">
                <div class="font-bold text-white truncate">${m.nome}</div>
                <div class="text-gray-400 text-sm truncate">${m.artista}</div>
            </div>
        </div>`;
    }
};

// 4. ÁREA ADMINISTRATIVA E LOGIN
const Admin = {
    init() {
        // Lógica de Login (CORRIGIDO: Agora usa .trim() e IDs corretos)
        if(DOM.loginForm) {
            DOM.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const u = document.getElementById('username').value.trim();
                const p = document.getElementById('password').value.trim();
                
                // Validação fixa solicitada
                if (u === 'admin' && p === '1234') {
                    localStorage.setItem('token', 'fake-jwt-token');
                    DOM.loginError.classList.add('hidden');
                    Navigation.goTo('admin');
                } else {
                    DOM.loginError.classList.remove('hidden');
                }
            });
        }

        // Botão de Sair
        if(DOM.btnLogout) {
            DOM.btnLogout.addEventListener('click', () => {
                localStorage.removeItem('token');
                Navigation.goTo('home');
            });
        }

        this.setupUploads();

        // Envio do Formulário de nova música
        if(DOM.adminForm) {
            DOM.adminForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = DOM.adminForm.querySelector('button[type="submit"]');
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

                try {
                    let audioUrl = document.getElementById('audio-url').value;
                    let coverUrl = document.getElementById('cover-url').value;

                    // Se escolheu arquivo local, converte para Base64 antes de enviar
                    if(AppState.audioFile) audioUrl = await fileToBase64(AppState.audioFile);
                    if(AppState.coverFile) coverUrl = await fileToBase64(AppState.coverFile);

                    const payload = {
                        nome: document.getElementById('music-name').value,
                        artista: document.getElementById('artist-name').value,
                        audio_url: audioUrl,
                        capa_url: coverUrl,
                        id: Date.now().toString()
                    };

                    const res = await fetch(`${API_URL}/musicas`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if(res.ok) {
                        alert('Sucesso! Música adicionada.');
                        DOM.adminForm.reset();
                        this.resetPreviews();
                        Data.load(); // Atualiza a lista global
                    }
                } catch (err) {
                    alert('Erro ao salvar. Verifique o servidor.');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        }
    },

    // Gerencia a seleção de arquivos (Áudio e Capa)
    setupUploads() {
        const audioArea = document.getElementById('audio-upload-area');
        if(audioArea) {
            audioArea.onclick = () => DOM.audioInput.click();
            DOM.audioInput.onchange = (e) => {
                const file = e.target.files[0];
                if(file) {
                    AppState.audioFile = file;
                    document.getElementById('audio-filename').textContent = file.name;
                    DOM.audioPlaceholder.classList.add('hidden');
                    DOM.audioPreview.classList.remove('hidden');
                }
            };
            DOM.btnRemoveAudio.onclick = (e) => {
                e.stopPropagation();
                AppState.audioFile = null;
                DOM.audioPreview.classList.add('hidden');
                DOM.audioPlaceholder.classList.remove('hidden');
            };
        }

        const coverArea = document.getElementById('cover-upload-area');
        if(coverArea) {
            coverArea.onclick = () => DOM.coverInput.click();
            DOM.coverInput.onchange = (e) => {
                const file = e.target.files[0];
                if(file) {
                    AppState.coverFile = file;
                    const reader = new FileReader();
                    reader.onload = (ev) => document.getElementById('cover-preview-img').src = ev.target.result;
                    reader.readAsDataURL(file);
                    DOM.coverPlaceholder.classList.add('hidden');
                    DOM.coverPreview.classList.remove('hidden');
                }
            };
            DOM.btnRemoveCover.onclick = (e) => {
                e.stopPropagation();
                AppState.coverFile = null;
                DOM.coverPreview.classList.add('hidden');
                DOM.coverPlaceholder.classList.remove('hidden');
            };
        }
    },

    // Limpa os previews após upload bem sucedido
    resetPreviews() {
        AppState.audioFile = null;
        AppState.coverFile = null;
        DOM.audioPreview?.classList.add('hidden');
        DOM.audioPlaceholder?.classList.remove('hidden');
        DOM.coverPreview?.classList.add('hidden');
        DOM.coverPlaceholder?.classList.remove('hidden');
    },

    // Mostra a lista de músicas para deletar no painel admin
    renderList() {
        if(!DOM.adminList) return;
        DOM.adminList.innerHTML = AppState.playlist.map(m => `
            <div class="flex items-center justify-between bg-gray-700 p-3 mb-2 rounded shadow">
                <div class="flex items-center gap-3">
                    <img src="${formatUrl(m.capa_url)}" class="w-10 h-10 rounded object-cover">
                    <div>
                        <div class="text-white font-bold text-sm">${m.nome}</div>
                        <div class="text-gray-400 text-xs">${m.artista}</div>
                    </div>
                </div>
                <button onclick="Admin.delete('${m.id}')" class="text-red-500 hover:text-red-700 p-2">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        DOM.emptyAdmin?.classList.toggle('hidden', AppState.playlist.length > 0);
    },

    // Excluir música do servidor
    async delete(id) {
        if(!confirm('Deseja realmente excluir esta música?')) return;
        try {
            await fetch(`${API_URL}/musicas/${id}`, { method: 'DELETE' });
            Data.load();
        } catch(e) {
            alert('Erro ao excluir do servidor.');
        }
    }
};

/* =========================================
   INICIALIZAÇÃO QUANDO A PÁGINA CARREGA
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    Navigation.init(); // Ativa menus
    Player.init();     // Ativa player
    Admin.init();      // Ativa formulários admin
    Data.load();       // Busca músicas iniciais

    // Ativa filtro de pesquisa em tempo real
    if(DOM.searchInput) {
        DOM.searchInput.addEventListener('input', () => Data.renderAll());
    }

    // Exporta funções para serem chamadas diretamente pelos botões no HTML (onclick)
    window.playRandomMusic = () => Player.playRandom();
    window.navigateTo = (page) => Navigation.goTo(page);
    window.Admin = Admin;
    window.Player = Player;
});