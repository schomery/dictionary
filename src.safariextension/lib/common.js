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
app.options.receive('info', function () {
  app.options.send('info', {
    title: 'title',
    inshort: 'in short ...'
  });
});

/* welcome page */
(function () {
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
})();

/* app */
app.panel.receive('hashchange', function (hash) {
  var part = hash.split('/');
  if (part.length >= 2 && part[0][0] === '#') {
    var tmp = part[0] + '/' + part[1];
    app.storage.write('hash', tmp);
    app.contentScript.send('hashchange', tmp, true);
  }
});
app.panel.receive('resize', app.contentScript.send.bind(this, 'resize'));
app.panel.receive('loaded', app.contentScript.send.bind(this, 'loaded'));
app.contentScript.receive('hashrequest', function () {
  app.contentScript.send.call(this, 'hashchange', app.storage.read('hash'));
});
