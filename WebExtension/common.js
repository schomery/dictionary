'use strict';

/* bounce */
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.method === 'loaded' || request.method === 'resize' || request.method === 'hide-panel') {
    chrome.tabs.sendMessage(sender.tab.id, request, {
      frameId: 0
    });
  }
  else if (request.method === 'open') {
    chrome.tabs.create({
      url: request.url
    });
  }
});

/* context menu */
(callback => {
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
})(() => {
  chrome.storage.local.get({
    'use-pointer': true,
    'google-page': true,
    'bing-page': false
  }, prefs => {
    if (prefs['use-pointer'] === false) {
      chrome.contextMenus.create({
        id: 'open-panel',
        title: 'Translate Selection',
        contexts: ['selection'],
        documentUrlPatterns: ['*://*/*']
      });
    }
    if (prefs['google-page']) {
      chrome.contextMenus.create({
        id: 'open-google',
        title: 'Translate with Google',
        contexts: ['page', 'link'],
        documentUrlPatterns: ['*://*/*']
      });
    }
    if (prefs['bing-page']) {
      chrome.contextMenus.create({
        id: 'open-bing',
        title: 'Translate with Bing',
        contexts: ['page', 'link'],
        documentUrlPatterns: ['*://*/*']
      });
    }
  });
});

var onClicked = (info, tab) => {
  if (info.menuItemId === 'open-panel') {
    chrome.tabs.sendMessage(tab.id, {
      method: 'open-panel',
      phrase: info.selectionText.trim()
    }, {
      frameId: info.frameId
    });
  }
  else {
    chrome.storage.local.get({
      engine: 0,
      hash: '#auto/en'
    }, prefs => {
      const [sl, tl] = prefs.hash.replace('#', '').split('/');
      let link = info.linkUrl || info.pageUrl;
      if (link.startsWith('about:reader?url=')) {
        link = decodeURIComponent(link.replace('about:reader?url=', ''));
      }
      let url = `https://translate.google.${prefs.engine === 1 ? 'cn' : 'com'}/translate` +
        `?hl=en&sl=${sl}&tl=${tl}&u=${encodeURIComponent(link)}`;
      if (info.menuItemId === 'open-bing') {
        url = `http://www.microsofttranslator.com/bv.aspx?from=${sl}&to=${tl}&a=${encodeURIComponent(link)}`;
      }
      chrome.tabs.create({url});
    });
  }
};
chrome.contextMenus.onClicked.addListener(onClicked);
chrome.browserAction.onClicked.addListener(tab => onClicked({
  menuItemId: 'open-google',
  pageUrl: tab.url
}));

// http manipulations
chrome.webRequest.onHeadersReceived.addListener(details => {
  const responseHeaders = details.responseHeaders;
  for (let i = responseHeaders.length - 1; i >= 0; --i) {
    const header = responseHeaders[i].name.toLowerCase();
    if (header === 'x-frame-options' || header === 'frame-options') {
      responseHeaders.splice(i, 1);
    }
  }
  return {responseHeaders};
}, {
  urls: [
    '*://translate.google.com/*',
    '*://translate.google.cn/*'
  ],
  types: ['sub_frame']
}, ['blocking', 'responseHeaders']
);
chrome.webRequest.onHeadersReceived.addListener(details => {
  const responseHeaders = details.responseHeaders;
  for (let i = responseHeaders.length - 1; i >= 0; --i) {
    const header = responseHeaders[i].name;
    if (header === 'Content-Security-Policy' || header === 'content-security-policy') {
      responseHeaders[i].value = responseHeaders[i].value
        .replace(/frame-src\s*([^;]*);/, 'frame-src $1 translate.google.com translate.google.cn;');
    }
  }
  return {responseHeaders};
}, {
  urls: ['<all_urls>'],
  types: ['main_frame']
}, ['blocking', 'responseHeaders']
);

// FAQs & Feedback
chrome.runtime.onInstalled.addListener(() => {
  const {name, version} = chrome.runtime.getManifest();
  const page = chrome.runtime.getManifest().homepage_url;
  chrome.storage.local.get({
    'version': null,
    'faqs': true,
    'last-update': 0
  }, prefs => {
    if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
      const now = Date.now();
      const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
      chrome.storage.local.set({
        version,
        'last-update': doUpdate ? Date.now() : prefs['last-update']
      }, () => {
        // do not display the FAQs page if last-update occurred less than 45 days ago.
        if (doUpdate) {
          const p = Boolean(prefs.version);
          chrome.tabs.create({
            url: page + '?version=' + version +
              '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
            active: p === false
          });
        }
      });
    }
  });
  //
  chrome.runtime.setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
});
