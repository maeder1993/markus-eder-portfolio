(() => {
  'use strict';

  const publicHost = 'maeder1993.github.io';
  const publicPath = '/markus-eder-portfolio/';
  const preferenceKey = 'markus-portfolio-analytics-disabled';
  const configuration = document.getElementById('portfolio-analytics');
  const controls = document.getElementById('analytics-controls');
  const status = document.getElementById('analytics-status');
  const toggle = document.getElementById('analytics-toggle');
  if (!configuration || !controls || !status || !toggle) return;

  const websiteId = configuration.dataset.websiteId || '';
  const trackerSource = configuration.dataset.trackerSrc || '';
  const configured = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(websiteId)
    && trackerSource === 'https://cloud.umami.is/script.js';
  const isPublicSite = location.protocol === 'https:' && location.hostname === publicHost
    && [publicPath, publicPath + 'index.html'].includes(location.pathname);
  let disabled = false;
  let storageAvailable = true;
  let trackerRequested = false;
  let trackerReady = false;
  let trackerFailed = false;
  let pageviewSent = false;

  function readPreference() {
    try {
      disabled = localStorage.getItem(preferenceKey) === 'true';
    } catch {
      storageAvailable = false;
      disabled = true;
    }
  }

  function browserRequestsPrivacy() {
    return navigator.globalPrivacyControl === true
      || [navigator.doNotTrack, window.doNotTrack].some(value => value === '1' || value === 'yes');
  }

  function mayTrack() {
    readPreference();
    return configured && isPublicSite && storageAvailable && !disabled && !browserRequestsPrivacy();
  }

  function updateControls() {
    controls.hidden = false;
    toggle.hidden = true;
    if (!isPublicSite) status.textContent = 'Analytics are off in this local preview.';
    else if (!configured) status.textContent = 'Analytics are not enabled on this website.';
    else if (browserRequestsPrivacy()) status.textContent = 'Analytics are off because your browser requests tracking protection.';
    else if (!storageAvailable) status.textContent = 'Analytics are off because this browser cannot read or save your preference.';
    else {
      toggle.hidden = false;
      toggle.textContent = disabled ? 'Turn analytics on in this browser' : 'Turn analytics off in this browser';
      status.textContent = disabled ? 'Analytics are off in this browser.'
        : trackerFailed ? 'Analytics could not load. The website works normally.'
          : 'Anonymous visit and click counts are enabled in this browser.';
    }
  }

  function referralOrigin() {
    try {
      const source = new URL(document.referrer);
      return ['https:', 'http:'].includes(source.protocol) && source.hostname !== publicHost
        ? source.origin : '';
    } catch {
      return '';
    }
  }

  function pagePayload() {
    // Explicit fields prevent queries, fragments and provider defaults leaking into events.
    return {
      website: websiteId,
      hostname: publicHost,
      url: publicPath,
      title: 'Markus Eder | Research & Scientific Workflows',
      referrer: referralOrigin(),
      language: (navigator.language || '').slice(0, 35),
    };
  }

  function send(payload) {
    if (!mayTrack() || !trackerReady || typeof window.umami?.track !== 'function') return;
    try {
      const result = window.umami.track(payload);
      // An unavailable analytics endpoint must never interfere with the portfolio.
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch { /* Navigation and downloads remain independent of analytics. */ }
  }

  function sendPageview() {
    if (pageviewSent || !mayTrack() || !trackerReady) return;
    pageviewSent = true;
    send(pagePayload());
  }

  const eventValues = {
    'cv-click': new Set(['header', 'hero', 'contact']),
    'contact-click': new Set(['email', 'linkedin']),
    'project-open': new Set(['coffee-characterization', 'methanolysis-gc', 'python-reporting', 'ai-lab-tools']),
  };

  function sendEvent(name, value) {
    if (!eventValues[name]?.has(value)) return;
    const property = name === 'cv-click' ? 'placement' : name === 'contact-click' ? 'channel' : 'project';
    send({ ...pagePayload(), name, data: { [property]: value } });
  }

  function loadTracker() {
    if (!mayTrack() || trackerRequested) return;
    trackerRequested = true;
    const tracker = document.createElement('script');
    tracker.src = trackerSource;
    tracker.async = true;
    tracker.referrerPolicy = 'no-referrer';
    tracker.setAttribute('data-website-id', websiteId);
    tracker.setAttribute('data-domains', publicHost);
    tracker.setAttribute('data-auto-track', 'false');
    tracker.setAttribute('data-do-not-track', 'true');
    tracker.setAttribute('data-exclude-search', 'true');
    tracker.setAttribute('data-exclude-hash', 'true');
    tracker.addEventListener('load', () => {
      trackerReady = typeof window.umami?.track === 'function';
      trackerFailed = !trackerReady;
      sendPageview();
      updateControls();
    }, { once: true });
    tracker.addEventListener('error', () => {
      trackerFailed = true;
      updateControls();
    }, { once: true });
    document.head.appendChild(tracker);
  }

  document.querySelectorAll('[data-analytics-cv]').forEach(link => {
    link.addEventListener('click', () => sendEvent('cv-click', link.dataset.analyticsCv));
  });
  document.querySelectorAll('[data-analytics-contact]').forEach(link => {
    link.addEventListener('click', () => sendEvent('contact-click', link.dataset.analyticsContact));
  });
  document.querySelectorAll('[data-analytics-project]').forEach(disclosure => {
    disclosure.addEventListener('toggle', () => {
      if (disclosure.open) sendEvent('project-open', disclosure.dataset.analyticsProject);
    });
  });

  toggle.addEventListener('click', () => {
    const nextDisabled = !disabled;
    try {
      localStorage.setItem(preferenceKey, String(nextDisabled));
      disabled = nextDisabled;
    } catch {
      storageAvailable = false;
      disabled = true;
    }
    updateControls();
    loadTracker();
    sendPageview();
  });
  // Apply choices made in another portfolio tab without waiting for a reload.
  window.addEventListener('storage', event => {
    if (event.key !== preferenceKey && event.key !== null) return;
    readPreference();
    updateControls();
    loadTracker();
    sendPageview();
  });

  readPreference();
  updateControls();
  loadTracker();
})();
