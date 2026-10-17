// Wires the /tools fields to calc.js. The beam energy is shared; every field recalculates on 'input'.
(() => {
  const $ = (id) => document.getElementById(id);
  const num = (id) => parseFloat($(id).value);
  const fmt = (v, digits = 5) => (Number.isFinite(v) ? String(+v.toPrecision(digits)) : '');
  const ko = () => document.documentElement.lang === 'ko';
  const tr = (en, k) => (ko() ? k : en);
  const lambda = () => calc.wavelength(num('e-kev'));

  // Kα1 lines (keV) and cubic reflections (lattice constant a in Å, hkl)
  const LINES = [['Cu', 8.04778], ['Mo', 17.47934], ['Ag', 22.16292], ['Co', 6.93032], ['Cr', 5.41472]];
  const REFLECTIONS = [['Si 111', 5.43102, 1, 1, 1], ['Si 220', 5.43102, 2, 2, 0], ['Si 311', 5.43102, 3, 1, 1], ['Si 400', 5.43102, 4, 0, 0], ['Ge 111', 5.6579, 1, 1, 1]];

  // Results: label, value, unit. Each value is a button that copies "label = value unit".
  function show(id, rows) {
    $(id).replaceChildren(...rows.map(([label, value, unit = '']) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      if (value === null) { dd.className = 'warn'; dd.textContent = unit; } else {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = /^[°%]$/.test(unit) ? `${value}${unit}` : `${value}<small>${unit}</small>`;
        b.addEventListener('click', () => copy(`${label ? `${label} = ` : ''}${value}${/^[°%]$/.test(unit) ? '' : ' '}${unit}`.trim(), b));
        dd.append(b);
      }
      div.append(dt, dd);
      return div;
    }));
  }
  async function copy(text, el) {
    let ok = true;
    try { await navigator.clipboard.writeText(text); } catch { ok = false; }
    el.dataset.copied = ok ? tr('Copied', '복사됨') : tr('Select to copy', '선택해서 복사');
    setTimeout(() => delete el.dataset.copied, 1400);
  }
  function chips(id, items, pick) {
    $(id).replaceChildren(...items.map((item) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = item.label;
      b.addEventListener('click', () => pick(item));
      return b;
    }));
  }
  const press = (id, i) => $(id).querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', i === j));

  // Beam: energy ↔ wavelength, then everything that depends on λ
  function beam() {
    press('e-presets', LINES.findIndex(([, e]) => Math.abs(e - num('e-kev')) < 5e-4));
    angle(); kiessig(); scherrer();
  }
  $('e-kev').addEventListener('input', () => { $('e-ang').value = fmt(calc.wavelength(num('e-kev')), 6); beam(); });
  $('e-ang').addEventListener('input', () => { $('e-kev').value = fmt(calc.energy(num('e-ang')), 6); beam(); });
  chips('e-presets', LINES.map(([el, e]) => ({ label: `${el} Kα₁`, e })), ({ e }) => {
    $('e-kev').value = e;
    $('e-kev').dispatchEvent(new Event('input'));
  });

  // Bragg / q / d: whichever was typed last is the source; an energy change keeps d (or 2θ, if that was typed)
  let angleSource = 'b-d';
  function angle() {
    const l = lambda();
    let d = num('b-d');
    if (angleSource === 'b-tth') d = calc.dFromQ(calc.q(num('b-tth'), l));
    if (angleSource === 'b-q') d = calc.dFromQ(num('b-q'));
    const q = calc.dFromQ(d), tth = calc.twoTheta(d, l);
    if (angleSource !== 'b-d') $('b-d').value = fmt(d, 6);
    if (angleSource !== 'b-q') $('b-q').value = fmt(q, 6);
    if (angleSource !== 'b-tth') $('b-tth').value = fmt(tth, 6);
    press('b-presets', REFLECTIONS.findIndex(([, a, h, k, ll]) => Math.abs(calc.dCubic(a, h, k, ll) - d) < 5e-4));
    if (!Number.isFinite(d) || d <= 0) return show('b-out', []);
    show('b-out', Number.isFinite(tth)
      ? [['2θ', fmt(tth), '°'], ['θ', fmt(tth / 2), '°'], ['q', fmt(q), 'Å⁻¹'], ['d', fmt(d), 'Å']]
      : [[tr('No reflection', '반사 없음'), null, tr(`λ = ${fmt(l, 4)} Å is longer than 2d = ${fmt(2 * d, 4)} Å. Raise the energy.`, `λ = ${fmt(l, 4)} Å가 2d = ${fmt(2 * d, 4)} Å보다 깁니다. 에너지를 높이세요.`)]]);
  }
  ['b-tth', 'b-q', 'b-d'].forEach((id) => $(id).addEventListener('input', () => { angleSource = id; angle(); }));
  chips('b-presets', REFLECTIONS.map(([label, a, h, k, l]) => ({ label, d: calc.dCubic(a, h, k, l) })), ({ d }) => {
    $('b-d').value = fmt(d, 6);
    angleSource = 'b-d';
    angle();
  });

  function footprint() {
    const h = num('f-h'), a = num('f-a'), s = num('f-s');
    const L = calc.footprint(h, a), fill = calc.fillAngle(h, s);
    show('f-out', [
      [tr('Footprint', '풋프린트'), fmt(L, 4), 'mm'],
      [tr('Beam on sample', '시료에 닿는 빔'), fmt(100 * Math.min(1, s / L), 3), '%'],
      [tr('Full beam above', '전체 빔이 닿는 각도'), fmt(fill, 4), '°'],
    ]);
  }

  function transmission() {
    const T = calc.transmission(num('a-t'), num('a-l'));
    show('a-out', [[tr('Transmitted', '투과'), fmt(100 * T, 3), '%'], [tr('Absorbed', '흡수'), fmt(100 * (1 - T), 3), '%']]);
  }

  let fringeSource = 'k-dq';
  function kiessig() {
    const dq = fringeSource === 'k-dq' ? num('k-dq') : calc.dqFromTwoTheta(num('k-d2t'), lambda());
    if (fringeSource === 'k-dq') $('k-d2t').value = fmt((dq * lambda() * 180) / (2 * Math.PI ** 2), 5);
    else $('k-dq').value = fmt(dq, 5);
    const t = calc.kiessig(dq);
    show('k-out', [[tr('Thickness', '두께'), fmt(t / 10, 4), 'nm'], ['', fmt(t, 4), 'Å']]);
  }
  ['k-dq', 'k-d2t'].forEach((id) => $(id).addEventListener('input', () => { fringeSource = id; kiessig(); }));

  function scherrer() {
    const tau = calc.scherrer(num('s-tth'), num('s-w'), lambda(), num('s-k'));
    show('s-out', [[tr('Crystallite size', '결정 크기'), fmt(tau / 10, 3), 'nm']]);
  }

  const on = (ids, fn) => ids.forEach((id) => $(id).addEventListener('input', fn));
  on(['f-h', 'f-a', 'f-s'], footprint);
  on(['a-t', 'a-l'], transmission);
  on(['s-tth', 's-w', 's-k'], scherrer);

  // Link state: typed values that differ from the defaults go in the query string, so a link reproduces the page
  const inputs = [...document.querySelectorAll('main input')];
  const params = new URLSearchParams(location.search);
  inputs.forEach((i) => { if (params.has(i.id)) i.value = params.get(i.id); });
  angleSource = ['b-tth', 'b-q'].find((id) => params.has(id)) ?? 'b-d';
  if (params.has('k-d2t')) fringeSource = 'k-d2t';
  const link = () => {
    const derived = ['e-ang', 'b-tth', 'b-q', 'b-d', 'k-dq', 'k-d2t'].filter((id) => id !== angleSource && id !== fringeSource);
    const p = new URLSearchParams();
    inputs.forEach((i) => { if (!derived.includes(i.id) && i.value !== i.defaultValue) p.set(i.id, i.value); });
    return `${location.origin}${location.pathname}${p.size ? `?${p}` : ''}${location.hash}`;
  };
  document.querySelector('main').addEventListener('input', () => history.replaceState(null, '', link()));
  document.querySelector('main').addEventListener('click', (e) => { if (e.target.closest('.chips')) history.replaceState(null, '', link()); });
  $('share').addEventListener('click', () => copy(link(), $('share')));

  $('e-ang').value = fmt(calc.wavelength(num('e-kev')), 6);
  beam(); footprint(); transmission();
  window.addEventListener('langchange', () => { angle(); footprint(); transmission(); kiessig(); scherrer(); });
})();
