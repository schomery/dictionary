'use strict';

const toast = document.getElementById('toast');

function restore() {
  chrome.storage.local.get({
    'width': 400,
    'mheight': 600,
    'scale': 1.0,
    'offset-x': 0,
    'offset-y': 0,
    'domain': 'com',
    'use-pointer': true,
    'force-inside': true,
    'direct-frame': false,
    'google-page': true,
    'bing-page': false,
    'reuse-page': true,
    'default-action': 'open-google',
    'faqs': true,
    'translate-styles': '',
    'hide-translator': true,
    'google-extra': '',
    'bing-extra': 'from=&to=fr'
  }, prefs => {
    document.getElementById('force-inside').checked = prefs['force-inside'];
    document.getElementById('width').value = prefs.width;
    document.getElementById('mheight').value = prefs.mheight;
    document.getElementById('scale').value = prefs.scale;
    document.getElementById('offset-x').value = prefs['offset-x'];
    document.getElementById('offset-y').value = prefs['offset-y'];
    document.getElementById('domain').value = prefs.domain;
    document.getElementById('google-page').checked = prefs['google-page'];
    document.getElementById('bing-page').checked = prefs['bing-page'];
    document.getElementById('reuse-page').checked = prefs['reuse-page'];
    document.getElementById('default-action').value = prefs['default-action'];
    document.getElementById('faqs').checked = prefs.faqs;
    document.getElementById('hide-translator').checked = prefs['hide-translator'];
    document.getElementById('google-extra').value = prefs['google-extra'];
    document.getElementById('bing-extra').value = prefs['bing-extra'];
    if (prefs['use-pointer'] && prefs['direct-frame'] === false) {
      document.getElementById('use-pointer').checked = true;
    }
    else if (prefs['direct-frame']) {
      document.getElementById('use-direct').checked = true;
    }
    else {
      document.getElementById('use-selection').checked = true;
    }
    document.getElementById('translate-styles').value = prefs['translate-styles'];
  });
}

function save() {
  const prefs = {
    'force-inside': document.getElementById('force-inside').checked,
    'width': Math.min(Math.max(Number(document.getElementById('width').value), 300), 2000),
    'mheight': Number(document.getElementById('mheight').value),
    'scale': Math.min(Math.max(parseFloat(document.getElementById('scale').value), 0.5), 1.0),
    'offset-x': Number(document.getElementById('offset-x').value),
    'offset-y': Number(document.getElementById('offset-y').value),
    'domain': document.getElementById('domain').value,
    'use-pointer': document.getElementById('use-pointer').checked,
    'direct-frame': document.getElementById('use-direct').checked,
    'google-page': document.getElementById('google-page').checked,
    'bing-page': document.getElementById('bing-page').checked,
    'reuse-page': document.getElementById('reuse-page').checked,
    'default-action': document.getElementById('default-action').value,
    'faqs': document.getElementById('faqs').checked,
    'translate-styles': document.getElementById('translate-styles').value,
    'hide-translator': document.getElementById('hide-translator').checked,
    'google-extra': document.getElementById('google-extra').value,
    'bing-extra': document.getElementById('bing-extra').value
  };

  chrome.storage.local.set(prefs, () => {
    toast.textContent = 'Options saved.';
    setTimeout(() => toast.textContent = '', 750);
    restore();
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', () => {
  try {
    save();
  }
  catch (e) {
    toast.textContent = e.message;
    setTimeout(() => toast.textContent = '', 750);
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
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
