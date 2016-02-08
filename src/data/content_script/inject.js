/* globals background */
'use strict';

// pointer
var pointer = (function () {
  var div, timer;
  return {
    load: function () {
      div = document.createElement('div');
      div.setAttribute('class', 'itanywhere-activator');
      div.setAttribute('title', 'Google Translator Anywhere');
      div.addEventListener('animationend', function () {
        div.classList.remove('bounceIn');
      });
      div.addEventListener('click', panel.show, false);
      document.body.appendChild(div);
    },
    unload: function () {
      if (div && div.parentNode) {
        div.parentNode.removeChild(div);
      }
      if (timer) {
        window.clearTimeout(timer);
      }
    },
    move: function (left, top) {
      if (!div) {
        pointer.load();
      }
      div.style.left = Math.max(left, 0) + 'px';
      div.style.top = Math.max(top, 0) + 'px';
      div.style.display = 'block';
      div.classList.add('bounceIn');
      //hide pointer after 3 seconds
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(pointer.hide, 3000);
    },
    hide: function () {
      if (div) {
        div.style.display = 'none';
      }
    },
    is: function (elem) {
      return elem === div;
    }
  };
})();
// panel
var panel = (function () {
  var iframe;
  background.receive('hashchange', function (hash) {
    panel.hash = hash || panel.hash;
    if (iframe) {
      iframe.src = 'https://translate.google.com/m/translate' + panel.hash + '/' + encodeURIComponent(panel.phrase);
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
      iframe.style.left = (e.clientX + window.scrollX) + 'px';
      iframe.style.top = (e.clientY + window.scrollY) + 'px';
      iframe.style.display = 'block';
      iframe.src = 'https://translate.google.com/m/translate' + panel.hash + '/' + encodeURIComponent(panel.phrase);
    },
    hide: function () {
      if (iframe) {
        iframe.style.display = 'none';
        iframe.style.height = '300px';
      }
    }
  };
})();
// mouse
var mouse = (function () {
  function postMessage (msg, reg) {
    window.postMessage(msg, reg);
    parent.postMessage(msg, reg);
    [].forEach.call(document.querySelectorAll('iframe'), function (iframe) {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(msg, reg);
      }
    });
  }
  function getSelection (e) {
    var selection = window.getSelection();
    var tmp = selection.toString();
    if (tmp) {
      return tmp.trim();
    }
    var target = e.target;
    if (target.value && !isNaN(target.selectionStart) && !isNaN(target.selectionEnd)) {
      return target.value.substring(target.selectionStart, target.selectionEnd).trim();
    }
  }
  var click = (function () {
    var id;
    return function (e) {
      if (id) {
        window.clearTimeout(id);
      }
      id = window.setTimeout(function () {
        var selected = getSelection(e);
        if (selected) {
          pointer.move(e.clientX + window.scrollX + 3, e.clientY + window.scrollY - 40);
          panel.phrase = selected;
        }
        else {
          pointer.hide();
        }
        if (!pointer.is(e.target)) {
          postMessage('idanywhere-hide', '*');
        }
      }, 100);
    };
  })();

  function message (e) {
    if (e.data === 'idanywhere-hide') {
      panel.hide();
    }
  }

  return {
    load: function () {
      document.addEventListener('mouseup', click, false);
      document.addEventListener('keyup', click, false);
      window.addEventListener('message', message, false);
    },
    unload: function () {
      try {
        document.removeEventListener('mouseup', click);
        document.removeEventListener('keyup', click);
        window.removeEventListener('message', message);
      }
      catch (e) {}
    }
  };
})();

//attach
var init = (function () {
  var once = false;
  return function () {
    if (once) {
      return;
    }
    once = true;
    mouse.load();
  };
})();
document.addEventListener('DOMContentLoaded', init, false);
if (document.readyState !== 'loading') {
  init();
}
// detach
background.receive('detach', function () {
  mouse.unload();
  panel.unload();
  pointer.unload();
});
