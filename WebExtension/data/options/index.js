'use strict';

var log = document.getElementById('status');
var isOpera = navigator.userAgent.indexOf('OPR') !== -1;

function restore() {
  chrome.storage.local.get({
    'width': 400,
    'mheight': 600,
    'scale': 1.0,
    'offset-x': isOpera ? 10 : 0,
    'offset-y': isOpera ? 20 : 0,
    'engine': 0,
    'use-pointer': true,
    'google-page': true,
    'bing-page': false,
    'faqs': true,
    'hash': '#auto/en',
    'frame-styles': '',
    'translate-styles': ''
  }, prefs => {
    document.getElementById('width').value = prefs.width;
    document.getElementById('mheight').value = prefs.mheight;
    document.getElementById('scale').value = prefs.scale;
    document.getElementById('offset-x').value = prefs['offset-x'];
    document.getElementById('offset-y').value = prefs['offset-y'];
    document.getElementById('engine').selectedIndex = prefs.engine;
    document.getElementById('google-page').checked = prefs['google-page'];
    document.getElementById('bing-page').checked = prefs['bing-page'];
    document.getElementById('faqs').checked = prefs.faqs;
    if (prefs['use-pointer']) {
      document.getElementById('use-pointer').checked = true;
    }
    else {
      document.getElementById('use-selection').checked = true;
    }
    document.getElementById('langFrom').value = prefs.hash.substr(1).split('/')[0];
    document.getElementById('langTo').value = prefs.hash.substr(1).split('/')[1];
    document.getElementById('frame-styles').value = prefs['frame-styles'];
    document.getElementById('translate-styles').value = prefs['translate-styles'];
  });
}

function save() {
  const prefs = {
    'width': Math.min(Math.max(Number(document.getElementById('width').value), 300), 2000),
    'mheight': Number(document.getElementById('mheight').value),
    'scale': Math.min(Math.max(parseFloat(document.getElementById('scale').value), 0.5), 1.0),
    'offset-x': Number(document.getElementById('offset-x').value),
    'offset-y': Number(document.getElementById('offset-y').value),
    'engine': document.getElementById('engine').selectedIndex,
    'use-pointer': document.getElementById('use-pointer').checked,
    'google-page': document.getElementById('google-page').checked,
    'bing-page': document.getElementById('bing-page').checked,
    'faqs': document.getElementById('faqs').checked,
    'hash': '#' + document.getElementById('langFrom').value + '/' + document.getElementById('langTo').value,
    'frame-styles': document.getElementById('frame-styles').value,
    'translate-styles': document.getElementById('translate-styles').value
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
  const google = prefs['google-page'];
  if (google) {
    if (google.newValue) {
      chrome.contextMenus.create({
        id: 'open-google',
        title: 'Translate with Google',
        contexts: ['page', 'link'],
        documentUrlPatterns: ['*://*/*']
      });
    }
    else {
      chrome.contextMenus.remove('open-google');
    }
  }
  const bing = prefs['bing-page'];
  if (bing) {
    if (bing.newValue) {
      chrome.contextMenus.create({
        id: 'open-bing',
        title: 'Translate with Bing',
        contexts: ['page', 'link'],
        documentUrlPatterns: ['*://*/*']
      });
    }
    else {
      chrome.contextMenus.remove('open-bing');
    }
  }
});

// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    log.textContent = 'Double-click to reset!';
    window.setTimeout(() => log.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
