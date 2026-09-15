/**
 * PIPOCAFLIX ADMIN — admin-app.js
 * Login (mesmo projeto Firebase do site) + navegação + renderização.
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, collectionGroup, getDocs, query, orderBy, limit, doc, updateDoc }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

/* ─────────────────────────────────────────────
   ⚠️ Edite esta lista pra adicionar/remover admins.
   Só e-mails aqui conseguem passar da tela de login.
───────────────────────────────────────────── */
const ADMIN_EMAILS = ['canalpedroid@gmail.com'];

const firebaseConfig = {
  apiKey: "AIzaSyDQK5iw8v0eVf6auRiVkZzaRJn_I6znbeA",
  authDomain: "pipoca-flix-43de0.firebaseapp.com",
  projectId: "pipoca-flix-43de0",
  storageBucket: "pipoca-flix-43de0.firebasestorage.app",
  messagingSenderId: "504338312989",
  appId: "1:504338312989:web:b4949dd355624811017bf4"
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const D = window.PipocaAdminData;

/* ═══════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════ */
const loginGate = document.getElementById('loginGate');
const appEl = document.getElementById('app');
const btnLogin = document.getElementById('btnLogin');
const loginMsg = document.getElementById('loginMsg');

btnLogin.addEventListener('click', async function () {
  btnLogin.disabled = true;
  loginMsg.className = ''; loginMsg.textContent = 'Entrando...';
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error(e);
    loginMsg.className = 'is-error';
    loginMsg.textContent = 'Erro ao entrar. Tenta de novo.';
    btnLogin.disabled = false;
  }
});

document.getElementById('btnLogout').addEventListener('click', function () { signOut(auth); });

onAuthStateChanged(auth, function (user) {
  if (!user) { showLogin(); return; }
  const email = (user.email || '').toLowerCase().trim();
  if (!ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
    loginMsg.className = 'is-denied';
    loginMsg.textContent = 'Essa conta (' + user.email + ') não tem acesso a este painel.';
    signOut(auth);
    return;
  }
  showApp(user);
});

function showLogin() {
  loginGate.style.display = 'flex';
  appEl.classList.remove('is-visible');
  btnLogin.disabled = false;
}
function showApp(user) {
  loginGate.style.display = 'none';
  appEl.classList.add('is-visible');
  const userBox = document.getElementById('sidebarUser');
  userBox.innerHTML =
    '<img src="' + (user.photoURL || '') + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
    '<span class="sidebar-user-name">' + (user.displayName || user.email) + '</span>';
  initApp();
}

/* ═══════════════════════════════════════════════════════
   HELPERS COMPARTILHADOS
═══════════════════════════════════════════════════════ */
function fmtNum(n) { return n.toLocaleString('pt-BR'); }
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function statCard(icon, value, label, warn) {
  return '<div class="stat-card' + (warn ? ' warn' : '') + '"><span class="stat-icon">' + icon + '</span>' +
    '<div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';
}
function barRow(label, count, max) {
  const pct = max ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return '<div class="bar-row"><span class="bar-label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' +
    '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
    '<span class="bar-count">' + fmtNum(count) + '</span></div>';
}
function chipHtml(val, label, count, active) {
  return '<button type="button" class="chip' + (active ? ' active' : '') + '" data-val="' + val + '">' + label + ' <span class="chip-count">' + count + '</span></button>';
}

/* ═══════════════════════════════════════════════════════
   NAVEGAÇÃO
═══════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },
  { id: 'tmdb', label: 'Buscar no TMDB', icon: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
  { id: 'revisao', label: 'Itens pra revisar', icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  { id: 'assinantes', label: 'Assinantes', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { id: 'usuarios', label: 'Usuários', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/>' },
  { id: 'reportes', label: 'Reportes', icon: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>' },
  { id: 'comentarios', label: 'Comentários', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  { id: 'catalogo', label: 'Catálogo', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' }
];
let currentTab = 'dashboard';

function navButtonHtml(item, extraClass) {
  return '<button class="nav-item ' + (extraClass || '') + (item.id === currentTab ? ' active' : '') + '" data-tab="' + item.id + '">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + item.icon + '</svg>' +
    '<span>' + item.label + '</span></button>';
}
function renderNav() {
  document.getElementById('sidebarNav').innerHTML = NAV_ITEMS.map(i => navButtonHtml(i)).join('');
  document.getElementById('mobileNav').innerHTML = NAV_ITEMS.map(i => navButtonHtml(i)).join('');
  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
  });
}
function switchTab(id) {
  currentTab = id;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + id));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === id));
  document.getElementById('mobileNav').classList.remove('open');
  if (id === 'revisao' && !_revisaoLoaded) loadRevisao(false);
  if (id === 'assinantes' && !_vipLoaded) loadAssinantes();
  if (id === 'usuarios' && !_usuariosLoaded) loadUsuarios(false);
  if (id === 'reportes' && !_reportesLoaded) loadReportes(false);
  if (id === 'comentarios' && !_commentsLoaded) loadComentarios();
  if (id === 'catalogo' && _catalogo) renderCatalogoTable(_catalogo);
}
document.getElementById('mobileMenuBtn').addEventListener('click', function () {
  document.getElementById('mobileNav').classList.toggle('open');
});

/* ═══════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════ */
let _catalogo = null;

