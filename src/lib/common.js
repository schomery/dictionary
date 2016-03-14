'use strict';

/**** wrapper (start) ****/
if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  var config = require('./config');
}
/**** wrapper (end) ****/

/* options */
app.options.receive('changed', function (o) {
  config.set(o.pref, o.value);
  app.options.send('set', {
    pref: o.pref,
    value: config.get(o.pref)
  });
});
app.options.receive('get', function (pref) {
  app.options.send('set', {
    pref: pref,
    value: config.get(pref)
  });
});

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
app.inject.receive('hashrequest', function () {
  app.inject.send.call(this, 'hashchange', app.storage.read('hash'));
});
app.inject.receive('width', () => app.inject.send('width', config.options.width, true));
app.on('width', () => app.inject.send('width', config.options.width, true));


/* context */
app.context([
  {label: 'Translate Page (Google)', callback: function (url) {
    let langs = app.storage.read('hash') || '#auto/en';
    langs = langs.replace('#', '').split('/');
    app.tab.open(`https://translate.google.com/translate?hl=en&sl=${langs[0]}&tl=${langs[1]}&u=${encodeURIComponent(url)}`);
  }},
  {label: 'Translate Page (Bing)', callback: function (url) {
    let langs = app.storage.read('hash') || '#auto/en';
    langs = langs.replace('#', '').split('/');
    app.tab.open(`http://www.microsofttranslator.com/bv.aspx?from=${langs[0]}&to=${langs[1]}&a=${encodeURIComponent(url)}`);
  }}
]);
