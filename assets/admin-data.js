/**
 * PIPOCAFLIX ADMIN — admin-data.js
 * Camada de dados do painel: mesmos Workers públicos e mesmo proxy TMDB
 * já usados pelo site principal (assets/js/api.js). Não precisa de chave
 * nova nem de backend próprio — só lê o que já é público.
 */
window.PipocaAdminData = (function () {
  'use strict';

  const WORKER_BASE     = "https://autumn-pine-50da.slacarambafdsosobrenome.workers.dev";
  const ROUTES          = { FILMES: "/filmes", SERIES: "/series" };
  const EPISODES_WORKER = "https://shy-dream-7986.slacarambafdsosobrenome.workers.dev";
  const EPISODE_TABS = [
    '/episodios1', '/episodios2', '/episodios3', '/episodios4',
    '/episodios5', '/episodios6', '/episodios7', '/episodios8',
    '/episodios9', '/episodios10', '/episodios11', '/episodios12',
    '/episodios13', '/episodios14', '/episodios15', '/episodios16',
    '/episodios17'
  ];
  const TMDB_PROXY_BASE = 'https://tmbdnewchame.canalpedroid.workers.dev';

  /* ── CSV parsing (idêntico ao api.js do site) ── */
  function parseCSVLine(line) {
    const cols = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQuote && line[i + 1] === '"') { cur += '"'; i++; } else inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  }
  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const rows = [];
    for (const line of lines) { if (line.trim()) rows.push(parseCSVLine(line)); }
    return rows.slice(1).filter(r => r && r[0] && r[0].trim());
  }

  function mapFilme(row) {
    return {
      nome: row[0] || '', linkMP4: row[1] || '', sinopse: row[2] || '', capa: row[3] || '',
      categoria: row[4] || '', ano: row[5] || '', duracao: row[6] || '', audio: row[12] || '',
      playerStatus: row[15] || '',
      player2: row[16] || '', player3: row[17] || '', player4: row[18] || '', player5: row[19] || '',
      backdrop: row[20] || '', isSerie: false
    };
  }
  function mapSerie(row) {
    return {
      nome: row[0] || '', linkMP4: row[1] || '', sinopse: row[2] || '', capa: row[3] || '',
      categoria: row[4] || '', ano: row[5] || '', duracao: row[6] || '', audio: row[12] || '',
      backdrop: row[20] || '', isSerie: true
    };
  }
  function mapEpisodio(row) {
    return {
      serie: (row[0] || '').trim(),
      linkMP4: (row[1] || '').trim().replace(/^["']|["']$/g, ''),
      temporada: parseInt(row[2]) || 1,
      episodio: parseInt(row[3]) || 1,
      player2: (row[5] || '').trim()
    };
  }

  async function fetchCSV(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'text/csv, text/plain, */*' } });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return parseCSV(await res.text());
    } catch (e) {
      clearTimeout(timer);
      console.error('[Admin] Falha ao buscar', url, e.message);
      return [];
    }
  }

  async function getFilmes() {
    const rows = await fetchCSV(WORKER_BASE + ROUTES.FILMES);
    return rows.map(mapFilme).filter(f => f.nome);
  }
  async function getSeries() {
    const rows = await fetchCSV(WORKER_BASE + ROUTES.SERIES);
    return rows.map(mapSerie).filter(s => s.nome);
  }
  async function getEpisodios() {
    const results = await Promise.all(EPISODE_TABS.map(function (route) {
      return fetchCSV(EPISODES_WORKER + route);
    }));
    return results.flat().map(mapEpisodio).filter(e => e.linkMP4);
  }

  // Busca tudo de uma vez (filmes + séries + episódios) — usado no Dashboard/Catálogo/Revisão.
  async function getCatalogoCompleto() {
    const [filmes, series, episodios] = await Promise.all([getFilmes(), getSeries(), getEpisodios()]);
    return { filmes: filmes, series: series, episodios: episodios };
  }

  function normalizeStr(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
  }

  /* ── TMDB (mesmo proxy do site — /3/search/multi busca filme+série juntos) ── */
  async function buscarTMDB(query) {
    const url = new URL(TMDB_PROXY_BASE + '/3/search/multi');
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('query', query);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(url.toString(), { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(timer);
      if (!res.ok) return [];
      const data = await res.json();
      return (data && Array.isArray(data.results)) ? data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv') : [];
    } catch (e) {
      clearTimeout(timer);
      console.error('[Admin] Falha na busca TMDB:', e.message);
      return [];
    }
  }

  /**
   * Verifica se um título do TMDB já existe no catálogo local.
   * ANTES: comparava por "contém" (n.includes(alvo) || alvo.includes(n)), o que
   * dava positivo pra praticamente qualquer busca — um título curto ou uma
   * palavra genérica batia com meio catálogo.
   * AGORA: só considera "achou" quando o nome normalizado é EXATAMENTE igual.
   * Se houver mais de um item com o mesmo nome (remake/homônimo) e a TMDB
   * informar o ano, usa o ano pra desempatar.
   */
  function jaExisteNoCatalogo(nomeTmdb, anoTmdb, catalogo) {
    const alvo = normalizeStr(nomeTmdb);
    if (!alvo) return null;
    const todos = catalogo.filmes.concat(catalogo.series);
    const exatos = todos.filter(function (item) { return normalizeStr(item.nome) === alvo; });
    if (!exatos.length) return null;
    if (exatos.length === 1 || !anoTmdb) return exatos[0];
    const porAno = exatos.find(function (item) {
      const anoItem = parseInt(item.ano, 10);
      return anoItem && Math.abs(anoItem - anoTmdb) <= 1;
    });
    return porAno || exatos[0];
  }

  /**
   * Sugestões "parece com..." pra quando NÃO achou exato — só informativo,
   * nunca conta como "já está no site". Ajuda a pegar o caso de o nome no
   * TMDB e na planilha estarem escritos de um jeito levemente diferente.
   */
  function sugestoesParecidas(nomeTmdb, catalogo, max) {
    const alvo = normalizeStr(nomeTmdb);
    if (!alvo || alvo.length < 3) return [];
    const todos = catalogo.filmes.concat(catalogo.series);
    return todos.filter(function (item) {
      const n = normalizeStr(item.nome);
      if (!n || n === alvo) return false;
      const menor = Math.min(n.length, alvo.length), maior = Math.max(n.length, alvo.length);
      if (menor < 4) return false; // evita bater por causa de uma palavra genérica curta
      if (maior / menor > 1.6) return false; // tamanhos muito diferentes = pouco parecido
      return n.includes(alvo) || alvo.includes(n);
    }).slice(0, max || 2).map(function (item) { return item.nome; });
  }

  /* ── Saúde do catálogo — problemas categorizados e específicos pra revisar ── */
  function analisarProblemas(catalogo) {
    const problemas = [];
    function add(tipo, nome, motivo, severidade) {
      problemas.push({ tipo: tipo, nome: nome, motivo: motivo, severidade: severidade || 'media' });
    }

    // Nomes duplicados (mesmo nome aparece 2+ vezes na mesma aba — problema
    // clássico de planilha, geralmente um dos dois é lixo ou está desatualizado)
    function checarDuplicados(lista, tipo) {
      const contagem = {};
      lista.forEach(function (item) {
        const n = normalizeStr(item.nome);
        if (!n) return;
        contagem[n] = (contagem[n] || 0) + 1;
      });
      lista.forEach(function (item) {
        const n = normalizeStr(item.nome);
        if (contagem[n] > 1) add(tipo, item.nome, 'Nome duplicado na planilha (aparece ' + contagem[n] + 'x)', 'alta');
      });
    }
    checarDuplicados(catalogo.filmes, 'Filme');
    checarDuplicados(catalogo.series, 'Série');

    // Filmes
    catalogo.filmes.forEach(function (f) {
      const semLink = !f.linkMP4 && !f.player2 && !f.player3 && !f.player4 && !f.player5;
      if (semLink) add('Filme', f.nome, 'Sem nenhum link de player', 'alta');
      if (!f.capa) add('Filme', f.nome, 'Sem capa', 'media');
      if (!f.categoria) add('Filme', f.nome, 'Sem categoria/gênero', 'baixa');
      if (!f.ano) add('Filme', f.nome, 'Sem ano', 'baixa');
      else if (!/^(19|20)\d{2}$/.test(String(f.ano).trim())) add('Filme', f.nome, 'Ano com valor estranho: "' + f.ano + '"', 'media');
      if (!f.sinopse) add('Filme', f.nome, 'Sem sinopse', 'baixa');
    });

    // Séries — cruza com a lista de episódios pra saber quais realmente têm conteúdo
    const episodiosPorSerie = {};
    catalogo.episodios.forEach(function (e) {
      const n = normalizeStr(e.serie);
      if (!episodiosPorSerie[n]) episodiosPorSerie[n] = [];
      episodiosPorSerie[n].push(e);
    });
    const nomesSeriesCadastradas = new Set(catalogo.series.map(function (s) { return normalizeStr(s.nome); }));

    catalogo.series.forEach(function (s) {
      const n = normalizeStr(s.nome);
      const eps = episodiosPorSerie[n] || [];
      if (!eps.length) add('Série', s.nome, 'Nenhum episódio encontrado nas abas de episódios', 'alta');
      else {
        // Temporada+episódio duplicado dentro da mesma série
        const vistos = {};
        eps.forEach(function (e) {
          const chave = e.temporada + 'x' + e.episodio;
          vistos[chave] = (vistos[chave] || 0) + 1;
        });
        Object.keys(vistos).forEach(function (chave) {
          if (vistos[chave] > 1) add('Série', s.nome, 'Episódio duplicado: T' + chave.replace('x', ' EP') + ' aparece ' + vistos[chave] + 'x', 'alta');
        });
        // Buraco na sequência (ex: tem 1, 2, 4 mas falta o 3) — só avisa, não é sempre erro real
        const porTemporada = {};
        eps.forEach(function (e) { (porTemporada[e.temporada] = porTemporada[e.temporada] || []).push(e.episodio); });
        Object.keys(porTemporada).forEach(function (temp) {
          const nums = porTemporada[temp].slice().sort(function (a, b) { return a - b; });
          for (let i = 1; i < nums.length; i++) {
            if (nums[i] - nums[i - 1] > 1) {
              add('Série', s.nome, 'Possível episódio faltando na T' + temp + ' (pula de EP' + nums[i - 1] + ' pro EP' + nums[i] + ')', 'baixa');
            }
          }
        });
      }
      if (!s.capa) add('Série', s.nome, 'Sem capa', 'media');
      if (!s.categoria) add('Série', s.nome, 'Sem categoria/gênero', 'baixa');
      if (!s.ano) add('Série', s.nome, 'Sem ano', 'baixa');
      if (!s.sinopse) add('Série', s.nome, 'Sem sinopse', 'baixa');
    });

    // Episódios órfãos — apontam pra uma série que não existe (ou está com nome
    // digitado diferente) na aba de séries. Normalmente é erro de digitação.
    const jaAvisadoOrfao = new Set();
    catalogo.episodios.forEach(function (e) {
      const n = normalizeStr(e.serie);
      if (!nomesSeriesCadastradas.has(n) && !jaAvisadoOrfao.has(n)) {
        jaAvisadoOrfao.add(n);
        add('Episódio', e.serie || '(nome vazio)', 'Aponta pra uma série que não está cadastrada na aba de séries (confira o nome digitado)', 'alta');
      }
    });

    const ordemSeveridade = { alta: 0, media: 1, baixa: 2 };
    problemas.sort(function (a, b) { return ordemSeveridade[a.severidade] - ordemSeveridade[b.severidade]; });
    return problemas;
  }

  function contarPorCategoria(catalogo) {
    const contagem = {};
    catalogo.filmes.concat(catalogo.series).forEach(function (item) {
      (item.categoria || '').split(',').forEach(function (c) {
        c = c.trim();
        if (!c) return;
        contagem[c] = (contagem[c] || 0) + 1;
      });
    });
    return Object.entries(contagem).sort(function (a, b) { return b[1] - a[1]; });
  }

  function contarAudio(catalogo) {
    let dub = 0, leg = 0, outro = 0;
    catalogo.filmes.concat(catalogo.series).forEach(function (item) {
      const a = (item.audio || '').toLowerCase();
      if (a.includes('dub')) dub++;
      else if (a.includes('leg')) leg++;
      else outro++;
    });
    return { dublado: dub, legendado: leg, outro: outro };
  }

  return {
    getFilmes: getFilmes, getSeries: getSeries, getEpisodios: getEpisodios,
    getCatalogoCompleto: getCatalogoCompleto, buscarTMDB: buscarTMDB,
    jaExisteNoCatalogo: jaExisteNoCatalogo, sugestoesParecidas: sugestoesParecidas,
    analisarProblemas: analisarProblemas,
    contarPorCategoria: contarPorCategoria, contarAudio: contarAudio,
    normalizeStr: normalizeStr, TMDB_IMG_BASE: 'https://image.tmdb.org/t/p/w300'
  };
})();