async function loadDashboard(force) {
  if (_catalogo && !force) { renderDashboard(_catalogo); return; }
  document.getElementById('statGrid').innerHTML = '<div class="state-msg"><div class="spinner"></div>Carregando...</div>';
  document.getElementById('catBarList').innerHTML = '';
  document.getElementById('audioBarList').innerHTML = '';
  try {
    _catalogo = await D.getCatalogoCompleto();
    renderDashboard(_catalogo);
    if (currentTab === 'catalogo') renderCatalogoTable(_catalogo);
    if (currentTab === 'revisao') loadRevisao(false);
  } catch (e) {
    console.error(e);
    document.getElementById('statGrid').innerHTML = '<div class="state-msg error">Não foi possível carregar o catálogo agora.</div>';
  }
  renderDashboardPeeks();
}

function renderDashboard(cat) {
  const nEpisodios = cat.episodios.length;
  const seriesComEp = new Set(cat.episodios.map(e => D.normalizeStr(e.serie)));

  document.getElementById('statGrid').innerHTML =
    statCard('🎬', fmtNum(cat.filmes.length), 'Filmes') +
    statCard('📺', fmtNum(cat.series.length), 'Séries') +
    statCard('🎞️', fmtNum(nEpisodios), 'Episódios') +
    statCard('📡', fmtNum(seriesComEp.size), 'Séries com episódio no ar');

  const categorias = D.contarPorCategoria(cat).slice(0, 8);
  const maxCat = categorias.length ? categorias[0][1] : 1;
  document.getElementById('catBarList').innerHTML = categorias.length
    ? categorias.map(([nome, n]) => barRow(nome, n, maxCat)).join('')
    : '<p class="empty-hint">Sem dados de categoria.</p>';

  const audio = D.contarAudio(cat);
  const maxAudio = Math.max(audio.dublado, audio.legendado, audio.outro, 1);
  document.getElementById('audioBarList').innerHTML =
    barRow('Dublado', audio.dublado, maxAudio) + barRow('Legendado', audio.legendado, maxAudio) + barRow('Não informado', audio.outro, maxAudio);
}

function renderDashboardPeeks() {
  const usersPeek = document.getElementById('dashUsersPeek');
  const reportsPeek = document.getElementById('dashReportsPeek');
  loadUsuariosData(false).then(function (rows) {
    const recentes = rows.slice(0, 5);
    usersPeek.innerHTML = recentes.length
      ? recentes.map(function (u) {
          return '<div class="user-row" style="padding:8px 0;border-bottom:1px solid var(--border)">' +
            '<img src="' + escapeHtml(u.photoURL) + '" onerror="this.style.visibility=\'hidden\'" alt="">' +
            '<div class="user-row-info"><div class="user-row-name">' + escapeHtml(u.displayName || u.email || '(sem nome)') + '</div>' +
            '<div class="user-row-email">' + (u.lastSeen ? 'visto em ' + u.lastSeen.toLocaleDateString('pt-BR') : '') + '</div></div></div>';
        }).join('')
      : '<p class="empty-hint">Nenhum usuário ainda.</p>';
  }).catch(function () {
    usersPeek.innerHTML = '<p class="empty-hint">Não consegui carregar (confira a aba Usuários pra ver o motivo).</p>';
  });

  loadReportesData(false).then(function (rows) {
    const abertos = rows.filter(function (r) { return r.status !== 'resolvido'; }).slice(0, 5);
    reportsPeek.innerHTML = abertos.length
      ? abertos.map(function (r) {
          return '<div class="issue-row"><span class="issue-icon">🚩</span>' +
            '<span class="issue-name">' + escapeHtml(r.contentName) + '</span>' +
            '<span class="issue-tag">' + escapeHtml(r.categoria) + '</span></div>';
        }).join('')
      : '<p class="empty-hint">Nenhum reporte em aberto. 🎉</p>';
  }).catch(function () {
    reportsPeek.innerHTML = '<p class="empty-hint">Não consegui carregar (confira a aba Reportes pra ver o motivo).</p>';
  });
}

document.getElementById('btnRefreshDash').addEventListener('click', function () {
  this.classList.add('is-loading');
  loadDashboard(true).finally(() => this.classList.remove('is-loading'));
});

