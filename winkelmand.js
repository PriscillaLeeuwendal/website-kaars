(() => {
  'use strict';

  const API = 'https://licht-en-liefde-api.timdekruyf07.workers.dev';
  const REPO = 'https://api.github.com/repos/timdekruyf07-dotcom/website-kaars';
  const CART_KEY = 'licht-en-liefde-winkelmand-v1';
  const MAX_QUANTITY = 1000;

  let cart = {};
  const products = new Map();
  let panel = null;
  let previousFocus = null;
  let refreshing = false;

  const en = () => window.siteLanguage?.get() === 'en';
  const text = (nl, english) => en() ? english : nl;

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function money(cents) {
    return new Intl.NumberFormat(en() ? 'en-IE' : 'nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  }

  function validId(id) {
    return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
  }

  function readCart() {
    const result = {};

    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || '{}');

      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
        return result;
      }

      for (const [id, quantity] of Object.entries(saved)) {
        if (
          validId(id) &&
          Number.isSafeInteger(quantity) &&
          quantity > 0 &&
          quantity <= MAX_QUANTITY
        ) {
          result[id] = quantity;
        }
      }
    } catch (_) {}

    return result;
  }

  cart = readCart();

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (_) {
      alert(text(
        'Je browser kan de winkelmand niet bewaren. De artikelen blijven in deze tab beschikbaar totdat je de pagina verlaat.',
        'Your browser cannot save the cart. Items remain available in this tab until you leave the page.'
      ));
    }

    updateCount();
  }

  function updateCount() {
    const count = Object.values(cart).reduce((sum, quantity) => {
      return sum + quantity;
    }, 0);

    document.querySelectorAll('[data-cart-count]').forEach(node => {
      node.textContent = String(count);
    });
  }

  async function request(url, parse = 'json') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store'
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return parse === 'text'
        ? await response.text()
        : await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function parseProduct(id, content) {
    const match = content.match(
      /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
    );

    if (!match) throw new Error('Ongeldig productbestand');

    const data = jsyaml.load(match[1]);
    const price = data?.price;

    if (
      !data ||
      typeof data.title !== 'string' ||
      !data.title.trim() ||
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error('Ongeldige productgegevens');
    }

    const cents = Math.round(price * 100);

    if (
      !Number.isSafeInteger(cents) ||
      Math.abs(price * 100 - cents) > 0.000001
    ) {
      throw new Error('De prijs moet maximaal twee decimalen hebben');
    }

    const product = { ...data, id, cents };
    products.set(id, product);
    return product;
  }

  async function getProduct(id, fresh = false) {
    if (!validId(id)) throw new Error('Ongeldig product');

    if (!fresh && products.has(id)) {
      return products.get(id);
    }

    const file = await request(
      `${REPO}/contents/content/producten/${encodeURIComponent(id)}.md?ref=main`
    );

    if (!file.download_url) throw new Error('Productbestand ontbreekt');

    const content = await request(file.download_url, 'text');
    return parseProduct(id, content);
  }

  async function listProducts() {
    const files = await request(
      `${REPO}/contents/content/producten?ref=main`
    );

    if (!Array.isArray(files)) {
      throw new Error('Productenmap niet gevonden');
    }

    const productFiles = files.filter(file => {
      return file.type === 'file' && file.name.endsWith('.md');
    });

    return Promise.all(productFiles.map(async file => {
      const id = file.name.slice(0, -3);

      if (!validId(id) || !file.download_url) {
        throw new Error('Ongeldig productbestand');
      }

      const content = await request(file.download_url, 'text');
      return parseProduct(id, content);
    }));
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
      throw new Error('Ongeldige voorraadinformatie');
    }

    return data.available;
  }

  function title(product) {
    return en() && product.title_en
      ? product.title_en
      : product.title;
  }

  function description(product, long = false) {
    if (en()) {
      return (
        (long && product.long_description_en) ||
        product.description_en ||
        (long && product.long_description) ||
        product.description ||
        ''
      );
    }

    return (
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

      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  async function add(product, button) {
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = text('Even controleren...', 'Checking...');

    try {
      const available = await getStock(product.id);
      const current = cart[product.id] || 0;

      if (available === 0) {
        alert(text(
          'Dit product is momenteel uitverkocht.',
          'This product is currently sold out.'
        ));
        return;
      }

      if (current >= Math.min(available, MAX_QUANTITY)) {
        alert(text(
          'Je hebt het beschikbare aantal van dit product al in je winkelmand.',
          'Your cart already contains the available quantity of this product.'
        ));
        return;
      }

      cart[product.id] = current + 1;
      saveCart();
      openCart();
    } catch (error) {
      alert(error.status === 404
        ? text(
            'Voor dit product moet de voorraad nog worden ingesteld.',
            'Stock has not yet been configured for this product.'
          )
        : text(
            'De voorraad kon niet worden gecontroleerd. Probeer het zo opnieuw.',
            'Stock could not be checked. Please try again shortly.'
          )
      );
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
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

    const ids = Object.keys(cart);

    if (!ids.length) {
      content.append(element('p', '', text(
        'Je winkelmand is nog leeg.',
        'Your cart is empty.'
      )));
      return;
    }

    let subtotal = 0;
    let complete = true;

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

        subtotal += product.cents * cart[id];
      } else {
        complete = false;
        info.append(element('p', '', text(
          'Productgegevens niet beschikbaar.',
          'Product details unavailable.'
        )));
      }

      const controls = element('div', 'cart-controls');
      const minus = element('button', '', '−');
      const quantity = element('span', '', String(cart[id]));
      const plus = element('button', '', '+');
      const remove = element('button', 'cart-remove', text(
        'Verwijderen',
        'Remove'
      ));

      minus.type = plus.type = remove.type = 'button';

      minus.setAttribute('aria-label', text(
        'Aantal verlagen',
        'Decrease quantity'
      ));

      plus.setAttribute('aria-label', text(
        'Aantal verhogen',
        'Increase quantity'
      ));

      minus.addEventListener('click', () => {
        if (cart[id] > 1) cart[id]--;
        else delete cart[id];

        saveCart();
        renderCart();
      });

      plus.disabled = !product || refreshing;

      plus.addEventListener('click', async () => {
        plus.disabled = true;

        try {
          const available = await getStock(id);
          const current = cart[id] || 0;

          if (current >= Math.min(available, MAX_QUANTITY)) {
            alert(text(
              'Er is geen extra voorraad beschikbaar.',
              'No additional stock is available.'
            ));
          } else {
            cart[id] = current + 1;
            saveCart();
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

      remove.addEventListener('click', () => {
        delete cart[id];
        saveCart();
        renderCart();
      });

      controls.append(minus, quantity, plus, remove);
      row.append(info, controls);
      content.append(row);
    }

    if (!complete || refreshing) {
      content.append(element('p', 'cart-note', refreshing
        ? text(
            'Actuele productgegevens worden geladen...',
            'Loading current product details...'
          )
        : text(
            'Niet alle producten konden worden geladen. Sluit de winkelmand en probeer het opnieuw.',
            'Some products could not be loaded. Close the cart and try again.'
          )
      ));
    }

    if (complete) {
      const totals = element('div', 'cart-totals');

      totals.append(
        element('p', '', `${text('Producten', 'Products')}: ${money(subtotal)}`),
        element('p', '', `${text(
          'Verzending binnen Nederland',
          'Shipping within the Netherlands'
        )}: ${money(795)}`),
        element('strong', '', `${text('Totaal', 'Total')}: ${money(subtotal + 795)}`)
      );

      content.append(totals);
    }

    const checkout = element('button', 'shop-button', text(
      'Afrekenen — binnenkort beschikbaar',
      'Checkout — available soon'
    ));

    checkout.type = 'button';
    checkout.disabled = true;

    content.append(
      checkout,
      element('p', 'cart-note', text(
        'De winkelmand is klaar om te testen. Betalen wordt in de volgende stap aangesloten. Artikelen in de winkelmand zijn nog niet gereserveerd.',
        'The cart is ready for testing. Payment will be connected in the next step. Items in the cart are not yet reserved.'
      ))
    );
  }

  async function openCart() {
    if (panel) return;

    previousFocus = document.activeElement;
    panel = element('div', 'cart-overlay');
    panel.id = 'shop-cart-dialog';

    const dialog = element('section', 'cart-panel');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'shop-cart-title');
    dialog.tabIndex = -1;

    const heading = element('h2', '', text('Winkelmand', 'Cart'));
    heading.id = 'shop-cart-title';

    const close = element('button', 'cart-close', text('Sluiten', 'Close'));
    close.type = 'button';
    close.addEventListener('click', closeCart);

    const top = element('div', 'cart-top');
    top.append(heading, close);

    const content = element('div', 'cart-content');
    dialog.append(top, content);
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

      const focusable = [...dialog.querySelectorAll(
        'a[href], button:not(:disabled), [tabindex="0"]'
      )];

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

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
    renderCart();
    close.focus();

    await Promise.allSettled(
      Object.keys(cart).map(id => getProduct(id, true))
    );

    refreshing = false;
    renderCart();
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-open-cart]');
    if (!link) return;

    event.preventDefault();
    openCart();
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
    if (event.key !== CART_KEY && event.key !== null) return;

    cart = readCart();
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
      width: min(100%, 650px);
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
    .cart-close, .cart-controls button {
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
    .cart-row-info a { color: #736359; font-weight: bold; }
    .cart-row-info p { margin: 5px 0 0; }
    .cart-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cart-controls .cart-remove { font-size: .85em; }
    .cart-totals { padding: 20px 0; }
    .cart-totals p { margin: 5px 0; }
    .cart-totals strong { display: block; margin-top: 12px; }
    .cart-note { font-size: .9em; color: #7a706b; }
    .shop-button:disabled,
    .cart-controls button:disabled {
      opacity: .6;
      cursor: not-allowed;
    }
    @media(max-width: 550px) {
      .cart-row { align-items: start; flex-direction: column; }
      .cart-controls { justify-content: flex-start; }
      .cart-panel { padding: 20px; }
    }
  `;

  document.head.append(style);

  window.Shop = {
    listProducts,
    getProduct,
    getStock,
    title,
    description,
    imageUrl,
    money,
    add,
    element,
    text
  };

  updateCount();
})();
