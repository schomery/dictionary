'use strict';

const position = {x: 0, y: 0, sx: 0, sy: 0};

const key = {altKey: false};

const pointer = {
  delay: 500, // ms
  timeout: 5000, // ms
  'lazy-show'(o) {
    clearTimeout(pointer.id);
    pointer.id = setTimeout(pointer.show, pointer.delay, o);
  },
  show(o) {
    pointer.hide();

    const div = pointer.div = document.createElement('div');
    div.title = `Click to open Google Translate
Ctrl/Meta + Click to open permanent Google Translate`;
    chrome.storage.local.get({
      'offset-x': 0,
      'offset-y': 0
    }, prefs => {
      const {selection, query} = o;

      const range = selection.getRangeAt(0);
      const rect = [...range.getClientRects()].pop();
      if (rect) {
        div.style.left = (document.documentElement.scrollLeft + rect.right - 25 + prefs['offset-y']) + 'px';
        div.style.top = (document.documentElement.scrollTop + rect.top - 25 + prefs['offset-x']) + 'px';
      }
      else {
        div.style.left = (position.x - 25 + prefs['offset-x']) + 'px';
        div.style.top = (position.y - 25 + prefs['offset-y']) + 'px';
      }
      div.classList.add('itanywhere-activator');

      div.onclick = e => {
        chrome.runtime.sendMessage({
          method: 'open-translator',
          query,
          permanent: e.shiftkey || e.ctrlKey || e.metaKey
        });
      };
      document.documentElement.appendChild(div);
      clearTimeout(pointer.rid);
      pointer.rid = setTimeout(pointer.hide, pointer.timeout);
    });
  },
  hide() {
    for (const div of document.querySelectorAll('.itanywhere-activator')) {
      div.remove();
    }
    delete pointer.div;
  }
};
self.pointer = pointer;

function select() {
  const selection = getSelection();

  return {
    selection,
    query: selection.toString().trim()
  };
}

document.addEventListener('selectionchange', () => {
  const o = select();
  if (o.query) {
    chrome.storage.local.get({
      'use-pointer': true,
      'direct-frame': false
    }, prefs => {
      // show pointer
      if (prefs['use-pointer'] && prefs['direct-frame'] === false) {
        pointer['lazy-show'](o);
      }
      // listen for  Alt/Option key + selection
      else if (prefs['direct-frame']) {
        if (key.altKey) {
          pointer['lazy-show'](o);
        }
      }
    });
  }
  else {
    clearTimeout(pointer.rid);
    pointer.rid = setTimeout(pointer.hide, 200);
  }
});
window.addEventListener('hashchange', () => {
  pointer.hide();
}, false);

document.addEventListener('mousedown', e => {
  position.x = e.clientX;
  position.y = e.clientY;
  position.sx = e.screenX;
  position.sy = e.screenY;
});
document.addEventListener('keydown', e => key.altKey = e.altKey);
document.addEventListener('keyup', () => key.altKey = false);
