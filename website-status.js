(() => {
  const API =
    'https://licht-en-liefde-api.timdekruyf07.workers.dev';

  const page =
    location.pathname.split('/').pop() || 'index.html';

  // De uitslag van een al gestarte betaling blijft bereikbaar.
  if (
    page === 'betaling.html' ||
    location.pathname.includes('/admin/')
  ) {
    return;
  }

  let state = 'checking';
  let busy = false;
  let timer;
  let panel;

  const root = document.documentElement;

  const style = document.createElement('style');

  style.textContent = `
    html[data-website-closed] body > :not(#website-closed-panel) {
      display: none !important;
    }

    html[data-website-closed],
    html[data-website-closed] body {
      margin: 0 !important;
      min-height: 100% !important;
      background: #faf7f2 !important;
    }

    #website-closed-panel {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      overflow: auto;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      padding: 30px 20px;
      background: #faf7f2;
      color: #3d3024;
      text-align: center;
      font: 16px/1.7 Georgia, serif;
    }

    #website-closed-panel .closed-inner {
      max-width: 560px;
    }

    #website-closed-panel .closed-brand {
      color: #a67c48;
      font: 16px/1.6 Arial, sans-serif;
      letter-spacing: 4px;
      margin-bottom: 30px;
    }

    #website-closed-panel h1 {
      font-size: clamp(32px, 7vw, 48px);
      font-weight: normal;
    }

    #website-closed-panel button {
      margin: 8px;
      padding: 12px 20px;
      border: 1px solid #a67c48;
      border-radius: 3px;
      background: #a67c48;
      color: white;
      cursor: pointer;
      font: 14px Arial, sans-serif;
    }

    #website-closed-panel button:focus-visible {
      outline: 2px solid #3d3024;
      outline-offset: 4px;
    }

    #website-closed-panel button:disabled {
      opacity: .6;
      cursor: wait;
    }

    #website-closed-panel .closed-languages button {
      background: transparent;
      color: #736359;
    }
  `;

  document.head.appendChild(style);
  root.setAttribute('data-website-closed', '');

  function language() {
    if (window.siteLanguage) {
      return window.siteLanguage.get();
    }

    try {
      return localStorage.getItem('licht-en-liefde-taal') === 'nl'
        ? 'nl'
        : 'en';
    } catch (_) {
      return 'en';
    }
  }

  function render() {
    if (state === 'open') {
      root.removeAttribute('data-website-closed');
      panel?.remove();
      panel = null;
      return;
    }

    root.setAttribute('data-website-closed', '');

    if (!document.body) return;

    if (!panel) {
      panel = document.createElement('main');
      panel.id = 'website-closed-panel';

      panel.innerHTML = `
        <div class="closed-inner">
          <p class="closed-brand">DIATHĒKĒ ATELIER</p>

          <div role="status" aria-live="polite">
            <h1 id="closed-title"></h1>
            <p id="closed-message"></p>
          </div>

          <button type="button" id="closed-check"></button>

          <div
            class="closed-languages"
            aria-label="Language / Taal"
          >
            <button type="button" data-closed-lang="en">
              English
            </button>

            <button type="button" data-closed-lang="nl">
              Nederlands
            </button>
          </div>
        </div>
      `;

      panel.querySelector('#closed-check')
        .addEventListener('click', check);

      panel.querySelectorAll('[data-closed-lang]')
        .forEach(button => {
          button.addEventListener('click', () => {
            window.siteLanguage?.set(
              button.dataset.closedLang
            );

            render();
          });
        });

      document.body.appendChild(panel);
    }

    const en = language() === 'en';

    panel.lang = en ? 'en' : 'nl';

    const texts = {
      checking: en
        ? [
            'One moment',
            'Checking whether our website is open…'
          ]
        : [
            'Een moment',
            'We controleren of onze website geopend is…'
          ],

      closed: en
        ? [
            'Coming soon',
            'We are preparing something special. Our website will open soon.'
          ]
        : [
            'Binnenkort geopend',
            'We werken aan iets bijzonders. Onze website gaat binnenkort open.'
          ],

      error: en
        ? [
            'Temporarily unavailable',
            'We cannot check the website status right now. Please try again shortly.'
          ]
        : [
            'Tijdelijk niet beschikbaar',
            'We kunnen de status van de website nu niet controleren. Probeer het zo opnieuw.'
          ]
    };

    panel.querySelector('#closed-title').textContent =
      texts[state][0];

    panel.querySelector('#closed-message').textContent =
      texts[state][1];

    const button = panel.querySelector('#closed-check');

    button.textContent = busy
      ? (en ? 'Checking…' : 'Controleren…')
      : (en ? 'Check again' : 'Opnieuw controleren');

    button.disabled = busy;
  }

  async function check() {
    if (busy) return;

    clearTimeout(timer);
    busy = true;
    render();

    try {
      const response = await fetch(API + '/site-state', {
        cache: 'no-store',
        credentials: 'omit',
        signal: AbortSignal.timeout(12000)
      });

      const data = await response.json();

      if (
        !response.ok ||
        typeof data.is_open !== 'boolean'
      ) {
        throw new Error('Invalid website status');
      }

      state = data.is_open ? 'open' : 'closed';
    } catch (_) {
      state = 'error';
    } finally {
      busy = false;
      render();

      if (!document.hidden) {
        timer = setTimeout(check, 30000);
      }
    }
  }

  window.addEventListener('site-language-change', render);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(timer);
    } else {
      check();
    }
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted) check();
  });

  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  check();
})();
