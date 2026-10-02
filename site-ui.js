(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const productPage = page === 'product.html';

  const topbar = document.createElement('div');
  topbar.className = 'topbar';

  topbar.innerHTML = `
    <a class="brand" href="index.html" aria-label="Diatheke Atelier — Home">
      <span class="brand-name">DIATHĒKĒ</span>
      <span class="brand-subtitle">ATELIER</span>
    </a>

    <nav class="main-nav" aria-label="Main navigation">
      <a href="index.html">Home</a>
      <a href="producten.html">Products</a>
      <a href="over-ons.html">About us</a>
      <a href="contact.html">Contact</a>
    </nav>

    <div class="header-actions">
      <button
        type="button"
        class="icon-button"
        id="account-button"
        aria-label="My account"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="7.5" r="3.5"></circle>
          <path d="M4.5 21v-2.5a7.5 7.5 0 0 1 15 0V21z"></path>
        </svg>
      </button>

      <a
        href="#winkelmand"
        class="cart-link icon-button"
        data-open-cart
        data-icon-cart
        aria-label="Cart"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 8h14l1 13H4z"></path>
          <path d="M9 9V6a3 3 0 0 1 6 0v3"></path>
        </svg>
        <span class="cart-count" data-cart-count>0</span>
      </a>
    </div>
  `;

  topbar.querySelectorAll('.main-nav a').forEach(link => {
    const target = link.getAttribute('href');

    if (
      target === page ||
      (productPage && target === 'producten.html')
    ) {
      link.classList.add('active');

      if (target === page) {
        link.setAttribute('aria-current', 'page');
      }
    }
  });

  document.body.prepend(topbar);

  topbar.querySelector('#account-button').addEventListener('click', () => {
    alert(
      window.siteLanguage?.get() === 'nl'
        ? 'Een account aanmaken is binnenkort beschikbaar.'
        : 'Creating an account will be available soon.'
    );
  });

  function translateAdmin() {
    const admin = document.querySelector('[data-admin-link]');

    if (admin) {
      admin.textContent = window.siteLanguage?.get() === 'nl'
        ? 'Beheer'
        : 'Admin';
    }
  }

  window.addEventListener('site-language-change', translateAdmin);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', translateAdmin);
  } else {
    translateAdmin();
  }
})();
