(() => {
  const API = 'https://diatheke-account-test.timdekruyf07.workers.dev';
  const STORAGE_KEY = 'diatheke-account-session-v1';

  const messages = {
    INVALID_EMAIL: [
      'Vul een geldig e-mailadres in.',
      'Enter a valid email address.'
    ],
    INVALID_PASSWORD: [
      'Gebruik een wachtwoord van maximaal 128 tekens.',
      'Use a password of no more than 128 characters.'
    ],
    PASSWORD_TOO_SHORT: [
      'Gebruik een wachtwoord van minimaal 15 tekens.',
      'Use a password of at least 15 characters.'
    ],
    TOO_MANY_ATTEMPTS: [
      'Te veel pogingen. Wacht maximaal 10 minuten en probeer opnieuw.',
      'Too many attempts. Wait up to 10 minutes and try again.'
    ],
    SECURITY_CHECK_REQUIRED: [
      'Voer de beveiligingscontrole uit.',
      'Complete the security check.'
    ],
    SECURITY_CHECK_FAILED: [
      'De beveiligingscontrole is verlopen of mislukt. Probeer opnieuw.',
      'The security check expired or failed. Please try again.'
    ],
    SECURITY_UNAVAILABLE: [
      'De beveiligingscontrole is tijdelijk niet beschikbaar.',
      'The security check is temporarily unavailable.'
    ],
    INVALID_CREDENTIALS: [
      'Het e-mailadres of wachtwoord is onjuist.',
      'The email address or password is incorrect.'
    ],
    REGISTRATION_UNAVAILABLE: [
      'Een account aanmaken met deze gegevens is niet mogelijk. Probeer in te loggen.',
      'An account cannot be created with these details. Try signing in.'
    ],
    LOGIN_REQUIRED: [
      'Log eerst in.',
      'Please sign in first.'
    ],
    SESSION_EXPIRED: [
      'Je inlogsessie is verlopen. Log opnieuw in.',
      'Your session has expired. Please sign in again.'
    ],
    INVALID_ADDRESS: [
      'Controleer of alle adresgegevens, de Nederlandse postcode en het huisnummer correct zijn ingevuld.',
      'Check all address details, the Dutch postal code and the house number.'
    ],
    ACCOUNT_UNAVAILABLE: [
      'De accountfunctie is tijdelijk niet beschikbaar. Probeer opnieuw.',
      'The account service is temporarily unavailable. Please try again.'
    ]
  };

  function text(nl, en) {
    return window.siteLanguage?.get() === 'nl' ? nl : en;
  }

  function getToken() {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(STORAGE_KEY) || 'null'
      );

      if (
        !saved ||
        !/^[a-f0-9]{64}$/.test(saved.token || '') ||
        !Number.isSafeInteger(saved.expires_at) ||
        saved.expires_at <= Math.floor(Date.now() / 1000)
      ) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return saved.token;
    } catch (_) {
      return null;
    }
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('customer-account-change'));
  }

  async function request(path, options = {}) {
    const headers = {};

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.auth) {
      const token = getToken();

      if (!token) {
        const error = new Error(
          text('Log eerst in.', 'Please sign in first.')
        );
        error.status = 401;
        throw error;
      }

      headers.Authorization = 'Bearer ' + token;
    }

    let response;
    let data;

    try {
      response = await fetch(API + path, {
        method: options.method || 'GET',
        headers,
        body: options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
        cache: 'no-store',
        signal: AbortSignal.timeout(30000)
      });

      data = await response.json();
    } catch (_) {
      throw new Error(text(
        'De verbinding is mislukt. Controleer je internetverbinding en probeer opnieuw.',
        'The connection failed. Check your internet connection and try again.'
      ));
    }

    if (!response.ok) {
      if (options.auth && response.status === 401) {
        try {
          clearSession();
        } catch (_) {}
      }

      const translated = messages[data.code];

      const error = new Error(
        translated
          ? text(...translated)
          : text(
              'De aanvraag kon niet worden verwerkt. Probeer opnieuw.',
              'The request could not be processed. Please try again.'
            )
      );

      error.status = response.status;
      error.code = data.code;
      throw error;
    }

    return data;
  }

  async function authenticate(mode, email, password, turnstileToken) {
    const data = await request('/auth/' + mode, {
      method: 'POST',
      body: {
        email,
        password,
        turnstile_token: turnstileToken
      }
    });

    if (
      !/^[a-f0-9]{64}$/.test(data.token || '') ||
      !Number.isSafeInteger(data.expires_at) ||
      !data.account
    ) {
      throw new Error(text(
        'De server gaf een onverwacht antwoord.',
        'The server returned an unexpected response.'
      ));
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        token: data.token,
        expires_at: data.expires_at
      }));
    } catch (_) {
      try {
        await fetch(API + '/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + data.token
          },
          signal: AbortSignal.timeout(10000)
        });
      } catch (_) {}

      throw new Error(text(
        'Sta websiteopslag toe om ingelogd te kunnen blijven.',
        'Allow website storage to stay signed in.'
      ));
    }

    window.dispatchEvent(new Event('customer-account-change'));
    return data.account;
  }

  async function getAccount() {
    if (!getToken()) return null;

    const data = await request('/auth/me', { auth: true });
    return data.account;
  }

  async function saveAddress(address) {
    const data = await request('/auth/address', {
      method: 'PUT',
      auth: true,
      body: { address }
    });

    window.dispatchEvent(new Event('customer-account-change'));
    return data.account;
  }

  async function logout() {
    if (getToken()) {
      try {
        await request('/auth/logout', {
          method: 'POST',
          auth: true
        });
      } catch (error) {
        if (error.status !== 401) throw error;
      }
    }

    clearSession();
  }

  window.CustomerAccount = {
    text,
    getAccount,
    saveAddress,
    logout,
    hasSession: () => Boolean(getToken()),
    config: () => request('/auth/config'),
    login: (email, password, token) =>
      authenticate('login', email, password, token),
    register: (email, password, token) =>
      authenticate('register', email, password, token)
  };
})();
