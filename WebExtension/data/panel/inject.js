'use strict';

document.addEventListener('DOMContentLoaded', () => {
  let index = 0; // do not allow infinite hash changes
  window.addEventListener('hashchange', () => {
    let hash = '';
    const part = location.hash.split('/');
    if (part.length === 3 && part[0][0] === '#') {
      hash = part[0] + '/' + part[1];
    }
    else if (location.hash[0] === '#' && location.hash.indexOf('&') !== -1) {
      try {
        const args = new URLSearchParams(location.hash);
        if (args.get('sl') && args.get('tl')) {
          hash = '#' + args.get('sl') + '/' + args.get('tl');
        }
      }
      catch (e) {}
    }
    if (hash && index < 10) {
      index += 1;
      chrome.storage.local.get({
        'hash': '#auto/en'
      }, prefs => {
        if (prefs.hash !== hash) {
          chrome.storage.local.set({hash});
        }
      });
    }
  });
  // hide translation section if definition section is not empty
  const define = document.querySelector('.gt-cd-mmd .gt-cd-c');
  if (define) {
    const observer = new MutationObserver(() => {
      observer.disconnect();
      chrome.storage.local.get({
        'hide-translator': true
      }, prefs => {
        if (prefs['hide-translator']) {
          document.body.dataset.hideTranslation = true;
        }
      });
    });
    observer.observe(define, {
      subtree: true,
      childList: true
    });
  }
});

if (window.top !== window) { // only in frames
  window.addEventListener('scroll', () => window.scrollTo(0, 0));
  // styling
  document.documentElement.appendChild(Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: chrome.runtime.getURL('/data/panel/inject.css')
  }));
  // scaling
  const scale = value => {
    if (value < 1.0) {
      document.documentElement.style.transform = `scale(${value})`;
      document.documentElement.style['transform-origin'] = '0 0';
      document.documentElement.style.width = `${1 / value * 100}%`;
    }
  };
  // styling
  const style = value => {
    const e = style.e || document.createElement('style');
    e.textContent = value;
    document.documentElement.appendChild(e);
    style.e = e;
  };
  chrome.storage.local.get({
    'scale': 1.0,
    'translate-styles': ''
  }, prefs => {
    scale(prefs.scale);
    style(prefs['translate-styles']);
  });
  chrome.storage.onChanged.addListener(prefs => {
    if (prefs.scale) {
      scale(prefs.scale.newValue);
    }
    if (prefs['translate-styles']) {
      style(prefs['translate-styles'].newValue);
    }
  });

  let oldHieght = 0;
  const resize = () => {
    let height = 0;
    const content = document.querySelector('.homepage-content-wrap');
    if (content) {
      height = content.scrollHeight + 100;
    }
    if (height === 0) {
      const content = document.querySelector('.language_list_languages');
      if (content) {
        height = content.scrollHeight;
      }
    }
    if (height === 0) {
      const source = document.querySelector('.tlid-source-target');
      const result = document.querySelector('.tlid-result-view');
      if (source && result) {
        height = source.getBoundingClientRect().height + result.getBoundingClientRect().height;
      }
    }
    if (height && height !== oldHieght) {
      oldHieght = height;
      chrome.runtime.sendMessage({
        method: 'resize',
        height: Math.max(400, height)
      });
    }
  };
  window.addEventListener('resize', resize);

  document.addEventListener('DOMContentLoaded', function() {
    let id;
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => {
        window.clearTimeout(id);
        id = window.setTimeout(resize, 500);
      });
      ro.observe(document.body);
    }
    else {
      const observer = new MutationObserver(() => {
        window.clearTimeout(id);
        id = window.setTimeout(resize, 500);
      });
      observer.observe(document.body, {
        attributes: false,
        childList: true,
        characterData: false,
        subtree: true
      });
    }

    // preventing panel from prompting alert or confirm; this needs to be injected to the unwrapped window object to
    // let overwrite alert and confirm functions
    const script = document.createElement('script');
    script.textContent = 'window.alert = window.confirm = function() {return true;}';
    document.body.appendChild(script);
  });
}
