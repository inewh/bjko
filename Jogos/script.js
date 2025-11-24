const appState = {
  dadosOriginais: [],
  funcaoAtiva: 'Todos',
  termoBuscaAtual: '',
  ordemAno: 'desc',
  ordemNome: null,
  debounceTimeout: null,
};

let cardContainer, inputBusca, botaoOrdenarAZ, botaoOrdenarAno, botaoLimparFiltros, botaoTema, filtrosFuncaoContainer, searchContainer, searchButton, clearSearchBtn, autocompleteList;

// ==================== DADOS ====================
async function carregarDados() {
  try {
    const resp = await fetch('Personagem.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    appState.dadosOriginais = await resp.json();
    // garante IDs em string
    appState.dadosOriginais.forEach((c, i) => {
      if (!c.id) c.id = (c.nome || 'champ').toLowerCase().replace(/\s+/g, '-') + '-' + i;
    });
    aplicarFiltros();
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    if(cardContainer) cardContainer.innerHTML = `<p>Ocorreu um erro ao carregar os campeões.</p>`;
  }
}

// ==================== RENDERIZAÇÃO ====================
function renderizarCards(campeoesParaRenderizar) {
  cardContainer.innerHTML = '';
  if (!campeoesParaRenderizar || campeoesParaRenderizar.length === 0) {
    cardContainer.innerHTML = `<p>Nenhum campeão encontrado.</p>`;
    return;
  }

  campeoesParaRenderizar.forEach((campeao) => {
    const flipContainer = document.createElement('div');
    flipContainer.className = 'card-flip-container';
    flipContainer.dataset.id = campeao.id;

    flipContainer.innerHTML = `
      <div class="card" id="card-${campeao.id}">
        <div class="card-front" style="background-image: url('${campeao.imagem}')">
          <div class="card-front-content">
            <h2>${campeao.nome}</h2>
            <p>${campeao.titulo || ''}</p>
          </div>
        </div>
        <div class="card-back">
          <p class="card-back-summary">${campeao.descricao || ''}</p>
          <button class="card-back-sobre-button" data-id="${campeao.id}">SOBRE</button>
        </div>
      </div>
    `;
    cardContainer.appendChild(flipContainer);
   });
}

// ==================== FILTROS / ORDENAÇÃO ====================
function aplicarFiltros() {
  let lista = [...appState.dadosOriginais];

  // função
  if (appState.funcaoAtiva && appState.funcaoAtiva !== 'Todos') {
    lista = lista.filter(c => Array.isArray(c.funcoes) ? c.funcoes.includes(appState.funcaoAtiva) : (c.funcao === appState.funcaoAtiva));
  }

  // busca
  if (appState.termoBuscaAtual) {
    const termo = appState.termoBuscaAtual.toLowerCase();
    lista = lista.filter(c => (c.nome || '').toLowerCase().includes(termo) || (c.titulo || '').toLowerCase().includes(termo));
  }

  // ordenação
  if (appState.ordemNome) {
    lista.sort((a,b) => a.nome.localeCompare(b.nome));
  } else if (appState.ordemAno) {
    const mult = appState.ordemAno === 'asc' ? 1 : -1;
    lista.sort((a,b) => ((a.ano || 0) - (b.ano || 0)) * mult);
  }

  renderizarCards(lista);
}

// ==================== FERRAMENTAS UI ====================
function ativarFiltro(funcao) {
  appState.funcaoAtiva = funcao;
  // atualizar classes
  document.querySelectorAll('.botao-filtro').forEach(b => b.classList.toggle('active', b.dataset.funcao === funcao));
  aplicarFiltros();
}

function limparFiltros() {
  appState.funcaoAtiva = 'Todos';
  appState.termoBuscaAtual = '';
  inputBusca.value = '';
  appState.ordemAno = 'desc';
  appState.ordemNome = null;
  document.querySelectorAll('.botao-filtro').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.botao-filtro[data-funcao="Todos"]')?.classList.add('active');
  aplicarFiltros();
}

// ==================== AUTOCOMPLETE ====================
function atualizarAutocomplete(term) {
  const list = autocompleteList;
  if (!term) { list.style.display = 'none'; list.innerHTML = ''; return; }
  const termo = term.toLowerCase();
  const matches = appState.dadosOriginais.filter(c => (c.nome || '').toLowerCase().includes(termo)).slice(0, 20);
  if (matches.length === 0) { list.style.display = 'none'; list.innerHTML = ''; return; }

  list.innerHTML = '';
  matches.forEach(m => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${m.nome.substring(0, term.length)}</strong>${m.nome.substring(term.length)} <small style="float:right;opacity:.7">${m.titulo||''}</small>`;
    div.addEventListener('click', () => {
      inputBusca.value = m.nome;
      appState.termoBuscaAtual = m.nome;
      aplicarFiltros();
      list.style.display = 'none';
    });
    list.appendChild(div);
  });
  list.style.display = 'block';
}

// ==================== MODAL / DETALHES ====================
async function abrirDetalhes(championId) {
  if (!appState.dadosOriginais || appState.dadosOriginais.length === 0) return;
  const campeao = appState.dadosOriginais.find(c => c.id === championId);
  if (!campeao) return;

  // preenche o modal (o HTML do modal já existe no index)
  const modal = document.getElementById('champion-details-modal');
  if (!modal) return;

  document.getElementById('modal-background').style.backgroundImage = `url('${campeao.imagem}')`;
  document.getElementById('modal-champion-name').textContent = campeao.nome || '';
  document.getElementById('modal-champion-title').textContent = campeao.titulo || '';
  document.getElementById('modal-champion-story').textContent = campeao.historia_completa || campeao.historia || campeao.descricao || '';
  document.getElementById('modal-champion-quote').textContent = `"${campeao.frase}"`;

  // viabilidade
  const viabilitySection = document.getElementById('modal-viability-section');
  viabilitySection.innerHTML = '<h3>Viabilidade</h3>';
  if (campeao.viabilidade) {
    for (const [stat, value] of Object.entries(campeao.viabilidade)) {
      const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
      viabilitySection.innerHTML += `
        <div class="stat-bar-container">
          <span class="stat-name">${statName}</span>
          <div class="stat-bar"><div class="stat-bar-fill" style="width:${(value*10)}%"></div></div>
        </div>
      `;
    }
  }

  // relacionamentos
  const relationsSection = document.getElementById('modal-relations-section');
  relationsSection.innerHTML = '<h3>Relacionamentos</h3>';
  const relationsList = document.createElement('ul');
  if (campeao.relacionamentos && campeao.relacionamentos.length) {
    campeao.relacionamentos.forEach(r => {
      const rc = appState.dadosOriginais.find(x => x.nome === r || x.id === r || x.nome.toLowerCase() === (r+'').toLowerCase());
      if (rc) {
        const li = document.createElement('li');
        li.textContent = rc.nome;
        li.onclick = () => abrirDetalhes(rc.id);
        relationsList.appendChild(li);
      }
    });
  }
  relationsSection.appendChild(relationsList);

  // habilidades (limpa e preenche com vídeos/thumbnails)
  const abilitiesContainer = document.getElementById('modal-abilities-container');
  abilitiesContainer.innerHTML = '';

  if (Array.isArray(campeao.habilidades)) {
    // cria wrapper de vídeo + thumbnails
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'modal-ability-video-wrapper';
    const videoEl = document.createElement('video');
    videoEl.controls = true; videoEl.loop = true; videoEl.muted = true; videoEl.playsInline = true;
    videoWrapper.appendChild(videoEl);

    const abilityInfo = document.createElement('div');
    abilityInfo.className = 'modal-ability-info';
    const abilityName = document.createElement('div');
    abilityName.id = 'modal-ability-name';
    const abilityDesc = document.createElement('div');
    abilityDesc.id = 'modal-ability-description';
    abilityInfo.appendChild(abilityName); abilityInfo.appendChild(abilityDesc);

    const thumbs = document.createElement('div');
    thumbs.className = 'modal-ability-thumbnails';

    abilitiesContainer.appendChild(videoWrapper);
    abilitiesContainer.appendChild(abilityInfo);
    abilitiesContainer.appendChild(thumbs);

    campeao.habilidades.forEach((h, i) => {
      const thumb = document.createElement('img');
      thumb.src = h.icone || '';
      thumb.className = 'ability-thumbnail';
      thumb.title = h.nome || '';
      thumb.addEventListener('mouseenter', () => {
        if (h.video) { videoEl.src = h.video; videoWrapper.style.display = 'block'; videoEl.play().catch(()=>{}); }
      });
      thumb.addEventListener('click', () => {
        if (h.video) { videoEl.src = h.video; videoWrapper.style.display = 'block'; videoEl.play().catch(()=>{}); }
        abilityName.textContent = h.nome || '';
        abilityDesc.textContent = h.descricao || '';
        thumbs.querySelectorAll('.ability-thumbnail').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
      thumbs.appendChild(thumb);
      if (i === 0) thumb.click();
    });
  }

    // --- Lógica da Seção de Skins ---
    const skinsSection = document.getElementById('modal-skins-section');
    const skinsContainer = document.getElementById('modal-skins-container');
    skinsContainer.innerHTML = '';

    if (campeao.skins && campeao.skins.length > 0) {
        skinsSection.style.display = 'block';

        const skinDisplay = document.createElement('div');
        skinDisplay.className = 'skin-display';

        const skinThumbnails = document.createElement('div');
        skinThumbnails.className = 'skin-thumbnails';

        skinsContainer.appendChild(skinDisplay);
        skinsContainer.appendChild(skinThumbnails);

        campeao.skins.forEach((skin, index) => {
            const thumb = document.createElement('img');
            thumb.src = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${campeao.id}_${skin.imagem.split('_').pop()}`;
            thumb.className = 'skin-thumbnail';
            thumb.title = skin.nome;

            thumb.addEventListener('click', () => {
                document.querySelectorAll('.skin-thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                skinDisplay.innerHTML = ''; // Limpa a área de display

                if (skin.video) {
                    skinDisplay.innerHTML = `<iframe src="${skin.video}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                } else {
                    const img = document.createElement('img');
                    img.src = skin.imagem;
                    skinDisplay.appendChild(img);
                }
            });

            skinThumbnails.appendChild(thumb);

            if (index === 0) {
                thumb.click(); // Ativa a primeira skin por padrão
            }
        });
    } else {
        skinsSection.style.display = 'none';
    }

  // abre modal
  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';

  // fechar
  const closeBtn = document.getElementById('modal-close-btn');
  const fechar = () => {
    modal.classList.remove('visible');
    document.body.style.overflow = '';
    const v = document.querySelector('#modal-abilities-container video');
    if (v) { v.pause(); v.src = ''; }
  };
  closeBtn.onclick = fechar;
  modal.onclick = (e) => { if (e.target === modal) fechar(); };
}

// ==================== EVENTO DE CLIQUE DELEGAÇÃO ====================
function iniciarDelegacaoClicks() {
  // Delegation para botões SOBRE e para clique no card
  cardContainer.addEventListener('click', (event) => {
    const sobreBtn = event.target.closest('.card-front-sobre-button');
    if (sobreBtn) {
      event.stopPropagation();
      abrirDetalhes(sobreBtn.dataset.id);
      return;
    }
    const card = event.target.closest('.card-flip-container');
    if (card && card.dataset.id) {
      abrirDetalhes(card.dataset.id);
    }
  });
}

// ==================== SEARCH / LUPA ====================
function iniciarSearchUI() {
  searchButton.addEventListener('click', (e) => {
    e.preventDefault();
    searchContainer.classList.toggle('active');
    if (searchContainer.classList.contains('active')) {
      inputBusca.focus();
      clearSearchBtn.style.display = 'block';
    } else {
      inputBusca.value = '';
      appState.termoBuscaAtual = '';
      limparFiltros();
      clearSearchBtn.style.display = 'none';
      autocompleteList.style.display = 'none';
    }
  });

  clearSearchBtn.addEventListener('click', () => {
    inputBusca.value = '';
    appState.termoBuscaAtual = '';
    autocompleteList.style.display = 'none';
    clearSearchBtn.style.display = 'none';
    aplicarFiltros();
  });

  inputBusca.addEventListener('input', (e) => {
    clearTimeout(appState.debounceTimeout);
    const val = e.target.value;
    appState.termoBuscaAtual = val;
    if (!val) {
      autocompleteList.style.display = 'none';
    } else {
      atualizarAutocomplete(val);
    }
    appState.debounceTimeout = setTimeout(() => {
      aplicarFiltros();
    }, 220);
  });

  // Enter to search from autocomplete or input
  inputBusca.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      autocompleteList.style.display = 'none';
      aplicarFiltros();
    }
  });

  // click outside to hide autocomplete/search
  document.addEventListener('click', (e) => {
    if (!document.getElementById('search-container').contains(e.target)) {
      // close autocomplete but keep search open
      autocompleteList.style.display = 'none';
    }
  });
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  // Seletores
  cardContainer = document.querySelector('.card-container');
  inputBusca = document.getElementById('input-busca');
  botaoOrdenarAZ = document.getElementById('botao-ordenar-az');
  botaoOrdenarAno = document.getElementById('botao-ordenar-ano');
  botaoLimparFiltros = document.getElementById('botao-limpar-filtros');
  botaoTema = document.getElementById('botao-tema');
  filtrosFuncaoContainer = document.getElementById('filtros-funcao-container');
  searchContainer = document.getElementById('search-container');
  searchButton = document.getElementById('search-button');
  clearSearchBtn = document.getElementById('clear-search');
  autocompleteList = document.getElementById('autocomplete-list');

  // carregar dados e iniciar UI
  carregarDados().then(() => {
    document.getElementById('loading-screen').classList.add('fade-out');
  });

  // delegação
  iniciarDelegacaoClicks();

  // filters (navbar fixed buttons)
  document.querySelectorAll('.botao-filtro').forEach(btn => {
    btn.addEventListener('click', () => ativarFiltro(btn.dataset.funcao));
  });
  // set default active
  document.querySelector('.botao-filtro[data-funcao="Todos"]')?.classList.add('active');

  // ordenação
  botaoOrdenarAZ.addEventListener('click', () => {
    appState.ordemNome = 'asc';
    appState.ordemAno = null;
    aplicarFiltros();
  });
  botaoOrdenarAno.addEventListener('click', () => {
    appState.ordemNome = null;
    appState.ordemAno = appState.ordemAno === 'desc' ? 'asc' : 'desc';
    botaoOrdenarAno.textContent = `Ordenar por Ano (${appState.ordemAno === 'desc' ? 'Recentes' : 'Antigos'})`;
    aplicarFiltros();
  });
  botaoLimparFiltros.addEventListener('click', limparFiltros);

  // tema toggle
  if (botaoTema) {
    botaoTema.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      botaoTema.textContent = isLight ? '🌙' : '☀️';
    });
  }

  // iniciar search UI
  iniciarSearchUI();

    // Botão Voltar ao Topo
    const backToTopBtn = document.getElementById('back-to-top-btn');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) backToTopBtn.classList.add('show');
            else backToTopBtn.classList.remove('show');
        });
        backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
});
