/* globals background */
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
      let iframes = Array.from(document.querySelectorAll('iframe'));
      let index = iframes.map(f => f.contentWindow).indexOf(e.source);
      if (index !== -1) {
        ev.event.clientX += iframes[index].offsetLeft - window.scrollX;
        ev.event.clientY += iframes[index].offsetTop - window.scrollY;
        window.parent.postMessage(ev, '*');
      }
    }
  }
}, false);

// pointer
var pointer = (function () {
  var offset = {
    x: 0,
    y: 0
  };
  var div, timer;
  return {
    load: function () {
      div = document.createElement('div');
      div.setAttribute('class', 'itanywhere-activator');
      div.setAttribute('title', 'Google Translator Anywhere');
      div.addEventListener('animationend', function () {
        div.classList.remove('bounceIn');
      });
      div.addEventListener('click', post.show, false);
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
      left += offset.x;
      top += offset.y;
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
    is: function (e) {
      return e.target === div;
    },
    config: (obj) => {
      offset.x = obj.x;
      offset.y = obj.y;
    }
  };
})();

// mouse
var mouse = (function () {
  function getSelection (e) {
    var selection = window.getSelection();
    var tmp = selection.toString();
    if (tmp) {
      return tmp.trim();
    }
    var target = e.target;
    try { // input type button does not support selection
      if (target.value && !isNaN(target.selectionStart) && !isNaN(target.selectionEnd)) {
        return target.value.substring(target.selectionStart, target.selectionEnd).trim();
      }
    }
    catch (e) {}
  }
  var click = (function () {
    var id;
    return function (e) {
      window.clearTimeout(id);
      id = window.setTimeout(function () {
        var selected = getSelection(e);
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
background.receive('offset', pointer.config);
background.send('offset');

// detach
background.receive('detach', function () {
  mouse.unload();
  pointer.unload();
});
