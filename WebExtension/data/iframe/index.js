'use strict';

chrome.runtime.sendMessage({
  method: 'install'
}, () => {
  // iframe loading
  const args = new URLSearchParams(location.search);
  const iframe = document.querySelector('iframe');
  iframe.addEventListener('load', () => {
    document.body.dataset.mode = 'ready';
  });
  iframe.src = args.get('rd');

  // disable resizing
  document.addEventListener('click', e => {
    if (e.target === document.documentElement) {
      chrome.runtime.sendMessage({
        method: 'disable-auto-resizing'
      });
    }
    const cmd = e.target.dataset.cmd;
    if (cmd === 'open-translate') {
      chrome.runtime.sendMessage({
        method: 'open',
        url: args.get('rd').replace('/m/', '/')
      });
    }
    else if (cmd === 'open-search') {
      chrome.runtime.sendMessage({
        method: 'open',
        url: 'https://www.google.com/search?q=define ' + encodeURIComponent(args.get('phrase'))
      });
    }
  });
});
