import { defineConfig, type Plugin } from 'vite';
import { specifyJsSeoPlugin } from '@asymmetric-effort/specifyjs/build';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const allRoutes = [
  '/#/',
  '/#/economy', '/#/economy/growth', '/#/economy/indicators', '/#/economy/unemployment', '/#/economy/markets', '/#/economy/about',
  '/#/presidential', '/#/presidential/growth', '/#/presidential/markets', '/#/presidential/fiscal', '/#/presidential/about',
  '/#/sentiment', '/#/sentiment/approval', '/#/sentiment/economic', '/#/sentiment/media', '/#/sentiment/society', '/#/sentiment/network', '/#/sentiment/about',
  '/#/cybersecurity', '/#/cybersecurity/threats', '/#/cybersecurity/botnets', '/#/cybersecurity/cves', '/#/cybersecurity/about',
  '/#/energy', '/#/energy/us-markets', '/#/energy/intl-markets', '/#/energy/supply-demand', '/#/energy/events', '/#/energy/forecasts', '/#/energy/prices-map', '/#/energy/change-map', '/#/energy/about',
  '/#/west-texas', '/#/west-texas/unemployment', '/#/west-texas/income', '/#/west-texas/gdp', '/#/west-texas/about',
];

/**
 * Vite plugin to bridge hook state across SpecifyJS's separate ESM bundles.
 *
 * SpecifyJS ships hooks (useState etc.) and the DOM reconciler as separate ESM files.
 * In source they share a module-scoped `currentDispatcher` variable, but in the
 * published ESM bundles each has its own copy. The DOM reconciler never installs
 * a dispatcher because in the bundled form, hooks use inline shims.
 *
 * Fix: We patch the DOM module's function-component handler to set a globalThis
 * dispatcher before calling component functions, and patch all hook shims to
 * read from that globalThis dispatcher.
 */
