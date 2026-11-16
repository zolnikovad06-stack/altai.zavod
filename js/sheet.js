// Отрисовка профиля и «объёмного» листа профнастила в SVG — для марок без фото (С21)
(function () {
  const WAVES = { 8: 9, 20: 6, 21: 5, 35: 5, 44: 4, 60: 4, 75: 3 };

  // точки сечения: ширина W, высота волны в единицах H
  function profilePoints(h, W, H) {
    const waves = WAVES[h] || 5;
    const pitch = W / waves, top = pitch * .32, slope = pitch * .14, bottom = pitch - top - slope * 2;
    const pts = [[0, 0]];
    for (let i = 0; i < waves; i++) {
      const x = i * pitch;
      pts.push([x + bottom / 2, 0], [x + bottom / 2 + slope, H], [x + bottom / 2 + slope + top, H], [x + bottom / 2 + slope * 2 + top, 0], [x + pitch, 0]);
    }
    return pts;
  }

  window.profileSVGPath = function (h) {
    const H = 6 + h / 75 * 34, y0 = 42;
    return '<path d="M' + profilePoints(h, 200, H).map(p => p[0].toFixed(1) + ' ' + (y0 - p[1]).toFixed(1)).join(' L') + '"/>';
  };

  window.sheetSVG = function (h, color) {
    color = color || '#b7bfc7';
    const W = 300, H = 10 + h / 75 * 40;
    const pts = profilePoints(h, W, H);
    const ox = 40, oy = 250, dx = 150, dy = -120;
    const P = (p, back) => [(ox + p[0] + (back ? dx : 0)).toFixed(1), (oy - p[1] + (back ? dy : 0)).toFixed(1)];
    let faces = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const rise = b[1] - a[1];
      const shade = rise > 0 ? 'rgba(255,255,255,.22)' : rise < 0 ? 'rgba(0,0,0,.28)' : (a[1] > 0 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)');
      const q = [P(a), P(b), P(b, 1), P(a, 1)].map(p => p.join(',')).join(' ');
      faces += `<polygon points="${q}" fill="${color}"/><polygon points="${q}" fill="${shade}" stroke="rgba(0,0,0,.18)" stroke-width=".6"/>`;
    }
    const front = pts.map(p => P(p).join(',')).join(' ');
    return `<svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Профлист, сечение ${h} мм">
      <ellipse cx="270" cy="262" rx="210" ry="18" fill="rgba(0,0,0,.08)"/>${faces}
      <polyline points="${front}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.4"/></svg>`;
  };
})();
