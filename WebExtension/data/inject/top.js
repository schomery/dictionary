'use strict';

var prefs = {
  engine: 0,
  width: 400,
  mheight: 600,
  hash: '#auto/en'
};

function getURL(phrase) {
  const engine = String(prefs.engine) === '0' ? 'https://translate.google.com/' : 'https://translate.google.cn/';
  return engine + 'm/translate' + prefs.hash + '/' + encodeURIComponent(phrase);
}

// panel
var panel = (function() {
  let iframe;
  let div;
  let resize = true;
  chrome.runtime.onMessage.addListener(request => {
    if (request.method === 'resize' && resize) {
      let height = request.height;
      if (prefs.mheight) {
        height = Math.min(height, prefs.mheight);
      }
      if (iframe) {
        div.style.height = Math.max(300, Math.min(
            document.documentElement.clientHeight + document.documentElement.scrollTop
            - parseInt(div.style.top) - 60,
            height
        )) + 'px';
      }
    }
    else if (request.method === 'loaded') {
      iframe.classList.remove('itanywhere-loading');
    }
    else if (request.method === 'hide-panel') {
      panel.hide();
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
      iframe = Object.assign(document.createElement('iframe'), {
        src: 'about:blank'
      });
      iframe.classList.add('itanywhere-loading');
      div = Object.assign(document.createElement('div'), {
        style: `width: ${prefs.width}px; height: 500px;`
      });
      div.classList.add('itanywhere-panel');
      div.appendChild(iframe);

      const tools = document.createElement('div');
      tools.classList.add('itanywhere-link');
      tools.appendChild(document.createTextNode('Open in:'));
      const translate = document.createElement('a');
      translate.textContent = 'Google Translate';
      translate.href = '#';
      translate.addEventListener('click', function() {
        chrome.runtime.sendMessage({
          method: 'open',
          url: getURL(panel.phrase).replace('/m/', '/')
        }, () => panel.hide());
      });
      const define = document.createElement('a');
      define.textContent = 'Google Search';
      define.href = '#';
      define.addEventListener('click', function() {
        chrome.runtime.sendMessage({
          method: 'open',
          url: 'https://www.google.com/search?q=define ' + encodeURIComponent(panel.phrase)
        }, () => panel.hide());
      });
      tools.appendChild(translate);
      tools.appendChild(define);
      div.appendChild(tools);

      div.addEventListener('mousedown', e => {
        if (e.target === div) {
          resize = false;
        }
      });

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
      // iframe.scrollIntoView({
      //   block: 'start',
      //   behavior: 'smooth'
      // });
    },
    hide: function() {
      if (iframe) {
        div.remove();
        iframe = null;
        div = null;
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
