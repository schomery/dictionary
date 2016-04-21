'use strict';

var isFirefox = typeof require !== 'undefined', config;
if (isFirefox) {
  var app = require('./firefox/firefox');
  config = exports;
}
else {
  config = {};
}

config.options = {
  get engine () {
    return +app.storage.read('engine') || 0;
  },
  set engine (val) {
    app.storage.write('engine', val);
    app.emit('engine', val);
  },
  get width () {
    return +app.storage.read('width') || 400;
  },
  set width (val) {
    val = +val;
    if (val < 200) {
      val = 200;
    }
    if (val > 600) {
      val = 600;
    }
    app.storage.write('width', val);
    app.emit('width', val);
  },
  get fixed () {
    return app.storage.read('fixed') === 'true' ? true : false;
  },
  set fixed (val) {
    app.storage.write('fixed', val);
  }
};

config.welcome = {
  get version () {
    return app.storage.read('version');
  },
  set version (val) {
    app.storage.write('version', val);
  },
  timeout: 3,
  get show () {
    return app.storage.read('show') === 'false' ? false : true; // default is true
  },
  set show (val) {
    app.storage.write('show', val);
  }
};
// Complex get and set
config.get = function (name) {
  return name.split('.').reduce(function (p, c) {
    return p[c];
  }, config);
};
config.set = function (name, value) {
  function set(name, value, scope) {
    name = name.split('.');
    if (name.length > 1) {
      set.call((scope || this)[name.shift()], name.join('.'), value)
    }
    else {
      this[name[0]] = value;
    }
  }
  set(name, value, config);
};
