chrome.runtime.sendMessage({
  method: 'extend'
}, prefs => {
  if (!prefs) {
    return;
  }
  if (prefs.permanent !== true) {
    addEventListener('blur', () => chrome.runtime.sendMessage({
      method: 'close'
    }));
  }
  const code = prefs['translate-styles'];
  if (code) {
    const style = document.createElement('style');
    style.textContent = code;
    document.documentElement.appendChild(style);
  }

  if (prefs.scale !== 1.0 && prefs.scale !== 1) {
    document.documentElement.style.transform = `scale(${prefs.scale})`;
    document.documentElement.style['transform-origin'] = '0 0';
    document.documentElement.style.width = `${1 / prefs.scale * 100}%`;
  }

  addEventListener('keyup', e => {
    if (e.code === 'Escape') {
      chrome.runtime.sendMessage({
        method: 'close'
      });
    }
  });
});
