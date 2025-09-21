/* global position */
'use strict';

const open = async (tab, query, frameId, permanent = false) => {
  try {
    const [{result}] = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
        frameIds: [frameId]
      },
      injectImmediately: true,
      func: () => ({
        position: typeof position === 'undefined' ? null : position
      })
    });
    const position = {
      sx: 0,
      sy: 0
    };
    const prefs = await chrome.storage.local.get({
      'width': 400,
      'mheight': 600,
      'translate-styles': '',
      'scale': 1.0,
      'force-inside': true,
      'hide-translator': true,
      'google-extra': '',
      'domain': 'com'
    });
    const win = await chrome.windows.get(tab.windowId);
    if (result.position) {
      Object.assign(position, result.position);
    }
    else {
      position.sx = win.left;
      position.sy = win.top;
    }

    // Avoid popup outside the screen
    if (prefs['force-inside']) {
      const {height, width, left, top} = await chrome.windows.getCurrent();
      position.sy = Math.min(position.sy, top + height - prefs.mheight);
      position.sx = Math.min(position.sx, left + width - prefs.width);
    }

    const url = 'https://translate.google.' + prefs.domain + '/?' +
      (prefs['google-extra'] ? prefs['google-extra'] + '&' : '') +
      'text=' + encodeURIComponent(query);

    const w = await chrome.windows.create({
      url,
      left: parseInt(position.sx),
      top: parseInt(position.sy),
      width: parseInt(prefs.width),
      height: parseInt(prefs.mheight),
      type: 'popup'
    }).catch(e => {
      console.warn(e);

      return chrome.windows.create({
        url,
        width: parseInt(prefs.width),
        height: parseInt(prefs.mheight),
        type: 'popup'
      });
    });
    prefs.permanent = permanent;
    open.ids[w.tabs[0].id] = prefs;
  }
  catch (e) {
    console.error(e);
  }
};
open.ids = {};

const onMessage = (request, sender, response) => {
  if (request.method === 'open-translator') {
    open(sender.tab, request.query, sender.frameId, request.permanent);

    chrome.scripting.executeScript({
      target: {
        tabId: sender.tab.id,
        allFrames: true
      },
      func: () => {
        try {
          clearTimeout(self.pointer.rid);
          self.pointer.hide();
        }
        catch (e) {}
      }
    });
  }
  else if (request.method === 'close') {
    if (sender.tab) {
      chrome.tabs.remove(sender.tab.id);
    }
  }
  else if (request.method === 'extend') {
    response(open.ids[sender.tab.id]);
    delete open.ids[sender.tab.id];
  }
};
chrome.runtime.onMessage.addListener(onMessage);

const onClicked = async (info, tab) => {
  if (info.menuItemId === 'open-panel') {
    open(tab, info.selectionText, info.frameId);
  }
  else {
    const prefs = await chrome.storage.local.get({
      'domain': 'com',
      'google-extra': '',
      'bing-extra': 'from=&to=fr',
      'reuse-page': true
    });
    let link = info.linkUrl || info.pageUrl;
    if (link.startsWith('about:reader?url=')) {
      link = decodeURIComponent(link.replace('about:reader?url=', ''));
    }
    let url = `https://translate.google.${prefs.domain}/translate` +
      `?${prefs['google-extra'] ? prefs['google-extra'] + '&' : ''}u=${encodeURIComponent(link)}`;
    if (info.menuItemId === 'open-bing') {
      url = `http://www.microsofttranslator.com/bv.aspx?${prefs['bing-extra'] ? prefs['bing-extra'] + '&' : ''}` +
        `a=${encodeURIComponent(link)}`;
    }
    // when this is a page translation, offer redirection
    if (!info.linkUrl && prefs['reuse-page']) {
      chrome.tabs.update(tab.id, {url});
    }
    else {
      chrome.tabs.create({
        url,
        index: tab.index + 1
      });
    }
  }
};

/* context menu */
{
  const onStartup = async () => {
    if (onStartup.done) {
      return;
    }
    onStartup.done = true;

    const prefs = await chrome.storage.local.get({
      'use-pointer': true,
      'google-page': true,
      'bing-page': false
    });
    if (prefs['use-pointer'] === false) {
      chrome.contextMenus.create({
        id: 'open-panel',
        title: 'Translate Selection',
        contexts: ['selection'],
        documentUrlPatterns: ['*://*/*']
      }, () => chrome.runtime.lastError);
    }
    if (prefs['google-page']) {
      chrome.contextMenus.create({
        id: 'open-google',
        title: 'Translate with Google',
        contexts: ['page', 'link'],
        documentUrlPatterns: ['*://*/*']
      }, () => chrome.runtime.lastError);
    }
    if (prefs['bing-page']) {
      chrome.contextMenus.create({
        id: 'open-bing',
        title: 'Translate with Bing',
        contexts: ['page', 'link'],
        documentUrlPatterns: ['*://*/*']
      }, () => chrome.runtime.lastError);
    }
  };
  chrome.runtime.onInstalled.addListener(onStartup);
  chrome.runtime.onStartup.addListener(onStartup);
}
chrome.contextMenus.onClicked.addListener(onClicked);

chrome.action.onClicked.addListener(async tab => {
  const prefs = await chrome.storage.local.get({
    'default-action': 'open-google'
  });
  onClicked({
    menuItemId: prefs['default-action'],
    pageUrl: tab.url
  }, tab);
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