/* ═══════════════════════════════════════════════════════
   ITENS PRA REVISAR (aba própria, com filtros)
═══════════════════════════════════════════════════════ */
let _revisaoLoaded = false;
let _revisaoTipoFiltro = 'todos';
let _revisaoSevFiltro = 'todos';
let _revisaoFilterText = '';

async function loadRevisao(force) {
  const listEl = document.getElementById('revisaoList');
  listEl.innerHTML = '<div class="state-msg"><div class="spinner"></div>Carregando...</div>';
  if (!_catalogo || force) {
    try { _catalogo = await D.getCatalogoCompleto(); }
    catch (e) { console.error(e); listEl.innerHTML = '<div class="state-msg error">Não consegui carregar o catálogo agora.</div>'; return; }
  }
  _revisaoLoaded = true;
  const problemas = D.analisarProblemas(_catalogo);
  renderRevisaoStats(problemas);
  renderRevisaoChips(problemas);
  renderRevisaoList(problemas);
}
function renderRevisaoStats(problemas) {
  const alta = problemas.filter(p => p.severidade === 'alta').length;
  const media = problemas.filter(p => p.severidade === 'media').length;
  const baixa = problemas.filter(p => p.severidade === 'baixa').length;
  document.getElementById('revisaoStatGrid').innerHTML =
    statCard('🔴', fmtNum(alta), 'Urgente', alta > 0) +
    statCard('🟡', fmtNum(media), 'Atenção') +
    statCard('⚪', fmtNum(baixa), 'Detalhe menor') +
    statCard('📋', fmtNum(problemas.length), 'Total de itens');
}
function renderRevisaoChips(problemas) {
  const tipos = ['todos', 'Filme', 'Série', 'Episódio'];
  document.getElementById('revisaoTipoChips').innerHTML = tipos.map(function (t) {
    const count = t === 'todos' ? problemas.length : problemas.filter(p => p.tipo === t).length;
    return chipHtml(t, t === 'todos' ? 'Tudo' : t + 's', count, _revisaoTipoFiltro === t);
  }).join('');
  const sevs = [['todos', 'Todas'], ['alta', '🔴 Urgente'], ['media', '🟡 Atenção'], ['baixa', '⚪ Detalhe']];
  document.getElementById('revisaoSevChips').innerHTML = sevs.map(function (s) {
    const val = s[0], label = s[1];
    const count = val === 'todos' ? problemas.length : problemas.filter(p => p.severidade === val).length;
    return chipHtml(val, label, count, _revisaoSevFiltro === val);
  }).join('');
  document.querySelectorAll('#revisaoTipoChips .chip').forEach(function (c) {
    c.addEventListener('click', function () { _revisaoTipoFiltro = c.getAttribute('data-val'); renderRevisaoChips(problemas); renderRevisaoList(problemas); });
  });
  document.querySelectorAll('#revisaoSevChips .chip').forEach(function (c) {
    c.addEventListener('click', function () { _revisaoSevFiltro = c.getAttribute('data-val'); renderRevisaoChips(problemas); renderRevisaoList(problemas); });
  });
}
function renderRevisaoList(problemas) {
  let filtrados = problemas;
  if (_revisaoTipoFiltro !== 'todos') filtrados = filtrados.filter(p => p.tipo === _revisaoTipoFiltro);
  if (_revisaoSevFiltro !== 'todos') filtrados = filtrados.filter(p => p.severidade === _revisaoSevFiltro);
  const texto = D.normalizeStr(_revisaoFilterText);
  if (texto) filtrados = filtrados.filter(p => D.normalizeStr(p.nome).includes(texto));
  const listEl = document.getElementById('revisaoList');
  if (!filtrados.length) { listEl.innerHTML = '<p class="empty-hint">Nada por aqui — tudo certo! 🎉</p>'; return; }
  listEl.innerHTML = filtrados.slice(0, 200).map(function (p) {
    return '<div class="revisao-row"><span class="sev-dot ' + p.severidade + '"></span>' +
      '<span class="revisao-tipo">' + p.tipo + '</span>' +
      '<span class="revisao-nome" title="' + escapeHtml(p.nome) + '">' + escapeHtml(p.nome) + '</span>' +
      '<span class="revisao-motivo">' + escapeHtml(p.motivo) + '</span></div>';
  }).join('') + (filtrados.length > 200 ? '<p class="empty-hint">+ ' + (filtrados.length - 200) + ' outros — refine o filtro.</p>' : '');
}
document.getElementById('revisaoFilter').addEventListener('input', function (e) {
  _revisaoFilterText = e.target.value;
  if (_catalogo) renderRevisaoList(D.analisarProblemas(_catalogo));
});
document.getElementById('btnRefreshRevisao').addEventListener('click', function () {
  this.classList.add('is-loading');
  loadRevisao(true).finally(() => this.classList.remove('is-loading'));
});

