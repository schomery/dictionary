'use strict';

var log = document.getElementById('status');
var isOpera = navigator.userAgent.indexOf('OPR') !== -1;

function restore () {
  chrome.storage.local.get({
    'width': 400,
    'offset-x': isOpera ? 10 : 0,
    'offset-y': isOpera ? 20 : 0,
    'engine': 0,
    'show': true
  }, (prefs) => {
    document.getElementById('width').value = prefs.width;
    document.getElementById('offset-x').value = prefs['offset-x'];
    document.getElementById('offset-y').value = prefs['offset-y'];
    document.getElementById('engine').selectedIndex = prefs.engine;
    document.getElementById('show').checked = prefs.show;
  });
}

function save() {
  let prefs = {
    'width': Math.min(Math.max(document.getElementById('width').value, 200), 600),
    'offset-x': +document.getElementById('offset-x').value,
    'offset-y': +document.getElementById('offset-y').value,
    'engine': document.getElementById('engine').selectedIndex,
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
