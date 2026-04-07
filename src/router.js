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
    if (Object.prototype.hasOwnProperty.call(routes, route)) routes[route](route);
    else if (Object.prototype.hasOwnProperty.call(routes, '*')) routes['*'](route);
  }

  window.addEventListener('hashchange', handleRouteChange);

  return { navigate, getCurrentRoute, on, onRoute, handleRouteChange };
})();