/* ═══════════════════════════════════════════════════════
   CATÁLOGO (tabela com miniatura, filtros e ordenação)
═══════════════════════════════════════════════════════ */
let _catalogoFilterText = '';
let _catalogoTipoFiltro = 'todos';
let _catalogoCategoriaFiltro = '';
let _catalogoOrdenar = 'nome';

function renderCatalogoTable(cat) {
  const catSelect = document.getElementById('catalogoCategoriaFilter');
  if (catSelect.options.length <= 1) {
    D.contarPorCategoria(cat).forEach(function (entry) {
      const opt = document.createElement('option');
      opt.value = entry[0]; opt.textContent = entry[0];
      catSelect.appendChild(opt);
    });
  }

  document.getElementById('catalogoTipoChips').innerHTML =
    chipHtml('todos', 'Tudo', cat.filmes.length + cat.series.length, _catalogoTipoFiltro === 'todos') +
    chipHtml('filme', 'Filmes', cat.filmes.length, _catalogoTipoFiltro === 'filme') +
    chipHtml('serie', 'Séries', cat.series.length, _catalogoTipoFiltro === 'serie');
  document.querySelectorAll('#catalogoTipoChips .chip').forEach(function (c) {
    c.addEventListener('click', function () { _catalogoTipoFiltro = c.getAttribute('data-val'); renderCatalogoTable(cat); });
  });

  let todos = cat.filmes.concat(cat.series);
  if (_catalogoTipoFiltro === 'filme') todos = cat.filmes;
  else if (_catalogoTipoFiltro === 'serie') todos = cat.series;

  if (_catalogoCategoriaFiltro) {
    todos = todos.filter(i => (i.categoria || '').split(',').map(c => c.trim()).includes(_catalogoCategoriaFiltro));
  }
  const filtro = D.normalizeStr(_catalogoFilterText);
  if (filtro) todos = todos.filter(i => D.normalizeStr(i.nome).includes(filtro));

  todos = todos.slice().sort(function (a, b) {
    if (_catalogoOrdenar === 'ano') return (parseInt(b.ano, 10) || 0) - (parseInt(a.ano, 10) || 0);
    return a.nome.localeCompare(b.nome);
  });

  const table = document.getElementById('catalogoTable');
  const linhas = todos.slice(0, 300).map(function (item) {
    const temLink = !!(item.linkMP4 || item.player2 || item.player3 || item.player4 || item.player5);
    return '<tr><td>' +
      '<div class="catalogo-row-thumb"><img src="' + escapeHtml(item.capa || '') + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
      '<div class="catalogo-nome-col"><div class="catalogo-nome" title="' + escapeHtml(item.nome) + '">' + escapeHtml(item.nome) + '</div>' +
      '<div class="catalogo-sub">' + (item.isSerie ? '📺 Série' : '🎬 Filme') + ' · ' + escapeHtml(item.ano || '—') + '</div></div></div></td>' +
      '<td>' + escapeHtml((item.categoria || '').split(',')[0] || '—') + '</td>' +
      '<td>' + (temLink ? '<span class="pill ok">✓ link</span>' : '<span class="pill no">✗ sem link</span>') + '</td>' +
      '<td>' + (item.capa ? '<span class="pill ok">✓ capa</span>' : '<span class="pill no">✗ sem capa</span>') + '</td>' +
      '<td>' + (item.sinopse ? '<span class="pill ok">✓</span>' : '<span class="pill no">✗</span>') + '</td></tr>';
  }).join('');
  table.innerHTML = '<thead><tr><th>Título</th><th>Categoria</th><th>Player</th><th>Capa</th><th>Sinopse</th></tr></thead><tbody>' +
    (linhas || '<tr><td colspan="5"><p class="empty-hint">Nada encontrado.</p></td></tr>') + '</tbody>';
  const oldHint = document.getElementById('catalogoMoreHint'); if (oldHint) oldHint.remove();
  if (todos.length > 300) table.insertAdjacentHTML('afterend', '<p class="empty-hint" id="catalogoMoreHint">Mostrando 300 de ' + todos.length + ' — refine a busca pra ver mais.</p>');
}
document.getElementById('catalogoFilter').addEventListener('input', function (e) {
  _catalogoFilterText = e.target.value;
  if (_catalogo) renderCatalogoTable(_catalogo);
});
document.getElementById('catalogoCategoriaFilter').addEventListener('change', function (e) {
  _catalogoCategoriaFiltro = e.target.value;
  if (_catalogo) renderCatalogoTable(_catalogo);
});
document.getElementById('catalogoOrdenar').addEventListener('change', function (e) {
  _catalogoOrdenar = e.target.value;
  if (_catalogo) renderCatalogoTable(_catalogo);
});

