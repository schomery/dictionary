/* globals self */
'use strict';

var background = {
  send: function (id, data) {
    self.port.emit(id, data);
  },
  receive: function (id, callback) {
    if (id === 'detach') {
      self.port.on('detach', callback);
    }
    else {
      self.port.on(id, callback);
    }
  }
};
