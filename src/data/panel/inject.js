/* global background */
'use strict';

var id;

function resize () {
  let page = document.body;
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
  document.addEventListener('DOMSubtreeModified', function () {
    window.clearTimeout(id);
    id = window.setTimeout(resize, 500);
  });

  document.addEventListener('DOMContentLoaded', function () {
    // Remove loading animation
    background.send('loaded');
  });
}
