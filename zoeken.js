(() => {
  if (document.getElementById('search-button')) return;

  const actions = document.querySelector('.header-actions');
  const account = document.getElementById('account-button');
  if (!actions || !account) return;

  const text = (nl, en) =>
    window.siteLanguage.get() === 'nl' ? nl : en;

  const searchButton = document.createElement('button');
  searchButton.id = 'search-button';
  searchButton.type = 'button';
  searchButton.className = 'icon-button';

  searchButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5"></circle>
      <path d="m15.5 15.5 5 5"></path>
    </svg>
  `;

  actions.insertBefore(searchButton, account);

  const css = document.createElement('style');

  css.textContent = `
    #product-search {
      position: fixed;
      inset: 0;
      z-index: 99990;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: max(25px, 8vh) 20px 25px;
      background: rgba(38, 29, 20, .65);
      box-sizing: border-box;
    }

    #product-search[hidden] {
      display: none !important;
    }

    .search-panel {
      width: min(100%, 650px);
      max-height: 82dvh;
      overflow-y: auto;
      padding: 28px;
      border: 1px solid #d7c5ae;
      border-radius: 5px;
      background: #faf7f2;
      color: #3d3024;
      box-shadow: 0 15px 45px rgba(0, 0, 0, .2);
      box-sizing: border-box;
    }

    .search-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 20px;
    }

    .search-heading h2 {
      margin: 0;
      text-align: left;
      font: normal 28px/1.2 Georgia, serif;
      color: #3d3024;
    }

    .search-close {
      width: 38px;
      height: 38px;
      padding: 0;
      border: 0;
      background: transparent;
      color: #65513b;
      cursor: pointer;
      font: 30px/1 Arial, sans-serif;
    }

    #search-input {
      display: block;
      width: 100%;
      padding: 14px;
      margin: 8px 0 0;
      border: 1px solid #cdbba3;
      border-radius: 2px;
      background: white;
      color: #3d3024;
      font: 16px Arial, sans-serif;
      box-sizing: border-box;
    }

    #search-label {
      font-size: 14px;
    }

    #search-status {
      margin: 16px 0;
      color: #81766b;
      font-size: 14px;
    }

    .search-result {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr);
      align-items: center;
      gap: 16px;
      padding: 12px 0;
      border-top: 1px solid #e5dacb;
      color: #3d3024;
      text-decoration: none;
    }

    .search-result:hover .search-result-title {
      text-decoration: underline;
    }

    .search-result-image {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      background: #eee5d9;
    }

    .search-result-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .search-result-title {
      display: block;
      font-size: 19px;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    .search-result-price {
      display: block;
      margin-top: 5px;
      color: #80603b;
      font: 14px Arial, sans-serif;
    }

    .search-close:focus-visible,
    #search-input:focus-visible,
    .search-result:focus-visible {
      outline: 2px solid #a67c48;
      outline-offset: 3px;
    }

    @media (max-width: 700px) {
      .site-header,
      .topbar {
        padding-left: 16px;
        padding-right: 16px;
        column-gap: 8px;
      }

      .header-actions {
        gap: 4px;
      }

      .header-actions .icon-button {
        width: 32px;
      }

      .brand-name {
        font-size: 23px;
      }

      .search-panel {
        padding: 20px;
      }
    }
  `;

  document.head.appendChild(css);

  const overlay = document.createElement('div');
  overlay.id = 'product-search';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'search-title');

  overlay.innerHTML = `
    <div class="search-panel">
      <div class="search-heading">
        <h2 id="search-title"></h2>
        <button type="button" class="search-close">×</button>
      </div>

      <label id="search-label" for="search-input"></label>

      <input
        id="search-input"
        type="search"
        autocomplete="off"
        maxlength="150"
        aria-controls="search-results"
      >

      <p id="search-status" role="status" aria-live="polite"></p>
      <div id="search-results"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('#search-input');
  const status = overlay.querySelector('#search-status');
  const results = overlay.querySelector('#search-results');
  const closeButton = overlay.querySelector('.search-close');

  let catalog = [];
  let state = 'idle';
  let returnFocus = null;
  let scrollBefore = '';
  let requestNumber = 0;
  let searchTimer = null;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function searchableText(product) {
    return normalize([
      product.title,
      product.title_en,
      product.description,
      product.description_en,
      product.long_description,
      product.long_description_en
    ].filter(value => typeof value === 'string').join(' '));
  }

  function translate() {
    searchButton.setAttribute(
      'aria-label', text('Zoek producten', 'Search products')
    );
    searchButton.setAttribute('aria-haspopup', 'dialog');
    searchButton.setAttribute('aria-controls', overlay.id);

    overlay.querySelector('#search-title').textContent =
      text('Zoek producten', 'Search products');

    overlay.querySelector('#search-label').textContent = text(
      'Zoek op naam of omschrijving',
      'Search by name or description'
    );

    input.placeholder = text(
      'Bijvoorbeeld: kaars of kruis',
      'For example: candle or cross'
    );

    closeButton.setAttribute(
      'aria-label', text('Sluit zoeken', 'Close search')
    );

    if (!overlay.hidden) render();
  }

  function render() {
    results.replaceChildren();

    if (state === 'loading') {
      status.textContent = text(
        'Producten worden geladen...',
        'Loading products...'
      );
      return;
    }

    if (state === 'error') {
      status.textContent = text(
        'De producten konden niet worden geladen. Sluit het zoeken en open het opnieuw om het nogmaals te proberen.',
        'Products could not be loaded. Close search and reopen it to try again.'
      );
      return;
    }

    if (state !== 'ready') return;

    const terms = normalize(input.value).split(/\s+/).filter(Boolean);

    if (!terms.length) {
      status.textContent = text(
        'Typ hierboven wat je zoekt.',
        'Type what you are looking for above.'
      );
      return;
    }

    const matches = catalog.filter(product => {
      const content = searchableText(product);
      return terms.every(term => content.includes(term));
    });

    status.textContent = matches.length
      ? text(
          `${matches.length} ${
            matches.length === 1 ? 'product gevonden' : 'producten gevonden'
          }.`,
          `${matches.length} ${
            matches.length === 1 ? 'product found' : 'products found'
          }.`
        )
      : text(
          'Geen producten gevonden. Probeer een andere zoekterm.',
          'No products found. Try another search term.'
        );

    matches.forEach(product => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href =
        `product.html?product=${encodeURIComponent(product.id)}`;

      const imageBox = document.createElement('span');
      imageBox.className = 'search-result-image';

      const imageUrl = Shop.imageUrl(product.image);

      if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = '';
        image.loading = 'lazy';
        image.addEventListener('error', () => image.remove());
        imageBox.append(image);
      }

      const info = document.createElement('span');
      const title = document.createElement('span');
      title.className = 'search-result-title';
      title.textContent = Shop.title(product);

      const price = document.createElement('span');
      price.className = 'search-result-price';
      price.textContent = Shop.money(product.cents);

      info.append(title, price);
      link.append(imageBox, info);
      results.append(link);
    });
  }

  async function open() {
    if (!overlay.hidden) return;

    returnFocus = document.activeElement;
    scrollBefore = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    overlay.hidden = false;
    searchButton.setAttribute('aria-expanded', 'true');
    state = 'loading';
    translate();
    input.focus();

    const request = ++requestNumber;

    try {
      const products = await Shop.listProducts();

      if (request !== requestNumber || overlay.hidden) return;

      catalog = products;
      state = 'ready';
    } catch (_) {
      if (request !== requestNumber || overlay.hidden) return;
      state = 'error';
    }

    render();
  }

  function close() {
    if (overlay.hidden) return;

    requestNumber++;
    clearTimeout(searchTimer);
    overlay.hidden = true;
    searchButton.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = scrollBefore;

    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
      returnFocus.focus();
    }
  }

  searchButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);

  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });

  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from(overlay.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), a[href]'
    ));

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('site-language-change', translate);

  searchButton.setAttribute('aria-expanded', 'false');
  translate();
})();
