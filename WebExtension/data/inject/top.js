'use strict';

var prefs = {
  engine: 0,
  width: 400,
  mheight: 0,
  hash: '#auto/en'
};

function getURL (phrase) {
  const engine = prefs.engine + '' === '0' ? 'https://translate.google.com/' : 'https://translate.google.cn/';
  return engine + 'm/translate' + prefs.hash + '/' + encodeURIComponent(phrase);
}

// panel
var panel = (function () {
  let iframe;
  chrome.runtime.onMessage.addListener(request => {
    if (request.method === 'resize') {
      let height = request.height;
      if (prefs.mheight) {
        height = Math.max(height, prefs.mheight);
      }
      if (iframe) {
        iframe.style.height = height;
      }
    }
    else if (request.method === 'loaded') {
      iframe.classList.remove('itanywhere-loading');
    }
  });
  return {
    phrase: null,
    onhash: () => {
      if (iframe) {
        iframe.src = getURL(panel.phrase);
      }
    },
    load: function () {
      iframe = Object.assign(document.createElement('iframe'), {
        style: `width: ${prefs.width}px; height: 500px;`,
        src: 'about:blank'
      });
      iframe.classList.add('itanywhere-panel', 'itanywhere-loading');
      document.body.appendChild(iframe);
    },
    unload: function () {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    },
    show: function (e) {
      if (!iframe) {
        panel.load();
      }
      let left = e.clientX + window.scrollX;
      if (left + prefs.width > window.scrollX + window.innerWidth) {
        left = window.scrollX + window.innerWidth - prefs.width - 30;
        left = Math.max(left, 0);
      }
      iframe.style.left = left + 'px';
      let top = e.clientY + window.scrollY;
      if (top + 200 > window.scrollY + window.innerHeight) {
        top = window.scrollY + window.innerHeight - 200;
        top = Math.max(top, 0);
      }
      iframe.style.top = top + 'px';
      iframe.style.display = 'block';
      iframe.src = getURL(panel.phrase.substr(0, 2000));
      /*iframe.scrollIntoView({
        block: 'start',
        behavior: 'smooth'
      });*/
    },
    hide: function () {
      if (iframe) {
        iframe.style.display = 'none';
        iframe.style.height = '300px';
      }
    },
    width: function () {
      if (iframe) {
        iframe.style.width = `${prefs.width}px`;
      }
    }
  };
})();

window.addEventListener('message', e => {
  if (e.data) {
    if (e.data.cmd === 'idanywhere-hide') {
      panel.hide();
    }
    else if (e.source === e.target && e.data.cmd === 'idanywhere-show') {
      panel.show(e.data.event);
    }
    else if (e.data.cmd === 'idanywhere-phrase') {
      panel.phrase = e.data.phrase;
    }
    else if (
      e.data.cmd === 'idanywhere-open-translate' ||
      e.data.cmd === 'idanywhere-open-define'
    ) {
      const url = e.data.cmd === 'idanywhere-open-translate' ?
        getURL(panel.phrase).replace('/m/', '/') :
        'https://www.google.com/search?q=define ' + encodeURIComponent(panel.phrase);
      chrome.runtime.sendMessage({
        method: 'open',
        url
      });
    }
    // https://github.com/schomery/dictionary/issues/16
    if (e.data.cmd && e.data.cmd.startsWith('idanywhere-')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
}, false);

/* prefs */
chrome.storage.local.get(prefs, ps => prefs = Object.assign(prefs, ps));
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
