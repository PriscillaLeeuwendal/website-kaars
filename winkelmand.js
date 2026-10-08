(() => {
  'use strict';

  const API =
    'https://licht-en-liefde-api.timdekruyf07.workers.dev';

  const CATALOG_URL = new URL(
    'producten.json',
    document.currentScript?.src || location.href
  ).href;

  const KEY = 'licht-en-liefde-winkelmand-v1';

  let catalogTime = 0;
  let catalogRequest = null;
  let panel = null;
  let previousFocus = null;
  let refreshing = false;
  let shipping = null;

  const products = new Map();

  const text = (nl, english) => {
    return window.siteLanguage?.get() === 'en' ? english : nl;
  };

  const validId = id => {
    return (
      typeof id === 'string' &&
      /^[a-zA-Z0-9_-]+$/.test(id)
    );
  };

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function money(cents) {
    return new Intl.NumberFormat(
      window.siteLanguage?.get() === 'en' ? 'en-IE' : 'nl-NL',
      { style: 'currency', currency: 'EUR' }
    ).format(cents / 100);
  }

  function readState() {
    const state = { items: {}, completed: [] };

    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      const items = raw?.format === 2 ? raw.items : raw;

      if (
        items &&
        typeof items === 'object' &&
        !Array.isArray(items)
      ) {
        for (const [id, quantity] of Object.entries(items)) {
          if (
            validId(id) &&
            Number.isSafeInteger(quantity) &&
            quantity > 0 &&
            quantity <= 1000
          ) {
            state.items[id] = quantity;
          }
        }
      }

      if (raw?.format === 2 && Array.isArray(raw.completed)) {
        state.completed = raw.completed.filter(id => {
          return typeof id === 'string';
        });
      }
    } catch (_) {}

    return state;
  }

  let state = readState();

  function persist() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ format: 2, ...state })
      );
    } catch (_) {
      throw new Error(text(
        'Je browser kan de winkelmand niet bewaren. Sta websiteopslag toe en probeer opnieuw.',
        'Your browser cannot save the cart. Allow website storage and try again.'
      ));
    }

    updateCount();
  }

  function updateCount() {
    const count = Object.values(state.items).reduce(
      (sum, quantity) => sum + quantity,
      0
    );

    document.querySelectorAll('[data-cart-count]').forEach(node => {
      node.textContent = String(count);
    });
  }

  function snapshot() {
    state = readState();

    return Object.entries(state.items)
      .map(([product_id, quantity]) => ({
        product_id,
        quantity
      }))
      .sort((a, b) => a.product_id.localeCompare(b.product_id));
  }

  async function completeOrder(orderId, items) {
    async function apply() {
      state = readState();

      if (state.completed.includes(orderId)) return;

      for (const item of items) {
        if (
          !validId(item.product_id) ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity <= 0
        ) {
          throw new Error('Ongeldige bestelling');
        }

        const remaining =
          (state.items[item.product_id] || 0) - item.quantity;

        if (remaining > 0) {
          state.items[item.product_id] = remaining;
        } else {
          delete state.items[item.product_id];
        }
      }

      state.completed.push(orderId);
      persist();
    }

    if (navigator.locks) {
      return navigator.locks.request(
        'licht-en-liefde-cart',
        apply
      );
    }

    return apply();
  }

  async function request(url, parse = 'json') {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return parse === 'text'
      ? response.text()
      : response.json();
  }

  async function getShipping() {
    const data = await request(API + '/shipping');

    if (
      !Number.isSafeInteger(data.shipping_cents) ||
      data.shipping_cents < 0 ||
      data.shipping_cents > 100000 ||
      !['test', 'live'].includes(data.mode)
    ) {
      throw new Error('Ongeldige verzendkosten');
    }

    shipping = data;
    return data;
  }

  async function loadCatalog(fresh = false) {
    if (catalogRequest) return catalogRequest;

    if (
      !fresh &&
      catalogTime &&
      Date.now() - catalogTime < 60000
    ) {
      return [...products.values()];
    }

    catalogRequest = (async () => {
      const data = await request(CATALOG_URL);

      if (!Array.isArray(data)) {
        throw new Error('Ongeldige productenlijst');
      }

      const next = new Map();

      for (const product of data) {
        if (
          !product ||
          !validId(product.id) ||
          next.has(product.id) ||
          typeof product.title !== 'string' ||
          !product.title.trim() ||
          typeof product.price !== 'number' ||
          !Number.isFinite(product.price) ||
          product.price < 0 ||
          !Number.isSafeInteger(product.cents) ||
          product.cents < 0 ||
          Math.abs(product.price * 100 - product.cents) > 0.000001
        ) {
          throw new Error('Ongeldige productgegevens');
        }

        next.set(product.id, product);
      }

      products.clear();

      for (const [id, product] of next) {
        products.set(id, product);
      }

      catalogTime = Date.now();

      return [...products.values()];
    })();

    try {
      return await catalogRequest;
    } finally {
      catalogRequest = null;
    }
  }

  async function getProduct(id, fresh = false) {
    if (!validId(id)) throw new Error('Ongeldig product');

    await loadCatalog(fresh);

    const product = products.get(id);

    if (!product) {
      const error = new Error('Product niet gevonden');
      error.status = 404;
      throw error;
    }

    return product;
  }

  async function listProducts() {
    return loadCatalog(true);
  }

  async function getStock(id) {
    const data = await request(
      `${API}/stock?product=${encodeURIComponent(id)}`
    );

    if (
      data.product_id !== id ||
      !Number.isSafeInteger(data.available) ||
      data.available < 0
    ) {
      throw new Error('Ongeldige voorraad');
    }

    return data.available;
  }

  function title(product) {
    return (
      window.siteLanguage?.get() === 'en' &&
      product.title_en
    ) ? product.title_en : product.title;
  }

  function description(product, long = false) {
    return window.siteLanguage?.get() === 'en'
      ? (
          (long && product.long_description_en) ||
          product.description_en ||
          (long && product.long_description) ||
          product.description ||
          ''
        )
      : (
          (long && product.long_description) ||
          product.description ||
          ''
        );
  }

  function imageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';

    const path = value.trim();

    try {
      const url = new URL(
        path.startsWith('/') ? path.slice(1) : path,
        new URL('.', location.href)
      );

      return ['https:', 'http:'].includes(url.protocol)
        ? url.href
        : '';
    } catch (_) {
      return '';
    }
  }

  async function add(product, button) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = text('Even controleren...', 'Checking...');

    try {
      const available = await getStock(product.id);

      state = readState();

      const current = state.items[product.id] || 0;

      if (current >= Math.min(available, 1000)) {
        alert(text(
          'Er is geen extra voorraad beschikbaar voor je winkelmand.',
          'No additional stock is available for your cart.'
        ));
        return;
      }

      state.items[product.id] = current + 1;
      persist();
      openCart();
    } catch (error) {
      alert(error.status === 404
        ? text(
            'Voor dit product moet de voorraad nog worden ingesteld.',
            'Stock has not yet been configured for this product.'
          )
        : text(
            'Toevoegen is niet gelukt. Controleer je verbinding en probeer opnieuw.',
            'Could not add the product. Check your connection and try again.'
          )
      );
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  function closeCart() {
    if (!panel) return;

    panel.remove();
    panel = null;
    document.body.style.overflow = '';
    previousFocus?.focus();
  }

  function renderCart() {
    if (!panel) return;

    const content = panel.querySelector('.cart-content');
    content.replaceChildren();

    const ids = Object.keys(state.items);

    if (!ids.length) {
      content.append(element(
        'p',
        '',
        text('Je winkelmand is nog leeg.', 'Your cart is empty.')
      ));
      return;
    }

    let subtotal = 0;
    let complete = Boolean(shipping);

    for (const id of ids) {
      const product = products.get(id);
      const row = element('div', 'cart-row');
      const info = element('div', 'cart-row-info');

      if (product) {
        const link = element('a', '', title(product));
        link.href = `product.html?product=${encodeURIComponent(id)}`;

        info.append(
          link,
          element('p', '', money(product.cents))
        );

        subtotal += product.cents * state.items[id];
      } else {
        complete = false;
        info.append(element(
          'p',
          '',
          text(
            'Productgegevens niet beschikbaar.',
            'Product details unavailable.'
          )
        ));
      }

      const controls = element('div', 'cart-controls');
      const minus = element('button', '', '−');
      const number = element('span', '', String(state.items[id]));
      const plus = element('button', '', '+');

      const remove = element(
        'button',
        'cart-remove',
        text('Verwijderen', 'Remove')
      );

      minus.type = plus.type = remove.type = 'button';

      minus.setAttribute(
        'aria-label',
        text('Aantal verlagen', 'Decrease quantity')
      );

      plus.setAttribute(
        'aria-label',
        text('Aantal verhogen', 'Increase quantity')
      );

      function change(fn) {
        try {
          state = readState();
          fn();
          persist();
          renderCart();
        } catch (error) {
          alert(error.message);
        }
      }

      minus.addEventListener('click', () => {
        change(() => {
          if (state.items[id] > 1) state.items[id]--;
          else delete state.items[id];
        });
      });

      remove.addEventListener('click', () => {
        change(() => {
          delete state.items[id];
        });
      });

      plus.disabled = !product || refreshing;

      plus.addEventListener('click', async () => {
        plus.disabled = true;

        try {
          const available = await getStock(id);
          state = readState();

          if (
            (state.items[id] || 0) >= Math.min(available, 1000)
          ) {
            alert(text(
              'Er is geen extra voorraad beschikbaar.',
              'No additional stock is available.'
            ));
          } else {
            state.items[id] = (state.items[id] || 0) + 1;
            persist();
          }
        } catch (_) {
          alert(text(
            'De voorraad kon niet worden gecontroleerd.',
            'Stock could not be checked.'
          ));
        } finally {
          renderCart();
        }
      });

      controls.append(minus, number, plus, remove);
      row.append(info, controls);
      content.append(row);
    }

    if (refreshing || !complete) {
      content.append(element(
        'p',
        'cart-note',
        refreshing
          ? text(
              'Actuele productgegevens worden geladen...',
              'Loading current product details...'
            )
          : text(
              'Sluit de winkelmand en probeer opnieuw: niet alle producten konden worden geladen.',
              'Close the cart and try again: some products could not be loaded.'
            )
      ));
    }

    if (complete) {
      const totals = element('div', 'cart-totals');

      totals.append(
        element(
          'p',
          '',
          `${text('Producten', 'Products')}: ${money(subtotal)}`
        ),
        element(
          'p',
          '',
          `${text(
            'Verzending binnen Nederland',
            'Shipping within the Netherlands'
          )}: ${money(shipping.shipping_cents)}`
        ),
        element(
          'strong',
          '',
          `${text('Totaal', 'Total')}: ${money(subtotal + shipping.shipping_cents)}`
        )
      );

      content.append(totals);
    }

    const checkout = element(
      'button',
      'shop-button',
      text('Afrekenen', 'Checkout')
    );

    checkout.type = 'button';
    checkout.disabled = refreshing || !complete;

    checkout.addEventListener('click', () => {
      location.href = 'afrekenen.html';
    });

    content.append(
      checkout,
      element(
        'p',
        'cart-note',
        text(
          shipping?.mode === 'test'
            ? 'Testmodus: je betaalt nog geen echt geld. Artikelen in de winkelmand zijn nog niet gereserveerd.'
            : 'Artikelen in de winkelmand zijn nog niet gereserveerd.',
          shipping?.mode === 'test'
            ? 'Test mode: no real money is charged. Items in the cart are not yet reserved.'
            : 'Items in the cart are not yet reserved.'
        )
      )
    );
  }

  async function openCart() {
    if (panel) return;

    state = readState();
    previousFocus = document.activeElement;
    panel = element('div', 'cart-overlay');

    const dialog = element('section', 'cart-panel');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'shop-cart-title');
    dialog.tabIndex = -1;

    const heading = element('h2', '', text('Winkelmand', 'Cart'));
    heading.id = 'shop-cart-title';

    const close = element(
      'button',
      'cart-close',
      text('Sluiten', 'Close')
    );

    close.type = 'button';
    close.addEventListener('click', closeCart);

    const top = element('div', 'cart-top');
    top.append(heading, close);

    dialog.append(top, element('div', 'cart-content'));
    panel.append(dialog);
    document.body.append(panel);
    document.body.style.overflow = 'hidden';

    panel.addEventListener('click', event => {
      if (event.target === panel) closeCart();
    });

    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCart();
        return;
      }

      if (event.key !== 'Tab') return;

      const nodes = [
        ...dialog.querySelectorAll('a[href], button:not(:disabled)')
      ];

      if (!nodes.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    });

    refreshing = true;
    shipping = null;
    renderCart();
    close.focus();

    await Promise.allSettled([
      getShipping(),
      ...Object.keys(state.items).map(id => getProduct(id, true))
    ]);

    refreshing = false;
    renderCart();
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-open-cart]');

    if (link) {
      event.preventDefault();
      openCart();
    }
  });

  window.addEventListener('site-language-change', () => {
    updateCount();

    if (panel) {
      panel.querySelector('#shop-cart-title').textContent =
        text('Winkelmand', 'Cart');

      panel.querySelector('.cart-close').textContent =
        text('Sluiten', 'Close');

      renderCart();
    }
  });

  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;

    state = readState();
    updateCount();

    if (panel) {
      closeCart();
      openCart();
    }
  });

  const style = document.createElement('style');

  style.textContent = `
    .cart-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      background: rgba(25,20,18,.72);
    }

    .cart-panel {
      width: min(100%,650px);
      max-height: 85vh;
      overflow-y: auto;
      background: #fcfbfa;
      color: #4a4543;
      border-radius: 10px;
      padding: 25px;
      box-sizing: border-box;
      box-shadow: 0 15px 45px rgba(0,0,0,.25);
    }

    .cart-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 20px;
    }

    .cart-top h2 { margin: 0; }

    .cart-close,
    .cart-controls button {
      border: 1px solid #d9cec5;
      background: #f4efe9;
      color: #4a4543;
      border-radius: 4px;
      padding: 8px 12px;
      cursor: pointer;
      font: inherit;
    }

    .cart-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 18px 0;
      border-bottom: 1px solid #e8e1da;
    }

    .cart-row-info { min-width: 0; }

    .cart-row-info a {
      color: #736359;
      font-weight: bold;
    }

    .cart-row-info p { margin: 5px 0 0; }

    .cart-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }

    .cart-remove { font-size: .85em !important; }
    .cart-totals { padding: 20px 0; }
    .cart-totals p { margin: 5px 0; }

    .cart-totals strong {
      display: block;
      margin-top: 12px;
    }

    .cart-note {
      font-size: .9em;
      color: #7a706b;
    }

    .shop-button:disabled,
    .cart-controls button:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    @media (max-width: 550px) {
      .cart-row {
        align-items: start;
        flex-direction: column;
      }

      .cart-controls { justify-content: flex-start; }
      .cart-panel { padding: 20px; }
    }
  `;

  document.head.append(style);

  window.Shop = {
    getShipping,
    listProducts,
    getProduct,
    getStock,
    title,
    description,
    imageUrl,
    money,
    add,
    element,
    text,
    snapshot,
    completeOrder,
    API
  };

  updateCount();
})();
