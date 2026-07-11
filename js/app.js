import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGA3120Is6cytQF49ORZcZ2c9FLoqIB2o",
  authDomain: "celestial-universe-studio.firebaseapp.com",
  projectId: "celestial-universe-studio",
  storageBucket: "celestial-universe-studio.firebasestorage.app",
  messagingSenderId: "161155483826",
  appId: "1:161155483826:web:6ca29ec15180c96ee4e1ab",
  measurementId: "G-RJ7ESJT8TD"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

class CelestialApp {
    constructor() {
        this.obras = [];
        this.obraAtual = null;
        this.capituloAtualIdx = -1;
        this.usuarioLogado = null;
        this.unsubComentarios = null;
        this.unsubAvaliacoes = null; // NOVO: Controle das estrelas
        
        this.apelido = localStorage.getItem('celestial_apelido');
        this.corFlor = localStorage.getItem('celestial_cor_flor') || '0deg';
        this.favoritos = JSON.parse(localStorage.getItem('celestial_favoritos')) || [];
        this.historico = JSON.parse(localStorage.getItem('celestial_historico')) || {};
        
        this.audio = document.getElementById('bg-music');
        this.initAudio();
        this.init();
    }

    initAudio() {
        if (!this.audio) return;
        this.audio.muted = true;
        const volumeVisual = parseFloat(localStorage.getItem('musica_vol') || '0.5');
        this.audio.volume = volumeVisual * 0.5; 
        
        const btnMute = document.getElementById('btn-mute');
        const slider = document.getElementById('volume-slider');
        
        if (btnMute) {
            btnMute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            btnMute.onclick = () => {
                this.audio.muted = !this.audio.muted;
                btnMute.innerHTML = this.audio.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
                if (!this.audio.muted) this.audio.play().catch(e => console.log("Aguardando interação."));
            };
        }
        if (slider) {
            slider.value = volumeVisual;
            slider.oninput = (e) => {
                const volUser = parseFloat(e.target.value);
                this.audio.volume = volUser * 0.5;
                localStorage.setItem('musica_vol', volUser);
            };
        }
    }

    controlarMusica(tocar) {
        if (!this.audio) return;
        if (tocar && !this.audio.muted) {
            this.audio.play().catch(e => console.log("Aguardando interação do usuário."));
        } else {
            this.audio.pause();
        }
    }

    async init() {
        this.initDOMEvents();
        this.initLoginHibrido();
        this.initFirebaseAuthListen();
        
        this.atualizarUIUsuario(); 
        
        this.initSeletorFlor();
        await this.carregarDados();
        this.renderizarFiltrosGeneros(); // NOVO: Gera os botões de gêneros
        this.renderizarHome();
        this.renderizarBiblioteca(this.obras);
        this.renderizarFavoritos();
        
        document.body.addEventListener('click', () => this.controlarMusica(true), { once: true });
    }