/* ═══════════════════════════════════════════════════════
   TMDB
═══════════════════════════════════════════════════════ */
async function runTmdbSearch() {
  const q = document.getElementById('tmdbInput').value.trim();
  const grid = document.getElementById('tmdbGrid');
  if (!q) return;
  grid.innerHTML = '<div class="state-msg"><div class="spinner"></div>Buscando...</div>';
  if (!_catalogo) _catalogo = await D.getCatalogoCompleto(); // precisa do catálogo pra cruzar
  const results = await D.buscarTMDB(q);
  if (!results.length) { grid.innerHTML = '<p class="empty-hint">Nada encontrado no TMDB pra "' + escapeHtml(q) + '".</p>'; return; }
  grid.innerHTML = results.map(function (r) {
    const nome = r.title || r.name || 'Sem nome';
    const anoStr = (r.release_date || r.first_air_date || '').slice(0, 4);
    const ano = anoStr ? parseInt(anoStr, 10) : null;
    const tipo = r.media_type === 'tv' ? 'Série' : 'Filme';
    const poster = r.poster_path ? (D.TMDB_IMG_BASE + r.poster_path) : '';
    const existe = D.jaExisteNoCatalogo(nome, ano, _catalogo);
    let statusHtml;
    if (existe) {
      statusHtml = '<span class="badge-status found">✓ Já no site</span>';
    } else {
      const parecidos = D.sugestoesParecidas(nome, _catalogo, 2);
      statusHtml = '<span class="badge-status missing">+ Não encontrado</span>' +
        (parecidos.length ? '<div style="color:var(--text-3);font-size:0.68rem;margin-top:4px">parecido: ' + escapeHtml(parecidos.join(', ')) + '</div>' : '');
    }
    return '<div class="tmdb-card">' +
      (poster ? '<img src="' + poster + '" alt="" loading="lazy">' : '<div style="aspect-ratio:2/3;background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:0.75rem">Sem imagem</div>') +
      '<div class="tmdb-info"><div class="tmdb-name">' + escapeHtml(nome) + '</div>' +
      '<div class="tmdb-meta">' + tipo + (anoStr ? ' · ' + anoStr : '') + '</div>' +
      statusHtml +
      '</div></div>';
  }).join('');
}
document.getElementById('tmdbBtn').addEventListener('click', runTmdbSearch);
document.getElementById('tmdbInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') runTmdbSearch(); });

/* ═══════════════════════════════════════════════════════
   ASSINANTES (Firestore: coleção "vip")
═══════════════════════════════════════════════════════ */
let _vipLoaded = false;
let _vipRows = [];
const RULES_HINT_VIP =
  'match /vip/{doc} {\n' +
  '  allow get: if true; // já deve existir — usado pelo próprio site\n' +
  '  allow list: if request.auth != null\n' +
  '    && request.auth.token.email in ' + JSON.stringify(ADMIN_EMAILS) + ';\n' +
  '}';

async function loadAssinantes() {
  const grid = document.getElementById('vipStatGrid');
  const table = document.getElementById('vipTable');
  grid.innerHTML = '<div class="state-msg"><div class="spinner"></div>Carregando assinantes...</div>';
  table.innerHTML = '';
  try {
    const snap = await getDocs(collection(db, 'vip'));
    _vipLoaded = true;
    const agora = new Date();
    let ativos = 0, expirados = 0;
    const porPlano = {};
    const linhas = [];
    snap.forEach(function (docSnap) {
      const d = docSnap.data();
      const vipAte = d.vip_ate ? new Date(d.vip_ate) : null;
      const ativo = !!(vipAte && vipAte > agora);
      if (ativo) ativos++; else expirados++;
      const plano = d.plano || '—';
      porPlano[plano] = (porPlano[plano] || 0) + 1;
      linhas.push({ email: docSnap.id.replace(/_/g, '.'), plano: plano, vipAte: vipAte, ativo: ativo });
    });
    linhas.sort((a, b) => (b.vipAte || 0) - (a.vipAte || 0));

    grid.innerHTML =
      statCard('✅', fmtNum(ativos), 'VIP ativos') +
      statCard('⏳', fmtNum(expirados), 'Expirados') +
      Object.entries(porPlano).map(([p, n]) => statCard('⭐', fmtNum(n), 'Plano ' + p)).join('');

    renderVipTable(linhas);
    _vipRows = linhas;
  } catch (e) {
    console.error(e);
    grid.innerHTML = '';
    table.innerHTML = '';
    document.getElementById('vipStatGrid').innerHTML =
      '<div class="panel-card" style="grid-column:1/-1">' +
      '<div class="state-msg error">Não consegui listar os assinantes (provavelmente falta liberar a leitura da coleção <code>vip</code> nas regras do Firestore pro seu e-mail admin).</div>' +
      '<div class="rule-box">' + escapeHtml(RULES_HINT_VIP) + '</div></div>';
  }
}
function renderVipTable(rows) {
  const filtro = document.getElementById('vipFilter').value.trim().toLowerCase();
  const filtrados = filtro ? rows.filter(r => r.email.toLowerCase().includes(filtro)) : rows;
  const table = document.getElementById('vipTable');
  const linhas = filtrados.map(function (r) {
    return '<tr><td class="cell-main">' + escapeHtml(r.email) + '</td>' +
      '<td><span class="pill plan-gold">' + escapeHtml(r.plano) + '</span></td>' +
      '<td>' + (r.vipAte ? r.vipAte.toLocaleDateString('pt-BR') : '—') + '</td>' +
      '<td>' + (r.ativo ? '<span class="pill ok">Ativo</span>' : '<span class="pill no">Expirado</span>') + '</td></tr>';
  }).join('');
  table.innerHTML = '<thead><tr><th>E-mail</th><th>Plano</th><th>Válido até</th><th>Status</th></tr></thead><tbody>' +
    (linhas || '<tr><td colspan="4"><p class="empty-hint">Nenhum assinante encontrado.</p></td></tr>') + '</tbody>';
}
document.getElementById('vipFilter').addEventListener('input', function () { renderVipTable(_vipRows); });
document.getElementById('btnRefreshVip').addEventListener('click', function () {
  this.classList.add('is-loading');
  loadAssinantes().finally(() => this.classList.remove('is-loading'));
});

