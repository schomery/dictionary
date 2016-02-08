'use strict';

var isFirefox = typeof require !== 'undefined', config;
if (isFirefox) {
  var app = require('./firefox/firefox');
  var os = require('sdk/system').platform;
  config = exports;
}
else {
  config = {};
}

config.options = {
  get intPref () {
    return +app.storage.read('intPref') || 10;  // default value is 10
  },
  set intPref (val) {
    val = +val;
    if (val < 5) {
      val = 5;
    }
    app.storage.write('intPref', val);
  },
  get bolPref () {
    return app.storage.read('bolPref') === 'false' ? false : true; // default is true
  },
  set bolPref (val) {
    app.storage.write('bolPref', val);
  },
  get strPref () {
    return app.storage.read('strPref') || 'default string';
  },
  set strPref (val) {
    app.storage.write('strPref', val);
  }
};

config.popup = {
  get width () {
    return +app.storage.read('width') || 200;
  },
  set width (val) {
    val = +val;
    if (val < 200) {
      val = 200;
    }
    app.storage.write('width', val);
  },
  get height () {
    return +app.storage.read('height') || 200;
  },
  set height (val) {
    val = +val;
    if (val < 200) {
      val = 200;
    }
    app.storage.write('height', val);
  }
};

config.ui = {
  badge: true,
  get fontFamily () {
    if (os === 'darwin') {
      return 'sans-serif';
    }
    if (os === 'linux') {
      return "\"Liberation Sans\", FreeSans, Arial, Sans-serif";
    }
    return 'Arial';
  },
  get fontSize () {
    if (os === 'darwin') {
      return '8px';
    }
    return '10px';
  },
  get height () {
    if (os === 'darwin') {
      return '10px';
    }
    return '11px';
  },
  get lineHeight () {
    if (os === 'linux') {
      return '11px';
    }
    return '10px';
  },
  backgroundColor: '#3366CC',
  color: '#fff',
  margin: {
    get '1' () {  // badge length of '1'
      if (os === 'darwin') {
        return '-10px -13px 0 0';
      }
      if (os === 'linux') {
        return '7px 3px 0 -13px';
      }
      return '7px 3px 0 -13px';
    },
    get '2' () {
      if (os === 'darwin') {
        return '-10px -14px 0 0';
      }
      if (os === 'linux') {
        return '7px 3px 0 -19px';
      }
      return '7px 3px 0 -19px';
    },
    get '3' () {
      if (os === 'darwin') {
        return '-10px -14px 0 -7px';
      }
      if (os === 'linux') {
        return '7px 4px 0 -26px';
      }
      return '7px 3px 0 -23px';
    },
    get '4' () {
      if (os === 'darwin') {
        return '-10px -14px 0 -13px';
      }
      if (os === 'linux') {
        return '7px 2px 0 -30px';
      }
      return '7px 3px 0 -27px';
    }
  },
  width: {
    get '1' () { // badge width of '1'
      return '10px';
    },
    get '2' () {
      if (os === 'darwin') {
        return '12px';
      }
      return '16px';
    },
    get '3' () {
      if (os === 'darwin') {
        return '19px';
      }
      return '20px';
    },
    get '4' () {
      if (os === 'darwin') {
        return '21px';
      }
      return '22px';
    }
  },
  get extra () {
    if (os === 'darwin') {
      return '__id__:moz-window-inactive:after {background-color: #99B2E5}';
    }
    if (os === 'linux') {
      return '__id__:after {padding-top: 1px; letter-spacing: -0.05ex;}';
    }
    return '';
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
