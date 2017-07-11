'use strict';

const isFirefox = /Firefox/.test(navigator.userAgent);

/* bounce */
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.method === 'loaded' || request.method === 'resize') {
    chrome.tabs.sendMessage(sender.tab.id, request);
  }
  else if (request.method === 'open') {
    chrome.tabs.create({
      url: request.url
    });
  }
});

/* context menu */
(function (callback) {
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
})(function () {
  chrome.contextMenus.create({
    id: 'open-google',
    title: 'Translate Page (Google)',
    contexts: ['page', 'link'],
    documentUrlPatterns: ['*://*/*']
  });
  chrome.contextMenus.create({
    id: 'open-bing',
    title: 'Translate Page (Bing)',
    contexts: ['page', 'link'],
    documentUrlPatterns: ['*://*/*']
  });
});

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'open-current') {
    open(info.linkUrl || info.pageUrl);
  }

  chrome.storage.local.get({
    engine: 0,
    hash: '#auto/en'
  }, prefs => {
    const [sl, tl] = prefs.hash.replace('#', '').split('/');
    const link = info.linkUrl || info.pageUrl;
    let url = `https://translate.google.${prefs.engine === 1 ? 'cn' : 'com'}/translate` +
      `?hl=en&sl=${sl}&tl=${tl}&u=${encodeURIComponent(link)}`;
    if (info.menuItemId === 'open-bing') {
      url = `http://www.microsofttranslator.com/bv.aspx?from=${sl}&to=${tl}&a=${encodeURIComponent(link)}`;
    }
    chrome.tabs.create({url});
  });
});

// http manipulations
chrome.webRequest.onHeadersReceived.addListener(details => {
    let responseHeaders = details.responseHeaders;
    for (let i = responseHeaders.length - 1; i >= 0; --i) {
      let header = responseHeaders[i].name.toLowerCase();
      if (header === 'x-frame-options' || header === 'frame-options') {
        responseHeaders.splice(i, 1);
      }
    }
    return {responseHeaders};
  },
  {
    urls: [
      '*://translate.google.com/*',
      '*://translate.google.cn/*'
    ],
    types: ['sub_frame']
  },
  ['blocking', 'responseHeaders']
);
chrome.webRequest.onHeadersReceived.addListener(details => {
    let responseHeaders = details.responseHeaders;
    for (let i = responseHeaders.length - 1; i >= 0; --i) {
      const header = responseHeaders[i].name;
      if (header === 'Content-Security-Policy' || header === 'content-security-policy') {
        responseHeaders[i].value = responseHeaders[i].value
          .replace(/frame\-src\s*([^\;]*);/, 'frame-src $1 translate.google.com translate.google.cn;');

        if (isFirefox) {
          responseHeaders[i].value = responseHeaders[i].value
            .replace(/child\-src\s*([^\;]*);/, 'child-src $1 translate.google.com translate.google.cn;')
            .replace(/default\-src\s*([^\;]*);/, 'default-src $1 translate.google.com translate.google.cn;')
            .replace(/script\-src\s*([^\;]*);/, 'script-src $1 translate.google.com translate.google.cn;');
        }
      }
    }
    return {responseHeaders};
  },
  {
    urls: ['<all_urls>'],
    types: ['main_frame']
  },
  ['blocking', 'responseHeaders']
);

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': true
}, prefs => {
  let version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/dictionary.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});
(function () {
  let {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
})();