/* ═══════════════════════════════════════════════════════
   USUÁRIOS (Firestore: coleção "users")
   Escrita feita pelo próprio site (filme/série/perfil) quando alguém
   loga — ver sincronizarPerfil() nesses arquivos.
═══════════════════════════════════════════════════════ */
let _usuariosLoaded = false;
let _usuariosRowsCache = null;
const RULES_HINT_USERS =
  'match /users/{uid} {\n' +
  '  allow read: if request.auth != null\n' +
  '    && (request.auth.uid == uid\n' +
  '        || request.auth.token.email in ' + JSON.stringify(ADMIN_EMAILS) + ');\n' +
  '  allow write: if request.auth != null && request.auth.uid == uid;\n' +
  '}';

async function loadUsuariosData(force) {
  if (_usuariosRowsCache && !force) return _usuariosRowsCache;
  const snap = await getDocs(query(collection(db, 'users'), orderBy('lastSeen', 'desc'), limit(500)));
  const rows = [];
  snap.forEach(function (docSnap) {
    const d = docSnap.data();
    rows.push({
      uid: docSnap.id, email: d.email || '', displayName: d.displayName || '', photoURL: d.photoURL || '',
      firstSeen: d.firstSeen && d.firstSeen.toDate ? d.firstSeen.toDate() : null,
      lastSeen: d.lastSeen && d.lastSeen.toDate ? d.lastSeen.toDate() : null
    });
  });
  _usuariosRowsCache = rows;
  return rows;
}
async function loadUsuarios(force) {
  const grid = document.getElementById('usuariosStatGrid');
  const table = document.getElementById('usuariosTable');
  grid.innerHTML = '<div class="state-msg"><div class="spinner"></div>Carregando usuários...</div>';
  table.innerHTML = '';
  try {
    const rows = await loadUsuariosData(force);
    _usuariosLoaded = true;
    const agora = Date.now();
    const ativos7 = rows.filter(r => r.lastSeen && (agora - r.lastSeen.getTime()) < 7 * 24 * 60 * 60 * 1000).length;
    const ativos30 = rows.filter(r => r.lastSeen && (agora - r.lastSeen.getTime()) < 30 * 24 * 60 * 60 * 1000).length;
    grid.innerHTML =
      statCard('👤', fmtNum(rows.length), 'Usuários no total') +
      statCard('🟢', fmtNum(ativos7), 'Ativos (7 dias)') +
      statCard('🕒', fmtNum(ativos30), 'Ativos (30 dias)');
    renderUsuariosTable(rows);
  } catch (e) {
    console.error(e);
    grid.innerHTML = '';
    document.getElementById('usuariosStatGrid').innerHTML =
      '<div class="panel-card" style="grid-column:1/-1">' +
      '<div class="state-msg error">Não consegui listar os usuários (provavelmente falta liberar a leitura da coleção <code>users</code> nas regras do Firestore).</div>' +
      '<div class="rule-box">' + escapeHtml(RULES_HINT_USERS) + '</div></div>';
  }
}
function renderUsuariosTable(rows) {
  const filtro = document.getElementById('usuariosFilter').value.trim().toLowerCase();
  const filtrados = filtro ? rows.filter(r => (r.email + ' ' + r.displayName).toLowerCase().includes(filtro)) : rows;
  const table = document.getElementById('usuariosTable');
  const linhas = filtrados.slice(0, 300).map(function (r) {
    return '<tr><td>' +
      '<div class="user-row"><img src="' + escapeHtml(r.photoURL) + '" onerror="this.style.visibility=\'hidden\'" alt="">' +
      '<div class="user-row-info"><div class="user-row-name">' + escapeHtml(r.displayName || '(sem nome)') + '</div>' +
      '<div class="user-row-email">' + escapeHtml(r.email) + '</div></div></div></td>' +
      '<td>' + (r.firstSeen ? r.firstSeen.toLocaleDateString('pt-BR') : '—') + '</td>' +
      '<td>' + (r.lastSeen ? r.lastSeen.toLocaleDateString('pt-BR') : '—') + '</td></tr>';
  }).join('');
  table.innerHTML = '<thead><tr><th>Usuário</th><th>Primeira vez</th><th>Visto por último</th></tr></thead><tbody>' +
    (linhas || '<tr><td colspan="3"><p class="empty-hint">Nenhum usuário encontrado.</p></td></tr>') + '</tbody>';
}
document.getElementById('usuariosFilter').addEventListener('input', function () {
  if (_usuariosRowsCache) renderUsuariosTable(_usuariosRowsCache);
});
document.getElementById('btnRefreshUsuarios').addEventListener('click', function () {
  this.classList.add('is-loading');
  loadUsuarios(true).finally(() => this.classList.remove('is-loading'));
});

