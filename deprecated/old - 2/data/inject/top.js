'use strict';

var prefs = {
  'domain': 'com',
  'width': 400,
  'mheight': 600,
  'hash': '#auto/en',
  'frame-styles': ''
};

function getURL(phrase) {
  const engine = 'https://translate.google.' + prefs.domain + '/';
  const [sl, tl] = prefs.hash.substr(1).split('/');
  return chrome.runtime.getURL('/data/iframe/index.html?rd=') +
    encodeURIComponent(engine + `?sl=${sl}&tl=${tl}&q=${encodeURIComponent(phrase)}`);
}

// panel
var panel = (function() {
  let iframe;
  let div;
  let style;
  let resize = true;
  chrome.runtime.onMessage.addListener(request => {
    if (request.method === 'resize' && resize) {
      let height = request.height;
      if (prefs.mheight) {
        height = Math.min(height, prefs.mheight);
      }
      if (iframe) {
        div.style.height = Math.max(400, Math.min(
          document.documentElement.clientHeight + (document.documentElement.scrollTop || document.body.scrollTop)
          - parseInt(div.style.top) - 60,
          height
        )) + 'px';
      }
    }
    else if (request.method === 'hide-panel') {
      panel.hide();
    }
    else if (request.method === 'disable-auto-resizing') {
      resize = false;
    }
  });
  return {
    phrase: null,
    onhash: () => {
      if (iframe) {
        iframe.src = getURL(panel.phrase);
      }
    },
    load: function() {
      div = Object.assign(document.createElement('div'), {
        style: `width: ${prefs.width}px; height: 500px;`
      });
      div.classList.add('itanywhere-panel');
      iframe = Object.assign(document.createElement('iframe'), {
        src: 'about:blank'
      });
      style = document.createElement('style');
      style.textContent = prefs['frame-styles'];

      div.appendChild(style);
      div.appendChild(iframe);
      document.body.appendChild(div);
    },
    show: function(e) {
      if (!iframe) {
        panel.load();
      }
      let left = e.clientX + window.scrollX;
      if (left + prefs.width > window.scrollX + window.innerWidth) {
        left = window.scrollX + window.innerWidth - prefs.width - 30;
        left = Math.max(left, 0);
      }
      div.style.left = left + 'px';
      let top = e.clientY + window.scrollY;
      if (top + 200 > window.scrollY + window.innerHeight) {
        top = window.scrollY + window.innerHeight - 200;
        top = Math.max(top, 0);
      }
      div.style.top = top + 'px';
      div.style.display = 'flex';
      iframe.src = getURL(panel.phrase.substr(0, 2000));
    },
    hide: function() {
      if (iframe) {
        div.remove();
        iframe = null;
        div = null;
        style = null;
      }
    },
    width: function() {
      if (iframe) {
        iframe.style.width = `${prefs.width}px`;
      }
    }
  };
})();

window.addEventListener('message', e => {
  if (e.data) {
    if (e.source === e.target && e.data.cmd === 'idanywhere-show') {
      panel.show(e.data.event);
    }
    else if (e.data.cmd === 'idanywhere-phrase') {
      panel.phrase = e.data.phrase;
    }
    // https://github.com/schomery/dictionary/issues/16
    if (e.data.cmd && e.data.cmd.startsWith('idanywhere-')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
}, false);

/* prefs */
chrome.storage.local.get(prefs, ps => Object.assign(prefs, ps));
chrome.storage.onChanged.addListener(ps => {
  Object.entries(ps).forEach(([key, value]) => {
    prefs[key] = value.newValue;
  });
  if (ps.hash) {
    panel.onhash();
  }
  if (ps.width) {
    panel.width();
  }
});
