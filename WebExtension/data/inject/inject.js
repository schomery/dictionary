'use strict';

// http://www.w3schools.com/html/exercise.asp?filename=exercise_iframe2
var post = {
  hide: () => window.top.postMessage({
    cmd: 'idanywhere-hide'
  }, '*'),
  show: (e) => window.parent.postMessage({
    cmd: 'idanywhere-show',
    event: {
      clientX: e.clientX,
      clientY: e.clientY
    }
  }, '*'),
  phrase: (p) => window.top.postMessage({
    cmd: 'idanywhere-phrase',
    phrase: p
  }, '*')
};

var isOpera = navigator.userAgent.indexOf('OPR') !== -1;
var prefs = {
  'offset-x': isOpera ? 10 : 0,
  'offset-y': isOpera ? 20 : 0,
};

window.addEventListener('message', e => {
  if (e.data && e.data.cmd === 'idanywhere-show') {
    if (e.source !== e.target) {
      let ev = {
        cmd: 'idanywhere-show',
        event: {
          clientX: e.data.event.clientX,
          clientY: e.data.event.clientY
        }
      };
      let iframes = [...document.querySelectorAll('iframe')];
      let index = iframes.map(f => f.contentWindow).indexOf(e.source);
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
var pointer = (function () {
  let div, timer;
  return {
    load: function () {
      div = Object.assign(document.createElement('div'), {
        'title': 'Google Translator Anywhere',
        'onanimationend': () => div.classList.remove('bounceIn'),
        'onclick': post.show
      });
      div.classList.add('itanywhere-activator');
      document.body.appendChild(div);
    },
    unload: function () {
      if (div && div.parentNode) {
        div.parentNode.removeChild(div);
      }
      window.clearTimeout(timer);
    },
    move: function (left, top) {
      if (!div) {
        pointer.load();
      }
      left += +prefs['offset-x'];
      top += +prefs['offset-y'];
      Object.assign(div.style, {
        left: Math.max(left, 0) + 'px',
        top: Math.max(top, 0) + 'px',
        display: 'block'
      });
      div.classList.add('bounceIn');
      //hide pointer after 3 seconds
      window.clearTimeout(timer);
      timer = window.setTimeout(pointer.hide, 3000);
    },
    hide: function () {
      if (div) {
        div.style.display = 'none';
      }
    },
    is: (e) => e.target === div
  };
})();

// mouse
var mouse = (function () {
  function getSelection (e) {
    const selection = window.getSelection();
    let tmp = selection.toString();
    if (tmp) {
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
  let click = (function () {
    let id;
    return function (e) {
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
      id = window.setTimeout(function () {
        const selected = getSelection(e);
        if (selected) {
          pointer.move(e.clientX + window.scrollX + 3, e.clientY + window.scrollY - 40);
          post.phrase(selected);
        }
        else {
          pointer.hide();
        }
        if (!pointer.is(e)) {
          post.hide();
        }
      }, 100);
    };
  })();

  return {
    load: function () {
      document.addEventListener('mouseup', click, false);
      document.addEventListener('keyup', click, false);
    },
    unload: function () {
      try {
        document.removeEventListener('mouseup', click);
        document.removeEventListener('keyup', click);
      }
      catch (e) {}
    }
  };
})();

//attach
var init = () => {
  document.removeEventListener('DOMContentLoaded', init);
  mouse.load();
};
document.addEventListener('DOMContentLoaded', init, false);
if (document.readyState !== 'loading') {
  init();
}

/* prefs */
chrome.storage.local.get(prefs, ps => prefs = Object.assign(prefs, ps));
chrome.storage.onChanged.addListener(ps => {
  Object.entries(ps).forEach(([key, value]) => {
    prefs[key] = value.newValue;
  });
});