function specifyJsHookBridgePlugin(): Plugin {
  return {
    name: 'specifyjs-hook-bridge',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@asymmetric-effort/specifyjs/dist/specifyjs')) return null;

      let result = code;

      if (id.includes('specifyjs-dom')) {
        // PATCH 1: The DOM module's function-component handler calls v() then n(e.pendingProps).
        // We inject hook state management around the component call.
        // Pattern: v();const n=e.type;...n(e.pendingProps)...v()
        // We wrap the component call n(e.pendingProps) with dispatcher install/uninstall.
        //
        // The actual pattern in minified code for the function component case:
        // case 0:!function(e){v();const n=e.type;...(n(e.pendingProps),v());const t=n(e.pendingProps),...v(),...
        //
        // We replace the full case 0 handler to inject hooks around component calls.

        // Inject a hook state system at the top of the DOM module
        const hookSystem = `
;var __hooks_fiber = null;
var __hooks_queue = null;
var __hooks_index = 0;
function __setFiber(f) {
  __hooks_fiber = f;
  __hooks_index = 0;
  __hooks_queue = f ? (f.memoizedState || []) : null;
}
function __allocHook(init) {
  if (!__hooks_fiber) throw new Error("Invalid hook call. Hooks can only be called inside the body of a function component.");
  if (__hooks_index >= __hooks_queue.length) __hooks_queue.push(init());
  return __hooks_index++;
}
globalThis.__specifyjs_hooks = {
  fiber: () => __hooks_fiber,
  queue: () => __hooks_queue,
  alloc: __allocHook,
  setFiber: __setFiber,
  saveFiber: () => { if (__hooks_fiber) __hooks_fiber.memoizedState = __hooks_queue; }
};
`;
        // Inject BEFORE the component call: set the fiber for hooks
        // AFTER: save hooks state back to fiber
        // Pattern: const t=n(e.pendingProps)
        // Replace with: __setFiber(e); const t=n(e.pendingProps); __saveFiber(); __setFiber(null);
        result = hookSystem + result;

        // Patch each occurrence of component calls in reconciler
        // The pattern: const t=n(e.pendingProps),l=A()
        result = result.replace(
          /const t=n\(e\.pendingProps\),l=A\(\)/g,
          'globalThis.__specifyjs_hooks.setFiber(e);const t=n(e.pendingProps);globalThis.__specifyjs_hooks.saveFiber();globalThis.__specifyjs_hooks.setFiber(null);const l=A()'
        );
      }

      // PATCH 2: In ALL modules, replace the hook shim that throws with one that
      // delegates to our globalThis hook system
      result = result.replace(
        /function\s+(\w)\(\)\{throw\s+new\s+Error\("Invalid hook call\. Hooks can only be called inside the body of a function component\."\)\}/g,
        (match, fnName) => {
          return `function ${fnName}(){
  var _g = globalThis.__specifyjs_hooks;
  if (!_g || !_g.fiber()) throw new Error("Invalid hook call. Hooks can only be called inside the body of a function component.");
  return {
    useState: function(init) {
      var _q = _g.queue(), _i = _g.alloc(function(){return {value: typeof init === 'function' ? init() : init, setter: null}});
      var _h = _q[_i];
      if (!_h.setter) {
        var _fi = _g.fiber();
        _h.setter = function(v) {
          _h.value = typeof v === 'function' ? v(_h.value) : v;
          if (globalThis.__specifyjs_rerender) queueMicrotask(globalThis.__specifyjs_rerender);
        };
      }
      return [_h.value, _h.setter];
    },
    useEffect: function(create, deps) {
      var _q = _g.queue(), _i = _g.alloc(function(){return {deps: undefined, cleanup: undefined}});
      var _h = _q[_i];
      var changed = !_h.deps || !deps || deps.length !== _h.deps.length || deps.some(function(d,j){return d !== _h.deps[j]});
      if (changed) {
        if (_h.cleanup) try { _h.cleanup() } catch(e){}
        _h.deps = deps ? deps.slice() : undefined;
        Promise.resolve().then(function(){
          var ret = create();
          _h.cleanup = typeof ret === 'function' ? ret : undefined;
        });
      }
    },
    useCallback: function(cb, deps) {
      var _q = _g.queue(), _i = _g.alloc(function(){return {cb: cb, deps: deps}});
      var _h = _q[_i];
      var changed = !_h.deps || deps.some(function(d,j){return d !== _h.deps[j]});
      if (changed) { _h.cb = cb; _h.deps = deps; }
      return _h.cb;
    },
    useMemo: function(factory, deps) {
      var _q = _g.queue(), _i = _g.alloc(function(){return {value: factory(), deps: deps}});
      var _h = _q[_i];
      var changed = !_h.deps || deps.some(function(d,j){return d !== _h.deps[j]});
      if (changed) { _h.value = factory(); _h.deps = deps; }
      return _h.value;
    },
    useRef: function(init) {
      var _q = _g.queue(), _i = _g.alloc(function(){return {current: init}});
      return _q[_i];
    },
    useId: function() {
      var _q = _g.queue(), _i = _g.alloc(function(){return {id: 'sjs-' + Math.random().toString(36).substr(2,9)}});
      return _q[_i].id;
    },
    useContext: function(ctx) { return ctx._currentValue; },
    useReducer: function(reducer, init, initFn) {
      var _q = _g.queue(), _i = _g.alloc(function(){return {value: initFn ? initFn(init) : init, setter: null}});
      var _h = _q[_i];
      if (!_h.setter) {
        var _fi = _g.fiber();
        _h.setter = function(action) {
          _h.value = reducer(_h.value, action);
          if (globalThis.__specifyjs_rerender) queueMicrotask(globalThis.__specifyjs_rerender);
        };
      }
      return [_h.value, _h.setter];
    }
  };
}`;
        }
      );

      if (result === code) return null;
      return result;
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      'specifyjs': '@asymmetric-effort/specifyjs',
    },
    dedupe: ['@asymmetric-effort/specifyjs'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    specifyJsHookBridgePlugin(),
    specifyJsSeoPlugin({
      siteUrl: 'https://samcaldwell.info',
      title: 'samcaldwell.info \u2014 Analytics',
      description: 'Interactive visual analyses of public topics \u2014 US economy, presidential comparisons, public sentiment, cybersecurity threats, energy markets, and West Texas regional data.',
      routes: allRoutes,
      author: 'Sam Caldwell',
      license: 'MIT',
      repository: 'https://github.com/sam-caldwell/samcaldwell.info',
    }),
    // specifyJsNoscriptPlugin deferred — closeBundle hook runs before Vite writes index.html.
  ],
});