    atualizarUIUsuario() {
        const profileNav = document.getElementById('user-profile-nav');
        const userPhoto = document.getElementById('user-photo-nav');
        const btnLoginMenu = document.getElementById('btn-login-menu');
        
        const commentLoggedOut = document.getElementById('comment-logged-out');
        const commentLoggedIn = document.getElementById('comment-logged-in');
        const userCommentAvatar = document.getElementById('user-comment-avatar');
        const userCommentName = document.getElementById('user-comment-name');
        
        if (this.usuarioLogado) {
            // Logado com Google
            if(btnLoginMenu) btnLoginMenu.style.display = 'none';
            if(profileNav) profileNav.style.display = 'flex';
            if(userPhoto) {
                userPhoto.src = this.usuarioLogado.photoURL;
                userPhoto.style.filter = 'none';
            }
            if(commentLoggedOut) commentLoggedOut.style.display = 'none';
            if(commentLoggedIn) commentLoggedIn.style.display = 'flex';
            if(userCommentAvatar) {
                userCommentAvatar.src = this.usuarioLogado.photoURL;
                userCommentAvatar.style.filter = 'none';
            }
            if(userCommentName) userCommentName.innerText = this.usuarioLogado.displayName;
            
            // Re-inicializar avaliação para pegar o voto do usuário caso já tenha aberto a obra
            if (this.obraAtual) this.inicializarAvaliacao(this.obraAtual.id);
            
        } else if (this.apelido) {
            // Logado com Apelido
            if(btnLoginMenu) btnLoginMenu.style.display = 'none';
            if(profileNav) profileNav.style.display = 'flex';
            if(userPhoto) {
                userPhoto.src = "imagem/flor-branca.png";
                userPhoto.style.filter = `hue-rotate(${this.corFlor}) saturate(200%) brightness(1.2)`;
            }
            if(commentLoggedOut) commentLoggedOut.style.display = 'none';
            if(commentLoggedIn) commentLoggedIn.style.display = 'flex';
            if(userCommentAvatar) {
                userCommentAvatar.src = "imagem/flor-branca.png";
                userCommentAvatar.style.filter = `hue-rotate(${this.corFlor}) saturate(200%) brightness(1.2)`;
            }
            if(userCommentName) userCommentName.innerText = this.apelido;
            if (this.obraAtual) this.inicializarAvaliacao(this.obraAtual.id);
        } else {
            // Deslogado
            if(btnLoginMenu) btnLoginMenu.style.display = 'flex';
            if(profileNav) profileNav.style.display = 'none';
            if(commentLoggedOut) commentLoggedOut.style.display = 'block';
            if(commentLoggedIn) commentLoggedIn.style.display = 'none';
            if (this.obraAtual) this.inicializarAvaliacao(this.obraAtual.id);
        }
    }

