'use strict';

function EventEmitter () {
  this.callbacks = {};
}
EventEmitter.prototype.on = function (id, callback) {
  this.callbacks[id] = this.callbacks[id] || [];
  this.callbacks[id].push(callback);
};
EventEmitter.prototype.emit = function (id, data) {
  (this.callbacks[id] || []).forEach(c => c(data));
};

var app = new EventEmitter();

app.on('load', function () {
  let script = document.createElement('script');
  document.body.appendChild(script);
  script.src = '../common.js';
});

app.storage = (function () {
  let objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    app.emit('load');
  });
  chrome.storage.onChanged.addListener(prefs => {
    Object.keys(prefs).forEach(n => objs[n] = prefs[n].newValue);
    if (prefs.engine) {
      app.emit('engine', prefs.engine.newValue);
    }
    if (prefs.width) {
      app.emit('width', prefs.width.newValue);
    }
    if (prefs.mheight) {
      app.emit('mheight', prefs.mheight.newValue);
    }
    if (prefs['offset-x'] || prefs['offset-y']) {
      app.emit('offset');
    }
  });
  return {
    read: (id) => objs[id],
    write: (id, data) => chrome.storage.local.set({
      [id]: data
    })
  };
})();

app.inject = (function () {
  return {
    send: function (id, data, global) {
      if (global) {
        chrome.tabs.query({}, function (tabs) {
          tabs.forEach(function (tab) {
            chrome.tabs.sendMessage(tab.id, {method: id, data: data}, function () {});
          });
        });
      }
      else if ('id' in this && 'windowId' in this) {
        chrome.tabs.sendMessage(this.id, {method: id, data: data}, function () {});
      }
      else {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
          tabs.forEach(function (tab) {
            chrome.tabs.sendMessage(tab.id, {method: id, data: data}, function () {});
          });
        });
      }
    },
    receive: function (id, callback) {
      chrome.runtime.onMessage.addListener(function (message, sender) {
        if (message.method === id && sender.tab) {
          callback.call(sender.tab, message.data);
        }
      });
    }
  };
})();

app.panel = (function () {
  return {
    send: function (id, data, global) {
      if (global) {
        chrome.tabs.query({}, function (tabs) {
          tabs.forEach(function (tab) {
            chrome.tabs.sendMessage(tab.id, {method: id, data: data}, function () {});
          });
        });
      }
      else if ('id' in this && 'windowId' in this) {
        chrome.tabs.sendMessage(this.id, {method: id, data: data}, function () {});
      }
      else {
        chrome.tabs.query({
          active: true,
          currentWindow: true
        }, function (tabs) {
          tabs.forEach(function (tab) {
            chrome.tabs.sendMessage(tab.id, {method: id, data: data}, function () {});
          });
        });
      }
    },
    receive: function (id, callback) {
      chrome.runtime.onMessage.addListener(function (message, sender) {
        if (message.method === id && sender.tab && sender.url.indexOf('translate.google') !== -1) {
          callback.call(sender.tab, message.data);
        }
      });
    }
  };
})();

app.tab = {
  open: (url) => chrome.tabs.create({url})
};

app.version = () => chrome.runtime.getManifest().version;
app.timer = window;

app.context = function (arr) {
  arr.forEach(function (obj) {
    chrome.contextMenus.create({
      title: obj.label,
      onclick: (e) => obj.callback(e. pageUrl)
    });
  });
};

app.startup = (function () {
  let loadReason, callback;
  function check () {
    if (loadReason === 'startup' || loadReason === 'install') {
      if (callback) {
        callback();
      }
    }
  }
  chrome.runtime.onInstalled.addListener(function (details) {
    loadReason = details.reason;
    check();
  });
  chrome.runtime.onStartup.addListener(function () {
    loadReason = 'startup';
    check();
  });
  return function (c) {
    callback = c;
    check();
  };
})();

// http manipulations
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
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
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    let responseHeaders = details.responseHeaders;
    for (let i = responseHeaders.length - 1; i >= 0; --i) {
      let header = responseHeaders[i];
      if (header === 'Content-Security-Policy') {
        responseHeaders[i] = header
          .replace(/frame\-src\s*([^\;]*);/, 'frame\-src $1 translate.google.com translate.google.cn;');
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
