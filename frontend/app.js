// ── BASE URL ────────────────────────────────────────────────────────────────
const APP_BASE = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
const API_BASE = location.origin + APP_BASE;
const PER_PAGE = 50;

// ── AUTH ───────────────────────────────────────────────────────────────────
const AUTH_TOKEN_KEY = 'gdash_token';
let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';

function temToken() { return !!authToken; }

function mostrarLogin() {
  document.getElementById('loginOverlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('loginUser').focus(), 50);
}

function esconderLogin() {
  document.getElementById('loginOverlay').classList.add('hidden');
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function fazerLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const btn = document.getElementById('btnLogin');
  const err = document.getElementById('loginError');
  err.classList.add('hidden');

  if (!user || !pass) {
    showLoginError('Preencha usuário e senha.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'ENTRANDO...';
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password: pass })
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      showLoginError(data.error || 'Falha no login.');
      return;
    }
    authToken = data.token;
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    esconderLogin();
    atualizarApiStatus(true);
function iniciarApp() {
  if (temToken()) {
    esconderLogin();
    iniciarAlertas();
  } else {
    mostrarLogin();
  }
}

iniciarApp();
    mostrarToast('Bem-vindo, admin!');
  } catch (e) {
    showLoginError('API fora do ar. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'ENTRAR';
  }
}

function sairSistema() {
  authToken = '';
  localStorage.removeItem(AUTH_TOKEN_KEY);
  mostrarLogin();
}

function authFetch(url, opts = {}) {
  opts.headers = Object.assign({}, opts.headers || {});
  if (authToken) opts.headers['Authorization'] = `Bearer ${authToken}`;
  if (opts.body) opts.headers['Content-Type'] = 'application/json';

  return fetch(url, opts).then(res => {
    if (res.status === 401) {
      authToken = '';
      localStorage.removeItem(AUTH_TOKEN_KEY);
      mostrarLogin();
    }
    return res;
  });
}

let allPlayers = [];
let filteredPlayers = [];
let currentPage = 1;
let sortChain = [{ key: 'level', dir: 'desc' }];
let vocFilter = 'all';
let isUnited = false;
let statusFilter = 'online';

// ── STAR FIELD ──────────────────────────────────────────────────────────────
(function criarEstrelas() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2 + 0.5;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      --d:${3 + Math.random() * 6}s;
      --delay:${Math.random() * 6}s;
      --min:${0.05 + Math.random() * 0.1};
      --max:${0.3 + Math.random() * 0.5};
    `;
    container.appendChild(s);
  }
})();

// ── KEYBOARD ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (!document.getElementById('loginOverlay').classList.contains('hidden')) {
    fazerLogin();
    return;
  }
  const rs = document.getElementById('resultsSection');
  if (!rs.classList.contains('hidden')) return;
  buscarGuilda();
});

// ── QUICK ACCESS ──────────────────────────────────────────────────────────
function buscarRapido(world, guild) {
  document.getElementById('inputWorld').value = world;
  document.getElementById('inputGuild').value = guild;
  buscarGuilda();
}

// ── MAIN SEARCH ───────────────────────────────────────────────────────────
async function buscarGuilda() {
  const world = document.getElementById('inputWorld').value.trim();
  const guild = document.getElementById('inputGuild').value.trim();
  const errEl = document.getElementById('errorMsg');

  errEl.classList.add('hidden');

  if (!world || !guild) {
    mostrarErro('Preencha o mundo e o nome da guilda.');
    return;
  }

  setLoading(true);

  isUnited = world.toLowerCase() === 'ferobra' && guild.toLowerCase() === 'united';

  try {
    let data;
    if (isUnited) {
      const res = await authFetch(`${API_BASE}/api/united`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } else {
      const res = await authFetch(`${API_BASE}/api/guilds/${encodeURIComponent(world)}/${encodeURIComponent(guild)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    }

    if (!data.success) throw new Error(data.message || 'Erro desconhecido');

    allPlayers = data.guild.players || [];
    renderDashboard(data.guild.guildName || guild, data.world || world);
    atualizarApiStatus(true);

  } catch (err) {
    mostrarErro(`Não foi possível buscar a guilda. Verifique se a API está rodando em localhost:4000. (${err.message})`);
    atualizarApiStatus(false);
  } finally {
    setLoading(false);
  }
}