/* ═══════════════════════════════════════════════════════
   REPORTES (Firestore: coleção "reports")
   Escrita feita pelo botão "Reportar problema" em filme/série.
═══════════════════════════════════════════════════════ */
let _reportesLoaded = false;
let _reportesRowsCache = null;
let _reportesStatusFiltro = 'aberto';
const RULES_HINT_REPORTS =
  'match /reports/{id} {\n' +
  '  allow create: if true; // qualquer visitante pode reportar, mesmo sem login\n' +
  '  allow read, update: if request.auth != null\n' +
  '    && request.auth.token.email in ' + JSON.stringify(ADMIN_EMAILS) + ';\n' +
  '}';

async function loadReportesData(force) {
  if (_reportesRowsCache && !force) return _reportesRowsCache;
  const snap = await getDocs(query(collection(db, 'reports'), orderBy('ts', 'desc'), limit(300)));
  const rows = [];
  snap.forEach(function (docSnap) {
    const d = docSnap.data();
    rows.push({
      id: docSnap.id, contentName: d.contentName || '(sem nome)', tipo: d.tipo || '',
      categoria: d.categoria || '', mensagem: d.mensagem || '', userEmail: d.userEmail || '',
      status: d.status || 'aberto',
      ts: d.ts && d.ts.toDate ? d.ts.toDate() : null
    });
  });
  _reportesRowsCache = rows;
  return rows;
}
async function loadReportes(force) {
  const wrap = document.getElementById('reportesWrap');
  wrap.innerHTML = '<div class="state-msg"><div class="spinner"></div>Carregando reportes...</div>';
  document.getElementById('reportesStatusChips').innerHTML = '';
  try {
    const rows = await loadReportesData(force);
    _reportesLoaded = true;
    renderReportesChips(rows);
    renderReportesList(rows);
  } catch (e) {
    console.error(e);
    wrap.innerHTML =
      '<div class="state-msg error">Não consegui carregar os reportes (provavelmente falta liberar a leitura da coleção <code>reports</code> nas regras do Firestore).</div>' +
      '<div class="rule-box">' + escapeHtml(RULES_HINT_REPORTS) + '</div>';
  }
}
function renderReportesChips(rows) {
  const abertos = rows.filter(r => r.status !== 'resolvido').length;
  const resolvidos = rows.length - abertos;
  document.getElementById('reportesStatusChips').innerHTML =
    chipHtml('aberto', 'Em aberto', abertos, _reportesStatusFiltro === 'aberto') +
    chipHtml('resolvido', 'Resolvidos', resolvidos, _reportesStatusFiltro === 'resolvido') +
    chipHtml('todos', 'Todos', rows.length, _reportesStatusFiltro === 'todos');
  document.querySelectorAll('#reportesStatusChips .chip').forEach(function (c) {
    c.addEventListener('click', function () { _reportesStatusFiltro = c.getAttribute('data-val'); renderReportesChips(rows); renderReportesList(rows); });
  });
}
function renderReportesList(rows) {
  const wrap = document.getElementById('reportesWrap');
  const filtrados = _reportesStatusFiltro === 'todos' ? rows : rows.filter(r => (_reportesStatusFiltro === 'resolvido') === (r.status === 'resolvido'));
  if (!filtrados.length) { wrap.innerHTML = '<p class="empty-hint">Nada por aqui.</p>'; return; }
  wrap.innerHTML = filtrados.map(function (r) {
    const resolvido = r.status === 'resolvido';
    return '<div class="report-card' + (resolvido ? ' resolvido' : '') + '">' +
      '<div class="report-card-top"><div><div class="report-card-title">' + escapeHtml(r.contentName) + ' <span style="color:var(--text-3);font-weight:400;font-size:0.74rem">(' + escapeHtml(r.tipo) + ')</span></div>' +
      '<div class="report-card-cat">' + escapeHtml(r.categoria) + '</div></div>' +
      '<button type="button" class="btn-resolve' + (resolvido ? ' is-done' : '') + '" data-id="' + r.id + '">' + (resolvido ? '✓ Resolvido' : 'Marcar resolvido') + '</button></div>' +
      (r.mensagem ? '<div class="report-card-msg">' + escapeHtml(r.mensagem) + '</div>' : '') +
      '<div class="report-card-meta"><span>' + (r.userEmail ? escapeHtml(r.userEmail) : 'anônimo') + '</span>' +
      '<span>' + (r.ts ? r.ts.toLocaleString('pt-BR') : '') + '</span></div></div>';
  }).join('');
  wrap.querySelectorAll('.btn-resolve').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const id = btn.getAttribute('data-id');
      const row = rows.find(r => r.id === id);
      if (!row) return;
      const novoStatus = row.status === 'resolvido' ? 'aberto' : 'resolvido';
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'reports', id), { status: novoStatus });
        row.status = novoStatus;
        renderReportesChips(rows);
        renderReportesList(rows);
      } catch (e) {
        console.error(e);
        btn.disabled = false;
      }
    });
  });
}
document.getElementById('btnRefreshReportes').addEventListener('click', function () {
  this.classList.add('is-loading');
  loadReportes(true).finally(() => this.classList.remove('is-loading'));
});

