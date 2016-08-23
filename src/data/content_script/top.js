/* globals background */
'use strict';

var config = {
  engine: 'https://translate.google.com/',
  width: 500
};

// panel
var panel = (function () {
  var iframe;
  background.receive('hashchange', function (hash) {
    panel.hash = hash || panel.hash;
    if (iframe) {
      iframe.src = config.engine + 'm/translate' + panel.hash + '/' + encodeURIComponent(panel.phrase);
    }
  });
  background.receive('resize', function (height) {
    if (iframe) {
      iframe.style.height = height;
    }
  });
  background.receive('loaded', function () {
    if (iframe) {
      iframe.classList.remove('itanywhere-loading');
    }
  });
  background.send('hashrequest');
  return {
    phrase: null,
    hash: '#auto/en',
    load: function () {
      iframe = document.createElement('iframe');
      iframe.setAttribute('class', 'itanywhere-panel itanywhere-loading');
      iframe.setAttribute('style', `width: ${config.width}px; height: 500px;`);
      iframe.setAttribute('src', 'about:blank');
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
      var left = e.clientX + window.scrollX;
      if (left + config.width > window.scrollX + window.innerWidth) {
        left = window.scrollX + window.innerWidth - config.width - 30;
        left = Math.max(left, 0);
      }
      iframe.style.left = left + 'px';
      var top = e.clientY + window.scrollY;
      if (top + 200 > window.scrollY + window.innerHeight) {
        top = window.scrollY + window.innerHeight - 200;
        top = Math.max(top, 0);
      }
      iframe.style.top = top + 'px';
      iframe.style.display = 'block';
      iframe.src = config.engine + 'm/translate' + panel.hash + '/' + encodeURIComponent(panel.phrase.substr(0, 2000));
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
        iframe.style.width = `${config.width}px`;
      }
    }
  };
})();

(function (message) {
  window.addEventListener('message', message, false);
  background.receive('detach', () => window.removeEventListener('message', message));
})(function (e) {
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
  }
});

background.receive('settings', obj => {
  config.width = obj.width;
  config.engine = obj.engine === 0 ? 'https://translate.google.com/' : 'https://translate.google.cn/';
  panel.width();
});
background.send('settings');

// detach
background.receive('detach', panel.unload);