    initSeletorFlor() {
        const grid = document.getElementById('grid-cores');
        const preview = document.getElementById('preview-flor');
        if(!grid || !preview) return;

        preview.style.filter = `hue-rotate(${this.corFlor}) saturate(200%) brightness(1.2)`;

        grid.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const hue = (i * 30) + 'deg';
            const btn = document.createElement('div');
            btn.style.width = '25px';
            btn.style.height = '25px';
            btn.style.borderRadius = '50%';
            btn.style.cursor = 'pointer';
            btn.style.filter = `hue-rotate(${hue}) saturate(200%) brightness(1.2)`;
            btn.style.background = 'url("imagem/flor-branca.png") center/cover';
            btn.onclick = () => {
                this.corFlor = hue;
                localStorage.setItem('celestial_cor_flor', hue);
                preview.style.filter = `hue-rotate(${hue}) saturate(200%) brightness(1.2)`;
            };
            grid.appendChild(btn);
        }
    }

    initLoginHibrido() {
        const btnMenu = document.getElementById('btn-login-menu');
        const modal = document.getElementById('modal-login');
        if(btnMenu) btnMenu.onclick = () => modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
        
        document.getElementById('btn-login-interno').onclick = () => {
            const val = document.getElementById('input-apelido').value;
            if(val) { localStorage.setItem('celestial_apelido', val); this.apelido = val; location.reload(); }
        };

        document.getElementById('btn-login-google-modal').onclick = () => signInWithPopup(auth, googleProvider);
        if(this.apelido) document.getElementById('label-usuario').innerText = this.apelido;
    }

    logout() {
        if(this.usuarioLogado) signOut(auth).then(() => location.reload());
        else { localStorage.removeItem('celestial_apelido'); localStorage.removeItem('celestial_cor_flor'); location.reload(); }
    }

    initDOMEvents() {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.navegar(target);
                document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Delegação de eventos para os filtros principais (status)
        document.querySelectorAll('.filter-container:not(#filter-genres-container) .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-container:not(#filter-genres-container) .filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filtrarBiblioteca();
            });
        });

        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('input', () => this.filtrarBiblioteca());

        const btnComentar = document.getElementById('btn-enviar-comentario');
        if (btnComentar) btnComentar.addEventListener('click', () => this.enviarComentarioFirebase());

        window.addEventListener('scroll', () => {
            const leitorView = document.getElementById('view-leitor');
            const progresso = document.getElementById('leitor-progresso');
            if (leitorView && leitorView.classList.contains('active') && progresso) {
                const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
                const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrolled = (winScroll / height) * 100;
                progresso.style.width = scrolled + '%';
            }
        });
    }

    initFirebaseAuthListen() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.usuarioLogado = user;
                if(document.getElementById('modal-login')) document.getElementById('modal-login').style.display = 'none';
                this.atualizarUIUsuario();
            }
        });
    }

    async carregarDados() {
        this.obras = [
          { "id": "meu-destino-e-a-mestra-da-seita", "titulo": "Meu Destino é a Mestra da Seita", "autor": "Celestial J. Mo Tian", "status": "Em andamento", "generos": ["Diferença de idade", "Fantasia", "Romance", "Sem harém", "Dia a dia", "Sistema"], "sinopse": "Após perder tudo, Chen Yu desperta em um misterioso mundo de cultivo e acaba aparecendo no quarto da temida Mestra da Seita do Lótus Celestial, Lin Yue.", "pasta": "./obras/meu-destino-e-a-mestra-da-seita/", "capa": "./obras/meu-destino-e-a-mestra-da-seita/capa.png", "capitulos": [{ "numero": 1, "titulo": "Capítulo 1 - Parte 1", "arquivo": "capitulo-1-1.pdf" }, { "numero": 2, "titulo": "Capítulo 1 - Parte 2", "arquivo": "capitulo-1-2.pdf" }, { "numero": 3, "titulo": "Capítulo 1 - Parte 3", "arquivo": "capitulo-1-3.pdf" }] },
          { "id": "alem-do-nada", "titulo": "Além do Nada", "autor": "Celestial J. Mo Tian", "status": "Em andamento", "generos": ["Mistério", "Fantasia", "Sobrevivência", "Ancestral"], "sinopse": "Após uma explosão, um jovem desperta em um vazio absoluto.", "pasta": "./obras/alem-do-nada/", "capa": "./obras/alem-do-nada/capa.png", "capitulos": [{ "numero": 1, "titulo": "Capítulo 1", "arquivo": "capitulo-1.pdf" }, { "numero": 2, "titulo": "Capítulo 2", "arquivo": "capitulo-2.pdf" }, { "numero": 3, "titulo": "Capítulo 3", "arquivo": "capitulo-3.pdf" }] },
          { "id": "cronicas-do-vilao-do-caos", "titulo": "Crônicas do Vilão do Caos", "autor": "Celestial J. Mo Tian", "status": "Em andamento", "generos": ["Vilão", "Fantasia", "Cultivo", "Seitas", "Sistema"], "sinopse": "No mundo do cultivo, apenas os fortes têm o direito de sobreviver.", "pasta": "./obras/cronicas-do-vilao-do-caos/", "capa": "./obras/cronicas-do-vilao-do-caos/capa.png", "capitulos": [{ "numero": 1, "titulo": "Capítulo 1", "arquivo": "capitulo-1.pdf" },
             { "numero": 2, "titulo": "Capítulo 2", "arquivo": "capitulo-2.pdf" }] }
        ];
    }

    // NOVO: Geração dinâmica dos Filtros de Gêneros
    renderizarFiltrosGeneros() {
        const container = document.getElementById('filter-genres-container');
        if (!container) return;
        container.innerHTML = '';
        
        // Coletar todos os gêneros únicos
        const todosGeneros = new Set();
        this.obras.forEach(obra => obra.generos.forEach(g => todosGeneros.add(g)));
        const generosOrdenados = Array.from(todosGeneros).sort();

        // Botão padrão "Todos"
        const btnTodos = document.createElement('button');
        btnTodos.className = 'filter-btn genre-btn active';
        btnTodos.dataset.genero = 'todos';
        btnTodos.innerText = 'Todos os Gêneros';
        btnTodos.onclick = (e) => this.selecionarFiltroGenero(e.currentTarget);
        container.appendChild(btnTodos);

        // Gerar botão para cada gênero encontrado
        generosOrdenados.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn genre-btn';
            btn.dataset.genero = g;
            btn.innerText = g;
            btn.onclick = (e) => this.selecionarFiltroGenero(e.currentTarget);
            container.appendChild(btn);
        });
    }

    selecionarFiltroGenero(btnSelecionado) {
        document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
        btnSelecionado.classList.add('active');
        this.filtrarBiblioteca();
    }

    navegar(viewId) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            window.scrollTo({ top: 0 });
        }
        if (viewId === 'favoritos') this.renderizarFavoritos();
        if (viewId === 'inicio') this.renderizarHistoricoHome();
        
        // Limpar listeners quando sair da obra
        if (viewId !== 'obra') {
            if (this.unsubComentarios) { this.unsubComentarios(); this.unsubComentarios = null; }
            if (this.unsubAvaliacoes) { this.unsubAvaliacoes(); this.unsubAvaliacoes = null; }
        }
    }

    renderizarHome() {
        if (this.obras.length === 0) return;
        const destaque = this.obras[0];
        
        if(document.getElementById('banner-titulo')) document.getElementById('banner-titulo').innerText = destaque.titulo;
        if(document.getElementById('banner-sinopse')) document.getElementById('banner-sinopse').innerText = destaque.sinopse;
        
        const imgCapa = document.getElementById('banner-capa-img');
        if (imgCapa) imgCapa.src = destaque.capa;
        
        const btnBtn = document.getElementById('banner-btn');
        if (btnBtn) btnBtn.onclick = () => this.abrirObra(destaque.id);
        
        const gridDestaques = document.getElementById('grid-destaques');
        const gridRecentes = document.getElementById('grid-recentes');
        if (gridDestaques) { gridDestaques.innerHTML = ''; gridDestaques.appendChild(this.criarCardObra(this.obras[0])); }
        if (gridRecentes) { gridRecentes.innerHTML = ''; this.obras.forEach(obra => gridRecentes.appendChild(this.criarCardObra(obra))); }
        this.renderizarHistoricoHome();
    }

    renderizarHistoricoHome() {
        const section = document.getElementById('section-continue-lendo');
        const grid = document.getElementById('grid-historico-home');
        if (!section || !grid) return;
        const chavesHistorico = Object.keys(this.historico);
        const obrasNoHistorico = this.obras.filter(obra => chavesHistorico.includes(obra.id));
        if (obrasNoHistorico.length === 0) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        grid.innerHTML = '';
        obrasNoHistorico.forEach(obra => grid.appendChild(this.criarCardObra(obra, true)));
    }

    criarCardObra(obra, exibirBadgeHistorico = false) {
        const div = document.createElement('div');
        div.className = 'card-obra';
        div.setAttribute('data-id', obra.id);
        div.style.minHeight = "240px";
        let badgeHTML = '';
        if (this.historico[obra.id] !== undefined) {
            const capIdx = this.historico[obra.id];
            if (obra.capitulos[capIdx]) {
                const tituloCurto = obra.capitulos[capIdx].titulo.split(' - ')[0];
                if (exibirBadgeHistorico || document.querySelector('.filter-btn:not(.genre-btn).active')?.dataset.status === 'historico') {
                    badgeHTML = `<div class="badge-historico">Parou: ${tituloCurto}</div>`;
                }
            }
        }
        div.innerHTML = `<div class="card-capa-wrapper" style="background: #171717; position: relative; height: 180px;">${badgeHTML}<img src="${obra.capa}" alt="${obra.titulo}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="fallback-text" style="display:none; width:100%; height:100%; position:absolute; inset:0; align-items:center; justify-content:center; text-align:center; color:#D4AF37; font-size:0.8rem; font-weight:bold; padding:10px; line-height:1.2;">${obra.titulo}</div></div><div class="card-info" style="padding: 10px;"><h4 style="font-size:0.85rem; margin:0; color:#F5F5F5; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${obra.titulo}</h4><p style="font-size:0.75rem; color:#A0A0A0; margin:2px 0 0 0;">${obra.autor}</p></div>`;
        div.onclick = () => this.abrirObra(obra.id);
        return div;
    }

    renderizarBiblioteca(lista) {
        const grid = document.getElementById('grid-biblioteca');
        if (!grid) return;
        grid.innerHTML = '';
        if (lista.length === 0) { grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #A0A0A0; margin-top: 40px;">Nenhuma obra encontrada com estes filtros.</p>`; return; }
        lista.forEach(obra => grid.appendChild(this.criarCardObra(obra)));
    }

    renderizarFavoritos() {
        const grid = document.getElementById('grid-favoritos');
        if (!grid) return;
        grid.innerHTML = '';
        const obrasFavoritadas = this.obras.filter(obra => this.favoritos.includes(obra.id));
        if (obrasFavoritadas.length === 0) { grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #8E929A; margin-top: 50px; font-size:0.9rem;">Nenhuma obra favoritada ainda.</p>`; return; }
        obrasFavoritadas.forEach(obra => grid.appendChild(this.criarCardObra(obra)));
    }

    alternarFavorito(obraId) {
        if (!this.usuarioLogado && !this.apelido) return alert("Faça login ou defina um apelido para favoritar!");
        const index = this.favoritos.indexOf(obraId);
        if (index > -1) this.favoritos.splice(index, 1);
        else this.favoritos.push(obraId);
        localStorage.setItem('celestial_favoritos', JSON.stringify(this.favoritos));
        this.atualizarBotaoFavorito(obraId);
        this.renderizarFavoritos();
    }

    atualizarBotaoFavorito(obraId) {
        const btn = document.getElementById('btn-favoritar-obra');
        if (!btn) return;
        if (this.favoritos.includes(obraId)) { btn.classList.add('active'); btn.innerHTML = `<i class="fa-solid fa-heart"></i>`; }
        else { btn.classList.remove('active'); btn.innerHTML = `<i class="fa-regular fa-heart"></i>`; }
    }

    filtrarBiblioteca() {
        const queryInput = document.getElementById('search-input');
        const queryTerm = queryInput ? queryInput.value.toLowerCase() : "";
        
        // Coleta status (Andamento, Concluído, etc)
        const btnStatusAtivo = document.querySelector('.filter-container:not(#filter-genres-container) .filter-btn.active');
        const statusAtivo = btnStatusAtivo ? btnStatusAtivo.dataset.status : "todos";
        
        // Coleta Gênero (Novo)
        const btnGeneroAtivo = document.querySelector('.genre-btn.active');
        const generoAtivo = btnGeneroAtivo ? btnGeneroAtivo.dataset.genero : "todos";

        const filtradas = this.obras.filter(obra => {
            // Regra de Texto
            const correspondeQuery = obra.titulo.toLowerCase().includes(queryTerm) || obra.autor.toLowerCase().includes(queryTerm);
            
            // Regra de Status
            let correspondeStatus = false;
            if (statusAtivo === 'todos') correspondeStatus = true;
            else if (statusAtivo === 'historico') correspondeStatus = Object.keys(this.historico).includes(obra.id);
            else correspondeStatus = (obra.status === statusAtivo);
            
            // Regra de Gênero
            let correspondeGenero = true;
            if (generoAtivo !== 'todos') correspondeGenero = obra.generos.includes(generoAtivo);

            return correspondeQuery && correspondeStatus && correspondeGenero;
        });
        this.renderizarBiblioteca(filtradas);
    }

    // NOVO: Sistema de Avaliação Estrelas
    inicializarAvaliacao(obraId) {
        const starsDisplay = document.getElementById('stars-display');
        const msg = document.getElementById('rating-msg');
        const mediaDisplay = document.getElementById('rating-media');
        
        // Reseta visual da UI
        this.resetarEstrelasUI();
        msg.innerText = "Carregando...";
        mediaDisplay.innerText = "0.0";
        starsDisplay.classList.remove('interactive');
        
        if (this.unsubAvaliacoes) this.unsubAvaliacoes();

        // Leitura em tempo real do banco de dados (coleção avaliacoes)
        const avaliacoesRef = collection(db, `obras/${obraId}/avaliacoes`);
        this.unsubAvaliacoes = onSnapshot(avaliacoesRef, (snapshot) => {
            
            if (snapshot.empty) {
                mediaDisplay.innerText = "0.0";
                if (!this.usuarioLogado) {
                    msg.innerText = "Faça login com Google para avaliar.";
                } else {
                    msg.innerText = "Seja o primeiro a avaliar!";
                    this.habilitarVotoUI(obraId);
                }
                return;
            }

            let totalNotas = 0;
            let votoUsuario = null;

            // Calcula a média e checa se o usuário atual votou
            snapshot.forEach(doc => {
                const data = doc.data();
                totalNotas += data.nota;
                if (this.usuarioLogado && doc.id === this.usuarioLogado.uid) {
                    votoUsuario = data.nota;
                }
            });

            const media = (totalNotas / snapshot.size).toFixed(1);
            mediaDisplay.innerText = media;

            // Organiza as mensagens e libera a votação
            if (!this.usuarioLogado) {
                msg.innerText = "Faça login com Google para avaliar.";
                starsDisplay.classList.remove('interactive');
            } else if (votoUsuario) {
                msg.innerText = `Você avaliou com ${votoUsuario} estrelas.`;
                this.mostrarVotoSalvoUI(votoUsuario);
            } else {
                msg.innerText = "Deixe sua avaliação!";
                this.habilitarVotoUI(obraId);
            }
        });
    }

    habilitarVotoUI(obraId) {
        const starsDisplay = document.getElementById('stars-display');
        starsDisplay.classList.add('interactive');
        
        const estrelas = starsDisplay.querySelectorAll('i');
        
        // Remove listeners antigos (clone node)
        estrelas.forEach(estrela => {
            const clone = estrela.cloneNode(true);
            estrela.parentNode.replaceChild(clone, estrela);
        });
        
        // Adiciona interatividade
        const novasEstrelas = starsDisplay.querySelectorAll('i');
        novasEstrelas.forEach(estrela => {
            estrela.addEventListener('mouseover', (e) => this.destacarEstrelasUI(e.target.dataset.value));
            estrela.addEventListener('mouseout', () => this.resetarEstrelasUI());
            estrela.addEventListener('click', (e) => this.votarFirebase(obraId, e.target.dataset.value));
        });
    }

    destacarEstrelasUI(valor) {
        const estrelas = document.querySelectorAll('#stars-display i');
        estrelas.forEach(estrela => {
            if (parseInt(estrela.dataset.value) <= parseInt(valor)) {
                estrela.classList.add('fa-solid');
                estrela.classList.remove('fa-regular');
                estrela.style.color = 'var(--gold)';
            } else {
                estrela.classList.remove('fa-solid');
                estrela.classList.add('fa-regular');
                estrela.style.color = '';
            }
        });
    }

    resetarEstrelasUI() {
        const estrelas = document.querySelectorAll('#stars-display i');
        estrelas.forEach(estrela => {
            estrela.classList.remove('fa-solid');
            estrela.classList.add('fa-regular');
            estrela.style.color = '';
        });
    }

    mostrarVotoSalvoUI(nota) {
        const starsDisplay = document.getElementById('stars-display');
        starsDisplay.classList.remove('interactive');
        
        // Remove os eventos de click para impedir mudança
        const estrelas = starsDisplay.querySelectorAll('i');
        estrelas.forEach(estrela => {
            const clone = estrela.cloneNode(true);
            starsDisplay.replaceChild(clone, estrela);
        });

        // Preenche apenas as estrelas da nota dada pelo usuário
        const novasEstrelas = starsDisplay.querySelectorAll('i');
        novasEstrelas.forEach(estrela => {
            if (parseInt(estrela.dataset.value) <= nota) {
                estrela.classList.add('fa-solid');
                estrela.classList.remove('fa-regular');
                estrela.style.color = 'var(--gold)';
            } else {
                estrela.classList.remove('fa-solid');
                estrela.classList.add('fa-regular');
                estrela.style.color = '';
            }
        });
    }

    async votarFirebase(obraId, nota) {
        if (!this.usuarioLogado) {
            alert("Você precisa fazer login com o Google para avaliar!");
            return;
        }
        try {
            // Salva um documento com o UID do usuário. Garante apenas 1 voto por perfil.
            const avaliacaoRef = doc(db, `obras/${obraId}/avaliacoes`, this.usuarioLogado.uid);
            await setDoc(avaliacaoRef, {
                nota: parseInt(nota),
                data: new Date().getTime()
            });
            // O update na UI será automático via onSnapshot que já declaramos na função inicializarAvaliacao
        } catch (error) {
            console.error("Erro ao salvar avaliação", error);
            alert("Erro ao enviar avaliação. As regras de escrita do Firestore estão liberadas?");
        }
    }

    escutarComentariosFirebase(obraId) {
        if (this.unsubComentarios) this.unsubComentarios();
        const containerLista = document.getElementById('container-comentarios-lista');
        const q = query(collection(db, `obras/${obraId}/comentarios`), orderBy("dataCriacao", "asc"));
        
        this.unsubComentarios = onSnapshot(q, (snapshot) => {
            if (!containerLista) return;
            containerLista.innerHTML = '';
            
            if (snapshot.empty) { 
                containerLista.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 15px 0;">Seja o primeiro a comentar!</p>`; 
                return; 
            }
            
            snapshot.forEach((doc) => {
                const dados = doc.data();
                const itemDiv = document.createElement('div');
                itemDiv.className = 'card-comentario-item';
                
                const filtroCSS = dados.corFlor ? `filter: hue-rotate(${dados.corFlor}) saturate(200%) brightness(1.2);` : '';
                
                itemDiv.innerHTML = `
                    <img src="${dados.userFoto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.05); ${filtroCSS}">
                    <div style="flex:1;">
                        <div>
                            <span class="comment-user-name">${dados.userName}</span>
                            <span class="comment-date">${dados.dataString || ''}</span>
                        </div>
                        <p class="comment-text-body">${dados.texto}</p>
                    </div>
                `;
                containerLista.appendChild(itemDiv);
            });
        }, (err) => console.error("Erro Firestore:", err));
    }

    async enviarComentarioFirebase() {
        if (!this.usuarioLogado && !this.apelido) return alert("Você precisa definir um apelido ou fazer login para comentar.");
        const input = document.getElementById('input-comentario');
        if (!input || !this.obraAtual) return;
        const textoComentario = input.value.trim();
        if (textoComentario === '') return;
        
        try {
            const dataAtual = new Date();
            const formatarData = `${String(dataAtual.getDate()).padStart(2, '0')}/${String(dataAtual.getMonth() + 1).padStart(2, '0')}/${dataAtual.getFullYear()}`;
            
            const uid = this.usuarioLogado ? this.usuarioLogado.uid : 'anon_' + Date.now();
            const nome = this.usuarioLogado ? this.usuarioLogado.displayName : this.apelido;
            const foto = this.usuarioLogado ? this.usuarioLogado.photoURL : 'imagem/flor-branca.png';
            const cor = this.usuarioLogado ? null : this.corFlor;

            await addDoc(collection(db, `obras/${this.obraAtual.id}/comentarios`), {
                texto: textoComentario, 
                userId: uid, 
                userName: nome, 
                userFoto: foto, 
                corFlor: cor, 
                dataCriacao: dataAtual.getTime(), 
                dataString: formatarData
            });
            input.value = '';
        } catch (e) { 
            alert("Erro ao enviar comentário. Verifique as suas Regras do Firestore!"); 
            console.error(e); 
        }
    }

    abrirObra(id) {
        const obra = this.obras.find(o => o.id === id);
        if (!obra) return;
        this.obraAtual = obra;
        if(document.getElementById('obra-hero-bg')) document.getElementById('obra-hero-bg').style.backgroundImage = `url('${obra.capa}')`;
        const imgCapa = document.getElementById('obra-capa');
        if(imgCapa) imgCapa.src = obra.capa;
        if(document.getElementById('obra-titulo')) document.getElementById('obra-titulo').innerText = obra.titulo;
        if(document.getElementById('obra-autor')) document.getElementById('obra-autor').innerText = obra.autor;
        if(document.getElementById('obra-status')) document.getElementById('obra-status').innerText = obra.status;
        if(document.getElementById('obra-caps-count')) document.getElementById('obra-caps-count').innerText = obra.capitulos.length;
        if(document.getElementById('obra-sinopse')) document.getElementById('obra-sinopse').innerText = obra.sinopse;
        this.atualizarBotaoFavorito(obra.id);
        const btnFav = document.getElementById('btn-favoritar-obra');
        if (btnFav) btnFav.onclick = () => this.alternarFavorito(obra.id);
        const containerGeneros = document.getElementById('obra-generos');
        if (containerGeneros) {
            containerGeneros.innerHTML = '';
            obra.generos.forEach(g => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.innerText = g;
                containerGeneros.appendChild(span);
            });
        }
        const containerCaps = document.getElementById('lista-capitulos');
        if (containerCaps) {
            containerCaps.innerHTML = '';
            obra.capitulos.forEach((cap, index) => {
                const row = document.createElement('div');
                row.className = 'chapter-row';
                const lendoTexto = (this.historico[obra.id] === index) ? ' <span style="font-size:0.75rem; color:#D4AF37; margin-left:8px;">(Parou aqui)</span>' : '';
                row.innerHTML = `<span class="chapter-title">${cap.titulo}${lendoTexto}</span><i class="fa-solid fa-chevron-right gold" style="font-size: 0.8rem;"></i>`;
                row.onclick = () => this.abrirLeitor(index);
                containerCaps.appendChild(row);
            });
        }
        const btnLerHero = document.getElementById('btn-ler-agora-hero');
        if (btnLerHero) {
            btnLerHero.onclick = () => {
                if (this.historico[obra.id] !== undefined) this.abrirLeitor(this.historico[obra.id]);
                else if (obra.capitulos.length > 0) this.abrirLeitor(0);
            };
        }
        
        this.inicializarAvaliacao(obra.id); // Inicia as estrelas
        this.escutarComentariosFirebase(obra.id); // Inicia os comentários
        this.navegar('obra');
    }

    abrirLeitor(capIndex) {
        this.controlarMusica(false); 
        if (!this.obraAtual || !this.obraAtual.capitulos[capIndex]) return;
        this.capituloAtualIdx = capIndex;
        const cap = this.obraAtual.capitulos[capIndex];
        this.historico[this.obraAtual.id] = capIndex;
        localStorage.setItem('celestial_historico', JSON.stringify(this.historico));
        if(document.getElementById('leitor-titulo-obra')) document.getElementById('leitor-titulo-obra').innerText = cap.titulo;
        const viewport = document.getElementById('reader-viewport');
        if (!viewport) return;
        viewport.innerHTML = `<iframe src="${this.obraAtual.pasta}${cap.arquivo}" style="width:100%; height:88vh; border:none;" title="${cap.titulo}"></iframe>`;
        const btnAnt = document.getElementById('btn-cap-anterior');
        const btnProx = document.getElementById('btn-cap-proximo');
        if (btnAnt && btnProx) {
            btnAnt.disabled = capIndex === 0;
            btnProx.disabled = capIndex === this.obraAtual.capitulos.length - 1;
            btnAnt.onclick = () => this.abrirLeitor(capIndex - 1);
            btnProx.onclick = () => this.abrirLeitor(capIndex + 1);
        }
        this.navegar('leitor');
    }

    voltarParaObra() { 
        this.controlarMusica(true); 
        if (this.obraAtual) this.abrirObra(this.obraAtual.id); 
    }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new CelestialApp(); });