// ── RENDER ────────────────────────────────────────────────────────────────
function renderDashboard(guildName, world) {
  document.getElementById('guildTitle').textContent = guildName.toUpperCase();
  document.getElementById('guildWorld').textContent = `MUNDO: ${world.toUpperCase()}`;

  document.getElementById('searchSection').classList.add('hidden');
  document.getElementById('resultsSection').classList.remove('hidden');

  const sortOnlineBtn = document.getElementById('sortOnlineBtn');
  if (sortOnlineBtn) sortOnlineBtn.style.display = isUnited ? '' : 'none';

  sortChain = [{ key: 'level', dir: 'desc' }];
  vocFilter = 'all';
  statusFilter = 'online';
  currentPage = 1;

  renderVocFilters();
  renderHead();
  renderSortButtons();
  aplicarFiltrosEOrdenacao();
  carregarAlertaGuild(guildName);
}

function renderHead() {
  const head = document.getElementById('tableHead');
  const trackerCols = isUnited
    ? `<th>TEMPO ONLINE</th><th>LOGIN</th>`
    : '';
  head.innerHTML = `<tr>
    <th class="th-num">#</th>
    <th></th>
    <th>JOGADOR</th>
    <th>RANK</th>
    <th>VOCAÇÃO</th>
    <th class="th-num">LEVEL</th>
    ${trackerCols}
    <th>ENTRADA</th>
  </tr>`;
}

function renderVocFilters() {
  const vocSet = new Set();
  allPlayers.forEach(p => vocSet.add(abrevVoc(p.vocation)));
  const el = document.getElementById('vocFilters');
  el.innerHTML = '';
  if (vocSet.size < 2) return;

  const all = document.createElement('button');
  all.className = 'voc-btn active';
  all.textContent = 'TODAS';
  all.onclick = () => setVocFilter('all');
  el.appendChild(all);

  ['EK', 'RP', 'ED', 'MS', 'EM', 'Knight', 'Paladin', 'Druid', 'Sorcerer', 'Monk', '?'].forEach(v => {
    if (!vocSet.has(v)) return;
    const btn = document.createElement('button');
    btn.className = 'voc-btn';
    btn.textContent = v;
    btn.onclick = () => setVocFilter(v);
    el.appendChild(btn);
  });
}

function setVocFilter(v) {
  vocFilter = v;
  document.querySelectorAll('.voc-btn').forEach(b => {
    b.classList.toggle('active',
      (v === 'all' && b.textContent === 'TODAS') || b.textContent === v
    );
  });
  currentPage = 1;
  aplicarFiltrosEOrdenacao();
}

function setStatusFilter(v) {
  statusFilter = v;
  const onBtn = document.getElementById('filterOnline');
  const offBtn = document.getElementById('filterOffline');
  onBtn.className = 'status-btn' + (v === 'online' ? ' active' : '');
  offBtn.className = 'status-btn' + (v === 'offline' ? ' active-offline' : '');
  currentPage = 1;
  aplicarFiltrosEOrdenacao();
}

