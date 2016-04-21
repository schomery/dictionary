'use strict';

var app = new EventEmitter();

app.on('load', function () {
  var script = document.createElement('script');
  document.body.appendChild(script);
  script.src = '../common.js';
});

app.Promise = Promise;

app.storage = (function () {
  var objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    app.emit('load');
  });
  return {
    read: function (id) {
      return (objs[id] || !isNaN(objs[id])) ? objs[id] + '' : objs[id];
    },
    write: function (id, data) {
      objs[id] = data;
      var tmp = {};
      tmp[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
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
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      chrome.tabs.update(null, {url: url});
    }
    else {
      chrome.tabs.create({
        url: url,
        active: typeof inBackground === 'undefined' ? true : !inBackground
      });
    }
  },
  list: function () {
    var d = app.Promise.defer();
    chrome.tabs.query({
      currentWindow: false
    }, function (tabs) {
      d.resolve(tabs);
    });
    return d.promise;
  }
};

app.version = function () {
  return chrome[chrome.runtime && chrome.runtime.getManifest ? 'runtime' : 'extension'].getManifest().version;
};

app.timer = window;

app.options = {
  send: function (id, data) {
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        if (tab.url.indexOf(chrome.extension.getURL('data/options/index.html') === 0)) {
          chrome.tabs.sendMessage(tab.id, {method: id, data: data}, function () {});
        }
      });
    });
  },
  receive: function (id, callback) {
    chrome.runtime.onMessage.addListener(function (message, sender) {
      if (
        message.method === id &&
        sender.tab &&
        sender.tab.url.indexOf(chrome.extension.getURL('data/options/index.html') === 0)
      ) {
        callback.call(sender.tab, message.data);
      }
    });
  }
};

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
    var headers = details.responseHeaders;
    for (var i = headers.length - 1; i >= 0; --i) {
      var header = headers[i].name.toLowerCase();
      if (header === 'x-frame-options' || header === 'frame-options') {
        headers.splice(i, 1);
      }
    }
    return {responseHeaders: headers};
  },
  {
    urls: [
      'https://translate.google.com/*',
      'http://translate.google.com/*',
      'https://translate.google.cn/*',
      'http://translate.google.cn/*'
    ],
    types: ['sub_frame']
  },
  ['blocking', 'responseHeaders']
);
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    var headers = details.responseHeaders;
    for (var i = headers.length - 1; i >= 0; --i) {
      var header = headers[i];
      if (header === 'Content-Security-Policy') {
        headers[i] = header
          .replace(/frame\-src\s*([^\;]*);/, 'frame\-src $1 translate.google.com translate.google.cn;')
          .replace(/default\-src\s*'none\'\s*\;/, 'default-src translate.google.*;');
      }
    }
    return {responseHeaders: headers};
  },
  {
    urls: ['<all_urls>'],
    types: ['main_frame']
  },
  ['blocking', 'responseHeaders']
);
