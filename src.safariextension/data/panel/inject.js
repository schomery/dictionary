/* global background */
'use strict';

if (window.top !== window) {  // only in frames
  window.addEventListener('hashchange', function () {
    background.send('hashchange', location.hash);
  });
  window.addEventListener('scroll', function () {
    window.scrollTo(0, 0);
  });
  document.addEventListener('DOMContentLoaded', function () {
    // Remove loading animation
    background.send('loaded');
    // Add MutationObserver to change size
    var page = document.querySelector('div[class=page]');
    var observer = new MutationObserver(function () {
      var tmp = window.getComputedStyle(page);
      if (page && tmp) {
        background.send('resize', tmp.height);
      }
    });

    // configuration of the observer:
    var config = {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true
    };

    if (page) {
      observer.observe(page, config);
    }
  });
}
