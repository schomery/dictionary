/* global background */
'use strict';

var id;

function resize () {
  let page =  document.body || document.documentElement;
  let tmp = window.getComputedStyle(page);
  if (page && tmp) {
    background.send('resize', tmp.height);
  }
}

if (window.top !== window) {  // only in frames
  window.addEventListener('hashchange', function () {
    background.send('hashchange', location.hash);
  });
  window.addEventListener('scroll', function () {
    window.scrollTo(0, 0);
  });
  // This is a must have for this extension. We need to resize the injected panel when DOM is modified. There is a timeout to prevent multiple actions.
  document.addEventListener('DOMSubtreeModified', function () {
    window.clearTimeout(id);
    id = window.setTimeout(resize, 500);
  });

  document.addEventListener('DOMContentLoaded', function () {
    // Remove loading animation
    background.send('loaded');
    // preventing panel from prompting alert or confirm; this needs to be injected to the unwrapped window object to let overwrite alert and confirm functions
    let script = document.createElement('script');
    script.textContent = 'window.alert = window.confirm = function () {return true;}';
    document.body.appendChild(script);
  });
}
