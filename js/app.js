// Importação Dinâmica via CDN para rodar perfeitamente direto no Navegador/Acode
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Suas credenciais oficiais geradas no console do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDGA3120Is6cytQF49ORZcZ2c9FLoqIB2o",
  authDomain: "celestial-universe-studio.firebaseapp.com",
  projectId: "celestial-universe-studio",
  storageBucket: "celestial-universe-studio.firebasestorage.app",
  messagingSenderId: "161155483826",
  appId: "1:161155483826:web:6ca29ec15180c96ee4e1ab",
  measurementId: "G-RJ7ESJT8TD"
};

// Inicialização do Ecossistema Firebase
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
        this.unsubComentarios = null; // Guardará o encerramento do listener ativo do Firestore
        
        // Carregamento dos dados locais persistidos no navegador
        this.favoritos = JSON.parse(localStorage.getItem('celestial_favoritos')) || [];
        this.historico = JSON.parse(localStorage.getItem('celestial_historico')) || {}; // Estrutura: { "id-da-obra": indexDoCapitulo }
        this.init();
    }

    async init() {
        this.initDOMEvents();
        this.initFirebaseAuthListen();
        await this.carregarDados();
        this.renderizarHome();
        this.renderizarBiblioteca(this.obras);
        this.renderizarFavoritos();
    }

    initDOMEvents() {
        // Navegação do Menu Inferior SPA
        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.navegar(target);
                document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Eventos de Filtros por Categoria/Status na Biblioteca
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filtrarBiblioteca();
            });
        });

        // Pesquisa Dinâmica Instantânea na Biblioteca
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filtrarBiblioteca());
        }

        // Envio de novo comentário para a nuvem
        const btnComentar = document.getElementById('btn-enviar-comentario');
        if (btnComentar) {
            btnComentar.addEventListener('click', () => this.enviarComentarioFirebase());
        }

        // Login pelo botão da barra superior
        const btnLoginTop = document.getElementById('btn-login-google');
        if (btnLoginTop) {
            btnLoginTop.addEventListener('click', () => this.loginGoogle());
        }

        // Monitoramento da barra de rolagem para o progresso do Leitor Vertical
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

    // Escutador que monitora o estado de Login/Logout do Google
    initFirebaseAuthListen() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.usuarioLogado = user;
                // Ajustes visuais na barra superior (Top Bar)
                if (document.getElementById('btn-login-google')) document.getElementById('btn-login-google').style.display = 'none';
                if (document.getElementById('user-profile-nav')) document.getElementById('user-profile-nav').style.display = 'flex';
                if (document.getElementById('user-photo-nav')) document.getElementById('user-photo-nav').src = user.photoURL;
                
                // Ajustes visuais na caixa de comentários da obra
                if (document.getElementById('comment-logged-out')) document.getElementById('comment-logged-out').style.display = 'none';
                if (document.getElementById('comment-logged-in')) document.getElementById('comment-logged-in').style.display = 'flex';
                if (document.getElementById('user-comment-avatar')) document.getElementById('user-comment-avatar').src = user.photoURL;
                if (document.getElementById('user-comment-name')) document.getElementById('user-comment-name').innerText = user.displayName;
            } else {
                this.usuarioLogado = null;
                if (document.getElementById('btn-login-google')) document.getElementById('btn-login-google').style.display = 'flex';
                if (document.getElementById('user-profile-nav')) document.getElementById('user-profile-nav').style.display = 'none';
                
                if (document.getElementById('comment-logged-out')) document.getElementById('comment-logged-out').style.display = 'block';
                if (document.getElementById('comment-logged-in')) document.getElementById('comment-logged-in').style.display = 'none';
            }
        });
    }

    async loginGoogle() {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Erro na autenticação social Google:", error);
            alert("Não foi possível conectar com o Google. Lembre-se de rodar seu projeto em um servidor interno no Acode (botão Play) para o login funcionar.");
        }
    }

    async carregarDados() {
        this.obras = [
          {
            "id": "meu-destino-e-a-mestra-da-seita",
            "titulo": "Meu Destino é a Mestra da Seita",
            "autor": "Celestial J. Mo Tian",
            "status": "Em andamento",
            "generos": ["Diferença de idade", "Fantasia", "Romance", "Sem harém", "Dia a dia", "Sistema"],
            "sinopse": "Após perder tudo, Chen Yu desperta em um misterioso mundo de cultivo e acaba aparecendo no quarto da temida Mestra da Seita do Lótus Celestial, Lin Yue. Um encontro inesperado dá início a um vínculo capaz de unir dois mundos completamente diferentes.",
            "pasta": "./obras/meu-destino-e-a-mestra-da-seita/",
            "capa": "./obras/meu-destino-e-a-mestra-da-seita/capa.png", 
            "capitulos": [
              { "numero": 1, "titulo": "Capítulo 1 - Parte 1", "arquivo": "capitulo-1-1.pdf" },
              { "numero": 2, "titulo": "Capítulo 1 - Parte 2", "arquivo": "capitulo-1-2.pdf" },
              { "numero": 3, "titulo": "Capítulo 1 - Parte 3", "arquivo": "capitulo-1-3.pdf" }
            ]
          },
          {
            "id": "alem-do-nada",
            "titulo": "Além do Nada",
            "autor": "Celestial J. Mo Tian",
            "status": "Em andamento",
            "generos": ["Mistério", "Fantasia", "Sobrevivência", "Ancestral"],
            "sinopse": "Após uma explosão, um jovem desperta em um vazio absoluto, onde o tempo perde o sentido e a solidão ameaça consuming sua própria existência. Quando finalmente desperta em uma misteriosa aldeia cercada por uma floresta ancestral, ele recebe uma nova chance de viver sob o nome de Ybirá.",
            "pasta": "./obras/alem-do-nada/",
            "capa": "./obras/alem-do-nada/capa.png", 
            "capitulos": [
              { "numero": 1, "titulo": "Capítulo 1", "arquivo": "capitulo-1.pdf" },
              { "numero": 2, "titulo": "Capítulo 2", "arquivo": "capitulo-2.pdf" },
              { "numero": 3, "titulo": "Capítulo 3", "arquivo": "capitulo-3.pdf" }
            ]
          }
        ];
    }

    navegar(viewId) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            window.scrollTo({ top: 0 });
        }
        
        // Atualizações em tempo real ao transicionar entre seções
        if (viewId === 'favoritos') this.renderizarFavoritos();
        if (viewId === 'inicio') this.renderizarHistoricoHome();

        // Remove escutas de banco de dados se o usuário deixar a visualização da obra
        if (viewId !== 'obra' && this.unsubComentarios) {
            this.unsubComentarios();
            this.unsubComentarios = null;
        }
    }

    renderizarHome() {
        if (this.obras.length === 0) return;
        const destaque = this.obras[0];
        
        if(document.getElementById('banner-titulo')) document.getElementById('banner-titulo').innerText = destaque.titulo;
        if(document.getElementById('banner-sinopse')) document.getElementById('banner-sinopse').innerText = destaque.sinopse;
        
        const banner = document.getElementById('banner-principal');
        if (banner) banner.style.backgroundImage = `url('${destaque.capa}')`;

        const btnBtn = document.getElementById('banner-btn');
        if (btnBtn) btnBtn.onclick = () => this.abrirObra(destaque.id);

        const gridDestaques = document.getElementById('grid-destaques');
        const gridRecentes = document.getElementById('grid-recentes');
        
        if (gridDestaques) {
            gridDestaques.innerHTML = '';
            gridDestaques.appendChild(this.criarCardObra(this.obras[0]));
        }
        
        if (gridRecentes) {
            gridRecentes.innerHTML = '';
            this.obras.forEach(obra => gridRecentes.appendChild(this.criarCardObra(obra)));
        }
        this.renderizarHistoricoHome();
    }

    // Renderiza a seção de histórico "Continue Lendo" localizada no topo da Home
    renderizarHistoricoHome() {
        const section = document.getElementById('section-continue-lendo');
        const grid = document.getElementById('grid-historico-home');
        if (!section || !grid) return;

        const chavesHistorico = Object.keys(this.historico);
        const obrasNoHistorico = this.obras.filter(obra => chavesHistorico.includes(obra.id));

        if (obrasNoHistorico.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        grid.innerHTML = '';
        obrasNoHistorico.forEach(obra => grid.appendChild(this.criarCardObra(obra, true)));
    }

    // Criação dos cards de obras com gerenciamento dinâmico de rótulo (badge) de progresso
    criarCardObra(obra, exibirBadgeHistorico = false) {
        const div = document.createElement('div');
        div.className = 'card-obra';
        div.setAttribute('data-id', obra.id);
        div.style.minHeight = "240px";
        
        let badgeHTML = '';
        // Injeta a etiqueta com o nome do capítulo salvo se houver histórico da obra
        if (this.historico[obra.id] !== undefined) {
            const capIdx = this.historico[obra.id];
            if (obra.capitulos[capIdx]) {
                const tituloCurto = obra.capitulos[capIdx].titulo.split(' - ')[0]; // Deixa mais compacto para caber no card
                if (exibirBadgeHistorico || document.querySelector('.filter-btn.active')?.dataset.status === 'historico') {
                    badgeHTML = `<div class="badge-historico">Parou: ${tituloCurto}</div>`;
                }
            }
        }
        
        div.innerHTML = `
            <div class="card-capa-wrapper" style="background: #171717; position: relative; height: 180px;">
                ${badgeHTML}
                <img src="${obra.capa}" alt="${obra.titulo}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="fallback-text" style="display:none; width:100%; height:100%; position:absolute; inset:0; align-items:center; justify-content:center; text-align:center; color:#D4AF37; font-size:0.8rem; font-weight:bold; padding:10px; line-height:1.2;">${obra.titulo}</div>
            </div>
            <div class="card-info" style="padding: 10px;">
                <h4 style="font-size:0.85rem; margin:0; color:#F5F5F5; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${obra.titulo}</h4>
                <p style="font-size:0.75rem; color:#A0A0A0; margin:2px 0 0 0;">${obra.autor}</p>
            </div>
        `;
        
        div.onclick = () => this.abrirObra(obra.id);
        return div;
    }

    renderizarBiblioteca(lista) {
        const grid = document.getElementById('grid-biblioteca');
        if (!grid) return;
        grid.innerHTML = '';
        if (lista.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #A0A0A0; margin-top: 40px;">Nenhuma obra encontrada.</p>`;
            return;
        }
        lista.forEach(obra => grid.appendChild(this.criarCardObra(obra)));
    }

    renderizarFavoritos() {
        const grid = document.getElementById('grid-favoritos');
        if (!grid) return;
        grid.innerHTML = '';
        const obrasFavoritadas = this.obras.filter(obra => this.favoritos.includes(obra.id));
        if (obrasFavoritadas.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #8E929A; margin-top: 50px; font-size:0.9rem;">Nenhuma obra favoritada ainda.</p>`;
            return;
        }
        obrasFavoritadas.forEach(obra => grid.appendChild(this.criarCardObra(obra)));
    }

    alternarFavorito(obraId) {
        const index = this.favoritos.indexOf(obraId);
        if (index > -1) {
            this.favoritos.splice(index, 1);
        } else {
            this.favoritos.push(obraId);
        }
        localStorage.setItem('celestial_favoritos', JSON.stringify(this.favoritos));
        this.atualizarBotaoFavorito(obraId);
        this.renderizarFavoritos();
    }

    atualizarBotaoFavorito(obraId) {
        const btn = document.getElementById('btn-favoritar-obra');
        if (!btn) return;
        if (this.favoritos.includes(obraId)) {
            btn.classList.add('active');
            btn.innerHTML = `<i class="fa-solid fa-heart"></i>`;
        } else {
            btn.classList.remove('active');
            btn.innerHTML = `<i class="fa-regular fa-heart"></i>`;
        }
    }

    filtrarBiblioteca() {
        const queryInput = document.getElementById('search-input');
        const query = queryInput ? queryInput.value.toLowerCase() : "";
        const btnAtivo = document.querySelector('.filter-btn.active');
        const statusAtivo = btnAtivo ? btnAtivo.dataset.status : "todos";

        const filtradas = this.obras.filter(obra => {
            const correspondeQuery = 
                obra.titulo.toLowerCase().includes(query) ||
                obra.autor.toLowerCase().includes(query) ||
                obra.generos.some(g => g.toLowerCase().includes(query));
            
            let correspondeStatus = false;
            if (statusAtivo === 'todos') {
                correspondeStatus = true;
            } else if (statusAtivo === 'historico') {
                // Filtra trazendo unicamente os títulos presentes no histórico de leitura
                correspondeStatus = Object.keys(this.historico).includes(obra.id);
            } else {
                correspondeStatus = (obra.status === statusAtivo);
            }
            return correspondeQuery && correspondeStatus;
        });
        this.renderizarBiblioteca(filtradas);
    }

    // ESCUTADOR EM TEMPO REAL DE COMENTÁRIOS GLOBAIS VIA CLOUD FIRESTORE
    escutarComentariosFirebase(obraId) {
        if (this.unsubComentarios) this.unsubComentarios();
        
        const containerLista = document.getElementById('container-comentarios-lista');
        
        // Consulta ordenando os comentários do banco do mais antigo ao mais recente (ordem cronológica)
        const q = query(collection(db, `obras/${obraId}/comentarios`), orderBy("dataCriacao", "asc"));
        
        this.unsubComentarios = onSnapshot(q, (snapshot) => {
            if (!containerLista) return;
            containerLista.innerHTML = '';
            
            if (snapshot.empty) {
                containerLista.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 15px 0;">Seja o primeiro a deixar um comentário sobre esta obra!</p>`;
                return;
            }
            
            snapshot.forEach((doc) => {
                const dados = doc.data();
                const itemDiv = document.createElement('div');
                itemDiv.className = 'card-comentario-item';
                
                itemDiv.innerHTML = `
                    <img src="${dados.userFoto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.05);">
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
        }, (error) => {
            console.error("Erro na escuta do Firestore Database: ", error);
            if(containerLista) containerLista.innerHTML = `<p style="color:red; font-size:0.8rem; text-align:center;">Erro ao carregar os comentários online.</p>`;
        });
    }

    async enviarComentarioFirebase() {
        const input = document.getElementById('input-comentario');
        if (!input || !this.obraAtual || !this.usuarioLogado) return;
        
        const textoComentario = input.value.trim();
        if (textoComentario === '') return;

        try {
            const dataAtual = new Date();
            const formatarData = `${String(dataAtual.getDate()).padStart(2, '0')}/${String(dataAtual.getMonth() + 1).padStart(2, '0')}/${dataAtual.getFullYear()}`;
            
            // Gravação do documento dentro da subcoleção de comentários da obra
            await addDoc(collection(db, `obras/${this.obraAtual.id}/comentarios`), {
                texto: textoComentario,
                userId: this.usuarioLogado.uid,
                userName: this.usuarioLogado.displayName,
                userFoto: this.usuarioLogado.photoURL,
                dataCriacao: dataAtual.getTime(),
                dataString: formatarData
            });
            
            input.value = ''; // Limpa a caixa de texto
        } catch (e) {
            console.error("Erro ao gravar documento no Firestore: ", e);
            alert("Não foi possível enviar o seu comentário. Verifique sua conexão e tente novamente!");
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

        // Atualiza e amarra os eventos do botão de favoritos
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
                row.innerHTML = `
                    <span class="chapter-title">${cap.titulo}${lendoTexto}</span>
                    <i class="fa-solid fa-chevron-right gold" style="font-size: 0.8rem;"></i>
                `;
                row.onclick = () => this.abrirLeitor(index);
                containerCaps.appendChild(row);
            });
        }

        const btnLerHero = document.getElementById('btn-ler-agora-hero');
        if (btnLerHero) {
            btnLerHero.onclick = () => {
                // Se o usuário tiver um histórico de leitura nesta obra, abre direto no capítulo que ele parou
                if (this.historico[obra.id] !== undefined) {
                    this.abrirLeitor(this.historico[obra.id]);
                } else if (obra.capitulos.length > 0) {
                    this.abrirLeitor(0);
                }
            };
        }

        // Inicia o escutador em tempo real de comentários online para esta obra
        this.escutarComentariosFirebase(obra.id);
        this.navegar('obra');
    }

    abrirLeitor(capIndex) {
        if (!this.obraAtual || !this.obraAtual.capitulos[capIndex]) return;

        this.capituloAtualIdx = capIndex;
        const cap = this.obraAtual.capitulos[capIndex];

        // Salvamento automático do histórico "Continue Lendo" no LocalStorage
        this.historico[this.obraAtual.id] = capIndex;
        localStorage.setItem('celestial_historico', JSON.stringify(this.historico));

        if(document.getElementById('leitor-titulo-obra')) document.getElementById('leitor-titulo-obra').innerText = cap.titulo;
        const viewport = document.getElementById('reader-viewport');
        if (!viewport) return;
        
        viewport.innerHTML = '';
        const urlCompleta = `${this.obraAtual.pasta}${cap.arquivo}`;
        
        viewport.innerHTML = `
            <iframe src="${urlCompleta}" 
                    style="width:100%; height:88vh; border:none;" 
                    title="${cap.titulo}">
            </iframe>
        `;

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
        if (this.obraAtual) this.abrirObra(this.obraAtual.id);
    }
}

// Instancia a aplicação globalmente na janela (window)
window.addEventListener('DOMContentLoaded', () => {
    window.app = new CelestialApp();
});
