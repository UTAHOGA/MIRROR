window.UOGA_ROUTER = (() => {
  const routes = new Map();
  const callbacks = [];

  function navigate(path) {
    const normalizedPath = path.startsWith('#') ? path : '#' + path;
    window.location.hash = normalizedPath.replace(/^#\/?/, '');
    handleRouteChange();
  }

  function getCurrentRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return hash || '/';
  }

  function on(path, handler) {
    routes.set(path, handler);
  }

  function onRoute(callback) {
    callbacks.push(callback);
  }

  function handleRouteChange() {
    const route = getCurrentRoute();
    callbacks.forEach(cb => cb(route));
    const handler = routes.get(route) ?? routes.get('*');
    if (typeof handler === 'function') handler(route);
  }

  window.addEventListener('hashchange', handleRouteChange);

  return { navigate, getCurrentRoute, on, onRoute, handleRouteChange };
})();
