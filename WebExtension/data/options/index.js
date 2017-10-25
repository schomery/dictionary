'use strict';

var log = document.getElementById('status');
var isOpera = navigator.userAgent.indexOf('OPR') !== -1;

function restore() {
  chrome.storage.local.get({
    'width': 400,
    'scale': 1.0,
    'offset-x': isOpera ? 10 : 0,
    'offset-y': isOpera ? 20 : 0,
    'engine': 0,
    'use-pointer': true,
    'show': true
  }, prefs => {
    document.getElementById('width').value = prefs.width;
    document.getElementById('scale').value = prefs.scale;
    document.getElementById('offset-x').value = prefs['offset-x'];
    document.getElementById('offset-y').value = prefs['offset-y'];
    document.getElementById('engine').selectedIndex = prefs.engine;
    document.getElementById('use-pointer').checked = prefs['use-pointer'];
    document.getElementById('show').checked = prefs.show;
  });
}

function save() {
  const prefs = {
    'width': Math.min(Math.max(Number(document.getElementById('width').value), 200), 600),
    'scale': Math.min(Math.max(parseFloat(document.getElementById('scale').value), 0.5), 1.0),
    'offset-x': Number(document.getElementById('offset-x').value),
    'offset-y': Number(document.getElementById('offset-y').value),
    'engine': document.getElementById('engine').selectedIndex,
    'use-pointer': document.getElementById('use-pointer').checked,
    'show': document.getElementById('show').checked
  };

  chrome.storage.local.set(prefs, () => {
    log.textContent = 'Options saved.';
    setTimeout(() => log.textContent = '', 750);
    restore();
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', () => {
  try {
    save();
  }
  catch (e) {
    log.textContent = e.message;
    setTimeout(() => log.textContent = '', 750);
  }
});

chrome.storage.onChanged.addListener(prefs => {
  const mouse = prefs['use-pointer'];
  if (mouse) {
    console.log(mouse)
    if (mouse.newValue) {
      chrome.contextMenus.remove('open-panel');
    }
    else {
      chrome.contextMenus.create({
        id: 'open-panel',
        title: 'Translate Selection',
        contexts: ['selection'],
        documentUrlPatterns: ['*://*/*']
      });
    }
  }
});
