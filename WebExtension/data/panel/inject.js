'use strict';

var id;

// scaling
function scale(value) {
  if (value < 1.0) {
    document.documentElement.style.transform = `scale(${value})`;
    document.documentElement.style['transform-origin'] = '0 0';
    document.documentElement.style.width = `${1 / value * 100}%`;
  }
}
chrome.storage.local.get({
  scale: 1.0
}, prefs => scale(prefs.scale));
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.scale) {
    scale(prefs.scale.newValue);
  }
});

function resize() {
  const page = document.body || document.documentElement;
  if (page) {
    chrome.runtime.sendMessage({
      method: 'resize',
      height: page.getBoundingClientRect().height
    });
  }
}

if (window.top !== window) {  // only in frames
  window.addEventListener('hashchange', function() {
    const part = location.hash.split('/');
    if (part.length >= 2 && part[0][0] === '#') {
      chrome.storage.local.set({
        'hash': part[0] + '/' + part[1]
      });
    }
  });
  window.addEventListener('scroll', function() {
    window.scrollTo(0, 0);
  });

  document.addEventListener('DOMContentLoaded', function() {
    // This is a must have for this extension. We need to resize the injected panel when DOM is modified. There is a timeout to prevent multiple actions.
    const observer = new MutationObserver(() => {
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
    const script = document.createElement('script');
    script.textContent = 'window.alert = window.confirm = function() {return true;}';
    document.body.appendChild(script);
  });
  window.addEventListener('load', function() {
    // link
    const div = document.createElement('div');
    div.setAttribute('class', 'itanywhere-link');
    div.appendChild(document.createTextNode('Open in:'));
    const translate = document.createElement('a');
    translate.textContent = 'Google Translate';
    translate.href = '#';
    translate.addEventListener('click', function() {
      window.top.postMessage({
        cmd: 'idanywhere-open-translate'
      }, '*');
      window.top.postMessage({
        cmd: 'idanywhere-hide'
      }, '*');
    });
    const define = document.createElement('a');
    define.textContent = 'Google Search';
    define.href = '#';
    define.addEventListener('click', function() {
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
