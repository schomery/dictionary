/* globals panel */
'use strict';

// http://www.w3schools.com/html/exercise.asp?filename=exercise_iframe2
var post = {
  show: e => window.parent.postMessage({
    cmd: 'idanywhere-show',
    event: {
      clientX: e.clientX,
      clientY: e.clientY
    }
  }, '*'),
  phrase: p => window.top.postMessage({
    cmd: 'idanywhere-phrase',
    phrase: p
  }, '*')
};

var isOpera = navigator.userAgent.indexOf('OPR') !== -1;
var sprefs = { // do not get mixed with top.js
  'offset-x': isOpera ? 10 : 0,
  'offset-y': isOpera ? 20 : 0,
  'use-pointer': true
};

var ec;
document.addEventListener('contextmenu', e => ec = e);
chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'open-panel') {
    post.phrase(request.phrase);
    post.show(ec);
  }
});

window.addEventListener('message', e => {
  if (e.data && e.data.cmd === 'idanywhere-show') {
    if (e.source !== e.target) {
      const ev = {
        cmd: 'idanywhere-show',
        event: {
          clientX: e.data.event.clientX,
          clientY: e.data.event.clientY
        }
      };
      const iframes = [...document.querySelectorAll('iframe')];
      const index = iframes.map(f => f.contentWindow).indexOf(e.source);
      if (index !== -1) {
        ev.event.clientX += iframes[index].offsetLeft - window.scrollX;
        ev.event.clientY += iframes[index].offsetTop - window.scrollY;
        window.parent.postMessage(ev, '*');
      }
      // https://github.com/schomery/dictionary/issues/16
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
}, false);

// pointer
var pointer = (function() {
  let div;
  let timer;
  return {
    load: function() {
      div = Object.assign(document.createElement('div'), {
        'title': 'Google Translator Anywhere',
        'onanimationend': () => div.classList.remove('itanywhere-bounceIn'),
        'onclick': e => {
          post.show(e);
          mouse.restore();
        }
      });
      div.classList.add('itanywhere-activator');
      document.documentElement.appendChild(div);
    },
    unload: function() {
      if (div && div.parentNode) {
        div.parentNode.removeChild(div);
      }
      window.clearTimeout(timer);
    },
    move: function(left, top) {
      if (!div) {
        pointer.load();
      }
      left += Number(sprefs['offset-x']);
      top += Number(sprefs['offset-y']);
      Object.assign(div.style, {
        left: Math.max(left, 0) + 'px',
        top: Math.max(top, 0) + 'px',
        display: 'block'
      });
      div.classList.add('itanywhere-bounceIn');
      // hide pointer after 3 seconds
      window.clearTimeout(timer);
      timer = window.setTimeout(pointer.hide, 3000);
    },
    hide: function() {
      if (div) {
        div.style.display = 'none';
      }
    },
    is: e => e.target === div || e.target.classList.contains('itanywhere-panel')
  };
})();

// mouse
var mouse = (function() {
  let range;
  function getSelection(e) {
    const selection = window.getSelection();
    // Check to see if anything inside the e.target element is selected */
    if (window.getSelection().containsNode(e.target, true)) {
      const tmp = selection.toString();
      if (tmp) {
        range = selection.getRangeAt(0);
        return tmp.trim();
      }
      const target = e.target;
      try { // input type button does not support selection
        if (target.value && !isNaN(target.selectionStart) && !isNaN(target.selectionEnd)) {
          return target.value.substring(target.selectionStart, target.selectionEnd).trim();
        }
      }
      catch (e) {}
    }
    else {
      return '';
    }
  }
  const click = (function() {
    let id;
    return function(e) {
      if (e.key && e.key.startsWith('Arrow')) {
        return;
      }
      if (e.key && e.key.startsWith('Page')) {
        return;
      }
      if (e.key && (e.key === 'Home' || e.key === 'End')) {
        return;
      }
      window.clearTimeout(id);
      id = window.setTimeout(function() {
        const selected = getSelection(e);
        if (selected && sprefs['use-pointer']) {
          pointer.move(e.clientX + window.scrollX + 3, e.clientY + window.scrollY - 40);
          post.phrase(selected);
        }
        else {
          pointer.hide();
        }
        if (!pointer.is(e)) {
          if (window.top === window) {
            panel.hide();
          }
          else {
            chrome.runtime.sendMessage({
              method: 'hide-panel'
            });
          }
        }
      }, 100);
    };
  })();

  return {
    load: function() {
      document.addEventListener('mouseup', click, false);
      document.addEventListener('keyup', click, false);
    },
    unload: function() {
      try {
        document.removeEventListener('mouseup', click);
        document.removeEventListener('keyup', click);
      }
      catch (e) {}
    },
    restore: function() {
      if (range) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        range = null;
      }
    }
  };
})();

// attach
var init = () => {
  document.removeEventListener('DOMContentLoaded', init);
  mouse.load();
};
document.addEventListener('DOMContentLoaded', init, false);
if (document.readyState !== 'loading') {
  init();
}

/* prefs */
chrome.storage.local.get(sprefs, ps => Object.assign(sprefs, ps));
chrome.storage.onChanged.addListener(ps => {
  Object.entries(ps).forEach(([key, value]) => {
    sprefs[key] = value.newValue;
  });
});
