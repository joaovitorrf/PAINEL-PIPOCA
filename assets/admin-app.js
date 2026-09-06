/**
 * PIPOCAFLIX ADMIN — admin-app.js
 * Login (mesmo projeto Firebase do site) + navegação + renderização.
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, collectionGroup, getDocs, query, orderBy, limit }
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
   NAVEGAÇÃO
═══════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },
  { id: 'tmdb', label: 'Buscar no TMDB', icon: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
  { id: 'assinantes', label: 'Assinantes', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
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
  if (id === 'assinantes' && !_vipLoaded) loadAssinantes();
  if (id === 'comentarios' && !_commentsLoaded) loadComentarios();
  if (id === 'catalogo' && _catalogo) renderCatalogoTable(_catalogo);
}
document.getElementById('mobileMenuBtn').addEventListener('click', function () {
  document.getElementById('mobileNav').classList.toggle('open');
});

/* ═══════════════════════════════════════════════════════
   DASHBOARD + CATÁLOGO (mesma fonte de dados)
═══════════════════════════════════════════════════════ */
let _catalogo = null;

function fmtNum(n) { return n.toLocaleString('pt-BR'); }

async function loadDashboard(force) {
  if (_catalogo && !force) { renderDashboard(_catalogo); return; }
  document.getElementById('statGrid').innerHTML = '<div class="state-msg"><div class="spinner"></div>Carregando...</div>';
  document.getElementById('catBarList').innerHTML = '';
  document.getElementById('audioBarList').innerHTML = '';
  document.getElementById('issueList').innerHTML = '';
  try {
    _catalogo = await D.getCatalogoCompleto();
    renderDashboard(_catalogo);
    if (currentTab === 'catalogo') renderCatalogoTable(_catalogo);
  } catch (e) {
    console.error(e);
    document.getElementById('statGrid').innerHTML = '<div class="state-msg error">Não foi possível carregar o catálogo agora.</div>';
  }
}

function renderDashboard(cat) {
  const nEpisodios = cat.episodios.length;
  const seriesComEp = new Set(cat.episodios.map(e => D.normalizeStr(e.serie)));
  const problemas = D.analisarProblemas(cat);

  document.getElementById('statGrid').innerHTML =
    statCard('🎬', fmtNum(cat.filmes.length), 'Filmes') +
    statCard('📺', fmtNum(cat.series.length), 'Séries') +
    statCard('🎞️', fmtNum(nEpisodios), 'Episódios') +
    statCard('📡', fmtNum(seriesComEp.size), 'Séries com episódio no ar') +
    statCard('⚠️', fmtNum(problemas.length), 'Itens pra revisar', problemas.length > 0);

  const categorias = D.contarPorCategoria(cat).slice(0, 8);
  const maxCat = categorias.length ? categorias[0][1] : 1;
  document.getElementById('catBarList').innerHTML = categorias.length
    ? categorias.map(([nome, n]) => barRow(nome, n, maxCat)).join('')
    : '<p class="empty-hint">Sem dados de categoria.</p>';

  const audio = D.contarAudio(cat);
  const maxAudio = Math.max(audio.dublado, audio.legendado, audio.outro, 1);
  document.getElementById('audioBarList').innerHTML =
    barRow('Dublado', audio.dublado, maxAudio) + barRow('Legendado', audio.legendado, maxAudio) + barRow('Não informado', audio.outro, maxAudio);

  document.getElementById('issueList').innerHTML = problemas.length
    ? problemas.slice(0, 40).map(p =>
        '<div class="issue-row"><span class="issue-icon">' + (p.tipo === 'Filme' ? '🎬' : '📺') + '</span>' +
        '<span class="issue-name">' + escapeHtml(p.nome) + '</span><span class="issue-tag">' + p.motivo + '</span></div>'
      ).join('') + (problemas.length > 40 ? '<p class="empty-hint">+ ' + (problemas.length - 40) + ' outros...</p>' : '')
    : '<p class="empty-hint">Nada pra revisar — tudo certo! 🎉</p>';
}

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
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

