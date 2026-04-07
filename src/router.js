window.UOGA_ROUTER = (() => {
  const routes = {};
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
    routes[path] = handler;
  }

  function onRoute(callback) {
    callbacks.push(callback);
  }

  function handleRouteChange() {
    const route = getCurrentRoute();
    callbacks.forEach(cb => cb(route));
    const handler = Object.prototype.hasOwnProperty.call(routes, route) ? routes[route] : null;
    const fallback = Object.prototype.hasOwnProperty.call(routes, '*') ? routes['*'] : null;
    if (typeof handler === 'function') handler(route);
    else if (typeof fallback === 'function') fallback(route);
  }

  window.addEventListener('hashchange', handleRouteChange);

  return { navigate, getCurrentRoute, on, onRoute, handleRouteChange };
})();
