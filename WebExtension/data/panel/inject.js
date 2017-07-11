'use strict';

var id;

function resize () {
  const page =  document.body || document.documentElement;
  const tmp = window.getComputedStyle(page);
  if (page && tmp) {
    chrome.runtime.sendMessage({
      method: 'resize',
      height: tmp.height
    });
  }
}

if (window.top !== window) {  // only in frames
  window.addEventListener('hashchange', function () {
    const part = location.hash.split('/');
    if (part.length >= 2 && part[0][0] === '#') {
      chrome.storage.local.set({
        'hash': part[0] + '/' + part[1]
      });
    }
  });
  window.addEventListener('scroll', function () {
    window.scrollTo(0, 0);
  });

  document.addEventListener('DOMContentLoaded', function () {
    // This is a must have for this extension. We need to resize the injected panel when DOM is modified. There is a timeout to prevent multiple actions.
    let observer = new MutationObserver(() => {
      window.clearTimeout(id);
      id = window.setTimeout(resize, 500);
    });
    observer.observe(document.body, {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: true,
    });

    // Remove loading animation
    chrome.runtime.sendMessage({
      method: 'loaded'
    });
    // preventing panel from prompting alert or confirm; this needs to be injected to the unwrapped window object to let overwrite alert and confirm functions
    let script = document.createElement('script');
    script.textContent = 'window.alert = window.confirm = function () {return true;}';
    document.body.appendChild(script);
  });
  window.addEventListener('load', function () {
    // link
    let div = document.createElement('div');
    div.setAttribute('class', 'itanywhere-link');
    div.appendChild(document.createTextNode('Open in:'));
    let translate = document.createElement('a');
    translate.textContent = 'Google Translate';
    translate.href = '#';
    translate.addEventListener('click', function () {
      window.top.postMessage({
        cmd: 'idanywhere-open-translate'
      }, '*');
      window.top.postMessage({
        cmd: 'idanywhere-hide'
      }, '*');
    });
    let define = document.createElement('a');
    define.textContent = 'Google Search';
    define.href = '#';
    define.addEventListener('click', function () {
      window.top.postMessage({
        cmd: 'idanywhere-open-define'
      }, '*');
      window.top.postMessage({
        cmd: 'idanywhere-hide'
      }, '*');
    });

    div.appendChild(translate);
    div.appendChild(define);
    document.body.appendChild(div);
  });
}