document.getElementById('btnRefreshDash').addEventListener('click', function () {
  this.classList.add('is-loading');
  loadDashboard(true).finally(() => this.classList.remove('is-loading'));
});

/* ── Catálogo (tabela filtrável) ── */
let _catalogoFilterText = '';
function renderCatalogoTable(cat) {
  const todos = cat.filmes.concat(cat.series).sort((a, b) => a.nome.localeCompare(b.nome));
  const filtro = D.normalizeStr(_catalogoFilterText);
  const filtrados = filtro ? todos.filter(i => D.normalizeStr(i.nome).includes(filtro)) : todos;
  const table = document.getElementById('catalogoTable');
  const linhas = filtrados.slice(0, 300).map(function (item) {
    const temLink = !!(item.linkMP4 || item.player2 || item.player3 || item.player4 || item.player5);
    return '<tr><td class="cell-main">' + escapeHtml(item.nome) + '</td>' +
      '<td>' + (item.isSerie ? '📺 Série' : '🎬 Filme') + '</td>' +
      '<td>' + escapeHtml((item.categoria || '').split(',')[0] || '—') + '</td>' +
      '<td>' + escapeHtml(item.ano || '—') + '</td>' +
      '<td>' + (temLink ? '<span class="pill ok">✓ tem link</span>' : '<span class="pill no">✗ sem link</span>') + '</td>' +
      '<td>' + (item.capa ? '<span class="pill ok">✓ capa</span>' : '<span class="pill no">✗ sem capa</span>') + '</td></tr>';
  }).join('');
  table.innerHTML = '<thead><tr><th>Nome</th><th>Tipo</th><th>Categoria</th><th>Ano</th><th>Player</th><th>Capa</th></tr></thead><tbody>' +
    (linhas || '<tr><td colspan="6"><p class="empty-hint">Nada encontrado.</p></td></tr>') + '</tbody>';
  if (filtrados.length > 300) {
    table.insertAdjacentHTML('afterend', '<p class="empty-hint" id="catalogoMoreHint">Mostrando 300 de ' + filtrados.length + ' — refine a busca pra ver mais.</p>');
  } else {
    const hint = document.getElementById('catalogoMoreHint'); if (hint) hint.remove();
  }
}
document.getElementById('catalogoFilter').addEventListener('input', function (e) {
  _catalogoFilterText = e.target.value;
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
    const ano = (r.release_date || r.first_air_date || '').slice(0, 4);
    const tipo = r.media_type === 'tv' ? 'Série' : 'Filme';
    const poster = r.poster_path ? (D.TMDB_IMG_BASE + r.poster_path) : '';
    const existe = D.jaExisteNoCatalogo(nome, _catalogo);
    return '<div class="tmdb-card">' +
      (poster ? '<img src="' + poster + '" alt="" loading="lazy">' : '<div style="aspect-ratio:2/3;background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:0.75rem">Sem imagem</div>') +
      '<div class="tmdb-info"><div class="tmdb-name">' + escapeHtml(nome) + '</div>' +
      '<div class="tmdb-meta">' + tipo + (ano ? ' · ' + ano : '') + '</div>' +
      (existe ? '<span class="badge-status found">✓ Já no site</span>' : '<span class="badge-status missing">+ Não encontrado</span>') +
      '</div></div>';
  }).join('');
}
document.getElementById('tmdbBtn').addEventListener('click', runTmdbSearch);
document.getElementById('tmdbInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') runTmdbSearch(); });

/* ═══════════════════════════════════════════════════════
   ASSINANTES (Firestore: coleção "vip")
═══════════════════════════════════════════════════════ */
let _vipLoaded = false;
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
let _vipRows = [];
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
      '<div class="state-msg error">Não consegui carregar os comentários (provavelmente falta liberar a leitura da coleção <code>meusComentarios</code> nas regras do Firestore pro seu e-mail admin).</div>' +
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
