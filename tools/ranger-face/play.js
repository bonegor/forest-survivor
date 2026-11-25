async function startRun(name) {
  // Settings, seen marks and run rewards last for this tab's playthrough.
  const values = new Map();
  const memory = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  Object.defineProperty(window, 'localStorage', { value: memory });
  const { saveBox, store } = await import('./js/engine/storage.js');
  saveBox.read = memory.getItem;
  saveBox.write = (key, value) => {
    if (value == null) memory.removeItem(key);
    else memory.setItem(key, value);
    return true;
  };
  store.init = () => {
    store.profile.heroes.push('archer');
    store.saveLocal();
    return store;
  };
  document.title = name + ' · Forest Survivor';
  await import('./js/main.js');
  const { app } = window.__fs;
  Object.assign(app.choice, { hero: 'archer', mode: 's15', diff: 'easy', map: 'forest' });
  app.startRun();
}

const variant = location.pathname.split('/')[2];
const labels = { current: 'Original Ranger', remake: 'Ranger remake' };
const host = await fetch('/', { method: 'HEAD' });
// Earlier local servers continue to serve this bootstrap from disk.
if (!host.headers.has('X-Ranger-Review') || !Object.hasOwn(labels, variant)) {
  const path = Object.hasOwn(labels, variant) ? '/play/' + variant + '/' : '/';
  location.replace(new URL(path, 'http://127.0.0.1:3111'));
} else {
  await startRun(labels[variant]);
}
