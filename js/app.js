(function () {
  'use strict';
  const C = window.CATALOG, COATS = window.COATS, RAL = window.RAL, SITE = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // window.IMG — встроенные картинки в однофайловой версии (tools/bundle.js)
  const img = h => { const f = h.substring(10, 24) + '.jpg'; return (window.IMG && window.IMG[f]) || 'img/' + f; };
  const markLink = (p, inner) => window.SINGLE ? inner : `<a href="marki/${p.id}.html">${inner}</a>`;
  const rub = n => Math.round(n).toLocaleString('ru-RU') + ' ₽';
  const num = (n, d = 1) => (+n).toLocaleString('ru-RU', { maximumFractionDigits: d });
  const th = t => String(t).replace('.', ',') + ' мм';
  const uniq = a => [...new Set(a)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function coatSwatchClass(coat) {
    const c = COATS[coat];
    if (!c) return '';
    if (c.hex === 'zinc') return 'dot--zinc';
    if (c.hex === 'ral') return 'dot--ral';
    return '';
  }
  function coatStyle(coat) {
    const c = COATS[coat];
    return c && c.hex[0] === '#' ? `background:${c.hex}` : '';
  }

  /* ================= REQUEST BASKET ================= */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('azpts-basket') || '[]'); } catch (e) { return []; } },
    set(v) { try { localStorage.setItem('azpts-basket', JSON.stringify(v)); } catch (e) {} }
  };
  let basket = store.get();
  function addToBasket(entry) {
    const ex = basket.find(b => b.key === entry.key);
    if (ex) ex.qty += entry.qty || 0; else basket.push(entry);
    store.set(basket); renderBasket();
  }
  function renderBasket() {
    const ul = $('#basket');
    $('#basketCount').textContent = basket.length;
    $('#basketFab').hidden = basket.length === 0;
    if (!basket.length) { ul.innerHTML = '<li class="basket__empty" style="background:none;border:0;padding:0">Позиции не выбраны — опишите задачу в комментарии.</li>'; return; }
    ul.innerHTML = basket.map((b, i) => `
      <li><div>${esc(b.title)}<small>${esc(b.sub)}${b.price ? ' · ' + rub(b.price) + '/м²' : ''}</small></div>
      <input type="number" min="0" step="1" value="${b.qty || ''}" placeholder="м²" data-i="${i}" aria-label="Количество, м²">
      <button type="button" data-del="${i}" aria-label="Удалить">×</button></li>`).join('');
  }
  $('#basket').addEventListener('input', e => {
    if (e.target.dataset.i != null) { basket[e.target.dataset.i].qty = +e.target.value || 0; store.set(basket); }
  });
  $('#basket').addEventListener('click', e => {
    if (e.target.dataset.del != null) { basket.splice(+e.target.dataset.del, 1); store.set(basket); renderBasket(); }
  });
  const drawer = $('#drawer');
  function openDrawer(comment) {
    if (comment) $('#reqForm [name=comment]').value = comment;
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#reqForm [name=name]').focus(), 300);
  }
  function closeDrawer() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); }
  document.addEventListener('click', e => {
    const or = e.target.closest('[data-open-request]');
    if (or) { e.preventDefault(); openDrawer(or.dataset.comment); }
    if (e.target.closest('[data-close]')) closeDrawer();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  $('#reqForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    let msg = 'Здравствуйте! Заявка с сайта.\nИмя: ' + f.get('name') + '\nТелефон: ' + f.get('phone');
    if (basket.length) msg += '\n\nПозиции:\n' + basket.map(b => `— ${b.title}, ${b.sub}${b.qty ? ' — ' + b.qty + ' м²' : ''}`).join('\n');
    if (f.get('comment')) msg += '\n\n' + f.get('comment');
    if (window.ym && SITE.metrikaId) window.ym(+SITE.metrikaId, 'reachGoal', 'lead');
    window.open('https://wa.me/' + SITE.leadWhatsApp + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

  /* ================= CATALOG ================= */
  const grid = $('#grid');
  const state = {}; // id -> {t, c}
  let catFilter = 'all', colorFilter = '';

  const allCoats = uniq(C.flatMap(p => p.items.map(i => i[1])));
  $('#colorFilter').insertAdjacentHTML('beforeend', allCoats.map(c => `<option value="${esc(c)}">${esc(c)}${COATS[c] && c.startsWith('RAL') ? ' — ' + COATS[c].name : ''}</option>`).join(''));

  function current(p) {
    const s = state[p.id];
    return p.items.find(i => i[0] === s.t && i[1] === s.c);
  }
  function cardHTML(p) {
    const ths = uniq(p.items.map(i => i[0])).sort();
    const coats = uniq(p.items.map(i => i[1]));
    const spec = p.spec ? `<div class="card__spec">${p.spec.h ? `<div>Волна<b>${p.spec.h} мм</b></div>` : ''}<div>Ширина<b>${p.spec.full} мм</b></div>${p.spec.work !== p.spec.full ? `<div>Полезная<b>${p.spec.work} мм</b></div>` : ''}</div>` : '';
    if (p.onRequest) {
      return `<article class="card" id="card-${p.id}" data-cat="${p.cat}">
        <div class="card__img card__img--svg"><span class="card__mark">${p.mark}</span>${window.sheetSVG(p.spec.h)}</div>
        <div class="card__body"><h3 class="card__title">${markLink(p, p.title)}</h3><p class="card__use">${p.use}</p>${spec}
        <p class="card__coat">Толщина и покрытие — по запросу</p>
        <div class="card__foot"><div class="price" style="font-size:18px">Цена по запросу</div>
        <button class="add" data-req="${p.id}">Запросить</button></div></div></article>`;
    }
    return `<article class="card" id="card-${p.id}" data-cat="${p.cat}">
      <div class="card__img"><span class="card__mark">${p.mark}</span><img loading="lazy" alt="${esc(p.title)}"></div>
      <div class="card__body">
        <h3 class="card__title">${markLink(p, p.title)}</h3>
        <p class="card__use">${p.use}</p>
        ${spec}
        <div><span class="opt-label">Толщина</span><div class="opts">${ths.map(t => `<button class="opt" data-t="${t}">${th(t)}</button>`).join('')}</div></div>
        <div><span class="opt-label">Покрытие</span><div class="dots">${coats.map(c => `<button class="dot ${coatSwatchClass(c)}" style="${coatStyle(c)}" data-c="${esc(c)}" title="${esc(c)}" aria-label="${esc(c)}"></button>`).join('')}</div>
        <p class="card__coat"></p></div>
        <div class="card__foot"><div class="price"></div><button class="add" data-add="${p.id}">В заявку</button></div>
      </div></article>`;
  }
  function syncCard(p) {
    const el = $('#card-' + p.id); if (!el || p.onRequest) return;
    const s = state[p.id];
    $$('.opt', el).forEach(b => {
      b.classList.toggle('is-active', +b.dataset.t === s.t);
    });
    $$('.dot', el).forEach(b => {
      const ok = p.items.some(i => i[0] === s.t && i[1] === b.dataset.c);
      b.disabled = !ok;
      b.classList.toggle('is-active', b.dataset.c === s.c);
    });
    const it = current(p);
    const im = $('.card__img img', el);
    const src = img(it[3]);
    if (im.getAttribute('src') !== src) im.src = src;
    const cn = COATS[it[1]];
    $('.card__coat', el).textContent = it[1] + (cn && it[1] !== cn.name ? ' · ' + cn.name : '');
    $('.price', el).innerHTML = rub(it[2]) + '<small>за м² · ' + th(it[0]) + '</small>';
  }
  function pick(p, t, c) {
    const s = state[p.id];
    if (t != null) {
      s.t = t;
      if (!p.items.some(i => i[0] === t && i[1] === s.c)) s.c = p.items.find(i => i[0] === t)[1];
    }
    if (c != null) {
      if (!p.items.some(i => i[0] === s.t && i[1] === c)) s.t = p.items.find(i => i[1] === c)[0];
      s.c = c;
    }
    syncCard(p);
  }
  C.forEach(p => { if (p.items.length) state[p.id] = { t: p.items[0][0], c: p.items[0][1] }; });
  grid.innerHTML = C.map(cardHTML).join('') + '<p class="empty-grid" hidden>В этой категории нет позиций выбранного цвета. Уточните наличие у менеджера.</p>';
  C.forEach(syncCard);

  grid.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const p = C.find(x => 'card-' + x.id === card.id);
    const o = e.target.closest('.opt'), d = e.target.closest('.dot');
    if (o) pick(p, +o.dataset.t, null);
    if (d && !d.disabled) pick(p, null, d.dataset.c);
    if (e.target.closest('[data-add]')) {
      const it = current(p);
      addToBasket({ key: p.id + it[0] + it[1], title: p.title, sub: th(it[0]) + ', ' + it[1], price: it[2], qty: 0 });
      const b = e.target.closest('[data-add]');
      b.textContent = 'Добавлено ✓'; b.classList.add('is-done');
      setTimeout(() => { b.textContent = 'В заявку'; b.classList.remove('is-done'); }, 1400);
    }
    if (e.target.closest('[data-req]')) {
      addToBasket({ key: p.id, title: p.title, sub: 'цена по запросу', price: 0, qty: 0 });
      openDrawer();
    }
  });

  function applyFilters() {
    let shown = 0;
    C.forEach(p => {
      const el = $('#card-' + p.id);
      const okCat = catFilter === 'all' || p.cat === catFilter;
      const okColor = !colorFilter || p.items.some(i => i[1] === colorFilter);
      el.hidden = !(okCat && okColor);
      if (!el.hidden) shown++;
      if (okCat && okColor && colorFilter) pick(p, null, colorFilter);
    });
    $('.empty-grid', grid).hidden = shown > 0;
  }
  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('#filters .chip').forEach(x => x.classList.toggle('is-active', x === b));
    catFilter = b.dataset.cat; applyFilters();
  });
  $('#colorFilter').addEventListener('change', e => { colorFilter = e.target.value; applyFilters(); });

  function showColorInCatalog(code) {
    colorFilter = code; $('#colorFilter').value = code;
    catFilter = 'all'; $$('#filters .chip').forEach(x => x.classList.toggle('is-active', x.dataset.cat === 'all'));
    applyFilters();
    $('#catalog').scrollIntoView();
  }

  /* ================= MARKS ================= */
  const profs = C.filter(p => p.cat === 'prof' || p.cat === 'tile');
  const marks = profs.map(p => {
    const min = p.items.length ? Math.min(...p.items.map(i => i[2])) : null;
    const thR = p.items.length ? uniq(p.items.map(i => i[0])).sort().map(t => String(t).replace('.', ',')).join(' / ') + ' мм' : 'по запросу';
    return `<div class="mk"><svg viewBox="0 0 200 46" preserveAspectRatio="none">${profilePath(p)}</svg>
      <h3>${p.mark === 'МЧ' ? 'Монтеррей' : p.mark}</h3>
      <dl><dt>Волна</dt><dd>${p.spec.h} мм</dd><dt>Полезная</dt><dd>${p.spec.work} мм</dd><dt>Толщина</dt><dd>${thR}</dd><dt>Цена</dt><dd>${min ? 'от ' + rub(min) + '/м²' : 'по запросу'}</dd></dl>
      <p>${p.use}</p><a href="#card-${p.id}" data-goto="${p.id}">К позиции →</a></div>`;
  });
  $('#marksTable').innerHTML = marks.join('');
  $('#marksTable').addEventListener('click', e => {
    const a = e.target.closest('[data-goto]'); if (!a) return;
    e.preventDefault();
    catFilter = 'all'; colorFilter = ''; $('#colorFilter').value = '';
    $$('#filters .chip').forEach(x => x.classList.toggle('is-active', x.dataset.cat === 'all'));
    applyFilters();
    const el = $('#card-' + a.dataset.goto);
    el.scrollIntoView({ block: 'center' });
    el.animate([{ boxShadow: '0 0 0 3px #3346b8' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1600 });
  });
  function profilePath(p) {
    if (p.cat === 'tile') {
      let d = 'M0 30';
      for (let x = 0; x < 200; x += 25) d += ` C${x + 6} 30 ${x + 8} 12 ${x + 12.5} 12 C${x + 17} 12 ${x + 19} 30 ${x + 25} 30`;
      return `<path d="${d}"/>`;
    }
    return window.profileSVGPath(p.spec.h);
  }

  /* ================= REVIEWS ================= */
  $('#reviewsList').innerHTML = window.REVIEWS.map(r => `<article class="rev"><span class="rev__q">“</span><p>${esc(r.text)}</p><footer>${esc(r.name)}<span>${r.date}</span></footer></article>`).join('');

  /* ================= ROOF CALCULATOR ================= */
  const roofMats = C.filter(p => p.roof && p.items.length);
  const cMat = $('#cMat'), cVar = $('#cVar');
  cMat.innerHTML = roofMats.map(p => `<option value="${p.id}">${p.title.replace('Профлист ', '')}</option>`).join('');
  cMat.value = 'monterrey';
  function fillVariants() {
    const p = roofMats.find(x => x.id === cMat.value);
    cVar.innerHTML = p.items.map((i, k) => `<option value="${k}">${th(i[0])} · ${i[1]} — ${i[2]} ₽</option>`).join('');
  }
  fillVariants();
  const ids = ['cL', 'cW', 'cA', 'cO'];
  let lastCalc = null;

  function calc() {
    const type = $('#roofType input:checked').value;
    const L = Math.max(1, +$('#cL').value || 0), W = Math.max(1, +$('#cW').value || 0);
    const aDeg = +$('#cA').value, a = aDeg * Math.PI / 180, ov = +$('#cO').value;
    $('#cAv').textContent = aDeg + '°'; $('#cOv').textContent = num(ov, 2) + ' м';
    const p = roofMats.find(x => x.id === cMat.value), it = p.items[+cVar.value || 0];
    const full = p.spec.full / 1000, work = p.spec.work / 1000;
    let S, along = L + 2 * ov, slopes, area, sheets, sheetLen, matArea, ridge, ends, eaves, hips = 0;
    if (type === 'hip') {
      const run = W / 2 + ov;
      S = run / Math.cos(a);
      area = (L + 2 * ov) * (W + 2 * ov) / Math.cos(a);
      matArea = area * 1.25;
      sheetLen = S;
      sheets = Math.ceil(matArea / (full * S * 0.75));
      ridge = Math.max(L - W, 0);
      hips = 4 * Math.sqrt(run * run * 2 + Math.pow(run * Math.tan(a), 2));
      ends = 0; eaves = 2 * (L + W + 4 * ov); slopes = 4;
    } else {
      slopes = type === 'gable' ? 2 : 1;
      S = (type === 'gable' ? W / 2 : W) / Math.cos(a) + ov;
      area = slopes * S * along;
      const perSlope = Math.ceil(along / work);
      sheets = perSlope * slopes;
      sheetLen = Math.ceil((S + 0.05) * 20) / 20;
      matArea = sheets * full * sheetLen;
      ridge = type === 'gable' ? L + 2 * ov : 0;
      ends = slopes * 2 * S;
      eaves = along * slopes;
    }
    const screws = Math.ceil(matArea * 8 / 10) * 10;
    const cost = matArea * it[2];
    const rise = (type === 'gable' || type === 'hip' ? W / 2 : W) * Math.tan(a);

    const tiles = [
      ['Площадь скатов', num(area) + ' м²', slopes + (slopes === 1 ? ' скат' : ' ската')],
      ['Листов', (type === 'hip' ? '≈ ' : '') + sheets + ' шт', 'длина ' + num(sheetLen, 2) + ' м'],
      ['Материал с запасом', num(matArea) + ' м²', 'по полной ширине листа'],
      ['Высота конька', num(rise, 2) + ' м', 'от верха стен'],
      [type === 'hip' ? 'Конёк + рёбра' : 'Конёк', num(ridge + hips) + ' пог. м', type === 'hip' ? 'рёбра вальм ' + num(hips) + ' м' : (type === 'mono' ? 'нет — верхняя планка' : 'по длине ската')],
      ['Торцевая планка', num(ends) + ' пог. м', type === 'hip' ? 'не требуется' : 'по фронтонам'],
      ['Карнизная планка', num(eaves) + ' пог. м', 'по свесам'],
      ['Саморезы', '≈ ' + screws + ' шт', '~8 шт на м²']
    ];
    $('#results').innerHTML = tiles.map(t => `<div class="res"><span>${t[0]}</span><b>${t[1]}</b><small>${t[2]}</small></div>`).join('');
    $('#cTotal').textContent = rub(cost);
    let hint = `${p.title}, ${th(it[0])}, ${it[1]} — ${it[2]} ₽/м². Полезная ширина листа ${p.spec.work} мм.`;
    if (sheetLen > 8 && type !== 'hip') hint += ' Скат длиннее 8 м — лист разумно разбить на два с нахлёстом.';
    if (aDeg < 12 && p.id === 'monterrey') hint += ' Для металлочерепицы рекомендуемый уклон — от 14°.';
    if (type === 'hip') hint += ' Для вальмовой крыши число листов ориентировочное: точную раскладку сделает менеджер.';
    $('#cHint').textContent = hint;
    lastCalc = { type, L, W, aDeg, ov, p, it, area, sheets, sheetLen, matArea, cost, ridge, hips, ends, eaves, screws };
    drawScheme(type, L, W, a, aDeg, ov, S, along, sheets / (slopes > 2 ? 1 : slopes), work, it);
  }

  function coatColor(coat) {
    const c = COATS[coat];
    if (!c || c.hex === 'zinc') return '#aab3bc';
    return c.hex[0] === '#' ? c.hex : '#5a6470';
  }

  function drawScheme(type, L, W, a, aDeg, ov, S, along, perSlope, work, it) {
    const svg = $('#scheme');
    const col = coatColor(it[1]);
    const stroke = '#a9c4e4';
    let o = '';
    // --- front view (gable end) in box x:20..260, y:20..270
    const runTotal = W + 2 * ov;
    const rise = (type === 'mono' ? W : W / 2) * Math.tan(a);
    const wallH = Math.max(W * 0.45, 2.6);
    const sc = Math.min(220 / runTotal, 200 / (rise + wallH));
    const cx = 140, baseY = 262, wTop = baseY - wallH * sc;
    const x0 = cx - W / 2 * sc, x1 = cx + W / 2 * sc;
    o += `<text x="20" y="18">ФАСАД · торец</text>`;
    o += `<rect x="${x0}" y="${wTop}" width="${W * sc}" height="${wallH * sc}" fill="rgba(169,196,228,.06)" stroke="#55606c" stroke-width="1"/>`;
    const ovx = ov * Math.cos(a) * sc, ovy = ov * Math.sin(a) * sc;
    if (type === 'mono') {
      const ry = wTop - rise * sc;
      o += `<polygon points="${x0 - ovx},${wTop + ovy} ${x1},${ry} ${x1},${wTop}  ${x0},${wTop}" fill="rgba(169,196,228,.05)"/>`;
      o += `<line x1="${x0 - ovx}" y1="${wTop + ovy}" x2="${x1 + 6}" y2="${ry - 6 * Math.tan(a)}" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`;
      o += `<line x1="${x0 - ovx}" y1="${wTop + ovy}" x2="${x1 + 6}" y2="${ry - 6 * Math.tan(a)}" stroke="${stroke}" stroke-width="1" stroke-dasharray="3 3"/>`;
      o += dimV(x1 + 22, wTop, ry, num(rise, 2) + ' м');
      o += angleArc(x0, wTop, a, 0, aDeg);
    } else {
      const ry = wTop - rise * sc;
      o += `<polygon points="${x0},${wTop} ${cx},${ry} ${x1},${wTop}" fill="rgba(169,196,228,.05)" stroke="#55606c"/>`;
      o += `<polyline points="${x0 - ovx},${wTop + ovy} ${cx},${ry - 3} ${x1 + ovx},${wTop + ovy}" fill="none" stroke="${col}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
      o += `<polyline points="${x0 - ovx},${wTop + ovy} ${cx},${ry - 3} ${x1 + ovx},${wTop + ovy}" fill="none" stroke="${stroke}" stroke-width="1" stroke-dasharray="3 3"/>`;
      o += dimV(cx, wTop, ry, num(rise, 2) + ' м', true);
      o += angleArc(x0, wTop, a, 0, aDeg);
      o += `<text x="${(x1 + cx) / 2 + 10}" y="${(wTop + ry) / 2 - 8}" fill="${stroke}">${num(S, 2)} м</text>`;
    }
    o += dimH(x0, x1, baseY + 4, num(W, 2) + ' м');

    // --- plan view x:290..550
    const px = 300, py = 32, pw = 240, ph = 220;
    o += `<text x="${px - 10}" y="18">ПЛАН СКАТОВ</text>`;
    if (type === 'hip') {
      const Lt = L + 2 * ov, Wt = W + 2 * ov;
      const s2 = Math.min(pw / Lt, ph / Wt);
      const w = Lt * s2, h = Wt * s2, X = px + (pw - w) / 2, Y = py + (ph - h) / 2;
      const r = Math.min(Wt / 2, Lt / 2) * s2;
      o += `<rect x="${X}" y="${Y}" width="${w}" height="${h}" fill="${col}" opacity=".9"/>`;
      o += stripes(X, Y, w, h, work * s2);
      o += `<g stroke="${stroke}" stroke-width="1.4" fill="none"><rect x="${X}" y="${Y}" width="${w}" height="${h}"/>
        <path d="M${X} ${Y}L${X + r} ${Y + h / 2}L${X + w - r} ${Y + h / 2}L${X + w} ${Y}M${X} ${Y + h}L${X + r} ${Y + h / 2}M${X + w - r} ${Y + h / 2}L${X + w} ${Y + h}"/></g>`;
      o += dimH(X, X + w, Y + h + 8, num(Lt, 2) + ' м');
      o += dimV(X + w + 14, Y + h, Y, num(Wt, 2) + ' м');
    } else {
      const n = type === 'gable' ? 2 : 1;
      const s2 = Math.min(pw / along, ph / (S * n));
      const w = along * s2, h = S * s2, X = px + (pw - w) / 2, Y = py + (ph - h * n) / 2;
      for (let k = 0; k < n; k++) {
        const yy = Y + k * h;
        o += `<rect x="${X}" y="${yy}" width="${w}" height="${h}" fill="${col}" opacity=".9"/>`;
        o += stripes(X, yy, w, h, work * s2);
        o += `<rect x="${X}" y="${yy}" width="${w}" height="${h}" fill="none" stroke="${stroke}" stroke-width="1.2"/>`;
      }
      if (n === 2) o += `<line x1="${X - 6}" y1="${Y + h}" x2="${X + w + 6}" y2="${Y + h}" stroke="#fff" stroke-width="2.4"/><rect x="${X + w / 2 - 26}" y="${Y + h - 9}" width="52" height="18" fill="#0f1318"/><text x="${X + w / 2}" y="${Y + h + 4}" text-anchor="middle" fill="#fff">конёк</text>`;
      o += dimH(X, X + w, Y + h * n + 8, num(along, 2) + ' м · ' + Math.round(perSlope) + ' лист.');
      o += dimV(X - 14, Y + h, Y, num(S, 2) + ' м', false, true);
    }
    svg.innerHTML = o;
  }
  function stripes(X, Y, w, h, step) {
    if (step < 2) return '';
    let s = '';
    for (let x = X + step; x < X + w - 0.5; x += step) s += `<line x1="${x}" y1="${Y}" x2="${x}" y2="${Y + h}" stroke="rgba(0,0,0,.35)" stroke-width="1"/><line x1="${x + 1.2}" y1="${Y}" x2="${x + 1.2}" y2="${Y + h}" stroke="rgba(255,255,255,.18)" stroke-width="1"/>`;
    return s;
  }
  function dimH(xa, xb, y, label) {
    return `<g stroke="#7f8b97" stroke-width="1"><line x1="${xa}" y1="${y + 6}" x2="${xb}" y2="${y + 6}"/><line x1="${xa}" y1="${y}" x2="${xa}" y2="${y + 12}"/><line x1="${xb}" y1="${y}" x2="${xb}" y2="${y + 12}"/></g><text x="${(xa + xb) / 2}" y="${y + 22}" text-anchor="middle">${label}</text>`;
  }
  function dimV(x, ya, yb, label, inside, left) {
    return `<g stroke="#7f8b97" stroke-width="1" ${inside ? 'stroke-dasharray="2 3"' : ''}><line x1="${x}" y1="${ya}" x2="${x}" y2="${yb}"/>${inside ? '' : `<line x1="${x - 5}" y1="${ya}" x2="${x + 5}" y2="${ya}"/><line x1="${x - 5}" y1="${yb}" x2="${x + 5}" y2="${yb}"/>`}</g><text x="${left ? x - 6 : x + 7}" y="${(ya + yb) / 2 + 4}" text-anchor="${left ? 'end' : 'start'}">${label}</text>`;
  }
  function angleArc(x, y, a, _, deg) {
    const r = 26;
    return `<path d="M${x + r} ${y} A${r} ${r} 0 0 0 ${x + r * Math.cos(a)} ${y - r * Math.sin(a)}" fill="none" stroke="#a9c4e4"/><text x="${x + r + 6}" y="${y - 6}" fill="#a9c4e4">${deg}°</text>`;
  }

  ids.forEach(id => $('#' + id).addEventListener('input', calc));
  $('#roofType').addEventListener('change', calc);
  cMat.addEventListener('change', () => { fillVariants(); calc(); });
  cVar.addEventListener('change', calc);
  calc();

  $('#cSend').addEventListener('click', () => {
    const r = lastCalc; if (!r) return;
    const tn = { mono: 'односкатная', gable: 'двускатная', hip: 'вальмовая' }[r.type];
    const text = `Расчёт кровли с сайта: крыша ${tn}, дом ${num(r.L)}×${num(r.W)} м, уклон ${r.aDeg}°, свес ${num(r.ov, 2)} м.\n` +
      `Материал: ${r.p.title}, ${th(r.it[0])}, ${r.it[1]}.\n` +
      `Площадь скатов ${num(r.area)} м², листов ${r.type === 'hip' ? '≈' : ''}${r.sheets} шт × ${num(r.sheetLen, 2)} м, материал ${num(r.matArea)} м², ориентировочно ${rub(r.cost)}.\n` +
      `Доборы: конёк ${num(r.ridge + r.hips)} м, торцевая ${num(r.ends)} м, карнизная ${num(r.eaves)} м. Прошу проверить расчёт.`;
    openDrawer(text);
  });

  /* ================= RAL ================= */
  const house = $('#house');
  const colors = { roof: RAL.find(r => r.code === 'RAL 7024'), wall: RAL.find(r => r.code === 'RAL 9003'), fence: RAL.find(r => r.code === 'RAL 8017') };
  let target = 'roof';
  const isLight = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) > 150; };
  function swHTML(r) {
    return `<button class="sw ${r.metal ? 'sw--zinc' : ''} ${isLight(r.hex) ? 'light' : ''}" style="${r.metal && r.code === 'Цинк' ? '' : 'background:' + r.hex}" data-code="${r.code}" title="${r.code} — ${r.name}"><span>${r.code.replace('RAL ', '')}</span></button>`;
  }
  $('#swStock').innerHTML = RAL.filter(r => r.stock).map(swHTML).join('');
  $('#swOther').innerHTML = RAL.filter(r => !r.stock).map(swHTML).join('');
  const partName = { roof: 'Кровля', wall: 'Стены', fence: 'Забор' };
  function renderHouse() {
    Object.keys(colors).forEach(k => house.style.setProperty('--' + k, colors[k].hex));
    $('#ralCurrent').innerHTML = Object.keys(colors).map(k => `<div><i style="background:${colors[k].hex}"></i>${partName[k]}: <b>${colors[k].code}</b></div>`).join('');
    const sel = colors[target];
    $$('.sw').forEach(s => s.classList.toggle('is-active', s.dataset.code === sel.code));
    const prods = [];
    C.forEach(p => p.items.forEach(i => { if (i[1] === sel.code) prods.push([p.title, i[0], i[2]]); }));
    const info = $('#ralInfo');
    if (prods.length) {
      const best = {};
      prods.forEach(([t, thk, pr]) => { if (!best[t] || best[t] > pr) best[t] = pr; });
      info.innerHTML = `<p class="mono" style="color:var(--ice)">${partName[target]}</p><h3>${sel.code} · ${sel.name}</h3><p>В каталоге в этом цвете:</p>
        <ul>${Object.entries(best).map(([t, pr]) => `<li>${t}<b>от ${rub(pr)}</b></li>`).join('')}</ul>
        <button class="btn btn--steel" data-showcolor="${sel.code}">Показать в каталоге</button>`;
    } else {
      info.innerHTML = `<p class="mono" style="color:var(--ice)">${partName[target]}</p><h3>${sel.code} · ${sel.name}</h3><p>Этого цвета нет в онлайн-каталоге. Спросите менеджера о наличии рулона или сроках поставки.</p>
        <button class="btn btn--steel" data-askcolor="${sel.code}">Спросить про цвет</button>`;
    }
  }
  function setTarget(t) {
    target = t;
    $$('#ralTargets .chip').forEach(b => b.classList.toggle('is-active', b.dataset.target === t));
    renderHouse();
  }
  $('#ralTargets').addEventListener('click', e => { const b = e.target.closest('[data-target]'); if (b) setTarget(b.dataset.target); });
  house.addEventListener('click', e => { const g = e.target.closest('[data-part]'); if (g) setTarget(g.dataset.part); });
  $('.ral__palette').addEventListener('click', e => {
    const s = e.target.closest('.sw');
    if (s) { colors[target] = RAL.find(r => r.code === s.dataset.code); renderHouse(); }
    const sc = e.target.closest('[data-showcolor]'); if (sc) showColorInCatalog(sc.dataset.showcolor);
    const ac = e.target.closest('[data-askcolor]');
    if (ac) openDrawer(`Интересует цвет ${ac.dataset.askcolor} (${colors[target].name}) — есть ли в наличии и на какие изделия?`);
  });
  renderHouse();

  /* ================= FENCE CALCULATOR ================= */
  const fenceMats = C.filter(p => ['c8', 'c20', 'ns35'].includes(p.id));
  const fMat = $('#fMat'), fVar = $('#fVar');
  fMat.innerHTML = fenceMats.map(p => `<option value="${p.id}">${p.title.replace('Профлист ', '')}</option>`).join('');
  function fillFenceVariants() {
    const p = fenceMats.find(x => x.id === fMat.value);
    fVar.innerHTML = p.items.map((i, k) => `<option value="${k}">${th(i[0])} · ${i[1]} — ${i[2]} ₽</option>`).join('');
    const def = p.items.findIndex(i => i[1] !== 'Цинк');
    fVar.value = def < 0 ? 0 : def;
  }
  fillFenceVariants();
  let lastFence = null;
  function fence() {
    const L = Math.max(1, +$('#fL').value || 0);
    const h = +$('#fH input:checked').value;
    const G = Math.max(0, +$('#fG').value || 0), K = Math.max(0, +$('#fK').value || 0);
    const step = +$('#fS').value;
    $('#fSv').textContent = num(step, 1) + ' м';
    const p = fenceMats.find(x => x.id === fMat.value), it = p.items[+fVar.value || 0];
    const full = p.spec.full / 1000, work = p.spec.work / 1000;
    const run = Math.max(L - G - K, 0);
    const sheets = Math.ceil(run / work);
    const area = sheets * full * h;
    const cost = area * it[2];
    const spans = Math.ceil(run / step);
    const posts = spans + 1 + (G > 0 ? 1 : 0) + (K > 0 ? 1 : 0);
    const postLen = Math.ceil((h + 1.2) * 2) / 2;
    const rows = h > 2 ? 3 : 2;
    const lags = rows * run;
    const screws = Math.ceil(sheets * rows * 5 / 10) * 10;
    const tiles = [
      ['Листов', sheets + ' шт', 'по ' + num(h, 1) + ' м, ' + p.title.replace('Профлист ', '')],
      ['Площадь листа', num(area) + ' м²', 'по полной ширине'],
      ['Столбы', posts + ' шт', 'длина ≈ ' + num(postLen, 1) + ' м (с заглублением)'],
      ['Лаги', num(lags) + ' пог. м', rows + ' ряда, профтруба'],
      ['Саморезы', '≈ ' + screws + ' шт', 'кровельные, в цвет'],
      ['П-планка', num(run) + ' пог. м', 'верхний срез листа'],
      ['Колпаки', posts + ' шт', 'на каждый столб'],
      ['Пролётов', spans + ' шт', 'шаг ' + num(step, 1) + ' м']
    ];
    $('#fResults').innerHTML = tiles.map(t => `<div class="res"><span>${t[0]}</span><b>${t[1]}</b><small>${t[2]}</small></div>`).join('');
    $('#fTotal').textContent = rub(cost);
    let hint = `${p.title}, ${th(it[0])}, ${it[1]} — ${it[2]} ₽/м². Полезная ширина ${p.spec.work} мм.`;
    if (p.id === 'c8' && h > 2) hint += ' Для высоты больше 2 м надёжнее С20 или НС35 — они жёстче на ветру.';
    if (run <= 0) hint = 'Ворота и калитка шире забора — проверьте размеры.';
    $('#fHint').textContent = hint;
    lastFence = { L, h, G, K, step, p, it, sheets, area, cost, posts, postLen, lags, rows, screws, run, two: $('#fTwo').checked };
    drawFence(L, h, G, K, step, sheets, work, it);
  }
  function drawFence(L, h, G, K, step, sheets, work, it) {
    const col = coatColor(it[1]);
    const X = 20, Wd = 520, base = 186, sc = Wd / L, hh = Math.min(h * 55, 130);
    const gateX = L * 0.55, kX = Math.min(L * 0.15, Math.max(gateX - K - 1, 0));
    let o = `<rect x="0" y="${base}" width="560" height="34" fill="rgba(169,196,228,.05)"/>`;
    // полотно
    const segs = [[0, kX], [kX + K, gateX], [gateX + G, L]].filter(s => s[1] - s[0] > 0.01);
    segs.forEach(([a, b]) => {
      o += `<rect x="${X + a * sc}" y="${base - hh}" width="${(b - a) * sc}" height="${hh}" fill="${col}" opacity=".92"/>`;
      const st = work * sc;
      if (st >= 3) for (let x = X + a * sc + st; x < X + b * sc - 0.5; x += st) o += `<line x1="${x}" y1="${base - hh}" x2="${x}" y2="${base}" stroke="rgba(0,0,0,.35)"/>`;
      // лаги
      const rows = h > 2 ? 3 : 2;
      for (let r = 0; r < rows; r++) { const y = base - hh * (0.15 + r * (0.7 / (rows - 1))); o += `<line x1="${X + a * sc}" y1="${y}" x2="${X + b * sc}" y2="${y}" stroke="rgba(169,196,228,.35)" stroke-dasharray="4 3"/>`; }
      // столбы
      const n = Math.ceil((b - a) / step);
      for (let i = 0; i <= n; i++) { const x = X + (a + Math.min(i * step, b - a)) * sc; o += `<rect x="${x - 1.5}" y="${base - hh - 6}" width="3" height="${hh + 10}" fill="#8d97a2"/>`; }
    });
    if (G > 0) o += `<rect x="${X + gateX * sc}" y="${base - hh}" width="${G * sc}" height="${hh}" fill="none" stroke="#a9c4e4" stroke-dasharray="4 4"/><text x="${X + (gateX + G / 2) * sc}" y="${base - hh - 14}" text-anchor="middle" fill="#a9c4e4">ворота ${num(G, 1)} м</text>`;
    if (K > 0) o += `<rect x="${X + kX * sc}" y="${base - hh}" width="${K * sc}" height="${hh}" fill="none" stroke="#a9c4e4" stroke-dasharray="4 4"/><text x="${X + (kX + K / 2) * sc}" y="${base - hh - 14}" text-anchor="middle" fill="#a9c4e4">калитка</text>`;
    o += `<g stroke="#7f8b97"><line x1="${X}" y1="${base + 14}" x2="${X + Wd}" y2="${base + 14}"/><line x1="${X}" y1="${base + 8}" x2="${X}" y2="${base + 20}"/><line x1="${X + Wd}" y1="${base + 8}" x2="${X + Wd}" y2="${base + 20}"/></g>`;
    o += `<text x="${X + Wd / 2}" y="${base + 30}" text-anchor="middle">${num(L, 1)} м · ${sheets} лист.</text>`;
    o += `<text x="${X + Wd}" y="${base - hh - 14}" text-anchor="end">высота ${num(h, 1)} м</text>`;
    $('#fScheme').innerHTML = o;
  }
  ['fL', 'fG', 'fK', 'fS'].forEach(id => $('#' + id).addEventListener('input', fence));
  $('#fH').addEventListener('change', fence);
  $('#fTwo').addEventListener('change', fence);
  fMat.addEventListener('change', () => { fillFenceVariants(); fence(); });
  fVar.addEventListener('change', fence);
  fence();
  $('#fSend').addEventListener('click', () => {
    const r = lastFence; if (!r) return;
    openDrawer(`Расчёт забора с сайта: длина ${num(r.L, 1)} м, высота ${num(r.h, 1)} м, ворота ${num(r.G, 1)} м, калитка ${num(r.K, 1)} м, шаг столбов ${num(r.step, 1)} м.\n` +
      `Лист: ${r.p.title}, ${th(r.it[0])}, ${r.it[1]}${r.two ? ', двусторонний цвет' : ''} — ${r.sheets} шт × ${num(r.h, 1)} м (${num(r.area)} м², ≈ ${rub(r.cost)}).\n` +
      `Также нужно: столбы ${r.posts} шт по ${num(r.postLen, 1)} м, лаги ${num(r.lags)} м, саморезы ≈ ${r.screws} шт, П-планка ${num(r.run)} м, колпаки ${r.posts} шт. Прошу посчитать комплект.`);
  });

  /* ================= DOBOR ================= */
  const DOB = window.DOBOR;
  function doborSVG(shape) {
    return `<svg viewBox="-10 -6 140 60"><polyline points="${shape.map(p => p.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }
  $('#doborGrid').innerHTML = DOB.map(d => {
    const pr = SITE.doborPrices && SITE.doborPrices[d.id];
    return `<article class="db" data-for="${d.for}">
      <div class="db__img">${doborSVG(d.shape)}<span class="mono">сечение</span></div>
      <h3>${d.title}</h3><p>${d.use}</p><p class="db__size">${d.size}</p>
      <div class="db__foot"><b>${pr ? 'от ' + rub(pr) + '/пог. м' : 'Цена по запросу'}</b><button class="add" data-dobor="${d.id}">В заявку</button></div>
    </article>`;
  }).join('');
  $('#doborFilters').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('#doborFilters .chip').forEach(x => x.classList.toggle('is-active', x === b));
    $$('#doborGrid .db').forEach(el => { el.hidden = !(b.dataset.for === 'all' || el.dataset.for === b.dataset.for || el.dataset.for === 'any'); });
  });
  $('#doborGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-dobor]'); if (!b) return;
    const d = DOB.find(x => x.id === b.dataset.dobor);
    addToBasket({ key: 'dob-' + d.id, title: d.title, sub: 'доборный элемент, цвет и размер уточнить', price: 0, qty: 0 });
    b.textContent = 'Добавлено ✓'; b.classList.add('is-done');
    setTimeout(() => { b.textContent = 'В заявку'; b.classList.remove('is-done'); }, 1400);
  });

  /* ================= DELIVERY / HOURS / LEGAL ================= */
  $('#deliveryList').innerHTML = SITE.delivery.map(d => `<li><div>${d.zone}<small>${d.note}</small></div><b>${d.price}</b></li>`).join('');
  $('#deliveryNote').textContent = SITE.deliveryNote;
  $('#paymentList').innerHTML = SITE.payment.map(x => `<li>${x}</li>`).join('');
  $('#wholesaleFrom').textContent = SITE.wholesale.from;
  $('#wholesaleList').innerHTML = SITE.wholesale.perks.map(x => `<li>${x}</li>`).join('');

  function openState() {
    let d, hr;
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Barnaul', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      const wd = parts.find(x => x.type === 'weekday').value;
      d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
      hr = +parts.find(x => x.type === 'hour').value % 24 + (+parts.find(x => x.type === 'minute').value) / 60;
    } catch (e) { const n = new Date(); d = n.getDay(); hr = n.getHours() + n.getMinutes() / 60; }
    const t = SITE.hoursMap[d];
    if (t && hr >= t[0] && hr < t[1]) return { open: true, text: 'Открыто до ' + t[1] + ':00' };
    for (let k = 0; k < 7; k++) {
      const dd = (d + k) % 7, tt = SITE.hoursMap[dd];
      if (!tt || (k === 0 && hr >= tt[0])) continue;
      const day = k === 0 ? 'сегодня' : k === 1 ? 'завтра' : ['в вс', 'в пн', 'во вт', 'в ср', 'в чт', 'в пт', 'в сб'][dd];
      return { open: false, text: 'Закрыто · откроемся ' + day + ' в ' + String(tt[0]).padStart(2, '0') + ':00' };
    }
    return { open: false, text: 'Закрыто' };
  }
  const os = openState();
  $$('[data-open-now]').forEach(el => { el.textContent = os.text; el.classList.toggle('is-open', os.open); });
  const hoursTxt = SITE.hours.map(x => x.days + ' ' + x.time).join(', ');
  $$('[data-hours-inline]').forEach(el => el.textContent = hoursTxt);
  $('#hoursBox').innerHTML = `<span class="open-now ${os.open ? 'is-open' : ''}">${os.text}</span>` + SITE.hours.map(x => `<div><span>${x.days}</span><b>${x.time}</b></div>`).join('');
  $$('[data-legal]').forEach(el => el.textContent = `${SITE.legal.name} · ИНН ${SITE.legal.inn} · ОГРН ${SITE.legal.ogrn}`);

  /* ================= METRIKA ================= */
  if (SITE.metrikaId) {
    (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = 1 * new Date(); k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a); })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(+SITE.metrikaId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="tel:"], a[href*="wa.me"], a[href*="telegram.me"]');
      if (a) window.ym(+SITE.metrikaId, 'reachGoal', a.href.startsWith('tel:') ? 'call' : 'messenger');
    });
  }

  /* ================= NAV ================= */
  $('#burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('.side__nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  const links = $$('.side__nav a');
  const io = new IntersectionObserver(es => {
    es.forEach(en => {
      if (en.isIntersecting) links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => io.observe(s));
  $('#year').textContent = new Date().getFullYear();
  // ?s=calc — открыть страницу сразу на нужном блоке (для ссылок из рекламы и скриншотов)
  const jump = new URLSearchParams(location.search).get('s');
  if (jump && document.getElementById(jump)) {
    document.documentElement.style.scrollBehavior = 'auto';
    document.getElementById(jump).scrollIntoView();
  }
  renderBasket();
})();
