/* =========================================
   1. CONFIGURAÇÃO GLOBAL
   ========================================= */
const API_URL = 'https://mz-music-backend.onrender.com';

const AppState = {
    playlist: [],
    currentMusicIndex: 0,
    isPlaying: false,
    audioFile: null,
    coverFile: null
};

/* =========================================
   2. ELEMENTOS DO DOM (INTERFACE)
   ========================================= */
const DOM = {
    // Menus
    menuToggle: document.getElementById('menu-toggle'),
    mobileMenu: document.getElementById('mobile-menu'),
    navLinks: document.querySelectorAll('[data-page]'),
    pages: document.querySelectorAll('.page'),

    // Player
    audioPlayer: document.getElementById('audio-player'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    progressBar: document.getElementById('progress-bar'),
    progressFill: document.getElementById('progress-fill'),
    currentTime: document.getElementById('current-time'),
    durationTime: document.getElementById('duration-time'),
    playerTitle: document.getElementById('player-title'),
    playerArtist: document.getElementById('player-artist'),
    playerCover: document.getElementById('player-cover'),
    
    // --- VOLUME (CUSTOMIZADO DIVS) ---
    volumeBar: document.getElementById('volume-bar'),
    volumeFill: document.getElementById('volume-fill'),

    // Listas
    homeGrid: document.getElementById('home-music-grid'),
    musicasGrid: document.getElementById('musicas-grid'),
    searchInput: document.getElementById('search-input'),
    
    // Admin
    loginForm: document.getElementById('login-form'),
    adminForm: document.getElementById('admin-form'),
    adminList: document.getElementById('admin-music-list')
};

/* =========================================
   3. FUNÇÕES AUXILIARES
   ========================================= */
// Converte arquivo para Base64 (Texto)
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Formata URL para evitar erros de imagem
function formatUrl(path) {
    if (!path) return 'https://via.placeholder.com/300?text=Sem+Capa';
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;
    if (path.startsWith('http')) return path;
    return `${API_URL}${path.startsWith('/') ? path : '/' + path}`;
}

function formatTime(s) {
    if (isNaN(s)) return "0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

/* =========================================
   4. SISTEMA DE LOGIN
   ========================================= */
const Auth = {
    init() {
        if (DOM.loginForm) {
            DOM.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = document.getElementById('username').value;
                const p = document.getElementById('password').value;
                const btn = DOM.loginForm.querySelector('button');

                try {
                    btn.disabled = true;
                    btn.textContent = "Verificando...";

                    const res = await fetch(`${API_URL}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ usuario: u, senha: p })
                    });

                    const data = await res.json();

                    if (res.ok) {
                        localStorage.setItem('mz_token', data.token);
                        alert("Login realizado com sucesso!");
                        Navigation.goTo('admin');
                    } else {
                        alert(data.error || "Usuário ou senha incorretos");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Erro de conexão com o servidor.");
                } finally {
                    btn.disabled = false;
                    btn.textContent = "Entrar";
                }
            });
        }
        
        const btnLogout = document.getElementById('btn-logout');
        if(btnLogout) {
            btnLogout.addEventListener('click', () => {
                localStorage.removeItem('mz_token');
                Navigation.goTo('home');
            });
        }
    },
    isLogged: () => !!localStorage.getItem('mz_token')
};

/* =========================================
   5. NAVEGAÇÃO
   ========================================= */
const Navigation = {
    init() {
        if(DOM.menuToggle) {
            DOM.menuToggle.addEventListener('click', () => {
                DOM.mobileMenu.classList.toggle('active');
            });
        }

        DOM.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.goTo(page);
                if(DOM.mobileMenu) DOM.mobileMenu.classList.remove('active');
            });
        });
    },

    goTo(pageId) {
        if (pageId === 'admin' && !Auth.isLogged()) {
            alert("Faça login primeiro.");
            pageId = 'login';
        }
        
        DOM.pages.forEach(p => p.classList.add('hidden'));
        const target = document.getElementById(`page-${pageId}`);
        if(target) target.classList.remove('hidden');
        
        if (pageId === 'admin') Admin.renderList();
        window.scrollTo(0,0);
    }
};

/* =========================================
   6. PLAYER DE MÚSICA (VOLUME CORRIGIDO)
   ========================================= */
const Player = {
    init() {
        if(!DOM.audioPlayer) return;

        // --- LÓGICA DO VOLUME CUSTOMIZADO (DIVS) ---
        if (DOM.volumeBar) {
            // Volume inicial 100%
            DOM.audioPlayer.volume = 1;
            if(DOM.volumeFill) DOM.volumeFill.style.width = '100%';

            // Evento de CLIQUE na barra de volume
            DOM.volumeBar.addEventListener('click', (e) => {
                // 1. Pega largura total da barra
                const barWidth = DOM.volumeBar.clientWidth;
                // 2. Pega onde clicou
                const clickX = e.offsetX;
                
                // 3. Calcula porcentagem
                let volumePercent = clickX / barWidth;

                // 4. Limites de segurança
                if (volumePercent > 1) volumePercent = 1;
                if (volumePercent < 0) volumePercent = 0;

                // 5. Aplica
                DOM.audioPlayer.volume = volumePercent;

                // 6. Atualiza visual
                if(DOM.volumeFill) {
                    DOM.volumeFill.style.width = `${volumePercent * 100}%`;
                }
            });
        }

        // --- Controles Padrão ---
        DOM.btnPlayPause.addEventListener('click', () => this.toggle());
        DOM.btnNext.addEventListener('click', () => this.next());
        DOM.btnPrev.addEventListener('click', () => this.prev());

        // --- Barra de Progresso da Música ---
        DOM.audioPlayer.addEventListener('timeupdate', () => {
            const cur = DOM.audioPlayer.currentTime;
            const dur = DOM.audioPlayer.duration;
            if(dur) {
                DOM.progressFill.style.width = `${(cur/dur)*100}%`;
                DOM.currentTime.textContent = formatTime(cur);
                DOM.durationTime.textContent = formatTime(dur);
            }
        });

        DOM.audioPlayer.addEventListener('ended', () => this.next());
        
        DOM.progressBar.addEventListener('click', (e) => {
            const width = DOM.progressBar.clientWidth;
            const clickX = e.offsetX;
            const duration = DOM.audioPlayer.duration;
            if (duration) {
                DOM.audioPlayer.currentTime = (clickX / width) * duration;
            }
        });
    },

    load(index) {
        if(AppState.playlist.length === 0) return;
        
        if (index < 0) index = AppState.playlist.length - 1;
        if (index >= AppState.playlist.length) index = 0;

        AppState.currentMusicIndex = index;
        const music = AppState.playlist[index];

        DOM.playerTitle.textContent = music.nome;
        DOM.playerArtist.textContent = music.artista;
        DOM.playerCover.src = formatUrl(music.capa_url);
        DOM.audioPlayer.src = formatUrl(music.audio_url);

        this.play();
    },

    play() {
        DOM.audioPlayer.play().then(() => {
            AppState.isPlaying = true;
            DOM.btnPlayPause.innerHTML = '<i class="fas fa-pause"></i>'; 
        }).catch(err => {
            console.log("Aguardando interação...", err);
            AppState.isPlaying = false;
            DOM.btnPlayPause.innerHTML = '<i class="fas fa-play"></i>';
        });
    },

    toggle() {
        if(DOM.audioPlayer.paused) {
            this.play();
        } else {
            DOM.audioPlayer.pause();
            AppState.isPlaying = false;
            DOM.btnPlayPause.innerHTML = '<i class="fas fa-play"></i>';
        }
    },

    next() {
        if(AppState.playlist.length === 0) return;
        this.load(AppState.currentMusicIndex + 1);
    },

    prev() {
        if(AppState.playlist.length === 0) return;
        this.load(AppState.currentMusicIndex - 1);
    }
};

/* =========================================
   7. DADOS E LISTAGEM
   ========================================= */
const Data = {
    async load() {
        try {
            const res = await fetch(`${API_URL}/musicas`);
            if (!res.ok) throw new Error("Falha ao buscar músicas");
            
            const data = await res.json();
            AppState.playlist = data.reverse(); 
            this.render();
        } catch (e) {
            console.error("Erro ao carregar musicas", e);
            if(DOM.musicasGrid) DOM.musicasGrid.innerHTML = '<p class="text-white text-center">Erro ao carregar músicas.</p>';
        }
    },

    render() {
        if(DOM.homeGrid) {
            DOM.homeGrid.innerHTML = AppState.playlist.slice(0, 8).map((m) => this.card(m)).join('');
        }
        this.filter();
        this.attachEvents();
    },

    filter() {
        if(!DOM.musicasGrid) return;
        const term = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : '';
        const filtered = AppState.playlist.filter(m => 
            m.nome.toLowerCase().includes(term) || m.artista.toLowerCase().includes(term)
        );
        
        DOM.musicasGrid.innerHTML = filtered.map(m => this.card(m)).join('');
        this.attachEvents();
    },

    card(m) {
        return `
        <div class="music-card-click music-card-modern bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition duration-300 relative group" data-id="${m.id}">
            <div class="relative w-full aspect-square">
                <img src="${formatUrl(m.capa_url)}" class="w-full h-full object-cover" loading="lazy">
                <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <i class="fas fa-play text-white text-3xl"></i>
                </div>
            </div>
            <div class="p-3">
                <h3 class="text-white font-bold truncate">${m.nome}</h3>
                <p class="text-gray-400 text-sm truncate">${m.artista}</p>
            </div>
        </div>`;
    },

    attachEvents() {
        document.querySelectorAll('.music-card-click').forEach(card => {
            card.onclick = () => {
                const id = card.getAttribute('data-id');
                const idx = AppState.playlist.findIndex(m => String(m.id) === String(id));
                if(idx !== -1) Player.load(idx);
            };
        });
    }
};

/* =========================================
   8. ADMIN (COM MENSAGEM DE TOTAL DE MÚSICAS)
   ========================================= */
const Admin = {
    audioFile: null,
    coverFile: null,

    init() {
        console.log("Admin Painel Iniciado.");
        this.setupClicks();
    },

    renderList() {
        const listContainer = document.getElementById('admin-music-list');
        if (!listContainer) return;

        if (AppState.playlist.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma música cadastrada.</p>';
            return;
        }

        listContainer.innerHTML = AppState.playlist.map(m => `
            <div class="flex justify-between items-center bg-gray-700/50 p-3 rounded mb-2 border border-gray-600">
                <div class="flex items-center gap-3 overflow-hidden">
                    <img src="${formatUrl(m.capa_url)}" class="w-10 h-10 object-cover rounded bg-gray-900">
                    <div class="min-w-0">
                        <p class="text-white font-bold text-sm truncate">${m.nome}</p>
                        <p class="text-gray-400 text-xs truncate">${m.artista}</p>
                    </div>
                </div>
                <button onclick="Admin.deleteMusic('${m.id}')" class="text-red-500 hover:text-red-400 p-2 transition" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    },

    async deleteMusic(id) {
        if (!confirm("Tem certeza que deseja apagar esta música?")) return;
        
        const token = localStorage.getItem('mz_token');
        if(!token) {
            alert("Sessão expirada. Faça login novamente.");
            Navigation.goTo('login');
            return;
        }

        try {
            document.body.style.cursor = 'wait';
            const res = await fetch(`${API_URL}/musicas/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                alert("Música removida!");
                await Data.load(); 
                this.renderList(); 
            } else {
                const data = await res.json();
                alert("Erro ao deletar: " + (data.error || "Desconhecido"));
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão.");
        } finally {
            document.body.style.cursor = 'default';
        }
    },

    setupClicks() {
        const adminForm = document.getElementById('admin-form');
        if (adminForm) {
            adminForm.onsubmit = (e) => {
                e.preventDefault(); 
                this.save();
            };
        }

        // Uploads
        this.setupFileInput('audio-upload-area', 'audio-file', 'audio-preview', 'audio-placeholder', 'audio-filename', 'audio-size', 'remove-audio', 'audio-url', 'audio');
        this.setupFileInput('cover-upload-area', 'cover-file', 'cover-preview', 'cover-placeholder', null, null, 'remove-cover', 'cover-url', 'cover');
    },

    setupFileInput(areaId, inputId, previewId, placeholderId, nameId, sizeId, removeBtnId, urlInputId, type) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        const urlInput = document.getElementById(urlInputId);

        if (!area || !input) return;

        area.onclick = (e) => {
            if(e.target.id === removeBtnId) return; 
            input.click();
        };

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 10 * 1024 * 1024) { 
                    alert("⚠️ Arquivo grande! O envio pode demorar um pouco.");
                }

                if(type === 'audio') this.audioFile = file;
                if(type === 'cover') this.coverFile = file;

                if(nameId) document.getElementById(nameId).textContent = file.name;
                if(sizeId) document.getElementById(sizeId).textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
                
                if(type === 'cover') {
                     const reader = new FileReader();
                     reader.onload = (ev) => document.getElementById('cover-preview-img').src = ev.target.result;
                     reader.readAsDataURL(file);
                }

                document.getElementById(placeholderId).classList.add('hidden');
                document.getElementById(previewId).classList.remove('hidden');
                if(urlInput) urlInput.value = '';
            }
        };

        const btnRemove = document.getElementById(removeBtnId);
        if(btnRemove) {
            btnRemove.onclick = (e) => {
                e.stopPropagation();
                if(type === 'audio') this.audioFile = null;
                if(type === 'cover') this.coverFile = null;
                input.value = '';
                document.getElementById(previewId).classList.add('hidden');
                document.getElementById(placeholderId).classList.remove('hidden');
            };
        }
    },

    async save() {
        const btn = document.getElementById('btn-save');
        if(!btn) return;
        
        const token = localStorage.getItem('mz_token');
        if(!token) {
            alert("Sessão expirada. Faça login novamente.");
            Navigation.goTo('login');
            return;
        }

        const originalText = btn.innerHTML;
        const name = document.getElementById('music-name').value;
        const artist = document.getElementById('artist-name').value;
        const audioUrlVal = document.getElementById('audio-url') ? document.getElementById('audio-url').value : '';
        const coverUrlVal = document.getElementById('cover-url') ? document.getElementById('cover-url').value : '';

        if (!name || !artist || (!this.audioFile && !audioUrlVal)) {
            alert("Preencha Nome, Artista e Áudio.");
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Enviando... Aguarde...';

            let finalAudio = audioUrlVal;
            if (this.audioFile) finalAudio = await fileToBase64(this.audioFile);

            let finalCover = coverUrlVal;
            if (this.coverFile) finalCover = await fileToBase64(this.coverFile);

            const payload = {
                nome: name,
                artista: artist,
                audio_url: finalAudio,
                capa_url: finalCover
            };

            const res = await fetch(`${API_URL}/musicas`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json(); 

            if (res.ok) {
                // --- MOSTRA O TOTAL DE MÚSICAS NO ALERT ---
                alert(`✅ Sucesso! Música salva.\n📊 Total de músicas na plataforma: ${data.total_musicas}`);
                
                document.getElementById('admin-form').reset();
                this.audioFile = null;
                this.coverFile = null;
                
                document.getElementById('audio-preview').classList.add('hidden');
                document.getElementById('audio-placeholder').classList.remove('hidden');
                document.getElementById('cover-preview').classList.add('hidden');
                document.getElementById('cover-placeholder').classList.remove('hidden');
                
                await Data.load();
                this.renderList();
            } else {
                throw new Error(data.error || "Erro no servidor");
            }

        } catch (error) {
            console.error(error);
            if (error.message.includes("413")) {
                alert("ERRO: Arquivo muito pesado. Tente reduzir ou usar um Link.");
            } else {
                alert("ERRO: " + error.message);
            }
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

/* =========================================
   9. INICIALIZAÇÃO
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    Navigation.init();
    Auth.init();
    Player.init();
    Admin.init();
    Data.load();

    if(DOM.searchInput) {
        DOM.searchInput.addEventListener('input', () => Data.filter());
    }

    // Exporta para usar no onclick do HTML
    window.Admin = Admin;
    window.Player = Player;
    window.Navigation = Navigation;
});