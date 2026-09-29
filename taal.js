(() => {
  const key = 'licht-en-liefde-taal';
  let saved;

  try {
    saved = localStorage.getItem(key);
  } catch (_) {
    saved = null;
  }

  let language = saved === 'en' ? 'en' : 'nl';

  const words = {
    nl: {
      cart: 'Winkelmand (',
      home: 'Home',
      products: 'Producten',
      about: 'Over ons',
      contact: 'Contact',
      footer: '© 2026 Licht & Liefde - Handgemaakt met zorg.',
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
      products: 'Products',
      about: 'About us',
      contact: 'Contact',
      footer: '© 2026 Licht & Liefde - Handmade with care.',
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

  const set = (selector, text) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
  };

  function apply() {
    const en = language === 'en';
    const t = words[language];

    document.documentElement.lang = language;

    const cart = document.querySelector('.cart-link');
    if (cart && cart.firstChild) {
      cart.firstChild.textContent = t.cart;
    }

    document.querySelectorAll('.main-nav a').forEach((link, i) => {
      link.textContent = [
        t.home,
        t.products,
        t.about,
        t.contact
      ][i] || link.textContent;
    });

    set('footer p', t.footer);

    const page = location.pathname.split('/').pop() || 'index.html';

    if (page === 'index.html') {
      document.title = en
        ? 'Licht & Liefde - Handmade Candles'
        : 'Licht & Liefde - Handgemaakte Kaarsen';

      set('header > p', en
        ? 'Handmade candles with an encouraging Christian message'
        : 'Handgemaakte kaarsen met een bemoedigende christelijke tekst');

      set('.container h2', en
        ? 'Welcome to Licht & Liefde'
        : 'Welkom bij Licht & Liefde');

      set('.container p', en
        ? 'Every candle is made with love and features a carefully chosen Bible verse or Christian quote. A thoughtful gift for someone special, or a warm and hopeful moment in your own home.'
        : 'Elke kaars wordt met liefde gemaakt en voorzien van een zorgvuldig gekozen Bijbeltekst of christelijke quote. Perfect als warm cadeau voor een dierbare of om een sfeervol, hoopvol moment in huis te creëren.');

      set('.container .btn', en
        ? 'View our products'
        : 'Bekijk onze producten');

      set('#language-button', en
        ? 'Language: English'
        : 'Taal: Nederlands');
    }

    if (page === 'producten.html') {
      document.title = en
        ? 'Products - Licht & Liefde'
        : 'Producten - Licht & Liefde';

      set('header h1', en ? 'Our Products' : 'Onze Producten');
      set('.section h2', en ? 'Handmade Candles' : 'Handgemaakte Kaarsen');
      set('#refresh-products-btn', t.refresh);

      const status = document.querySelector('#product-list > p[data-status]');
      if (status) status.textContent = t[status.dataset.status];
    }

    if (page === 'product.html') {
      set('header h1', t.detail);
      set('.back-link', t.back);
    }

    if (page === 'over-ons.html') {
      document.title = en
        ? 'About Us - Licht & Liefde'
        : 'Over Ons - Licht & Liefde';

      set('header h1', en ? 'About Us' : 'Over Ons');

      set('.container h2', en
        ? 'The story behind Licht & Liefde'
        : 'Het verhaal achter Licht & Liefde');

      const paragraphs = document.querySelectorAll('.container p');

      if (paragraphs[0]) {
        paragraphs[0].innerHTML = en
          ? 'Welcome to <strong>Licht & Liefde</strong>! We believe a candle can bring more than a cosy atmosphere: it can also bring warmth and hope into your home.'
          : 'Welkom bij <strong>Licht & Liefde</strong>! Wij geloven dat een brandende kaars niet alleen gezelligheid brengt, maar ook warmte en hoop in huis kan verspreiden.';
      }

      if (paragraphs[1]) {
        paragraphs[1].textContent = en
          ? 'Our candles are handmade and feature carefully selected Christian messages and encouraging quotes. Whether you are looking for a meaningful gift or a peaceful moment for yourself, every candle is made with love, especially for you.'
          : 'Onze kaarsen worden met de hand gemaakt en voorzien van zorgvuldig geselecteerde christelijke teksten en bemoedigende quotes. Of je nu op zoek bent naar een dierbaar cadeau voor iemand die het nodig heeft, of gewoon een sfeervol moment voor jezelf wilt creëren: elk exemplaar wordt met liefde gemaakt, speciaal voor jou.';
      }
    }

    if (page === 'contact.html') {
      document.title = 'Contact - Licht & Liefde';

      set('.container h2', en
        ? 'Questions or orders?'
        : 'Interesse of bestellen?');

      set('.container p', en
        ? 'Would you like to order something or request a personal message on a candle? Feel free to get in touch!'
        : 'Wil je graag iets bestellen of heb je een speciale wens voor een eigen tekst op een kaars? Neem gerust contact op!');

      set('.container .btn', en
        ? 'Send a message'
        : 'Stuur een berichtje');
    }
  }

  function choose(value) {
    language = value;

    try {
      localStorage.setItem(key, value);
    } catch (_) {}

    const currentDialog = document.getElementById('language-dialog');
    if (currentDialog) currentDialog.remove();

    apply();
    window.dispatchEvent(new Event('site-language-change'));
  }

  function dialog() {
    const oldDialog = document.getElementById('language-dialog');
    if (oldDialog) oldDialog.remove();

    const overlay = document.createElement('div');
    overlay.id = 'language-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'language-title');

    overlay.innerHTML = `
      <div class="language-panel">
        <h2 id="language-title">Kies je taal / Choose your language</h2>
        <p>
          In welke taal wil je de website bekijken?<br>
          Which language would you prefer?
        </p>
        <div class="language-actions">
          <button type="button" data-lang="nl">Nederlands</button>
          <button type="button" data-lang="en">English</button>
        </div>
      </div>
    `;

    overlay.querySelectorAll('[data-lang]').forEach(button => {
      button.addEventListener('click', () => choose(button.dataset.lang));
    });

    document.body.appendChild(overlay);
    overlay.querySelector('button').focus();
  }

  const css = document.createElement('style');

  css.textContent = `
    #language-button {
      border: 0;
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
      background: rgba(25, 20, 18, .72);
      box-sizing: border-box;
    }
    .language-panel {
      width: min(100%, 430px);
      padding: 30px;
      box-sizing: border-box;
      border-radius: 10px;
      background: #fcfbfa;
      color: #3b3533;
      text-align: center;
      box-shadow: 0 15px 45px rgba(0, 0, 0, .25);
    }
    .language-panel h2 {
      margin: 0 0 12px;
      font-family: Georgia, serif;
      font-size: 1.5rem;
    }
    .language-panel p {
      margin: 0 0 24px;
    }
    .language-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
    }
    .language-actions button {
      padding: 11px 18px;
      border: 0;
      border-radius: 5px;
      background: #8c7b70;
      color: #fff;
      cursor: pointer;
      font: inherit;
    }
    .language-actions button:hover,
    .language-actions button:focus-visible {
      background: #736359;
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

    const languageButton = document.getElementById('language-button');
    if (languageButton) {
      languageButton.addEventListener('click', dialog);
    }

    if (saved !== 'nl' && saved !== 'en') {
      dialog();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
