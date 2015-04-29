/* globals Q, safari, config, webkitNotifications */
'use strict';

var app = new EventEmitter();
app.globals = {
  browser: 'safari'
};

app.Promise = Q.promise;
app.Promise.defer = Q.defer;

app.storage = {
  read: function (id) {
    return localStorage[id] || null;
  },
  write: function (id, data) {
    localStorage[id] = data + '';
  }
};

app.get = function (url, headers, data) {
  var xhr = new XMLHttpRequest();
  var d = new app.Promise.defer();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status >= 400) {
        var e = new Error(xhr.statusText);
        e.status = xhr.status;
        d.reject(e);
      }
      else {
        d.resolve(xhr.responseText);
      }
    }
  };
  xhr.open(data ? 'POST' : 'GET', url, true);
  for (var id in headers) {
    xhr.setRequestHeader(id, headers[id]);
  }
  if (data) {
    var arr = [];
    for (var e in data) {
      arr.push(e + '=' + data[e]);
    }
    data = arr.join('&');
  }
  xhr.send(data ? data : '');
  return d.promise;
};

app.getURL = function (path) {
  return safari.extension.baseURI + 'data/' + path;
};

app.button = (function () {
  var onCommand,
      toolbarItem = safari.extension.toolbarItems[0];
  safari.application.addEventListener('command', function (e) {
    if (e.command === 'toolbarbutton' && onCommand) {
      onCommand();
    }
  }, false);

  return {
    onCommand: function (c) {
      onCommand = c;
    },
    set label (val) { // jshint ignore: line
      toolbarItem.toolTip = val;
    },
    set icon (obj) {  // jshint ignore: line
      toolbarItem.image =
        safari.extension.baseURI + 'data/icons/safari/' +
        (obj.path.indexOf('disabled') === -1 ? 'on' : 'off') +
        '.png';
    },
    set badge (val) { // jshint ignore: line
      toolbarItem.badge = (val ? val : '') + '';
    }
  };
})();

app.popup = (function () {
  var callbacks = {},
    toolbarItem = safari.extension.toolbarItems[0],
    popup = safari.extension.createPopover(
      'popover',
      safari.extension.baseURI + 'data/popup/index.html',
      100,
      100
    );

  safari.application.addEventListener('popover', function () {
    popup.width = config.popup.width;
    popup.height = config.popup.height;
  }, true);

  toolbarItem.popover = popup;
  return {
    show: function () {
      toolbarItem.showPopover();
    },
    hide: function () {
      popup.hide();
    },
    send: function (id, data) {
      popup.contentWindow.background.dispatchMessage(id, data);
    },
    receive: function (id, callback) {
      callbacks[id] = callback;
    },
    dispatchMessage: function (id, data) {
      if (callbacks[id]) {
        callbacks[id](data);
      }
    }
  };
})();

app.tab = {
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      safari.application.activeBrowserWindow.activeTab.url = url;
    }
    else {
      safari.application.activeBrowserWindow.openTab(inBackground ? 'background' : 'foreground').url = url;
    }
  },
  list: function () {
    var wins = safari.application.browserWindows;
    var tabs = wins.map(function (win) {
      return win.tabs;
    });
    tabs = tabs.reduce(function (p, c) {
      return p.concat(c);
    }, []);
    return new app.Promise(function (a) {a(tabs);});
  }
};

app.version = function () {
  return safari.extension.displayVersion;
};

app.timer = window;

app.contentScript = (function () {
  var callbacks = {};
  safari.application.addEventListener('message', function (e) {
    if (callbacks[e.message.id]) {
      callbacks[e.message.id].call(e.target, e.message.data);
    }
  }, false);
  return {
    send: function (id, data, global) {
      if (global) {
        safari.application.browserWindows.forEach(function (browserWindow) {
          browserWindow.tabs.forEach(function (tab) {
            if (tab.page && tab.url.indexOf('http') === 0) {
              tab.page.dispatchMessage(id, data);
            }
          });
        });
      }
      else if ('page' in this) {
        this.page.dispatchMessage(id, data);
      }
      else {
        safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(id, data);
      }
    },
    receive: function (id, callback) {
      callbacks[id] = callback;
    }
  };
})();

app.panel = (function () {
  var callbacks = {};
  safari.application.addEventListener('message', function (e) {
    if (callbacks[e.message.id]) {
      callbacks[e.message.id].call(e.target, e.message.data);
    }
  }, false);
  return {
    send: function (id, data, global) {
      if (global) {
        safari.application.browserWindows.forEach(function (browserWindow) {
          browserWindow.tabs.forEach(function (tab) {
            if (tab.page && tab.url.indexOf('translate.google.com') !== -1) {
              tab.page.dispatchMessage(id, data);
            }
          });
        });
      }
      else if ('page' in this) {
        this.page.dispatchMessage(id, data);
      }
      else {
        var url = safari.application.activeBrowserWindow.activeTab.url;
        if (url.indexOf('translate.google.com') !== -1) {
          safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(id, data);
        }
      }
    },
    receive: function (id, callback) {
      callbacks[id] = callback;
    }
  };
})();

app.options = (function () {
  var callbacks = {};
  safari.application.addEventListener('message', function (e) {
    if (callbacks[e.message.id]) {
      callbacks[e.message.id](e.message.data);
    }
  }, false);
  return {
    send: function (id, data) {
      safari.application.browserWindows.forEach(function (browserWindow) {
        browserWindow.tabs.forEach(function (tab) {
          if (tab.page && tab.url.indexOf(safari.extension.baseURI + 'data/options/index.html') === 0) {
            tab.page.dispatchMessage(id, data);
          }
        });
      });
    },
    receive: function (id, callback) {
      callbacks[id] = callback;
    }
  };
})();