function aplicarFiltrosEOrdenacao() {
  const query = (document.getElementById('filterInput').value || '').toLowerCase();

  filteredPlayers = allPlayers.filter(p => {
    const matchName = p.name.toLowerCase().includes(query);
    const matchVoc = vocFilter === 'all' || abrevVoc(p.vocation) === vocFilter;
    const matchStatus = statusFilter === 'online' ? p.isOnline : !p.isOnline;
    return matchName && matchVoc && matchStatus;
  });

  filteredPlayers.sort((a, b) => {
    for (const { key, dir } of sortChain) {
      let va, vb;
      if (key === 'level') {
        va = a.level || 0; vb = b.level || 0;
      } else if (key === 'name') {
        va = a.name.toLowerCase(); vb = b.name.toLowerCase();
      } else if (key === 'online') {
        va = a.onlineDurationMinutes ?? -1;
        vb = b.onlineDurationMinutes ?? -1;
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      // empate neste critério -> tenta o próximo da cadeia
    }
    return 0;
  });

  renderStats();
  renderPagination();
  renderPage();
}

function renderStats() {
  const online = allPlayers.filter(p => p.isOnline).length;
  const offline = allPlayers.filter(p => !p.isOnline).length;
  const total = allPlayers.length;
  const filtered = filteredPlayers.length;
  const el = document.getElementById('resultsStats');
  el.innerHTML = `
    <div class="stat-pill"><span>${online}</span> online</div>
    <div class="stat-pill"><span>${offline}</span> offline</div>
    <div class="stat-pill"><span>${total}</span> membros</div>
    ${filtered !== (statusFilter === 'online' ? online : offline) ? `<div class="stat-pill"><span>${filtered}</span> filtrados</div>` : ''}
  `;
}

function renderPage() {
  const body = document.getElementById('tableBody');
  const start = (currentPage - 1) * PER_PAGE;
  const slice = filteredPlayers.slice(start, start + PER_PAGE);

  if (slice.length === 0) {
    body.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-dim);padding:2rem;letter-spacing:0.1em;font-size:12px;">NENHUM JOGADOR ENCONTRADO</td></tr>`;
    return;
  }

  body.innerHTML = slice.map((p, idx) => {
    const globalIdx = start + idx + 1;
    const statusDot = p.isOnline
      ? `<span class="dot-online"></span>`
      : `<span class="dot-offline"></span>`;

    const rankClass = getRankClass(p.rank);
    const rankBadge = `<span class="rank-badge ${rankClass}">${p.rank || '—'}</span>`;

    const vocClass = getVocClass(p.vocation);
    const vocAbrev = abrevVoc(p.vocation);
    const vocCell = `<span class="voc-badge ${vocClass}">${vocAbrev}</span>`;

    let trackerCells = '';
    if (isUnited) {
      const dur = p.onlineDurationMinutes;
      let timeStr, timeClass;
      if (!p.isOnline || dur == null) {
        timeStr = '—'; timeClass = 'unknown';
      } else if (dur >= 120) {
        timeStr = formatMinutes(dur); timeClass = 'long';
      } else {
        timeStr = formatMinutes(dur); timeClass = '';
      }
      const loginStr = p.loginTime ? formatLoginTime(p.loginTime) : '—';
      trackerCells = `
        <td><span class="online-time ${timeClass}">${timeStr}</span></td>
        <td class="join-date">${loginStr}</td>
      `;
    }

    const joinDate = p.joiningDate ? `<span class="join-date">${p.joiningDate}</span>` : '—';

    return `<tr>
      <td class="row-index">${globalIdx}</td>
      <td>${statusDot}</td>
      <td><span class="player-name" onclick="copiarExiva('${escapeAttr(p.name)}')" title="Clique para copiar exiva">${p.name}</span></td>
      <td>${rankBadge}</td>
      <td>${vocCell}</td>
      <td class="td-num"><span class="level-num">${p.level || '?'}</span></td>
      ${trackerCells}
      <td>${joinDate}</td>
    </tr>`;
  }).join('');
}

