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
    array         = require('sdk/util/array'),
    unload        = require('sdk/system/unload'),
    {on, emit}    = require('sdk/event/core'),
    {Cc, Ci}      = require('chrome');

// Event Emitter
exports.on = on.bind(null, exports);
exports.emit = emit.bind(null, exports);

exports.inject = (function () {
  let workers = [], callbacks = [];
  let options = {
    include: ['http://*', 'https://*', 'file:///*', 'about:reader?*'],
    exclude: ['http://translate.google.*', 'https://translate.google.*'],
    contentScriptWhen: 'start',
    contentStyleFile : data.url('./content_script/inject.css'),
    onAttach: function (worker) {
      array.add(workers, worker);
      worker.on('pageshow', function () { array.add(workers, this); });
      worker.on('pagehide', function () { array.remove(workers, this); });
      worker.on('detach', function () { array.remove(workers, this); });

      callbacks.forEach((arr) => worker.port.on(arr[0], arr[1]));
    }
  };
  pageMod.PageMod(Object.assign(options, {
    contentScriptFile: [data.url('./content_script/firefox/firefox.js'), data.url('./content_script/inject.js')],
    attachTo: ['top', 'frame', 'existing']
  }));
  pageMod.PageMod(Object.assign(options, {
    contentScriptFile: [data.url('./content_script/firefox/firefox.js'), data.url('./content_script/top.js')],
    attachTo: ['top', 'existing'],
    contentScriptOptions: {
      hash: prefs.hash || '#auto/en'
    },
  }));
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
      callbacks.push([id, callback]);
      workers.forEach(worker => worker.port.on(id, callback));
    }
  };
})();

exports.panel = (function () {
  let workers = [], callbacks = [];
  pageMod.PageMod({
    include: ['http://translate.google.*', 'https://translate.google.*'],
    contentScriptFile: [
      data.url('./panel/firefox/firefox.js'),
      data.url('./panel/inject.js')
    ],
    contentScriptWhen: 'start',
    contentStyleFile : data.url('./panel/inject.css'),
    attachTo: ['frame'],
    contentScriptOptions: {
      base: data.url('.')
    },
    onAttach: function (worker) {
      array.add(workers, worker);
      worker.on('pageshow', function () { array.add(workers, this); });
      worker.on('pagehide', function () { array.remove(workers, this); });
      worker.on('detach', function () { array.remove(workers, this); });
      callbacks.forEach((arr) => worker.port.on(arr[0], arr[1]));
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
      callbacks.push([id, callback]);
      workers.forEach(function (worker) {
        worker.port.on(id, callback);
      });
    }
  };
})();

exports.storage = {
  read: (id) =>  prefs[id],
  write: (id, data) => prefs[id] = data
};
sp.on('engine', () => exports.emit('engine', sp.prefs.engine));
sp.on('width', () => {
  timers.setTimeout(() => {
    sp.prefs.width = Math.min(Math.max(200, sp.prefs.width), 600);
    exports.emit('width', sp.prefs.width);
  }, 2000);
});
sp.on('mheight', () => exports.emit('mheight', sp.prefs.mheight));
sp.on('offset-x', () => exports.emit('offset'));
sp.on('offset-y', () => exports.emit('offset'));

exports.tab = {
  open: (url) => tabs.open({url})
};

exports.version = () => self.version;
exports.timer = timers;

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
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    // make sure translate.google.* is in 'Content-Security-Policy'
    let csp;
    try {
      csp = httpChannel.getResponseHeader('Content-Security-Policy');
    } catch (e) {}
    if (csp) {
      csp = csp.replace(/frame\-src\s*([^\;]*);/, 'frame\-src $1 translate.google.com translate.google.cn;');
      /* temporary solution */
      if (sp.prefs.forced) {
        csp = csp.replace(/script\-src\s*([^\;]*);/, '');
        csp = csp.replace(/default\-src\s*([^\;]*);/, '');
      }

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
  register: function () {
    this.observerService.addObserver(this, 'http-on-examine-response', false);
  },
  unregister: function () {
    this.observerService.removeObserver(this, 'http-on-examine-response');
  }
};
httpResponseObserver.register();
unload.when(() => httpResponseObserver.unregister());
