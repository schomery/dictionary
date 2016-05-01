'use strict';

// Load Firefox based resources
var self          = require('sdk/self'),
    data          = self.data,
    sp            = require('sdk/simple-prefs'),
    prefs         = sp.prefs,
    pageMod       = require('sdk/page-mod'),
    tabs          = require('sdk/tabs'),
    timers        = require('sdk/timers'),
    cm            = require('sdk/context-menu'),
    loader        = require('@loader/options'),
    array         = require('sdk/util/array'),
    unload        = require('sdk/system/unload'),
    {on, off, once, emit} = require('sdk/event/core'),
    {Cc, Ci, Cu}  = require('chrome');

Cu.import('resource://gre/modules/Promise.jsm');

// Promise
exports.Promise = Promise;

// Event Emitter
exports.on = on.bind(null, exports);
exports.once = once.bind(null, exports);
exports.emit = emit.bind(null, exports);
exports.removeListener = function removeListener (type, listener) {
  off(exports, type, listener);
};

exports.inject = (function () {
  var workers = [], content_script_arr = [];
  pageMod.PageMod({
    include: ['http://*', 'https://*', 'file:///*', 'about:reader?*'],
    exclude: ['https://translate.google.*', 'http://translate.google.*'],
    contentScriptFile: [data.url('./content_script/firefox/firefox.js'), data.url('./content_script/inject.js')],
    contentScriptWhen: 'start',
    contentStyleFile : data.url('./content_script/inject.css'),
    attachTo: ['top', 'frame', 'existing'],
    contentScriptOptions: {
      hash: prefs.hash || '#auto/en'
    },
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', function() { array.add(workers, this); });
      worker.on('pagehide', function() { array.remove(workers, this); });
      worker.on('detach', function() { array.remove(workers, this); });

      content_script_arr.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  return {
    send: function (id, data, global) {
      if (global === true) {
        workers.forEach(function (worker) {
          worker.port.emit(id, data);
        });
      }
      else if ('emit' in this) {
        this.emit(id, data);
      }
      else {
        workers.forEach(function (worker) {
          if (worker.tab !== tabs.activeTab) {
            return;
          }
          worker.port.emit(id, data);
        });
      }
    },
    receive: function (id, callback) {
      content_script_arr.push([id, callback]);
      workers.forEach(function (worker) {
        worker.port.on(id, callback);
      });
    }
  };
})();

exports.panel = (function () {
  var workers = [], content_script_arr = [];
  pageMod.PageMod({
    include: ['https://translate.google.*', 'http://translate.google.*'],
    contentScriptFile: [data.url('./panel/firefox/firefox.js'), data.url('./panel/inject.js')],
    contentScriptWhen: 'start',
    contentStyleFile : data.url('./panel/inject.css'),
    attachTo: ['frame'],
    contentScriptOptions: {
      base: data.url('.')
    },
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', function() { array.add(workers, this); });
      worker.on('pagehide', function() { array.remove(workers, this); });
      worker.on('detach', function() { array.remove(workers, this); });
      content_script_arr.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  return {
    send: function (id, data, global) {
      if (global === true) {
        workers.forEach(function (worker) {
          worker.port.emit(id, data);
        });
      }
      else if ('emit' in this) {
        this.emit(id, data);
      }
      else {
        workers.forEach(function (worker) {
          if (worker.tab !== tabs.activeTab) {
            return;
          }
          worker.port.emit(id, data);
        });
      }
    },
    receive: function (id, callback) {
      content_script_arr.push([id, callback]);
      workers.forEach(function (worker) {
        worker.port.on(id, callback);
      });
    }
  };
})();

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + '' === 'false' || !isNaN(prefs[id])) ? (prefs[id] + '') : null;
  },
  write: function (id, data) {
    data = data + '';
    if (data === 'true' || data === 'false') {
      prefs[id] = data === 'true' ? true : false;
    }
    else if (parseInt(data) + '' === data) {
      prefs[id] = parseInt(data);
    }
    else {
      prefs[id] = data + '';
    }
  }
};

exports.tab = {
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      tabs.activeTab.url = url;
    }
    else {
      tabs.open({
        url: url,
        inBackground: typeof inBackground === 'undefined' ? false : inBackground
      });
    }
  },
  list: function () {
    var temp = [];
    for each (var tab in tabs) {
      temp.push(tab);
    }
    return Promise.resolve(temp);
  }
};

exports.version = function () {
  return self.version;
};

exports.timer = timers;

exports.options = (function () {
  var workers = [], options_arr = [];
  pageMod.PageMod({
    include: data.url('options/index.html'),
    contentScriptFile: [data.url('options/firefox/firefox.js'), data.url('options/index.js')],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      base: loader.prefixURI + loader.name + '/'
    },
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', function() {
        array.add(workers, this);
      });
      worker.on('pagehide', function() {
        array.remove(workers, this);
      });
      worker.on('detach', function() {
        array.remove(workers, this);
        this.tab.close();
      });

      options_arr.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  sp.on('openOptions', function() {
    exports.tab.open(data.url('options/index.html'));
  });

  return {
    send: function (id, data) {
      workers.forEach(function (worker) {
        if (!worker || !worker.url) {
          return;
        }
        worker.port.emit(id, data);
      });
    },
    receive: (id, callback) => options_arr.push([id, callback])
  };
})();

exports.context = function (arr) {
  cm.Menu({
    label: 'Dictionary Anywhere',
    items: arr.map(({label, callback}) => cm.Item({
      label,
      context: cm.PageContext(),
      contentScript: 'self.on("click", () => self.postMessage(document.location.href))',
      onMessage: callback
    }))
  });
};

exports.startup = function (callback) {
  if (self.loadReason === 'install' || self.loadReason === 'startup') {
    callback();
  }
};

// http manipulations
var httpResponseObserver = {
  observe: function (subject) {
    var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    // make sure translate.google.* is in 'Content-Security-Policy'
    var csp;
    try {
      csp = httpChannel.getResponseHeader('Content-Security-Policy');
    } catch (e) {}
    if (csp) {
      csp = csp.replace(/frame\-src\s*([^\;]*);/, 'frame\-src $1 translate.google.com translate.google.cn;');
      csp = csp.replace(/default\-src\s*'none\'\s*\;/, 'default-src translate.google.*;');
      httpChannel.setResponseHeader('Content-Security-Policy', csp, false);
    }
    // allow translate.google.* to be loaded on iframe
    if (httpChannel.URI.host.indexOf('translate.google.') === 0) {
      httpChannel.setResponseHeader('X-Frame-Options', '', false);
      httpChannel.setResponseHeader('frame-options', '', false);
    }
  },
  get observerService() {
    return Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
  },
  register: function() {
    this.observerService.addObserver(this, 'http-on-examine-response', false);
  },
  unregister: function() {
    this.observerService.removeObserver(this, 'http-on-examine-response');
  }
};
httpResponseObserver.register();
unload.when(function () {
  httpResponseObserver.unregister();
});
