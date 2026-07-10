class CelestialApp {
    constructor() {
        this.obras = [];
        this.obraAtual = null;
        this.capituloAtualIdx = -1;
        this.init();
    }

    async init() {
        this.initDOMEvents();
        await this.carregarDados();
        this.renderizarHome();
        this.renderizarBiblioteca(this.obras);
    }

    initDOMEvents() {
        // Menu Inferior
        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.navegar(target);
                document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filtrarBiblioteca();
            });
        });

        // Pesquisa
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filtrarBiblioteca());
        }

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

    async carregarDados() {
        // Configurado exatamente com a sua capa.png local e seu capitulo-1.pdf
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
              { "numero": 1, "titulo": "Capítulo 1 - Parte 1", "arquivo": "capitulo-1.pdf" }
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
    }

    renderizarHome() {
        if (this.obras.length === 0) return;

        const destaque = this.obras[0];
        
        if(document.getElementById('banner-titulo')) document.getElementById('banner-titulo').innerText = destaque.titulo;
        if(document.getElementById('banner-sinopse')) document.getElementById('banner-sinopse').innerText = destaque.sinopse;
        
        const banner = document.getElementById('banner-principal');
        if (banner) {
            banner.style.backgroundImage = `url('${destaque.capa}')`;
        }

        const btnBtn = document.getElementById('banner-btn');
        if (btnBtn) {
            btnBtn.onclick = () => this.abrirObra(destaque.id);
        }

        const gridDestaques = document.getElementById('grid-destaques');
        const gridRecentes = document.getElementById('grid-recentes');
        
        if (gridDestaques) {
            gridDestaques.innerHTML = '';
            gridDestaques.appendChild(this.criarCardObra(destaque));
        }
        
        if (gridRecentes) {
            gridRecentes.innerHTML = '';
            gridRecentes.appendChild(this.criarCardObra(destaque));
        }
    }

    criarCardObra(obra) {
        const div = document.createElement('div');
        div.className = 'card-obra';
        div.setAttribute('data-id', obra.id);
        div.style.minHeight = "240px";
        
        div.innerHTML = `
            <div class="card-capa-wrapper" style="background: #171717; position: relative; height: 180px;">
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
        lista.forEach(obra => {
            grid.appendChild(this.criarCardObra(obra));
        });
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
            
            const correspondeStatus = (statusAtivo === 'todos') || (obra.status === statusAtivo);

            return correspondeQuery && correspondeStatus;
        });

        this.renderizarBiblioteca(filtradas);
    }

    abrirObra(id) {
        const obra = this.obras.find(o => o.id === id);
        if (!obra) return;

        this.obraAtual = obra;
        
        if(document.getElementById('obra-hero-bg')) document.getElementById('obra-hero-bg').style.backgroundImage = `url('${obra.capa}')`;
        
        const imgCapa = document.getElementById('obra-capa');
        if(imgCapa) {
            imgCapa.src = obra.capa;
        }

        if(document.getElementById('obra-titulo')) document.getElementById('obra-titulo').innerText = obra.titulo;
        if(document.getElementById('obra-autor')) document.getElementById('obra-autor').innerText = obra.autor;
        if(document.getElementById('obra-status')) document.getElementById('obra-status').innerText = obra.status;
        if(document.getElementById('obra-caps-count')) document.getElementById('obra-caps-count').innerText = obra.capitulos.length;
        if(document.getElementById('obra-sinopse')) document.getElementById('obra-sinopse').innerText = obra.sinopse;

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
                row.innerHTML = `
                    <span class="chapter-title">${cap.titulo}</span>
                    <i class="fa-solid fa-chevron-right gold" style="font-size: 0.8rem;"></i>
                `;
                row.onclick = () => this.abrirLeitor(index);
                containerCaps.appendChild(row);
            });
        }

        const btnLerHero = document.getElementById('btn-ler-agora-hero');
        if (btnLerHero) {
            btnLerHero.onclick = () => {
                if (obra.capitulos.length > 0) this.abrirLeitor(0);
            };
        }

        this.navegar('obra');
    }

    abrirLeitor(capIndex) {
        if (!this.obraAtual || !this.obraAtual.capitulos[capIndex]) return;

        this.capituloAtualIdx = capIndex;
        const cap = this.obraAtual.capitulos[capIndex];

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

window.addEventListener('DOMContentLoaded', () => {
    window.app = new CelestialApp();
});