/* ═══════════════════════════════════════════════════════
   COMENTÁRIOS (Firestore: collection group "meusComentarios")
═══════════════════════════════════════════════════════ */
let _commentsLoaded = false;
const RULES_HINT_COMMENTS =
  'match /{path=**}/meusComentarios/{id} {\n' +
  '  allow read: if request.auth != null\n' +
  '    && request.auth.token.email in ' + JSON.stringify(ADMIN_EMAILS) + ';\n' +
  '}';

async function loadComentarios() {
  const wrap = document.getElementById('commentsWrap');
  wrap.innerHTML = '<div class="state-msg"><div class="spinner"></div>Carregando comentários...</div>';
  try {
    const q = query(collectionGroup(db, 'meusComentarios'), orderBy('ts', 'desc'), limit(100));
    const snap = await getDocs(q);
    _commentsLoaded = true;
    if (snap.empty) { wrap.innerHTML = '<p class="empty-hint">Nenhum comentário ainda.</p>'; return; }
    const linhas = [];
    snap.forEach(function (docSnap) {
      const d = docSnap.data();
      const uid = docSnap.ref.parent.parent ? docSnap.ref.parent.parent.id : '?';
      const data = d.ts && d.ts.toDate ? d.ts.toDate() : null;
      linhas.push(
        '<div class="issue-row" style="align-items:flex-start;flex-direction:column;gap:4px;padding:12px">' +
        '<div style="display:flex;justify-content:space-between;width:100%;gap:10px">' +
        '<span class="cell-main" style="color:var(--text-1);font-weight:700">' + escapeHtml(d.contentName || '—') +
        (d.isReply ? ' <span class="issue-tag" style="margin-left:4px">resposta</span>' : '') + '</span>' +
        '<span style="color:var(--text-3);font-size:0.74rem;flex-shrink:0">' + (data ? data.toLocaleString('pt-BR') : '') + '</span></div>' +
        '<div style="color:var(--text-2);font-size:0.85rem">' + escapeHtml(d.text || '') + '</div>' +
        '<div style="color:var(--text-3);font-size:0.7rem">usuário ' + uid.slice(0, 8) + '...</div></div>'
      );
    });
    wrap.innerHTML = '<div class="issue-list">' + linhas.join('') + '</div>';
  } catch (e) {
    console.error(e);
    wrap.innerHTML =
      '<div class="state-msg error">Não consegui carregar os comentários (provavelmente falta liberar a leitura da coleção <code>meusComentarios</code> nas regras do Firestore pro seu e-mail admin — e também falta criar o índice, se o erro mencionar "COLLECTION_GROUP_DESC": abra o link que aparece no console do navegador e clique em "criar índice").</div>' +
      '<div class="rule-box">' + escapeHtml(RULES_HINT_COMMENTS) + '</div>';
  }
}
document.getElementById('btnRefreshComments').addEventListener('click', function () {
  this.classList.add('is-loading');
  loadComentarios().finally(() => this.classList.remove('is-loading'));
});

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
function initApp() {
  renderNav();
  switchTab('dashboard');
  loadDashboard(false);
}
