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
      nome: row[0] || '', linkMP4: row[1] || '', capa: row[3] || '', categoria: row[4] || '',
      ano: row[5] || '', audio: row[12] || '', playerStatus: row[15] || '',
      player2: row[16] || '', player3: row[17] || '', player4: row[18] || '', player5: row[19] || '',
      backdrop: row[20] || '', isSerie: false
    };
  }
  function mapSerie(row) {
    return {
      nome: row[0] || '', linkMP4: row[1] || '', capa: row[3] || '', categoria: row[4] || '',
      ano: row[5] || '', audio: row[12] || '', backdrop: row[20] || '', isSerie: true
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

  // Busca tudo de uma vez (filmes + séries + episódios) — usado no Dashboard/Catálogo.
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

  // Verifica se um título (nome do TMDB) já existe no catálogo local (match por nome normalizado).
  function jaExisteNoCatalogo(nomeTmdb, catalogo) {
    const alvo = normalizeStr(nomeTmdb);
    const todos = catalogo.filmes.concat(catalogo.series);
    return todos.find(function (item) {
      const n = normalizeStr(item.nome);
      return n === alvo || n.includes(alvo) || alvo.includes(n);
    }) || null;
  }

  /* ── Saúde do catálogo — problemas comuns pra revisar ── */
  function analisarProblemas(catalogo) {
    const problemas = [];
    catalogo.filmes.forEach(function (f) {
      const semLink = !f.linkMP4 && !f.player2 && !f.player3 && !f.player4 && !f.player5;
      if (semLink) problemas.push({ nome: f.nome, tipo: 'Filme', motivo: 'Sem nenhum link de player' });
      else if (!f.capa) problemas.push({ nome: f.nome, tipo: 'Filme', motivo: 'Sem capa' });
    });
    // Séries: considera "sem episódio" quando nenhum episódio no worker aponta pra ela
    const seriesComEp = new Set(catalogo.episodios.map(function (e) { return normalizeStr(e.serie); }));
    catalogo.series.forEach(function (s) {
      if (!seriesComEp.has(normalizeStr(s.nome))) problemas.push({ nome: s.nome, tipo: 'Série', motivo: 'Nenhum episódio encontrado nas abas' });
      else if (!s.capa) problemas.push({ nome: s.nome, tipo: 'Série', motivo: 'Sem capa' });
    });
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
    jaExisteNoCatalogo: jaExisteNoCatalogo, analisarProblemas: analisarProblemas,
    contarPorCategoria: contarPorCategoria, contarAudio: contarAudio,
    normalizeStr: normalizeStr, TMDB_IMG_BASE: 'https://image.tmdb.org/t/p/w300'
  };
})();
