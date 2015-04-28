/* globals background */
'use strict';

function html (tag, attrbs, parent) {
  var elem = document.createElement(tag);
  for (var a in attrbs) {
    elem.setAttribute(a, attrbs[a]);
  }
  if (parent) {
    parent.appendChild(elem);
  }
  return elem;
}

// pointer
var pointer = (function () {
  var div;
  return {
    load: function () {
      div = html('div', {
        'class': 'itanywhere-activator',
        'title': 'Google Translator Anywhere'
      }, document.body);
      div.addEventListener('animationend', function () {
        div.classList.remove('bounceIn');
      });
      div.addEventListener('click', panel.show, false);
    },
    unload: function () {
      if (div && div.parentNode) {
        div.parentNode.removeChild(div);
      }
    },
    move: function (left, top) {
      if (!div) {
        pointer.load();
      }
      div.style.left = left + 'px';
      div.style.top = top + 'px';
      div.style.display = 'block';
      div.classList.add('bounceIn');
    },
    hide: function () {
      if (div) {
        div.style.display = 'none';
      }
    }
  };
})();
// panel
var panel = (function () {
  var iframe;
  background.receive('hashchange', function (hash) {
    panel.hash = hash;
  });
  background.receive('resize', function (height) {
    iframe.style.height = height;
  });
  background.receive('loaded', function () {
    iframe.classList.remove('itanywhere-loading');
  });
  return {
    phrase: null,
    hash: manifest.hash || '#auto/en',
    load: function () {
      iframe = html('iframe', {
        'class': 'itanywhere-panel itanywhere-loading'
      }, document.body);
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
  function mouseup (e) {
    var selected = window.getSelection().toString();
    if (selected) {
      pointer.move(e.clientX + 3, e.clientY - 40);
      panel.phrase = selected;
    }
    else {
      pointer.hide();
    }
    panel.hide();
  }

  return {
    load: function () {
      document.addEventListener('mouseup', mouseup, false);
    },
    unload: function () {
      try {
        document.removeEventListener('mouseup', mouseup);
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
