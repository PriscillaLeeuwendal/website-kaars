(() => {
  const scriptUrl = document.currentScript?.src || location.href;
  const searchScriptUrl = new URL('zoeken.js', scriptUrl).href;
  const key = 'licht-en-liefde-taal';

  let saved;
  let dialogReturnFocus = null;

  try {
    saved = localStorage.getItem(key);
  } catch (_) {
    saved = null;
  }

  let language = saved === 'nl' ? 'nl' : 'en';

  const words = {
    nl: {
      cart: 'Winkelmand (',
      home: 'Home',
      products: 'Shop',
      about: 'Over ons',
      contact: 'Contact',
      footer: '© 2026 Diatheke Atelier — Met zorg gemaakt.',
      loading: 'Producten worden geladen...',
      empty: 'Nog geen producten gevonden.',
      error: 'Kon de producten niet laden.',
      add: 'In winkelmand',
      refresh: '🔄 Ververs',
      detail: 'Product',
      back: '← Terug naar producten',
      notFound: 'Product niet gevonden.'
    },
    en: {
      cart: 'Cart (',
      home: 'Home',
      products: 'Shop',
      about: 'Our Story',
      contact: 'Contact',
      footer: '© 2026 Diatheke Atelier — Made with care.',
      loading: 'Loading products...',
      empty: 'No products found yet.',
      error: 'Could not load the products.',
      add: 'Add to cart',
      refresh: '🔄 Refresh',
      detail: 'Product',
      back: '← Back to products',
      notFound: 'Product not found.'
    }
  };

  const homeWords = {
    en: {
      eyebrowFirst: 'Sacred spaces',
      eyebrowSecond: 'for everyday life.',
      titleFirst: 'Illuminating',
      titleSecond: 'His promises',
      tagline: 'Covenant. Light. Presence.',
      collection: 'Shop the collection',
      valueOneTitle: 'Faith-Centered Design',
      valueOneFirst: 'Refined home décor that illuminates',
      valueOneSecond: 'His promises.',
      valueTwoTitle: 'Timeless Craftsmanship',
      valueTwoFirst: 'Natural materials. Lasting beauty.',
      valueTwoSecond: 'Eternal meaning.',
      valueThreeTitle: 'A More Sacred Home',
      valueThreeFirst: 'Create spaces that draw you',
      valueThreeSecond: 'closer to His presence.',
      wallLights: 'Wall Lights',
      candles: 'Candles & Vessels',
      vases: 'Vases & Décor',
      shopNow: 'Shop Now',
      wallImage: 'Illuminated stone cross on a warm beige wall',
      candleImage: 'Warmly glowing stone candle vessels',
      vaseImage: 'Textured vase with olive branches'
    },
    nl: {
      eyebrowFirst: 'Een plek voor geloof',
      eyebrowSecond: 'in het dagelijks leven.',
      titleFirst: 'Zijn beloften',
      titleSecond: 'in het licht',
      tagline: 'Verbond. Licht. Aanwezigheid.',
      collection: 'Bekijk de collectie',
      valueOneTitle: 'Ontwerp vanuit geloof',
      valueOneFirst: 'Verfijnde woondecoratie die',
      valueOneSecond: 'Zijn beloften laat stralen.',
      valueTwoTitle: 'Tijdloos vakmanschap',
      valueTwoFirst: 'Natuurlijke materialen. Blijvende schoonheid.',
      valueTwoSecond: 'Eeuwige betekenis.',
      valueThreeTitle: 'Een huis vol geloof',
      valueThreeFirst: 'Creëer plekken die je dichter',
      valueThreeSecond: 'bij Zijn aanwezigheid brengen.',
      wallLights: 'Wandverlichting',
      candles: 'Kaarsen & houders',
      vases: 'Vazen & decoratie',
      shopNow: 'Bekijk de producten',
      wallImage: 'Verlicht stenen kruis op een warme beige muur',
      candleImage: 'Warm verlichte stenen kaarshouders',
      vaseImage: 'Vaas met structuur en olijftakken'
    }
  };

  function set(selector, text) {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
  }

  function apply() {
    const en = language === 'en';
    const t = words[language];

    document.documentElement.lang = language;

    document.querySelectorAll('.cart-link').forEach(cart => {
      cart.setAttribute(
        'aria-label',
        en ? 'Open shopping cart' : 'Open winkelmand'
      );

      if (cart.hasAttribute('data-icon-cart')) return;

      const textNode = Array.from(cart.childNodes).find(
        node => node.nodeType === Node.TEXT_NODE
      );

      if (textNode) textNode.textContent = t.cart;
    });

    document.querySelectorAll('.main-nav a').forEach((link, i) => {
      link.textContent = [
        t.home,
        t.products,
        t.about,
        t.contact
      ][i] || link.textContent;
    });

    const nav = document.querySelector('.main-nav');

    if (nav) {
      nav.setAttribute(
        'aria-label',
        en ? 'Main navigation' : 'Hoofdnavigatie'
      );
    }

    set('footer p', t.footer);

    set(
      '#language-button',
      en ? 'Language: English' : 'Taal: Nederlands'
    );

    const account = document.getElementById('account-button');

    if (account) {
      account.setAttribute(
        'aria-label',
        en ? 'My account' : 'Mijn account'
      );
    }

    const page = location.pathname.split('/').pop() || 'index.html';

    if (page === 'index.html') {
      document.title = 'Diatheke Atelier';

      const h = homeWords[language];

      document.querySelectorAll('[data-home-text]').forEach(element => {
        const text = h[element.dataset.homeText];

        if (typeof text === 'string') {
          element.textContent = text;
        }
      });

      document.querySelectorAll('[data-home-alt]').forEach(element => {
        const text = h[element.dataset.homeAlt];

        if (typeof text === 'string') {
          element.alt = text;
        }
      });

      const values = document.querySelector('.values');

      if (values) {
        values.setAttribute(
          'aria-label',
          en ? 'Our values' : 'Onze waarden'
        );
      }

      const categories = document.querySelector('.categories');

      if (categories) {
        categories.setAttribute(
          'aria-label',
          en ? 'Explore the collection' : 'Ontdek de collectie'
        );
      }
    }

    if (page === 'producten.html') {
      document.title = 'Shop - Diatheke Atelier';

      set('header h1', 'Shop');

      set(
        '.section h2',
        en ? 'Handmade Candles' : 'Handgemaakte Kaarsen'
      );

      set('#refresh-products-btn', t.refresh);

      const status = document.querySelector(
        '#product-list > p[data-status]'
      );

      if (status && t[status.dataset.status]) {
        status.textContent = t[status.dataset.status];
      }
    }

    if (page === 'product.html') {
      set('header h1', t.detail);
      set('.back-link', t.back);
    }

    if (page === 'over-ons.html') {
      document.title = en
        ? 'Our Story - Diatheke Atelier'
        : 'Over Ons - Diatheke Atelier';

      set('header h1', en ? 'Our Story' : 'Over Ons');

      set(
        '.container h2',
        en
          ? 'The story behind Diatheke Atelier'
          : 'Het verhaal achter Diatheke Atelier'
      );

      const paragraphs = document.querySelectorAll('.container p');

      if (paragraphs[0]) {
        paragraphs[0].innerHTML = en
          ? 'Welcome to <strong>Diatheke Atelier</strong>! We believe a candle can bring more than a cosy atmosphere: it can also bring warmth and hope into your home.'
          : 'Welkom bij <strong>Diatheke Atelier</strong>! Wij geloven dat een brandende kaars niet alleen gezelligheid brengt, maar ook warmte en hoop in huis kan verspreiden.';
      }

      if (paragraphs[1]) {
        paragraphs[1].textContent = en
          ? 'Our candles are handmade and feature carefully selected Christian messages and encouraging quotes. Whether you are looking for a meaningful gift or a peaceful moment for yourself, every candle is made with love, especially for you.'
          : 'Onze kaarsen worden met de hand gemaakt en voorzien van zorgvuldig geselecteerde christelijke teksten en bemoedigende quotes. Of je nu op zoek bent naar een dierbaar cadeau voor iemand die het nodig heeft, of gewoon een sfeervol moment voor jezelf wilt creëren: elk exemplaar wordt met liefde gemaakt, speciaal voor jou.';
      }
    }

    if (page === 'contact.html') {
      document.title = 'Contact - Diatheke Atelier';

      set(
        '.container h2',
        en ? 'Questions or orders?' : 'Interesse of bestellen?'
      );

      set(
        '.container p',
        en
          ? 'Would you like to order something or request a personal message on a candle? Feel free to get in touch!'
          : 'Wil je graag iets bestellen of heb je een speciale wens voor een eigen tekst op een kaars? Neem gerust contact op!'
      );

      set(
        '.container .btn',
        en ? 'Send a message' : 'Stuur een berichtje'
      );
    }
  }

  function choose(value) {
    if (value !== 'nl' && value !== 'en') return;

    language = value;

    try {
      localStorage.setItem(key, value);
    } catch (_) {}

    document.getElementById('language-dialog')?.remove();

    apply();
    window.dispatchEvent(new Event('site-language-change'));

    if (
      dialogReturnFocus instanceof HTMLElement &&
      dialogReturnFocus.isConnected
    ) {
      dialogReturnFocus.focus();
    }
  }

  function dialog() {
    const oldDialog = document.getElementById('language-dialog');

    if (oldDialog) {
      oldDialog.querySelector('button')?.focus();
      return;
    }

    dialogReturnFocus = document.activeElement;

    const overlay = document.createElement('div');

    overlay.id = 'language-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'language-title');
    overlay.setAttribute('aria-describedby', 'language-description');

    overlay.innerHTML = `
      <div class="language-panel">
        <h2 id="language-title">
          Choose your language / Kies je taal
        </h2>

        <p id="language-description">
          Which language would you prefer?<br>
          In welke taal wil je de website bekijken?
        </p>

        <div class="language-actions">
          <button type="button" data-lang="en">English</button>
          <button type="button" data-lang="nl">Nederlands</button>
        </div>
      </div>
    `;

    const buttons = Array.from(
      overlay.querySelectorAll('[data-lang]')
    );

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        choose(button.dataset.lang);
      });
    });

    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        choose(language);
        return;
      }

      if (event.key !== 'Tab') return;

      const first = buttons[0];
      const last = buttons[buttons.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.body.appendChild(overlay);
    buttons[0].focus();
  }

  const css = document.createElement('style');

  css.textContent = `
    #language-button {
      cursor: pointer;
    }

    #language-dialog {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(38, 29, 20, .68);
      box-sizing: border-box;
    }

    .language-panel {
      width: min(100%, 450px);
      max-height: calc(100dvh - 40px);
      overflow-y: auto;
      padding: 32px;
      box-sizing: border-box;
      border: 1px solid #d7c5ae;
      border-radius: 6px;
      background: #faf7f2;
      color: #3d3024;
      text-align: center;
      box-shadow: 0 15px 45px rgba(0, 0, 0, .2);
    }

    .language-panel h2 {
      margin: 0 0 14px;
      font-family: Georgia, serif;
      font-weight: normal;
      font-size: 1.5rem;
      line-height: 1.3;
    }

    .language-panel p {
      margin: 0 0 24px;
      line-height: 1.6;
    }

    .language-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
    }

    .language-actions button {
      padding: 12px 23px;
      border: 0;
      border-radius: 3px;
      background: #a67c48;
      color: #fff;
      cursor: pointer;
      font: 14px Arial, sans-serif;
    }

    .language-actions button:hover {
      background: #906739;
    }

    .language-actions button:focus-visible {
      outline: 2px solid #3d3024;
      outline-offset: 4px;
    }
  `;

  document.head.appendChild(css);

  window.siteLanguage = {
    get: () => language,
    text: name => words[language][name],
    apply
  };

  function init() {
    apply();

    document.getElementById('language-button')
      ?.addEventListener('click', dialog);

    if (saved !== 'nl' && saved !== 'en') {
      dialog();
    }

    if (
      document.querySelector('.header-actions') &&
      !document.getElementById('product-search-script')
    ) {
      const searchScript = document.createElement('script');

      searchScript.id = 'product-search-script';
      searchScript.src = searchScriptUrl;

      document.body.appendChild(searchScript);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
