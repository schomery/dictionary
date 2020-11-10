'use strict';

const position = {
  x: 0,
  y: 0,
  sx: 0,
  sy: 0
};

const key = {
  altKey: false
};

const pointer = {
  delay: 300, // ms
  timeout: 3000, // ms
  'lazy-show'(o) {
    clearTimeout(pointer.id);
    pointer.id = setTimeout(pointer.show, pointer.delay, o);
  },
  show(o) {
    pointer.hide();

    const div = pointer.div = document.createElement('div');
    chrome.storage.local.get({
      'offset-x': 0,
      'offset-y': 0
    }, prefs => {
      const range = o.selection.getRangeAt(0);
      const rect = [...range.getClientRects()].pop();
      if (rect) {
        div.style.left = (rect.right - 25 + prefs['offset-y']) + 'px';
        div.style.top = (rect.top - 25 + prefs['offset-x']) + 'px';
      }
      else {
        div.style.left = (position.x - 25 + prefs['offset-x']) + 'px';
        div.style.top = (position.y - 25 + prefs['offset-y']) + 'px';
      }
      div.classList.add('itanywhere-activator');
      div.onclick = () => chrome.runtime.sendMessage({
        method: 'open-translator',
        query: o.value
      });
      document.body.appendChild(div);
      clearTimeout(pointer.rid);
      pointer.rid = setTimeout(pointer.hide, pointer.timeout);
    });
  },
  hide() {
    if (pointer.div) {
      pointer.div.remove();
      delete pointer.div;
    }
  }
};

function select() {
  const selection = getSelection();

  return {
    selection,
    value: selection.toString().trim()
  };
}

document.addEventListener('selectionchange', () => {
  const o = select();
  if (o.value) {
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
    // hide with delay to let the div accept click event
    setTimeout(pointer.hide, 100);
  }
});

document.addEventListener('mousedown', e => {
  position.x = e.clientX;
  position.y = e.clientY;
  position.sx = e.screenX;
  position.sy = e.screenY;
});
document.addEventListener('keydown', e => {
  key.altKey = e.altKey;
});
document.addEventListener('keyup', () => {
  key.altKey = false;
});

window.addEventListener('scroll', () => pointer.hide());
