'use strict';

var app = app || require('./firefox/firefox');
var isFirefox = typeof require !== 'undefined', config;
var isOpera = !isFirefox && navigator.userAgent.indexOf('OPR') !== -1;

var config = {};
config.options = {
  get engine () {
    return +app.storage.read('engine') || 0;
  },
  get width () {
    return +app.storage.read('width') || 400;
  },
  offset: {
    get x () {
      return +app.storage.read('offset-x') || (isOpera ? 10 : 0);
    },
    get y () {
      return +app.storage.read('offset-y') || (isOpera ? 20 : 0);
    }
  },
  get mheight () {
    return +app.storage.read('mheight') || 0;
  },
  get fixed () {
    return app.storage.read('fixed') === 'true' || app.storage.read('fixed') === true ? true : false;
  },
  get forced () {
    return app.storage.read('forced') === 'false' || app.storage.read('forced') === false ? false : true;
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
    return app.storage.read('show') === 'false' || app.storage.read('show') === false ? false : true; // default is true
  }
};

/* welcome page */
app.startup(function () {
  var version = config.welcome.version;
  if (app.version() !== version) {
    app.timer.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/dictionary.html?v=' + app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
});

/* app */
app.panel.receive('hashchange', function (hash) {
  var part = hash.split('/');
  if (part.length >= 2 && part[0][0] === '#') {
    var tmp = part[0] + '/' + part[1];
    app.storage.write('hash', tmp);
    app.inject.send('hashchange', tmp, true);
  }
});
app.panel.receive('resize', app.inject.send.bind(this, 'resize'));
app.panel.receive('loaded', app.inject.send.bind(this, 'loaded'));

app.inject.receive('offset', function () {
  app.inject.send.call(this, 'offset', config.options.offset);
});
app.on('offset', function () {
  app.inject.send('offset', config.options.offset);
});

app.inject.receive('hashrequest', function () {
  app.inject.send.call(this, 'hashchange', app.storage.read('hash'));
});
app.inject.receive('open', app.tab.open);

(function (callback) {
  app.inject.receive('settings', callback);
  app.on('width', callback);
  app.on('mheight', callback);
  app.on('engine', callback);
})(() => app.inject.send('settings', {
  width: config.options.width,
  mheight: config.options.mheight,
  engine: config.options.engine
}, true));

/* context */
app.context([
  {label: 'Translate Page (Google)', callback: function (url) {
    let langs = app.storage.read('hash') || '#auto/en';
    langs = langs.replace('#', '').split('/');
    app.tab.open(`https://translate.google.${config.options.engine === 1 ? 'cn' : 'com'}/translate?hl=en&sl=${langs[0]}&tl=${langs[1]}&u=${encodeURIComponent(url)}`);
  }},
  {label: 'Translate Page (Bing)', callback: function (url) {
    let langs = app.storage.read('hash') || '#auto/en';
    langs = langs.replace('#', '').split('/');
    app.tab.open(`http://www.microsofttranslator.com/bv.aspx?from=${langs[0]}&to=${langs[1]}&a=${encodeURIComponent(url)}`);
  }}
]);
