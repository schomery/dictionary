'use strict';

var cache = {};
var remove = tabId => {
  if (cache[tabId]) {
    chrome.webRequest.onHeadersReceived.removeListener(cache[tabId]);
    delete cache[tabId];
  }
};
chrome.runtime.onMessage.addListener((request, sender, response) => {
  /* bounce */
  if (request.method === 'resize' || request.method === 'hide-panel') {
    chrome.tabs.sendMessage(sender.tab.id, request, {
      frameId: 0
    });
    if (request.method === 'hide-panel') {
      remove(sender.tab.id);
    }
  }
  else if (request.method === 'open') {
    chrome.tabs.create({
      url: request.url
    });
    chrome.tabs.sendMessage(sender.tab.id, {
      method: 'hide-panel'
    }, {
      frameId: 0
    });
  }
  else if (request.method === 'install') {
    if (cache[sender.tab.id]) {
      return response();
    }
    else {
      cache[sender.tab.id] = details => {
        const responseHeaders = details.responseHeaders;
        for (let i = responseHeaders.length - 1; i >= 0; --i) {
          const header = responseHeaders[i].name.toLowerCase();
          if (header === 'x-frame-options' || header === 'frame-options') {
            responseHeaders.splice(i, 1);
          }
        }
        return {responseHeaders};
      };
      // http manipulations
      chrome.webRequest.onHeadersReceived.addListener(cache[sender.tab.id], {
        urls: [
          '*://translate.google.com/*',
          '*://translate.google.com.hk/*',
          '*://translate.google.com.tr/*',
          '*://translate.google.com.tw/*',
          '*://translate.google.com.ua/*',
          '*://translate.google.com.vn/*',
          '*://translate.google.co.in/*',
          '*://translate.google.co.jp/*',
          '*://translate.google.co.kr/*',
          '*://translate.google.co.uk/*',
          '*://translate.google.cn/*',
          '*://translate.google.de/*',
          '*://translate.google.fr/*',
          '*://translate.google.it/*',
          '*://translate.google.pl/*',
          '*://translate.google.ru/*'
        ],
        types: ['sub_frame'],
        tabId: sender.tab.id
      }, ['blocking', 'responseHeaders']);
      window.setTimeout(() => response(), 100);

      return true;
    }
  }
});
chrome.tabs.onRemoved.addListener(remove);

/* context menu */
{
  const callback = () => {
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
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}

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
      domain: 'com',
      hash: '#auto/en'
    }, prefs => {
      const [sl, tl] = prefs.hash.replace('#', '').split('/');
      let link = info.linkUrl || info.pageUrl;
      if (link.startsWith('about:reader?url=')) {
        link = decodeURIComponent(link.replace('about:reader?url=', ''));
      }
      let url = `https://translate.google.${prefs.domain}/translate` +
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

{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': true,
      'last-update': 0
    }, prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
