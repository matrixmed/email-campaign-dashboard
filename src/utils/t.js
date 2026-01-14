const E = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api/t'
  : '/api/t';
const _env = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'dev' : 'prod';
let _f = null;
let _s = null;
let _pv = null;
let _st = 0;
let _sd = 0;

const h = async (s) => {
  const e = new TextEncoder().encode(s);
  const b = await crypto.subtle.digest('SHA-256', e);
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
};

const gf = async () => {
  if (_f) return _f;

  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fp', 2, 2);
  const cd = c.toDataURL();

  const d = [
    navigator.userAgent,
    window.screen.width + 'x' + window.screen.height,
    window.screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency,
    navigator.platform,
    cd.slice(-50)
  ].join('|');

  _f = await h(d);
  return _f;
};

const gs = () => {
  if (_s) return _s;
  _s = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return _s;
};

const sd = (p, d) => {
  navigator.sendBeacon(E + p, JSON.stringify(d));
};

const i = async () => {
  const f = await gf();

  sd('/v', {
    f,
    ua: navigator.userAgent,
    sr: window.screen.width + 'x' + window.screen.height,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    l: navigator.language,
    p: navigator.platform,
    e: _env
  });
};

const pv = async (path) => {
  if (_pv) {
    ud();
  }

  const f = await gf();
  const s = gs();
  _st = Date.now();
  _sd = 0;

  try {
    const r = await fetch(E + '/p', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        f,
        s,
        p: path || window.location.pathname,
        r: document.referrer,
        e: _env
      })
    });
    const d = await r.json();
    _pv = d.i;
  } catch (e) {}
};

const ud = () => {
  if (!_pv) return;

  const d = Math.round((Date.now() - _st) / 1000);

  sd('/d', {
    i: _pv,
    d,
    sc: _sd
  });

  _pv = null;
};

const ta = async (type, el, tx, meta) => {
  const f = await gf();
  const s = gs();

  sd('/a', {
    f,
    s,
    p: window.location.pathname,
    t: type,
    el: el || '',
    tx: tx || '',
    m: meta,
    e: _env
  });
};

const ts = () => {
  const sh = window.innerHeight;
  const dh = document.documentElement.scrollHeight;
  const st = window.scrollY;
  const sp = Math.round(((st + sh) / dh) * 100);
  if (sp > _sd) _sd = sp;
};

const init = () => {
  i();
  pv();

  window.addEventListener('scroll', ts, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ud();
    } else {
      pv();
    }
  });

  window.addEventListener('beforeunload', ud);

  let lp = window.location.pathname;
  const po = window.history.pushState;
  window.history.pushState = function() {
    po.apply(this, arguments);
    if (window.location.pathname !== lp) {
      lp = window.location.pathname;
      pv(lp);
    }
  };

  window.addEventListener('popstate', () => {
    if (window.location.pathname !== lp) {
      lp = window.location.pathname;
      pv(lp);
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, [role="button"]');
    if (t) {
      ta('click', t.tagName.toLowerCase(), t.textContent?.slice(0, 100));
    }
  }, { passive: true });
};

export default { init };