function renderPagination() {
  const total = Math.ceil(filteredPlayers.length / PER_PAGE);
  const el = document.getElementById('pagination');
  if (total <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="irPagina(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

  const range = paginaRange(currentPage, total);
  range.forEach(p => {
    if (p === '...') {
      html += `<span style="color:var(--text-dim);padding:0 4px;font-size:12px">…</span>`;
    } else {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="irPagina(${p})">${p}</button>`;
    }
  });

  html += `<button class="page-btn" onclick="irPagina(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

function paginaRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function irPagina(p) {
  const total = Math.ceil(filteredPlayers.length / PER_PAGE);
  if (p < 1 || p > total) return;
  currentPage = p;
  renderPage();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SORT ──────────────────────────────────────────────────────────────────
function ordenarPor(key) {
  const defaultDir = key === 'name' ? 'asc' : 'desc';
  const idx = sortChain.findIndex(s => s.key === key);

  if (idx === -1) {
    // não está na cadeia -> torna-se o critério primário
    sortChain.unshift({ key, dir: defaultDir });
  } else if (idx === 0) {
    // já é o primário -> inverte direção
    sortChain[0].dir = sortChain[0].dir === 'asc' ? 'desc' : 'asc';
  } else {
    // já está na cadeia (como secundário) -> promove a primário
    const [item] = sortChain.splice(idx, 1);
    sortChain.unshift(item);
  }

  renderSortButtons();
  currentPage = 1;
  aplicarFiltrosEOrdenacao();
}

function renderSortButtons() {
  const map = {
    level: 'sortLevel',
    name: 'sortName',
    online: 'sortOnlineBtn'
  };
  Object.entries(map).forEach(([key, id]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const isActive = sortChain.some(s => s.key === key);
    btn.classList.toggle('active', isActive);
  });
}

// ── FILTER ────────────────────────────────────────────────────────────────
function filtrarTabela() {
  currentPage = 1;
  aplicarFiltrosEOrdenacao();
}

// ── EXIVA COPY ────────────────────────────────────────────────────────────
function copiarExiva(name) {
  const text = `exiva "${name}"`;
  navigator.clipboard.writeText(text).then(() => {
    mostrarToast(`exiva "${name}" copiado!`);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    mostrarToast(`exiva "${name}" copiado!`);
  });
}

// ── BACK ──────────────────────────────────────────────────────────────────
function voltarBusca() {
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('searchSection').classList.remove('hidden');
  document.getElementById('filterInput').value = '';
  document.getElementById('errorMsg').classList.add('hidden');
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function setLoading(on) {
  const btn = document.getElementById('btnSearch');
  const txt = document.getElementById('btnText');
  const icon = document.getElementById('btnIcon');
  const spin = document.getElementById('btnSpinner');
  btn.disabled = on;
  txt.textContent = on ? 'BUSCANDO' : 'BUSCAR';
  icon.classList.toggle('hidden', on);
  spin.classList.toggle('hidden', !on);
}

function mostrarErro(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

let toastTimer;
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.remove('hidden');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 300);
  }, 2500);
}

function atualizarApiStatus(ok) {
  const dot = document.querySelector('.status-dot');
  const txt = document.getElementById('apiStatusText');
  dot.className = 'status-dot ' + (ok ? 'online' : 'error');
  txt.textContent = ok ? 'API ONLINE' : 'API OFFLINE';
}

function abrevVoc(voc) {
  if (!voc) return '?';
  const v = voc.toLowerCase();
  if (v.includes('elite knight')) return 'EK';
  if (v.includes('royal paladin')) return 'RP';
  if (v.includes('elder druid')) return 'ED';
  if (v.includes('master sorcerer')) return 'MS';
  if (v.includes('knight')) return 'Knight';
  if (v.includes('paladin')) return 'Paladin';
  if (v.includes('druid')) return 'Druid';
  if (v.includes('sorcerer')) return 'Sorcerer';
  if (v.includes('exalted monk')) return 'EM';
  if (v.includes('monk')) return 'Monk';
  return voc.substring(0, 4).toUpperCase();
}

function getVocClass(voc) {
  const a = abrevVoc(voc);
  const map = {
    'EK': 'voc-ek', 'RP': 'voc-rp', 'ED': 'voc-ed', 'MS': 'voc-ms',
    'Knight': 'voc-ek-s', 'Paladin': 'voc-rp-s', 'Druid': 'voc-ed-s', 'Sorcerer': 'voc-ms-s',
    'EM': 'voc-em', 'Monk': 'voc-monk'
  };
  return map[a] || '';
}

function getRankClass(rank) {
  if (!rank) return '';
  const r = rank.toLowerCase();
  if (r.includes('leader') || r.includes('lider') || r.includes('líder')) return 'leader';
  if (r.includes('vice') || r.includes('co-leader')) return 'vice';
  return '';
}

function formatMinutes(min) {
  if (min == null || min < 0) return '—';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatLoginTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── ALERTS (por guild, na página da guild) ─────────────────────────────────
let currentGuild = '';
let lastAlertId = parseInt(localStorage.getItem('lastAlertId') || '0', 10);
let initializedAlerts = localStorage.getItem('lastAlertId') !== null;

function carregarAlertaGuild(guildName) {
  currentGuild = guildName;

  const bar = document.getElementById('guildAlertBar');
  const note = document.getElementById('guildAlertNote');
  bar.style.display = 'flex';
  note.classList.add('hidden');

  authFetch(`${API_BASE}/api/alerts`)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(data => {
      const cfg = (data.alerts || []).find(a => a.guild === guildName);
      const enabled = document.getElementById('guildAlertEnabled');
      const threshold = document.getElementById('guildAlertThreshold');
      const interval = document.getElementById('guildAlertInterval');
      const btn = document.getElementById('btnSaveGuildAlert');

      if (!cfg) {
        note.textContent = 'Guild não rastreada — o alerta só funciona para guildas na lista de rastreamento.';
        note.classList.remove('hidden');
        enabled.checked = false;
        threshold.value = 0;
        interval.value = 10;
        btn.disabled = true;
        btn.style.opacity = '0.45';
        return;
      }

      btn.disabled = false;
      btn.style.opacity = '';
      enabled.checked = !!cfg.enabled;
      threshold.value = cfg.threshold || 0;
      interval.value = cfg.intervalMinutes || 10;
    })
    .catch(() => {
      note.textContent = 'Alerta indisponível (API offline?)';
      note.classList.remove('hidden');
      atualizarApiStatus(false);
    });
}

async function salvarAlertaGuild() {
  if (!currentGuild) return;
  const btn = document.getElementById('btnSaveGuildAlert');
  btn.disabled = true;
  btn.textContent = 'SALVANDO...';
  try {
    const res = await authFetch(`${API_BASE}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guild: currentGuild,
        enabled: document.getElementById('guildAlertEnabled').checked,
        threshold: parseInt(document.getElementById('guildAlertThreshold').value, 10) || 0,
        intervalMinutes: parseInt(document.getElementById('guildAlertInterval').value, 10) || 10,
        webhookUrl: ''
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cfg = data.alert;
    if (cfg.enabled && cfg.threshold > 0) {
      mostrarToast(`Alerta de ${cfg.guild}: ${cfg.threshold}+ logins em ${cfg.intervalMinutes}min`);
    } else {
      mostrarToast(`Alerta de ${cfg.guild} desativado.`);
    }
  } catch (e) {
    mostrarToast('Falha ao salvar alerta.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'SALVAR';
  }
}

function tocarAlarme() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const notes = [880, 1174.66, 880, 1174.66, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.28;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch (e) { /* áudio indisponível */ }
}

function mostrarNotificacao(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body, tag: 'guild-alert' }); } catch (e) {}
  }
  mostrarToast(`${title} — ${body}`);
}

async function iniciarPollingAlerts() {
  try {
    const res = await authFetch(`${API_BASE}/api/alerts/latest?since=${lastAlertId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const events = data.events || [];

    if (!initializedAlerts) {
      if (events.length) lastAlertId = events[events.length - 1].id;
      initializedAlerts = true;
      localStorage.setItem('lastAlertId', String(lastAlertId));
      return;
    }

    for (const ev of events) {
      lastAlertId = Math.max(lastAlertId, ev.id);
      tocarAlarme();
      mostrarNotificacao(`ALERTA: ${ev.guild_name}`, `${ev.online_count} logins em poucos minutos — possível masslog!`);
    }
    localStorage.setItem('lastAlertId', String(lastAlertId));
  } catch (e) { /* API fora do ar, tenta de novo no próximo ciclo */ }
}

function iniciarAlertas() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  iniciarPollingAlerts();
  setInterval(iniciarPollingAlerts, 5000);
}

iniciarAlertas();
