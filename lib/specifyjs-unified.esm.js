// src/shared/types.ts
var SPEC_ELEMENT_TYPE = Symbol.for("spec.element");
var SPEC_FRAGMENT_TYPE = Symbol.for("spec.fragment");
var SPEC_PORTAL_TYPE = Symbol.for("spec.portal");
var SPEC_PROVIDER_TYPE = Symbol.for("spec.provider");
var SPEC_CONSUMER_TYPE = Symbol.for("spec.consumer");
var SPEC_FORWARD_REF_TYPE = Symbol.for("spec.forward_ref");
var SPEC_MEMO_TYPE = Symbol.for("spec.memo");
var SPEC_LAZY_TYPE = Symbol.for("spec.lazy");
var SPEC_SUSPENSE_TYPE = Symbol.for("spec.suspense");
var SPEC_STRICT_MODE_TYPE = Symbol.for("spec.strict_mode");
var SPEC_PROFILER_TYPE = Symbol.for("spec.profiler");

// src/core/create-element.ts
function createElement(type, config, ...children) {
  let key = null;
  let ref = null;
  const props = {};
  if (config != null) {
    if (config.key !== void 0) {
      key = "" + config.key;
    }
    if (config.ref !== void 0) {
      ref = config.ref;
    }
    for (const propName in config) {
      if (Object.prototype.hasOwnProperty.call(config, propName) && propName !== "key" && propName !== "ref" && propName !== "__proto__" && propName !== "constructor" && propName !== "prototype") {
        props[propName] = config[propName];
      }
    }
  }
  if (children.length === 1) {
    props.children = children[0];
  } else if (children.length > 1) {
    props.children = children;
  }
  if (typeof type === "function" && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (const propName of Object.keys(defaultProps)) {
      if (propName !== "__proto__" && propName !== "constructor" && props[propName] === void 0) {
        props[propName] = defaultProps[propName];
      }
    }
  }
  return {
    $$typeof: SPEC_ELEMENT_TYPE,
    type,
    props,
    key,
    ref
  };
}
function createFactory(type) {
  return (config, ...children) => createElement(type, config ?? null, ...children);
}

// src/core/fragment.ts
var Fragment = SPEC_FRAGMENT_TYPE;

// src/context/create-context.ts
function createContext(defaultValue) {
  const context = {
    $$typeof: Symbol.for("spec.context"),
    Provider: null,
    Consumer: null,
    _currentValue: defaultValue,
    _defaultValue: defaultValue
  };
  const provider = {
    $$typeof: SPEC_PROVIDER_TYPE,
    _context: context
  };
  const consumer = {
    $$typeof: SPEC_CONSUMER_TYPE,
    _context: context
  };
  context.Provider = provider;
  context.Consumer = consumer;
  return context;
}

// src/core/create-ref.ts
function createRef() {
  return { current: null };
}

// src/core/forward-ref.ts
function forwardRef(render2) {
  return {
    $$typeof: SPEC_FORWARD_REF_TYPE,
    render: render2,
    displayName: render2.displayName || render2.name || "ForwardRef"
  };
}

// src/core/memo.ts
function memo(component, compare) {
  return {
    $$typeof: SPEC_MEMO_TYPE,
    type: component,
    compare: compare || null,
    displayName: component.displayName || component.name || "Memo"
  };
}

// src/core/lazy.ts
function lazy(factory) {
  const payload = {
    _status: "pending",
    _result: void 0
  };
  const init = () => {
    if (payload._status === "resolved") {
      return payload._result;
    }
    if (payload._status === "rejected") {
      throw payload._result;
    }
    const promise = factory();
    payload._status = "pending";
    promise.then(
      (module) => {
        payload._status = "resolved";
        payload._result = module.default;
      },
      (error2) => {
        payload._status = "rejected";
        payload._result = error2;
      }
    );
    throw promise;
  };
  return {
    $$typeof: SPEC_LAZY_TYPE,
    _payload: payload,
    _init: init,
    displayName: "Lazy"
  };
}

// src/core/is-valid-element.ts
function isValidElement(object) {
  return typeof object === "object" && object !== null && object.$$typeof === SPEC_ELEMENT_TYPE;
}

// src/core/clone-element.ts
function cloneElement(element, config, ...children) {
  if (!isValidElement(element)) {
    throw new Error("cloneElement: argument must be a valid SpecifyJS element");
  }
  let key = element.key;
  let ref = element.ref;
  const props = { ...element.props };
  if (config != null) {
    if (config.key !== void 0) {
      key = "" + config.key;
    }
    if (config.ref !== void 0) {
      ref = config.ref;
    }
    for (const propName in config) {
      if (Object.prototype.hasOwnProperty.call(config, propName) && propName !== "key" && propName !== "ref" && propName !== "__proto__" && propName !== "constructor" && propName !== "prototype") {
        props[propName] = config[propName];
      }
    }
  }
  if (children.length === 1) {
    props.children = children[0];
  } else if (children.length > 1) {
    props.children = children;
  }
  return {
    $$typeof: SPEC_ELEMENT_TYPE,
    type: element.type,
    props,
    key,
    ref
  };
}

// src/core/children.ts
function flattenChildren(children) {
  const result = [];
  const stack = [children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        stack.push(node[i]);
      }
    } else {
      result.push(node);
    }
  }
  return result;
}
function mapChildren(children, fn) {
  const flat = flattenChildren(children);
  const result = [];
  for (let i = 0; i < flat.length; i++) {
    const child = flat[i];
    if (child == null || typeof child === "boolean") {
      continue;
    }
    result.push(fn(child, i));
  }
  return result;
}
function forEachChildren(children, fn) {
  const flat = flattenChildren(children);
  let index = 0;
  for (const child of flat) {
    if (child == null || typeof child === "boolean") {
      continue;
    }
    fn(child, index++);
  }
}
function countChildren(children) {
  const flat = flattenChildren(children);
  let count = 0;
  for (const child of flat) {
    if (child != null && typeof child !== "boolean") {
      count++;
    }
  }
  return count;
}
function onlyChild(children) {
  if (!isValidElement(children)) {
    throw new Error("Children.only: expected a single SpecifyJS element child");
  }
  return children;
}
function toArray(children) {
  const flat = flattenChildren(children);
  return flat.filter((child) => child != null && typeof child !== "boolean");
}
var Children = {
  map: mapChildren,
  forEach: forEachChildren,
  count: countChildren,
  only: onlyChild,
  toArray
};

// src/components/component.ts
var Component = class {
  constructor(props) {
    // Set by the reconciler
    this._fiber = null;
    this._pendingState = [];
    this._forceUpdate = false;
    this.props = props;
    this.state = {};
    this.context = void 0;
  }
  setState(updater, callback) {
    this._pendingState.push(updater);
    this._enqueueUpdate(callback);
  }
  forceUpdate(callback) {
    this._forceUpdate = true;
    this._enqueueUpdate(callback);
  }
  render() {
    return null;
  }
  // Internal: will be replaced by the reconciler
  _enqueueUpdate(_callback) {
  }
};
Component.prototype.isSpecComponent = true;
var PureComponent = class extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    return !shallowEqual(this.props, nextProps) || !shallowEqual(this.state, nextState);
  }
};
PureComponent.prototype.isPureSpecComponent = true;
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  const objA = a;
  const objB = b;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) {
      return false;
    }
  }
  return true;
}

// src/components/error-boundary.ts
var ErrorBoundary = class extends Component {
  static getDerivedStateFromError(error2) {
    return { hasError: true, error: error2 };
  }
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  componentDidCatch(error2, info) {
    this.props.onError?.(error2, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children ?? null;
  }
};

// src/hooks/use-head.ts
function useHead(head) {
  useEffect(() => {
    const cleanup = [];
    const prevTitle = document.title;
    if (head.title) {
      document.title = head.title;
      cleanup.push(() => {
        document.title = prevTitle;
      });
    }
    if (head.description) {
      cleanup.push(setMeta("name", "description", head.description));
    }
    if (head.keywords) {
      cleanup.push(setMeta("name", "keywords", head.keywords));
    }
    if (head.author) {
      cleanup.push(setMeta("name", "author", head.author));
    }
    if (head.canonical) {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = head.canonical;
      document.head.appendChild(link);
      cleanup.push(() => link.remove());
    }
    if (head.og) {
      for (const [key, value] of Object.entries(head.og)) {
        cleanup.push(setMeta("property", `og:${key}`, value));
      }
    }
    if (head.twitter) {
      for (const [key, value] of Object.entries(head.twitter)) {
        cleanup.push(setMeta("name", `twitter:${key}`, value));
      }
    }
    if (head.httpEquiv) {
      const httpEquivMap = {
        csp: "Content-Security-Policy",
        referrer: "Referrer-Policy",
        contentType: "X-Content-Type-Options",
        frameOptions: "X-Frame-Options",
        cacheControl: "Cache-Control"
      };
      for (const [key, value] of Object.entries(head.httpEquiv)) {
        if (value === void 0) continue;
        const httpEquivName = httpEquivMap[key] ?? key;
        cleanup.push(setHttpEquivMeta(httpEquivName, value));
      }
    }
    if (head.meta) {
      for (const tag of head.meta) {
        if (tag.name) {
          cleanup.push(setMeta("name", tag.name, tag.content));
        } else if (tag.property) {
          cleanup.push(setMeta("property", tag.property, tag.content));
        }
      }
    }
    return () => {
      for (const fn of cleanup) fn();
    };
  }, [
    head.title,
    head.description,
    head.keywords,
    head.author,
    head.canonical,
    head.og,
    head.twitter,
    head.httpEquiv,
    head.meta
  ]);
}
function escapeCssAttr(s) {
  return s.replace(/["\\]/g, "\\$&");
}
function setMeta(attr, key, content) {
  const selector = `meta[${attr}="${escapeCssAttr(key)}"]`;
  let el = document.querySelector(selector);
  const existed = el !== null;
  const prevContent = el?.content;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
  return () => {
    if (existed && prevContent !== void 0) {
      el.content = prevContent;
    } else if (!existed) {
      el.remove();
    }
  };
}
function setHttpEquivMeta(httpEquiv, content) {
  const selector = `meta[http-equiv="${escapeCssAttr(httpEquiv)}"]`;
  let el = document.querySelector(selector);
  const existed = el !== null;
  const prevContent = el?.content;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("http-equiv", httpEquiv);
    document.head.appendChild(el);
  }
  el.content = content;
  return () => {
    if (existed && prevContent !== void 0) {
      el.content = prevContent;
    } else if (!existed) {
      el.remove();
    }
  };
}

// src/hooks/index.ts
var currentDispatcher = null;
function __setDispatcher(dispatcher) {
  currentDispatcher = dispatcher;
}
function resolveDispatcher() {
  if (currentDispatcher === null) {
    throw new Error(
      "Invalid hook call. Hooks can only be called inside the body of a function component."
    );
  }
  return currentDispatcher;
}
function useState(initialState) {
  return resolveDispatcher().useState(initialState);
}
function useEffect(create, deps) {
  return resolveDispatcher().useEffect(create, deps);
}
function useContext(context) {
  return resolveDispatcher().useContext(context);
}
function useReducer(reducer, initialArg, init) {
  return resolveDispatcher().useReducer(reducer, initialArg, init);
}
function useCallback(callback, deps) {
  return resolveDispatcher().useCallback(callback, deps);
}
function useMemo(factory, deps) {
  return resolveDispatcher().useMemo(factory, deps);
}
function useRef(initialValue) {
  return resolveDispatcher().useRef(initialValue);
}
function useImperativeHandle(ref, createHandle, deps) {
  return resolveDispatcher().useImperativeHandle(ref, createHandle, deps);
}
function useLayoutEffect(create, deps) {
  return resolveDispatcher().useLayoutEffect(create, deps);
}
function useDebugValue(value, format) {
  return resolveDispatcher().useDebugValue(value, format);
}
function useId() {
  return resolveDispatcher().useId();
}
function useDeferredValue(value) {
  return resolveDispatcher().useDeferredValue(value);
}
function useTransition() {
  return resolveDispatcher().useTransition();
}
function useSyncExternalStore(subscribe2, getSnapshot2, getServerSnapshot) {
  return resolveDispatcher().useSyncExternalStore(subscribe2, getSnapshot2, getServerSnapshot);
}
function useInsertionEffect(create, deps) {
  return resolveDispatcher().useInsertionEffect(create, deps);
}

// src/components/suspense.ts
var Suspense = SPEC_SUSPENSE_TYPE;

// src/components/strict-mode.ts
var StrictMode = SPEC_STRICT_MODE_TYPE;

// src/components/profiler.ts
var Profiler = SPEC_PROFILER_TYPE;

// src/router/router-context.ts
var RouterContext = createContext({
  pathname: "/",
  params: {},
  /* v8 ignore next 3 */
  navigate: () => {
    throw new Error("useNavigate must be used inside a <Router> component.");
  },
  basePath: ""
});

// src/router/router-store.ts
function getHashPath() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const path = hash.replace(/^#\/?/, "/");
  return path === "" ? "/" : path;
}
var currentSnapshot = {
  pathname: getHashPath(),
  /* v8 ignore next */
  hash: typeof window !== "undefined" ? window.location.hash : ""
};
var listeners = /* @__PURE__ */ new Set();
function emitChange() {
  currentSnapshot = {
    pathname: getHashPath(),
    /* v8 ignore next */
    hash: typeof window !== "undefined" ? window.location.hash : ""
  };
  for (const listener of listeners) {
    listener();
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", emitChange);
}
function subscribe(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
function getSnapshot() {
  return currentSnapshot;
}
function navigate(to, options) {
  const hashPath = to.startsWith("#") ? to : "#" + to;
  if (options?.replace) {
    const url = window.location.pathname + window.location.search + hashPath;
    window.history.replaceState(null, "", url);
  } else {
    window.location.hash = hashPath;
  }
  emitChange();
}

// src/router/router-component.ts
function Router(props) {
  const [pathname, setPathname] = useState(() => getSnapshot().pathname);
  useEffect(() => {
    setPathname(getSnapshot().pathname);
    const unsubscribe = subscribe(() => {
      setPathname(getSnapshot().pathname);
    });
    return unsubscribe;
  }, []);
  const nav = useCallback((...args) => {
    navigate(args[0], args[1]);
  }, []);
  const value = useMemo(
    () => ({
      pathname,
      params: {},
      navigate: nav,
      basePath: ""
    }),
    [pathname, nav]
  );
  return createElement(RouterContext.Provider, { value }, props.children);
}

// src/router/match-path.ts
function stripTrailingSlashes(s) {
  let end = s.length;
  while (end > 1 && s.charCodeAt(end - 1) === 47) {
    end--;
  }
  return end === s.length ? s : s.slice(0, end);
}
function matchPath(pattern, pathname, options) {
  const exact = options?.exact ?? false;
  const normalizedPattern = pattern === "/" ? "/" : stripTrailingSlashes(pattern);
  const normalizedPath = pathname === "/" ? "/" : stripTrailingSlashes(pathname);
  if (normalizedPattern === "/") {
    const isExact2 = normalizedPath === "/";
    if (exact && !isExact2) {
      return null;
    }
    return {
      params: {},
      isExact: isExact2,
      path: pattern,
      url: "/"
    };
  }
  const patternSegments = normalizedPattern.split("/").filter(Boolean);
  const pathSegments = normalizedPath.split("/").filter(Boolean);
  const hasWildcard = patternSegments[patternSegments.length - 1] === "*";
  if (!hasWildcard && exact && pathSegments.length !== patternSegments.length) {
    return null;
  }
  if (!hasWildcard && pathSegments.length < patternSegments.length) {
    return null;
  }
  const params = {};
  const matchedSegments = [];
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i];
    if (patternSeg === "*") {
      const remaining = pathSegments.slice(i).join("/");
      params["*"] = remaining;
      return {
        params,
        isExact: true,
        path: pattern,
        url: "/" + pathSegments.join("/")
      };
    }
    if (i >= pathSegments.length) {
      return null;
    }
    const pathSeg = pathSegments[i];
    if (patternSeg.startsWith(":")) {
      const paramName = patternSeg.slice(1);
      params[paramName] = decodeURIComponent(pathSeg);
      matchedSegments.push(pathSeg);
      continue;
    }
    if (patternSeg.toLowerCase() !== pathSeg.toLowerCase()) {
      return null;
    }
    matchedSegments.push(pathSeg);
  }
  const matchedUrl = "/" + matchedSegments.join("/");
  const isExact = pathSegments.length === patternSegments.length;
  if (exact && !isExact) {
    return null;
  }
  return {
    params,
    isExact,
    path: pattern,
    url: matchedUrl
  };
}

// src/router/route-component.ts
function Route(props) {
  const router = useContext(RouterContext);
  const fullPattern = router.basePath + props.path;
  const match = matchPath(fullPattern, router.pathname, {
    exact: props.exact ?? false
  });
  const nestedValue = useMemo(
    () => ({
      pathname: router.pathname,
      params: {
        ...router.params,
        ...match ? match.params : {}
      },
      navigate: router.navigate,
      basePath: match ? match.url : router.basePath
    }),
    [router.pathname, router.navigate, router.params, router.basePath, match]
  );
  if (!match) return null;
  for (const key of Object.keys(router.params)) {
    if (!(key in nestedValue.params)) {
      nestedValue.params[key] = router.params[key];
    }
  }
  const content = props.component ? createElement(props.component, { ...nestedValue.params }) : props.children;
  return createElement(RouterContext.Provider, { value: nestedValue }, content);
}

// src/router/link-component.ts
function Link(props) {
  const { to, className, activeClassName, exact, children, ...rest } = props;
  const router = useContext(RouterContext);
  const isActive = matchPath(to, router.pathname, { exact: exact ?? false }) !== null;
  const handleClick = useCallback(
    ((...args) => {
      const e = args[0];
      e.preventDefault();
      router.navigate(to);
    }),
    [to, router.navigate]
  );
  const cls = [className, isActive ? activeClassName : null].filter(Boolean).join(" ") || void 0;
  return createElement(
    "a",
    {
      ...rest,
      href: "#" + to,
      onClick: handleClick,
      className: cls
    },
    children
  );
}

// src/router/use-router.ts
function useRouter() {
  return useContext(RouterContext);
}

// src/router/use-params.ts
function useParams() {
  return useContext(RouterContext).params;
}

// src/router/use-navigate.ts
function useNavigate() {
  return useContext(RouterContext).navigate;
}

// src/core/lanes.ts
var SyncLane = (
  /* .............. */
  1
);
var InputContinuousLane = (
  /* ... */
  2
);
var DefaultLane = (
  /* ........... */
  4
);
var TransitionLane1 = (
  /* ....... */
  8
);
var TransitionLane2 = (
  /* ....... */
  16
);
var RetryLane = (
  /* ............. */
  32
);
var NonIdleLanes = SyncLane | InputContinuousLane | DefaultLane | TransitionLane1 | TransitionLane2 | RetryLane;
function mergeLanes(a, b) {
  return a | b;
}
var nextTransitionLane = TransitionLane1;
function claimNextTransitionLane() {
  const lane = nextTransitionLane;
  nextTransitionLane = lane === TransitionLane1 ? TransitionLane2 : TransitionLane1;
  return lane;
}

// src/core/transitions.ts
var currentUpdateLane = DefaultLane;
var isTransitionPending = false;
var isFlushSyncContext = false;
var transitionCallbacks = [];
function requestUpdateLane() {
  if (isFlushSyncContext) {
    return SyncLane;
  }
  return currentUpdateLane;
}
function enterFlushSyncContext() {
  isFlushSyncContext = true;
}
function exitFlushSyncContext() {
  isFlushSyncContext = false;
}
function startTransition(callback) {
  const prevLane = currentUpdateLane;
  const prevPending = isTransitionPending;
  currentUpdateLane = claimNextTransitionLane();
  isTransitionPending = true;
  try {
    callback();
  } finally {
    currentUpdateLane = prevLane;
    isTransitionPending = prevPending;
    flushTransitions();
  }
}
function flushTransitions() {
  const callbacks = transitionCallbacks;
  transitionCallbacks = [];
  for (const cb of callbacks) {
    cb();
  }
}

// src/core/scheduler.ts
var MAX_PENDING_TASKS = 1e4;
var isBatchingUpdates = false;
var pendingTasks = [];
function scheduleUpdate(task) {
  if (isBatchingUpdates) {
    if (pendingTasks.length >= MAX_PENDING_TASKS) {
      if (typeof console !== "undefined")
        console.warn(
          "[SpecifyJS] Scheduler: pending task queue exceeded 10000 \u2014 dropping oldest tasks"
        );
      pendingTasks = pendingTasks.slice(-Math.floor(MAX_PENDING_TASKS / 2));
    }
    pendingTasks.push(task);
    return;
  }
  task();
}
function flushPendingTasks() {
  const tasks = pendingTasks;
  pendingTasks = [];
  for (const task of tasks) {
    task();
  }
}
function scheduleMicrotask(fn) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(fn);
  } else {
    Promise.resolve().then(fn);
  }
}

// src/shared/act.ts
function act(callback) {
  const result = callback();
  flushPendingTasks();
  if (result && typeof result.then === "function") {
    result.then(() => {
      flushPendingTasks();
    });
  }
}

// src/shared/secure-fetch.ts
function assertSecureUrl(url) {
  if (url.startsWith("//")) {
    throw new Error(
      `[SpecifyJS] Protocol-relative URL rejected: "${url}". Use an explicit https:// prefix.`
    );
  }
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
    return;
  }
  if (url.startsWith("data:")) {
    return;
  }
  let parsed;
  try {
    parsed = new URL(url, typeof window !== "undefined" ? window.location.href : void 0);
  } catch {
    return;
  }
  if (parsed.protocol === "https:") {
    return;
  }
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    return;
  }
  throw new Error(
    `[SpecifyJS] Insecure URL rejected: "${url}". SpecifyJS enforces HTTPS-only for all network requests. Use https:// or a relative URL. Localhost URLs are allowed for development.`
  );
}
function secureFetch(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  assertSecureUrl(url);
  return fetch(input, init);
}

// src/shared/component-registry.ts
var typeMap = /* @__PURE__ */ new Map();
var nextTypeIndex = 0;
var enabled = true;
function setComponentIdsEnabled(value) {
  enabled = value;
}
function registerComponentInstance(componentName) {
  if (!enabled) return "";
  let entry = typeMap.get(componentName);
  if (!entry) {
    entry = { name: componentName, index: nextTypeIndex++, instanceCount: 0 };
    typeMap.set(componentName, entry);
    updateGlobalLookup();
  }
  const instanceId = entry.instanceCount++;
  return `s-${entry.index}-${instanceId}`;
}
function resolveComponentId(id) {
  const match = id.match(/^s-(\d+)-(\d+)$/);
  if (!match || !match[1] || !match[2]) return null;
  const typeIndex = parseInt(match[1], 10);
  const instanceId = parseInt(match[2], 10);
  for (const entry of typeMap.values()) {
    if (entry.index === typeIndex) {
      return { typeName: entry.name, typeIndex, instanceId };
    }
  }
  return null;
}
function getComponentTypeTable() {
  return typeMap;
}
function updateGlobalLookup() {
  if (typeof globalThis !== "undefined") {
    const lookup = {};
    for (const entry of typeMap.values()) {
      lookup[entry.index] = entry.name;
    }
    globalThis.__SPECIFYJS_COMPONENTS__ = lookup;
  }
}
function getComponentName(type) {
  if (typeof type === "string") return type;
  if (typeof type === "function") return type.name || "Anonymous";
  if (type === null || type === void 0) return "Unknown";
  return "Component";
}

// src/features/feature-flags.ts
var FeatureFlagContext = createContext({
  flags: {},
  isEnabled: () => false,
  setFlag: () => {
  },
  loading: false
});
function FeatureFlagProvider(props) {
  const [flags, setFlags] = useState(() => ({ ...props.defaults }));
  const [loading, setLoading] = useState(!!props.url);
  useEffect(() => {
    if (!props.url) return;
    let cancelled = false;
    setLoading(true);
    secureFetch(props.url).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }).then((json) => {
      if (!cancelled && typeof json === "object" && json !== null) {
        const safe = {};
        for (const k of Object.keys(json)) {
          if (k !== "__proto__" && k !== "constructor" && k !== "prototype") {
            safe[k] = json[k] === true;
          }
        }
        setFlags((prev) => ({ ...prev, ...safe }));
      }
      if (!cancelled) setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [props.url]);
  const isEnabled = useCallback(
    ((...args) => {
      const flag = args[0];
      return flags[flag] === true;
    }),
    [flags]
  );
  const setFlag = useCallback(
    ((...args) => {
      const flag = args[0];
      const enabled2 = args[1];
      setFlags((prev) => ({ ...prev, [flag]: enabled2 }));
    }),
    []
  );
  const value = {
    flags,
    isEnabled,
    setFlag,
    loading
  };
  return createElement(FeatureFlagContext.Provider, { value }, props.children);
}
function FeatureGate(props) {
  const { isEnabled } = useContext(FeatureFlagContext);
  return isEnabled(props.flag) ? props.children : props.fallback ?? null;
}
function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

// src/core/fiber.ts
function getFiberTag(type) {
  if (typeof type === "string") {
    return 3 /* HostComponent */;
  }
  if (typeof type === "function") {
    if (type.prototype?.isSpecComponent) {
      return 1 /* ClassComponent */;
    }
    return 0 /* FunctionComponent */;
  }
  if (typeof type === "symbol") {
    if (type === SPEC_FRAGMENT_TYPE) return 5 /* Fragment */;
    if (type === SPEC_SUSPENSE_TYPE) return 11 /* SuspenseComponent */;
    if (type === SPEC_STRICT_MODE_TYPE) return 5 /* Fragment */;
    if (type === SPEC_PROFILER_TYPE) return 12 /* Profiler */;
    if (type === SPEC_PORTAL_TYPE) return 13 /* Portal */;
  }
  if (typeof type === "object" && type !== null) {
    const $$typeof = type.$$typeof;
    if ($$typeof === SPEC_FORWARD_REF_TYPE) return 8 /* ForwardRef */;
    if ($$typeof === SPEC_MEMO_TYPE) return 9 /* MemoComponent */;
    if ($$typeof === SPEC_PROVIDER_TYPE) return 6 /* ContextProvider */;
    if ($$typeof === SPEC_CONSUMER_TYPE) return 7 /* ContextConsumer */;
  }
  return 3 /* HostComponent */;
}
function createFiberFromElement(element, lanes = 0) {
  const tag = getFiberTag(element.type);
  return createFiber(tag, element.type, element.key, element.ref, element.props, lanes);
}
function createFiberFromText(content, lanes = 0) {
  return createFiber(
    4 /* HostText */,
    null,
    null,
    null,
    { text: content },
    lanes
  );
}
function createHostRootFiber() {
  return createFiber(2 /* HostRoot */, null, null, null, {}, 0);
}
function createFiber(tag, type, key, ref, pendingProps, lanes) {
  return {
    tag,
    type,
    key,
    ref,
    stateNode: null,
    pendingProps,
    memoizedProps: null,
    memoizedState: null,
    return: null,
    child: null,
    sibling: null,
    index: 0,
    alternate: null,
    effectTag: 0 /* NoEffect */,
    updateQueue: null,
    dependencies: null,
    lanes,
    childLanes: 0
  };
}
function createWorkInProgress(current, pendingProps) {
  let wip = current.alternate;
  if (wip === null) {
    wip = createFiber(
      current.tag,
      current.type,
      current.key,
      current.ref,
      pendingProps,
      current.lanes
    );
    wip.stateNode = current.stateNode;
    wip.alternate = current;
    current.alternate = wip;
  } else {
    wip.pendingProps = pendingProps;
    wip.effectTag = 0 /* NoEffect */;
    wip.child = null;
    wip.sibling = null;
  }
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;
  wip.updateQueue = current.updateQueue;
  wip.lanes = current.lanes;
  wip.childLanes = current.childLanes;
  return wip;
}
function coerceToFiberChildren(children) {
  const result = [];
  const stack = [children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node == null || typeof node === "boolean") continue;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        stack.push(node[i]);
      }
      continue;
    }
    if (isValidElement(node)) {
      result.push(node);
    } else if (typeof node === "string" || typeof node === "number") {
      result.push(node);
    }
  }
  return result;
}

// src/core/reconciler.ts
function reconcileChildren(returnFiber, currentFirstChild, newChildren, lanes) {
  const elements = coerceToFiberChildren(newChildren);
  if (elements.length === 0) {
    deleteRemainingChildren(returnFiber, currentFirstChild);
    return null;
  }
  if (elements.length === 1 && !Array.isArray(elements[0])) {
    return reconcileSingleChild(returnFiber, currentFirstChild, elements[0], lanes);
  }
  return reconcileChildArray(returnFiber, currentFirstChild, elements, lanes);
}
function reconcileSingleChild(returnFiber, currentFirstChild, element, lanes) {
  if (typeof element === "string" || typeof element === "number") {
    return reconcileSingleTextNode(returnFiber, currentFirstChild, element, lanes);
  }
  const key = element.key;
  let child = currentFirstChild;
  while (child !== null) {
    if (child.key === key) {
      if (isSameType(child, element)) {
        deleteRemainingChildren(returnFiber, child.sibling);
        const existing = useFiber(child, element.props);
        existing.ref = element.ref;
        existing.return = returnFiber;
        return existing;
      }
      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }
  const created = createFiberFromElement(element, lanes);
  created.ref = element.ref;
  created.return = returnFiber;
  created.effectTag = 1 /* Placement */;
  return created;
}
function reconcileSingleTextNode(returnFiber, currentFirstChild, content, lanes) {
  if (currentFirstChild !== null && currentFirstChild.tag === 4 /* HostText */) {
    deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
    const existing = useFiber(currentFirstChild, { text: content });
    existing.return = returnFiber;
    return existing;
  }
  deleteRemainingChildren(returnFiber, currentFirstChild);
  const created = createFiberFromText(content, lanes);
  created.return = returnFiber;
  created.effectTag = 1 /* Placement */;
  return created;
}
function reconcileChildArray(returnFiber, currentFirstChild, newChildren, lanes) {
  let resultingFirstChild = null;
  let previousNewFiber = null;
  let oldFiber = currentFirstChild;
  let newIdx = 0;
  let lastPlacedIndex = 0;
  let nextOldFiber = null;
  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber;
      oldFiber = null;
    } else {
      nextOldFiber = oldFiber.sibling;
    }
    const newChild = newChildren[newIdx];
    const newFiber = updateSlot(returnFiber, oldFiber, newChild, lanes);
    if (newFiber === null) {
      if (oldFiber === null) {
        oldFiber = nextOldFiber;
      }
      break;
    }
    if (oldFiber && newFiber.alternate === null) {
      deleteChild(returnFiber, oldFiber);
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
    oldFiber = nextOldFiber;
  }
  if (newIdx === newChildren.length) {
    deleteRemainingChildren(returnFiber, oldFiber);
    return resultingFirstChild;
  }
  if (oldFiber === null) {
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
      if (newFiber === null) continue;
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
    return resultingFirstChild;
  }
  const existingChildren = mapRemainingChildren(oldFiber);
  for (; newIdx < newChildren.length; newIdx++) {
    const newChild = newChildren[newIdx];
    const newFiber = updateFromMap(returnFiber, existingChildren, newChild, newIdx, lanes);
    if (newFiber !== null) {
      if (newFiber.alternate !== null) {
        const key = newFiber.key !== null ? newFiber.key : newIdx;
        existingChildren.delete(key);
      }
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
  }
  existingChildren.forEach((child) => {
    deleteChild(returnFiber, child);
  });
  return resultingFirstChild;
}
function isSameType(fiber, element) {
  return fiber.type === element.type;
}
function useFiber(fiber, pendingProps) {
  const clone = createWorkInProgressFromFiber(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}
function createWorkInProgressFromFiber(current, pendingProps) {
  let wip = current.alternate;
  if (wip === null) {
    wip = {
      ...current,
      pendingProps,
      effectTag: 0 /* NoEffect */,
      child: null,
      sibling: null,
      alternate: current
    };
    current.alternate = wip;
  } else {
    wip.pendingProps = pendingProps;
    wip.effectTag = 0 /* NoEffect */;
    wip.child = null;
    wip.sibling = null;
  }
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;
  wip.updateQueue = current.updateQueue;
  return wip;
}
function updateSlot(returnFiber, oldFiber, newChild, lanes) {
  const oldKey = oldFiber !== null ? oldFiber.key : null;
  if (typeof newChild === "string" || typeof newChild === "number") {
    if (oldKey !== null) return null;
    return updateTextNode(returnFiber, oldFiber, newChild, lanes);
  }
  if (isValidElement(newChild)) {
    const element = newChild;
    if (element.key === oldKey) {
      return updateElement(returnFiber, oldFiber, element, lanes);
    }
    return null;
  }
  return null;
}
function updateTextNode(returnFiber, current, content, lanes) {
  if (current === null || current.tag !== 4 /* HostText */) {
    const created = createFiberFromText(content, lanes);
    created.return = returnFiber;
    created.effectTag = 1 /* Placement */;
    return created;
  }
  const existing = useFiber(current, { text: content });
  existing.return = returnFiber;
  return existing;
}
function updateElement(returnFiber, current, element, lanes) {
  if (current !== null && current.type === element.type) {
    const existing = useFiber(current, element.props);
    existing.ref = element.ref;
    existing.return = returnFiber;
    return existing;
  }
  const created = createFiberFromElement(element, lanes);
  created.ref = element.ref;
  created.return = returnFiber;
  created.effectTag = 1 /* Placement */;
  return created;
}
function createChild(returnFiber, newChild, lanes) {
  if (typeof newChild === "string" || typeof newChild === "number") {
    const created = createFiberFromText(newChild, lanes);
    created.return = returnFiber;
    created.effectTag = 1 /* Placement */;
    return created;
  }
  if (isValidElement(newChild)) {
    const created = createFiberFromElement(newChild, lanes);
    created.ref = newChild.ref;
    created.return = returnFiber;
    created.effectTag = 1 /* Placement */;
    return created;
  }
  return null;
}
function placeChild(fiber, lastPlacedIndex, newIndex) {
  fiber.index = newIndex;
  const current = fiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      fiber.effectTag = 1 /* Placement */;
      return lastPlacedIndex;
    }
    return oldIndex;
  }
  fiber.effectTag = 1 /* Placement */;
  return lastPlacedIndex;
}
function deleteChild(returnFiber, childToDelete) {
  childToDelete.effectTag = 4 /* Deletion */;
  if (!returnFiber.updateQueue) {
    returnFiber.updateQueue = [];
  }
  returnFiber.updateQueue.push(childToDelete);
}
function deleteRemainingChildren(returnFiber, currentFirstChild) {
  let child = currentFirstChild;
  while (child !== null) {
    deleteChild(returnFiber, child);
    child = child.sibling;
  }
}
function mapRemainingChildren(currentFirstChild) {
  const map = /* @__PURE__ */ new Map();
  let child = currentFirstChild;
  while (child !== null) {
    const key = child.key !== null ? child.key : child.index;
    map.set(key, child);
    child = child.sibling;
  }
  return map;
}
function updateFromMap(returnFiber, existingChildren, newChild, newIndex, lanes) {
  if (typeof newChild === "string" || typeof newChild === "number") {
    const matchedFiber = existingChildren.get(newIndex) || null;
    return updateTextNode(returnFiber, matchedFiber, newChild, lanes);
  }
  if (isValidElement(newChild)) {
    const element = newChild;
    const key = element.key !== null ? element.key : newIndex;
    const matchedFiber = existingChildren.get(key) || null;
    return updateElement(returnFiber, matchedFiber, element, lanes);
  }
  return null;
}

// src/hooks/hook-state.ts
var currentlyRenderingFiber = null;
var workInProgressHook = null;
var currentHook = null;
var hookIndex = 0;
var effectListHead = null;
var effectListTail = null;
function setCurrentFiber(fiber) {
  currentlyRenderingFiber = fiber;
  workInProgressHook = null;
  currentHook = null;
  hookIndex = 0;
  effectListHead = null;
  effectListTail = null;
}
function getCurrentFiber() {
  return currentlyRenderingFiber;
}
function getCurrentHookIndex() {
  return hookIndex;
}
function allocateHook() {
  let hook;
  if (currentlyRenderingFiber === null) {
    throw new Error("Hooks can only be called inside a function component.");
  }
  const alternate = currentlyRenderingFiber.alternate;
  if (alternate !== null) {
    if (currentHook === null) {
      currentHook = alternate.memoizedState ?? null;
    } else {
      currentHook = currentHook.next;
    }
    if (currentHook === null) {
      throw new Error("Rendered more hooks than during the previous render.");
    }
    hook = {
      memoizedState: currentHook.memoizedState,
      queue: currentHook.queue,
      next: null
    };
  } else {
    hook = {
      memoizedState: null,
      queue: null,
      next: null
    };
  }
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = hook;
    workInProgressHook = hook;
  } else {
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }
  hookIndex++;
  return hook;
}
function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null
  };
  if (effectListTail === null) {
    effectListHead = effect;
    effectListTail = effect;
  } else {
    effectListTail.next = effect;
    effectListTail = effect;
  }
  return effect;
}
function getEffectList() {
  return effectListHead;
}
function areDepsEqual(prevDeps, nextDeps) {
  if (prevDeps === void 0 || nextDeps === void 0) {
    return false;
  }
  if (prevDeps.length !== nextDeps.length) {
    return false;
  }
  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) {
      return false;
    }
  }
  return true;
}

// src/shared/warnings.ts
var MAX_WARNINGS = 1e3;
var warnedMessages = /* @__PURE__ */ new Set();
function warn(message) {
  if (warnedMessages.has(message)) return;
  if (warnedMessages.size >= MAX_WARNINGS) return;
  warnedMessages.add(message);
  if (typeof console !== "undefined") {
    console.warn(`[SpecifyJS] ${message}`);
  }
}
function error(message) {
  if (typeof console !== "undefined") {
    console.error(`[SpecifyJS] ${message}`);
  }
}

// src/shared/render-guard.ts
var MAX_RENDERS_PER_CYCLE = 50;
var MAX_EFFECTS_PER_CYCLE = 25;
var UNSTABLE_DEPS_THRESHOLD = 5;
var fiberRenderCounts = /* @__PURE__ */ new WeakMap();
var currentCycleId = 0;
function beginRenderCycle() {
  currentCycleId++;
}
function trackRender(fiber, componentName) {
  let entry = fiberRenderCounts.get(fiber);
  if (!entry || entry.cycleId !== currentCycleId) {
    entry = { count: 0, cycleId: currentCycleId };
    fiberRenderCounts.set(fiber, entry);
  }
  entry.count++;
  if (entry.count > MAX_RENDERS_PER_CYCLE) {
    const msg = `Maximum update depth exceeded. Component "${componentName}" re-rendered ${entry.count} times in a single cycle. This usually means a useEffect or setState call is creating an infinite loop. Check that useEffect dependencies are stable (use useMemo/useCallback for objects/arrays).`;
    error(msg);
    entry.count = 0;
    throw new Error(`[SpecifyJS] ${msg}`);
  }
}
var fiberEffectCounts = /* @__PURE__ */ new WeakMap();
var currentCommitId = 0;
function beginCommitCycle() {
  currentCommitId++;
}
function trackEffect(fiber, componentName) {
  let entry = fiberEffectCounts.get(fiber);
  if (!entry || entry.commitId !== currentCommitId) {
    entry = { count: 0, commitId: currentCommitId };
    fiberEffectCounts.set(fiber, entry);
  }
  entry.count++;
  if (entry.count > MAX_EFFECTS_PER_CYCLE) {
    warn(
      `Effect cycle detected in "${componentName}". Effects fired ${entry.count} times in a single commit. This may indicate an effect that triggers a state update on every run. Ensure effect dependencies are correct and stable.`
    );
  }
}
var fiberDepsHistory = /* @__PURE__ */ new WeakMap();
function trackEffectDeps(fiber, hookIndex2, deps, depsChanged, componentName) {
  if (!deps) return;
  let fiberMap = fiberDepsHistory.get(fiber);
  if (!fiberMap) {
    fiberMap = /* @__PURE__ */ new Map();
    fiberDepsHistory.set(fiber, fiberMap);
  }
  let history = fiberMap.get(hookIndex2);
  if (!history) {
    history = { consecutiveChanges: 0, lastDepsKey: "", warned: false };
    fiberMap.set(hookIndex2, history);
  }
  if (depsChanged) {
    history.consecutiveChanges++;
  } else {
    history.consecutiveChanges = 0;
  }
  if (history.consecutiveChanges >= UNSTABLE_DEPS_THRESHOLD && !history.warned) {
    history.warned = true;
    warn(
      `Unstable useEffect dependencies in "${componentName}" (hook #${hookIndex2}). Dependencies changed on ${history.consecutiveChanges} consecutive renders. This may cause unnecessary effect re-runs. Wrap objects/arrays in useMemo and functions in useCallback to stabilize references.`
    );
  }
}
var fiberStateSetCounts = /* @__PURE__ */ new WeakMap();
var currentFrameId = 0;
function beginFrame() {
  currentFrameId++;
}
function trackStateUpdate(fiber, componentName) {
  let entry = fiberStateSetCounts.get(fiber);
  if (!entry || entry.frameId !== currentFrameId) {
    entry = { count: 0, frameId: currentFrameId };
    fiberStateSetCounts.set(fiber, entry);
  }
  entry.count++;
  if (entry.count === 100) {
    warn(
      `Rapid state updates in "${componentName}": setState called ${entry.count} times in a single frame. This may indicate a loop or missing dependency optimization.`
    );
  }
}

// src/hooks/dispatcher.ts
var rerenderFiber = null;
function setRerenderCallback(cb) {
  rerenderFiber = cb;
}
function getCurrentFiberForDispatch() {
  const fiber = getCurrentFiber();
  if (!fiber) {
    throw new Error("Invalid hook call.");
  }
  return fiber;
}
function markFiberWithLane(fiber, lane) {
  fiber.lanes = mergeLanes(fiber.lanes, lane);
  let node = fiber.return;
  while (node !== null) {
    node.childLanes = mergeLanes(node.childLanes, lane);
    node = node.return;
  }
}
function useStateImpl(initialState) {
  const hook = allocateHook();
  if (hook.queue === null) {
    const initial = typeof initialState === "function" ? initialState() : initialState;
    hook.memoizedState = initial;
    hook.queue = [];
  }
  const queue = hook.queue;
  if (queue.length > 0) {
    let state2 = hook.memoizedState;
    for (const update of queue) {
      const action = update.action;
      state2 = typeof action === "function" ? action(state2) : action;
    }
    hook.memoizedState = state2;
    queue.length = 0;
  }
  const state = hook.memoizedState;
  const fiber = getCurrentFiberForDispatch();
  const setState = (action) => {
    const compName = (typeof fiber.type === "function" ? getComponentName(fiber.type) || fiber.type.name : "") || "Anonymous";
    trackStateUpdate(fiber, compName);
    const lane = requestUpdateLane();
    if (queue.length >= 1e4) {
      if (typeof console !== "undefined")
        console.warn("[SpecifyJS] Hook update queue exceeded 10000 \u2014 dropping oldest updates");
      queue.splice(0, queue.length - 5e3);
    }
    queue.push({ action });
    markFiberWithLane(fiber, lane);
    if (rerenderFiber) {
      scheduleUpdate(() => rerenderFiber(fiber));
    }
  };
  return [state, setState];
}
function useReducerImpl(reducer, initialArg, init) {
  const hook = allocateHook();
  if (hook.queue === null) {
    hook.memoizedState = init ? init(initialArg) : initialArg;
    hook.queue = [];
  }
  const queue = hook.queue;
  if (queue.length > 0) {
    let state2 = hook.memoizedState;
    for (const update of queue) {
      state2 = reducer(state2, update.action);
    }
    hook.memoizedState = state2;
    queue.length = 0;
  }
  const state = hook.memoizedState;
  const fiber = getCurrentFiberForDispatch();
  const dispatch = (action) => {
    const dName = (typeof fiber.type === "function" ? getComponentName(fiber.type) || fiber.type.name : "") || "Anonymous";
    trackStateUpdate(fiber, dName);
    const lane = requestUpdateLane();
    queue.push({ action });
    markFiberWithLane(fiber, lane);
    if (rerenderFiber) {
      scheduleUpdate(() => rerenderFiber(fiber));
    }
  };
  return [state, dispatch];
}
function useEffectImpl(tag, create, deps) {
  const hook = allocateHook();
  const hIdx = getCurrentHookIndex();
  const prevState = hook.memoizedState;
  const prevDestroy = prevState?.effect?.destroy ?? null;
  if (prevState !== null && deps !== void 0) {
    const depsMatch = areDepsEqual(prevState.deps, deps);
    const fiber = getCurrentFiber();
    if (fiber) {
      const cName = (typeof fiber.type === "function" ? getComponentName(fiber.type) || fiber.type.name : "") || "Anonymous";
      trackEffectDeps(fiber, hIdx, deps, !depsMatch, cName);
    }
    if (depsMatch) {
      pushEffect(0 /* NoEffect */, create, prevDestroy, deps);
      return;
    }
  }
  const effect = pushEffect(1 /* HasEffect */ | tag, create, prevDestroy, deps);
  hook.memoizedState = { deps, effect };
}
function useEffectDispatch(create, deps) {
  useEffectImpl(4 /* Passive */, create, deps);
}
function useLayoutEffectDispatch(create, deps) {
  useEffectImpl(2 /* Layout */, create, deps);
}
function useInsertionEffectDispatch(create, deps) {
  useEffectImpl(8 /* Insertion */, create, deps);
}
function useContextImpl(context) {
  allocateHook();
  return context._currentValue;
}
function useCallbackImpl(callback, deps) {
  const hook = allocateHook();
  const prevState = hook.memoizedState;
  if (prevState !== null) {
    if (areDepsEqual(prevState[1], deps)) {
      return prevState[0];
    }
  }
  hook.memoizedState = [callback, deps];
  return callback;
}
function useMemoImpl(factory, deps) {
  const hook = allocateHook();
  const prevState = hook.memoizedState;
  if (prevState !== null) {
    if (areDepsEqual(prevState[1], deps)) {
      return prevState[0];
    }
  }
  const value = factory();
  hook.memoizedState = [value, deps];
  return value;
}
function useRefImpl(initialValue) {
  const hook = allocateHook();
  if (hook.memoizedState === null) {
    const ref = { current: initialValue };
    hook.memoizedState = ref;
  }
  return hook.memoizedState;
}
function useImperativeHandleImpl(ref, createHandle, deps) {
  useEffectImpl(
    2 /* Layout */,
    () => {
      const handle = createHandle();
      if (ref !== null) {
        if (typeof ref === "function") {
          ref(handle);
          return () => ref(null);
        }
        ref.current = handle;
        return () => {
          ref.current = null;
        };
      }
      return void 0;
    },
    deps
  );
}
function useDebugValueImpl(_value, _format) {
}
var idCounter = 0;
function useIdImpl() {
  const hook = allocateHook();
  if (hook.memoizedState === null) {
    hook.memoizedState = `:l${idCounter++}:`;
  }
  return hook.memoizedState;
}
function useDeferredValueImpl(value) {
  const [deferredValue, setDeferredValue] = useStateImpl(value);
  useEffectImpl(
    4 /* Passive */,
    () => {
      startTransition(() => {
        setDeferredValue(value);
      });
    },
    [value]
  );
  return deferredValue;
}
function useTransitionImpl() {
  const [isPending, setIsPending] = useStateImpl(false);
  const startTransition2 = useCallbackImpl(
    ((callback) => {
      setIsPending(true);
      startTransition(() => {
        setIsPending(false);
        callback();
      });
    }),
    [setIsPending]
  );
  return [isPending, startTransition2];
}
function useSyncExternalStoreImpl(subscribe2, getSnapshot2, _getServerSnapshot) {
  const hook = allocateHook();
  const fiber = getCurrentFiberForDispatch();
  const value = getSnapshot2();
  hook.memoizedState = value;
  useEffectImpl(
    4 /* Passive */,
    () => {
      const unsubscribe = subscribe2(() => {
        const nextValue = getSnapshot2();
        if (!Object.is(hook.memoizedState, nextValue)) {
          hook.memoizedState = nextValue;
          if (rerenderFiber) {
            scheduleUpdate(() => rerenderFiber(fiber));
          }
        }
      });
      return unsubscribe;
    },
    [subscribe2, getSnapshot2]
  );
  return value;
}

// src/hooks/install-dispatcher.ts
var HooksDispatcher = {
  useState: useStateImpl,
  useEffect: useEffectDispatch,
  useContext: useContextImpl,
  useReducer: useReducerImpl,
  useCallback: useCallbackImpl,
  useMemo: useMemoImpl,
  useRef: useRefImpl,
  useImperativeHandle: useImperativeHandleImpl,
  useLayoutEffect: useLayoutEffectDispatch,
  useDebugValue: useDebugValueImpl,
  useId: useIdImpl,
  useDeferredValue: useDeferredValueImpl,
  useTransition: useTransitionImpl,
  useSyncExternalStore: useSyncExternalStoreImpl,
  useInsertionEffect: useInsertionEffectDispatch
};
function installDispatcher() {
  __setDispatcher(HooksDispatcher);
}
function uninstallDispatcher() {
  __setDispatcher(null);
}

// src/devtools/index.ts
var devToolsHook = null;
function notifyDevToolsOfCommit(root) {
  devToolsHook?.onCommitFiberRoot?.(root);
}

// src/core/scheduler-host-config.ts
function getCurrentTime() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : (
    /* v8 ignore next */
    Date.now()
  );
}
var FRAME_YIELD_MS = 5;
var deadline = 0;
function resetDeadline() {
  deadline = getCurrentTime() + FRAME_YIELD_MS;
}
var scheduledCallback = null;
var isMessageLoopRunning = false;
function performWorkUntilDeadline() {
  if (scheduledCallback !== null) {
    resetDeadline();
    const cb = scheduledCallback;
    let hasMoreWork = false;
    try {
      const continuation = cb();
      if (typeof continuation === "function") {
        scheduledCallback = continuation;
        hasMoreWork = true;
      } else {
        scheduledCallback = null;
      }
    } catch (err) {
      scheduledCallback = null;
      isMessageLoopRunning = false;
      throw err;
    }
    if (hasMoreWork) {
      schedulePerformWorkUntilDeadline();
    } else {
      isMessageLoopRunning = false;
    }
  } else {
    isMessageLoopRunning = false;
  }
}
var schedulePerformWorkUntilDeadline;
if (typeof MessageChannel !== "undefined") {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    channel.port2.postMessage(null);
  };
} else {
  schedulePerformWorkUntilDeadline = () => {
    setTimeout(performWorkUntilDeadline, 0);
  };
}

// src/shared/aria-warnings.ts
function checkAriaCompliance(tag, props) {
  if (typeof process !== "undefined" && false) return;
  if (tag === "button" && !props.children && !props["aria-label"] && !props["aria-labelledby"]) {
    warn(
      `<button> without text content or aria-label. Add text, aria-label, or aria-labelledby for accessibility.`
    );
  }
  if (tag === "img" && props.alt === void 0) {
    warn(
      `<img> without alt attribute. Add alt="" for decorative images or descriptive text for informative images.`
    );
  }
  if ((tag === "input" || tag === "select" || tag === "textarea") && !props["aria-label"] && !props["aria-labelledby"] && !props.id) {
    warn(
      `<${tag}> without aria-label, aria-labelledby, or id (for label[for]). Form controls need accessible names.`
    );
  }
  if ((tag === "div" || tag === "span") && props.onClick && !props.role) {
    warn(
      `<${tag}> with onClick but no role attribute. Add role="button" and tabIndex={0} for keyboard accessibility.`
    );
  }
  if (props.role === "button" && props.tabIndex === void 0 && tag !== "button") {
    warn(
      `Element with role="button" but no tabIndex. Add tabIndex={0} to make it keyboard-focusable.`
    );
  }
  if (props.role === "dialog" && !props["aria-label"] && !props["aria-labelledby"]) {
    warn(`Element with role="dialog" needs aria-label or aria-labelledby.`);
  }
  if (tag === "a" && props.target === "_blank" && !props.rel) {
    warn(`<a target="_blank"> without rel attribute. Add rel="noopener noreferrer" for security.`);
  }
  if (props.role === "tablist" && !props["aria-label"] && !props["aria-labelledby"]) {
    warn(`Element with role="tablist" needs aria-label or aria-labelledby.`);
  }
}

// src/dom/work-loop.ts
var fiberRoots = /* @__PURE__ */ new Map();
function createFiberRoot(container) {
  const rootFiber = createHostRootFiber();
  rootFiber.stateNode = container;
  const root = {
    containerNode: container,
    current: rootFiber,
    pendingChildren: null,
    callbackScheduled: false,
    // Lane-based concurrent scheduling (initialized to idle)
    pendingLanes: 0,
    suspendedLanes: 0,
    expirationTimes: new Array(8).fill(-1),
    callbackNode: null,
    callbackPriority: 0,
    // Hydration
    isHydrating: false
  };
  return root;
}
function scheduleRender(root, children) {
  root.pendingChildren = children;
  if (!root.callbackScheduled) {
    root.callbackScheduled = true;
    scheduleMicrotask(() => {
      root.callbackScheduled = false;
      performWork(root);
    });
  }
}
function performSyncWork(root, children) {
  root.pendingChildren = children;
  performWork(root);
}
function installPersistentRerenderCallback() {
  setRerenderCallback((fiber) => {
    let node = fiber;
    while (node?.return) {
      node = node.return;
    }
    if (node && node.stateNode) {
      const fRoot = findRootForContainer(node.stateNode);
      if (fRoot) {
        scheduleRender(fRoot, fRoot.pendingChildren);
      }
    }
  });
}
function performWork(root) {
  beginRenderCycle();
  beginFrame();
  installPersistentRerenderCallback();
  if (root.isHydrating) {
    activeHydrationRoot = root;
    hydrationCursor.clear();
  }
  const currentRoot = root.current;
  const wip = createWorkInProgress(currentRoot, {
    children: root.pendingChildren
  });
  workLoopSync(wip);
  commitRoot(root, wip);
  root.current = wip;
  if (root.isHydrating) {
    root.isHydrating = false;
    activeHydrationRoot = null;
    hydrationCursor.clear();
  }
}
function workLoopSync(startFiber) {
  let unitOfWork = startFiber;
  while (unitOfWork !== null) {
    unitOfWork = performUnitOfWork(unitOfWork);
  }
}
function findRootForContainer(container) {
  for (const [, root] of fiberRoots) {
    if (root.containerNode === container) {
      return root;
    }
  }
  return null;
}
function performUnitOfWork(fiber) {
  beginWork(fiber);
  if (fiber.child !== null) {
    return fiber.child;
  }
  let current = fiber;
  while (current !== null) {
    completeWork(current);
    if (current.sibling !== null) {
      return current.sibling;
    }
    current = current.return;
  }
  return null;
}
function beginWork(fiber) {
  if (activeHydrationRoot !== null && fiber.stateNode === null) {
    if (fiber.tag === 3 /* HostComponent */ || fiber.tag === 4 /* HostText */) {
      const parentNode = findHostParentForHydration(fiber, activeHydrationRoot.containerNode);
      if (parentNode) {
        if (fiber.tag === 3 /* HostComponent */) {
          const existing = tryHydrateInstance(fiber, parentNode);
          if (existing) {
            fiber.stateNode = existing;
          }
        } else {
          const existing = tryHydrateText(parentNode);
          if (existing) {
            fiber.stateNode = existing;
          }
        }
      }
    }
  }
  switch (fiber.tag) {
    case 2 /* HostRoot */:
      reconcileHostRoot(fiber);
      break;
    case 3 /* HostComponent */:
      reconcileHostComponent(fiber);
      break;
    case 4 /* HostText */:
      break;
    case 0 /* FunctionComponent */:
      reconcileFunctionComponent(fiber);
      break;
    case 1 /* ClassComponent */:
      reconcileClassComponent(fiber);
      break;
    case 5 /* Fragment */:
      if (fiber.type === SPEC_STRICT_MODE_TYPE) {
        strictModeDepth++;
      }
      reconcileFragment(fiber);
      break;
    case 6 /* ContextProvider */:
      reconcileContextProvider(fiber);
      break;
    case 8 /* ForwardRef */:
      reconcileForwardRef(fiber);
      break;
    case 9 /* MemoComponent */:
      reconcileMemoComponent(fiber);
      break;
    default:
      reconcileFragment(fiber);
      break;
  }
}
function reconcileHostRoot(fiber) {
  const children = fiber.pendingProps.children;
  fiber.child = reconcileChildren(fiber, fiber.alternate?.child ?? null, children, 0);
}
function reconcileHostComponent(fiber) {
  const children = fiber.pendingProps.children;
  fiber.child = reconcileChildren(fiber, fiber.alternate?.child ?? null, children, 0);
}
function reconcileFunctionComponent(fiber) {
  installDispatcher();
  setCurrentFiber(fiber);
  const Component2 = fiber.type;
  const componentName = getComponentName(Component2) || Component2.name || "Anonymous";
  trackRender(fiber, componentName);
  if (strictModeDepth > 0 && fiber.alternate === null) {
    Component2(fiber.pendingProps);
    setCurrentFiber(fiber);
  }
  const children = Component2(fiber.pendingProps);
  const effects = getEffectList();
  fiber.dependencies = effects;
  setCurrentFiber(null);
  uninstallDispatcher();
  fiber.child = reconcileChildren(fiber, fiber.alternate?.child ?? null, children, 0);
}
function reconcileClassComponent(fiber) {
  const Constructor = fiber.type;
  let instance;
  if (fiber.stateNode === null) {
    instance = new Constructor(fiber.pendingProps);
    fiber.stateNode = instance;
  } else {
    instance = fiber.stateNode;
    instance.props = fiber.pendingProps;
  }
  const children = instance.render();
  fiber.child = reconcileChildren(fiber, fiber.alternate?.child ?? null, children, 0);
}
function reconcileFragment(fiber) {
  const children = fiber.pendingProps.children;
  fiber.child = reconcileChildren(fiber, fiber.alternate?.child ?? null, children, 0);
}
function reconcileContextProvider(fiber) {
  const provider = fiber.type;
  const value = fiber.pendingProps.value;
  if (provider._context) {
    provider._context._currentValue = value;
  }
  const children = fiber.pendingProps.children;
  fiber.child = reconcileChildren(fiber, fiber.alternate?.child ?? null, children, 0);
}
function reconcileForwardRef(fiber) {
  const { render: render2 } = fiber.type;
  installDispatcher();
  setCurrentFiber(fiber);
  const children = render2(fiber.pendingProps, fiber.ref);
  const effects = getEffectList();
  fiber.dependencies = effects;
  setCurrentFiber(null);
  uninstallDispatcher();
  fiber.child = reconcileChildren(fiber, fiber.alternate?.child ?? null, children, 0);
}
function reconcileMemoComponent(fiber) {
  const { type: innerType, compare } = fiber.type;
  if (fiber.alternate !== null) {
    const prevProps = fiber.alternate.memoizedProps;
    const nextProps = fiber.pendingProps;
    if (prevProps !== null) {
      const shouldSkip = compare ? compare(prevProps, nextProps) : shallowPropsEqual(prevProps, nextProps);
      if (shouldSkip) {
        fiber.child = cloneFiberSubtree(fiber.alternate.child, fiber);
        return;
      }
    }
  }
  installDispatcher();
  setCurrentFiber(fiber);
  const children = innerType(fiber.pendingProps);
  const effects = getEffectList();
  fiber.dependencies = effects;
  setCurrentFiber(null);
  uninstallDispatcher();
  fiber.child = reconcileChildren(fiber, fiber.alternate?.child ?? null, children, 0);
}
function shallowPropsEqual(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (key === "children") continue;
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}
function cloneFiberSubtree(source, parent) {
  if (source === null) return null;
  const rootClone = cloneOneFiber(source, parent);
  const stack = [];
  let srcChild = source.child;
  if (srcChild) {
    stack.push({ source: srcChild, cloneParent: rootClone });
  }
  while (stack.length > 0) {
    const { source: src, cloneParent } = stack.pop();
    let currentSrc = src;
    let prevClone = null;
    while (currentSrc !== null) {
      const clone = cloneOneFiber(currentSrc, cloneParent);
      if (prevClone) {
        prevClone.sibling = clone;
      } else {
        cloneParent.child = clone;
      }
      if (currentSrc.child) {
        stack.push({ source: currentSrc.child, cloneParent: clone });
      }
      prevClone = clone;
      currentSrc = currentSrc.sibling;
    }
  }
  return rootClone;
}
function cloneOneFiber(source, parent) {
  const clone = {
    ...source,
    return: parent,
    alternate: source,
    child: null,
    sibling: null,
    effectTag: 0 /* NoEffect */,
    pendingProps: source.memoizedProps ?? source.pendingProps
  };
  source.alternate = clone;
  return clone;
}
var SVG_TAGS = /* @__PURE__ */ new Set([
  "svg",
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "g",
  "line",
  "linearGradient",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "text",
  "tspan",
  "use",
  "image",
  "symbol",
  "foreignObject",
  "desc",
  "title",
  "metadata",
  "marker",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feFlood",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "feSpecularLighting",
  "feTile",
  "feTurbulence",
  "animate",
  "animateMotion",
  "animateTransform",
  "set"
]);
function isSvgTag(tag) {
  return SVG_TAGS.has(tag);
}
function isCustomElement(dom) {
  return dom.tagName.includes("-");
}
var strictModeDepth = 0;
var activeHydrationRoot = null;
var hydrationCursor = /* @__PURE__ */ new Map();
function getNextHydratableChild(parent) {
  let child = parent.firstChild;
  while (child !== null) {
    if (child.nodeType === 1 || child.nodeType === 3) {
      return child;
    }
    child = child.nextSibling;
  }
  return null;
}
function getNextHydratableSibling(node) {
  let sibling = node.nextSibling;
  while (sibling !== null) {
    if (sibling.nodeType === 1 || sibling.nodeType === 3) {
      return sibling;
    }
    sibling = sibling.nextSibling;
  }
  return null;
}
function tryHydrateInstance(fiber, parentNode) {
  let candidate = hydrationCursor.get(parentNode) ?? getNextHydratableChild(parentNode);
  if (candidate === null) return null;
  while (candidate !== null && candidate.nodeType !== 1) {
    candidate = getNextHydratableSibling(candidate);
  }
  if (candidate === null) return null;
  const element = candidate;
  if (element.tagName.toLowerCase() !== fiber.type.toLowerCase()) {
    return null;
  }
  hydrationCursor.set(parentNode, getNextHydratableSibling(element));
  return element;
}
function tryHydrateText(parentNode) {
  let candidate = hydrationCursor.get(parentNode) ?? getNextHydratableChild(parentNode);
  if (candidate === null) return null;
  while (candidate !== null && candidate.nodeType !== 3) {
    candidate = getNextHydratableSibling(candidate);
  }
  if (candidate === null) return null;
  const textNode = candidate;
  hydrationCursor.set(parentNode, getNextHydratableSibling(textNode));
  return textNode;
}
function findHostParentForHydration(fiber, rootContainer) {
  let parent = fiber.return;
  while (parent !== null) {
    if (parent.tag === 3 /* HostComponent */ && parent.stateNode) {
      return parent.stateNode;
    }
    if (parent.tag === 2 /* HostRoot */) {
      return rootContainer;
    }
    parent = parent.return;
  }
  return rootContainer;
}
function completeWork(fiber) {
  switch (fiber.tag) {
    case 3 /* HostComponent */: {
      if (fiber.stateNode === null) {
        const tag = fiber.type;
        const domNode = isSvgTag(tag) ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
        updateDOMProperties(domNode, {}, fiber.pendingProps);
        checkAriaCompliance(tag, fiber.pendingProps);
        {
          let ancestor = fiber.return;
          while (ancestor !== null) {
            if (ancestor.tag === 0 /* FunctionComponent */ || ancestor.tag === 1 /* ClassComponent */ || ancestor.tag === 8 /* ForwardRef */ || ancestor.tag === 9 /* MemoComponent */) {
              if (ancestor.child === fiber) {
                const componentName = getComponentName(ancestor.type);
                const cid = registerComponentInstance(componentName);
                if (cid) domNode.setAttribute("data-cid", cid);
              }
              break;
            }
            if (ancestor.tag === 3 /* HostComponent */ || ancestor.tag === 2 /* HostRoot */) {
              break;
            }
            ancestor = ancestor.return;
          }
        }
        fiber.stateNode = domNode;
        appendAllChildren(domNode, fiber);
      } else if (activeHydrationRoot !== null && fiber.alternate === null) {
        updateDOMProperties(fiber.stateNode, {}, fiber.pendingProps);
        fiber.effectTag = 0 /* NoEffect */;
      } else {
        const domNode = fiber.stateNode;
        if (fiber.alternate) {
          updateDOMProperties(domNode, fiber.alternate.memoizedProps || {}, fiber.pendingProps);
        }
      }
      fiber.memoizedProps = fiber.pendingProps;
      break;
    }
    case 4 /* HostText */: {
      const text = String(fiber.pendingProps.text);
      if (fiber.stateNode === null) {
        fiber.stateNode = document.createTextNode(text);
      } else if (activeHydrationRoot !== null && fiber.alternate === null) {
        const existing = fiber.stateNode;
        if (existing.nodeValue !== text) {
          existing.nodeValue = text;
        }
        fiber.effectTag = 0 /* NoEffect */;
      } else {
        fiber.stateNode.nodeValue = text;
      }
      fiber.memoizedProps = fiber.pendingProps;
      break;
    }
    case 2 /* HostRoot */:
    case 0 /* FunctionComponent */:
    case 1 /* ClassComponent */:
    case 5 /* Fragment */:
    case 6 /* ContextProvider */:
    case 8 /* ForwardRef */:
    case 9 /* MemoComponent */:
      if (fiber.type === SPEC_STRICT_MODE_TYPE) {
        strictModeDepth--;
      }
      fiber.memoizedProps = fiber.pendingProps;
      break;
  }
}
function appendAllChildren(parent, fiber) {
  let child = fiber.child;
  while (child !== null) {
    if (child.tag === 3 /* HostComponent */ || child.tag === 4 /* HostText */) {
      if (child.stateNode) {
        parent.appendChild(child.stateNode);
      }
    } else if (child.child !== null) {
      child.child.return = child;
      child = child.child;
      continue;
    }
    if (child === fiber) return;
    while (child.sibling === null) {
      if (child.return === null || child.return === fiber) return;
      child = child.return;
    }
    child.sibling.return = child.return;
    child = child.sibling;
  }
}
function commitRoot(root, finishedWork) {
  beginCommitCycle();
  commitDeletions(finishedWork);
  commitWork(finishedWork, root.containerNode);
  commitEffects(finishedWork);
  notifyDevToolsOfCommit(root);
}
function commitDeletions(rootFiber) {
  let node = rootFiber;
  while (node !== null) {
    if (node.updateQueue && Array.isArray(node.updateQueue)) {
      for (const item of node.updateQueue) {
        const deletedFiber = item;
        if (deletedFiber.effectTag === 4 /* Deletion */) {
          commitDeletion(deletedFiber);
        }
      }
    }
    if (node.child !== null) {
      node = node.child;
      continue;
    }
    while (node !== null) {
      if (node === rootFiber) {
        node = null;
        break;
      }
      if (node.sibling !== null) {
        node = node.sibling;
        break;
      }
      node = node.return;
    }
  }
}
function commitDeletion(fiber) {
  let parentFiber = fiber.return;
  while (parentFiber !== null) {
    if (parentFiber.tag === 3 /* HostComponent */ || parentFiber.tag === 2 /* HostRoot */) {
      break;
    }
    parentFiber = parentFiber.return;
  }
  const parentDOM = parentFiber?.stateNode;
  if (!parentDOM) return;
  removeHostChildren(fiber, parentDOM);
  runCleanupEffects(fiber);
}
function removeHostChildren(rootFiber, parentDOM) {
  let node = rootFiber;
  while (node !== null) {
    if (node.tag === 3 /* HostComponent */ || node.tag === 4 /* HostText */) {
      if (node.stateNode && parentDOM.contains(node.stateNode)) {
        parentDOM.removeChild(node.stateNode);
      }
    } else if (node.child !== null) {
      node = node.child;
      continue;
    }
    while (node !== null) {
      if (node === rootFiber) {
        node = null;
        break;
      }
      if (node.sibling !== null) {
        node = node.sibling;
        break;
      }
      node = node.return;
    }
  }
}
function commitWork(rootFiber, container) {
  let node = rootFiber;
  while (node !== null) {
    if (node.tag !== 2 /* HostRoot */ && (node.tag === 3 /* HostComponent */ || node.tag === 4 /* HostText */) && node.effectTag & 1 /* Placement */) {
      const parentDOM = getHostParentNode(node, container);
      if (parentDOM && node.stateNode) {
        const before = getHostSibling(node);
        if (before) {
          parentDOM.insertBefore(node.stateNode, before);
        } else {
          parentDOM.appendChild(node.stateNode);
        }
      }
    }
    if (node.child !== null) {
      node = node.child;
      continue;
    }
    while (node !== null) {
      if (node === rootFiber) {
        node = null;
        break;
      }
      if (node.sibling !== null) {
        node = node.sibling;
        break;
      }
      node = node.return;
    }
  }
}
function getHostParentNode(fiber, rootContainer) {
  let parent = fiber.return;
  while (parent !== null) {
    if (parent.tag === 3 /* HostComponent */) {
      return parent.stateNode;
    }
    if (parent.tag === 2 /* HostRoot */) {
      return rootContainer;
    }
    parent = parent.return;
  }
  return null;
}
function getHostSibling(fiber) {
  let node = fiber;
  outer: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }
    node = node.sibling;
    while (node.tag !== 3 /* HostComponent */ && node.tag !== 4 /* HostText */) {
      if (node.effectTag & 1 /* Placement */) {
        continue outer;
      }
      if (node.child === null) {
        continue outer;
      }
      node = node.child;
    }
    if (!(node.effectTag & 1 /* Placement */)) {
      return node.stateNode;
    }
  }
}
function isHostParent(fiber) {
  return fiber.tag === 3 /* HostComponent */ || fiber.tag === 2 /* HostRoot */;
}
function commitEffects(rootFiber) {
  let node = rootFiber;
  while (node !== null) {
    if (node.ref && node.stateNode) {
      if (typeof node.ref === "function") {
        node.ref(node.stateNode);
      } else if (typeof node.ref === "object") {
        node.ref.current = node.stateNode;
      }
    }
    if (node.tag === 0 /* FunctionComponent */ || node.tag === 8 /* ForwardRef */ || node.tag === 9 /* MemoComponent */) {
      const effectList = node.dependencies;
      if (effectList) {
        const effName = (typeof node.type === "function" ? getComponentName(node.type) || node.type.name : "") || "Anonymous";
        trackEffect(node, effName);
        runEffects(effectList);
      }
    }
    if (node.tag === 1 /* ClassComponent */ && node.stateNode) {
      const instance = node.stateNode;
      if (node.alternate === null) {
        instance.componentDidMount?.();
      } else {
        const prevProps = node.alternate.memoizedProps || {};
        const prevState = node.alternate.memoizedState;
        instance.componentDidUpdate?.(prevProps, prevState);
      }
    }
    if (node.child !== null) {
      node = node.child;
      continue;
    }
    while (node !== null) {
      if (node === rootFiber) {
        node = null;
        break;
      }
      if (node.sibling !== null) {
        node = node.sibling;
        break;
      }
      node = node.return;
    }
  }
}
function runEffects(effect) {
  let current = effect;
  while (current !== null) {
    if (current.tag & 1 /* HasEffect */) {
      if (current.destroy) {
        current.destroy();
      }
      const destroy = current.create();
      current.destroy = typeof destroy === "function" ? destroy : null;
    }
    current = current.next;
  }
}
function runCleanupEffects(rootFiber) {
  let node = rootFiber;
  while (node !== null) {
    if (node.tag === 0 /* FunctionComponent */ || node.tag === 8 /* ForwardRef */) {
      const effectList = node.dependencies;
      if (effectList) {
        let current = effectList;
        while (current !== null) {
          if (current.destroy) {
            current.destroy();
          }
          current = current.next;
        }
      }
    }
    if (node.tag === 1 /* ClassComponent */ && node.stateNode) {
      node.stateNode.componentWillUnmount?.();
    }
    if (node.child !== null) {
      node = node.child;
      continue;
    }
    while (node !== null) {
      if (node === rootFiber) {
        node = null;
        break;
      }
      if (node.sibling !== null) {
        node = node.sibling;
        break;
      }
      node = node.return;
    }
  }
}
var EVENT_RE = /^on[A-Z]/;
function updateDOMProperties(dom, prevProps, nextProps) {
  for (const key in prevProps) {
    if (key === "children" || key === "key" || key === "ref") continue;
    if (!(key in nextProps)) {
      if (EVENT_RE.test(key)) {
        const eventName = key.slice(2).toLowerCase();
        dom.removeEventListener(eventName, prevProps[key]);
      } else if (key === "style") {
        dom.removeAttribute("style");
      } else if (key === "className") {
        dom.removeAttribute("class");
      } else if (key === "htmlFor") {
        dom.removeAttribute("for");
      } else if (key === "dangerouslySetInnerHTML") {
        dom.innerHTML = "";
      } else {
        dom.removeAttribute(key);
      }
    }
  }
  for (const key in nextProps) {
    if (key === "children" || key === "key" || key === "ref") continue;
    const value = nextProps[key];
    if (EVENT_RE.test(key)) {
      const eventName = key.slice(2).toLowerCase();
      if (prevProps[key] !== value) {
        if (prevProps[key]) {
          dom.removeEventListener(eventName, prevProps[key]);
        }
        if (value) {
          dom.addEventListener(eventName, value);
        }
      }
    } else if (key === "style") {
      if (typeof value === "object" && value !== null) {
        const style = value;
        for (const prop in style) {
          dom.style[prop] = style[prop] ?? "";
        }
      }
    } else if (key === "className") {
      dom.setAttribute("class", String(value));
    } else if (key === "htmlFor") {
      dom.setAttribute("for", String(value));
    } else if (key === "dangerouslySetInnerHTML") {
      const html = value.__html;
      dom.innerHTML = html;
    } else if (key === "value" && (dom.tagName === "INPUT" || dom.tagName === "TEXTAREA" || dom.tagName === "SELECT")) {
      dom.value = String(value ?? "");
    } else if (key === "checked" && dom.tagName === "INPUT") {
      dom.checked = Boolean(value);
    } else if (typeof value === "boolean") {
      if (value) {
        dom.setAttribute(key, "");
      } else {
        dom.removeAttribute(key);
      }
    } else if (value != null) {
      if (isCustomElement(dom) && typeof value !== "string" && key in dom) {
        dom[key] = value;
      } else {
        dom.setAttribute(key, String(value));
      }
    } else {
      dom.removeAttribute(key);
    }
  }
}

// src/dom/create-root.ts
function createRoot(container, _options) {
  if (!container || !(container instanceof Element) && !(container instanceof DocumentFragment)) {
    throw new Error("createRoot: container must be a DOM element or DocumentFragment");
  }
  const fiberRoot = createFiberRoot(container);
  fiberRoots.set(container, fiberRoot);
  let isMounted = false;
  return {
    render(children) {
      isMounted = true;
      performSyncWork(fiberRoot, children);
    },
    unmount() {
      if (!isMounted) return;
      isMounted = false;
      performSyncWork(fiberRoot, null);
      fiberRoots.delete(container);
    }
  };
}
function hydrateRoot(container, initialChildren, _options) {
  if (!container) {
    throw new Error("hydrateRoot: container must be a DOM element");
  }
  const elem = container;
  const fiberRoot = createFiberRoot(elem);
  fiberRoot.isHydrating = true;
  fiberRoots.set(elem, fiberRoot);
  let isMounted = false;
  const root = {
    render(children) {
      isMounted = true;
      performSyncWork(fiberRoot, children);
    },
    unmount() {
      if (!isMounted) return;
      isMounted = false;
      performSyncWork(fiberRoot, null);
      fiberRoots.delete(elem);
    }
  };
  root.render(initialChildren);
  return root;
}

// src/dom/create-portal.ts
function createPortal(children, container, key) {
  return {
    $$typeof: SPEC_ELEMENT_TYPE,
    type: SPEC_PORTAL_TYPE,
    props: { children, container },
    key: key ?? null,
    ref: null
  };
}

// src/dom/flush-sync.ts
function flushSync(fn) {
  enterFlushSyncContext();
  try {
    const result = fn();
    flushPendingTasks();
    return result;
  } finally {
    exitFlushSyncContext();
  }
}

// src/dom/legacy.ts
var containerRootMap = /* @__PURE__ */ new WeakMap();
function render(element, container, callback) {
  let root = containerRootMap.get(container);
  if (!root) {
    root = createRoot(container);
    containerRootMap.set(container, root);
  }
  root.render(element);
  if (callback) {
    Promise.resolve().then(callback);
  }
}
function hydrate(element, container, callback) {
  const root = hydrateRoot(container, element);
  containerRootMap.set(container, root);
  if (callback) {
    Promise.resolve().then(callback);
  }
}
function unmountComponentAtNode(container) {
  const root = containerRootMap.get(container);
  if (root) {
    root.unmount();
    containerRootMap.delete(container);
    return true;
  }
  return false;
}

// ../components/data/analog-clock/src/AnalogClock.ts
function getTimeInZone(timezone) {
  if (!timezone) return /* @__PURE__ */ new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(/* @__PURE__ */ new Date());
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}
function formatDate(date, dateFormat) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  switch (dateFormat) {
    case "short": {
      const mm = String(m + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      return `${mm}/${dd}/${y}`;
    }
    case "long": {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      return `${months[m]} ${String(d).padStart(2, "0")}, ${y}`;
    }
    case "iso": {
      const mm = String(m + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    }
  }
}
var COLORS = {
  face: "#f8fafc",
  border: "#334155",
  hand: "#1e293b",
  second: "#ef4444",
  numbers: "#374151"
};
function AnalogClock(props) {
  const {
    format = "12h",
    size = 200,
    showDate = false,
    dateFormat = "short",
    showSeconds = true,
    timezone,
    className
  } = props;
  const [now, setNow] = useState(getTimeInZone(timezone));
  useEffect(() => {
    const id = setInterval(() => {
      setNow(getTimeInZone(timezone));
    }, 1e3);
    return () => clearInterval(id);
  }, [timezone]);
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const hourAngle = hours % 12 * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const tickOuter = radius - 4;
  const numberRadius = radius - 22;
  const svgChildren = [];
  svgChildren.push(
    createElement("circle", {
      cx: String(cx),
      cy: String(cy),
      r: String(radius),
      fill: COLORS.face,
      stroke: COLORS.border,
      "stroke-width": "3"
    })
  );
  for (let i = 0; i < 12; i++) {
    const angle = i * 30 - 90;
    const rad = angle * Math.PI / 180;
    const innerR = tickOuter - 6;
    svgChildren.push(
      createElement("line", {
        x1: String(cx + innerR * Math.cos(rad)),
        y1: String(cy + innerR * Math.sin(rad)),
        x2: String(cx + tickOuter * Math.cos(rad)),
        y2: String(cy + tickOuter * Math.sin(rad)),
        stroke: COLORS.border,
        "stroke-width": "2"
      })
    );
    const outerLabel = String(i === 0 ? 12 : i);
    svgChildren.push(
      createElement("text", {
        x: String(cx + numberRadius * Math.cos(rad)),
        y: String(cy + numberRadius * Math.sin(rad)),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: COLORS.numbers,
        "font-size": String(size * 0.08),
        "font-family": "sans-serif",
        "font-weight": "600"
      }, outerLabel)
    );
    if (format === "24h") {
      const innerNumberRadius = radius - 38;
      const innerLabel = String(i === 0 ? 0 : i + 12);
      svgChildren.push(
        createElement("text", {
          x: String(cx + innerNumberRadius * Math.cos(rad)),
          y: String(cy + innerNumberRadius * Math.sin(rad)),
          "text-anchor": "middle",
          "dominant-baseline": "central",
          fill: COLORS.numbers,
          "font-size": String(size * 0.055),
          "font-family": "sans-serif",
          opacity: "0.6"
        }, innerLabel)
      );
    }
  }
  const hand = (angle, length, width, color) => {
    const rad = (angle - 90) * Math.PI / 180;
    return createElement("line", {
      x1: String(cx),
      y1: String(cy),
      x2: String(cx + length * Math.cos(rad)),
      y2: String(cy + length * Math.sin(rad)),
      stroke: color,
      "stroke-width": width,
      "stroke-linecap": "round"
    });
  };
  svgChildren.push(hand(hourAngle, radius * 0.5, "4", COLORS.hand));
  svgChildren.push(hand(minuteAngle, radius * 0.75, "3", COLORS.hand));
  if (showSeconds) {
    svgChildren.push(hand(secondAngle, radius * 0.85, "1.5", COLORS.second));
  }
  svgChildren.push(
    createElement("circle", {
      cx: String(cx),
      cy: String(cy),
      r: "4",
      fill: COLORS.hand
    })
  );
  const svg = createElement(
    "svg",
    {
      width: String(size),
      height: String(size),
      viewBox: `0 0 ${size} ${size}`,
      xmlns: "http://www.w3.org/2000/svg"
    },
    ...svgChildren
  );
  const wrapperChildren = [svg];
  if (showDate) {
    wrapperChildren.push(
      createElement("div", {
        style: {
          textAlign: "center",
          marginTop: "8px",
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: COLORS.numbers
        }
      }, formatDate(now, dateFormat))
    );
  }
  return createElement("div", {
    className,
    style: {
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center"
    }
  }, ...wrapperChildren);
}

// ../components/data/avatar/src/Avatar.ts
var sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80
};
function resolveSize(size) {
  if (size == null) return sizeMap.md;
  if (typeof size === "number") return size;
  return sizeMap[size] ?? sizeMap.md;
}
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
var palette = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#eab308",
  "#06b6d4"
];
function colorFromName(name) {
  if (!name) return "#9ca3af";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}
var statusColors = {
  online: "#22c55e",
  offline: "#9ca3af",
  busy: "#ef4444",
  away: "#eab308"
};
function statusPositionStyle(pos, dotSize) {
  const offset = `${-dotSize / 4}px`;
  switch (pos) {
    case "top-left":
      return { top: offset, left: offset };
    case "bottom-right":
      return { bottom: offset, right: offset };
    case "bottom-left":
      return { bottom: offset, left: offset };
    case "top-right":
    default:
      return { top: offset, right: offset };
  }
}
function Avatar(props) {
  const {
    src,
    alt,
    name,
    size,
    shape = "circle",
    fallbackColor,
    status,
    statusPosition = "bottom-right"
  } = props;
  const [imgError, setImgError] = useState(false);
  const px = resolveSize(size);
  const borderRadius = shape === "circle" ? "50%" : `${Math.round(px * 0.15)}px`;
  const bgColor = fallbackColor ?? colorFromName(name);
  const fontSize = `${Math.round(px * 0.4)}px`;
  const containerStyle3 = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${px}px`,
    height: `${px}px`,
    borderRadius,
    overflow: "hidden",
    flexShrink: "0"
  };
  let content;
  if (src && !imgError) {
    content = createElement("img", {
      src,
      alt: alt ?? name ?? "avatar",
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block"
      },
      onError: () => setImgError(true)
    });
  } else {
    const initials = getInitials(name);
    content = createElement("span", {
      style: {
        fontSize,
        fontWeight: "600",
        color: "#fff",
        lineHeight: "1",
        userSelect: "none",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      },
      "aria-hidden": "true"
    }, initials);
  }
  const avatarEl = createElement("div", {
    style: {
      ...containerStyle3,
      backgroundColor: src && !imgError ? "transparent" : bgColor
    },
    role: "img",
    "aria-label": alt ?? name ?? "avatar"
  }, content);
  if (!status) return avatarEl;
  const dotSize = Math.max(8, Math.round(px * 0.25));
  const dotStyle = {
    position: "absolute",
    width: `${dotSize}px`,
    height: `${dotSize}px`,
    borderRadius: "50%",
    backgroundColor: statusColors[status] ?? statusColors.offline,
    border: "2px solid #fff",
    boxSizing: "border-box",
    ...statusPositionStyle(statusPosition, dotSize)
  };
  return createElement(
    "div",
    {
      style: {
        position: "relative",
        display: "inline-flex",
        width: `${px}px`,
        height: `${px}px`,
        flexShrink: "0"
      }
    },
    avatarEl,
    createElement("span", {
      style: dotStyle,
      "aria-label": status
    })
  );
}

// ../components/data/badge/src/Badge.ts
var badgeSizes = {
  sm: { minWidth: "16px", height: "16px", fontSize: "10px", padding: "0 4px" },
  md: { minWidth: "20px", height: "20px", fontSize: "12px", padding: "0 6px" },
  lg: { minWidth: "24px", height: "24px", fontSize: "14px", padding: "0 8px" }
};
var dotSizes = {
  sm: { width: "6px", height: "6px" },
  md: { width: "8px", height: "8px" },
  lg: { width: "10px", height: "10px" }
};
function Badge(props) {
  const {
    count,
    max,
    dot = false,
    color = "#ef4444",
    size = "md",
    variant = "solid",
    children
  } = props;
  let displayText = null;
  if (!dot && count != null) {
    displayText = max != null && count > max ? `${max}+` : String(count);
  }
  const showBadge = dot || count != null && count > 0;
  const badgeStyle = dot ? {
    ...dotSizes[size],
    borderRadius: "50%",
    ...variant === "solid" ? { backgroundColor: color } : { backgroundColor: "transparent", border: `2px solid ${color}` }
  } : {
    ...badgeSizes[size],
    borderRadius: "9999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: "600",
    lineHeight: "1",
    boxSizing: "border-box",
    ...variant === "solid" ? { backgroundColor: color, color: "#fff" } : { backgroundColor: "transparent", color, border: `2px solid ${color}` }
  };
  const badgeEl = showBadge ? createElement(
    "span",
    { style: badgeStyle, "aria-label": dot ? "notification" : `count ${displayText}` },
    displayText
  ) : null;
  if (children == null) {
    return badgeEl ?? createElement("span", null);
  }
  const overlayBadgeStyle = {
    ...badgeStyle,
    position: "absolute",
    top: "0",
    right: "0",
    transform: "translate(50%, -50%)",
    zIndex: "1"
  };
  return createElement(
    "span",
    {
      style: {
        position: "relative",
        display: "inline-flex"
      }
    },
    children,
    showBadge ? createElement(
      "span",
      { style: overlayBadgeStyle, "aria-label": dot ? "notification" : `count ${displayText}` },
      displayText
    ) : null
  );
}

// ../components/data/data-grid/src/DataGrid.ts
var baseTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: "14px",
  color: "#1f2937"
};
var baseHeaderCellStyle = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: "600",
  backgroundColor: "#f9fafb",
  borderBottom: "2px solid #e5e7eb",
  userSelect: "none",
  whiteSpace: "nowrap"
};
var baseCellStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb"
};
var compactCellPadding = "6px 8px";
var sortIndicatorStyle = {
  marginLeft: "4px",
  fontSize: "12px",
  color: "#6b7280"
};
var filterInputStyle = {
  width: "100%",
  padding: "4px 8px",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  fontSize: "12px",
  boxSizing: "border-box"
};
var paginationWrapperStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  fontSize: "13px",
  color: "#6b7280"
};
var pageButtonStyle = {
  padding: "4px 10px",
  margin: "0 2px",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  backgroundColor: "#fff",
  cursor: "pointer",
  fontSize: "13px"
};
var pageButtonActiveStyle = {
  ...pageButtonStyle,
  backgroundColor: "#3b82f6",
  color: "#fff",
  borderColor: "#3b82f6"
};
var pageButtonDisabledStyle = {
  ...pageButtonStyle,
  opacity: "0.5",
  cursor: "default"
};
var checkboxStyle = {
  cursor: "pointer",
  width: "16px",
  height: "16px"
};
function getSortIndicator(columnKey, sortBy, sortDir) {
  if (columnKey !== sortBy) return "\u2195";
  return sortDir === "asc" ? "\u2191" : "\u2193";
}
function DataGrid(props) {
  const {
    columns,
    data,
    pageSize,
    currentPage: controlledPage,
    onPageChange,
    sortBy: controlledSortBy,
    sortDir: controlledSortDir,
    onSort,
    selectable = false,
    selectedRows: controlledSelected,
    onSelectionChange,
    striped = false,
    bordered = false,
    compact = false,
    stickyHeader = false
  } = props;
  const [internalPage, setInternalPage] = useState(0);
  const [internalSortBy, setInternalSortBy] = useState(void 0);
  const [internalSortDir, setInternalSortDir] = useState("asc");
  const [internalSelected, setInternalSelected] = useState([]);
  const [filters, setFilters] = useState({});
  const page = controlledPage ?? internalPage;
  const sortByKey = controlledSortBy ?? internalSortBy;
  const sortDir = controlledSortDir ?? internalSortDir;
  const selected = controlledSelected ?? internalSelected;
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v.length > 0);
    if (activeFilters.length === 0) return data;
    return data.filter(
      (row) => activeFilters.every(([key, term]) => {
        const cellValue = String(row[key] ?? "").toLowerCase();
        return cellValue.includes(term.toLowerCase());
      })
    );
  }, [data, filters]);
  const sortedData = useMemo(() => {
    if (!sortByKey) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sortByKey];
      const bVal = b[sortByKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      const cmp = aStr.localeCompare(bStr);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredData, sortByKey, sortDir]);
  const totalRows = sortedData.length;
  const totalPages = pageSize ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const pagedData = pageSize ? sortedData.slice(page * pageSize, (page + 1) * pageSize) : sortedData;
  const setPage = useCallback(
    (p) => {
      if (onPageChange) onPageChange(p);
      else setInternalPage(p);
    },
    [onPageChange]
  );
  const handleSort = useCallback(
    (key) => {
      const newDir = sortByKey === key && sortDir === "asc" ? "desc" : "asc";
      if (onSort) {
        onSort(key, newDir);
      } else {
        setInternalSortBy(key);
        setInternalSortDir(newDir);
      }
    },
    [sortByKey, sortDir, onSort]
  );
  const toggleRow = useCallback(
    (index) => {
      const next = selected.includes(index) ? selected.filter((i) => i !== index) : [...selected, index];
      if (onSelectionChange) onSelectionChange(next);
      else setInternalSelected(next);
    },
    [selected, onSelectionChange]
  );
  const toggleAll = useCallback(() => {
    const allIndices = pagedData.map((_, i) => pageSize ? page * pageSize + i : i);
    const allSelected = allIndices.every((i) => selected.includes(i));
    const next = allSelected ? selected.filter((i) => !allIndices.includes(i)) : [.../* @__PURE__ */ new Set([...selected, ...allIndices])];
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelected(next);
  }, [pagedData, selected, pageSize, page, onSelectionChange]);
  const handleFilter = useCallback(
    (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(0);
    },
    [setPage]
  );
  const hasFilters = columns.some((c) => c.filterable);
  const cellPad = compact ? compactCellPadding : baseCellStyle.padding;
  const headerCells = [];
  if (selectable) {
    const allPageIndices = pagedData.map((_, i) => pageSize ? page * pageSize + i : i);
    const allChecked = allPageIndices.length > 0 && allPageIndices.every((i) => selected.includes(i));
    headerCells.push(
      createElement(
        "th",
        {
          key: "__select_all",
          style: {
            ...baseHeaderCellStyle,
            padding: cellPad,
            width: "40px",
            textAlign: "center",
            ...stickyHeader ? { position: "sticky", top: "0", zIndex: "2" } : {}
          }
        },
        createElement("input", {
          type: "checkbox",
          checked: allChecked,
          onChange: toggleAll,
          style: checkboxStyle,
          "aria-label": "Select all rows"
        })
      )
    );
  }
  for (const col of columns) {
    const cellStyle2 = {
      ...baseHeaderCellStyle,
      padding: cellPad,
      ...col.width ? { width: col.width } : {},
      ...col.sortable ? { cursor: "pointer" } : {},
      ...bordered ? { border: "1px solid #e5e7eb" } : {},
      ...stickyHeader ? { position: "sticky", top: "0", zIndex: "2" } : {}
    };
    const children = [col.header];
    if (col.sortable) {
      children.push(
        createElement("span", { style: sortIndicatorStyle }, getSortIndicator(col.key, sortByKey, sortDir))
      );
    }
    headerCells.push(
      createElement("th", {
        key: col.key,
        style: cellStyle2,
        onClick: col.sortable ? () => handleSort(col.key) : void 0,
        onKeyDown: col.sortable ? (e) => {
          const key = e.key;
          if (key === "Enter" || key === " ") {
            e.preventDefault();
            handleSort(col.key);
          }
        } : void 0,
        tabIndex: col.sortable ? 0 : void 0,
        role: col.sortable ? "columnheader" : void 0,
        "aria-sort": sortByKey === col.key ? sortDir === "asc" ? "ascending" : "descending" : void 0
      }, ...children)
    );
  }
  let filterRow = null;
  if (hasFilters) {
    const filterCells = [];
    if (selectable) {
      filterCells.push(
        createElement("th", { key: "__filter_spacer", style: { padding: cellPad } })
      );
    }
    for (const col of columns) {
      filterCells.push(
        createElement(
          "th",
          {
            key: `filter_${col.key}`,
            style: { padding: "4px 8px", backgroundColor: "#f9fafb" }
          },
          col.filterable ? createElement("input", {
            type: "text",
            placeholder: `Filter ${col.header}...`,
            style: filterInputStyle,
            value: filters[col.key] ?? "",
            onInput: (e) => handleFilter(col.key, e.target.value),
            "aria-label": `Filter by ${col.header}`
          }) : null
        )
      );
    }
    filterRow = createElement("tr", { key: "__filter_row" }, ...filterCells);
  }
  const bodyRows = [];
  for (let i = 0; i < pagedData.length; i++) {
    const row = pagedData[i];
    const absoluteIndex = pageSize ? page * pageSize + i : i;
    const isSelected = selected.includes(absoluteIndex);
    const rowStyle = {};
    if (striped && i % 2 === 1) rowStyle.backgroundColor = "#f9fafb";
    if (isSelected) rowStyle.backgroundColor = "#eff6ff";
    const cells = [];
    if (selectable) {
      cells.push(
        createElement(
          "td",
          {
            key: "__select",
            style: { padding: cellPad, textAlign: "center", ...baseCellStyle, ...bordered ? { border: "1px solid #e5e7eb" } : {} }
          },
          createElement("input", {
            type: "checkbox",
            checked: isSelected,
            onChange: () => toggleRow(absoluteIndex),
            style: checkboxStyle,
            "aria-label": `Select row ${absoluteIndex + 1}`
          })
        )
      );
    }
    for (const col of columns) {
      const value = row[col.key];
      const cellContent = col.render ? col.render(value, row) : String(value ?? "");
      cells.push(
        createElement("td", {
          key: col.key,
          style: {
            ...baseCellStyle,
            padding: cellPad,
            ...bordered ? { border: "1px solid #e5e7eb" } : {}
          }
        }, cellContent)
      );
    }
    bodyRows.push(
      createElement("tr", { key: String(absoluteIndex), style: rowStyle }, ...cells)
    );
  }
  let pagination = null;
  if (pageSize) {
    const startRow = totalRows === 0 ? 0 : page * pageSize + 1;
    const endRow = Math.min((page + 1) * pageSize, totalRows);
    const pageButtons = [];
    pageButtons.push(
      createElement("button", {
        key: "prev",
        style: page === 0 ? pageButtonDisabledStyle : pageButtonStyle,
        onClick: page > 0 ? () => setPage(page - 1) : void 0,
        disabled: page === 0,
        "aria-label": "Previous page"
      }, "\u2190 Prev")
    );
    const maxButtons = 7;
    let startPage = Math.max(0, page - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxButtons);
    if (endPage - startPage < maxButtons) {
      startPage = Math.max(0, endPage - maxButtons);
    }
    if (startPage > 0) {
      pageButtons.push(
        createElement("button", { key: "p0", style: pageButtonStyle, onClick: () => setPage(0) }, "1")
      );
      if (startPage > 1) {
        pageButtons.push(createElement("span", { key: "e1", style: { margin: "0 4px" } }, "..."));
      }
    }
    for (let p = startPage; p < endPage; p++) {
      pageButtons.push(
        createElement("button", {
          key: `p${p}`,
          style: p === page ? pageButtonActiveStyle : pageButtonStyle,
          onClick: p !== page ? () => setPage(p) : void 0,
          "aria-current": p === page ? "page" : void 0
        }, String(p + 1))
      );
    }
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageButtons.push(createElement("span", { key: "e2", style: { margin: "0 4px" } }, "..."));
      }
      pageButtons.push(
        createElement("button", {
          key: `p${totalPages - 1}`,
          style: pageButtonStyle,
          onClick: () => setPage(totalPages - 1)
        }, String(totalPages))
      );
    }
    pageButtons.push(
      createElement("button", {
        key: "next",
        style: page >= totalPages - 1 ? pageButtonDisabledStyle : pageButtonStyle,
        onClick: page < totalPages - 1 ? () => setPage(page + 1) : void 0,
        disabled: page >= totalPages - 1,
        "aria-label": "Next page"
      }, "Next \u2192")
    );
    pagination = createElement(
      "div",
      { style: paginationWrapperStyle },
      createElement("span", null, `Showing ${startRow}\u2013${endRow} of ${totalRows}`),
      createElement("div", { style: { display: "flex", alignItems: "center", gap: "2px" } }, ...pageButtons)
    );
  }
  const wrapperStyle = {
    width: "100%",
    ...stickyHeader ? { overflow: "auto", maxHeight: "600px" } : {}
  };
  const tableStyle2 = {
    ...baseTableStyle,
    ...bordered ? { border: "1px solid #e5e7eb" } : {}
  };
  const thead = createElement(
    "thead",
    null,
    createElement("tr", null, ...headerCells),
    filterRow
  );
  const tbody = createElement("tbody", null, ...bodyRows);
  const table = createElement("table", {
    style: tableStyle2,
    role: "grid",
    "aria-rowcount": String(totalRows)
  }, thead, tbody);
  return createElement(
    "div",
    { style: wrapperStyle },
    table,
    pagination
  );
}

// ../components/data/digital-clock/src/DigitalClock.ts
function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}
function getTimeParts(date, timezone) {
  if (timezone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return { hours: get("hour"), minutes: get("minute"), seconds: get("second") };
  }
  return { hours: date.getHours(), minutes: date.getMinutes(), seconds: date.getSeconds() };
}
function formatDate2(date, dateFormat, timezone) {
  if (timezone) {
    const options = { timeZone: timezone };
    if (dateFormat === "short") {
      Object.assign(options, { month: "2-digit", day: "2-digit", year: "numeric" });
      return new Intl.DateTimeFormat("en-US", options).format(date);
    }
    if (dateFormat === "long") {
      Object.assign(options, { month: "long", day: "numeric", year: "numeric" });
      return new Intl.DateTimeFormat("en-US", options).format(date);
    }
    Object.assign(options, { year: "numeric", month: "2-digit", day: "2-digit" });
    const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  }
  if (dateFormat === "short") {
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
  }
  if (dateFormat === "long") {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
var containerStyle = {
  fontFamily: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", "Courier New", monospace',
  backgroundColor: "#1e293b",
  color: "#e2e8f0",
  padding: "16px 24px",
  borderRadius: "8px",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px"
};
var timeStyle = {
  fontSize: "2rem",
  fontWeight: "600",
  letterSpacing: "2px",
  lineHeight: "1"
};
var ampmStyle = {
  fontSize: "0.875rem",
  fontWeight: "400",
  marginLeft: "4px",
  verticalAlign: "super"
};
var dateStyle = {
  fontSize: "0.75rem",
  color: "#94a3b8",
  marginTop: "4px"
};
function DigitalClock(props) {
  const {
    format = "12h",
    showDate = false,
    dateFormat = "short",
    showSeconds = true,
    timezone,
    className
  } = props;
  const [now, setNow] = useState(/* @__PURE__ */ new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(/* @__PURE__ */ new Date());
    }, 1e3);
    return () => clearInterval(interval);
  }, []);
  const { hours, minutes, seconds } = getTimeParts(now, timezone);
  let displayHours;
  let period = null;
  if (format === "12h") {
    period = hours >= 12 ? "PM" : "AM";
    displayHours = hours % 12 || 12;
  } else {
    displayHours = hours;
  }
  let timeStr = `${pad(displayHours)}:${pad(minutes)}`;
  if (showSeconds) {
    timeStr += `:${pad(seconds)}`;
  }
  const timeChildren = [timeStr];
  if (period != null) {
    timeChildren.push(createElement("span", { style: ampmStyle }, period));
  }
  const wrapperChildren = [
    createElement("span", { style: timeStyle }, ...timeChildren)
  ];
  if (showDate) {
    wrapperChildren.push(
      createElement("span", { style: dateStyle }, formatDate2(now, dateFormat, timezone))
    );
  }
  return createElement("div", {
    style: containerStyle,
    ...className ? { class: className } : {}
  }, ...wrapperChildren);
}

// ../components/data/list-view/src/ListView.ts
var listStyle = {
  listStyle: "none",
  margin: "0",
  padding: "0",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: "14px"
};
var itemBaseStyle = {
  padding: "10px 14px",
  color: "var(--color-text, #1f2937)"
};
var dividerStyle = {
  borderBottom: "1px solid var(--color-border, #e5e7eb)"
};
var hoverableStyle = {
  cursor: "pointer",
  transition: "background-color 0.15s ease"
};
var selectedStyle = {
  backgroundColor: "var(--color-bg-muted, #eff6ff)"
};
var emptyStyle = {
  padding: "24px",
  textAlign: "center",
  color: "var(--color-text-muted, #9ca3af)",
  fontSize: "14px"
};
var sectionStyle = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--color-border, #e5e7eb)",
  backgroundColor: "var(--color-bg-subtle, #f9fafb)",
  fontWeight: "600",
  fontSize: "13px",
  color: "var(--color-text-muted, #6b7280)"
};
function ListView(props) {
  const {
    items,
    renderItem,
    keyExtractor,
    divider = false,
    hoverable = false,
    selectedIndex,
    onSelect,
    emptyMessage = "No items",
    header,
    footer
  } = props;
  if (items.length === 0) {
    return createElement(
      "div",
      null,
      header ? createElement("div", { style: sectionStyle }, header) : null,
      createElement("div", { style: emptyStyle }, emptyMessage),
      footer ? createElement("div", { style: { ...sectionStyle, borderBottom: "none", borderTop: "1px solid #e5e7eb" } }, footer) : null
    );
  }
  const listItems = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = keyExtractor(item, i);
    const isSelected = selectedIndex === i;
    const isLast = i === items.length - 1;
    const style = {
      ...itemBaseStyle,
      ...hoverable ? hoverableStyle : {},
      ...isSelected ? selectedStyle : {},
      ...divider && !isLast ? dividerStyle : {}
    };
    listItems.push(
      createElement("li", {
        key,
        style,
        onClick: onSelect ? () => onSelect(i) : void 0,
        onKeyDown: onSelect ? (e) => {
          const k = e.key;
          if (k === "Enter" || k === " ") {
            e.preventDefault();
            onSelect(i);
          }
        } : void 0,
        role: onSelect ? "option" : void 0,
        tabIndex: onSelect ? 0 : void 0,
        "aria-selected": onSelect ? String(isSelected) : void 0
      }, renderItem(item, i))
    );
  }
  return createElement(
    "div",
    null,
    header ? createElement("div", { style: sectionStyle }, header) : null,
    createElement("ul", {
      style: listStyle,
      role: onSelect ? "listbox" : "list"
    }, ...listItems),
    footer ? createElement("div", { style: { ...sectionStyle, borderBottom: "none", borderTop: "1px solid #e5e7eb" } }, footer) : null
  );
}

// ../components/data/tag/src/Tag.ts
function resolveColor(color) {
  return color ?? "#3b82f6";
}
function hexToRgba(hex, alpha) {
  const named = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    purple: "#a855f7",
    pink: "#ec4899",
    orange: "#f97316",
    gray: "#6b7280",
    indigo: "#6366f1",
    teal: "#14b8a6",
    cyan: "#06b6d4"
  };
  const resolved = named[hex] ?? hex;
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(resolved);
  if (match) {
    return `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}, ${alpha})`;
  }
  return hex;
}
var sizes = {
  sm: { fontSize: "11px", padding: "2px 8px", gap: "4px" },
  md: { fontSize: "13px", padding: "4px 10px", gap: "6px" },
  lg: { fontSize: "15px", padding: "6px 14px", gap: "8px" }
};
function buildTagStyle(color, variant, size, clickable, disabled) {
  const s = sizes[size];
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: s.gap,
    borderRadius: "9999px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: s.fontSize,
    fontWeight: "500",
    padding: s.padding,
    lineHeight: "1.4",
    whiteSpace: "nowrap",
    border: "none",
    transition: "opacity 0.15s ease, filter 0.15s ease",
    ...clickable ? { cursor: "pointer" } : {},
    ...disabled ? { opacity: "0.5", cursor: "default", pointerEvents: "none" } : {}
  };
  switch (variant) {
    case "solid":
      return { ...base, backgroundColor: color, color: "#fff", border: "none" };
    case "outline":
      return { ...base, backgroundColor: "transparent", color, border: `1px solid ${color}` };
    case "subtle":
      return { ...base, backgroundColor: hexToRgba(color, 0.12), color, border: "none" };
    default:
      return base;
  }
}
var removeButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  padding: "0",
  marginLeft: "2px",
  cursor: "pointer",
  fontSize: "inherit",
  lineHeight: "1",
  opacity: "0.7",
  color: "inherit"
};
function Tag(props) {
  const {
    label,
    color,
    variant = "subtle",
    size = "md",
    removable = false,
    onRemove,
    icon,
    onClick,
    disabled = false
  } = props;
  const resolvedColor = resolveColor(color);
  const style = buildTagStyle(resolvedColor, variant, size, !!onClick, disabled);
  const children = [];
  if (icon) {
    children.push(
      createElement("span", { key: "icon", style: { display: "inline-flex", flexShrink: "0" } }, icon)
    );
  }
  children.push(
    createElement("span", { key: "label" }, label)
  );
  if (removable) {
    children.push(
      createElement("button", {
        key: "remove",
        type: "button",
        style: removeButtonStyle,
        onClick: (e) => {
          e.stopPropagation();
          if (!disabled && onRemove) onRemove();
        },
        "aria-label": `Remove ${label}`,
        disabled
      }, "\xD7")
    );
  }
  return createElement("span", {
    style,
    role: onClick ? "button" : void 0,
    tabIndex: onClick && !disabled ? "0" : void 0,
    onClick: !disabled && onClick ? onClick : void 0,
    onKeyDown: onClick && !disabled ? (e) => {
      const key = e.key;
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        onClick();
      }
    } : void 0,
    "aria-disabled": disabled ? "true" : void 0
  }, ...children);
}

// ../components/data/virtual-scroll/src/VirtualScroll.ts
var containerStyle2 = {
  overflow: "auto",
  position: "relative",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};
function VirtualScroll(props) {
  const {
    items,
    renderItem,
    itemHeight,
    overscan = 5,
    height
  } = props;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const totalHeight = items.length * itemHeight;
  const containerHeightPx = parseInt(height, 10) || 400;
  const visibleCount = Math.ceil(containerHeightPx / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.floor(scrollTop / itemHeight) + visibleCount + overscan);
  const handleScroll = useCallback((e) => {
    const target = e.target;
    setScrollTop(target.scrollTop);
  }, []);
  const visibleItems = [];
  for (let i = startIndex; i < endIndex; i++) {
    visibleItems.push(
      createElement("div", {
        key: String(i),
        style: {
          position: "absolute",
          top: `${i * itemHeight}px`,
          left: "0",
          right: "0",
          height: `${itemHeight}px`,
          overflow: "hidden"
        }
      }, renderItem(items[i], i))
    );
  }
  return createElement(
    "div",
    {
      ref: containerRef,
      style: { ...containerStyle2, height },
      onScroll: handleScroll
    },
    // Spacer div for correct scrollbar size
    createElement("div", {
      style: {
        height: `${totalHeight}px`,
        position: "relative",
        width: "100%"
      }
    }, ...visibleItems)
  );
}

// ../components/feedback/alert/src/Alert.ts
var TYPE_THEMES = {
  info: { icon: "\u2139\uFE0F", bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", filledBg: "#3b82f6", filledText: "#ffffff" },
  success: { icon: "\u2705", bg: "#f0fdf4", border: "#22c55e", text: "#166534", filledBg: "#22c55e", filledText: "#ffffff" },
  warning: { icon: "\u26A0\uFE0F", bg: "#fffbeb", border: "#f59e0b", text: "#92400e", filledBg: "#f59e0b", filledText: "#ffffff" },
  error: { icon: "\u274C", bg: "#fef2f2", border: "#ef4444", text: "#991b1b", filledBg: "#ef4444", filledText: "#ffffff" }
};
function Alert(props) {
  const [visible, setVisible] = useState(true);
  const type = props.type ?? "info";
  const variant = props.variant ?? "subtle";
  const theme = TYPE_THEMES[type] ?? TYPE_THEMES.info;
  const icon = props.icon ?? theme.icon;
  const content = props.message ?? props.children;
  const containerStyle3 = useMemo(() => {
    const s = {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      padding: "12px 16px",
      borderRadius: "8px",
      fontSize: "14px",
      lineHeight: "1.5"
    };
    if (variant === "filled") {
      s.backgroundColor = theme.filledBg;
      s.color = theme.filledText;
    } else if (variant === "outline") {
      s.backgroundColor = "transparent";
      s.border = `1px solid ${theme.border}`;
      s.color = theme.text;
    } else {
      s.backgroundColor = theme.bg;
      s.color = theme.text;
    }
    return s;
  }, [variant, theme]);
  if (!visible) return null;
  return createElement(
    "div",
    { role: "alert", style: containerStyle3 },
    // Icon
    createElement("span", { style: { flexShrink: "0", fontSize: "16px", lineHeight: "1.5" } }, icon),
    // Content area
    createElement(
      "div",
      { style: { flex: "1", minWidth: "0" } },
      props.title ? createElement(
        "div",
        { style: { fontWeight: "600", marginBottom: content ? "4px" : "0" } },
        props.title
      ) : null,
      content ? createElement("div", null, content) : null,
      props.action ? createElement(
        "button",
        {
          onclick: props.action.onClick,
          style: {
            marginTop: "8px",
            padding: "4px 12px",
            fontSize: "13px",
            fontWeight: "500",
            border: variant === "filled" ? "1px solid currentColor" : `1px solid ${theme.border}`,
            borderRadius: "4px",
            backgroundColor: "transparent",
            color: "inherit",
            cursor: "pointer"
          }
        },
        props.action.label
      ) : null
    ),
    // Close button
    props.closable ? createElement(
      "button",
      {
        "aria-label": "Close",
        onclick: () => {
          setVisible(false);
          if (props.onClose) props.onClose();
        },
        style: {
          flexShrink: "0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: "1",
          color: "inherit",
          opacity: "0.7",
          padding: "0"
        }
      },
      "\xD7"
    ) : null
  );
}

// ../components/feedback/empty-state/src/EmptyState.ts
function EmptyState(props) {
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        gap: "16px"
      }
    },
    // Image
    props.image ? createElement("img", {
      src: props.image,
      alt: "",
      style: { maxWidth: "200px", maxHeight: "160px", objectFit: "contain" }
    }) : null,
    // Icon
    props.icon ? createElement(
      "div",
      { style: { fontSize: "48px", lineHeight: "1" } },
      props.icon
    ) : null,
    // Title
    props.title ? createElement(
      "h3",
      {
        style: {
          margin: "0",
          fontSize: "20px",
          fontWeight: "600",
          color: "#111827",
          lineHeight: "1.4"
        }
      },
      props.title
    ) : null,
    // Description
    props.description ? createElement(
      "p",
      {
        style: {
          margin: "0",
          fontSize: "14px",
          color: "#6b7280",
          maxWidth: "360px",
          lineHeight: "1.6"
        }
      },
      props.description
    ) : null,
    // Action button
    props.action ? createElement(
      "button",
      {
        onclick: props.action.onClick,
        style: {
          marginTop: "8px",
          padding: "10px 24px",
          fontSize: "14px",
          fontWeight: "500",
          color: "#ffffff",
          backgroundColor: "#3b82f6",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }
      },
      props.action.label
    ) : null
  );
}

// ../components/feedback/progress-bar/src/ProgressBar.ts
function ProgressBar(props) {
  const max = props.max ?? 100;
  const value = props.indeterminate ? 0 : Math.min(Math.max(props.value ?? 0, 0), max);
  const pct = max > 0 ? value / max * 100 : 0;
  const color = props.color ?? "#3b82f6";
  const bgColor = props.backgroundColor ?? "#e5e7eb";
  const height = props.height ?? (typeof props.size === "string" ? props.size : typeof props.size === "number" ? `${props.size}px` : "8px");
  const variant = props.variant ?? "bar";
  const animId = useId();
  if (variant === "circular") {
    const sizeNum = typeof props.size === "number" ? props.size : 48;
    const strokeWidth = Math.max(2, Math.round(sizeNum / 10));
    const radius = (sizeNum - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = props.indeterminate ? circumference * 0.75 : circumference - pct / 100 * circumference;
    const keyframes = props.indeterminate ? `@keyframes liq-spin-${animId}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` : props.animated ? `@keyframes liq-pulse-${animId}{0%,100%{opacity:1}50%{opacity:0.6}}` : "";
    return createElement(
      "div",
      {
        role: "progressbar",
        "aria-valuenow": props.indeterminate ? void 0 : String(Math.round(pct)),
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-label": "Progress",
        style: { display: "inline-flex", alignItems: "center", gap: "8px" }
      },
      keyframes ? createElement("style", null, keyframes) : null,
      createElement(
        "svg",
        {
          width: String(sizeNum),
          height: String(sizeNum),
          viewBox: `0 0 ${sizeNum} ${sizeNum}`,
          style: props.indeterminate ? { animation: `liq-spin-${animId} 1s linear infinite` } : props.animated ? { animation: `liq-pulse-${animId} 1.5s ease-in-out infinite` } : {}
        },
        createElement("circle", {
          cx: String(sizeNum / 2),
          cy: String(sizeNum / 2),
          r: String(radius),
          fill: "none",
          stroke: bgColor,
          "stroke-width": String(strokeWidth)
        }),
        createElement("circle", {
          cx: String(sizeNum / 2),
          cy: String(sizeNum / 2),
          r: String(radius),
          fill: "none",
          stroke: color,
          "stroke-width": String(strokeWidth),
          "stroke-dasharray": String(circumference),
          "stroke-dashoffset": String(offset),
          "stroke-linecap": "round",
          transform: `rotate(-90 ${sizeNum / 2} ${sizeNum / 2})`,
          style: { transition: "stroke-dashoffset 0.3s ease" }
        })
      ),
      props.showLabel && !props.indeterminate ? createElement("span", { style: { fontSize: "14px", color: "#374151" } }, `${Math.round(pct)}%`) : null
    );
  }
  const shimmerKeyframes = props.animated || props.indeterminate ? `@keyframes liq-shimmer-${animId}{0%{background-position:-200% 0}100%{background-position:200% 0}}` : "";
  const indeterminateKeyframes = props.indeterminate ? `@keyframes liq-indeterminate-${animId}{0%{left:-40%;width:40%}50%{left:20%;width:60%}100%{left:100%;width:40%}}` : "";
  const trackStyle = {
    width: "100%",
    height,
    backgroundColor: bgColor,
    borderRadius: height,
    overflow: "hidden",
    position: "relative"
  };
  const fillStyle = useMemo(() => {
    const s = {
      height: "100%",
      borderRadius: height,
      transition: "width 0.3s ease"
    };
    if (props.indeterminate) {
      s.position = "absolute";
      s.animation = `liq-indeterminate-${animId} 1.5s ease-in-out infinite`;
      s.backgroundColor = color;
    } else {
      s.width = `${pct}%`;
      s.backgroundColor = color;
    }
    if (props.animated && !props.indeterminate) {
      s.backgroundImage = `linear-gradient(90deg, ${color} 0%, ${lighten(color)} 50%, ${color} 100%)`;
      s.backgroundSize = "200% 100%";
      s.animation = `liq-shimmer-${animId} 1.5s ease-in-out infinite`;
    }
    return s;
  }, [pct, color, height, props.animated, props.indeterminate, animId]);
  return createElement(
    "div",
    {
      role: "progressbar",
      "aria-valuenow": props.indeterminate ? void 0 : String(Math.round(pct)),
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-label": "Progress",
      style: { width: "100%" }
    },
    shimmerKeyframes || indeterminateKeyframes ? createElement("style", null, shimmerKeyframes + indeterminateKeyframes) : null,
    props.showLabel && !props.indeterminate ? createElement(
      "div",
      { style: { marginBottom: "4px", fontSize: "12px", color: "#374151", textAlign: "right" } },
      `${Math.round(pct)}%`
    ) : null,
    createElement(
      "div",
      { style: trackStyle },
      createElement("div", { style: fillStyle })
    )
  );
}
function lighten(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + 40);
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + 40);
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + 40);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ../components/feedback/skeleton/src/Skeleton.ts
function Skeleton(props) {
  const variant = props.variant ?? "text";
  const animated = props.animated !== false;
  const animId = useId();
  const keyframes = useMemo(
    () => animated ? `@keyframes liq-shimmer-${animId}{0%{background-position:-200% 0}100%{background-position:200% 0}}` : "",
    [animated, animId]
  );
  const cssWidth = typeof props.width === "number" ? `${props.width}px` : props.width;
  const cssHeight = typeof props.height === "number" ? `${props.height}px` : props.height;
  if (variant === "text") {
    const lineCount = props.lines ?? 1;
    const lines = [];
    for (let i = 0; i < lineCount; i++) {
      const isLast = i === lineCount - 1 && lineCount > 1;
      lines.push(
        createElement("div", {
          key: String(i),
          style: buildShimmerStyle({
            width: isLast ? "75%" : cssWidth ?? "100%",
            height: cssHeight ?? "1em",
            borderRadius: props.borderRadius ?? "4px",
            animated,
            animId,
            marginBottom: i < lineCount - 1 ? "8px" : "0"
          })
        })
      );
    }
    return createElement(
      "div",
      { "aria-hidden": "true", style: { width: cssWidth ?? "100%" } },
      keyframes ? createElement("style", null, keyframes) : null,
      ...lines
    );
  }
  if (variant === "circular") {
    const size = cssWidth ?? cssHeight ?? "40px";
    return createElement(
      "div",
      { "aria-hidden": "true" },
      keyframes ? createElement("style", null, keyframes) : null,
      createElement("div", {
        style: buildShimmerStyle({
          width: size,
          height: size,
          borderRadius: "50%",
          animated,
          animId
        })
      })
    );
  }
  return createElement(
    "div",
    { "aria-hidden": "true" },
    keyframes ? createElement("style", null, keyframes) : null,
    createElement("div", {
      style: buildShimmerStyle({
        width: cssWidth ?? "100%",
        height: cssHeight ?? "100px",
        borderRadius: props.borderRadius ?? "4px",
        animated,
        animId
      })
    })
  );
}
function buildShimmerStyle(opts) {
  const s = {
    width: opts.width,
    height: opts.height,
    borderRadius: opts.borderRadius,
    backgroundColor: "#e5e7eb"
  };
  if (opts.animated) {
    s.backgroundImage = "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)";
    s.backgroundSize = "200% 100%";
    s.animation = `liq-shimmer-${opts.animId} 1.5s ease-in-out infinite`;
  }
  if (opts.marginBottom) {
    s.marginBottom = opts.marginBottom;
  }
  return s;
}

// ../components/feedback/spinner/src/Spinner.ts
var SIZE_MAP = { sm: 16, md: 24, lg: 40 };
var SPEED_MAP = { slow: "1.2s", normal: "0.75s", fast: "0.45s" };
function Spinner(props) {
  const sizeVal = typeof props.size === "number" ? props.size : SIZE_MAP[props.size ?? "md"] ?? 24;
  const color = props.color ?? "#3b82f6";
  const thickness = props.thickness ?? Math.max(2, Math.round(sizeVal / 8));
  const speed = SPEED_MAP[props.speed ?? "normal"] ?? SPEED_MAP.normal;
  const label = props.label ?? "Loading";
  const animId = useId();
  const radius = (sizeVal - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const keyframes = useMemo(
    () => `@keyframes liq-rotate-${animId}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`,
    [animId]
  );
  return createElement(
    "span",
    {
      role: "status",
      "aria-label": label,
      style: { display: "inline-flex", alignItems: "center", justifyContent: "center" }
    },
    createElement("style", null, keyframes),
    createElement(
      "svg",
      {
        width: String(sizeVal),
        height: String(sizeVal),
        viewBox: `0 0 ${sizeVal} ${sizeVal}`,
        style: { animation: `liq-rotate-${animId} ${speed} linear infinite` }
      },
      createElement("circle", {
        cx: String(sizeVal / 2),
        cy: String(sizeVal / 2),
        r: String(radius),
        fill: "none",
        stroke: color,
        "stroke-width": String(thickness),
        "stroke-dasharray": `${circumference * 0.7} ${circumference * 0.3}`,
        "stroke-linecap": "round"
      })
    ),
    createElement(
      "span",
      {
        style: {
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          borderWidth: "0"
        }
      },
      label
    )
  );
}

// ../components/form/wrapper/src/FormFieldWrapper.ts
function FormFieldWrapper(props) {
  const s = props.styling ?? {};
  const hasError = !!props.error;
  const containerStyle3 = {
    display: "flex",
    flexDirection: "column",
    gap: s.gap ?? "4px",
    width: typeof s.width === "number" ? `${s.width}px` : s.width ?? "100%",
    fontFamily: s.fontFamily ?? "inherit",
    fontSize: s.fontSize ?? "14px",
    opacity: props.disabled ? "0.6" : "1",
    ...s.custom ?? {}
  };
  const labelStyle = {
    color: s.labelColor ?? "#374151",
    fontWeight: s.labelFontWeight ?? "500",
    fontSize: s.labelFontSize ?? "14px"
  };
  const helpStyle = {
    fontSize: "12px",
    color: hasError ? s.errorColor ?? "#ef4444" : s.helpColor ?? "#6b7280",
    marginTop: "2px"
  };
  return createElement(
    "div",
    {
      className: `form-field ${hasError ? "form-field--error" : ""} ${props.className ?? ""}`.trim(),
      style: containerStyle3
    },
    // Label
    props.label ? createElement(
      "label",
      {
        htmlFor: props.htmlFor,
        style: labelStyle
      },
      props.label,
      props.required ? createElement("span", {
        style: { color: s.errorColor ?? "#ef4444", marginLeft: "2px" }
      }, "*") : null
    ) : null,
    // Field content
    props.children,
    // Help text or error
    props.error ? createElement("div", { className: "form-field__error", style: helpStyle, role: "alert" }, props.error) : props.helpText ? createElement("div", { className: "form-field__help", style: helpStyle }, props.helpText) : null
  );
}
function buildInputStyle(s, state) {
  const borderColor = state.error ? s.errorBorderColor ?? "#ef4444" : state.focused ? s.focusBorderColor ?? "#3b82f6" : void 0;
  return {
    padding: s.padding ?? "8px 12px",
    border: borderColor ? `1px solid ${borderColor}` : s.border ?? "1px solid #d1d5db",
    borderRadius: s.borderRadius ?? "6px",
    fontSize: s.fontSize ?? "14px",
    fontFamily: s.fontFamily ?? "inherit",
    backgroundColor: s.backgroundColor ?? "#ffffff",
    color: s.color ?? "#1f2937",
    outline: "none",
    transition: s.transition ?? "border-color 0.15s",
    width: "100%",
    boxSizing: "border-box",
    ...state.focused && borderColor ? { boxShadow: `0 0 0 3px ${borderColor}22` } : {},
    ...s.custom ?? {}
  };
}

// ../components/form/checkbox/src/Checkbox.ts
var SIZE_MAP2 = {
  sm: { box: 14, icon: 10, fontSize: "12px" },
  md: { box: 18, icon: 12, fontSize: "14px" },
  lg: { box: 22, icon: 16, fontSize: "16px" }
};
function Checkbox(props) {
  const {
    checked,
    onChange,
    label,
    indeterminate = false,
    disabled = false,
    error: error2,
    size = "md"
  } = props;
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);
  const handleClick = useCallback(() => {
    if (disabled) return;
    onChange(!checked);
  }, [disabled, checked, onChange]);
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onChange(!checked);
      }
    },
    [disabled, checked, onChange]
  );
  const dim = SIZE_MAP2[size];
  const boxSize = `${dim.box}px`;
  const borderColor = error2 ? "#ef4444" : checked || indeterminate ? "#3b82f6" : "#d1d5db";
  const bgColor = checked || indeterminate ? "#3b82f6" : "#ffffff";
  const boxStyle = {
    width: boxSize,
    height: boxSize,
    minWidth: boxSize,
    borderRadius: "4px",
    border: `2px solid ${borderColor}`,
    backgroundColor: bgColor,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    boxSizing: "border-box"
  };
  const iconStyle = {
    color: "#ffffff",
    fontSize: `${dim.icon}px`,
    lineHeight: "1",
    fontWeight: "700"
  };
  const icon = indeterminate ? createElement("span", { style: iconStyle }, "\u2014") : checked ? createElement("span", { style: iconStyle }, "\u2713") : null;
  const containerStyle3 = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? "0.6" : "1",
    userSelect: "none"
  };
  const hiddenInput = createElement("input", {
    ref: inputRef,
    type: "checkbox",
    checked,
    disabled,
    onChange: () => onChange(!checked),
    style: {
      position: "absolute",
      opacity: "0",
      width: "0",
      height: "0",
      pointerEvents: "none"
    },
    "aria-hidden": "true",
    tabIndex: -1
  });
  const box = createElement("div", { style: boxStyle }, icon);
  const labelEl = label ? createElement("span", { style: { fontSize: dim.fontSize, color: "#374151" } }, label) : null;
  return createElement(
    FormFieldWrapper,
    {
      error: error2
    },
    createElement(
      "div",
      {
        style: containerStyle3,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        tabIndex: disabled ? -1 : 0,
        role: "checkbox",
        "aria-checked": indeterminate ? "mixed" : checked ? "true" : "false",
        "aria-disabled": disabled ? "true" : void 0,
        "aria-label": label
      },
      hiddenInput,
      box,
      labelEl
    )
  );
}

// ../components/form/color-picker/src/ColorPicker.ts
var DEFAULT_PRESETS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#d9d9d9",
  "#efefef",
  "#f3f3f3",
  "#ffffff",
  "#980000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#e6b8af",
  "#f4cccc",
  "#fce5cd",
  "#fff2cc",
  "#d9ead3",
  "#d0e0e3",
  "#c9daf8",
  "#cfe2f3",
  "#d9d2e9",
  "#ead1dc"
];
function isValidHex(s) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s);
}
function normalizeHex(s) {
  let h = s.startsWith("#") ? s : `#${s}`;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h.toLowerCase();
}
function ColorPicker(props) {
  const inputId = props.id ?? `cp-${Math.random().toString(36).slice(2, 8)}`;
  const {
    value,
    onChange,
    presets = DEFAULT_PRESETS,
    showInput = true,
    showAlpha = false,
    disabled = false,
    label
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef(null);
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const handleSwatchClick = useCallback(
    (color) => {
      if (disabled) return;
      onChange(normalizeHex(color));
    },
    [disabled, onChange]
  );
  const handleInputChange = useCallback(
    (e) => {
      const raw = e.target.value;
      setInputValue(raw);
      const hex = raw.startsWith("#") ? raw : `#${raw}`;
      if (isValidHex(hex)) {
        onChange(normalizeHex(hex));
      }
    },
    [onChange]
  );
  const handleInputBlur = useCallback(() => {
    if (!isValidHex(inputValue.startsWith("#") ? inputValue : `#${inputValue}`)) {
      setInputValue(value);
    }
  }, [inputValue, value]);
  const swatchTriggerStyle = {
    width: "36px",
    height: "36px",
    borderRadius: "6px",
    border: "2px solid #d1d5db",
    backgroundColor: value,
    cursor: disabled ? "not-allowed" : "pointer",
    flexShrink: "0"
  };
  const triggerContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };
  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: "0",
    marginTop: "4px",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: "1000",
    padding: "12px",
    width: "240px"
  };
  const swatchGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: "4px",
    marginBottom: showInput ? "8px" : "0"
  };
  const swatches = presets.map((color) => {
    const isSelected = normalizeHex(color) === normalizeHex(value);
    const swatchStyle = {
      width: "20px",
      height: "20px",
      borderRadius: "3px",
      backgroundColor: color,
      cursor: disabled ? "not-allowed" : "pointer",
      border: isSelected ? "2px solid #1f2937" : "1px solid #e5e7eb",
      boxSizing: "border-box"
    };
    return createElement("div", {
      key: color,
      style: swatchStyle,
      onClick: () => handleSwatchClick(color),
      onKeyDown: (e) => {
        const key = e.key;
        if (key === "Enter" || key === " ") {
          e.preventDefault();
          handleSwatchClick(color);
        }
      },
      role: "button",
      tabIndex: disabled ? -1 : 0,
      title: color,
      "aria-label": `Select color ${color}`
    });
  });
  const hexInput = showInput ? createElement(
    "div",
    {
      style: { display: "flex", alignItems: "center", gap: "4px" }
    },
    createElement(
      "div",
      {
        style: {
          width: "24px",
          height: "24px",
          borderRadius: "4px",
          backgroundColor: value,
          border: "1px solid #d1d5db",
          flexShrink: "0"
        }
      }
    ),
    createElement("input", {
      type: "text",
      value: inputValue,
      onInput: handleInputChange,
      onBlur: handleInputBlur,
      disabled,
      style: {
        flex: "1",
        padding: "4px 8px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        fontSize: "13px",
        fontFamily: "monospace",
        outline: "none",
        color: "#1f2937"
      },
      placeholder: "#000000",
      "aria-label": "Hex color value"
    })
  ) : null;
  const dropdown = isOpen ? createElement(
    "div",
    { style: dropdownStyle },
    createElement("div", { style: swatchGridStyle }, ...swatches),
    hexInput
  ) : null;
  return createElement(
    FormFieldWrapper,
    {
      label,
      disabled,
      htmlFor: inputId
    },
    createElement(
      "div",
      { ref: containerRef, style: { position: "relative" } },
      createElement(
        "div",
        {
          style: triggerContainerStyle,
          onClick: disabled ? void 0 : () => setIsOpen(!isOpen),
          onKeyDown: disabled ? void 0 : (e) => {
            const key = e.key;
            if (key === "Enter" || key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          },
          role: "button",
          tabIndex: disabled ? -1 : 0,
          "aria-expanded": isOpen ? "true" : "false",
          "aria-label": "Toggle color picker"
        },
        createElement("div", { id: inputId, style: swatchTriggerStyle }),
        showInput ? createElement("span", { style: { fontSize: "14px", fontFamily: "monospace", color: "#1f2937" } }, value) : null
      ),
      dropdown
    )
  );
}

// ../components/form/color-wheel/src/ColorWheel.ts
function ColorWheel(props) {
  const inputId = props.id ?? `cw-${Math.random().toString(36).slice(2, 8)}`;
  const {
    value = "#000000",
    onChange,
    size = 32,
    showLabel = true,
    disabled = false,
    label
  } = props;
  const [color, setColor] = useState(value);
  const inputRef = useRef(null);
  const handleChange = useCallback(
    ((...args) => {
      const e = args[0];
      const newColor = e.target.value;
      setColor(newColor);
      onChange?.(newColor);
    }),
    [onChange]
  );
  const containerStyle3 = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px"
  };
  const swatchStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "6px",
    border: "2px solid #d1d5db",
    backgroundColor: color,
    cursor: disabled ? "not-allowed" : "pointer",
    position: "relative",
    overflow: "hidden"
  };
  const inputStyle = {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    opacity: "0",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    padding: "0"
  };
  return createElement(
    FormFieldWrapper,
    {
      label,
      htmlFor: inputId
    },
    createElement(
      "div",
      { style: containerStyle3 },
      createElement(
        "div",
        { style: swatchStyle },
        createElement("input", {
          id: inputId,
          ref: inputRef,
          type: "color",
          value: color,
          onInput: handleChange,
          disabled,
          style: inputStyle,
          "aria-label": label || "Color"
        })
      ),
      showLabel ? createElement(
        "span",
        {
          style: {
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#64748b"
          }
        },
        color
      ) : null
    )
  );
}

// ../components/form/datepicker/src/DatePicker.ts
var MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function formatDate3(d, fmt) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return fmt.replace("YYYY", String(y)).replace("MM", String(m).padStart(2, "0")).replace("DD", String(day).padStart(2, "0"));
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toISODateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function DatePicker(props) {
  const inputId = props.id ?? `dp-${Math.random().toString(36).slice(2, 8)}`;
  const {
    value,
    onChange,
    format = "YYYY-MM-DD",
    minDate,
    maxDate,
    disabled = false,
    placeholder = "Select date...",
    label,
    error: error2
  } = props;
  const selectedDate = useMemo(() => toDate(value), [value]);
  const minD = useMemo(() => toDate(minDate), [minDate]);
  const maxD = useMemo(() => toDate(maxDate), [maxDate]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => selectedDate ? selectedDate.getFullYear() : (/* @__PURE__ */ new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate ? selectedDate.getMonth() : (/* @__PURE__ */ new Date()).getMonth());
  const containerRef = useRef(null);
  const today = useMemo(() => /* @__PURE__ */ new Date(), []);
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);
  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);
  const handleDayClick = useCallback(
    (day) => {
      const d = new Date(viewYear, viewMonth, day);
      if (minD && d < minD) return;
      if (maxD && d > maxD) return;
      onChange(toISODateString(d));
      setIsOpen(false);
    },
    [viewYear, viewMonth, onChange, minD, maxD]
  );
  const displayText = selectedDate ? formatDate3(selectedDate, format) : "";
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rows = [];
    let row = [];
    for (let i = 0; i < firstDay; i++) row.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      row.push(d);
      if (row.length === 7) {
        rows.push(row);
        row = [];
      }
    }
    while (row.length > 0 && row.length < 7) row.push(null);
    if (row.length) rows.push(row);
    return rows;
  }, [viewYear, viewMonth]);
  const triggerStyle = {
    ...buildInputStyle({}, { focused: isOpen, error: !!error2 }),
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "38px",
    userSelect: "none"
  };
  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: "0",
    marginTop: "4px",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: "1000",
    padding: "12px",
    width: "280px"
  };
  const navStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px"
  };
  const navBtnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px 8px",
    color: "#374151",
    borderRadius: "4px"
  };
  const gridHeaderStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: "4px"
  };
  const dayHeaders = DAY_NAMES.map(
    (d) => createElement("div", { key: d, style: { padding: "4px" } }, d)
  );
  const dayRows = calendarDays.map((row, ri) => {
    const cells = row.map((day, ci) => {
      if (day === null) {
        return createElement("div", { key: `empty-${ri}-${ci}`, style: { padding: "4px" } });
      }
      const date = new Date(viewYear, viewMonth, day);
      const isToday = isSameDay(date, today);
      const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
      const isOutOfRange = minD && date < minD || maxD && date > maxD;
      const cellStyle2 = {
        padding: "4px",
        textAlign: "center",
        cursor: isOutOfRange ? "not-allowed" : "pointer",
        borderRadius: "4px",
        fontSize: "13px",
        fontWeight: isToday ? "700" : "400",
        backgroundColor: isSelected ? "#3b82f6" : "transparent",
        color: isSelected ? "#ffffff" : isOutOfRange ? "#d1d5db" : isToday ? "#3b82f6" : "#1f2937",
        border: isToday && !isSelected ? "1px solid #3b82f6" : "1px solid transparent",
        lineHeight: "1.8"
      };
      return createElement(
        "div",
        {
          key: `day-${day}`,
          style: cellStyle2,
          onClick: isOutOfRange ? void 0 : () => handleDayClick(day),
          onKeyDown: isOutOfRange ? void 0 : (e) => {
            const key = e.key;
            if (key === "Enter" || key === " ") {
              e.preventDefault();
              handleDayClick(day);
            }
          },
          role: isOutOfRange ? void 0 : "button",
          tabIndex: isOutOfRange ? void 0 : 0,
          "aria-label": `${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}`,
          "aria-disabled": isOutOfRange ? "true" : void 0
        },
        String(day)
      );
    });
    return createElement("div", {
      key: `row-${ri}`,
      style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }
    }, ...cells);
  });
  const calendar = isOpen ? createElement(
    "div",
    { style: dropdownStyle },
    // Nav
    createElement(
      "div",
      { style: navStyle },
      createElement("button", { type: "button", style: navBtnStyle, onClick: prevMonth }, "\u25C0"),
      createElement(
        "span",
        { style: { fontWeight: "600", fontSize: "14px", color: "#1f2937" } },
        `${MONTH_NAMES[viewMonth]} ${viewYear}`
      ),
      createElement("button", { type: "button", style: navBtnStyle, onClick: nextMonth }, "\u25B6")
    ),
    // Day name headers
    createElement("div", { style: gridHeaderStyle }, ...dayHeaders),
    ...dayRows
  ) : null;
  return createElement(
    FormFieldWrapper,
    {
      label,
      error: error2,
      disabled,
      htmlFor: inputId
    },
    createElement(
      "div",
      { ref: containerRef, style: { position: "relative" } },
      createElement(
        "div",
        {
          id: inputId,
          style: triggerStyle,
          onClick: disabled ? void 0 : () => setIsOpen(!isOpen),
          onKeyDown: disabled ? void 0 : (e) => {
            const key = e.key;
            if (key === "Enter" || key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          },
          tabIndex: disabled ? -1 : 0,
          role: "button",
          "aria-label": "Pick a date",
          "aria-expanded": isOpen ? "true" : "false"
        },
        createElement(
          "span",
          { style: { color: displayText ? "#1f2937" : "#9ca3af" } },
          displayText || placeholder
        ),
        createElement("span", { style: { color: "#6b7280", fontSize: "14px" } }, "\u{1F4C5}")
      ),
      calendar
    )
  );
}

// ../components/form/file-upload/src/FileUpload.ts
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
function FileUpload(props) {
  const inputId = props.id ?? `fu-${Math.random().toString(36).slice(2, 8)}`;
  const {
    onChange,
    accept,
    multiple = false,
    maxSize,
    disabled = false,
    label,
    helpText
  } = props;
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error2, setError] = useState("");
  const inputRef = useRef(null);
  const validateAndSet = useCallback(
    (newFiles) => {
      setError("");
      const filtered = [];
      for (const file of newFiles) {
        if (maxSize && file.size > maxSize) {
          setError(`File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`);
          continue;
        }
        filtered.push(file);
      }
      const result = multiple ? [...files, ...filtered] : filtered.slice(0, 1);
      setFiles(result);
      onChange(result);
    },
    [files, multiple, maxSize, onChange]
  );
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      const dt = e.dataTransfer;
      if (!dt) return;
      const dropped = Array.from(dt.files);
      validateAndSet(dropped);
    },
    [disabled, validateAndSet]
  );
  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );
  const handleDragLeave = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    },
    []
  );
  const handleInputChange = useCallback(
    (e) => {
      const input = e.target;
      if (!input.files) return;
      validateAndSet(Array.from(input.files));
      input.value = "";
    },
    [validateAndSet]
  );
  const handleRemoveFile = useCallback(
    (index) => {
      const updated = files.filter((_, i) => i !== index);
      setFiles(updated);
      onChange(updated);
    },
    [files, onChange]
  );
  const handleClick = useCallback(() => {
    if (disabled) return;
    if (inputRef.current) inputRef.current.click();
  }, [disabled]);
  const dropZoneStyle = {
    border: `2px dashed ${isDragOver ? "#3b82f6" : error2 ? "#ef4444" : "#d1d5db"}`,
    borderRadius: "8px",
    padding: "24px",
    textAlign: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    backgroundColor: isDragOver ? "#eff6ff" : "#fafafa",
    transition: "all 0.15s",
    opacity: disabled ? "0.6" : "1"
  };
  const iconStyle = {
    fontSize: "28px",
    color: "#9ca3af",
    marginBottom: "8px"
  };
  const primaryTextStyle = {
    fontSize: "14px",
    color: "#374151",
    marginBottom: "4px"
  };
  const secondaryTextStyle = {
    fontSize: "12px",
    color: "#9ca3af"
  };
  const hiddenInput = createElement("input", {
    id: inputId,
    ref: inputRef,
    type: "file",
    accept,
    multiple,
    onChange: handleInputChange,
    disabled,
    style: { display: "none" },
    tabIndex: -1
  });
  const dropZone = createElement(
    "div",
    {
      style: dropZoneStyle,
      onClick: handleClick,
      onKeyDown: (e) => {
        const key = e.key;
        if (key === "Enter" || key === " ") {
          e.preventDefault();
          handleClick();
        }
      },
      onDrop: handleDrop,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      role: "button",
      tabIndex: disabled ? -1 : 0,
      "aria-label": "Upload files"
    },
    createElement("div", { style: iconStyle }, "\u2191"),
    createElement(
      "div",
      { style: primaryTextStyle },
      createElement("span", { style: { color: "#3b82f6", fontWeight: "500" } }, "Click to upload"),
      " or drag and drop"
    ),
    accept ? createElement("div", { style: secondaryTextStyle }, accept) : null,
    maxSize ? createElement("div", { style: secondaryTextStyle }, `Max size: ${formatFileSize(maxSize)}`) : null
  );
  const fileList = files.length > 0 ? createElement(
    "div",
    { style: { marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" } },
    ...files.map((file, idx) => {
      const fileItemStyle = {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        backgroundColor: "#f9fafb",
        borderRadius: "6px",
        border: "1px solid #e5e7eb",
        fontSize: "13px"
      };
      const removeBtnStyle = {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#ef4444",
        fontSize: "14px",
        padding: "2px 6px",
        borderRadius: "4px"
      };
      return createElement(
        "div",
        { key: `file-${idx}`, style: fileItemStyle },
        createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" } },
          createElement("span", { style: { color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, file.name),
          createElement("span", { style: { color: "#9ca3af", fontSize: "11px", flexShrink: "0" } }, formatFileSize(file.size))
        ),
        createElement(
          "button",
          {
            type: "button",
            style: removeBtnStyle,
            onClick: (e) => {
              e.stopPropagation();
              handleRemoveFile(idx);
            },
            "aria-label": `Remove ${file.name}`
          },
          "\u2715"
        )
      );
    })
  ) : null;
  return createElement(
    FormFieldWrapper,
    {
      label,
      helpText,
      error: error2 || void 0,
      disabled,
      htmlFor: inputId
    },
    createElement(
      "div",
      null,
      hiddenInput,
      dropZone,
      fileList
    )
  );
}

// ../components/form/multiline/src/MultilineField.ts
function MultilineField(props) {
  const [focused, setFocused] = useState(false);
  const [charCount, setCharCount] = useState(
    (props.value ?? props.defaultValue ?? "").length
  );
  const inputId = props.id ?? `ml-${Math.random().toString(36).slice(2, 8)}`;
  const baseStyle = buildInputStyle(props.inputStyle ?? {}, {
    focused,
    error: !!props.error
  });
  const textareaStyle = {
    ...baseStyle,
    resize: props.autoResize ? "none" : "vertical",
    lineHeight: "1.5",
    ...props.minHeight ? { minHeight: props.minHeight } : {},
    ...props.maxHeight ? { maxHeight: props.maxHeight } : {}
  };
  const handleInput = useCallback(
    (e) => {
      const target = e.target;
      const val = target.value;
      setCharCount(val.length);
      if (props.onChange) props.onChange(val);
      if (props.autoResize) {
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
      }
    },
    [props.onChange, props.autoResize]
  );
  const textarea = createElement("textarea", {
    id: inputId,
    name: props.name,
    value: props.value,
    placeholder: props.placeholder,
    rows: String(props.rows ?? 4),
    maxLength: props.maxLength ? String(props.maxLength) : void 0,
    readOnly: props.readOnly,
    disabled: props.disabled,
    "aria-invalid": props.error ? "true" : void 0,
    "aria-required": props.required ? "true" : void 0,
    className: `multiline-input ${props.className ?? ""}`.trim(),
    style: textareaStyle,
    onFocus: () => setFocused(true),
    onBlur: (e) => {
      setFocused(false);
      if (props.onBlur) props.onBlur(e.target.value);
    },
    onInput: handleInput
  });
  const counter = props.showCount && props.maxLength ? createElement(
    "div",
    {
      style: {
        fontSize: "11px",
        color: charCount > (props.maxLength ?? Infinity) * 0.9 ? "#ef4444" : "#9ca3af",
        textAlign: "right",
        marginTop: "2px"
      }
    },
    `${charCount}/${props.maxLength}`
  ) : props.showCount ? createElement(
    "div",
    { style: { fontSize: "11px", color: "#9ca3af", textAlign: "right", marginTop: "2px" } },
    `${charCount} characters`
  ) : null;
  return createElement(
    FormFieldWrapper,
    {
      label: props.label,
      htmlFor: inputId,
      helpText: props.helpText,
      error: props.error,
      required: props.required,
      disabled: props.disabled,
      styling: props.wrapperStyle
    },
    textarea,
    counter
  );
}

// ../components/form/number-spinner/src/NumberSpinner.ts
function NumberSpinner(props) {
  const inputId = props.id ?? `ns-${Math.random().toString(36).slice(2, 8)}`;
  const {
    value,
    onChange,
    min,
    max,
    step = 1,
    disabled = false,
    prefix,
    suffix,
    label,
    error: error2
  } = props;
  const [focused, setFocused] = useState(false);
  const clamp = useCallback(
    (v) => {
      let result = v;
      if (min !== void 0 && result < min) result = min;
      if (max !== void 0 && result > max) result = max;
      return result;
    },
    [min, max]
  );
  const handleIncrement = useCallback(() => {
    if (disabled) return;
    onChange(clamp(value + step));
  }, [disabled, value, step, clamp, onChange]);
  const handleDecrement = useCallback(() => {
    if (disabled) return;
    onChange(clamp(value - step));
  }, [disabled, value, step, clamp, onChange]);
  const handleInputChange = useCallback(
    (e) => {
      const raw = e.target.value;
      if (raw === "" || raw === "-") return;
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        onChange(clamp(num));
      }
    },
    [clamp, onChange]
  );
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleIncrement();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleDecrement();
      }
    },
    [disabled, handleIncrement, handleDecrement]
  );
  const canDecrement = min === void 0 || value > min;
  const canIncrement = max === void 0 || value < max;
  const containerStyle3 = {
    display: "inline-flex",
    alignItems: "stretch",
    borderRadius: "6px",
    overflow: "hidden",
    border: `1px solid ${error2 ? "#ef4444" : focused ? "#3b82f6" : "var(--color-border, #d1d5db)"}`,
    transition: "border-color 0.15s",
    opacity: disabled ? "0.6" : "1",
    ...focused && !error2 ? { boxShadow: "0 0 0 3px #3b82f622" } : {}
  };
  const btnStyle = (isEnabled) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    backgroundColor: "var(--color-bg-subtle, #f9fafb)",
    border: "none",
    cursor: disabled || !isEnabled ? "not-allowed" : "pointer",
    color: disabled || !isEnabled ? "#d1d5db" : "var(--color-text, #374151)",
    fontSize: "inherit",
    fontWeight: "600",
    userSelect: "none",
    transition: "background-color 0.1s",
    borderRight: "none",
    borderLeft: "none"
  });
  const inputStyle = {
    flex: "1",
    minWidth: "32px",
    textAlign: "center",
    border: "none",
    borderLeft: "1px solid var(--color-border, #e5e7eb)",
    borderRight: "1px solid var(--color-border, #e5e7eb)",
    outline: "none",
    fontSize: "inherit",
    fontFamily: "inherit",
    backgroundColor: "var(--color-bg, #ffffff)",
    color: "var(--color-text, #1f2937)",
    padding: "4px 2px"
  };
  const affixStyle = {
    display: "flex",
    alignItems: "center",
    fontSize: "inherit",
    color: "var(--color-text-muted, #6b7280)",
    padding: "0 2px",
    backgroundColor: "var(--color-bg-subtle, #f9fafb)"
  };
  const decrementBtn = createElement(
    "button",
    {
      type: "button",
      style: btnStyle(canDecrement),
      onClick: handleDecrement,
      disabled,
      "aria-label": "Decrement",
      tabIndex: -1
    },
    "\u2212"
  );
  const prefixEl = prefix ? createElement("span", { style: affixStyle }, prefix) : null;
  const input = createElement("input", {
    id: inputId,
    type: "text",
    value: String(value),
    onInput: handleInputChange,
    onKeyDown: handleKeyDown,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    disabled,
    style: inputStyle,
    "aria-label": label || "Number",
    role: "spinbutton",
    "aria-valuenow": String(value),
    "aria-valuemin": min !== void 0 ? String(min) : void 0,
    "aria-valuemax": max !== void 0 ? String(max) : void 0
  });
  const suffixEl = suffix ? createElement("span", { style: affixStyle }, suffix) : null;
  const incrementBtn = createElement(
    "button",
    {
      type: "button",
      style: btnStyle(canIncrement),
      onClick: handleIncrement,
      disabled,
      "aria-label": "Increment",
      tabIndex: -1
    },
    "+"
  );
  const innerChildren = [decrementBtn];
  if (prefixEl) innerChildren.push(prefixEl);
  innerChildren.push(input);
  if (suffixEl) innerChildren.push(suffixEl);
  innerChildren.push(incrementBtn);
  return createElement(
    FormFieldWrapper,
    {
      label,
      error: error2,
      disabled,
      htmlFor: inputId
    },
    createElement("div", { style: containerStyle3 }, ...innerChildren)
  );
}

// ../components/form/radio/src/RadioGroup.ts
function RadioGroup(props) {
  const {
    options,
    value,
    onChange,
    name,
    direction = "vertical",
    disabled = false,
    error: error2,
    label
  } = props;
  const handleSelect = useCallback(
    (optValue) => {
      if (disabled) return;
      onChange(optValue);
    },
    [disabled, onChange]
  );
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      const enabledOpts = options.filter((o) => !o.disabled);
      if (enabledOpts.length === 0) return;
      const currentIdx = enabledOpts.findIndex((o) => o.value === value);
      let nextIdx = currentIdx;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        nextIdx = currentIdx < enabledOpts.length - 1 ? currentIdx + 1 : 0;
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        nextIdx = currentIdx > 0 ? currentIdx - 1 : enabledOpts.length - 1;
      } else {
        return;
      }
      onChange(enabledOpts[nextIdx].value);
    },
    [disabled, options, value, onChange]
  );
  const groupStyle = {
    display: "flex",
    flexDirection: direction === "horizontal" ? "row" : "column",
    gap: direction === "horizontal" ? "16px" : "8px"
  };
  const radioButtons = options.map((opt) => {
    const isSelected = opt.value === value;
    const isDisabled = disabled || !!opt.disabled;
    const outerCircleStyle = {
      width: "18px",
      height: "18px",
      minWidth: "18px",
      borderRadius: "50%",
      border: `2px solid ${error2 ? "#ef4444" : isSelected ? "#3b82f6" : "#d1d5db"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "border-color 0.15s",
      boxSizing: "border-box"
    };
    const innerDotStyle = {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: "#3b82f6",
      transition: "transform 0.15s",
      transform: isSelected ? "scale(1)" : "scale(0)"
    };
    const itemStyle = {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? "0.5" : "1",
      userSelect: "none"
    };
    return createElement(
      "label",
      {
        key: opt.value,
        style: itemStyle,
        onClick: isDisabled ? void 0 : (e) => {
          e.preventDefault();
          handleSelect(opt.value);
        }
      },
      createElement("input", {
        type: "radio",
        name,
        value: opt.value,
        checked: isSelected,
        disabled: isDisabled,
        style: { position: "absolute", opacity: "0", width: "0", height: "0", pointerEvents: "none" },
        tabIndex: -1
      }),
      createElement("div", { style: outerCircleStyle }, createElement("div", { style: innerDotStyle })),
      createElement("span", { style: { fontSize: "14px", color: "#374151" } }, opt.label)
    );
  });
  return createElement(
    FormFieldWrapper,
    {
      label,
      error: error2
    },
    createElement(
      "div",
      {
        style: groupStyle,
        role: "radiogroup",
        "aria-label": label,
        onKeyDown: handleKeyDown,
        tabIndex: disabled ? -1 : 0
      },
      ...radioButtons
    )
  );
}

// ../components/form/select/src/Select.ts
function Select(props) {
  const inputId = props.id ?? `sel-${Math.random().toString(36).slice(2, 8)}`;
  const {
    options,
    value,
    onChange,
    placeholder = "Select...",
    searchable = false,
    multiple = false,
    clearable = false,
    disabled = false,
    error: error2,
    label,
    helpText
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const selectedValues = useMemo(
    () => Array.isArray(value) ? value : value ? [value] : [],
    [value]
  );
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchQuery, searchable]);
  const groupedOptions = useMemo(() => {
    const groups = {};
    const ungrouped = [];
    for (const opt of filteredOptions) {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    }
    return { groups, ungrouped };
  }, [filteredOptions]);
  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return "";
    const labels = selectedValues.map((v) => options.find((o) => o.value === v)).filter(Boolean).map((o) => o.label);
    return labels.join(", ");
  }, [selectedValues, options]);
  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const handleSelect = useCallback(
    (optionValue) => {
      if (multiple) {
        const newValues = selectedValues.includes(optionValue) ? selectedValues.filter((v) => v !== optionValue) : [...selectedValues, optionValue];
        onChange(newValues);
      } else {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery("");
      }
    },
    [multiple, selectedValues, onChange]
  );
  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange(multiple ? [] : "");
    },
    [multiple, onChange]
  );
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      const key = e.key;
      if (!isOpen && (key === "Enter" || key === " " || key === "ArrowDown")) {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
        return;
      }
      if (!isOpen) return;
      if (key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
        return;
      }
      if (key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
      } else if (key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (key === "Enter" && focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        e.preventDefault();
        const opt = filteredOptions[focusedIndex];
        if (!opt.disabled) handleSelect(opt.value);
      }
    },
    [disabled, isOpen, focusedIndex, filteredOptions, handleSelect]
  );
  const triggerStyle = {
    ...buildInputStyle({}, { focused: isOpen, error: !!error2 }),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: disabled ? "not-allowed" : "pointer",
    minHeight: "38px",
    userSelect: "none"
  };
  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: "0",
    right: "0",
    marginTop: "4px",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: "1000",
    maxHeight: "240px",
    overflowY: "auto"
  };
  const renderOption = (opt, idx) => {
    const isSelected = selectedValues.includes(opt.value);
    const isFocused = idx === focusedIndex;
    const optStyle = {
      padding: "8px 12px",
      cursor: opt.disabled ? "not-allowed" : "pointer",
      backgroundColor: isFocused ? "#f3f4f6" : isSelected ? "#eff6ff" : "transparent",
      color: opt.disabled ? "#9ca3af" : "#1f2937",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px"
    };
    return createElement(
      "div",
      {
        key: opt.value,
        style: optStyle,
        onClick: opt.disabled ? void 0 : () => handleSelect(opt.value),
        onMouseEnter: () => setFocusedIndex(idx),
        role: "option",
        "aria-selected": isSelected ? "true" : "false",
        "aria-disabled": opt.disabled ? "true" : void 0
      },
      multiple && isSelected ? createElement("span", { style: { color: "#3b82f6", fontWeight: "700" } }, "\u2713") : null,
      opt.label
    );
  };
  const renderOptions = () => {
    const elements = [];
    let flatIdx = 0;
    const { groups, ungrouped } = groupedOptions;
    for (const opt of ungrouped) {
      elements.push(renderOption(opt, flatIdx++));
    }
    for (const groupName of Object.keys(groups)) {
      elements.push(
        createElement(
          "div",
          {
            key: `group-${groupName}`,
            style: {
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: "600",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }
          },
          groupName
        )
      );
      for (const opt of groups[groupName]) {
        elements.push(renderOption(opt, flatIdx++));
      }
    }
    if (elements.length === 0) {
      elements.push(
        createElement(
          "div",
          { style: { padding: "8px 12px", color: "#9ca3af", fontSize: "14px" } },
          "No options"
        )
      );
    }
    return elements;
  };
  const chevron = createElement(
    "span",
    {
      style: {
        marginLeft: "8px",
        fontSize: "10px",
        transition: "transform 0.15s",
        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        color: "#6b7280"
      }
    },
    "\u25BC"
  );
  const trigger = createElement(
    "div",
    {
      style: triggerStyle,
      id: inputId,
      onClick: disabled ? void 0 : () => {
        setIsOpen(!isOpen);
        setFocusedIndex(-1);
      },
      onKeyDown: handleKeyDown,
      tabIndex: disabled ? -1 : 0,
      role: "combobox",
      "aria-expanded": isOpen ? "true" : "false",
      "aria-haspopup": "listbox"
    },
    createElement(
      "span",
      { style: { flex: "1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: displayText ? "#1f2937" : "#9ca3af" } },
      displayText || placeholder
    ),
    createElement(
      "span",
      { style: { display: "flex", alignItems: "center", gap: "4px" } },
      clearable && selectedValues.length > 0 ? createElement(
        "span",
        {
          onClick: handleClear,
          onKeyDown: (e) => {
            const key = e.key;
            if (key === "Enter" || key === " ") {
              e.preventDefault();
              e.stopPropagation();
              handleClear(e);
            }
          },
          style: { cursor: "pointer", color: "#9ca3af", fontSize: "14px", lineHeight: "1" },
          role: "button",
          tabIndex: 0,
          "aria-label": "Clear selection"
        },
        "\u2715"
      ) : null,
      chevron
    )
  );
  const searchInput = searchable && isOpen ? createElement("input", {
    type: "text",
    value: searchQuery,
    onInput: (e) => {
      setSearchQuery(e.target.value);
      setFocusedIndex(0);
    },
    placeholder: "Search...",
    style: {
      width: "100%",
      boxSizing: "border-box",
      padding: "8px 12px",
      border: "none",
      borderBottom: "1px solid #e5e7eb",
      outline: "none",
      fontSize: "14px"
    }
  }) : null;
  const dropdown = isOpen ? createElement(
    "div",
    { style: dropdownStyle, role: "listbox" },
    searchInput,
    ...renderOptions()
  ) : null;
  return createElement(
    FormFieldWrapper,
    {
      label,
      error: error2,
      helpText,
      disabled,
      htmlFor: inputId
    },
    createElement(
      "div",
      {
        ref: containerRef,
        style: { position: "relative" }
      },
      trigger,
      dropdown
    )
  );
}

// ../components/form/slider/src/Slider.ts
function Slider(props) {
  const inputId = props.id ?? `sl-${Math.random().toString(36).slice(2, 8)}`;
  const {
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    showValue = false,
    showTicks = false,
    disabled = false,
    marks,
    range: range2 = false,
    label,
    error: error2
  } = props;
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const values = useMemo(() => {
    if (range2 && Array.isArray(value)) return value;
    const v = typeof value === "number" ? value : 0;
    return [v, v];
  }, [value, range2]);
  const clamp = (v) => {
    const snapped = Math.round((v - min) / step) * step + min;
    return Math.max(min, Math.min(max, snapped));
  };
  const toPercent = (v) => (v - min) / (max - min) * 100;
  const getValueFromEvent = useCallback(
    (e) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return clamp(min + pct * (max - min));
    },
    [min, max, step]
  );
  const handleMouseDown = useCallback(
    (handleType) => (e) => {
      if (disabled) return;
      e.preventDefault();
      setDragging(handleType);
    },
    [disabled]
  );
  const handleTrackClick = useCallback(
    (e) => {
      if (disabled) return;
      const newVal = getValueFromEvent(e);
      if (range2) {
        const distStart = Math.abs(newVal - values[0]);
        const distEnd = Math.abs(newVal - values[1]);
        if (distStart <= distEnd) {
          onChange([clamp(newVal), values[1]]);
        } else {
          onChange([values[0], clamp(newVal)]);
        }
      } else {
        onChange(clamp(newVal));
      }
    },
    [disabled, getValueFromEvent, range2, values, onChange, min, max, step]
  );
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e) => {
      const newVal = getValueFromEvent(e);
      if (dragging === "single") {
        onChange(clamp(newVal));
      } else if (dragging === "start") {
        onChange([Math.min(clamp(newVal), values[1]), values[1]]);
      } else if (dragging === "end") {
        onChange([values[0], Math.max(values[0], clamp(newVal))]);
      }
    };
    const handleMouseUp = () => setDragging(null);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, getValueFromEvent, values, onChange, min, max, step]);
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      let delta = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = step;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = -step;
      else return;
      e.preventDefault();
      if (!range2) {
        onChange(clamp((typeof value === "number" ? value : 0) + delta));
      }
    },
    [disabled, step, range2, value, onChange, min, max]
  );
  const trackStyle = {
    position: "relative",
    width: "100%",
    height: "6px",
    backgroundColor: "#e5e7eb",
    borderRadius: "3px",
    cursor: disabled ? "not-allowed" : "pointer"
  };
  const fillLeft = range2 ? toPercent(values[0]) : 0;
  const fillRight = range2 ? toPercent(values[1]) : toPercent(values[0]);
  const fillStyle = {
    position: "absolute",
    top: "0",
    left: `${fillLeft}%`,
    width: `${fillRight - fillLeft}%`,
    height: "100%",
    backgroundColor: disabled ? "#9ca3af" : "#3b82f6",
    borderRadius: "3px"
  };
  const thumbLabel = (handleType) => {
    if (label) {
      if (handleType === "start") return `${label} minimum`;
      if (handleType === "end") return `${label} maximum`;
      return label;
    }
    if (handleType === "start") return "Minimum value";
    if (handleType === "end") return "Maximum value";
    return "Value";
  };
  const createThumb = (pct, handleType, val) => {
    const thumbStyle = {
      position: "absolute",
      top: "50%",
      left: `${pct}%`,
      transform: "translate(-50%, -50%)",
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      border: `2px solid ${disabled ? "#9ca3af" : "#3b82f6"}`,
      cursor: disabled ? "not-allowed" : "grab",
      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      zIndex: "2"
    };
    const valueLabelStyle = {
      position: "absolute",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#1f2937",
      color: "#ffffff",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "11px",
      whiteSpace: "nowrap"
    };
    return createElement(
      "div",
      {
        id: handleType === "single" || handleType === "start" ? inputId : void 0,
        style: thumbStyle,
        onMouseDown: handleMouseDown(handleType),
        role: "slider",
        "aria-valuenow": String(val),
        "aria-valuemin": String(min),
        "aria-valuemax": String(max),
        "aria-label": thumbLabel(handleType),
        tabIndex: disabled ? -1 : 0,
        onKeyDown: handleKeyDown
      },
      showValue ? createElement("div", { style: valueLabelStyle }, String(val)) : null
    );
  };
  const tickElements = [];
  if (showTicks) {
    for (let v = min; v <= max; v += step) {
      tickElements.push(
        createElement("div", {
          key: `tick-${v}`,
          style: {
            position: "absolute",
            top: "10px",
            left: `${toPercent(v)}%`,
            width: "1px",
            height: "6px",
            backgroundColor: "#d1d5db",
            transform: "translateX(-50%)"
          }
        })
      );
    }
  }
  const markElements = [];
  if (marks) {
    for (const mark of marks) {
      markElements.push(
        createElement(
          "div",
          {
            key: `mark-${mark.value}`,
            style: {
              position: "absolute",
              top: "18px",
              left: `${toPercent(mark.value)}%`,
              transform: "translateX(-50%)",
              fontSize: "11px",
              color: "#6b7280",
              whiteSpace: "nowrap"
            }
          },
          mark.label
        )
      );
    }
  }
  const containerStyle3 = {
    paddingTop: showValue ? "28px" : "8px",
    paddingBottom: marks || showTicks ? "28px" : "8px",
    opacity: disabled ? "0.6" : "1"
  };
  const thumbs = [];
  if (range2) {
    thumbs.push(createThumb(toPercent(values[0]), "start", values[0]));
    thumbs.push(createThumb(toPercent(values[1]), "end", values[1]));
  } else {
    thumbs.push(createThumb(toPercent(values[0]), "single", values[0]));
  }
  return createElement(
    FormFieldWrapper,
    {
      label,
      error: error2,
      htmlFor: inputId
    },
    createElement(
      "div",
      { style: containerStyle3 },
      createElement(
        "div",
        {
          ref: trackRef,
          style: trackStyle,
          onClick: handleTrackClick
        },
        createElement("div", { style: fillStyle }),
        ...thumbs,
        ...tickElements,
        ...markElements
      )
    )
  );
}

// ../components/form/texteditor/src/TextEditor.ts
var DEFAULT_TOOLBAR = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "heading1",
  "heading2",
  "bulletList",
  "orderedList",
  "blockquote",
  "link",
  "unlink",
  "insertHR",
  "removeFormat",
  "undo",
  "redo"
];
var BUTTON_META = {
  bold: { label: "Bold", icon: "B", command: "bold" },
  italic: { label: "Italic", icon: "I", command: "italic" },
  underline: { label: "Underline", icon: "U", command: "underline" },
  strikethrough: { label: "Strikethrough", icon: "S", command: "strikethrough" },
  heading1: { label: "Heading 1", icon: "H1", command: "formatBlock", value: "h1" },
  heading2: { label: "Heading 2", icon: "H2", command: "formatBlock", value: "h2" },
  heading3: { label: "Heading 3", icon: "H3", command: "formatBlock", value: "h3" },
  bulletList: { label: "Bullet list", icon: "\u2022", command: "insertUnorderedList" },
  orderedList: { label: "Numbered list", icon: "1.", command: "insertOrderedList" },
  blockquote: { label: "Blockquote", icon: "\u201C", command: "formatBlock", value: "blockquote" },
  link: { label: "Insert link", icon: "\u{1F517}", command: "createLink" },
  unlink: { label: "Remove link", icon: "\u26D4", command: "unlink" },
  insertHR: { label: "Horizontal rule", icon: "\u2015", command: "insertHorizontalRule" },
  removeFormat: { label: "Clear format", icon: "\u2718", command: "removeFormat" },
  undo: { label: "Undo", icon: "\u21A9", command: "undo" },
  redo: { label: "Redo", icon: "\u21AA", command: "redo" }
};
function TextEditor(props) {
  const [focused, setFocused] = useState(false);
  const editorRef = useRef(null);
  const inputId = props.id ?? `te-${Math.random().toString(36).slice(2, 8)}`;
  const toolbar = props.toolbar ?? DEFAULT_TOOLBAR;
  const ts = props.toolbarStyle ?? {};
  const es = props.editorStyle ?? {};
  useEffect(() => {
    if (editorRef.current && props.value !== void 0) {
      editorRef.current.innerHTML = props.value;
    }
  }, []);
  const execCommand = useCallback(
    (cmd, value) => {
      if (props.disabled || props.readOnly) return;
      if (cmd === "createLink") {
        const url = prompt("Enter URL:");
        if (!url) return;
        document.execCommand(cmd, false, url);
      } else if (value && cmd === "formatBlock") {
        document.execCommand(cmd, false, `<${value}>`);
      } else {
        document.execCommand(cmd, false, value);
      }
      if (editorRef.current && props.onChange) {
        props.onChange(editorRef.current.innerHTML);
      }
    },
    [props.disabled, props.readOnly, props.onChange]
  );
  const handleInput = useCallback(() => {
    if (editorRef.current && props.onChange) {
      props.onChange(editorRef.current.innerHTML);
    }
  }, [props.onChange]);
  const handleBlur = useCallback(() => {
    setFocused(false);
    if (editorRef.current && props.onBlur) {
      props.onBlur(editorRef.current.innerHTML);
    }
  }, [props.onBlur]);
  const toolbarEl = createElement(
    "div",
    {
      className: "texteditor-toolbar",
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: "2px",
        padding: "6px 8px",
        backgroundColor: ts.backgroundColor ?? "#f9fafb",
        borderBottom: ts.borderBottom ?? "1px solid #e5e7eb",
        borderRadius: "6px 6px 0 0"
      }
    },
    ...toolbar.map((btn) => {
      const meta = BUTTON_META[btn];
      if (!meta) return null;
      return createElement(
        "button",
        {
          key: btn,
          type: "button",
          title: meta.label,
          onClick: () => execCommand(meta.command, meta.value),
          disabled: props.disabled || props.readOnly,
          style: {
            padding: "4px 8px",
            border: "none",
            borderRadius: "4px",
            backgroundColor: "transparent",
            color: ts.buttonColor ?? "#374151",
            cursor: props.disabled ? "not-allowed" : "pointer",
            fontSize: ts.buttonSize ?? "13px",
            fontWeight: btn === "bold" ? "700" : btn === "italic" ? "400" : "500",
            fontStyle: btn === "italic" ? "italic" : "normal",
            textDecoration: btn === "underline" ? "underline" : btn === "strikethrough" ? "line-through" : "none",
            minWidth: "28px",
            textAlign: "center",
            lineHeight: "1.4"
          }
        },
        meta.icon
      );
    })
  );
  const editorEl = createElement("div", {
    ref: editorRef,
    id: inputId,
    className: "texteditor-content",
    contentEditable: props.disabled ? "false" : "true",
    role: "textbox",
    "aria-multiline": "true",
    "aria-label": props.label ?? "Text editor",
    "data-placeholder": props.placeholder ?? "",
    style: {
      padding: es.padding ?? "12px 14px",
      minHeight: props.minHeight ?? "200px",
      maxHeight: props.maxHeight ?? "none",
      overflow: "auto",
      backgroundColor: es.backgroundColor ?? "#ffffff",
      color: es.color ?? "#1f2937",
      fontFamily: es.fontFamily ?? "inherit",
      fontSize: es.fontSize ?? "14px",
      lineHeight: es.lineHeight ?? "1.6",
      outline: "none",
      borderRadius: "0 0 6px 6px",
      border: focused ? "1px solid #3b82f6" : props.error ? "1px solid #ef4444" : "1px solid #d1d5db",
      borderTop: "none",
      transition: "border-color 0.15s"
    },
    onFocus: () => setFocused(true),
    onBlur: handleBlur,
    onInput: handleInput
  });
  return createElement(
    FormFieldWrapper,
    {
      label: props.label,
      helpText: props.helpText,
      error: props.error,
      required: props.required,
      disabled: props.disabled,
      styling: props.wrapperStyle
    },
    createElement(
      "div",
      {
        className: "texteditor",
        style: {
          border: focused ? "1px solid #3b82f6" : props.error ? "1px solid #ef4444" : "1px solid #d1d5db",
          borderRadius: "6px",
          overflow: "hidden",
          transition: "border-color 0.15s"
        }
      },
      toolbarEl,
      editorEl
    )
  );
}

// ../components/form/textfield/src/TextField.ts
function TextField(props) {
  const [focused, setFocused] = useState(false);
  const inputId = props.id ?? `tf-${Math.random().toString(36).slice(2, 8)}`;
  const style = buildInputStyle(props.inputStyle ?? {}, {
    focused,
    error: !!props.error
  });
  const hasAddons = !!(props.prefix || props.suffix);
  const inputEl = createElement("input", {
    type: props.type ?? "text",
    id: inputId,
    name: props.name,
    value: props.value,
    placeholder: props.placeholder,
    maxLength: props.maxLength ? String(props.maxLength) : void 0,
    pattern: props.pattern,
    autoComplete: props.autoComplete,
    autoFocus: props.autoFocus,
    readOnly: props.readOnly,
    disabled: props.disabled,
    "aria-invalid": props.error ? "true" : void 0,
    "aria-required": props.required ? "true" : void 0,
    className: `textfield-input ${props.className ?? ""}`.trim(),
    style: hasAddons ? { ...style, border: "none", boxShadow: "none", flex: "1", minWidth: "0" } : style,
    onFocus: () => setFocused(true),
    onBlur: (e) => {
      setFocused(false);
      if (props.onBlur) props.onBlur(e.target.value);
    },
    onInput: (e) => {
      const val = e.target.value;
      if (props.onInput) props.onInput(val);
      if (props.onChange) props.onChange(val);
    },
    onKeyDown: (e) => {
      if (e.key === "Enter" && props.onEnter) {
        props.onEnter(e.target.value);
      }
    }
  });
  const field = hasAddons ? createElement(
    "div",
    {
      style: {
        ...style,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0"
      }
    },
    props.prefix ? createElement("span", { style: { paddingLeft: "10px", color: "#9ca3af", flexShrink: "0" } }, props.prefix) : null,
    inputEl,
    props.suffix ? createElement("span", { style: { paddingRight: "10px", color: "#9ca3af", flexShrink: "0" } }, props.suffix) : null
  ) : inputEl;
  return createElement(
    FormFieldWrapper,
    {
      label: props.label,
      htmlFor: inputId,
      helpText: props.helpText,
      error: props.error,
      required: props.required,
      disabled: props.disabled,
      styling: props.wrapperStyle
    },
    field
  );
}

// ../components/form/timepicker/src/TimePicker.ts
var DEFAULT_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo"
];
function pad2(n) {
  return String(n).padStart(2, "0");
}
function parseTime(val) {
  const parts = val.split(":");
  return {
    hour: parseInt(parts[0], 10) || 0,
    minute: parseInt(parts[1], 10) || 0,
    second: parseInt(parts[2], 10) || 0
  };
}
function TimePicker(props) {
  const inputId = props.id ?? `tp-${Math.random().toString(36).slice(2, 8)}`;
  const {
    value,
    onChange,
    format = "24h",
    minuteStep = 1,
    disabled = false,
    label,
    error: error2,
    showSeconds = false,
    timezone,
    showTimezone = false,
    timezones = DEFAULT_TIMEZONES,
    onTimezoneChange
  } = props;
  const [focused, setFocused] = useState(false);
  const parsed = useMemo(() => parseTime(value), [value]);
  const is12h = format === "12h";
  const isPM = parsed.hour >= 12;
  const display12Hour = is12h ? parsed.hour % 12 || 12 : parsed.hour;
  const emit = useCallback(
    (h, m, s) => {
      const hh = Math.max(0, Math.min(23, h));
      const mm = Math.max(0, Math.min(59, m));
      const ss = Math.max(0, Math.min(59, s ?? 0));
      if (showSeconds) {
        onChange(`${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`);
      } else {
        onChange(`${pad2(hh)}:${pad2(mm)}`);
      }
    },
    [onChange, showSeconds]
  );
  const handleHourChange = useCallback(
    (e) => {
      let h = parseInt(e.target.value, 10) || 0;
      if (is12h) {
        h = h % 12;
        if (isPM) h += 12;
      }
      emit(h, parsed.minute, parsed.second);
    },
    [is12h, isPM, parsed.minute, parsed.second, emit]
  );
  const handleMinuteChange = useCallback(
    (e) => {
      const m = parseInt(e.target.value, 10) || 0;
      emit(parsed.hour, m, parsed.second);
    },
    [parsed.hour, parsed.second, emit]
  );
  const handleSecondChange = useCallback(
    (e) => {
      const s = parseInt(e.target.value, 10) || 0;
      emit(parsed.hour, parsed.minute, s);
    },
    [parsed.hour, parsed.minute, emit]
  );
  const handleAMPMToggle = useCallback(() => {
    if (disabled) return;
    const newHour = isPM ? parsed.hour - 12 : parsed.hour + 12;
    emit(newHour, parsed.minute, parsed.second);
  }, [disabled, isPM, parsed.hour, parsed.minute, parsed.second, emit]);
  const handleHourIncrement = useCallback(
    (delta) => {
      if (disabled) return;
      emit(parsed.hour + delta, parsed.minute, parsed.second);
    },
    [disabled, parsed.hour, parsed.minute, parsed.second, emit]
  );
  const handleMinuteIncrement = useCallback(
    (delta) => {
      if (disabled) return;
      emit(parsed.hour, parsed.minute + delta * minuteStep, parsed.second);
    },
    [disabled, parsed.hour, parsed.minute, parsed.second, minuteStep, emit]
  );
  const handleSecondIncrement = useCallback(
    (delta) => {
      if (disabled) return;
      emit(parsed.hour, parsed.minute, parsed.second + delta);
    },
    [disabled, parsed.hour, parsed.minute, parsed.second, emit]
  );
  const handleTimezoneChange = useCallback(
    (e) => {
      const tz = e.target.value;
      if (onTimezoneChange) onTimezoneChange(tz);
    },
    [onTimezoneChange]
  );
  const containerStyle3 = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    ...buildInputStyle({}, { focused, error: !!error2 })
  };
  const spinnerGroupStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  };
  const arrowBtnStyle = {
    background: "none",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "10px",
    padding: "0 4px",
    color: "#6b7280",
    lineHeight: "1"
  };
  const inputStyle = {
    width: "32px",
    textAlign: "center",
    border: "none",
    outline: "none",
    fontSize: "14px",
    fontFamily: "monospace",
    backgroundColor: "transparent",
    color: "#1f2937",
    padding: "0"
  };
  const ampmBtnStyle = {
    marginLeft: "4px",
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    backgroundColor: "#f9fafb",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "12px",
    fontWeight: "600",
    color: "#374151"
  };
  const hourSpinner = createElement(
    "div",
    { style: spinnerGroupStyle },
    createElement("button", { type: "button", style: arrowBtnStyle, onClick: () => handleHourIncrement(1), disabled }, "\u25B2"),
    createElement("input", {
      type: "text",
      value: pad2(display12Hour),
      onChange: handleHourChange,
      style: inputStyle,
      disabled,
      "aria-label": "Hour",
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false)
    }),
    createElement("button", { type: "button", style: arrowBtnStyle, onClick: () => handleHourIncrement(-1), disabled }, "\u25BC")
  );
  const separator = createElement(
    "span",
    { style: { fontSize: "16px", fontWeight: "700", color: "#374151", padding: "0 2px" } },
    ":"
  );
  const minuteSpinner = createElement(
    "div",
    { style: spinnerGroupStyle },
    createElement("button", { type: "button", style: arrowBtnStyle, onClick: () => handleMinuteIncrement(1), disabled }, "\u25B2"),
    createElement("input", {
      type: "text",
      value: pad2(parsed.minute),
      onChange: handleMinuteChange,
      style: inputStyle,
      disabled,
      "aria-label": "Minute",
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false)
    }),
    createElement("button", { type: "button", style: arrowBtnStyle, onClick: () => handleMinuteIncrement(-1), disabled }, "\u25BC")
  );
  const secondsSeparator = showSeconds ? createElement(
    "span",
    { style: { fontSize: "16px", fontWeight: "700", color: "#374151", padding: "0 2px" } },
    ":"
  ) : null;
  const secondsSpinner = showSeconds ? createElement(
    "div",
    { style: spinnerGroupStyle },
    createElement("button", { type: "button", style: arrowBtnStyle, onClick: () => handleSecondIncrement(1), disabled }, "\u25B2"),
    createElement("input", {
      type: "text",
      value: pad2(parsed.second),
      onChange: handleSecondChange,
      style: inputStyle,
      disabled,
      "aria-label": "Second",
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false)
    }),
    createElement("button", { type: "button", style: arrowBtnStyle, onClick: () => handleSecondIncrement(-1), disabled }, "\u25BC")
  ) : null;
  const ampmToggle = is12h ? createElement(
    "button",
    {
      type: "button",
      style: ampmBtnStyle,
      onClick: handleAMPMToggle,
      disabled,
      "aria-label": "Toggle AM/PM"
    },
    isPM ? "PM" : "AM"
  ) : null;
  const timezoneSelectStyle = {
    marginLeft: "4px",
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    backgroundColor: "#f9fafb",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "12px",
    fontWeight: "600",
    color: "#374151"
  };
  const timezoneLabelEl = timezone && !showTimezone ? createElement(
    "span",
    {
      style: {
        marginLeft: "8px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#6b7280"
      }
    },
    timezone
  ) : null;
  const timezoneSelect = showTimezone ? createElement(
    "select",
    {
      style: timezoneSelectStyle,
      value: timezone ?? timezones[0],
      onChange: handleTimezoneChange,
      disabled,
      "aria-label": "Timezone"
    },
    ...timezones.map(
      (tz) => createElement("option", { key: tz, value: tz }, tz)
    )
  ) : null;
  const children = [hourSpinner, separator, minuteSpinner];
  if (secondsSeparator) children.push(secondsSeparator);
  if (secondsSpinner) children.push(secondsSpinner);
  if (ampmToggle) children.push(ampmToggle);
  if (timezoneLabelEl) children.push(timezoneLabelEl);
  if (timezoneSelect) children.push(timezoneSelect);
  return createElement(
    FormFieldWrapper,
    {
      label,
      error: error2,
      disabled,
      htmlFor: inputId
    },
    createElement(
      "div",
      {
        id: inputId,
        style: containerStyle3
      },
      ...children
    )
  );
}

// ../components/form/toggle/src/Toggle.ts
var SIZE_MAP3 = {
  sm: { trackW: 32, trackH: 18, thumbSize: 14, offset: 2 },
  md: { trackW: 44, trackH: 24, thumbSize: 20, offset: 2 },
  lg: { trackW: 56, trackH: 30, thumbSize: 26, offset: 2 }
};
function Toggle(props) {
  const {
    checked,
    onChange,
    label,
    labelPosition = "right",
    disabled = false,
    size = "md",
    onColor = "#3b82f6",
    offColor = "#d1d5db"
  } = props;
  const dim = SIZE_MAP3[size];
  const handleClick = useCallback(() => {
    if (disabled) return;
    onChange(!checked);
  }, [disabled, checked, onChange]);
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onChange(!checked);
      }
    },
    [disabled, checked, onChange]
  );
  const trackStyle = {
    width: `${dim.trackW}px`,
    height: `${dim.trackH}px`,
    borderRadius: `${dim.trackH}px`,
    backgroundColor: checked ? onColor : offColor,
    position: "relative",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.2s",
    flexShrink: "0"
  };
  const thumbLeft = checked ? dim.trackW - dim.thumbSize - dim.offset : dim.offset;
  const thumbStyle = {
    width: `${dim.thumbSize}px`,
    height: `${dim.thumbSize}px`,
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    position: "absolute",
    top: `${dim.offset}px`,
    left: `${thumbLeft}px`,
    transition: "left 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
  };
  const containerStyle3 = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    opacity: disabled ? "0.5" : "1",
    userSelect: "none"
  };
  const labelEl = label ? createElement("span", { style: { fontSize: "14px", color: "#374151" } }, label) : null;
  const track = createElement("div", { style: trackStyle }, createElement("div", { style: thumbStyle }));
  const children = labelPosition === "left" ? [labelEl, track] : [track, labelEl];
  return createElement(
    "div",
    {
      style: containerStyle3,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      tabIndex: disabled ? -1 : 0,
      role: "switch",
      "aria-checked": checked ? "true" : "false",
      "aria-disabled": disabled ? "true" : void 0,
      "aria-label": label
    },
    ...children.filter(Boolean)
  );
}

// ../components/layout/card/src/Card.ts
var SHADOW_MAP = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
  md: "0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
  lg: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)"
};
function Card(props) {
  const bordered = props.bordered !== false;
  const shadowLevel = props.shadow ?? "sm";
  const padding = props.padding ?? "16px";
  const borderRadius = props.borderRadius ?? "8px";
  const cardStyle = useMemo(() => {
    const s = {
      display: "flex",
      flexDirection: "column",
      borderRadius,
      overflow: "hidden",
      backgroundColor: "#ffffff",
      transition: "box-shadow 0.2s, transform 0.2s"
    };
    if (bordered) {
      s.border = "1px solid #e5e7eb";
    }
    s.boxShadow = SHADOW_MAP[shadowLevel] ?? SHADOW_MAP.sm;
    if (props.hoverable) {
      s.cursor = "pointer";
    }
    return { ...s, ...props.style ?? {} };
  }, [bordered, shadowLevel, borderRadius, props.hoverable, props.style]);
  const headerStyle = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding,
    gap: "12px"
  };
  const bodyStyle = {
    padding,
    paddingTop: props.title || props.subtitle ? "0" : padding,
    flex: "1"
  };
  const footerStyle = {
    padding,
    paddingTop: "0",
    borderTop: "1px solid #f3f4f6",
    paddingBottom: padding,
    marginTop: "auto"
  };
  const hasHeader = props.title || props.subtitle || props.headerAction;
  return createElement(
    "div",
    {
      className: `card ${props.hoverable ? "card--hoverable" : ""} ${props.className ?? ""}`.trim(),
      style: cardStyle
    },
    // Top image
    props.image ? createElement("img", {
      src: props.image,
      alt: props.imageAlt ?? "",
      style: {
        width: "100%",
        height: "auto",
        display: "block",
        objectFit: "cover"
      }
    }) : null,
    // Header
    hasHeader ? createElement(
      "div",
      { className: "card__header", style: headerStyle },
      createElement(
        "div",
        { style: { flex: "1", minWidth: "0" } },
        props.title ? createElement(
          "div",
          {
            className: "card__title",
            style: { fontSize: "16px", fontWeight: "600", color: "#111827", lineHeight: "1.4" }
          },
          props.title
        ) : null,
        props.subtitle ? createElement(
          "div",
          {
            className: "card__subtitle",
            style: { fontSize: "14px", color: "#6b7280", marginTop: "2px", lineHeight: "1.4" }
          },
          props.subtitle
        ) : null
      ),
      props.headerAction ? createElement("div", { className: "card__header-action" }, props.headerAction) : null
    ) : null,
    // Body
    createElement(
      "div",
      { className: "card__body", style: bodyStyle },
      props.children
    ),
    // Footer
    props.footer ? createElement(
      "div",
      { className: "card__footer", style: footerStyle },
      props.footer
    ) : null
  );
}

// ../components/layout/flex-container/src/FlexContainer.ts
function FlexContainer(props) {
  const flexStyle = useMemo(() => {
    const s = {
      display: props.inline ? "inline-flex" : "flex"
    };
    if (props.direction) {
      s.flexDirection = props.direction;
    }
    if (props.wrap) {
      s.flexWrap = props.wrap;
    }
    if (props.gap) {
      s.gap = props.gap;
    }
    if (props.alignItems) {
      s.alignItems = props.alignItems;
    }
    if (props.justifyContent) {
      s.justifyContent = props.justifyContent;
    }
    return { ...s, ...props.style ?? {} };
  }, [props.direction, props.wrap, props.gap, props.alignItems, props.justifyContent, props.inline, props.style]);
  return createElement(
    "div",
    {
      className: `flex-container ${props.className ?? ""}`.trim(),
      style: flexStyle
    },
    props.children
  );
}
function FlexItem(props) {
  const itemStyle = useMemo(() => {
    const s = {};
    if (props.flex) {
      s.flex = props.flex;
    }
    if (props.grow !== void 0) {
      s.flexGrow = String(props.grow);
    }
    if (props.shrink !== void 0) {
      s.flexShrink = String(props.shrink);
    }
    if (props.basis) {
      s.flexBasis = props.basis;
    }
    if (props.alignSelf) {
      s.alignSelf = props.alignSelf;
    }
    if (props.order !== void 0) {
      s.order = String(props.order);
    }
    return { ...s, ...props.style ?? {} };
  }, [props.flex, props.grow, props.shrink, props.basis, props.alignSelf, props.order, props.style]);
  return createElement(
    "div",
    {
      className: `flex-item ${props.className ?? ""}`.trim(),
      style: itemStyle
    },
    props.children
  );
}

// ../components/layout/grid/src/Grid.ts
function Grid(props) {
  const gridStyle = useMemo(() => {
    const s = {
      display: "grid"
    };
    if (props.minColWidth) {
      s.gridTemplateColumns = `repeat(auto-fit, minmax(${props.minColWidth}, 1fr))`;
    } else if (props.columns !== void 0) {
      s.gridTemplateColumns = typeof props.columns === "number" ? `repeat(${props.columns}, 1fr)` : props.columns;
    }
    if (props.rows) {
      s.gridTemplateRows = props.rows;
    }
    if (props.gap) {
      s.gap = props.gap;
    }
    if (props.alignItems) {
      s.alignItems = props.alignItems;
    }
    if (props.justifyItems) {
      s.justifyItems = props.justifyItems;
    }
    if (props.areas && props.areas.length > 0) {
      s.gridTemplateAreas = props.areas.map((a) => `"${a}"`).join(" ");
    }
    return { ...s, ...props.style ?? {} };
  }, [
    props.columns,
    props.rows,
    props.gap,
    props.alignItems,
    props.justifyItems,
    props.minColWidth,
    props.areas,
    props.style
  ]);
  return createElement(
    "div",
    {
      className: `grid ${props.className ?? ""}`.trim(),
      style: gridStyle
    },
    props.children
  );
}
function GridItem(props) {
  const itemStyle = useMemo(() => {
    const s = {};
    if (props.gridColumn) {
      s.gridColumn = props.gridColumn;
    }
    if (props.gridRow) {
      s.gridRow = props.gridRow;
    }
    if (props.gridArea) {
      s.gridArea = props.gridArea;
    }
    if (props.alignSelf) {
      s.alignSelf = props.alignSelf;
    }
    if (props.justifySelf) {
      s.justifySelf = props.justifySelf;
    }
    return { ...s, ...props.style ?? {} };
  }, [props.gridColumn, props.gridRow, props.gridArea, props.alignSelf, props.justifySelf, props.style]);
  return createElement(
    "div",
    {
      className: `grid-item ${props.className ?? ""}`.trim(),
      style: itemStyle
    },
    props.children
  );
}

// ../components/layout/panel/src/Panel.ts
var SHADOW = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,0.12)",
  md: "0 4px 6px rgba(0,0,0,0.1)"
};
function Panel(props) {
  const bordered = props.bordered !== false;
  const shadowLevel = props.shadow ?? "none";
  const [collapsed, setCollapsed] = useState(!!props.defaultCollapsed);
  const bodyRef = useRef(null);
  const [bodyHeight, setBodyHeight] = useState("auto");
  useEffect(() => {
    if (!props.collapsible) return;
    const el = bodyRef.current;
    if (el) {
      setBodyHeight(`${el.scrollHeight}px`);
    }
  }, [props.children, props.collapsible]);
  const toggle = useCallback(() => {
    if (!props.collapsible) return;
    setCollapsed((prev) => !prev);
  }, [props.collapsible]);
  const handleHeaderKeyDown = useCallback((e) => {
    if (!props.collapsible) return;
    const key = e.key;
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      toggle();
    }
  }, [props.collapsible, toggle]);
  const containerStyle3 = useMemo(() => {
    const s = {
      borderRadius: "6px",
      overflow: "hidden",
      backgroundColor: "#ffffff"
    };
    if (bordered) {
      s.border = "1px solid #e5e7eb";
    }
    s.boxShadow = SHADOW[shadowLevel] ?? SHADOW.none;
    return { ...s, ...props.style ?? {} };
  }, [bordered, shadowLevel, props.style]);
  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    gap: "8px",
    backgroundColor: "#f9fafb",
    userSelect: "none",
    cursor: props.collapsible ? "pointer" : "default"
  };
  const chevronStyle = {
    display: "inline-block",
    width: "0",
    height: "0",
    borderLeft: "5px solid transparent",
    borderRight: "5px solid transparent",
    borderTop: "6px solid #6b7280",
    transition: "transform 0.2s",
    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
    marginRight: "8px",
    flexShrink: "0"
  };
  const bodyWrapperStyle = {
    maxHeight: collapsed ? "0" : bodyHeight,
    overflow: "hidden",
    transition: "max-height 0.3s ease"
  };
  const bodyContentStyle = {
    padding: "16px"
  };
  return createElement(
    "div",
    {
      className: `panel ${props.className ?? ""}`.trim(),
      style: containerStyle3
    },
    // Header
    createElement(
      "div",
      {
        className: "panel__header",
        style: headerStyle,
        onClick: toggle,
        onKeyDown: handleHeaderKeyDown,
        role: props.collapsible ? "button" : void 0,
        tabIndex: props.collapsible ? 0 : void 0,
        "aria-expanded": props.collapsible ? String(!collapsed) : void 0
      },
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", flex: "1", minWidth: "0", gap: "8px" } },
        props.collapsible ? createElement("span", { className: "panel__chevron", style: chevronStyle }) : null,
        props.icon ? createElement("span", { className: "panel__icon" }, props.icon) : null,
        props.title ? createElement(
          "span",
          {
            className: "panel__title",
            style: { fontSize: "14px", fontWeight: "600", color: "#111827" }
          },
          props.title
        ) : null
      ),
      props.headerRight ? createElement("div", { className: "panel__header-right" }, props.headerRight) : null
    ),
    // Body
    createElement(
      "div",
      {
        className: "panel__body-wrapper",
        style: props.collapsible ? bodyWrapperStyle : {},
        ref: bodyRef
      },
      createElement(
        "div",
        { className: "panel__body", style: bodyContentStyle },
        props.children
      )
    )
  );
}

// ../components/layout/scroll-container/src/ScrollContainer.ts
function getOverflowValue(direction, axis) {
  if (direction === "both") return "auto";
  if (direction === "horizontal") return axis === "x" ? "auto" : "hidden";
  return axis === "y" ? "auto" : "hidden";
}
function getScrollbarStyle(visibility) {
  switch (visibility) {
    case "never":
      return { scrollbarWidth: "none" };
    case "always":
      return { scrollbarWidth: "thin" };
    case "hover":
      return { scrollbarWidth: "thin" };
    case "auto":
    default:
      return { scrollbarWidth: "auto" };
  }
}
function ScrollContainer(props) {
  const direction = props.direction ?? "vertical";
  const showScrollbar = props.showScrollbar ?? "auto";
  const showShadow = props.shadow ?? false;
  const containerRef = useRef(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [atLeft, setAtLeft] = useState(true);
  const [atRight, setAtRight] = useState(false);
  const updateEdges = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 2;
    setAtTop(el.scrollTop <= threshold);
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - threshold);
    setAtLeft(el.scrollLeft <= threshold);
    setAtRight(el.scrollLeft + el.clientWidth >= el.scrollWidth - threshold);
  }, []);
  useEffect(() => {
    updateEdges();
  }, [updateEdges]);
  const onScroll = useCallback(() => {
    if (showShadow) {
      updateEdges();
    }
  }, [showShadow, updateEdges]);
  const containerStyle3 = useMemo(() => {
    const s = {
      position: "relative",
      overflowX: getOverflowValue(direction, "x"),
      overflowY: getOverflowValue(direction, "y"),
      ...getScrollbarStyle(showScrollbar)
    };
    if (props.maxHeight) {
      s.maxHeight = props.maxHeight;
    }
    if (props.maxWidth) {
      s.maxWidth = props.maxWidth;
    }
    if (props.padding) {
      s.padding = props.padding;
    }
    return { ...s, ...props.style ?? {} };
  }, [direction, showScrollbar, props.maxHeight, props.maxWidth, props.padding, props.style]);
  const shadows = [];
  if (showShadow) {
    const isVert = direction === "vertical" || direction === "both";
    const isHoriz = direction === "horizontal" || direction === "both";
    if (isVert && !atTop) {
      shadows.push("inset 0 8px 6px -6px rgba(0,0,0,0.15)");
    }
    if (isVert && !atBottom) {
      shadows.push("inset 0 -8px 6px -6px rgba(0,0,0,0.15)");
    }
    if (isHoriz && !atLeft) {
      shadows.push("inset 8px 0 6px -6px rgba(0,0,0,0.15)");
    }
    if (isHoriz && !atRight) {
      shadows.push("inset -8px 0 6px -6px rgba(0,0,0,0.15)");
    }
  }
  const finalStyle = {
    ...containerStyle3
  };
  if (shadows.length > 0) {
    finalStyle.boxShadow = shadows.join(", ");
  }
  return createElement(
    "div",
    {
      className: `scroll-container scroll-container--${direction} ${props.className ?? ""}`.trim(),
      style: finalStyle,
      ref: containerRef,
      onScroll
    },
    props.children
  );
}

// ../components/layout/splitter/src/Splitter.ts
function Splitter(props) {
  const direction = props.direction ?? "horizontal";
  const isHorizontal = direction === "horizontal";
  const dividerSize = props.dividerSize ?? 6;
  const minSize = props.minSize ?? 50;
  const [splitPercent, setSplitPercent] = useState(props.initialSplit ?? 50);
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      dragging.current = true;
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [isHorizontal]
  );
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const total = isHorizontal ? rect.width : rect.height;
      const offset = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
      if (total <= 0) return;
      const minPercent = minSize / total * 100;
      const maxPercent = props.maxSize ? props.maxSize / total * 100 : 100 - minPercent;
      let newPercent = offset / total * 100;
      newPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
      setSplitPercent(newPercent);
    };
    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isHorizontal, minSize, props.maxSize]);
  const containerStyle3 = useMemo(() => {
    return {
      display: "flex",
      flexDirection: isHorizontal ? "row" : "column",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      ...props.style ?? {}
    };
  }, [isHorizontal, props.style]);
  const firstPaneStyle = isHorizontal ? { width: `calc(${splitPercent}% - ${dividerSize / 2}px)`, overflow: "auto", flexShrink: "0" } : { height: `calc(${splitPercent}% - ${dividerSize / 2}px)`, overflow: "auto", flexShrink: "0" };
  const secondPaneStyle = {
    flex: "1",
    overflow: "auto",
    minWidth: "0",
    minHeight: "0"
  };
  const dividerStyle2 = {
    flexShrink: "0",
    backgroundColor: "#e5e7eb",
    transition: "background-color 0.15s",
    ...isHorizontal ? {
      width: `${dividerSize}px`,
      cursor: "col-resize",
      height: "100%"
    } : {
      height: `${dividerSize}px`,
      cursor: "row-resize",
      width: "100%"
    }
  };
  const children = Array.isArray(props.children) ? props.children : [];
  return createElement(
    "div",
    {
      className: `splitter splitter--${direction} ${props.className ?? ""}`.trim(),
      style: containerStyle3,
      ref: containerRef
    },
    // First pane
    createElement(
      "div",
      { className: "splitter__pane splitter__pane--first", style: firstPaneStyle },
      children[0] ?? null
    ),
    // Divider
    createElement("div", {
      className: "splitter__divider",
      style: dividerStyle2,
      onMouseDown,
      onKeyDown: (e) => {
        const key = e.key;
        const step = 2;
        if (isHorizontal && (key === "ArrowLeft" || key === "ArrowRight")) {
          e.preventDefault();
          setSplitPercent((prev) => {
            const delta = key === "ArrowRight" ? step : -step;
            return Math.max(5, Math.min(95, prev + delta));
          });
        } else if (!isHorizontal && (key === "ArrowUp" || key === "ArrowDown")) {
          e.preventDefault();
          setSplitPercent((prev) => {
            const delta = key === "ArrowDown" ? step : -step;
            return Math.max(5, Math.min(95, prev + delta));
          });
        }
      },
      role: "separator",
      tabIndex: 0,
      "aria-orientation": isHorizontal ? "vertical" : "horizontal",
      "aria-valuenow": String(Math.round(splitPercent)),
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-label": "Resize panels"
    }),
    // Second pane
    createElement(
      "div",
      { className: "splitter__pane splitter__pane--second", style: secondPaneStyle },
      children[1] ?? null
    )
  );
}

// ../components/layout/tabs/src/Tabs.ts
function Tabs(props) {
  const position = props.position ?? "top";
  const variant = props.variant ?? "line";
  const firstEnabledId = props.tabs.find((t) => !t.disabled)?.id ?? "";
  const [internalActive, setInternalActive] = useState(props.activeTab ?? firstEnabledId);
  const activeId = props.activeTab ?? internalActive;
  const tabListRef = useRef(null);
  const activate = useCallback(
    (id) => {
      setInternalActive(id);
      if (props.onChange) {
        props.onChange(id);
      }
    },
    [props.onChange]
  );
  const onKeyDown = useCallback(
    (e) => {
      const enabledTabs = props.tabs.filter((t) => !t.disabled);
      const currentIdx = enabledTabs.findIndex((t) => t.id === activeId);
      if (currentIdx === -1) return;
      const isVertical2 = position === "left" || position === "right";
      const prevKey = isVertical2 ? "ArrowUp" : "ArrowLeft";
      const nextKey = isVertical2 ? "ArrowDown" : "ArrowRight";
      let newIdx = -1;
      if (e.key === prevKey) {
        newIdx = currentIdx > 0 ? currentIdx - 1 : enabledTabs.length - 1;
      } else if (e.key === nextKey) {
        newIdx = currentIdx < enabledTabs.length - 1 ? currentIdx + 1 : 0;
      } else if (e.key === "Home") {
        newIdx = 0;
      } else if (e.key === "End") {
        newIdx = enabledTabs.length - 1;
      }
      if (newIdx >= 0) {
        e.preventDefault();
        activate(enabledTabs[newIdx].id);
        const tabList = tabListRef.current;
        if (tabList) {
          const buttons = tabList.querySelectorAll('[role="tab"]');
          const targetBtn = buttons[props.tabs.indexOf(enabledTabs[newIdx])];
          if (targetBtn) targetBtn.focus();
        }
      }
    },
    [props.tabs, activeId, position, activate]
  );
  const isVertical = position === "left" || position === "right";
  const isReversed = position === "bottom" || position === "right";
  const containerStyle3 = useMemo(() => {
    return {
      display: "flex",
      flexDirection: isVertical ? isReversed ? "row-reverse" : "row" : isReversed ? "column-reverse" : "column",
      width: "100%",
      ...props.style ?? {}
    };
  }, [isVertical, isReversed, props.style]);
  const tabListStyle = {
    display: "flex",
    flexDirection: isVertical ? "column" : "row",
    gap: variant === "pill" ? "4px" : "0",
    ...variant === "line" && !isVertical ? { borderBottom: "2px solid #e5e7eb" } : {},
    ...variant === "line" && isVertical ? {
      borderRight: position === "left" ? "2px solid #e5e7eb" : "none",
      borderLeft: position === "right" ? "2px solid #e5e7eb" : "none"
    } : {},
    ...variant === "card" ? { backgroundColor: "#f9fafb" } : {},
    ...variant === "pill" ? { padding: "4px" } : {},
    flexShrink: "0"
  };
  const panelStyle = {
    flex: "1",
    padding: "16px",
    minWidth: "0",
    minHeight: "0"
  };
  const activeTab = props.tabs.find((t) => t.id === activeId);
  const tabButtons = props.tabs.map((tab) => {
    const isActive = tab.id === activeId;
    const btnStyle = {
      padding: "8px 16px",
      border: "none",
      background: "none",
      cursor: tab.disabled ? "not-allowed" : "pointer",
      opacity: tab.disabled ? "0.5" : "1",
      fontSize: "14px",
      fontWeight: isActive ? "600" : "400",
      color: isActive ? "#3b82f6" : "#6b7280",
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      outline: "none",
      transition: "color 0.15s, background-color 0.15s"
    };
    if (variant === "line") {
      if (!isVertical) {
        btnStyle.borderBottom = isActive ? "2px solid #3b82f6" : "2px solid transparent";
        btnStyle.marginBottom = "-2px";
      } else {
        if (position === "left") {
          btnStyle.borderRight = isActive ? "2px solid #3b82f6" : "2px solid transparent";
          btnStyle.marginRight = "-2px";
        } else {
          btnStyle.borderLeft = isActive ? "2px solid #3b82f6" : "2px solid transparent";
          btnStyle.marginLeft = "-2px";
        }
      }
    } else if (variant === "card") {
      btnStyle.backgroundColor = isActive ? "#ffffff" : "transparent";
      btnStyle.borderRadius = "6px 6px 0 0";
      if (isActive) {
        btnStyle.border = "1px solid #e5e7eb";
        btnStyle.borderBottom = "1px solid #ffffff";
      }
    } else if (variant === "pill") {
      btnStyle.borderRadius = "9999px";
      btnStyle.backgroundColor = isActive ? "#3b82f6" : "transparent";
      btnStyle.color = isActive ? "#ffffff" : "#6b7280";
    }
    return createElement(
      "button",
      {
        key: tab.id,
        role: "tab",
        "aria-selected": String(isActive),
        "aria-controls": `tabpanel-${tab.id}`,
        "aria-disabled": tab.disabled ? "true" : void 0,
        id: `tab-${tab.id}`,
        tabIndex: isActive ? "0" : "-1",
        style: btnStyle,
        onClick: tab.disabled ? void 0 : () => activate(tab.id),
        onKeyDown
      },
      tab.icon ? createElement("span", { className: "tabs__tab-icon" }, tab.icon) : null,
      tab.label
    );
  });
  return createElement(
    "div",
    {
      className: `tabs tabs--${position} tabs--${variant} ${props.className ?? ""}`.trim(),
      style: containerStyle3
    },
    // Tab list
    createElement(
      "div",
      {
        className: "tabs__list",
        role: "tablist",
        "aria-orientation": isVertical ? "vertical" : "horizontal",
        style: tabListStyle,
        ref: tabListRef
      },
      ...tabButtons
    ),
    // Tab panel
    createElement(
      "div",
      {
        className: "tabs__panel",
        role: "tabpanel",
        id: `tabpanel-${activeId}`,
        "aria-labelledby": `tab-${activeId}`,
        style: panelStyle,
        tabIndex: "0"
      },
      activeTab ? activeTab.content : null
    )
  );
}

// ../components/media/carousel/src/Carousel.ts
function Carousel(props) {
  const items = props.items ?? [];
  const count = items.length;
  const loop = props.loop !== false;
  const showDots = props.showDots !== false;
  const showArrows = props.showArrows !== false;
  const animation = props.animation ?? "slide";
  const interval = props.interval ?? 5e3;
  const animId = useId();
  const [current, setCurrent] = useState(0);
  const pointerStart = useRef(null);
  const containerRef = useRef(null);
  const goTo = useCallback(
    (index) => {
      let next = index;
      if (loop) {
        next = (index % count + count) % count;
      } else {
        next = Math.max(0, Math.min(index, count - 1));
      }
      setCurrent(next);
      if (props.onChange) props.onChange(next);
    },
    [count, loop, props.onChange]
  );
  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);
  useEffect(() => {
    if (!props.autoPlay || count <= 1) return;
    const timer = setInterval(goNext, interval);
    return () => clearInterval(timer);
  }, [props.autoPlay, interval, goNext, count]);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    const el = containerRef.current;
    if (el) {
      el.addEventListener("keydown", handler);
      return () => el.removeEventListener("keydown", handler);
    }
  }, [goNext, goPrev]);
  const fadeKeyframes = animation === "fade" ? `@keyframes liq-fade-in-${animId}{from{opacity:0}to{opacity:1}}` : "";
  const containerStyle3 = {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    outline: "none"
  };
  const trackStyle = useMemo(() => {
    if (animation === "fade") {
      return { position: "relative", width: "100%" };
    }
    return {
      display: "flex",
      transition: "transform 0.4s ease",
      transform: `translateX(-${current * 100}%)`,
      width: "100%"
    };
  }, [current, animation]);
  const arrowStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: "2",
    background: "rgba(255,255,255,0.8)",
    border: "none",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#111827",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
  };
  const renderedItems = items.map((item, i) => {
    const itemStyle = animation === "fade" ? {
      position: i === current ? "relative" : "absolute",
      top: "0",
      left: "0",
      width: "100%",
      opacity: i === current ? "1" : "0",
      transition: "opacity 0.4s ease"
    } : {
      flex: "0 0 100%",
      width: "100%"
    };
    return createElement(
      "div",
      { key: String(i), style: itemStyle },
      item.content,
      item.caption ? createElement(
        "div",
        {
          style: {
            textAlign: "center",
            padding: "8px 12px",
            fontSize: "13px",
            color: "#6b7280"
          }
        },
        item.caption
      ) : null
    );
  });
  const dots = showDots ? createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "center",
        gap: "8px",
        padding: "12px 0"
      }
    },
    ...items.map(
      (_, i) => createElement("button", {
        key: String(i),
        "aria-label": `Go to slide ${i + 1}`,
        onclick: () => goTo(i),
        style: {
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          backgroundColor: i === current ? "#3b82f6" : "#d1d5db",
          transition: "background-color 0.2s",
          padding: "0"
        }
      })
    )
  ) : null;
  return createElement(
    "div",
    {
      ref: containerRef,
      tabindex: "0",
      role: "region",
      "aria-label": "Carousel",
      style: containerStyle3,
      onpointerdown: (e) => {
        pointerStart.current = e.clientX;
      },
      onpointerup: (e) => {
        if (pointerStart.current == null) return;
        const diff = e.clientX - pointerStart.current;
        if (diff > 50) goPrev();
        else if (diff < -50) goNext();
        pointerStart.current = null;
      }
    },
    fadeKeyframes ? createElement("style", null, fadeKeyframes) : null,
    // Track
    createElement("div", { style: trackStyle }, ...renderedItems),
    // Prev arrow
    showArrows && count > 1 ? createElement(
      "button",
      {
        "aria-label": "Previous slide",
        onclick: goPrev,
        style: { ...arrowStyle, left: "8px" }
      },
      "\u2039"
    ) : null,
    // Next arrow
    showArrows && count > 1 ? createElement(
      "button",
      {
        "aria-label": "Next slide",
        onclick: goNext,
        style: { ...arrowStyle, right: "8px" }
      },
      "\u203A"
    ) : null,
    // Dots
    dots
  );
}

// ../components/media/image/src/Image.ts
function Image(props) {
  const [status, setStatus] = useState("loading");
  const imgRef = useRef(null);
  const animId = useId();
  const lazy2 = props.lazy !== false;
  const cssWidth = typeof props.width === "number" ? `${props.width}px` : props.width;
  const cssHeight = typeof props.height === "number" ? `${props.height}px` : props.height;
  useEffect(() => {
    setStatus("loading");
  }, [props.src]);
  const containerStyle3 = useMemo(() => {
    const s = {
      display: "inline-block",
      position: "relative",
      overflow: "hidden"
    };
    if (cssWidth) s.width = cssWidth;
    if (cssHeight) s.height = cssHeight;
    if (props.borderRadius) s.borderRadius = props.borderRadius;
    return s;
  }, [cssWidth, cssHeight, props.borderRadius]);
  const imgStyle = useMemo(() => {
    const s = {
      display: "block",
      width: "100%",
      height: "100%"
    };
    if (props.objectFit) s.objectFit = props.objectFit;
    if (status === "loading") {
      s.opacity = "0";
      s.position = "absolute";
    }
    if (status === "error") {
      s.display = "none";
    }
    return s;
  }, [props.objectFit, status]);
  let placeholderEl = null;
  if (status === "loading") {
    if (props.placeholder === "skeleton") {
      const shimmerKf = `@keyframes liq-img-shimmer-${animId}{0%{background-position:-200% 0}100%{background-position:200% 0}}`;
      placeholderEl = createElement(
        "div",
        null,
        createElement("style", null, shimmerKf),
        createElement("div", {
          style: {
            width: cssWidth ?? "100%",
            height: cssHeight ?? "200px",
            backgroundColor: "#e5e7eb",
            backgroundImage: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
            backgroundSize: "200% 100%",
            animation: `liq-img-shimmer-${animId} 1.5s ease-in-out infinite`
          }
        })
      );
    } else if (props.placeholder === "blur") {
      placeholderEl = createElement("div", {
        style: {
          width: cssWidth ?? "100%",
          height: cssHeight ?? "200px",
          backgroundColor: "#d1d5db",
          filter: "blur(20px)"
        }
      });
    } else if (props.placeholder != null && props.placeholder !== false) {
      placeholderEl = props.placeholder;
    }
  }
  let fallbackEl = null;
  if (status === "error" && props.fallback != null) {
    if (typeof props.fallback === "string") {
      fallbackEl = createElement("img", {
        src: props.fallback,
        alt: props.alt ?? "",
        style: { display: "block", width: "100%", height: "100%", objectFit: props.objectFit ?? "cover" }
      });
    } else {
      fallbackEl = props.fallback;
    }
  }
  const figure = createElement(
    "div",
    { style: containerStyle3 },
    placeholderEl,
    createElement("img", {
      ref: imgRef,
      src: props.src,
      alt: props.alt ?? "",
      loading: lazy2 ? "lazy" : void 0,
      style: imgStyle,
      onload: () => setStatus("loaded"),
      onerror: () => setStatus("error")
    }),
    fallbackEl
  );
  if (props.caption) {
    return createElement(
      "figure",
      { style: { margin: "0", display: "inline-block" } },
      figure,
      createElement(
        "figcaption",
        {
          style: {
            fontSize: "13px",
            color: "#6b7280",
            marginTop: "6px",
            textAlign: "center"
          }
        },
        props.caption
      )
    );
  }
  return figure;
}

// ../components/media/video-player/src/VideoPlayer.ts
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function VideoPlayer(props) {
  const showControls = props.controls !== false;
  const videoRef = useRef(null);
  const animId = useId();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(props.muted ? 0 : 1);
  const [muted, setMuted] = useState(!!props.muted);
  const [showControlBar, setShowControlBar] = useState(true);
  const cssWidth = typeof props.width === "number" ? `${props.width}px` : props.width ?? "100%";
  const cssHeight = typeof props.height === "number" ? `${props.height}px` : props.height ?? "auto";
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => {
      setPlaying(true);
      if (props.onPlay) props.onPlay();
    };
    const onPause = () => {
      setPlaying(false);
      if (props.onPause) props.onPause();
    };
    const onEnded = () => {
      setPlaying(false);
      if (props.onEnded) props.onEnded();
    };
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      setDuration(v.duration);
      if (props.onTimeUpdate) props.onTimeUpdate(v.currentTime, v.duration);
    };
    const onLoadedMetadata = () => {
      setDuration(v.duration);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [props.onPlay, props.onPause, props.onEnded, props.onTimeUpdate]);
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }, []);
  const seek = useCallback((e) => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
  }, []);
  const changeVolume = useCallback((e) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
  }, []);
  if (!showControls) {
    return createElement("video", {
      ref: videoRef,
      src: props.src,
      poster: props.poster,
      controls: true,
      autoplay: props.autoPlay ? true : void 0,
      loop: props.loop ? true : void 0,
      muted: props.muted ? true : void 0,
      style: { width: cssWidth, height: cssHeight, display: "block" }
    });
  }
  const progressPct = duration > 0 ? currentTime / duration * 100 : 0;
  const btnStyle = {
    background: "none",
    border: "none",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px 8px",
    lineHeight: "1"
  };
  const controlBar = createElement(
    "div",
    {
      style: {
        position: "absolute",
        bottom: "0",
        left: "0",
        right: "0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
        opacity: showControlBar ? "1" : "0",
        transition: "opacity 0.3s"
      }
    },
    // Play/Pause
    createElement("button", { "aria-label": playing ? "Pause" : "Play", onclick: togglePlay, style: btnStyle }, playing ? "\u23F8" : "\u25B6"),
    // Progress bar
    createElement(
      "div",
      {
        onclick: seek,
        style: {
          flex: "1",
          height: "4px",
          backgroundColor: "rgba(255,255,255,0.3)",
          borderRadius: "2px",
          cursor: "pointer",
          position: "relative"
        }
      },
      createElement("div", {
        style: {
          width: `${progressPct}%`,
          height: "100%",
          backgroundColor: "#3b82f6",
          borderRadius: "2px",
          transition: "width 0.1s linear"
        }
      })
    ),
    // Time display
    createElement(
      "span",
      { style: { color: "#ffffff", fontSize: "12px", whiteSpace: "nowrap", fontFamily: "monospace" } },
      `${formatTime(currentTime)} / ${formatTime(duration)}`
    ),
    // Volume slider
    createElement("input", {
      type: "range",
      min: "0",
      max: "1",
      step: "0.05",
      value: String(muted ? 0 : volume),
      oninput: changeVolume,
      "aria-label": "Volume",
      style: { width: "60px", cursor: "pointer" }
    }),
    // Fullscreen
    createElement("button", { "aria-label": "Fullscreen", onclick: toggleFullscreen, style: btnStyle }, "\u26F6")
  );
  return createElement(
    "div",
    {
      style: {
        position: "relative",
        width: cssWidth,
        height: cssHeight,
        backgroundColor: "#000",
        overflow: "hidden"
      },
      onmouseenter: () => setShowControlBar(true),
      onmouseleave: () => {
        if (playing) setShowControlBar(false);
      }
    },
    createElement("video", {
      ref: videoRef,
      src: props.src,
      poster: props.poster,
      autoplay: props.autoPlay ? true : void 0,
      loop: props.loop ? true : void 0,
      muted: props.muted ? true : void 0,
      playsinline: true,
      onclick: togglePlay,
      style: { width: "100%", height: "100%", display: "block", objectFit: "contain" }
    }),
    controlBar
  );
}

// ../components/nav/wrapper/src/NavWrapper.ts
function NavWrapper(props) {
  const orientation = props.orientation ?? "vertical";
  const role = props.role ?? "navigation";
  const keyboardNav = props.keyboardNav ?? true;
  const s = props.styling ?? {};
  const containerRef = useRef(null);
  const style = {
    display: "flex",
    flexDirection: orientation === "horizontal" ? "row" : "column",
    backgroundColor: s.backgroundColor ?? "#ffffff",
    color: s.color ?? "#1f2937",
    fontFamily: s.fontFamily ?? "inherit",
    fontSize: s.fontSize ?? "14px",
    border: s.border ?? "1px solid #e5e7eb",
    borderRadius: s.borderRadius ?? "8px",
    padding: s.padding ?? "0",
    width: typeof s.width === "number" ? `${s.width}px` : s.width ?? "auto",
    overflow: "auto",
    boxSizing: "border-box",
    listStyle: "none",
    margin: "0",
    ...s.boxShadow ? { boxShadow: s.boxShadow } : {},
    ...s.maxHeight ? { maxHeight: typeof s.maxHeight === "number" ? `${s.maxHeight}px` : s.maxHeight } : {},
    ...s.custom ?? {}
  };
  const handleKeyDown = useCallback(
    (e) => {
      if (!keyboardNav) return;
      const ke = e;
      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll(
          'button, [tabindex]:not([tabindex="-1"]), a[href], [role="menuitem"], [role="treeitem"]'
        )
      );
      const idx = focusable.indexOf(document.activeElement);
      if (idx < 0) return;
      const isVert = orientation === "vertical";
      const nextKey = isVert ? "ArrowDown" : "ArrowRight";
      const prevKey = isVert ? "ArrowUp" : "ArrowLeft";
      if (ke.key === nextKey) {
        ke.preventDefault();
        const next = focusable[idx + 1];
        if (next) next.focus();
      } else if (ke.key === prevKey) {
        ke.preventDefault();
        const prev = focusable[idx - 1];
        if (prev) prev.focus();
      } else if (ke.key === "Home") {
        ke.preventDefault();
        focusable[0]?.focus();
      } else if (ke.key === "End") {
        ke.preventDefault();
        focusable[focusable.length - 1]?.focus();
      }
    },
    [keyboardNav, orientation]
  );
  return createElement(
    "nav",
    {
      ref: containerRef,
      role,
      "aria-label": props.ariaLabel ?? void 0,
      "aria-orientation": orientation,
      className: `nav-wrapper ${props.className ?? ""}`.trim(),
      style,
      onKeyDown: handleKeyDown
    },
    props.children
  );
}
function buildNavItemStyle(s, state) {
  return {
    display: "flex",
    alignItems: "center",
    padding: s.padding ?? "10px 16px",
    cursor: s.cursor ?? "pointer",
    transition: s.transition ?? "background-color 0.15s",
    backgroundColor: state.active ? s.activeBackground ?? "#eff6ff" : state.hover ? s.hoverBackground ?? "#f3f4f6" : "transparent",
    color: state.active ? s.activeColor ?? "#2563eb" : "inherit",
    border: "none",
    outline: "none",
    width: "100%",
    textAlign: "left",
    font: "inherit",
    ...s.separator ? { borderBottom: s.separator } : {}
  };
}
function useHover() {
  const [hover, setHover] = useState(false);
  return {
    hover,
    onMouseEnter: useCallback(() => setHover(true), []),
    onMouseLeave: useCallback(() => setHover(false), [])
  };
}

// ../components/nav/accordion/src/Accordion.ts
function SectionHeader(props) {
  const {
    section,
    expanded,
    onToggle,
    headerStyle: hs,
    expandIcon,
    collapseIcon,
    iconPosition
  } = props;
  const { hover, onMouseEnter, onMouseLeave } = useHover();
  const disabled = section.disabled === true;
  const style = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    boxSizing: "border-box",
    padding: hs.padding ?? "12px 16px",
    backgroundColor: disabled ? "#f9fafb" : hover ? hs.hoverBackground ?? "#f3f4f6" : hs.backgroundColor ?? "transparent",
    color: disabled ? "#9ca3af" : hs.color ?? "inherit",
    fontWeight: hs.fontWeight ?? "600",
    fontSize: hs.fontSize ?? "inherit",
    border: "none",
    outline: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    font: "inherit",
    textAlign: "left",
    transition: "background-color 0.15s",
    ...hs.borderBottom ? { borderBottom: hs.borderBottom } : {}
  };
  if (iconPosition === "left") {
    style.flexDirection = "row";
  }
  const handleKeyDown = useCallback(
    (e) => {
      const ke = e;
      if (disabled) return;
      if (ke.key === "Enter" || ke.key === " ") {
        ke.preventDefault();
        onToggle();
      }
    },
    [disabled, onToggle]
  );
  const handleClick = useCallback(() => {
    if (!disabled) {
      onToggle();
    }
  }, [disabled, onToggle]);
  const iconText = expanded ? collapseIcon : expandIcon;
  const iconSpan = createElement(
    "span",
    {
      "aria-hidden": "true",
      style: {
        display: "inline-block",
        transition: "transform 0.2s ease",
        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        flexShrink: "0",
        marginLeft: iconPosition === "right" ? "auto" : "0",
        marginRight: iconPosition === "left" ? "8px" : "0",
        paddingLeft: iconPosition === "right" ? "8px" : "0"
      }
    },
    iconText
  );
  const headerContent = section.icon ? createElement(
    "span",
    { style: { display: "flex", alignItems: "center", gap: "8px" } },
    createElement("span", { "aria-hidden": "true" }, section.icon),
    section.header
  ) : section.header;
  const children = iconPosition === "left" ? [iconSpan, headerContent] : [headerContent, iconSpan];
  return createElement(
    "button",
    {
      id: `accordion-header-${section.id}`,
      role: "button",
      "aria-expanded": String(expanded),
      "aria-controls": `accordion-panel-${section.id}`,
      "aria-disabled": disabled ? "true" : void 0,
      "data-section-id": section.id,
      tabIndex: disabled ? -1 : 0,
      style,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      onMouseEnter,
      onMouseLeave
    },
    ...children
  );
}
function SectionContent(props) {
  const { section, expanded, contentStyle: cs, animated } = props;
  const style = {
    overflow: "hidden",
    boxSizing: "border-box",
    ...animated ? {
      maxHeight: expanded ? "2000px" : "0",
      transition: "max-height 0.3s ease"
    } : {
      display: expanded ? "block" : "none"
    }
  };
  const innerStyle = {
    padding: cs.padding ?? "12px 16px",
    backgroundColor: cs.backgroundColor ?? "transparent",
    ...cs.borderBottom ? { borderBottom: cs.borderBottom } : {}
  };
  return createElement(
    "div",
    {
      id: `accordion-panel-${section.id}`,
      role: "region",
      "aria-labelledby": `accordion-header-${section.id}`,
      "aria-hidden": String(!expanded),
      "data-section-content": section.id,
      style
    },
    createElement("div", { style: innerStyle }, section.content)
  );
}
function Accordion(props) {
  const {
    sections,
    defaultExpanded,
    allowMultiple = false,
    headerStyle = {},
    contentStyle = {},
    wrapperStyle,
    expandIcon = "+",
    collapseIcon = "\u2212",
    iconPosition = "right",
    animated = true,
    onChange
  } = props;
  const [expandedIds, setExpandedIds] = useState(
    () => defaultExpanded ?? []
  );
  const toggle = useCallback(
    (id) => {
      setExpandedIds((prev) => {
        const isExpanded = prev.includes(id);
        let next;
        if (isExpanded) {
          next = prev.filter((x) => x !== id);
        } else if (allowMultiple) {
          next = [...prev, id];
        } else {
          next = [id];
        }
        if (onChange) {
          onChange(next);
        }
        return next;
      });
    },
    [allowMultiple, onChange]
  );
  const sectionElements = useMemo(() => {
    return sections.map((section) => {
      const expanded = expandedIds.includes(section.id);
      const header = createElement(SectionHeader, {
        key: `header-${section.id}`,
        section,
        expanded,
        onToggle: () => toggle(section.id),
        headerStyle,
        expandIcon,
        collapseIcon,
        iconPosition
      });
      const content = createElement(SectionContent, {
        key: `content-${section.id}`,
        section,
        expanded,
        contentStyle,
        animated
      });
      return createElement(
        "div",
        {
          key: section.id,
          "data-accordion-section": section.id,
          style: { width: "100%" }
        },
        header,
        content
      );
    });
  }, [
    sections,
    expandedIds,
    headerStyle,
    contentStyle,
    expandIcon,
    collapseIcon,
    iconPosition,
    animated,
    toggle
  ]);
  return createElement(
    NavWrapper,
    {
      role: "region",
      ariaLabel: "Accordion",
      styling: wrapperStyle,
      keyboardNav: true
    },
    ...sectionElements
  );
}

// ../components/nav/breadcrumb/src/Breadcrumb.ts
var SIZE_MAP4 = {
  sm: { fontSize: "12px", padding: "4px 0" },
  md: { fontSize: "14px", padding: "6px 0" },
  lg: { fontSize: "16px", padding: "8px 0" }
};
function Breadcrumb(props) {
  const {
    items,
    separator = "/",
    maxItems,
    size = "md"
  } = props;
  const [expanded, setExpanded] = useState(false);
  const sizeStyle = SIZE_MAP4[size];
  const handleExpand = useCallback(() => {
    setExpanded(true);
  }, []);
  let visibleItems = items;
  let collapsed = false;
  if (maxItems && maxItems > 1 && items.length > maxItems && !expanded) {
    collapsed = true;
    const headCount = 1;
    const tailCount = maxItems - 1;
    visibleItems = [
      ...items.slice(0, headCount),
      { label: "..." },
      ...items.slice(items.length - tailCount)
    ];
  }
  const separatorEl = (node) => {
    if (typeof node === "string") {
      return createElement(
        "span",
        {
          "aria-hidden": "true",
          style: {
            margin: "0 8px",
            color: "#9ca3af",
            userSelect: "none"
          }
        },
        node
      );
    }
    return createElement(
      "span",
      { "aria-hidden": "true", style: { margin: "0 8px" } },
      node
    );
  };
  const renderItem = (item, index, arr) => {
    const isLast = index === arr.length - 1;
    const isEllipsis = collapsed && item.label === "..." && index === 1;
    const children = [];
    if (index > 0) {
      children.push(separatorEl(separator));
    }
    if (isEllipsis) {
      children.push(
        createElement(
          "button",
          {
            type: "button",
            onClick: handleExpand,
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              fontSize: sizeStyle.fontSize,
              color: "#6b7280",
              fontFamily: "inherit"
            },
            "aria-label": "Show all breadcrumb items"
          },
          "..."
        )
      );
    } else if (isLast) {
      children.push(
        createElement(
          "span",
          {
            "aria-current": "page",
            style: {
              color: "#1f2937",
              fontWeight: "600",
              fontSize: sizeStyle.fontSize
            }
          },
          item.label
        )
      );
    } else if (item.href) {
      children.push(
        createElement(
          "a",
          {
            href: item.href,
            onClick: item.onClick ? (e) => {
              e.preventDefault();
              item.onClick();
            } : void 0,
            style: {
              color: "#2563eb",
              textDecoration: "none",
              fontSize: sizeStyle.fontSize
            }
          },
          item.label
        )
      );
    } else if (item.onClick) {
      children.push(
        createElement(
          "button",
          {
            type: "button",
            onClick: item.onClick,
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#2563eb",
              padding: "0",
              fontSize: sizeStyle.fontSize,
              fontFamily: "inherit"
            }
          },
          item.label
        )
      );
    } else {
      children.push(
        createElement(
          "span",
          { style: { color: "#6b7280", fontSize: sizeStyle.fontSize } },
          item.label
        )
      );
    }
    return createElement(
      "li",
      {
        key: String(index),
        style: {
          display: "inline-flex",
          alignItems: "center"
        }
      },
      ...children
    );
  };
  const listItems = visibleItems.map(
    (item, i) => renderItem(item, i, visibleItems)
  );
  return createElement(
    NavWrapper,
    {
      orientation: "horizontal",
      role: "navigation",
      ariaLabel: "Breadcrumb",
      keyboardNav: false,
      styling: {
        border: "none",
        borderRadius: "0",
        padding: sizeStyle.padding,
        backgroundColor: "transparent"
      }
    },
    createElement(
      "ol",
      {
        style: {
          display: "flex",
          alignItems: "center",
          listStyle: "none",
          margin: "0",
          padding: "0",
          flexWrap: "wrap"
        }
      },
      ...listItems
    )
  );
}

// ../components/nav/dropdown/src/Dropdown.ts
function DropdownMenuItem(props) {
  const { item, itemStyle, closeOnSelect, onClose } = props;
  const { hover, onMouseEnter, onMouseLeave } = useHover();
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  if (item.divider) {
    return createElement("div", {
      role: "separator",
      style: {
        height: "1px",
        backgroundColor: "#e5e7eb",
        margin: "4px 0"
      }
    });
  }
  const isDisabled = item.disabled === true;
  const baseStyle = buildNavItemStyle(itemStyle, {
    hover: !isDisabled && hover,
    active: false
  });
  const style = {
    ...baseStyle,
    position: "relative",
    justifyContent: "space-between",
    ...isDisabled ? {
      color: "#9ca3af",
      cursor: "default",
      opacity: "0.6"
    } : {}
  };
  const handleClick = useCallback(() => {
    if (isDisabled) return;
    if (hasChildren) {
      setSubmenuOpen((prev) => !prev);
      return;
    }
    if (item.onClick) item.onClick();
    if (closeOnSelect) onClose();
  }, [isDisabled, hasChildren, item, closeOnSelect, onClose]);
  const handleMouseEnter = useCallback(() => {
    onMouseEnter();
    if (hasChildren) setSubmenuOpen(true);
  }, [hasChildren, onMouseEnter]);
  const handleMouseLeave = useCallback(() => {
    onMouseLeave();
    if (hasChildren) setSubmenuOpen(false);
  }, [hasChildren, onMouseLeave]);
  const leftContent = createElement(
    "span",
    { style: { display: "flex", alignItems: "center", gap: "8px" } },
    item.icon ? createElement(
      "span",
      { style: { flexShrink: "0" }, "aria-hidden": "true" },
      item.icon
    ) : null,
    createElement("span", null, item.label)
  );
  const rightIndicator = hasChildren ? createElement(
    "span",
    {
      style: { marginLeft: "8px", fontSize: "10px", lineHeight: "1" },
      "aria-hidden": "true"
    },
    "\u203A"
  ) : null;
  const submenu = hasChildren && submenuOpen ? createElement(
    "div",
    {
      style: {
        position: "absolute",
        left: "100%",
        top: "0",
        zIndex: "1000"
      }
    },
    createElement(
      NavWrapper,
      {
        orientation: "vertical",
        role: "menu",
        styling: {
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          width: "200px",
          backgroundColor: "#ffffff"
        }
      },
      ...item.children.map(
        (child) => createElement(DropdownMenuItem, {
          key: child.id,
          item: child,
          itemStyle,
          closeOnSelect,
          onClose
        })
      )
    )
  ) : null;
  return createElement(
    "div",
    {
      style: { position: "relative" },
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    },
    createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        style,
        onClick: handleClick,
        disabled: isDisabled || void 0,
        tabIndex: isDisabled ? -1 : 0,
        "aria-disabled": isDisabled ? "true" : void 0,
        "aria-haspopup": hasChildren || void 0,
        "aria-expanded": hasChildren ? String(submenuOpen) : void 0
      },
      leftContent,
      rightIndicator
    ),
    submenu
  );
}
function Dropdown(props) {
  const {
    label,
    items,
    triggerStyle,
    menuStyle,
    itemStyle = {},
    placement = "bottom-start",
    closeOnSelect = true,
    width = "220px"
  } = props;
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  useEffect(() => {
    if (!open) return;
    const handleDocClick = (e) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleDocClick, true);
    return () => {
      document.removeEventListener("click", handleDocClick, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);
  const defaultTriggerStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "8px 16px",
    fontSize: "14px",
    fontFamily: "inherit",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    cursor: "pointer",
    outline: "none",
    ...triggerStyle ?? {}
  };
  const triggerButton = createElement(
    "button",
    {
      type: "button",
      style: defaultTriggerStyle,
      onClick: toggle,
      "aria-haspopup": "true",
      "aria-expanded": String(open)
    },
    createElement("span", null, label),
    createElement(
      "span",
      {
        style: {
          marginLeft: "4px",
          fontSize: "10px",
          transition: "transform 0.15s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)"
        },
        "aria-hidden": "true"
      },
      "\u25BC"
    )
  );
  const resolvedWidth = typeof width === "number" ? `${width}px` : width;
  const panelStyle = {
    position: "absolute",
    top: "100%",
    ...placement === "bottom-end" ? { right: "0" } : { left: "0" },
    marginTop: "4px",
    zIndex: "999"
  };
  const mergedMenuStyle = {
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "4px 0",
    width: resolvedWidth,
    backgroundColor: "#ffffff",
    ...menuStyle ?? {}
  };
  const panel = open ? createElement(
    "div",
    { style: panelStyle },
    createElement(
      NavWrapper,
      {
        orientation: "vertical",
        role: "menu",
        ariaLabel: `${label} menu`,
        styling: mergedMenuStyle
      },
      ...items.map(
        (item) => createElement(DropdownMenuItem, {
          key: item.id,
          item,
          itemStyle,
          closeOnSelect,
          onClose: close
        })
      )
    )
  ) : null;
  return createElement(
    "div",
    {
      ref: containerRef,
      style: { position: "relative", display: "inline-block" }
    },
    triggerButton,
    panel
  );
}

// ../components/nav/menubar/src/Menubar.ts
function MenuItemRow(props) {
  const { item, onClose, index } = props;
  const { hover, onMouseEnter, onMouseLeave } = useHover();
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  if (item.divider) {
    return createElement("div", {
      role: "separator",
      style: {
        height: "1px",
        backgroundColor: "#e5e7eb",
        margin: "4px 0"
      }
    });
  }
  const isDisabled = item.disabled === true;
  const handleClick = useCallback(() => {
    if (isDisabled) return;
    if (hasChildren) {
      setSubmenuOpen((prev) => !prev);
      return;
    }
    if (item.onClick) item.onClick();
    onClose();
  }, [isDisabled, hasChildren, item, onClose]);
  const handleMouseEnter = useCallback(() => {
    onMouseEnter();
    if (hasChildren) setSubmenuOpen(true);
  }, [hasChildren, onMouseEnter]);
  const handleMouseLeave = useCallback(() => {
    onMouseLeave();
    if (hasChildren) setSubmenuOpen(false);
  }, [hasChildren, onMouseLeave]);
  const style = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 16px",
    fontSize: "13px",
    fontFamily: "inherit",
    border: "none",
    outline: "none",
    width: "100%",
    textAlign: "left",
    cursor: isDisabled ? "default" : "pointer",
    backgroundColor: !isDisabled && hover ? "#f3f4f6" : "transparent",
    color: isDisabled ? "#9ca3af" : "#1f2937",
    opacity: isDisabled ? "0.6" : "1",
    transition: "background-color 0.1s",
    boxSizing: "border-box"
  };
  const leftContent = createElement(
    "span",
    { style: { display: "flex", alignItems: "center", gap: "8px" } },
    item.icon ? createElement("span", { style: { width: "16px", textAlign: "center" }, "aria-hidden": "true" }, item.icon) : createElement("span", { style: { width: "16px" } }),
    createElement("span", null, item.label)
  );
  const rightContent = hasChildren ? createElement("span", { style: { fontSize: "10px", color: "#9ca3af" }, "aria-hidden": "true" }, "\u25B6") : item.shortcut ? createElement(
    "span",
    { style: { fontSize: "11px", color: "#9ca3af", marginLeft: "24px" } },
    item.shortcut
  ) : null;
  const submenu = hasChildren && submenuOpen ? createElement(
    "div",
    {
      style: {
        position: "absolute",
        left: "100%",
        top: "0",
        zIndex: "1001"
      }
    },
    createElement(
      "div",
      {
        role: "menu",
        style: {
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          padding: "4px 0",
          minWidth: "180px"
        }
      },
      ...item.children.map(
        (child, i) => createElement(MenuItemRow, {
          key: String(i),
          item: child,
          onClose,
          index: i
        })
      )
    )
  ) : null;
  return createElement(
    "div",
    {
      style: { position: "relative" },
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    },
    createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        style,
        onClick: handleClick,
        disabled: isDisabled || void 0,
        tabIndex: -1,
        "aria-disabled": isDisabled || void 0,
        "aria-haspopup": hasChildren || void 0,
        "aria-expanded": hasChildren ? submenuOpen : void 0
      },
      leftContent,
      rightContent
    ),
    submenu
  );
}
function MenuTrigger(props) {
  const { menu, index, isOpen, anyOpen, onOpen, onClose } = props;
  const { hover, onMouseEnter, onMouseLeave } = useHover();
  const triggerRef = useRef(null);
  const handleClick = useCallback(() => {
    if (isOpen) {
      onClose();
    } else {
      onOpen(index);
    }
  }, [isOpen, index, onOpen, onClose]);
  const handleMouseEnter = useCallback(() => {
    onMouseEnter();
    if (anyOpen && !isOpen) {
      onOpen(index);
    }
  }, [anyOpen, isOpen, index, onOpen, onMouseEnter]);
  const triggerStyle = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    fontSize: "13px",
    fontFamily: "inherit",
    border: "none",
    outline: "none",
    cursor: "pointer",
    backgroundColor: isOpen ? "#e5e7eb" : hover ? "#f3f4f6" : "transparent",
    color: "#1f2937",
    borderRadius: "4px",
    transition: "background-color 0.1s"
  };
  const panel = isOpen ? createElement(
    "div",
    {
      style: {
        position: "absolute",
        top: "100%",
        left: "0",
        zIndex: "1000",
        marginTop: "2px"
      }
    },
    createElement(
      "div",
      {
        role: "menu",
        "aria-label": `${menu.label} menu`,
        style: {
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          padding: "4px 0",
          minWidth: "200px"
        }
      },
      ...menu.items.map(
        (item, i) => createElement(MenuItemRow, {
          key: String(i),
          item,
          onClose,
          index: i
        })
      )
    )
  ) : null;
  return createElement(
    "div",
    {
      style: { position: "relative", display: "inline-block" },
      onMouseEnter: handleMouseEnter,
      onMouseLeave
    },
    createElement(
      "button",
      {
        ref: triggerRef,
        type: "button",
        role: "menuitem",
        style: triggerStyle,
        onClick: handleClick,
        "aria-haspopup": "true",
        "aria-expanded": String(isOpen),
        tabIndex: 0
      },
      menu.label
    ),
    panel
  );
}
function Menubar(props) {
  const { menus } = props;
  const [openIndex, setOpenIndex] = useState(null);
  const containerRef = useRef(null);
  const handleOpen = useCallback((index) => {
    setOpenIndex(index);
  }, []);
  const handleClose = useCallback(() => {
    setOpenIndex(null);
  }, []);
  useEffect(() => {
    if (openIndex === null) return;
    const handleDocClick = (e) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target)) {
        setOpenIndex(null);
      }
    };
    document.addEventListener("click", handleDocClick, true);
    return () => {
      document.removeEventListener("click", handleDocClick, true);
    };
  }, [openIndex]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleKeyDown = (e) => {
      const ke = e;
      if (ke.key === "Escape") {
        setOpenIndex(null);
        return;
      }
      if (ke.key === "ArrowRight") {
        ke.preventDefault();
        setOpenIndex((prev) => {
          if (prev === null) return 0;
          return (prev + 1) % menus.length;
        });
        return;
      }
      if (ke.key === "ArrowLeft") {
        ke.preventDefault();
        setOpenIndex((prev) => {
          if (prev === null) return menus.length - 1;
          return (prev - 1 + menus.length) % menus.length;
        });
        return;
      }
      if (ke.key === "ArrowDown" && openIndex !== null) {
        ke.preventDefault();
        const panel = container.querySelector('[role="menu"]');
        if (panel) {
          const first = panel.querySelector('[role="menuitem"]');
          if (first) first.focus();
        }
        return;
      }
      if (ke.key === "Enter" || ke.key === " ") {
        return;
      }
    };
    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [openIndex, menus.length]);
  const triggers = menus.map(
    (menu, index) => createElement(MenuTrigger, {
      key: String(index),
      menu,
      index,
      isOpen: openIndex === index,
      anyOpen: openIndex !== null,
      onOpen: handleOpen,
      onClose: handleClose
    })
  );
  return createElement(
    "div",
    {
      ref: containerRef,
      role: "menubar",
      "aria-label": "Menu bar",
      style: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "2px 4px",
        fontFamily: "inherit",
        fontSize: "13px",
        gap: "2px"
      }
    },
    ...triggers
  );
}

// ../components/nav/pagination/src/Pagination.ts
function range(start, end) {
  const result = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}
function computePageRange(totalPages, currentPage, siblingCount) {
  const totalSlots = siblingCount * 2 + 5;
  if (totalPages <= totalSlots) {
    return range(1, totalPages);
  }
  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;
  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = range(1, siblingCount * 2 + 3);
    return [...leftRange, "ellipsis", totalPages];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = range(totalPages - siblingCount * 2 - 2, totalPages);
    return [1, "ellipsis", ...rightRange];
  }
  return [1, "ellipsis", ...range(leftSibling, rightSibling), "ellipsis", totalPages];
}
var baseButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "36px",
  height: "36px",
  padding: "4px 8px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  backgroundColor: "#ffffff",
  color: "#374151",
  fontSize: "14px",
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background-color 0.15s, color 0.15s",
  outline: "none",
  userSelect: "none"
};
var activeButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: "#2563eb",
  color: "#ffffff",
  borderColor: "#2563eb",
  fontWeight: "600"
};
var disabledButtonStyle = {
  ...baseButtonStyle,
  color: "#9ca3af",
  cursor: "default",
  opacity: "0.5"
};
var ellipsisStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "36px",
  height: "36px",
  color: "#6b7280",
  fontSize: "14px",
  userSelect: "none"
};
function Pagination(props) {
  const {
    total,
    pageSize,
    currentPage,
    onChange,
    siblingCount = 1,
    showFirstLast = true,
    showPrevNext = true,
    disabled = false
  } = props;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const goTo = useCallback(
    (p) => {
      if (!disabled && p >= 1 && p <= totalPages && p !== page) {
        onChange(p);
      }
    },
    [disabled, totalPages, page, onChange]
  );
  const navButton = (label, targetPage, ariaLabel) => {
    const isDisabled = disabled || targetPage < 1 || targetPage > totalPages || targetPage === page;
    return createElement(
      "button",
      {
        type: "button",
        onClick: () => goTo(targetPage),
        disabled: isDisabled || void 0,
        "aria-label": ariaLabel,
        style: isDisabled ? disabledButtonStyle : baseButtonStyle
      },
      label
    );
  };
  const pages = computePageRange(totalPages, page, siblingCount);
  let ellipsisKey = 0;
  const children = [];
  if (showFirstLast) {
    children.push(navButton("\xAB", 1, "Go to first page"));
  }
  if (showPrevNext) {
    children.push(navButton("\u2039", page - 1, "Go to previous page"));
  }
  for (const p of pages) {
    if (p === "ellipsis") {
      children.push(
        createElement("span", { key: `ellipsis-${ellipsisKey++}`, style: ellipsisStyle }, "...")
      );
    } else {
      const isCurrent = p === page;
      children.push(
        createElement(
          "button",
          {
            key: String(p),
            type: "button",
            onClick: () => goTo(p),
            disabled: disabled || void 0,
            "aria-label": `Page ${p}`,
            "aria-current": isCurrent ? "page" : void 0,
            style: disabled ? disabledButtonStyle : isCurrent ? activeButtonStyle : baseButtonStyle
          },
          String(p)
        )
      );
    }
  }
  if (showPrevNext) {
    children.push(navButton("\u203A", page + 1, "Go to next page"));
  }
  if (showFirstLast) {
    children.push(navButton("\xBB", totalPages, "Go to last page"));
  }
  return createElement(
    NavWrapper,
    {
      orientation: "horizontal",
      role: "navigation",
      ariaLabel: "Pagination",
      keyboardNav: true,
      styling: {
        border: "none",
        borderRadius: "0",
        backgroundColor: "transparent",
        padding: "0",
        custom: { gap: "4px" }
      }
    },
    ...children
  );
}

// ../components/nav/sidebar/src/Sidebar.ts
function SidebarNavItem(props) {
  const { item, collapsed, selectedId, onSelect, depth } = props;
  const { hover, onMouseEnter, onMouseLeave } = useHover();
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = item.id === selectedId;
  const handleClick = useCallback(() => {
    if (hasChildren && !collapsed) {
      setExpanded((prev) => !prev);
    }
    if (onSelect) {
      onSelect(item.id);
    }
  }, [hasChildren, collapsed, onSelect, item.id]);
  const paddingLeft = collapsed ? "0" : `${16 + depth * 16}px`;
  const style = {
    display: "flex",
    alignItems: "center",
    padding: collapsed ? "10px 0" : `10px 12px 10px ${paddingLeft}`,
    justifyContent: collapsed ? "center" : "flex-start",
    cursor: "pointer",
    backgroundColor: isSelected ? "#eff6ff" : hover ? "#f3f4f6" : "transparent",
    color: isSelected ? "#2563eb" : "#1f2937",
    border: "none",
    outline: "none",
    width: "100%",
    textAlign: "left",
    font: "inherit",
    fontSize: "14px",
    transition: "background-color 0.15s",
    position: "relative",
    gap: "10px",
    boxSizing: "border-box"
  };
  const iconEl = item.icon ? createElement(
    "span",
    {
      style: { flexShrink: "0", fontSize: "16px" },
      "aria-hidden": "true"
    },
    item.icon
  ) : null;
  const labelEl = !collapsed ? createElement(
    "span",
    {
      style: {
        flex: "1",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    },
    item.label
  ) : null;
  const badgeEl = !collapsed && item.badge ? createElement(
    "span",
    {
      style: {
        backgroundColor: "#ef4444",
        color: "#ffffff",
        fontSize: "11px",
        fontWeight: "600",
        padding: "1px 6px",
        borderRadius: "10px",
        marginLeft: "4px",
        flexShrink: "0"
      }
    },
    item.badge
  ) : null;
  const chevronEl = !collapsed && hasChildren ? createElement(
    "span",
    {
      style: {
        fontSize: "10px",
        transition: "transform 0.15s",
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        marginLeft: "4px"
      },
      "aria-hidden": "true"
    },
    "\u25B6"
  ) : null;
  const tooltipEl = collapsed && hover ? createElement(
    "div",
    {
      style: {
        position: "absolute",
        left: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        marginLeft: "8px",
        padding: "4px 10px",
        backgroundColor: "#1f2937",
        color: "#ffffff",
        fontSize: "12px",
        borderRadius: "4px",
        whiteSpace: "nowrap",
        zIndex: "1000",
        pointerEvents: "none"
      },
      role: "tooltip"
    },
    item.label
  ) : null;
  const button = createElement(
    "button",
    {
      type: "button",
      style,
      onClick: handleClick,
      onMouseEnter,
      onMouseLeave,
      "aria-selected": isSelected ? "true" : "false",
      title: collapsed ? item.label : void 0
    },
    iconEl,
    labelEl,
    badgeEl,
    chevronEl,
    tooltipEl
  );
  const childItems = !collapsed && hasChildren && expanded ? item.children.map(
    (child) => createElement(SidebarNavItem, {
      key: child.id,
      item: child,
      collapsed,
      selectedId,
      onSelect,
      depth: depth + 1
    })
  ) : null;
  return createElement(
    "div",
    { key: item.id, style: { position: "relative" } },
    button,
    childItems ? createElement("div", { role: "group" }, ...childItems) : null
  );
}
function Sidebar(props) {
  const {
    items,
    collapsed = false,
    onToggleCollapse,
    selectedId,
    onSelect,
    width = "240px",
    collapsedWidth = "56px"
  } = props;
  const resolvedWidth = collapsed ? typeof collapsedWidth === "number" ? `${collapsedWidth}px` : collapsedWidth : typeof width === "number" ? `${width}px` : width;
  const toggleButton = onToggleCollapse ? createElement(
    "button",
    {
      type: "button",
      onClick: onToggleCollapse,
      "aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar",
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        padding: "10px 0",
        border: "none",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "transparent",
        cursor: "pointer",
        fontSize: "14px",
        color: "#6b7280",
        fontFamily: "inherit"
      }
    },
    collapsed ? "\u25B6" : "\u25C0"
  ) : null;
  const navItems = items.map(
    (item) => createElement(SidebarNavItem, {
      key: item.id,
      item,
      collapsed,
      selectedId,
      onSelect,
      depth: 0
    })
  );
  return createElement(
    NavWrapper,
    {
      orientation: "vertical",
      role: "navigation",
      ariaLabel: "Sidebar",
      keyboardNav: true,
      styling: {
        width: resolvedWidth,
        border: "1px solid #e5e7eb",
        borderRadius: "0",
        padding: "0",
        backgroundColor: "#ffffff",
        custom: {
          height: "100%",
          transition: "width 0.2s",
          overflow: "hidden"
        }
      }
    },
    toggleButton,
    ...navItems
  );
}

// ../components/nav/stepper/src/Stepper.ts
var COLORS2 = {
  completed: "#2563eb",
  completedBg: "#2563eb",
  completedText: "#ffffff",
  active: "#2563eb",
  activeBorder: "#2563eb",
  activeText: "#2563eb",
  pending: "#d1d5db",
  pendingText: "#9ca3af",
  line: "#d1d5db",
  lineCompleted: "#2563eb",
  labelActive: "#1f2937",
  labelPending: "#9ca3af",
  descriptionColor: "#6b7280"
};
function Stepper(props) {
  const {
    steps,
    currentStep,
    orientation = "horizontal",
    onChange,
    clickable = false,
    variant = "circle"
  } = props;
  const isHorizontal = orientation === "horizontal";
  const circleSize = variant === "circle" ? 32 : 12;
  const dotSize = variant === "dot" ? 12 : 32;
  const handleClick = useCallback(
    (index) => {
      if (clickable && onChange) {
        onChange(index);
      }
    },
    [clickable, onChange]
  );
  const getStepState = (index) => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "active";
    return "pending";
  };
  const renderIndicator = (index, step, state) => {
    const size = variant === "dot" ? dotSize : circleSize;
    const baseStyle = {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: variant === "circle" ? "14px" : "0",
      fontWeight: "600",
      flexShrink: "0",
      transition: "background-color 0.2s, border-color 0.2s"
    };
    if (state === "completed") {
      return createElement(
        "div",
        {
          style: {
            ...baseStyle,
            backgroundColor: COLORS2.completedBg,
            color: COLORS2.completedText,
            border: `2px solid ${COLORS2.completed}`
          }
        },
        variant === "circle" ? step.icon || "\u2713" : null
      );
    }
    if (state === "active") {
      return createElement(
        "div",
        {
          style: {
            ...baseStyle,
            backgroundColor: "#ffffff",
            color: COLORS2.activeText,
            border: `2px solid ${COLORS2.activeBorder}`,
            boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.2)"
          }
        },
        variant === "circle" ? step.icon || String(index + 1) : createElement("div", {
          style: {
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: COLORS2.active
          }
        })
      );
    }
    return createElement(
      "div",
      {
        style: {
          ...baseStyle,
          backgroundColor: "#ffffff",
          color: COLORS2.pendingText,
          border: `2px solid ${COLORS2.pending}`
        }
      },
      variant === "circle" ? step.icon || String(index + 1) : null
    );
  };
  const renderConnector = (index) => {
    if (index >= steps.length - 1) return null;
    const completed = index < currentStep;
    const lineColor = completed ? COLORS2.lineCompleted : COLORS2.line;
    if (isHorizontal) {
      return createElement("div", {
        style: {
          flex: "1",
          height: "2px",
          backgroundColor: lineColor,
          margin: `0 8px`,
          alignSelf: "center",
          transition: "background-color 0.2s"
        }
      });
    }
    return createElement("div", {
      style: {
        width: "2px",
        flex: "1",
        minHeight: "24px",
        backgroundColor: lineColor,
        marginLeft: `${(variant === "dot" ? dotSize : circleSize) / 2 - 1}px`,
        transition: "background-color 0.2s"
      }
    });
  };
  const renderStep = (step, index) => {
    const state = getStepState(index);
    const isActive = state === "active";
    const isCompleted = state === "completed";
    const indicator = renderIndicator(index, step, state);
    const labelStyle = {
      fontSize: "13px",
      fontWeight: isActive ? "600" : "400",
      color: isActive || isCompleted ? COLORS2.labelActive : COLORS2.labelPending,
      marginTop: isHorizontal ? "8px" : "0",
      marginLeft: isHorizontal ? "0" : "12px",
      textAlign: isHorizontal ? "center" : "left",
      transition: "color 0.2s"
    };
    const descriptionStyle = {
      fontSize: "11px",
      color: COLORS2.descriptionColor,
      marginTop: "2px",
      textAlign: isHorizontal ? "center" : "left"
    };
    const labelBlock = createElement(
      "div",
      {
        style: isHorizontal ? { display: "flex", flexDirection: "column", alignItems: "center" } : { display: "flex", flexDirection: "column" }
      },
      createElement("span", { style: labelStyle }, step.label),
      step.description ? createElement("span", { style: descriptionStyle }, step.description) : null
    );
    const stepContent = isHorizontal ? createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", alignItems: "center" } },
      indicator,
      labelBlock
    ) : createElement(
      "div",
      { style: { display: "flex", flexDirection: "row", alignItems: "center" } },
      indicator,
      labelBlock
    );
    const stepWrapper = createElement(
      clickable ? "button" : "div",
      {
        key: String(index),
        onClick: clickable ? () => handleClick(index) : void 0,
        style: {
          display: "flex",
          flexDirection: isHorizontal ? "column" : "row",
          alignItems: isHorizontal ? "center" : "flex-start",
          background: "none",
          border: "none",
          padding: "0",
          cursor: clickable ? "pointer" : "default",
          fontFamily: "inherit",
          outline: "none"
        },
        "aria-current": isActive ? "step" : void 0
      },
      stepContent
    );
    return stepWrapper;
  };
  const elements = [];
  steps.forEach((step, index) => {
    elements.push(renderStep(step, index));
    const connector = renderConnector(index);
    if (connector) elements.push(connector);
  });
  return createElement(
    "div",
    {
      role: "navigation",
      "aria-label": "Progress steps",
      style: {
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        alignItems: isHorizontal ? "flex-start" : "stretch",
        width: "100%"
      }
    },
    ...elements
  );
}

// ../components/nav/toolbar/src/Toolbar.ts
var SIZE_MAP5 = {
  sm: { height: "28px", padding: "4px 8px", fontSize: "12px", iconSize: "14px" },
  md: { height: "36px", padding: "6px 12px", fontSize: "14px", iconSize: "16px" },
  lg: { height: "44px", padding: "8px 16px", fontSize: "16px", iconSize: "18px" }
};
function ToolbarButton(props) {
  const { item, size, variant } = props;
  const { hover, onMouseEnter, onMouseLeave } = useHover();
  const s = SIZE_MAP5[size];
  const isDisabled = item.disabled === true;
  const isToggle = item.type === "toggle";
  const [pressed, setPressed] = useState(false);
  const isActive = isToggle ? item.active === true : pressed;
  const handleClick = useCallback(() => {
    if (!isDisabled && item.onClick) {
      item.onClick();
    }
  }, [isDisabled, item]);
  const handleMouseDown = useCallback(() => {
    if (!isDisabled && !isToggle) setPressed(true);
  }, [isDisabled, isToggle]);
  const handleMouseUp = useCallback(() => {
    if (!isToggle) setPressed(false);
  }, [isToggle]);
  const handleMouseLeaveBtn = useCallback(() => {
    onMouseLeave();
    if (!isToggle) setPressed(false);
  }, [isToggle, onMouseLeave]);
  const style = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    height: s.height,
    padding: s.padding,
    fontSize: s.fontSize,
    fontFamily: "inherit",
    border: variant === "raised" ? "1px solid #d1d5db" : "1px solid transparent",
    borderRadius: "4px",
    backgroundColor: isActive ? "#e0e7ff" : !isDisabled && hover ? "#f3f4f6" : variant === "raised" ? "#ffffff" : "transparent",
    color: isDisabled ? "#9ca3af" : isActive ? "#2563eb" : "#374151",
    cursor: isDisabled ? "default" : "pointer",
    opacity: isDisabled ? "0.5" : "1",
    outline: "none",
    transition: "background-color 0.15s"
  };
  const iconEl = item.icon ? createElement(
    "span",
    { style: { fontSize: s.iconSize }, "aria-hidden": "true" },
    item.icon
  ) : null;
  const labelEl = item.label ? createElement("span", null, item.label) : null;
  const dropdownIndicator = item.type === "dropdown" ? createElement(
    "span",
    { style: { fontSize: "10px", marginLeft: "2px" }, "aria-hidden": "true" },
    "\u25BC"
  ) : null;
  return createElement(
    "button",
    {
      type: "button",
      style,
      onClick: handleClick,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseEnter,
      onMouseLeave: handleMouseLeaveBtn,
      disabled: isDisabled || void 0,
      "aria-pressed": isToggle ? isActive : void 0,
      "aria-label": item.label || item.id,
      title: item.label || item.id
    },
    iconEl,
    labelEl,
    dropdownIndicator
  );
}
function Toolbar(props) {
  const {
    items,
    size = "md",
    variant = "flat"
  } = props;
  const s = SIZE_MAP5[size];
  const children = items.map((item) => {
    if (item.type === "separator") {
      return createElement("div", {
        key: item.id,
        role: "separator",
        "aria-orientation": "vertical",
        style: {
          width: "1px",
          height: s.height,
          backgroundColor: "#d1d5db",
          margin: "0 4px",
          flexShrink: "0"
        }
      });
    }
    if (item.type === "spacer") {
      return createElement("div", {
        key: item.id,
        style: { flex: "1" },
        "aria-hidden": "true"
      });
    }
    return createElement(ToolbarButton, {
      key: item.id,
      item,
      size,
      variant
    });
  });
  return createElement(
    NavWrapper,
    {
      orientation: "horizontal",
      role: "toolbar",
      ariaLabel: "Toolbar",
      keyboardNav: true,
      styling: {
        border: variant === "raised" ? "1px solid #e5e7eb" : "none",
        borderRadius: variant === "raised" ? "8px" : "0",
        padding: "4px",
        backgroundColor: variant === "raised" ? "#ffffff" : "transparent",
        boxShadow: variant === "raised" ? "0 1px 3px rgba(0,0,0,0.1)" : void 0,
        custom: { gap: "2px", alignItems: "center" }
      }
    },
    ...children
  );
}

// ../components/nav/treenav/src/TreeNode.ts
var TreeNode = class _TreeNode {
  id;
  label;
  children;
  expanded;
  icon;
  metadata;
  parent;
  depth;
  constructor(data, parent) {
    this.id = data.id;
    this.label = data.label;
    this.expanded = data.expanded ?? false;
    this.icon = data.icon ?? null;
    this.metadata = data.metadata ?? {};
    this.parent = parent ?? null;
    this.depth = parent ? parent.depth + 1 : 0;
    this.children = (data.children ?? []).map(
      (childData) => new _TreeNode(childData, this)
    );
  }
  // -- Factory --------------------------------------------------------------
  /**
   * Build a full TreeNode tree from nested data.
   */
  static fromData(data) {
    return new _TreeNode(data);
  }
  // -- Traversal ------------------------------------------------------------
  /**
   * Returns true if the node has no children.
   */
  isLeaf() {
    return this.children.length === 0;
  }
  /**
   * Returns true if the node has no parent (root of the tree).
   */
  isRoot() {
    return this.parent === null;
  }
  /**
   * Depth-first walk of this node and all descendants.
   * The callback receives each node and its depth.
   */
  walk(fn) {
    fn(this, this.depth);
    for (const child of this.children) {
      child.walk(fn);
    }
  }
  /**
   * Find a descendant (or self) by id. Returns null if not found.
   */
  find(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.find(id);
      if (found) return found;
    }
    return null;
  }
  // -- Mutation -------------------------------------------------------------
  /**
   * Toggle the expanded/collapsed state.
   */
  toggle() {
    this.expanded = !this.expanded;
  }
  /**
   * Expand this node (show children).
   */
  expand() {
    this.expanded = true;
  }
  /**
   * Collapse this node (hide children).
   */
  collapse() {
    this.expanded = false;
  }
  /**
   * Add a child node from data. Returns the newly created TreeNode.
   */
  addChild(data) {
    const child = new _TreeNode(data, this);
    this.children.push(child);
    return child;
  }
  /**
   * Remove a direct child by id. Returns true if a child was removed.
   */
  removeChild(id) {
    const idx = this.children.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.children.splice(idx, 1);
    return true;
  }
};

// ../components/nav/treenav/src/TreeNav.ts
function expandAllNodes(node) {
  node.expanded = true;
  for (const child of node.children) {
    expandAllNodes(child);
  }
}
function flattenVisible(node, list = []) {
  list.push(node);
  if (node.expanded) {
    for (const child of node.children) {
      flattenVisible(child, list);
    }
  }
  return list;
}
function isLastChild(node) {
  if (!node.parent) return true;
  const siblings = node.parent.children;
  return siblings[siblings.length - 1] === node;
}
function TreeNodeRow(props) {
  const {
    node,
    isSelected,
    indentPx,
    lineColor,
    lineWidth,
    iconExpanded,
    iconCollapsed,
    nodeStyle,
    renderNode,
    onToggle,
    onClick,
    focusedId
  } = props;
  const hoverState = useHover();
  const rowRef = useRef(null);
  const isFocused = focusedId === node.id;
  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.focus();
    }
  }, [isFocused]);
  const isLeaf = node.isLeaf();
  const depth = node.depth;
  const connectors = [];
  for (let d = 0; d < depth; d++) {
    let ancestor = node;
    for (let i = 0; i < depth - d; i++) {
      ancestor = ancestor ? ancestor.parent : null;
    }
    const showVertical = ancestor ? !isLastChild(ancestor) : false;
    connectors.push(
      createElement("span", {
        key: `connector-${d}`,
        "aria-hidden": "true",
        style: {
          display: "inline-block",
          width: `${indentPx}px`,
          height: "100%",
          position: "relative",
          flexShrink: "0",
          ...showVertical ? {
            borderLeft: `${lineWidth}px solid ${lineColor}`
          } : {}
        }
      })
    );
  }
  const horizontalConnector = depth > 0 ? createElement("span", {
    "aria-hidden": "true",
    style: {
      display: "inline-block",
      width: `${Math.floor(indentPx / 2)}px`,
      height: "0",
      borderTop: `${lineWidth}px solid ${lineColor}`,
      flexShrink: "0",
      alignSelf: "center",
      marginLeft: `-${indentPx}px`
    }
  }) : null;
  const toggleIcon = !isLeaf ? createElement(
    "span",
    {
      "aria-hidden": "true",
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "18px",
        height: "18px",
        fontSize: "14px",
        lineHeight: "1",
        cursor: "pointer",
        userSelect: "none",
        flexShrink: "0",
        marginRight: "4px",
        fontFamily: "monospace"
      },
      onClick: (e) => {
        e.stopPropagation();
        onToggle(node);
      }
    },
    node.expanded ? iconExpanded : iconCollapsed
  ) : createElement("span", {
    "aria-hidden": "true",
    style: {
      display: "inline-block",
      width: "18px",
      flexShrink: "0",
      marginRight: "4px"
    }
  });
  const nodeContent = renderNode ? renderNode(node, isSelected) : createElement(
    "span",
    {
      style: {
        flex: "1",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    },
    node.icon ? createElement(
      "span",
      { style: { marginRight: "6px" } },
      node.icon
    ) : null,
    node.label
  );
  const itemStyle = buildNavItemStyle(nodeStyle, {
    hover: hoverState.hover,
    active: isSelected
  });
  return createElement(
    "div",
    {
      ref: rowRef,
      role: "treeitem",
      "aria-expanded": isLeaf ? void 0 : String(node.expanded),
      "aria-selected": isSelected ? "true" : "false",
      "aria-level": depth + 1,
      tabIndex: isFocused ? 0 : -1,
      style: {
        ...itemStyle,
        display: "flex",
        alignItems: "stretch",
        padding: "0"
      },
      onMouseEnter: hoverState.onMouseEnter,
      onMouseLeave: hoverState.onMouseLeave,
      onClick: () => onClick(node)
    },
    ...connectors,
    horizontalConnector,
    // Inner content area with padding from nodeStyle
    createElement(
      "span",
      {
        style: {
          display: "flex",
          alignItems: "center",
          flex: "1",
          padding: nodeStyle.padding ?? "6px 10px",
          minWidth: "0"
        }
      },
      toggleIcon,
      nodeContent
    )
  );
}
function TreeNav(props) {
  const {
    root: rootData,
    onNodeClick,
    onNodeExpand,
    onNodeCollapse,
    selectedId,
    expandAll: expandAllProp = false,
    lineColor = "#000",
    lineWidth = 1,
    indentPx = 20,
    iconExpanded = "\u2212",
    iconCollapsed = "+",
    nodeStyle = {},
    wrapperStyle,
    renderNode
  } = props;
  const [tree, setTree] = useState(() => {
    const t = TreeNode.fromData(rootData);
    if (expandAllProp) expandAllNodes(t);
    return t;
  });
  const [focusedId, setFocusedId] = useState(rootData.id);
  const visibleNodes = useMemo(() => flattenVisible(tree), [tree]);
  const forceUpdate = useCallback(() => {
    setTree((prev) => {
      const clone = Object.create(Object.getPrototypeOf(prev));
      Object.assign(clone, prev);
      return clone;
    });
  }, []);
  const handleToggle = useCallback(
    (node) => {
      node.toggle();
      if (node.expanded) {
        onNodeExpand?.(node);
      } else {
        onNodeCollapse?.(node);
      }
      forceUpdate();
    },
    [onNodeExpand, onNodeCollapse, forceUpdate]
  );
  const handleClick = useCallback(
    (node) => {
      setFocusedId(node.id);
      onNodeClick?.(node);
    },
    [onNodeClick]
  );
  const handleKeyDown = useCallback(
    (e) => {
      const ke = e;
      if (!focusedId) return;
      const currentIndex = visibleNodes.findIndex((n) => n.id === focusedId);
      if (currentIndex === -1) return;
      const currentNode = visibleNodes[currentIndex];
      switch (ke.key) {
        case "ArrowDown": {
          ke.preventDefault();
          const next = visibleNodes[currentIndex + 1];
          if (next) setFocusedId(next.id);
          break;
        }
        case "ArrowUp": {
          ke.preventDefault();
          const prev = visibleNodes[currentIndex - 1];
          if (prev) setFocusedId(prev.id);
          break;
        }
        case "ArrowRight": {
          ke.preventDefault();
          if (!currentNode.isLeaf()) {
            if (!currentNode.expanded) {
              handleToggle(currentNode);
            } else if (currentNode.children.length > 0) {
              setFocusedId(currentNode.children[0].id);
            }
          }
          break;
        }
        case "ArrowLeft": {
          ke.preventDefault();
          if (!currentNode.isLeaf() && currentNode.expanded) {
            handleToggle(currentNode);
          } else if (currentNode.parent) {
            setFocusedId(currentNode.parent.id);
          }
          break;
        }
        case "Enter": {
          ke.preventDefault();
          handleClick(currentNode);
          break;
        }
        case " ": {
          ke.preventDefault();
          if (!currentNode.isLeaf()) {
            handleToggle(currentNode);
          }
          break;
        }
        case "Home": {
          ke.preventDefault();
          if (visibleNodes.length > 0) setFocusedId(visibleNodes[0].id);
          break;
        }
        case "End": {
          ke.preventDefault();
          if (visibleNodes.length > 0)
            setFocusedId(visibleNodes[visibleNodes.length - 1].id);
          break;
        }
      }
    },
    [focusedId, visibleNodes, handleToggle, handleClick]
  );
  const rows = visibleNodes.map(
    (node) => createElement(TreeNodeRow, {
      key: node.id,
      node,
      isSelected: node.id === selectedId,
      indentPx,
      lineColor,
      lineWidth,
      iconExpanded,
      iconCollapsed,
      nodeStyle,
      renderNode,
      onToggle: handleToggle,
      onClick: handleClick,
      focusedId
    })
  );
  return createElement(
    NavWrapper,
    {
      role: "tree",
      ariaLabel: "Tree navigation",
      styling: wrapperStyle,
      keyboardNav: false
      // We handle keyboard nav ourselves
    },
    createElement(
      "div",
      {
        onKeyDown: handleKeyDown,
        style: { outline: "none" }
      },
      ...rows
    )
  );
}

// ../components/overlay/context-menu/src/ContextMenu.ts
function MenuList(props) {
  const { items, position, onClose, depth } = props;
  const [activeIndex, setActiveIndex] = useState(-1);
  const [submenuOpen, setSubmenuOpen] = useState(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuRef.current) return;
    menuRef.current.focus();
    const handler = (e) => {
      const ke = e;
      const actionableItems = items.map((item, i) => ({ item, i })).filter(
        ({ item }) => !item.divider
      );
      if (ke.key === "ArrowDown") {
        ke.preventDefault();
        setActiveIndex((prev) => {
          const currentIdx = actionableItems.findIndex(({ i }) => i === prev);
          const nextIdx = (currentIdx + 1) % actionableItems.length;
          return actionableItems[nextIdx].i;
        });
      } else if (ke.key === "ArrowUp") {
        ke.preventDefault();
        setActiveIndex((prev) => {
          const currentIdx = actionableItems.findIndex(({ i }) => i === prev);
          const nextIdx = currentIdx <= 0 ? actionableItems.length - 1 : currentIdx - 1;
          return actionableItems[nextIdx].i;
        });
      } else if (ke.key === "ArrowRight") {
        if (activeIndex >= 0 && items[activeIndex]?.children) {
          setSubmenuOpen(activeIndex);
        }
      } else if (ke.key === "ArrowLeft") {
        if (depth > 0) onClose();
      } else if (ke.key === "Enter") {
        ke.preventDefault();
        if (activeIndex >= 0) {
          const item = items[activeIndex];
          if (item.children) {
            setSubmenuOpen(activeIndex);
          } else if (!item.disabled && item.onClick) {
            item.onClick();
            onClose();
          }
        }
      } else if (ke.key === "Escape") {
        onClose();
      }
    };
    menuRef.current.addEventListener("keydown", handler);
    const el = menuRef.current;
    return () => el.removeEventListener("keydown", handler);
  }, [items, activeIndex, depth, onClose]);
  const menuStyle = {
    position: "fixed",
    left: `${position.x}px`,
    top: `${position.y}px`,
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
    padding: "4px 0",
    minWidth: "180px",
    zIndex: `${10200 + depth}`,
    outline: "none",
    overflow: "visible"
  };
  const menuElements = items.map((item, index) => {
    if (item.divider) {
      return createElement("div", {
        key: `divider-${index}`,
        style: {
          height: "1px",
          backgroundColor: "#e5e7eb",
          margin: "4px 0"
        }
      });
    }
    const isActive = activeIndex === index;
    const isDisabled = !!item.disabled;
    const hasChildren = !!(item.children && item.children.length > 0);
    const itemStyle = {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      fontSize: "14px",
      color: isDisabled ? "#9ca3af" : "#1f2937",
      cursor: isDisabled ? "default" : "pointer",
      backgroundColor: isActive && !isDisabled ? "#f3f4f6" : "transparent",
      userSelect: "none",
      position: "relative"
    };
    const handleMouseEnter = () => {
      setActiveIndex(index);
      if (hasChildren) {
        setSubmenuOpen(index);
      } else {
        setSubmenuOpen(null);
      }
    };
    const handleClick = () => {
      if (isDisabled) return;
      if (hasChildren) {
        setSubmenuOpen(index);
        return;
      }
      if (item.onClick) {
        item.onClick();
      }
      onClose();
    };
    const itemChildren = [];
    if (item.icon) {
      itemChildren.push(
        createElement("span", { style: { width: "20px", textAlign: "center", flexShrink: "0" } }, item.icon)
      );
    }
    itemChildren.push(
      createElement("span", { style: { flex: "1" } }, item.label ?? "")
    );
    if (hasChildren) {
      itemChildren.push(
        createElement("span", { style: { fontSize: "10px", color: "#9ca3af", marginLeft: "8px" } }, "\u25B6")
      );
    }
    const itemElements = [
      createElement(
        "div",
        {
          key: `item-${index}`,
          style: itemStyle,
          onMouseEnter: handleMouseEnter,
          onClick: handleClick,
          role: "menuitem",
          "aria-disabled": isDisabled ? "true" : void 0
        },
        ...itemChildren
      )
    ];
    if (hasChildren && submenuOpen === index) {
      itemElements.push(
        createElement(MenuList, {
          key: `submenu-${index}`,
          items: item.children,
          position: { x: position.x + 178, y: position.y + index * 36 },
          onClose: () => setSubmenuOpen(null),
          depth: depth + 1
        })
      );
    }
    return createElement("div", { key: `wrap-${index}`, style: { position: "relative" } }, ...itemElements);
  });
  return createElement(
    "div",
    {
      ref: menuRef,
      style: menuStyle,
      tabIndex: -1,
      role: "menu"
    },
    ...menuElements
  );
}
function ContextMenu(props) {
  const { items, children } = props;
  const [menuPos, setMenuPos] = useState(null);
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const me = e;
    setMenuPos({ x: me.clientX, y: me.clientY });
  }, []);
  const closeMenu = useCallback(() => {
    setMenuPos(null);
  }, []);
  useEffect(() => {
    if (!menuPos) return;
    const handler = (e) => {
      closeMenu();
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [menuPos, closeMenu]);
  useEffect(() => {
    if (!menuPos) return;
    const handler = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuPos, closeMenu]);
  const triggerStyle = {
    display: "contents"
  };
  const elements = [
    createElement("div", { onContextMenu: handleContextMenu, style: triggerStyle }, children)
  ];
  if (menuPos) {
    elements.push(
      createElement(MenuList, {
        items,
        position: menuPos,
        onClose: closeMenu,
        depth: 0
      })
    );
  }
  return createElement("div", null, ...elements);
}

// ../components/overlay/drawer/src/Drawer.ts
function getTransform(position, isOpen) {
  if (isOpen) return "translate3d(0, 0, 0)";
  switch (position) {
    case "left":
      return "translate3d(-100%, 0, 0)";
    case "right":
      return "translate3d(100%, 0, 0)";
    case "top":
      return "translate3d(0, -100%, 0)";
    case "bottom":
      return "translate3d(0, 100%, 0)";
  }
}
function getPanelPosition(position, size) {
  const base = {
    position: "fixed",
    zIndex: "10001",
    backgroundColor: "#fff",
    boxShadow: "0 0 24px rgba(0, 0, 0, 0.15)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  };
  switch (position) {
    case "left":
      return { ...base, top: "0", left: "0", bottom: "0", width: size };
    case "right":
      return { ...base, top: "0", right: "0", bottom: "0", width: size };
    case "top":
      return { ...base, top: "0", left: "0", right: "0", height: size };
    case "bottom":
      return { ...base, bottom: "0", left: "0", right: "0", height: size };
  }
}
function Drawer(props) {
  const {
    open,
    onClose,
    position = "right",
    size = "320px",
    title,
    overlay = true,
    closeOnOverlay = true,
    closeOnEscape = true,
    children
  } = props;
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const panelRef = useRef(null);
  const titleId = title ? "drawer-title" : void 0;
  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);
  if (!visible) return null;
  const overlayStyle = {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: "10000",
    opacity: animating ? "1" : "0",
    transition: "opacity 0.3s ease"
  };
  const panelStyle = {
    ...getPanelPosition(position, size),
    transform: getTransform(position, animating),
    transition: "transform 0.3s ease"
  };
  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
    flexShrink: "0"
  };
  const titleStyle = {
    margin: "0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827"
  };
  const closeButtonStyle = {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#6b7280",
    padding: "4px 8px",
    lineHeight: "1"
  };
  const bodyStyle = {
    padding: "20px",
    overflow: "auto",
    flex: "1"
  };
  const handleOverlayClick = () => {
    if (closeOnOverlay) onClose();
  };
  const panelChildren = [];
  if (title) {
    panelChildren.push(
      createElement(
        "div",
        { style: headerStyle },
        createElement("h3", { id: titleId, style: titleStyle }, title),
        createElement(
          "button",
          {
            type: "button",
            style: closeButtonStyle,
            onClick: onClose,
            "aria-label": "Close drawer"
          },
          "\xD7"
        )
      )
    );
  }
  panelChildren.push(createElement("div", { style: bodyStyle }, children));
  const elements = [];
  if (overlay) {
    elements.push(
      createElement("div", {
        style: overlayStyle,
        onClick: handleOverlayClick
      })
    );
  }
  elements.push(
    createElement(
      "div",
      {
        ref: panelRef,
        style: panelStyle,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        tabIndex: -1
      },
      ...panelChildren
    )
  );
  return createElement("div", null, ...elements);
}

// ../components/overlay/modal/src/Modal.ts
var sizeWidths = {
  sm: "400px",
  md: "600px",
  lg: "800px",
  full: "100vw"
};
function Modal(props) {
  const {
    open,
    onClose,
    title,
    size = "md",
    closeOnOverlay = true,
    closeOnEscape = true,
    footer,
    showCloseButton = true,
    children
  } = props;
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);
  if (!open) return null;
  const overlayStyle = {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "10000"
  };
  const dialogStyle = {
    backgroundColor: "#fff",
    borderRadius: size === "full" ? "0" : "8px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    maxHeight: size === "full" ? "100vh" : "90vh",
    width: sizeWidths[size],
    maxWidth: size === "full" ? "100vw" : "90vw",
    display: "flex",
    flexDirection: "column",
    outline: "none",
    overflow: "hidden"
  };
  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid #e5e7eb",
    flexShrink: "0"
  };
  const titleStyle = {
    margin: "0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827"
  };
  const closeButtonStyle = {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#6b7280",
    padding: "4px 8px",
    borderRadius: "4px",
    lineHeight: "1"
  };
  const bodyStyle = {
    padding: "24px",
    overflow: "auto",
    flex: "1"
  };
  const footerStyle = {
    padding: "16px 24px",
    borderTop: "1px solid #e5e7eb",
    flexShrink: "0"
  };
  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };
  const headerChildren = [];
  const titleId = title ? "modal-title" : void 0;
  if (title) {
    headerChildren.push(createElement("h2", { id: titleId, style: titleStyle }, title));
  } else {
    headerChildren.push(createElement("span", null));
  }
  if (showCloseButton) {
    headerChildren.push(
      createElement(
        "button",
        {
          type: "button",
          style: closeButtonStyle,
          onClick: onClose,
          "aria-label": "Close modal"
        },
        "\xD7"
      )
    );
  }
  const dialogChildren = [
    createElement("div", { style: headerStyle }, ...headerChildren),
    createElement("div", { style: bodyStyle }, children)
  ];
  if (footer) {
    dialogChildren.push(createElement("div", { style: footerStyle }, footer));
  }
  return createElement(
    "div",
    {
      style: overlayStyle,
      onClick: handleOverlayClick,
      "aria-modal": "true",
      role: "dialog",
      "aria-labelledby": titleId
    },
    createElement(
      "div",
      {
        ref: dialogRef,
        style: dialogStyle,
        tabIndex: -1,
        role: "document"
      },
      ...dialogChildren
    )
  );
}

// ../components/overlay/popover/src/Popover.ts
var ARROW_SIZE = 8;
function getPopoverPosition(placement, offset) {
  const total = offset + ARROW_SIZE;
  switch (placement) {
    case "top":
      return {
        position: "absolute",
        bottom: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginBottom: `${total}px`
      };
    case "bottom":
      return {
        position: "absolute",
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginTop: `${total}px`
      };
    case "left":
      return {
        position: "absolute",
        right: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        marginRight: `${total}px`
      };
    case "right":
      return {
        position: "absolute",
        left: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        marginLeft: `${total}px`
      };
  }
}
function getArrowStyle(placement) {
  const base = {
    position: "absolute",
    width: "0",
    height: "0",
    borderStyle: "solid"
  };
  const s = `${ARROW_SIZE}px`;
  const t = "transparent";
  switch (placement) {
    case "top":
      return {
        ...base,
        bottom: `-${s}`,
        left: "50%",
        transform: "translateX(-50%)",
        borderWidth: `${s} ${s} 0 ${s}`,
        borderColor: `#fff ${t} ${t} ${t}`
      };
    case "bottom":
      return {
        ...base,
        top: `-${s}`,
        left: "50%",
        transform: "translateX(-50%)",
        borderWidth: `0 ${s} ${s} ${s}`,
        borderColor: `${t} ${t} #fff ${t}`
      };
    case "left":
      return {
        ...base,
        right: `-${s}`,
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: `${s} 0 ${s} ${s}`,
        borderColor: `${t} ${t} ${t} #fff`
      };
    case "right":
      return {
        ...base,
        left: `-${s}`,
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: `${s} ${s} ${s} 0`,
        borderColor: `${t} #fff ${t} ${t}`
      };
  }
}
function Popover(props) {
  const {
    trigger,
    content,
    open: controlledOpen,
    placement = "bottom",
    offset = 4,
    arrow = false,
    closeOnClickOutside = true,
    onOpenChange
  } = props;
  const isControlled = controlledOpen !== void 0;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const containerRef = useRef(null);
  const toggleOpen = useCallback(() => {
    if (isControlled) {
      if (onOpenChange) onOpenChange(!controlledOpen);
    } else {
      setInternalOpen((prev) => !prev);
    }
  }, [isControlled, controlledOpen, onOpenChange]);
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (isControlled) {
          if (onOpenChange) onOpenChange(false);
        } else {
          setInternalOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, closeOnClickOutside, isControlled, onOpenChange]);
  const containerStyle3 = {
    position: "relative",
    display: "inline-block"
  };
  const popoverStyle = {
    ...getPopoverPosition(placement, offset),
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
    border: "1px solid #e5e7eb",
    padding: "12px 16px",
    zIndex: "10000",
    whiteSpace: "nowrap"
  };
  const popoverChildren = [content];
  if (arrow) {
    popoverChildren.push(createElement("div", { style: getArrowStyle(placement) }));
  }
  const handleTriggerKeyDown = useCallback((e) => {
    const key = e.key;
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      toggleOpen();
    }
  }, [toggleOpen]);
  const elements = [
    createElement("div", {
      onClick: toggleOpen,
      onKeyDown: handleTriggerKeyDown,
      role: "button",
      tabIndex: 0,
      style: { display: "inline-block" }
    }, trigger)
  ];
  if (isOpen) {
    elements.push(
      createElement("div", { style: popoverStyle }, ...popoverChildren)
    );
  }
  return createElement(
    "div",
    { ref: containerRef, style: containerStyle3 },
    ...elements
  );
}

// ../components/overlay/toast/src/Toast.ts
var idCounter2 = 0;
function generateId() {
  return `toast-${++idCounter2}-${Date.now()}`;
}
function createToaster(config = {}) {
  const resolvedConfig = {
    position: config.position ?? "top-right",
    maxToasts: config.maxToasts ?? 5,
    defaultDuration: config.defaultDuration ?? 4e3
  };
  let toasts = [];
  const listeners2 = /* @__PURE__ */ new Set();
  function notify() {
    listeners2.forEach((fn) => fn());
  }
  function toast(message, opts = {}) {
    const id = generateId();
    const item = {
      id,
      message,
      type: opts.type ?? "info",
      duration: opts.duration ?? resolvedConfig.defaultDuration,
      action: opts.action,
      createdAt: Date.now()
    };
    toasts = [item, ...toasts].slice(0, resolvedConfig.maxToasts);
    notify();
    return id;
  }
  function dismiss(id) {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }
  function dismissAll() {
    toasts = [];
    notify();
  }
  return {
    toast,
    dismiss,
    dismissAll,
    subscribe: (listener) => {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    getToasts: () => toasts,
    config: resolvedConfig
  };
}
var typeColors = {
  info: { bg: "#eff6ff", border: "#3b82f6", icon: "\u2139\uFE0F" },
  success: { bg: "#f0fdf4", border: "#22c55e", icon: "\u2705" },
  warning: { bg: "#fffbeb", border: "#f59e0b", icon: "\u26A0\uFE0F" },
  error: { bg: "#fef2f2", border: "#ef4444", icon: "\u274C" }
};
function getContainerPosition(pos) {
  const base = {
    position: "fixed",
    zIndex: "10100",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    pointerEvents: "none"
  };
  const isTop = pos.startsWith("top");
  const isBottom = pos.startsWith("bottom");
  const isLeft = pos.endsWith("left");
  const isRight = pos.endsWith("right");
  const isCenter = pos.endsWith("center");
  if (isTop) base.top = "0";
  if (isBottom) {
    base.bottom = "0";
    base.flexDirection = "column-reverse";
  }
  if (isLeft) base.left = "0";
  if (isRight) base.right = "0";
  if (isCenter) {
    base.left = "50%";
    base.transform = "translateX(-50%)";
  }
  return base;
}
function ToastItemView(props) {
  const { item, onDismiss } = props;
  const colors = typeColors[item.type];
  useEffect(() => {
    if (item.duration <= 0) return;
    const timer = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);
  const style = {
    backgroundColor: colors.bg,
    borderLeft: `4px solid ${colors.border}`,
    borderRadius: "6px",
    padding: "12px 16px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    pointerEvents: "auto",
    minWidth: "280px",
    maxWidth: "420px",
    animation: "specifyjs-toast-slide-in 0.3s ease forwards"
  };
  const messageStyle = {
    flex: "1",
    fontSize: "14px",
    color: "#1f2937",
    lineHeight: "1.4"
  };
  const closeStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#9ca3af",
    padding: "2px 6px",
    lineHeight: "1",
    flexShrink: "0"
  };
  const actionStyle = {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    color: colors.border,
    padding: "4px 10px",
    flexShrink: "0"
  };
  const children = [
    createElement("span", null, colors.icon),
    createElement("span", { style: messageStyle }, item.message)
  ];
  if (item.action) {
    children.push(
      createElement(
        "button",
        { type: "button", style: actionStyle, onClick: item.action.onClick },
        item.action.label
      )
    );
  }
  children.push(
    createElement(
      "button",
      {
        type: "button",
        style: closeStyle,
        onClick: () => onDismiss(item.id),
        "aria-label": "Dismiss toast"
      },
      "\xD7"
    )
  );
  return createElement("div", { style, role: "alert" }, ...children);
}
function ToastContainer(props) {
  const { toaster } = props;
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return toaster.subscribe(() => forceUpdate((n) => n + 1));
  }, [toaster]);
  const toasts = toaster.getToasts();
  if (toasts.length === 0) return null;
  const containerStyle3 = getContainerPosition(toaster.config.position);
  useEffect(() => {
    const styleId = "specifyjs-toast-keyframes";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes specifyjs-toast-slide-in {
        from { opacity: 0; transform: translateY(-12px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);
  const dismiss = useCallback((id) => toaster.dismiss(id), [toaster]);
  const toastElements = toasts.map(
    (item) => createElement(ToastItemView, { key: item.id, item, onDismiss: dismiss })
  );
  return createElement("div", { style: containerStyle3 }, ...toastElements);
}
function useToast(config = {}) {
  const toasterRef = useRef(null);
  if (!toasterRef.current) {
    toasterRef.current = createToaster(config);
  }
  const toaster = toasterRef.current;
  const ToastContainerComponent = useCallback(
    () => createElement(ToastContainer, { toaster }),
    [toaster]
  );
  return {
    toast: toaster.toast,
    dismiss: toaster.dismiss,
    dismissAll: toaster.dismissAll,
    ToastContainer: ToastContainerComponent
  };
}

// ../components/overlay/tooltip/src/Tooltip.ts
var ARROW_SIZE2 = 6;
var TOOLTIP_GAP = 8;
function computeTooltipPosition(triggerRect, placement) {
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const gap = TOOLTIP_GAP;
  switch (placement) {
    case "top":
      return {
        position: "fixed",
        left: `${triggerRect.left + triggerRect.width / 2}px`,
        top: `${triggerRect.top - gap}px`,
        transform: "translate(-50%, -100%)"
      };
    case "bottom":
      return {
        position: "fixed",
        left: `${triggerRect.left + triggerRect.width / 2}px`,
        top: `${triggerRect.bottom + gap}px`,
        transform: "translateX(-50%)"
      };
    case "left":
      return {
        position: "fixed",
        left: `${triggerRect.left - gap}px`,
        top: `${triggerRect.top + triggerRect.height / 2}px`,
        transform: "translate(-100%, -50%)"
      };
    case "right":
      return {
        position: "fixed",
        left: `${triggerRect.right + gap}px`,
        top: `${triggerRect.top + triggerRect.height / 2}px`,
        transform: "translateY(-50%)"
      };
  }
}
function getArrowStyle2(placement) {
  const base = {
    position: "absolute",
    width: "0",
    height: "0",
    borderStyle: "solid"
  };
  const s = `${ARROW_SIZE2}px`;
  const t = "transparent";
  const c = "#1f2937";
  switch (placement) {
    case "top":
      return {
        ...base,
        bottom: `-${s}`,
        left: "50%",
        transform: "translateX(-50%)",
        borderWidth: `${s} ${s} 0 ${s}`,
        borderColor: `${c} ${t} ${t} ${t}`
      };
    case "bottom":
      return {
        ...base,
        top: `-${s}`,
        left: "50%",
        transform: "translateX(-50%)",
        borderWidth: `0 ${s} ${s} ${s}`,
        borderColor: `${t} ${t} ${c} ${t}`
      };
    case "left":
      return {
        ...base,
        right: `-${s}`,
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: `${s} 0 ${s} ${s}`,
        borderColor: `${t} ${t} ${t} ${c}`
      };
    case "right":
      return {
        ...base,
        left: `-${s}`,
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: `${s} ${s} ${s} 0`,
        borderColor: `${t} ${c} ${t} ${t}`
      };
  }
}
function Tooltip(props) {
  const {
    text,
    placement = "top",
    delay = 200,
    maxWidth = "250px",
    children
  } = props;
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const timerRef = useRef(null);
  const tooltipId = `tooltip-${Math.random().toString(36).slice(2, 9)}`;
  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition(computeTooltipPosition(rect, placement));
      }
      setVisible(true);
    }, delay);
  }, [delay, placement]);
  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  const triggerStyle = {
    display: "inline-block"
  };
  const tooltipStyle = {
    ...position ?? {},
    backgroundColor: "#1f2937",
    color: "#fff",
    fontSize: "13px",
    lineHeight: "1.4",
    padding: "6px 10px",
    borderRadius: "6px",
    maxWidth,
    zIndex: "10002",
    pointerEvents: "none",
    whiteSpace: "normal",
    wordWrap: "break-word"
  };
  const elements = [
    createElement(
      "div",
      {
        ref: triggerRef,
        style: triggerStyle,
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
        "aria-describedby": visible ? tooltipId : void 0
      },
      children
    )
  ];
  if (visible && position) {
    elements.push(
      createElement(
        "div",
        { id: tooltipId, style: tooltipStyle, role: "tooltip" },
        text,
        createElement("div", { style: getArrowStyle2(placement) })
      )
    );
  }
  return createElement("div", { style: { display: "inline-block", position: "relative" } }, ...elements);
}

// ../components/viz/2D-bar-graph/src/BarGraph.ts
function useBarGraphScales(count, maxValue, axisLength, categoryAxisLength, barGap) {
  return useMemo(() => {
    const barThickness = Math.max(1, (categoryAxisLength - barGap * (count + 1)) / count);
    const valueScale = (v) => {
      if (maxValue === 0) return 0;
      return v / maxValue * axisLength;
    };
    const categoryScale = (i) => {
      return barGap + i * (barThickness + barGap);
    };
    return {
      valueScale,
      categoryScale,
      barThickness,
      maxValue,
      valueAxisLength: axisLength,
      categoryAxisLength
    };
  }, [count, maxValue, axisLength, categoryAxisLength, barGap]);
}
function computeMaxValue(data, stacked, grouped) {
  if (stacked && stacked.length > 0) {
    if (grouped) {
      let m3 = 0;
      for (const item of stacked) {
        for (const v of item.values) {
          if (v.value > m3) m3 = v.value;
        }
      }
      return m3;
    }
    let m2 = 0;
    for (const item of stacked) {
      let sum = 0;
      for (const v of item.values) {
        sum += v.value;
      }
      if (sum > m2) m2 = sum;
    }
    return m2;
  }
  let m = 0;
  for (const d of data) {
    if (d.value > m) m = d.value;
  }
  return m;
}
function niceStep(maxVal) {
  if (maxVal <= 0) return 1;
  const rough = maxVal / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  if (residual <= 1.5) return mag;
  if (residual <= 3.5) return 2 * mag;
  if (residual <= 7.5) return 5 * mag;
  return 10 * mag;
}
function collectCategories(stacked) {
  const set = /* @__PURE__ */ new Set();
  for (const item of stacked) {
    for (const v of item.values) {
      set.add(v.category);
    }
  }
  return Array.from(set);
}
var CATEGORY_PALETTE = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16"
];
function categoryColor(index, explicit) {
  if (explicit) return explicit;
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}
function BarGraph(props) {
  const {
    data = [],
    width = 600,
    height = 400,
    orientation = "vertical",
    barColor = "#3b82f6",
    barGap = 8,
    barRadius = 4,
    showValues = true,
    showGrid = true,
    gridColor = "#e5e7eb",
    title,
    padding = 50,
    animate = false,
    stacked,
    grouped = false
  } = props;
  const isVertical = orientation === "vertical";
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const valueAxisLength = isVertical ? chartHeight : chartWidth;
  const categoryAxisLength = isVertical ? chartWidth : chartHeight;
  const useStacked = stacked !== void 0 && stacked.length > 0;
  const categories = useMemo(
    () => useStacked ? collectCategories(stacked) : [],
    [useStacked, stacked]
  );
  const itemCount = useStacked ? stacked.length : data.length;
  const maxValue = useMemo(
    () => computeMaxValue(data, stacked, grouped),
    [data, stacked, grouped]
  );
  const effectiveMax = maxValue > 0 ? maxValue : 1;
  const scales = useBarGraphScales(
    itemCount,
    effectiveMax,
    valueAxisLength,
    categoryAxisLength,
    barGap
  );
  const buildGridLines = useCallback(() => {
    if (!showGrid) return [];
    const step = niceStep(effectiveMax);
    const lines = [];
    for (let v = step; v <= effectiveMax; v += step) {
      const pos = scales.valueScale(v);
      if (isVertical) {
        const y = padding + chartHeight - pos;
        lines.push(
          createElement("line", {
            key: `grid-${v}`,
            x1: String(padding),
            y1: String(y),
            x2: String(padding + chartWidth),
            y2: String(y),
            stroke: gridColor,
            "stroke-width": "1",
            "stroke-dasharray": "4 2"
          })
        );
        lines.push(
          createElement(
            "text",
            {
              key: `grid-label-${v}`,
              x: String(padding - 6),
              y: String(y + 4),
              "text-anchor": "end",
              "font-size": "11",
              "font-family": "sans-serif",
              fill: "#6b7280"
            },
            String(v)
          )
        );
      } else {
        const x = padding + pos;
        lines.push(
          createElement("line", {
            key: `grid-${v}`,
            x1: String(x),
            y1: String(padding),
            x2: String(x),
            y2: String(padding + chartHeight),
            stroke: gridColor,
            "stroke-width": "1",
            "stroke-dasharray": "4 2"
          })
        );
        lines.push(
          createElement(
            "text",
            {
              key: `grid-label-${v}`,
              x: String(x),
              y: String(padding + chartHeight + 16),
              "text-anchor": "middle",
              "font-size": "11",
              "font-family": "sans-serif",
              fill: "#6b7280"
            },
            String(v)
          )
        );
      }
    }
    return lines;
  }, [showGrid, effectiveMax, scales, isVertical, padding, chartWidth, chartHeight, gridColor]);
  const buildAxes = useCallback(() => {
    const elements = [];
    if (isVertical) {
      elements.push(
        createElement("line", {
          key: "axis-y",
          x1: String(padding),
          y1: String(padding),
          x2: String(padding),
          y2: String(padding + chartHeight),
          stroke: "#374151",
          "stroke-width": "1.5"
        })
      );
      elements.push(
        createElement("line", {
          key: "axis-x",
          x1: String(padding),
          y1: String(padding + chartHeight),
          x2: String(padding + chartWidth),
          y2: String(padding + chartHeight),
          stroke: "#374151",
          "stroke-width": "1.5"
        })
      );
    } else {
      elements.push(
        createElement("line", {
          key: "axis-x",
          x1: String(padding),
          y1: String(padding + chartHeight),
          x2: String(padding + chartWidth),
          y2: String(padding + chartHeight),
          stroke: "#374151",
          "stroke-width": "1.5"
        })
      );
      elements.push(
        createElement("line", {
          key: "axis-y",
          x1: String(padding),
          y1: String(padding),
          x2: String(padding),
          y2: String(padding + chartHeight),
          stroke: "#374151",
          "stroke-width": "1.5"
        })
      );
    }
    return elements;
  }, [isVertical, padding, chartWidth, chartHeight]);
  const buildSimpleBars = useCallback(() => {
    const elements = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const barLen = scales.valueScale(d.value);
      const catPos = scales.categoryScale(i);
      const fill = d.color ?? barColor;
      let rectProps;
      let labelProps;
      let labelText = String(d.value);
      if (isVertical) {
        const x = padding + catPos;
        const y = padding + chartHeight - barLen;
        rectProps = {
          x: String(x),
          y: String(y),
          width: String(scales.barThickness),
          height: String(barLen),
          rx: String(barRadius),
          ry: String(barRadius),
          fill
        };
        labelProps = {
          x: String(x + scales.barThickness / 2),
          y: String(y - 6),
          "text-anchor": "middle",
          "font-size": "11",
          "font-family": "sans-serif",
          fill: "#374151"
        };
      } else {
        const y = padding + catPos;
        const x = padding;
        rectProps = {
          x: String(x),
          y: String(y),
          width: String(barLen),
          height: String(scales.barThickness),
          rx: String(barRadius),
          ry: String(barRadius),
          fill
        };
        labelProps = {
          x: String(x + barLen + 6),
          y: String(y + scales.barThickness / 2 + 4),
          "text-anchor": "start",
          "font-size": "11",
          "font-family": "sans-serif",
          fill: "#374151"
        };
      }
      if (animate) {
        rectProps.style = isVertical ? `animation: barGrow 0.6s ease-out ${i * 0.05}s both` : `animation: barGrow 0.6s ease-out ${i * 0.05}s both`;
      }
      elements.push(
        createElement("rect", { key: `bar-${i}`, ...rectProps })
      );
      if (showValues) {
        elements.push(
          createElement("text", { key: `val-${i}`, ...labelProps }, labelText)
        );
      }
      if (isVertical) {
        elements.push(
          createElement(
            "text",
            {
              key: `cat-${i}`,
              x: String(padding + catPos + scales.barThickness / 2),
              y: String(padding + chartHeight + 16),
              "text-anchor": "middle",
              "font-size": "11",
              "font-family": "sans-serif",
              fill: "#374151"
            },
            d.label
          )
        );
      } else {
        elements.push(
          createElement(
            "text",
            {
              key: `cat-${i}`,
              x: String(padding - 6),
              y: String(padding + catPos + scales.barThickness / 2 + 4),
              "text-anchor": "end",
              "font-size": "11",
              "font-family": "sans-serif",
              fill: "#374151"
            },
            d.label
          )
        );
      }
    }
    return elements;
  }, [data, scales, barColor, barRadius, showValues, animate, isVertical, padding, chartHeight]);
  const buildStackedBars = useCallback(() => {
    if (!stacked) return [];
    const elements = [];
    for (let i = 0; i < stacked.length; i++) {
      const item = stacked[i];
      const catPos = scales.categoryScale(i);
      let cumulative = 0;
      for (let j = 0; j < item.values.length; j++) {
        const seg = item.values[j];
        const segLen = scales.valueScale(seg.value);
        const offset = scales.valueScale(cumulative);
        const fill = categoryColor(j, seg.color);
        if (isVertical) {
          const x = padding + catPos;
          const y = padding + chartHeight - offset - segLen;
          elements.push(
            createElement("rect", {
              key: `sbar-${i}-${j}`,
              x: String(x),
              y: String(y),
              width: String(scales.barThickness),
              height: String(segLen),
              rx: j === item.values.length - 1 ? String(barRadius) : "0",
              ry: j === item.values.length - 1 ? String(barRadius) : "0",
              fill,
              ...animate ? { style: `animation: barGrow 0.6s ease-out ${(i * item.values.length + j) * 0.03}s both` } : {}
            })
          );
          if (showValues && segLen > 14) {
            elements.push(
              createElement(
                "text",
                {
                  key: `sval-${i}-${j}`,
                  x: String(x + scales.barThickness / 2),
                  y: String(y + segLen / 2 + 4),
                  "text-anchor": "middle",
                  "font-size": "10",
                  "font-family": "sans-serif",
                  fill: "#fff"
                },
                String(seg.value)
              )
            );
          }
        } else {
          const x = padding + offset;
          const y = padding + catPos;
          elements.push(
            createElement("rect", {
              key: `sbar-${i}-${j}`,
              x: String(x),
              y: String(y),
              width: String(segLen),
              height: String(scales.barThickness),
              rx: j === item.values.length - 1 ? String(barRadius) : "0",
              ry: j === item.values.length - 1 ? String(barRadius) : "0",
              fill,
              ...animate ? { style: `animation: barGrow 0.6s ease-out ${(i * item.values.length + j) * 0.03}s both` } : {}
            })
          );
          if (showValues && segLen > 20) {
            elements.push(
              createElement(
                "text",
                {
                  key: `sval-${i}-${j}`,
                  x: String(x + segLen / 2),
                  y: String(y + scales.barThickness / 2 + 4),
                  "text-anchor": "middle",
                  "font-size": "10",
                  "font-family": "sans-serif",
                  fill: "#fff"
                },
                String(seg.value)
              )
            );
          }
        }
        cumulative += seg.value;
      }
      if (showValues) {
        const totalLen = scales.valueScale(cumulative);
        if (isVertical) {
          elements.push(
            createElement(
              "text",
              {
                key: `stotal-${i}`,
                x: String(padding + catPos + scales.barThickness / 2),
                y: String(padding + chartHeight - totalLen - 6),
                "text-anchor": "middle",
                "font-size": "11",
                "font-family": "sans-serif",
                fill: "#374151"
              },
              String(cumulative)
            )
          );
        } else {
          elements.push(
            createElement(
              "text",
              {
                key: `stotal-${i}`,
                x: String(padding + totalLen + 6),
                y: String(padding + catPos + scales.barThickness / 2 + 4),
                "text-anchor": "start",
                "font-size": "11",
                "font-family": "sans-serif",
                fill: "#374151"
              },
              String(cumulative)
            )
          );
        }
      }
      if (isVertical) {
        elements.push(
          createElement(
            "text",
            {
              key: `scat-${i}`,
              x: String(padding + catPos + scales.barThickness / 2),
              y: String(padding + chartHeight + 16),
              "text-anchor": "middle",
              "font-size": "11",
              "font-family": "sans-serif",
              fill: "#374151"
            },
            item.label
          )
        );
      } else {
        elements.push(
          createElement(
            "text",
            {
              key: `scat-${i}`,
              x: String(padding - 6),
              y: String(padding + catPos + scales.barThickness / 2 + 4),
              "text-anchor": "end",
              "font-size": "11",
              "font-family": "sans-serif",
              fill: "#374151"
            },
            item.label
          )
        );
      }
    }
    return elements;
  }, [stacked, scales, barRadius, showValues, animate, isVertical, padding, chartHeight]);
  const buildGroupedBars = useCallback(() => {
    if (!stacked) return [];
    const numCategories = categories.length;
    const elements = [];
    for (let i = 0; i < stacked.length; i++) {
      const item = stacked[i];
      const catPos = scales.categoryScale(i);
      const subBarGap = 2;
      const subBarThickness = Math.max(
        1,
        (scales.barThickness - subBarGap * (numCategories - 1)) / numCategories
      );
      for (let j = 0; j < item.values.length; j++) {
        const seg = item.values[j];
        const catIndex = categories.indexOf(seg.category);
        const subOffset = catIndex * (subBarThickness + subBarGap);
        const barLen = scales.valueScale(seg.value);
        const fill = categoryColor(catIndex >= 0 ? catIndex : j, seg.color);
        if (isVertical) {
          const x = padding + catPos + subOffset;
          const y = padding + chartHeight - barLen;
          elements.push(
            createElement("rect", {
              key: `gbar-${i}-${j}`,
              x: String(x),
              y: String(y),
              width: String(subBarThickness),
              height: String(barLen),
              rx: String(barRadius),
              ry: String(barRadius),
              fill,
              ...animate ? { style: `animation: barGrow 0.6s ease-out ${(i * numCategories + j) * 0.04}s both` } : {}
            })
          );
          if (showValues) {
            elements.push(
              createElement(
                "text",
                {
                  key: `gval-${i}-${j}`,
                  x: String(x + subBarThickness / 2),
                  y: String(y - 4),
                  "text-anchor": "middle",
                  "font-size": "9",
                  "font-family": "sans-serif",
                  fill: "#374151"
                },
                String(seg.value)
              )
            );
          }
        } else {
          const x = padding;
          const y = padding + catPos + subOffset;
          elements.push(
            createElement("rect", {
              key: `gbar-${i}-${j}`,
              x: String(x),
              y: String(y),
              width: String(barLen),
              height: String(subBarThickness),
              rx: String(barRadius),
              ry: String(barRadius),
              fill,
              ...animate ? { style: `animation: barGrow 0.6s ease-out ${(i * numCategories + j) * 0.04}s both` } : {}
            })
          );
          if (showValues) {
            elements.push(
              createElement(
                "text",
                {
                  key: `gval-${i}-${j}`,
                  x: String(x + barLen + 4),
                  y: String(y + subBarThickness / 2 + 3),
                  "text-anchor": "start",
                  "font-size": "9",
                  "font-family": "sans-serif",
                  fill: "#374151"
                },
                String(seg.value)
              )
            );
          }
        }
      }
      if (isVertical) {
        elements.push(
          createElement(
            "text",
            {
              key: `gcat-${i}`,
              x: String(padding + catPos + scales.barThickness / 2),
              y: String(padding + chartHeight + 16),
              "text-anchor": "middle",
              "font-size": "11",
              "font-family": "sans-serif",
              fill: "#374151"
            },
            item.label
          )
        );
      } else {
        elements.push(
          createElement(
            "text",
            {
              key: `gcat-${i}`,
              x: String(padding - 6),
              y: String(padding + catPos + scales.barThickness / 2 + 4),
              "text-anchor": "end",
              "font-size": "11",
              "font-family": "sans-serif",
              fill: "#374151"
            },
            item.label
          )
        );
      }
    }
    return elements;
  }, [stacked, categories, scales, barRadius, showValues, animate, isVertical, padding, chartHeight]);
  const buildTitle = useCallback(() => {
    if (!title) return [];
    return [
      createElement(
        "text",
        {
          key: "title",
          x: String(width / 2),
          y: String(padding / 2 + 4),
          "text-anchor": "middle",
          "font-size": "16",
          "font-weight": "bold",
          "font-family": "sans-serif",
          fill: "#111827"
        },
        title
      )
    ];
  }, [title, width, padding]);
  const buildAnimationDefs = useCallback(() => {
    if (!animate) return [];
    return [
      createElement(
        "defs",
        { key: "anim-defs" },
        createElement(
          "style",
          { key: "anim-style" },
          isVertical ? "@keyframes barGrow { from { transform: scaleY(0); transform-origin: bottom; } to { transform: scaleY(1); transform-origin: bottom; } }" : "@keyframes barGrow { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); transform-origin: left; } }"
        )
      )
    ];
  }, [animate, isVertical]);
  const gridLines = buildGridLines();
  const axes = buildAxes();
  const titleEl = buildTitle();
  const animDefs = buildAnimationDefs();
  let bars;
  if (useStacked && grouped) {
    bars = buildGroupedBars();
  } else if (useStacked) {
    bars = buildStackedBars();
  } else {
    bars = buildSimpleBars();
  }
  return createElement(
    "svg",
    {
      width: "100%",
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "xMidYMid meet",
      xmlns: "http://www.w3.org/2000/svg",
      style: { fontFamily: "sans-serif" }
    },
    ...animDefs,
    ...titleEl,
    ...gridLines,
    ...axes,
    ...bars
  );
}

// src/shared/async-compute.ts
function generateInputs(range2) {
  const { start, end, step } = range2;
  if (step <= 0 || !isFinite(step)) return [];
  const count = Math.ceil((end - start) / step) + 1;
  if (count > 1e6) return [];
  const inputs = [];
  for (let i = 0; i < count; i++) {
    const x = start + i * step;
    if (x > end + step * 1e-3) break;
    inputs.push(x);
  }
  return inputs;
}
function computeSync(fn, inputs) {
  const results = [];
  for (let i = 0; i < inputs.length; i++) {
    const x = inputs[i];
    const y = fn(x);
    if (isFinite(y)) {
      results.push({ input: x, output: y });
    }
  }
  return results;
}
function computeAsync(fn, inputs, batchSize, onProgress) {
  let cancelled = false;
  let cursor = 0;
  const results = [];
  const processBatch = () => {
    if (cancelled) return;
    const end = Math.min(cursor + batchSize, inputs.length);
    for (let i = cursor; i < end; i++) {
      const x = inputs[i];
      const y = fn(x);
      if (isFinite(y)) {
        results.push({ input: x, output: y });
      }
    }
    cursor = end;
    if (cursor >= inputs.length) {
      onProgress(results, true);
      return;
    }
    onProgress(results, false);
    scheduleNextBatch(processBatch);
  };
  scheduleNextBatch(processBatch);
  return () => {
    cancelled = true;
  };
}
function scheduleNextBatch(fn) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => fn(), { timeout: 16 });
  } else {
    setTimeout(fn, 0);
  }
}

// ../components/viz/2D-cartesian-raw/src/CartesianGraph2D.ts
function niceStep2(range2, count) {
  const raw = range2 / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * mag;
}
function generateTicks(min, max) {
  const range2 = max - min;
  if (range2 <= 0) return [min];
  const step = niceStep2(range2, 8);
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 1e-3; v += step) {
    ticks.push(Math.round(v * 1e10) / 1e10);
  }
  return ticks;
}
function formatTick(n) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
var PADDING = 40;
var ZOOM_FACTOR = 1.1;
var MIN_RANGE = 0.01;
var MAX_RANGE = 1e6;
function CartesianGraph2D(props) {
  const {
    width = 400,
    height = 300,
    points = [],
    plotFunction,
    plotResolution = 200,
    xStep,
    sync: syncMode = false,
    xRange: initXRange = [-5, 5],
    yRange: initYRange = [-5, 5],
    showGrid = true,
    showAxes = true,
    pointRadius = 3,
    pointColor = "#3b82f6",
    curveColor = "#3b82f6",
    gridColor = "#e2e8f0",
    axisColor = "#94a3b8",
    onPointClick,
    onPointDoubleClick,
    onPointContextMenu,
    onPointHover
  } = props;
  const [xMin, setXMin] = useState(initXRange[0]);
  const [xMax, setXMax] = useState(initXRange[1]);
  const [yMin, setYMin] = useState(initYRange[0]);
  const [yMax, setYMax] = useState(initYRange[1]);
  const dragging = useRef(false);
  const dragStart = useRef(null);
  const toSvgX = useCallback(
    (wx) => PADDING + (wx - xMin) / (xMax - xMin) * (width - 2 * PADDING),
    [xMin, xMax, width]
  );
  const toSvgY = useCallback(
    (wy) => height - PADDING - (wy - yMin) / (yMax - yMin) * (height - 2 * PADDING),
    [yMin, yMax, height]
  );
  const toWorldX = useCallback(
    (sx) => xMin + (sx - PADDING) / (width - 2 * PADDING) * (xMax - xMin),
    [xMin, xMax, width]
  );
  const toWorldY = useCallback(
    (sy) => yMin + (height - PADDING - sy) / (height - 2 * PADDING) * (yMax - yMin),
    [yMin, yMax, height]
  );
  const onMouseDown = useCallback(
    (e) => {
      const me = e;
      dragging.current = true;
      dragStart.current = {
        mx: me.clientX,
        my: me.clientY,
        x0: xMin,
        x1: xMax,
        y0: yMin,
        y1: yMax
      };
    },
    [xMin, xMax, yMin, yMax]
  );
  const onMouseMove = useCallback(
    (e) => {
      if (!dragging.current || !dragStart.current) return;
      const me = e;
      const ds = dragStart.current;
      const dxPx = me.clientX - ds.mx;
      const dyPx = me.clientY - ds.my;
      const dxWorld = dxPx / (width - 2 * PADDING) * (ds.x1 - ds.x0);
      const dyWorld = dyPx / (height - 2 * PADDING) * (ds.y1 - ds.y0);
      setXMin(ds.x0 - dxWorld);
      setXMax(ds.x1 - dxWorld);
      setYMin(ds.y0 + dyWorld);
      setYMax(ds.y1 + dyWorld);
    },
    [width, height]
  );
  const onMouseUp = useCallback(() => {
    dragging.current = false;
    dragStart.current = null;
  }, []);
  const onWheel = useCallback(
    (e) => {
      const we = e;
      we.preventDefault();
      const rect = we.currentTarget.getBoundingClientRect();
      const sx = we.clientX - rect.left;
      const sy = we.clientY - rect.top;
      const wx = toWorldX(sx);
      const wy = toWorldY(sy);
      const factor = we.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const newXRange = (xMax - xMin) * factor;
      const newYRange = (yMax - yMin) * factor;
      if (newXRange < MIN_RANGE || newYRange < MIN_RANGE || newXRange > MAX_RANGE || newYRange > MAX_RANGE)
        return;
      const rx = (wx - xMin) / (xMax - xMin);
      const ry = (wy - yMin) / (yMax - yMin);
      setXMin(wx - rx * newXRange);
      setXMax(wx + (1 - rx) * newXRange);
      setYMin(wy - ry * newYRange);
      setYMax(wy + (1 - ry) * newYRange);
    },
    [xMin, xMax, yMin, yMax, toWorldX, toWorldY]
  );
  const children = [];
  children.push(
    createElement("rect", {
      x: 0,
      y: 0,
      width,
      height,
      fill: "white",
      key: "bg"
    })
  );
  if (showGrid) {
    const xTicks = generateTicks(xMin, xMax);
    const yTicks = generateTicks(yMin, yMax);
    for (let i = 0; i < xTicks.length; i++) {
      const sx = toSvgX(xTicks[i]);
      children.push(
        createElement("line", {
          x1: sx,
          y1: PADDING,
          x2: sx,
          y2: height - PADDING,
          stroke: gridColor,
          "stroke-width": 0.5,
          key: `gx-${i}`
        })
      );
      children.push(
        createElement(
          "text",
          {
            x: sx,
            y: height - PADDING + 14,
            "text-anchor": "middle",
            "font-size": 10,
            fill: axisColor,
            key: `lx-${i}`
          },
          formatTick(xTicks[i])
        )
      );
    }
    for (let i = 0; i < yTicks.length; i++) {
      const sy = toSvgY(yTicks[i]);
      children.push(
        createElement("line", {
          x1: PADDING,
          y1: sy,
          x2: width - PADDING,
          y2: sy,
          stroke: gridColor,
          "stroke-width": 0.5,
          key: `gy-${i}`
        })
      );
      children.push(
        createElement(
          "text",
          {
            x: PADDING - 6,
            y: sy + 3,
            "text-anchor": "end",
            "font-size": 10,
            fill: axisColor,
            key: `ly-${i}`
          },
          formatTick(yTicks[i])
        )
      );
    }
  }
  if (showAxes) {
    const originX = Math.max(PADDING, Math.min(width - PADDING, toSvgX(0)));
    const originY = Math.max(PADDING, Math.min(height - PADDING, toSvgY(0)));
    children.push(
      createElement("line", {
        x1: PADDING,
        y1: originY,
        x2: width - PADDING,
        y2: originY,
        stroke: axisColor,
        "stroke-width": 1,
        key: "x-axis"
      })
    );
    children.push(
      createElement("line", {
        x1: originX,
        y1: PADDING,
        x2: originX,
        y2: height - PADDING,
        stroke: axisColor,
        "stroke-width": 1,
        key: "y-axis"
      })
    );
  }
  const syncCurvePoints = useMemo(() => {
    if (!plotFunction || !syncMode) return [];
    const effectiveStep = xStep ?? (xMax - xMin) / plotResolution;
    const inputs = generateInputs({
      start: xMin,
      end: xMax,
      step: effectiveStep
    });
    return computeSync(plotFunction, inputs);
  }, [plotFunction, xMin, xMax, xStep, plotResolution, syncMode]);
  const [asyncCurvePoints, setAsyncCurvePoints] = useState([]);
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!plotFunction || syncMode) {
      setAsyncCurvePoints([]);
      return;
    }
    const effectiveStep = xStep ?? (xMax - xMin) / plotResolution;
    const inputs = generateInputs({
      start: xMin,
      end: xMax,
      step: effectiveStep
    });
    if (cancelRef.current) cancelRef.current();
    cancelRef.current = computeAsync(
      plotFunction,
      inputs,
      200,
      (results) => {
        setAsyncCurvePoints([...results]);
      }
    );
    return () => {
      if (cancelRef.current) cancelRef.current();
    };
  }, [plotFunction, xMin, xMax, xStep, plotResolution, syncMode]);
  const curveData = syncMode ? syncCurvePoints : asyncCurvePoints;
  if (curveData.length > 0) {
    const segments = [];
    for (let i = 0; i < curveData.length; i++) {
      const pt = curveData[i];
      const sx = toSvgX(pt.input);
      const sy = toSvgY(pt.output);
      segments.push(`${segments.length === 0 ? "M" : "L"}${sx},${sy}`);
    }
    children.push(
      createElement("path", {
        d: segments.join(" "),
        fill: "none",
        stroke: curveColor,
        "stroke-width": 1.5,
        key: "curve"
      })
    );
  }
  const makeHandler = (type, handler, idx, pt) => {
    if (!handler) return void 0;
    return (e) => handler({ x: pt.x, y: pt.y, index: idx, event: e });
  };
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const cx = toSvgX(pt.x);
    const cy = toSvgY(pt.y);
    const circleProps = {
      cx,
      cy,
      r: pointRadius,
      fill: pointColor,
      cursor: "pointer",
      key: `pt-${i}`
    };
    if (onPointClick)
      circleProps.onClick = makeHandler("click", onPointClick, i, pt);
    if (onPointDoubleClick)
      circleProps.onDblClick = makeHandler(
        "dblclick",
        onPointDoubleClick,
        i,
        pt
      );
    if (onPointContextMenu)
      circleProps.onContextMenu = makeHandler(
        "contextmenu",
        onPointContextMenu,
        i,
        pt
      );
    if (onPointHover)
      circleProps.onMouseOver = makeHandler("mouseover", onPointHover, i, pt);
    children.push(createElement("circle", circleProps));
  }
  const defs = createElement(
    "defs",
    { key: "defs" },
    createElement(
      "clipPath",
      { id: "plot-clip" },
      createElement("rect", {
        x: PADDING,
        y: PADDING,
        width: width - 2 * PADDING,
        height: height - 2 * PADDING
      })
    )
  );
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "100%",
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "xMidYMid meet",
      style: "user-select: none; touch-action: none;",
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave: onMouseUp,
      onWheel
    },
    defs,
    ...children
  );
}

// ../components/viz/2D-complex-graph/src/ComplexGraph2D.ts
function mandelbrot(cRe, cIm, maxIter) {
  let zRe = 0, zIm = 0;
  for (let i = 0; i < maxIter; i++) {
    const zRe2 = zRe * zRe, zIm2 = zIm * zIm;
    if (zRe2 + zIm2 > 4) return i;
    zIm = 2 * zRe * zIm + cIm;
    zRe = zRe2 - zIm2 + cRe;
  }
  return maxIter;
}
function iterToColor(iter, maxIter, scheme) {
  if (iter === maxIter) return [0, 0, 0];
  const t = iter / maxIter;
  if (scheme === "fire") {
    return [
      Math.floor(255 * Math.min(1, t * 3)),
      Math.floor(255 * Math.max(0, t * 3 - 1)),
      Math.floor(255 * Math.max(0, t * 3 - 2))
    ];
  }
  if (scheme === "ocean") {
    return [
      Math.floor(255 * t * 0.3),
      Math.floor(255 * t * 0.6),
      Math.floor(255 * (0.4 + t * 0.6))
    ];
  }
  const h = t * 360 % 360;
  const s = 1, l = 0.5;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [
    Math.floor((r + m) * 255),
    Math.floor((g + m) * 255),
    Math.floor((b + m) * 255)
  ];
}
function computeMandelbrotGrid(cols, rows, realRange = [-2.5, 1], imagRange = [-1.25, 1.25], maxIter = 80, computeFn = mandelbrot) {
  const grid = [];
  for (let py = 0; py < rows; py++) {
    const row = [];
    const im = imagRange[1] - py / rows * (imagRange[1] - imagRange[0]);
    for (let px = 0; px < cols; px++) {
      const re = realRange[0] + px / cols * (realRange[1] - realRange[0]);
      row.push(computeFn(re, im, maxIter));
    }
    grid.push(row);
  }
  return grid;
}
function ComplexGraph2D(props) {
  const {
    width = 400,
    height = 300,
    realRange: initReal = [-2.5, 1],
    imagRange: initImag = [-1.25, 1.25],
    maxIterations = 100,
    colorScheme = "classic",
    computeFunction = mandelbrot,
    data,
    resolution = 2,
    onPointClick,
    onPointHover,
    onPointDoubleClick,
    onPointContextMenu
  } = props;
  if (data) {
    const rows = data.length;
    const cols = rows > 0 ? data[0].length : 0;
    const cellW = cols > 0 ? width / cols : 1;
    const cellH = rows > 0 ? height / rows : 1;
    const rects = [];
    for (let py = 0; py < rows; py++) {
      const row = data[py];
      for (let px = 0; px < cols; px++) {
        const iter = row[px] ?? 0;
        const [r, g, b] = iterToColor(iter, maxIterations, colorScheme);
        rects.push(
          createElement("rect", {
            key: `${py}-${px}`,
            x: String(px * cellW),
            y: String(py * cellH),
            width: String(Math.ceil(cellW)),
            height: String(Math.ceil(cellH)),
            fill: `rgb(${r},${g},${b})`
          })
        );
      }
    }
    return createElement(
      "svg",
      {
        width: "100%",
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: "xMidYMid meet",
        xmlns: "http://www.w3.org/2000/svg",
        role: "img",
        "aria-label": "Complex plane visualization",
        style: { cursor: "crosshair", borderRadius: "6px", maxWidth: "100%" }
      },
      ...rects
    );
  }
  const [realMin, setRealMin] = useState(initReal[0]);
  const [realMax, setRealMax] = useState(initReal[1]);
  const [imagMin, setImagMin] = useState(initImag[0]);
  const [imagMax, setImagMax] = useState(initImag[1]);
  const canvasRef = useRef(null);
  const dragging = useRef(false);
  const dragStart = useRef(null);
  const pxToComplex = useCallback(
    (px, py) => {
      const re = realMin + px / width * (realMax - realMin);
      const im = imagMax - py / height * (imagMax - imagMin);
      return { re, im };
    },
    [realMin, realMax, imagMin, imagMax, width, height]
  );
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.createImageData(width, height);
    const data2 = imgData.data;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const { re, im } = pxToComplex(px, py);
        const iter = computeFunction(re, im, maxIterations);
        const [r, g, b] = iterToColor(iter, maxIterations, colorScheme);
        const idx = (py * width + px) * 4;
        data2[idx] = r;
        data2[idx + 1] = g;
        data2[idx + 2] = b;
        data2[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [
    realMin,
    realMax,
    imagMin,
    imagMax,
    width,
    height,
    maxIterations,
    colorScheme,
    computeFunction,
    pxToComplex
  ]);
  const getPointInfo = useCallback(
    (e) => {
      const rect = e.target.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const { re, im } = pxToComplex(px, py);
      const iterations = computeFunction(re, im, maxIterations);
      return { re, im, iterations, event: e };
    },
    [pxToComplex, computeFunction, maxIterations]
  );
  const handleMouseDown = useCallback(
    (e) => {
      dragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        rMin: realMin,
        rMax: realMax,
        iMin: imagMin,
        iMax: imagMax
      };
    },
    [realMin, realMax, imagMin, imagMax]
  );
  const handleMouseMove = useCallback(
    (e) => {
      if (onPointHover) onPointHover(getPointInfo(e));
      if (!dragging.current || !dragStart.current) return;
      const ds = dragStart.current;
      const dx = e.clientX - ds.x, dy = e.clientY - ds.y;
      const rePerPx = (ds.rMax - ds.rMin) / width;
      const imPerPx = (ds.iMax - ds.iMin) / height;
      setRealMin(ds.rMin - dx * rePerPx);
      setRealMax(ds.rMax - dx * rePerPx);
      setImagMin(ds.iMin + dy * imPerPx);
      setImagMax(ds.iMax + dy * imPerPx);
    },
    [width, height, onPointHover, getPointInfo]
  );
  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const rect = e.target.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const { re, im } = pxToComplex(px, py);
      setRealMin(re + (realMin - re) * factor);
      setRealMax(re + (realMax - re) * factor);
      setImagMin(im + (imagMin - im) * factor);
      setImagMax(im + (imagMax - im) * factor);
    },
    [pxToComplex, realMin, realMax, imagMin, imagMax]
  );
  const handleClick = useCallback(
    (e) => {
      if (onPointClick) onPointClick(getPointInfo(e));
    },
    [onPointClick, getPointInfo]
  );
  const handleDblClick = useCallback(
    (e) => {
      if (onPointDoubleClick) onPointDoubleClick(getPointInfo(e));
    },
    [onPointDoubleClick, getPointInfo]
  );
  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      if (onPointContextMenu) onPointContextMenu(getPointInfo(e));
    },
    [onPointContextMenu, getPointInfo]
  );
  return createElement("canvas", {
    ref: canvasRef,
    width,
    height,
    style: { cursor: "crosshair" },
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
    onWheel: handleWheel,
    onClick: handleClick,
    onDblClick: handleDblClick,
    onContextMenu: handleContextMenu
  });
}

// ../components/viz/2D-line-graph/src/LineGraph.ts
function niceTickValues(min, max, count) {
  if (min === max) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  const ticks = [];
  for (let i = 0; i < count; i++) {
    const raw = min + step * i;
    ticks.push(Math.round(raw * 1e10) / 1e10);
  }
  return ticks;
}
function computeScales(allPoints, width, height, padding) {
  if (allPoints.length === 0) {
    return {
      xScale: () => padding,
      yScale: () => height - padding,
      xTicks: [],
      yTicks: [],
      xMin: 0,
      xMax: 0,
      yMin: 0,
      yMax: 0
    };
  }
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const p of allPoints) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }
  if (xMin === xMax) {
    xMin -= 1;
    xMax += 1;
  }
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const xScale = (v) => padding + (v - xMin) / (xMax - xMin) * plotWidth;
  const yScale = (v) => height - padding - (v - yMin) / (yMax - yMin) * plotHeight;
  const tickCount = 6;
  const xTicks = niceTickValues(xMin, xMax, tickCount);
  const yTicks = niceTickValues(yMin, yMax, tickCount);
  return { xScale, yScale, xTicks, yTicks, xMin, xMax, yMin, yMax };
}
function useLineGraphScales(data, width, height, padding) {
  return useMemo(
    () => computeScales(data, width, height, padding),
    [data, width, height, padding]
  );
}
function formatTick2(n) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}
function renderPointShape(shape, cx, cy, r, fill, key, extraProps) {
  const base = { fill, key, ...extraProps };
  switch (shape) {
    case "square":
      return createElement("rect", { ...base, x: cx - r, y: cy - r, width: r * 2, height: r * 2 });
    case "diamond": {
      const pts = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
      return createElement("polygon", { ...base, points: pts });
    }
    case "triangle": {
      const h = r * 1.15;
      const pts = `${cx},${cy - h} ${cx + r},${cy + r * 0.6} ${cx - r},${cy + r * 0.6}`;
      return createElement("polygon", { ...base, points: pts });
    }
    case "triangle-down": {
      const h = r * 1.15;
      const pts = `${cx - r},${cy - r * 0.6} ${cx + r},${cy - r * 0.6} ${cx},${cy + h}`;
      return createElement("polygon", { ...base, points: pts });
    }
    case "cross": {
      const w = r * 0.35;
      return createElement("path", {
        ...base,
        fill: "none",
        stroke: fill,
        "stroke-width": String(w * 2),
        "stroke-linecap": "round",
        d: `M${cx - r},${cy - r}L${cx + r},${cy + r}M${cx + r},${cy - r}L${cx - r},${cy + r}`
      });
    }
    case "plus": {
      const w = r * 0.35;
      return createElement("path", {
        ...base,
        fill: "none",
        stroke: fill,
        "stroke-width": String(w * 2),
        "stroke-linecap": "round",
        d: `M${cx},${cy - r}L${cx},${cy + r}M${cx - r},${cy}L${cx + r},${cy}`
      });
    }
    case "circle":
    default:
      return createElement("circle", { ...base, cx, cy, r });
  }
}
function LineGraph(props) {
  const {
    data,
    width = 600,
    height = 400,
    lineColor = "#3b82f6",
    lineWidth = 2,
    pointRadius = 4,
    pointColor = "#3b82f6",
    pointShape = "circle",
    showPoints = true,
    showGrid = true,
    showArea = false,
    areaColor = "rgba(59,130,246,0.15)",
    xLabel,
    yLabel,
    title,
    padding = 50,
    animate = false,
    multiLine
  } = props;
  const allPoints = useMemo(() => {
    const pts = [...data];
    if (multiLine) {
      for (const series of multiLine) {
        pts.push(...series.data);
      }
    }
    return pts;
  }, [data, multiLine]);
  const scales = useLineGraphScales(allPoints, width, height, padding);
  const { xScale, yScale, xTicks, yTicks } = scales;
  const children = [];
  children.push(
    createElement("rect", {
      x: 0,
      y: 0,
      width: "100%",
      fill: "white",
      key: "bg"
    })
  );
  if (showGrid) {
    for (let i = 0; i < xTicks.length; i++) {
      const px = xScale(xTicks[i]);
      children.push(
        createElement("line", {
          x1: px,
          y1: padding,
          x2: px,
          y2: height - padding,
          stroke: "#e5e7eb",
          "stroke-dasharray": "4,4",
          key: `grid-x-${i}`
        })
      );
    }
    for (let i = 0; i < yTicks.length; i++) {
      const py = yScale(yTicks[i]);
      children.push(
        createElement("line", {
          x1: padding,
          y1: py,
          x2: width - padding,
          y2: py,
          stroke: "#e5e7eb",
          "stroke-dasharray": "4,4",
          key: `grid-y-${i}`
        })
      );
    }
  }
  children.push(
    createElement("line", {
      x1: padding,
      y1: height - padding,
      x2: width - padding,
      y2: height - padding,
      stroke: "#374151",
      "stroke-width": 1,
      key: "x-axis"
    })
  );
  children.push(
    createElement("line", {
      x1: padding,
      y1: padding,
      x2: padding,
      y2: height - padding,
      stroke: "#374151",
      "stroke-width": 1,
      key: "y-axis"
    })
  );
  for (let i = 0; i < xTicks.length; i++) {
    const px = xScale(xTicks[i]);
    children.push(
      createElement("line", {
        x1: px,
        y1: height - padding,
        x2: px,
        y2: height - padding + 5,
        stroke: "#374151",
        key: `xtick-${i}`
      })
    );
    children.push(
      createElement(
        "text",
        {
          x: px,
          y: height - padding + 18,
          "text-anchor": "middle",
          "font-size": 11,
          fill: "#6b7280",
          key: `xlabel-${i}`
        },
        formatTick2(xTicks[i])
      )
    );
  }
  for (let i = 0; i < yTicks.length; i++) {
    const py = yScale(yTicks[i]);
    children.push(
      createElement("line", {
        x1: padding - 5,
        y1: py,
        x2: padding,
        y2: py,
        stroke: "#374151",
        key: `ytick-${i}`
      })
    );
    children.push(
      createElement(
        "text",
        {
          x: padding - 10,
          y: py + 4,
          "text-anchor": "end",
          "font-size": 11,
          fill: "#6b7280",
          key: `ylabel-${i}`
        },
        formatTick2(yTicks[i])
      )
    );
  }
  function renderSeries(seriesData, color, seriesLineWidth, seriesShowArea, seriesAreaColor, seriesShowPoints, seriesPointColor, seriesPointRadius, seriesPointShape, keyPrefix) {
    if (seriesData.length === 0) return;
    const sorted = [...seriesData].sort((a, b) => a.x - b.x);
    if (seriesShowArea) {
      const baseY = yScale(scales.yMin);
      const areaPoints = sorted.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join(" ");
      const firstX = xScale(sorted[0].x);
      const lastX = xScale(sorted[sorted.length - 1].x);
      const polygonPoints = `${firstX},${baseY} ${areaPoints} ${lastX},${baseY}`;
      children.push(
        createElement("polygon", {
          points: polygonPoints,
          fill: seriesAreaColor,
          key: `${keyPrefix}-area`
        })
      );
    }
    const linePoints = sorted.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join(" ");
    const polylineProps = {
      points: linePoints,
      fill: "none",
      stroke: color,
      "stroke-width": seriesLineWidth,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      key: `${keyPrefix}-line`
    };
    if (animate) {
      polylineProps["stroke-dasharray"] = "1000";
      polylineProps["stroke-dashoffset"] = "1000";
      children.push(
        createElement(
          "polyline",
          polylineProps,
          createElement("animate", {
            attributeName: "stroke-dashoffset",
            from: 1e3,
            to: 0,
            dur: "1.5s",
            fill: "freeze"
          })
        )
      );
    } else {
      children.push(createElement("polyline", polylineProps));
    }
    if (seriesShowPoints) {
      for (let i = 0; i < sorted.length; i++) {
        const px = xScale(sorted[i].x);
        const py = yScale(sorted[i].y);
        const ptShape = sorted[i].shape ?? seriesPointShape;
        const ptRadius = sorted[i].radius ?? seriesPointRadius;
        const ptKey = `${keyPrefix}-pt-${i}`;
        if (animate) {
          const marker = renderPointShape(ptShape, px, py, ptRadius, seriesPointColor, ptKey, { opacity: 0 });
          children.push(
            createElement(
              "g",
              { key: `${ptKey}-g` },
              marker,
              createElement("animate", {
                attributeName: "opacity",
                from: 0,
                to: 1,
                dur: "0.3s",
                begin: "1.2s",
                fill: "freeze"
              })
            )
          );
        } else {
          children.push(renderPointShape(ptShape, px, py, ptRadius, seriesPointColor, ptKey));
        }
      }
    }
  }
  renderSeries(
    data,
    lineColor,
    lineWidth,
    showArea,
    areaColor,
    showPoints,
    pointColor,
    pointRadius,
    pointShape,
    "primary"
  );
  if (multiLine) {
    for (let s = 0; s < multiLine.length; s++) {
      const series = multiLine[s];
      renderSeries(
        series.data,
        series.color,
        lineWidth,
        false,
        "transparent",
        showPoints,
        series.color,
        series.pointRadius ?? pointRadius,
        series.pointShape ?? pointShape,
        `series-${s}`
      );
    }
  }
  if (multiLine && multiLine.length > 0) {
    const legendItems = [];
    const allSeries = [
      { color: lineColor, label: "Primary" },
      ...multiLine.map((s, i) => ({
        color: s.color,
        label: s.label ?? `Series ${i + 1}`
      }))
    ];
    for (let i = 0; i < allSeries.length; i++) {
      const lx = padding + 10 + i * 120;
      const ly = padding - 30;
      legendItems.push(
        createElement("rect", {
          x: lx,
          y: ly,
          width: 14,
          height: 14,
          fill: allSeries[i].color,
          rx: 2,
          key: `legend-rect-${i}`
        })
      );
      legendItems.push(
        createElement(
          "text",
          {
            x: lx + 20,
            y: ly + 12,
            "font-size": 12,
            fill: "#374151",
            key: `legend-text-${i}`
          },
          allSeries[i].label
        )
      );
    }
    children.push(
      createElement("g", { key: "legend" }, ...legendItems)
    );
  }
  if (xLabel) {
    children.push(
      createElement(
        "text",
        {
          x: width / 2,
          y: height - 8,
          "text-anchor": "middle",
          "font-size": 13,
          fill: "#374151",
          key: "x-axis-label"
        },
        xLabel
      )
    );
  }
  if (yLabel) {
    children.push(
      createElement(
        "text",
        {
          x: 14,
          y: height / 2,
          "text-anchor": "middle",
          "font-size": 13,
          fill: "#374151",
          transform: `rotate(-90, 14, ${height / 2})`,
          key: "y-axis-label"
        },
        yLabel
      )
    );
  }
  if (title) {
    children.push(
      createElement(
        "text",
        {
          x: width / 2,
          y: 20,
          "text-anchor": "middle",
          "font-size": 16,
          "font-weight": "bold",
          fill: "#111827",
          key: "title"
        },
        title
      )
    );
  }
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "100%",
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "xMidYMid meet"
    },
    ...children
  );
}

// ../components/viz/2D-pie-graph/src/PieGraph.ts
function generateHSLPalette(count) {
  const palette2 = [];
  for (let i = 0; i < count; i++) {
    const hue = Math.round(360 * i / count);
    palette2.push(`hsl(${hue}, 70%, 55%)`);
  }
  return palette2;
}
function resolveColors(data, customColors) {
  const palette2 = customColors ?? generateHSLPalette(data.length);
  return data.map((d, i) => d.color ?? palette2[i % palette2.length]);
}
function polarToCartesian(cx, cy, radius, angleRad) {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  };
}
function describeArc(cx, cy, innerR, outerR, startAngle, endAngle) {
  const sA = startAngle - Math.PI / 2;
  const eA = endAngle - Math.PI / 2;
  const outerStart = polarToCartesian(cx, cy, outerR, sA);
  const outerEnd = polarToCartesian(cx, cy, outerR, eA);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  if (innerR <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      "Z"
    ].join(" ");
  }
  const innerStart = polarToCartesian(cx, cy, innerR, eA);
  const innerEnd = polarToCartesian(cx, cy, innerR, sA);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z"
  ].join(" ");
}
function computeSlices(data, options) {
  const padAngle = options?.padAngle ?? 0;
  const colors = resolveColors(data, options?.colors);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) return [];
  const totalPad = padAngle * data.length;
  const availableAngle = Math.PI * 2 - totalPad;
  const slices = [];
  let currentAngle = 0;
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const sliceAngle = d.value / total * availableAngle;
    const startAngle = currentAngle + padAngle / 2;
    const endAngle = startAngle + sliceAngle;
    slices.push({
      label: d.label,
      value: d.value,
      startAngle,
      endAngle,
      percentage: d.value / total * 100,
      color: colors[i]
    });
    currentAngle = endAngle + padAngle / 2;
  }
  return slices;
}
function PieGraph(props) {
  const {
    data,
    width = 400,
    height = 400,
    innerRadius = 0,
    padAngle = 0.02,
    showLabels = true,
    showValues = true,
    showLegend = true,
    legendPosition = "right",
    title,
    centerLabel,
    colors: customColors,
    strokeColor = "#fff",
    strokeWidth = 2
  } = props;
  const legendWidth = showLegend && legendPosition === "right" ? 140 : 0;
  const titleHeight = title ? 30 : 0;
  const legendBottomHeight = showLegend && legendPosition === "bottom" ? Math.ceil(data.length / 2) * 22 + 10 : 0;
  const chartWidth = width - legendWidth;
  const chartHeight = height - titleHeight - legendBottomHeight;
  const cx = chartWidth / 2;
  const cy = titleHeight + chartHeight / 2;
  const autoOuterRadius = Math.min(chartWidth, chartHeight) / 2 - 10;
  const outerRadius = props.outerRadius ?? autoOuterRadius;
  const slices = useMemo(
    () => computeSlices(data, { padAngle, colors: customColors }),
    [data, padAngle, customColors]
  );
  const children = [];
  if (title) {
    children.push(
      createElement("text", {
        key: "title",
        x: chartWidth / 2,
        y: 20,
        textAnchor: "middle",
        fontFamily: "sans-serif",
        fontSize: 16,
        fontWeight: "bold",
        fill: "#333"
      }, title)
    );
  }
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const d = describeArc(cx, cy, innerRadius, outerRadius, s.startAngle, s.endAngle);
    children.push(
      createElement("path", {
        key: `slice-${i}`,
        d,
        fill: s.color,
        stroke: strokeColor,
        strokeWidth
      })
    );
    if (showLabels || showValues) {
      const midAngle = (s.startAngle + s.endAngle) / 2;
      const isSmallSlice = s.percentage < 5;
      const labelR = isSmallSlice ? outerRadius + 14 : innerRadius + (outerRadius - innerRadius) * 0.65;
      const labelPos = polarToCartesian(
        cx,
        cy,
        labelR,
        midAngle - Math.PI / 2
      );
      const textColor = isSmallSlice ? "#333" : "#fff";
      const fontSize = isSmallSlice ? 11 : 12;
      const labelParts = [];
      if (showLabels) labelParts.push(s.label);
      if (showValues) labelParts.push(`${s.percentage.toFixed(1)}%`);
      if (isSmallSlice) {
        const edgePos = polarToCartesian(
          cx,
          cy,
          outerRadius + 2,
          midAngle - Math.PI / 2
        );
        children.push(
          createElement("line", {
            key: `connector-${i}`,
            x1: edgePos.x,
            y1: edgePos.y,
            x2: labelPos.x,
            y2: labelPos.y,
            stroke: "#999",
            strokeWidth: 1
          })
        );
      }
      if (showLabels) {
        children.push(
          createElement("text", {
            key: `label-${i}`,
            x: labelPos.x,
            y: labelPos.y - (showValues ? 6 : 0),
            textAnchor: "middle",
            fontFamily: "sans-serif",
            fontSize,
            fill: textColor,
            pointerEvents: "none"
          }, s.label)
        );
      }
      if (showValues) {
        children.push(
          createElement("text", {
            key: `value-${i}`,
            x: labelPos.x,
            y: labelPos.y + (showLabels ? 10 : 0),
            textAnchor: "middle",
            fontFamily: "sans-serif",
            fontSize: fontSize - 1,
            fill: textColor,
            pointerEvents: "none"
          }, `${s.percentage.toFixed(1)}%`)
        );
      }
    }
  }
  if (centerLabel && innerRadius > 0) {
    children.push(
      createElement("text", {
        key: "center-label",
        x: cx,
        y: cy,
        textAnchor: "middle",
        dominantBaseline: "central",
        fontFamily: "sans-serif",
        fontSize: 14,
        fontWeight: "bold",
        fill: "#333"
      }, centerLabel)
    );
  }
  if (showLegend) {
    const legendItems = [];
    if (legendPosition === "right") {
      const legendX = chartWidth + 10;
      const legendStartY = titleHeight + 20;
      for (let i = 0; i < slices.length; i++) {
        const s = slices[i];
        const itemY = legendStartY + i * 22;
        legendItems.push(
          createElement("circle", {
            key: `legend-dot-${i}`,
            cx: legendX + 6,
            cy: itemY,
            r: 6,
            fill: s.color
          })
        );
        legendItems.push(
          createElement("text", {
            key: `legend-text-${i}`,
            x: legendX + 18,
            y: itemY,
            dominantBaseline: "central",
            fontFamily: "sans-serif",
            fontSize: 12,
            fill: "#333"
          }, `${s.label} (${s.percentage.toFixed(1)}%)`)
        );
      }
    } else {
      const legendStartY = height - legendBottomHeight + 10;
      for (let i = 0; i < slices.length; i++) {
        const s = slices[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const itemX = col * (width / 2) + 10;
        const itemY = legendStartY + row * 22;
        legendItems.push(
          createElement("circle", {
            key: `legend-dot-${i}`,
            cx: itemX + 6,
            cy: itemY,
            r: 6,
            fill: s.color
          })
        );
        legendItems.push(
          createElement("text", {
            key: `legend-text-${i}`,
            x: itemX + 18,
            y: itemY,
            dominantBaseline: "central",
            fontFamily: "sans-serif",
            fontSize: 12,
            fill: "#333"
          }, `${s.label} (${s.percentage.toFixed(1)}%)`)
        );
      }
    }
    children.push(...legendItems);
  }
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "100%",
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "xMidYMid meet"
    },
    ...children
  );
}

// ../components/viz/2D-polar-graph/src/PolarGraph2D.ts
function polarToCartesian2(r, theta, cx, cy, scale) {
  return {
    x: cx + r * Math.cos(theta) * scale,
    y: cy - r * Math.sin(theta) * scale
  };
}
function PolarGraph2D(props) {
  const {
    width = 400,
    height = 400,
    rRange: initRange = [0, 2],
    plotFunction,
    plotResolution = 360,
    thetaStep,
    sync: syncMode = false,
    points = [],
    showGrid = true,
    pointRadius = 3,
    pointColor = "#3b82f6",
    curveColor = "#3b82f6",
    onPointClick,
    onPointDoubleClick,
    onPointContextMenu,
    onPointHover
  } = props;
  const [rMax, setRMax] = useState(initRange[1]);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragState, setDragState] = useState(null);
  const cx = width / 2 + panX;
  const cy = height / 2 + panY;
  const padding = 30;
  const maxRadius = Math.min(width, height) / 2 - padding;
  const scale = maxRadius / rMax;
  const gridCircles = useMemo(() => {
    const count = Math.max(1, Math.ceil(rMax));
    const circles = [];
    const step = rMax / count;
    for (let i = 1; i <= count; i++) circles.push(step * i);
    return circles;
  }, [rMax]);
  const angleLines = useMemo(() => {
    const lines = [];
    for (let d = 0; d < 360; d += 30) lines.push(d * Math.PI / 180);
    return lines;
  }, []);
  const syncPoints = useMemo(() => {
    if (!plotFunction || !syncMode) return [];
    const effectiveStep = thetaStep ?? 2 * Math.PI / plotResolution;
    const inputs = generateInputs({
      start: 0,
      end: 2 * Math.PI,
      step: effectiveStep
    });
    return computeSync(plotFunction, inputs);
  }, [plotFunction, plotResolution, thetaStep, syncMode]);
  const [asyncPoints, setAsyncPoints] = useState([]);
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!plotFunction || syncMode) {
      setAsyncPoints([]);
      return;
    }
    const effectiveStep = thetaStep ?? 2 * Math.PI / plotResolution;
    const inputs = generateInputs({
      start: 0,
      end: 2 * Math.PI,
      step: effectiveStep
    });
    if (cancelRef.current) cancelRef.current();
    cancelRef.current = computeAsync(
      plotFunction,
      inputs,
      200,
      (results) => {
        setAsyncPoints([...results]);
      }
    );
    return () => {
      if (cancelRef.current) cancelRef.current();
    };
  }, [plotFunction, plotResolution, thetaStep, syncMode]);
  const activePoints = syncMode ? syncPoints : asyncPoints;
  const curvePoints = useMemo(() => {
    if (activePoints.length === 0) return "";
    const pts = [];
    for (let i = 0; i < activePoints.length; i++) {
      const cp = activePoints[i];
      const r = cp.output;
      if (r < 0 || !isFinite(r)) continue;
      const { x, y } = polarToCartesian2(r, cp.input, cx, cy, scale);
      pts.push(
        `${pts.length === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
      );
    }
    return pts.join(" ");
  }, [activePoints, cx, cy, scale]);
  const handleMouseDown = useCallback(
    (e) => {
      setDragState({ x: e.clientX, y: e.clientY, px: panX, py: panY });
    },
    [panX, panY]
  );
  const handleMouseMove = useCallback(
    (e) => {
      if (!dragState) return;
      setPanX(dragState.px + (e.clientX - dragState.x));
      setPanY(dragState.py + (e.clientY - dragState.y));
    },
    [dragState]
  );
  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      setRMax(Math.max(0.1, rMax * factor));
    },
    [rMax]
  );
  const makePointHandler = useCallback(
    (handler, pt, idx) => {
      if (!handler) return void 0;
      return (e) => handler({ r: pt.r, theta: pt.theta, index: idx, event: e });
    },
    []
  );
  const children = [];
  children.push(
    createElement("rect", {
      x: 0,
      y: 0,
      width,
      height,
      fill: "white",
      key: "bg"
    })
  );
  if (showGrid) {
    for (let i = 0; i < gridCircles.length; i++) {
      const r = gridCircles[i] * scale;
      children.push(
        createElement("circle", {
          cx,
          cy,
          r,
          fill: "none",
          stroke: "#e5e7eb",
          "stroke-width": 1,
          key: `gc-${i}`
        })
      );
      children.push(
        createElement(
          "text",
          {
            x: cx + r + 2,
            y: cy - 4,
            "font-size": 10,
            fill: "#9ca3af",
            key: `gl-${i}`
          },
          gridCircles[i].toFixed(1)
        )
      );
    }
    for (let i = 0; i < angleLines.length; i++) {
      const a = angleLines[i];
      const outerR = gridCircles[gridCircles.length - 1] * scale;
      const ex = cx + outerR * Math.cos(a);
      const ey = cy - outerR * Math.sin(a);
      children.push(
        createElement("line", {
          x1: cx,
          y1: cy,
          x2: ex,
          y2: ey,
          stroke: "#e5e7eb",
          "stroke-width": 1,
          key: `al-${i}`
        })
      );
      const deg = Math.round(a * 180 / Math.PI);
      const lx = cx + (outerR + 14) * Math.cos(a);
      const ly = cy - (outerR + 14) * Math.sin(a);
      children.push(
        createElement(
          "text",
          {
            x: lx,
            y: ly + 4,
            "text-anchor": "middle",
            "font-size": 10,
            fill: "#9ca3af",
            key: `at-${i}`
          },
          `${deg}\xB0`
        )
      );
    }
  }
  children.push(
    createElement("line", {
      x1: cx - maxRadius,
      y1: cy,
      x2: cx + maxRadius,
      y2: cy,
      stroke: "#d1d5db",
      "stroke-width": 1,
      key: "x-axis"
    })
  );
  children.push(
    createElement("line", {
      x1: cx,
      y1: cy - maxRadius,
      x2: cx,
      y2: cy + maxRadius,
      stroke: "#d1d5db",
      "stroke-width": 1,
      key: "y-axis"
    })
  );
  if (curvePoints) {
    children.push(
      createElement("path", {
        d: curvePoints,
        fill: "none",
        stroke: curveColor,
        "stroke-width": 2,
        key: "curve"
      })
    );
  }
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const { x, y } = polarToCartesian2(pt.r, pt.theta, cx, cy, scale);
    children.push(
      createElement("circle", {
        cx: x,
        cy: y,
        r: pointRadius,
        fill: pointColor,
        key: `pt-${i}`,
        style: { cursor: "pointer" },
        onClick: makePointHandler(onPointClick, pt, i),
        onDblClick: makePointHandler(onPointDoubleClick, pt, i),
        onContextMenu: makePointHandler(onPointContextMenu, pt, i),
        onMouseEnter: makePointHandler(onPointHover, pt, i)
      })
    );
  }
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "100%",
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "xMidYMid meet",
      style: { cursor: dragState ? "grabbing" : "grab" },
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onWheel: handleWheel
    },
    ...children
  );
}

// ../components/viz/graph/src/hypercube.ts
function generateVertices(dimension) {
  const count = 1 << dimension;
  const verts = [];
  for (let i = 0; i < count; i++) {
    const coords = [];
    for (let d = 0; d < dimension; d++) {
      coords.push((i >> d & 1) * 2 - 1);
    }
    verts.push({ coords });
  }
  return verts;
}
function generateEdges(dimension) {
  const count = 1 << dimension;
  const edges = [];
  for (let i = 0; i < count; i++) {
    for (let d = 0; d < dimension; d++) {
      const j = i ^ 1 << d;
      if (j > i) {
        edges.push({ source: i, target: j });
      }
    }
  }
  return edges;
}
function buildRotationMatrix(dimension, angles) {
  let mat = identity(dimension);
  let angleIdx = 0;
  for (let i = 0; i < dimension; i++) {
    for (let j = i + 1; j < dimension; j++) {
      if (angleIdx < angles.length) {
        const theta = angles[angleIdx];
        mat = multiplyMatrices(mat, planeRotation(dimension, i, j, theta));
      }
      angleIdx++;
    }
  }
  return mat;
}
function identity(n) {
  const m = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    m.push(row);
  }
  return m;
}
function planeRotation(n, a, b, theta) {
  const m = identity(n);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  m[a][a] = c;
  m[a][b] = -s;
  m[b][a] = s;
  m[b][b] = c;
  return m;
}
function multiplyMatrices(a, b) {
  const n = a.length;
  const result = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        row[j] += a[i][k] * b[k][j];
      }
    }
    result.push(row);
  }
  return result;
}
function transformVec(matrix, v) {
  const n = matrix.length;
  const result = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i] += matrix[i][j] * v.coords[j];
    }
  }
  return result;
}
function projectTo2D(transformed, perspective = 0) {
  const x = transformed[0] ?? 0;
  const y = transformed[1] ?? 0;
  let depth = 0;
  for (let i = 2; i < transformed.length; i++) {
    depth += transformed[i] ?? 0;
  }
  if (transformed.length > 2) {
    depth /= transformed.length - 2;
  }
  if (perspective > 0) {
    const scale = 1 / (1 + perspective * (depth + 2));
    return { x: x * scale, y: y * scale, depth };
  }
  return { x, y, depth };
}
function generateHypercube(dimension, angles = [], perspective = 0.3, scale = 1) {
  const rawVerts = generateVertices(dimension);
  const edges = generateEdges(dimension);
  const rotMatrix = buildRotationMatrix(dimension, angles);
  const vertices = rawVerts.map((v, i) => {
    const transformed = transformVec(rotMatrix, v);
    const proj = projectTo2D(transformed, perspective);
    return {
      id: i,
      position: v,
      x: proj.x * scale,
      y: proj.y * scale,
      depth: proj.depth
    };
  });
  return { vertices, edges, dimension };
}
function numRotationAngles(dimension) {
  return dimension * (dimension - 1) / 2;
}
function generatePalette(count, saturation = 70, lightness = 55) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = Math.round(360 * i / count);
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
}

// ../components/viz/graph/src/HypercubeGraph.ts
function HypercubeGraph(props) {
  const dim = props.dimension ?? 4;
  const width = props.width ?? 600;
  const height = props.height ?? 600;
  const vertexRadius = props.vertexRadius ?? 10;
  const edgeWidth = props.edgeWidth ?? 3;
  const edgeColor = props.edgeColor ?? "#111";
  const perspective = props.perspective ?? 0.25;
  const rotationSpeed = props.rotationSpeed ?? 8e-3;
  const showLabels = props.showLabels ?? false;
  const backgroundColor = props.backgroundColor ?? "transparent";
  const scale = props.scale ?? Math.min(width, height) * 0.3;
  const numAngles = numRotationAngles(dim);
  const vertexCount = 1 << dim;
  const colors = useMemo(() => {
    if (props.vertexColors === "auto" || props.vertexColors === void 0) {
      return generatePalette(vertexCount);
    }
    return props.vertexColors;
  }, [vertexCount, props.vertexColors]);
  const [angles, setAngles] = useState(() => {
    const a = [];
    for (let i = 0; i < numAngles; i++) {
      a.push(0);
    }
    return a;
  });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const anglesAtDragStart = useRef([]);
  const frameRef = useRef(0);
  useEffect(() => {
    if (rotationSpeed === 0) return;
    let running = true;
    const animate = () => {
      if (!running) return;
      setAngles((prev) => {
        const next = prev.slice();
        for (let i = 0; i < next.length; i++) {
          next[i] = (next[i] ?? 0) + rotationSpeed * (1 + i * 0.3);
        }
        return next;
      });
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [rotationSpeed]);
  const data = useMemo(
    () => generateHypercube(dim, angles, perspective, scale),
    [dim, angles, perspective, scale]
  );
  const cx = width / 2;
  const cy = height / 2;
  const sortedEdges = useMemo(() => {
    return data.edges.map((e) => {
      const sv = data.vertices[e.source];
      const tv = data.vertices[e.target];
      const avgDepth = (sv.depth + tv.depth) / 2;
      return { ...e, avgDepth, sv, tv };
    }).sort((a, b) => a.avgDepth - b.avgDepth);
  }, [data]);
  const sortedVertices = useMemo(() => {
    return data.vertices.slice().sort((a, b) => a.depth - b.depth);
  }, [data]);
  const handleMouseDown = useCallback(
    (e) => {
      const me = e;
      setDragging(true);
      dragStart.current = { x: me.clientX, y: me.clientY };
      anglesAtDragStart.current = angles.slice();
    },
    [angles]
  );
  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging) return;
      const me = e;
      const dx = (me.clientX - dragStart.current.x) * 0.01;
      const dy = (me.clientY - dragStart.current.y) * 0.01;
      setAngles(() => {
        const next = anglesAtDragStart.current.slice();
        if (next.length > 0) next[0] = (next[0] ?? 0) + dx;
        if (next.length > 1) next[1] = (next[1] ?? 0) + dy;
        return next;
      });
    },
    [dragging]
  );
  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);
  const edgeOpacity = (depth) => {
    const normalized = (depth + 2) / 4;
    return 0.3 + 0.7 * Math.max(0, Math.min(1, normalized));
  };
  const vertexScale = (depth) => {
    const normalized = (depth + 2) / 4;
    return 0.6 + 0.4 * Math.max(0, Math.min(1, normalized));
  };
  const edgeElements = sortedEdges.map((e, i) => {
    const opacity = edgeOpacity(e.avgDepth);
    return createElement("line", {
      key: `e-${e.source}-${e.target}`,
      x1: String(cx + e.sv.x),
      y1: String(cy + e.sv.y),
      x2: String(cx + e.tv.x),
      y2: String(cy + e.tv.y),
      stroke: edgeColor,
      "stroke-width": String(edgeWidth),
      "stroke-opacity": String(opacity),
      "stroke-linecap": "round"
    });
  });
  const vertexElements = sortedVertices.map((v) => {
    const r = vertexRadius * vertexScale(v.depth);
    const color = colors[v.id % colors.length] ?? "#3b82f6";
    const children = [
      createElement("circle", {
        key: `v-${v.id}-circle`,
        cx: String(cx + v.x),
        cy: String(cy + v.y),
        r: String(r),
        fill: color,
        stroke: "#000",
        "stroke-width": "1.5",
        style: { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }
      })
    ];
    if (showLabels) {
      children.push(
        createElement(
          "text",
          {
            key: `v-${v.id}-label`,
            x: String(cx + v.x),
            y: String(cy + v.y + r + 14),
            "text-anchor": "middle",
            "font-size": "11",
            "font-family": "monospace",
            fill: "#555"
          },
          v.id.toString(2).padStart(dim, "0")
        )
      );
    }
    return children;
  });
  return createElement(
    "svg",
    {
      width: "100%",
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "xMidYMid meet",
      style: {
        backgroundColor,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none"
      },
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp
    },
    ...edgeElements,
    ...vertexElements.flat()
  );
}
function useHypercube(opts = {}) {
  const dim = opts.dimension ?? 4;
  const speed = opts.rotationSpeed ?? 8e-3;
  const persp = opts.perspective ?? 0.25;
  const sc = opts.scale ?? 200;
  const numAngles = numRotationAngles(dim);
  const [angles, setAngles] = useState(() => new Array(numAngles).fill(0));
  useEffect(() => {
    if (speed === 0) return;
    let running = true;
    let frame = 0;
    const animate = () => {
      if (!running) return;
      setAngles((prev) => prev.map((a, i) => a + speed * (1 + i * 0.3)));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [speed]);
  const data = useMemo(
    () => generateHypercube(dim, angles, persp, sc),
    [dim, angles, persp, sc]
  );
  return { data, angles, setAngles };
}

// ../components/viz/wrapper/src/VizWrapper.ts
function VizWrapper(props) {
  const titlePos = props.titlePosition ?? "top";
  const legendPos = props.legendPosition ?? "bottom";
  const titleAlign = props.titleAlign ?? "center";
  const legendAlign = props.legendAlign ?? "center";
  const gap = props.gap ?? "12px";
  const contain = props.contain ?? "layout style paint";
  const containerStyle3 = {
    display: "flex",
    flexDirection: resolveDirection(titlePos, legendPos),
    gap,
    width: typeof props.width === "number" ? `${props.width}px` : props.width ?? "auto",
    height: typeof props.height === "number" ? `${props.height}px` : props.height ?? "auto",
    backgroundColor: props.backgroundColor ?? "#ffffff",
    border: props.border ?? "1px solid #e5e7eb",
    borderRadius: props.borderRadius ?? "8px",
    padding: props.padding ?? "16px",
    fontFamily: props.fontFamily ?? "inherit",
    contain,
    overflow: "hidden",
    position: "relative",
    boxSizing: "border-box",
    ...props.boxShadow ? { boxShadow: props.boxShadow } : {},
    ...props.style ?? {}
  };
  const titleEl = props.title ? createElement("div", {
    className: "viz-title",
    style: {
      fontSize: props.titleFontSize ?? "16px",
      fontWeight: props.titleFontWeight ?? "600",
      color: props.titleColor ?? "#1f2937",
      textAlign: titleAlign,
      flexShrink: "0"
    }
  }, props.title) : null;
  const legendEl = props.legend && props.legend.length > 0 ? buildLegend(props.legend, {
    align: legendAlign,
    fontSize: props.legendFontSize ?? "12px",
    gap: props.legendGap ?? 16,
    direction: legendPos === "left" || legendPos === "right" ? "column" : "row"
  }) : null;
  const contentEl = createElement("div", {
    className: "viz-content",
    style: {
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, props.children);
  const elements = arrangeElements(titleEl, contentEl, legendEl, titlePos, legendPos);
  return createElement(
    "div",
    {
      className: `viz-wrapper ${props.className ?? ""}`.trim(),
      style: containerStyle3
    },
    ...elements
  );
}
function resolveDirection(_titlePos, _legendPos) {
  return "column";
}
function arrangeElements(titleEl, contentEl, legendEl, titlePos, legendPos) {
  const elements = [];
  if (titlePos === "top" && titleEl) elements.push(titleEl);
  if (legendPos === "left" || legendPos === "right") {
    const rowChildren = [];
    if (legendPos === "left" && legendEl) rowChildren.push(legendEl);
    if (titlePos === "left" && titleEl) rowChildren.push(titleEl);
    rowChildren.push(contentEl);
    if (titlePos === "right" && titleEl) rowChildren.push(titleEl);
    if (legendPos === "right" && legendEl) rowChildren.push(legendEl);
    elements.push(
      createElement("div", {
        style: {
          display: "flex",
          flexDirection: "row",
          flex: "1",
          gap: "12px",
          minHeight: "0",
          alignItems: "stretch"
        }
      }, ...rowChildren)
    );
  } else if (titlePos === "left" || titlePos === "right") {
    if (legendPos === "top" && legendEl) elements.push(legendEl);
    const rowChildren = [];
    if (titlePos === "left" && titleEl) rowChildren.push(titleEl);
    rowChildren.push(contentEl);
    if (titlePos === "right" && titleEl) rowChildren.push(titleEl);
    elements.push(
      createElement("div", {
        style: {
          display: "flex",
          flexDirection: "row",
          flex: "1",
          gap: "12px",
          minHeight: "0",
          alignItems: "center"
        }
      }, ...rowChildren)
    );
    if (legendPos === "bottom" && legendEl) elements.push(legendEl);
  } else {
    if (legendPos === "top" && legendEl) elements.push(legendEl);
    elements.push(contentEl);
    if (legendPos === "bottom" && legendEl) elements.push(legendEl);
  }
  if (titlePos === "bottom" && titleEl) elements.push(titleEl);
  return elements;
}
function buildLegend(items, opts) {
  return createElement(
    "div",
    {
      className: "viz-legend",
      style: {
        display: "flex",
        flexDirection: opts.direction,
        flexWrap: "wrap",
        gap: `${opts.gap}px`,
        justifyContent: opts.align,
        alignItems: "center",
        fontSize: opts.fontSize,
        color: "#6b7280",
        flexShrink: "0"
      }
    },
    ...items.map(
      (item, i) => createElement(
        "div",
        {
          key: `legend-${i}`,
          style: {
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }
        },
        buildLegendSwatch(item),
        createElement("span", null, item.label)
      )
    )
  );
}
function buildLegendSwatch(item) {
  const shape = item.shape ?? "circle";
  if (shape === "line") {
    return createElement(
      "svg",
      { width: "20", height: "12", viewBox: "0 0 20 12" },
      createElement("line", {
        x1: "0",
        y1: "6",
        x2: "20",
        y2: "6",
        stroke: item.color,
        "stroke-width": "2",
        "stroke-dasharray": item.dash ?? ""
      })
    );
  }
  if (shape === "square") {
    return createElement("div", {
      style: {
        width: "12px",
        height: "12px",
        backgroundColor: item.color,
        borderRadius: "2px",
        flexShrink: "0"
      }
    });
  }
  return createElement("div", {
    style: {
      width: "10px",
      height: "10px",
      backgroundColor: item.color,
      borderRadius: "50%",
      flexShrink: "0"
    }
  });
}

// ../components/analytics/google-analytics/src/GoogleAnalytics.ts
function injectGtagScript(measurementId) {
  if (typeof document === "undefined") return;
  const scriptId = "specifyjs-gtag";
  if (document.getElementById(scriptId)) return;
  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}
function initDataLayer() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", /* @__PURE__ */ new Date());
  }
}
function GoogleAnalytics(props) {
  const { measurementId, disabled = false, debug = false, anonymizeIp = false, config } = props;
  useEffect(() => {
    if (disabled || typeof window === "undefined") return;
    injectGtagScript(measurementId);
    initDataLayer();
    const gtagConfig = {
      ...config
    };
    if (anonymizeIp) {
      gtagConfig.anonymize_ip = true;
    }
    if (debug) {
      gtagConfig.debug_mode = true;
    }
    if (window.gtag) {
      window.gtag("config", measurementId, gtagConfig);
    }
    return () => {
      const script = document.getElementById("specifyjs-gtag");
      if (script) script.remove();
    };
  }, [measurementId, disabled, debug, anonymizeIp]);
  return null;
}

// ../components/layout/footer/src/Footer.ts
function Footer(props) {
  const {
    left,
    center,
    right,
    borderTop = "1px solid var(--color-border, #e2e8f0)",
    background = "var(--color-bg, transparent)",
    color = "var(--color-text-muted, #64748b)",
    fontSize = "13px",
    padding = "24px",
    maxWidth = "1200px",
    className,
    ariaLabel = "Site footer"
  } = props;
  return createElement(
    "footer",
    {
      className,
      role: "contentinfo",
      "aria-label": ariaLabel,
      style: {
        borderTop,
        background,
        color,
        fontSize,
        padding,
        marginTop: "48px"
      }
    },
    createElement(
      "div",
      {
        style: {
          maxWidth,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }
      },
      // Left
      createElement(
        "div",
        { style: { flex: "1", textAlign: "left", minWidth: "150px" } },
        left ?? null
      ),
      // Center
      createElement(
        "div",
        { style: { flex: "1", textAlign: "center", minWidth: "150px" } },
        center ?? null
      ),
      // Right
      createElement(
        "div",
        { style: { flex: "1", textAlign: "right", minWidth: "150px" } },
        right ?? null
      )
    )
  );
}

// ../components/page/unity-desktop/src/UnityDesktop.ts
var LAUNCHER_WIDTH = "48px";
var TOP_PANEL_HEIGHT = "28px";
var LAUNCHER_ICONS = [
  { letter: "F", color: "#3465a4", label: "Files" },
  { letter: "W", color: "#e67e22", label: "Browser" },
  { letter: "T", color: "#2ecc71", label: "Terminal" },
  { letter: "M", color: "#3498db", label: "Mail" },
  { letter: "N", color: "#e74c3c", label: "Music" },
  { letter: "P", color: "#9b59b6", label: "Photos" },
  { letter: "S", color: "#f39c12", label: "Software" },
  { letter: "G", color: "#7f8c8d", label: "Settings" }
];
var TRAY_ICONS = ["\u{1F50A}", "\u{1F4F6}", "\u{1F50B}"];
function getPlaceholderContent(appLabel) {
  switch (appLabel) {
    case "Files":
      return [
        createElement("div", { style: { fontWeight: "600", marginBottom: "8px", color: "#333" } }, "Home"),
        createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "4px" } },
          createElement("span", { style: { color: "#555", cursor: "pointer" } }, "\u{1F4C1} Documents"),
          createElement("span", { style: { color: "#555", cursor: "pointer" } }, "\u{1F4C1} Downloads"),
          createElement("span", { style: { color: "#555", cursor: "pointer" } }, "\u{1F4C1} Music"),
          createElement("span", { style: { color: "#555", cursor: "pointer" } }, "\u{1F4C1} Pictures"),
          createElement("span", { style: { color: "#555", cursor: "pointer" } }, "\u{1F4C1} Videos"),
          createElement("span", { style: { color: "#555", cursor: "pointer" } }, "\u{1F4C4} readme.txt")
        )
      ];
    case "Browser":
      return [
        createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
          createElement("span", { style: { padding: "4px 8px", backgroundColor: "#eee", borderRadius: "4px", fontSize: "12px", flex: "1", color: "#666" } }, "https://example.com")
        ),
        createElement("div", { style: { padding: "16px", backgroundColor: "#fafafa", borderRadius: "4px", textAlign: "center", color: "#999" } }, "Web page content area")
      ];
    case "Terminal":
      return [
        createElement(
          "div",
          { style: { backgroundColor: "#1a1a1a", padding: "12px", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px", color: "#2ecc71", lineHeight: "1.6" } },
          createElement(
            "div",
            null,
            createElement("span", { style: { color: "#2ecc71" } }, "user@desktop:~$ "),
            createElement("span", { style: { color: "#ccc" } }, "Welcome to SpecifyJS Desktop")
          ),
          createElement(
            "div",
            null,
            createElement("span", { style: { color: "#2ecc71" } }, "user@desktop:~$ "),
            createElement("span", { style: { color: "#ccc" } }, "ls -la")
          ),
          createElement("div", { style: { color: "#aaa" } }, "total 42"),
          createElement(
            "div",
            null,
            createElement("span", { style: { color: "#2ecc71" } }, "user@desktop:~$ "),
            createElement("span", { style: { color: "#ccc", borderRight: "2px solid #2ecc71" } }, " ")
          )
        )
      ];
    case "Mail":
      return [
        createElement("div", { style: { fontWeight: "600", marginBottom: "8px", color: "#333" } }, "Inbox (3)"),
        createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "6px" } },
          createElement("div", { style: { padding: "6px", backgroundColor: "#e8f0fe", borderRadius: "4px", color: "#333", fontSize: "12px" } }, "Welcome to SpecifyJS Mail"),
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px" } }, "Your weekly digest"),
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px" } }, "Team standup notes")
        )
      ];
    case "Music":
      return [
        createElement(
          "div",
          { style: { textAlign: "center", padding: "20px", color: "#333" } },
          createElement("div", { style: { fontSize: "48px", marginBottom: "12px" } }, "\u{1F3B5}"),
          createElement("div", { style: { fontWeight: "600", marginBottom: "4px" } }, "Now Playing"),
          createElement("div", { style: { color: "#666", fontSize: "12px" } }, "No track selected"),
          createElement(
            "div",
            { style: { marginTop: "16px", display: "flex", justifyContent: "center", gap: "16px", fontSize: "18px" } },
            createElement("span", { style: { cursor: "pointer" } }, "\u23EE"),
            createElement("span", { style: { cursor: "pointer" } }, "\u25B6"),
            createElement("span", { style: { cursor: "pointer" } }, "\u23ED")
          )
        )
      ];
    case "Photos":
      return [
        createElement("div", { style: { fontWeight: "600", marginBottom: "8px", color: "#333" } }, "Photo Library"),
        createElement(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" } },
          createElement("div", { style: { width: "60px", height: "60px", backgroundColor: "#ddd", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" } }, "\u{1F5BC}"),
          createElement("div", { style: { width: "60px", height: "60px", backgroundColor: "#ddd", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" } }, "\u{1F5BC}"),
          createElement("div", { style: { width: "60px", height: "60px", backgroundColor: "#ddd", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" } }, "\u{1F5BC}")
        )
      ];
    case "Software":
      return [
        createElement("div", { style: { fontWeight: "600", marginBottom: "8px", color: "#333" } }, "Software Center"),
        createElement("div", { style: { color: "#666", fontSize: "12px" } }, "Browse and install applications"),
        createElement(
          "div",
          { style: { marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" } },
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px" } }, "\u{1F4E6} Package Manager"),
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px" } }, "\u{1F4E6} Text Editor"),
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px" } }, "\u{1F4E6} Image Viewer")
        )
      ];
    case "Settings":
      return [
        createElement("div", { style: { fontWeight: "600", marginBottom: "8px", color: "#333" } }, "System Settings"),
        createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "6px" } },
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px", cursor: "pointer" } }, "\u2699 General"),
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px", cursor: "pointer" } }, "\u{1F4F6} Network"),
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px", cursor: "pointer" } }, "\u{1F508} Sound"),
          createElement("div", { style: { padding: "6px", backgroundColor: "#f5f5f5", borderRadius: "4px", color: "#333", fontSize: "12px", cursor: "pointer" } }, "\u{1F5A5} Display")
        )
      ];
    default:
      return [
        createElement("div", { style: { textAlign: "center", color: "#999", padding: "20px" } }, `${appLabel} placeholder`)
      ];
  }
}
var nextWindowId = 1;
function UnityDesktop(props) {
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [clockText, setClockText] = useState(() => {
    const now = /* @__PURE__ */ new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  });
  const [dateText, setDateText] = useState(() => {
    return (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  });
  const [openWindows, setOpenWindows] = useState([]);
  const [focusedWindowId, setFocusedWindowId] = useState(-1);
  const [showAppsGrid, setShowAppsGrid] = useState(false);
  useEffect(() => {
    const updateClock = () => {
      const now = /* @__PURE__ */ new Date();
      setClockText(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`);
      setDateText(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    };
    const id = setInterval(updateClock, 1e3);
    return () => clearInterval(id);
  }, []);
  const handleOpenApp = useCallback((icon) => {
    const id = nextWindowId++;
    const win = {
      id,
      appLabel: icon.label,
      appLetter: icon.letter,
      appColor: icon.color,
      minimized: false
    };
    setOpenWindows((prev) => [...prev, win]);
    setFocusedWindowId(id);
    setShowAppsGrid(false);
  }, []);
  const handleCloseWindow = useCallback((windowId) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== windowId));
    setFocusedWindowId((prev) => prev === windowId ? -1 : prev);
  }, []);
  const handleMinimizeWindow = useCallback((windowId) => {
    setOpenWindows(
      (prev) => prev.map((w) => w.id === windowId ? { ...w, minimized: !w.minimized } : w)
    );
  }, []);
  const handleFocusWindow = useCallback((windowId) => {
    setFocusedWindowId(windowId);
    setOpenWindows(
      (prev) => prev.map((w) => w.id === windowId ? { ...w, minimized: false } : w)
    );
  }, []);
  const handleToggleAppsGrid = useCallback(() => {
    setShowAppsGrid((prev) => !prev);
  }, []);
  const handleIconKeyDown = useCallback((index, e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpenApp(LAUNCHER_ICONS[index]);
    }
  }, [handleOpenApp]);
  const containerStyle3 = useMemo(() => ({
    width: "100%",
    height: "100%",
    minHeight: "500px",
    display: "flex",
    flexDirection: "column",
    fontFamily: 'Ubuntu, "Segoe UI", sans-serif',
    fontSize: "13px",
    color: "var(--color-text, #ffffff)",
    overflow: "hidden",
    position: "relative"
  }), []);
  const topPanelStyle = {
    width: "100%",
    height: TOP_PANEL_HEIGHT,
    backgroundColor: "var(--color-bg, #1a1a1a)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    boxSizing: "border-box",
    fontSize: "12px",
    zIndex: "10",
    flexShrink: "0",
    borderBottom: "1px solid var(--color-border, #333)"
  };
  const bodyStyle = {
    display: "flex",
    flex: "1",
    overflow: "hidden"
  };
  const launcherStyle = {
    width: LAUNCHER_WIDTH,
    backgroundColor: "var(--color-bg, #2c2c2c)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "8px",
    paddingBottom: "8px",
    gap: "4px",
    flexShrink: "0",
    overflowY: "auto",
    boxSizing: "border-box",
    borderRight: "1px solid var(--color-border, #444)"
  };
  const desktopStyle = {
    flex: "1",
    background: "linear-gradient(135deg, #2c001e 0%, #5e2750 50%, #2c001e 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "auto",
    position: "relative"
  };
  function makeCircleStyle(color) {
    return {
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      backgroundColor: color,
      cursor: "pointer",
      display: "inline-block"
    };
  }
  function makeIconButtonStyle(index) {
    const isHovered = hoveredIndex === index;
    return {
      width: "40px",
      height: "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "700",
      backgroundColor: isHovered ? "rgba(255,255,255,0.15)" : "transparent",
      border: "none",
      color: "#ffffff",
      transition: "background 0.15s"
    };
  }
  function makeIconCircleStyle(color) {
    return {
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      backgroundColor: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "13px",
      fontWeight: "700",
      color: "#ffffff",
      lineHeight: "1"
    };
  }
  const gridButtonStyle = {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "20px",
    backgroundColor: hoveredIndex === LAUNCHER_ICONS.length ? "rgba(255,255,255,0.15)" : "transparent",
    border: "none",
    color: "#ffffff",
    transition: "background 0.15s",
    marginTop: "auto"
  };
  const windowElements = openWindows.map((win, idx) => {
    if (win.minimized) return null;
    const isFocused = win.id === focusedWindowId;
    const offsetX = 80 + idx % 5 * 30;
    const offsetY = 40 + idx % 5 * 30;
    const zIndex = isFocused ? 100 : 10 + idx;
    const windowStyle = {
      width: "420px",
      minHeight: "280px",
      backgroundColor: "#ffffff",
      borderRadius: "6px",
      boxShadow: isFocused ? "0 12px 48px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.4)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "absolute",
      left: `${offsetX}px`,
      top: `${offsetY}px`,
      zIndex: String(zIndex),
      transition: "box-shadow 0.15s"
    };
    const windowTitleBarStyle = {
      height: "32px",
      backgroundColor: isFocused ? "#3c3c3c" : "#555",
      display: "flex",
      alignItems: "center",
      padding: "0 10px",
      gap: "6px",
      flexShrink: "0",
      cursor: "default"
    };
    const windowBodyStyle = {
      flex: "1",
      padding: "16px",
      fontSize: "13px",
      color: "#333",
      lineHeight: "1.5"
    };
    return createElement(
      "div",
      {
        key: String(win.id),
        className: "unity-desktop__window",
        style: windowStyle,
        onMouseDown: () => handleFocusWindow(win.id)
      },
      createElement(
        "div",
        { style: windowTitleBarStyle },
        createElement("span", {
          style: makeCircleStyle("#e74c3c"),
          onClick: () => handleCloseWindow(win.id),
          title: "Close",
          role: "button",
          "aria-label": `Close ${win.appLabel}`,
          tabIndex: 0
        }),
        createElement("span", {
          style: makeCircleStyle("#f39c12"),
          onClick: () => handleMinimizeWindow(win.id),
          title: "Minimize",
          role: "button",
          "aria-label": `Minimize ${win.appLabel}`,
          tabIndex: 0
        }),
        createElement("span", {
          style: makeCircleStyle("#2ecc71"),
          title: "Maximize",
          role: "button",
          "aria-label": `Maximize ${win.appLabel}`,
          tabIndex: 0
        }),
        createElement(
          "span",
          {
            style: {
              flex: "1",
              textAlign: "center",
              fontSize: "12px",
              color: "#ccc",
              marginRight: "40px"
            }
          },
          win.appLabel
        )
      ),
      createElement(
        "div",
        { style: windowBodyStyle },
        ...getPlaceholderContent(win.appLabel)
      )
    );
  });
  const appsGridOverlay = showAppsGrid ? createElement(
    "div",
    {
      className: "unity-desktop__apps-grid",
      style: {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "200"
      },
      onClick: () => setShowAppsGrid(false)
    },
    createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(4, 80px)",
          gap: "24px",
          padding: "40px"
        },
        onClick: (e) => e.stopPropagation()
      },
      ...LAUNCHER_ICONS.map(
        (icon) => createElement(
          "div",
          {
            key: icon.label,
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              padding: "12px",
              borderRadius: "8px",
              transition: "background 0.15s"
            },
            onClick: () => handleOpenApp(icon),
            role: "button",
            tabIndex: 0,
            "aria-label": icon.label
          },
          createElement(
            "span",
            {
              style: {
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: icon.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "700",
                color: "#ffffff"
              }
            },
            icon.letter
          ),
          createElement(
            "span",
            {
              style: {
                color: "#ffffff",
                fontSize: "11px"
              }
            },
            icon.label
          )
        )
      )
    )
  ) : null;
  return createElement(
    "div",
    {
      className: `unity-desktop ${props.className ?? ""}`.trim(),
      style: containerStyle3
    },
    // Top Panel
    createElement(
      "div",
      { className: "unity-desktop__top-panel", style: topPanelStyle },
      createElement(
        "span",
        {
          style: {
            fontWeight: "600",
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: "3px",
            transition: "background 0.15s"
          }
        },
        "Activities"
      ),
      createElement(
        "span",
        { style: { position: "absolute", left: "50%", transform: "translateX(-50%)" } },
        `${dateText}  ${clockText}`
      ),
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" } },
        ...TRAY_ICONS.map(
          (icon, i) => createElement("span", { key: String(i), style: { cursor: "pointer" } }, icon)
        ),
        createElement("span", { style: { fontSize: "12px", marginLeft: "4px", cursor: "pointer" } }, "\u25BC")
      )
    ),
    // Body: Launcher + Desktop
    createElement(
      "div",
      { style: bodyStyle },
      // Launcher Sidebar
      createElement(
        "nav",
        {
          className: "unity-desktop__launcher",
          style: launcherStyle,
          "aria-label": "Application launcher"
        },
        ...LAUNCHER_ICONS.map(
          (item, i) => createElement(
            "button",
            {
              key: String(i),
              style: makeIconButtonStyle(i),
              title: item.label,
              "aria-label": item.label,
              tabIndex: 0,
              onMouseEnter: () => setHoveredIndex(i),
              onMouseLeave: () => setHoveredIndex(-1),
              onKeyDown: (e) => handleIconKeyDown(i, e),
              onClick: () => handleOpenApp(item)
            },
            createElement("span", { style: makeIconCircleStyle(item.color) }, item.letter)
          )
        ),
        // Show Applications grid button
        createElement(
          "button",
          {
            style: gridButtonStyle,
            title: "Show Applications",
            "aria-label": "Show Applications",
            tabIndex: 0,
            onMouseEnter: () => setHoveredIndex(LAUNCHER_ICONS.length),
            onMouseLeave: () => setHoveredIndex(-1),
            onClick: handleToggleAppsGrid
          },
          "\u2630"
        )
      ),
      // Main Desktop Area
      createElement(
        "main",
        {
          className: "unity-desktop__desktop",
          style: desktopStyle
        },
        ...windowElements.filter(Boolean),
        appsGridOverlay,
        props.children
      )
    )
  );
}

// ../components/page/word-processor/src/WordProcessor.ts
var MENUS = ["File", "Edit", "View", "Insert", "Format", "Tools", "Help"];
var MENU_ITEMS = {
  File: [
    { label: "New", action: "new" },
    { label: "Open", action: "open" },
    { label: "Save", action: "save" },
    { label: "Print", action: "print" }
  ],
  Edit: [
    { label: "Undo", action: "undo" },
    { label: "Redo", action: "redo" },
    { label: "Cut", action: "cut" },
    { label: "Copy", action: "copy" },
    { label: "Paste", action: "paste" }
  ],
  View: [
    { label: "Zoom In", action: "zoomIn" },
    { label: "Zoom Out", action: "zoomOut" },
    { label: "Full Screen", action: "fullScreen" }
  ],
  Insert: [
    { label: "Image", action: "insertImage" },
    { label: "Table", action: "insertTable" },
    { label: "Link", action: "insertLink" }
  ],
  Format: [
    { label: "Bold", action: "bold" },
    { label: "Italic", action: "italic" },
    { label: "Underline", action: "underline" }
  ],
  Tools: [
    { label: "Word Count", action: "wordCount" },
    { label: "Spell Check", action: "spellCheck" }
  ],
  Help: [
    { label: "About", action: "about" },
    { label: "Keyboard Shortcuts", action: "shortcuts" }
  ]
};
var FORMAT_BUTTONS = [
  { id: "bold", label: "Bold", text: "B", shortcut: "Ctrl+B", style: { fontWeight: "700" } },
  { id: "italic", label: "Italic", text: "I", shortcut: "Ctrl+I", style: { fontStyle: "italic" } },
  { id: "underline", label: "Underline", text: "U", shortcut: "Ctrl+U", style: { textDecoration: "underline" } }
];
var ALIGN_BUTTONS = [
  { label: "Align left", text: "\u2261", command: "justifyLeft" },
  { label: "Align center", text: "\u2263", command: "justifyCenter" },
  { label: "Align right", text: "\u2262", command: "justifyRight" }
];
var FONT_SIZES = ["1", "2", "3", "4", "5", "6", "7"];
var FONT_SIZE_LABELS = {
  "1": "8",
  "2": "10",
  "3": "12",
  "4": "14",
  "5": "18",
  "6": "24",
  "7": "36"
};
function buildRulerTicks() {
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const isMajor = i % 2 === 0;
    ticks.push(
      createElement("div", {
        key: String(i),
        style: {
          position: "absolute",
          left: `${i / 20 * 100}%`,
          bottom: "0",
          width: "1px",
          height: isMajor ? "10px" : "5px",
          backgroundColor: "#999"
        }
      })
    );
    if (isMajor) {
      ticks.push(
        createElement("span", {
          key: `l${i}`,
          style: {
            position: "absolute",
            left: `${i / 20 * 100}%`,
            top: "1px",
            fontSize: "8px",
            color: "#666",
            transform: "translateX(-50%)"
          }
        }, String(i / 2))
      );
    }
  }
  return ticks;
}
function computeWordCount(text) {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}
function WordProcessor(props) {
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);
  const [hoveredMenuIndex, setHoveredMenuIndex] = useState(-1);
  const [hoveredToolBtn, setHoveredToolBtn] = useState("");
  const [activeMenu, setActiveMenu] = useState(-1);
  const [wordCount, setWordCount] = useState(0);
  const [fontSize, setFontSize] = useState("3");
  const editorRef = useRef(null);
  const handleBoldClick = useCallback(() => {
    document.execCommand("bold", false);
    setBoldActive((prev) => !prev);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);
  const handleItalicClick = useCallback(() => {
    document.execCommand("italic", false);
    setItalicActive((prev) => !prev);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);
  const handleUnderlineClick = useCallback(() => {
    document.execCommand("underline", false);
    setUnderlineActive((prev) => !prev);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);
  const togglers = {
    bold: handleBoldClick,
    italic: handleItalicClick,
    underline: handleUnderlineClick
  };
  const activeStates = {
    bold: boldActive,
    italic: italicActive,
    underline: underlineActive
  };
  const handleAlignClick = useCallback((command) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);
  const handleFontSizeChange = useCallback((size) => {
    document.execCommand("fontSize", false, size);
    setFontSize(size);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);
  const handleMenuClick = useCallback((index) => {
    setActiveMenu((prev) => prev === index ? -1 : index);
  }, []);
  const handleMenuAction = useCallback((action) => {
    switch (action) {
      case "undo":
        document.execCommand("undo", false);
        break;
      case "redo":
        document.execCommand("redo", false);
        break;
      case "cut":
        document.execCommand("cut", false);
        break;
      case "copy":
        document.execCommand("copy", false);
        break;
      case "paste":
        document.execCommand("paste", false);
        break;
      case "bold":
        document.execCommand("bold", false);
        break;
      case "italic":
        document.execCommand("italic", false);
        break;
      case "underline":
        document.execCommand("underline", false);
        break;
      case "print":
        if (typeof window !== "undefined" && window.print) {
          window.print();
        }
        break;
      case "new":
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
          setWordCount(0);
        }
        break;
      default:
        break;
    }
    setActiveMenu(-1);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.textContent ?? "";
      setWordCount(computeWordCount(text));
    }
  }, []);
  const handleDocumentAreaClick = useCallback(() => {
    setActiveMenu(-1);
  }, []);
  const containerStyle3 = useMemo(() => ({
    width: "100%",
    height: "100%",
    minHeight: "500px",
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
    fontSize: "13px",
    color: "var(--color-text, #333)",
    backgroundColor: "#f0f0f0",
    overflow: "hidden"
  }), []);
  const menuBarStyle = {
    display: "flex",
    alignItems: "center",
    height: "30px",
    backgroundColor: "var(--color-bg-subtle, #ffffff)",
    borderBottom: "1px solid var(--color-border, #d0d0d0)",
    padding: "0 8px",
    gap: "2px",
    flexShrink: "0",
    position: "relative"
  };
  const toolbarStyle = {
    display: "flex",
    alignItems: "center",
    height: "36px",
    backgroundColor: "var(--color-bg-subtle, #f8f9fa)",
    borderBottom: "1px solid var(--color-border, #d0d0d0)",
    padding: "0 12px",
    gap: "12px",
    flexShrink: "0"
  };
  const rulerStyle = {
    height: "20px",
    backgroundColor: "#e8e8e8",
    borderBottom: "1px solid #ccc",
    position: "relative",
    flexShrink: "0",
    margin: "0 60px"
  };
  const documentAreaStyle = {
    flex: "1",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "30px 40px",
    overflow: "auto",
    backgroundColor: "#e0e0e0",
    cursor: "text"
  };
  const pageStyle = {
    width: "680px",
    minHeight: "880px",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 12px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.1)",
    padding: "72px 72px 96px 72px",
    boxSizing: "border-box",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#222",
    fontFamily: '"Times New Roman", Georgia, serif',
    cursor: "text",
    outline: "none"
  };
  const statusBarStyle = {
    height: "24px",
    backgroundColor: "var(--color-bg-subtle, #f0f0f0)",
    borderTop: "1px solid var(--color-border, #ccc)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    fontSize: "11px",
    color: "#666",
    flexShrink: "0"
  };
  const rulerTicks = useMemo(() => buildRulerTicks(), []);
  const displayContent = props.content ?? "Start typing...";
  const initialWordCount = computeWordCount(displayContent);
  const displayWordCount = wordCount > 0 ? wordCount : initialWordCount;
  function makeMenuItemStyle(index) {
    const isHovered = hoveredMenuIndex === index;
    const isActive = activeMenu === index;
    return {
      padding: "4px 10px",
      cursor: "pointer",
      borderRadius: "3px",
      fontSize: "13px",
      color: "var(--color-text, #333)",
      backgroundColor: isActive ? "rgba(0,0,0,0.12)" : isHovered ? "rgba(0,0,0,0.08)" : "transparent",
      border: "none",
      lineHeight: "1",
      transition: "background 0.15s",
      position: "relative"
    };
  }
  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: "0",
    minWidth: "160px",
    backgroundColor: "#ffffff",
    border: "1px solid #d0d0d0",
    borderRadius: "4px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: "4px 0",
    zIndex: "1000"
  };
  const dropdownItemStyle = {
    display: "block",
    width: "100%",
    padding: "6px 16px",
    fontSize: "13px",
    color: "#333",
    backgroundColor: "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.1s"
  };
  function makeToolBtnStyle(id, extraStyle) {
    const isActive = activeStates[id] ?? false;
    const isHovered = hoveredToolBtn === id;
    return {
      width: "28px",
      height: "28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid transparent",
      borderRadius: "3px",
      cursor: "pointer",
      fontSize: "13px",
      backgroundColor: isActive ? "rgba(0,0,0,0.12)" : isHovered ? "rgba(0,0,0,0.06)" : "transparent",
      color: "var(--color-text, #444)",
      transition: "background 0.15s",
      ...extraStyle ?? {}
    };
  }
  const fontDropdownStyle = {
    display: "flex",
    alignItems: "center",
    padding: "2px 8px",
    border: "1px solid var(--color-border, #ccc)",
    borderRadius: "3px",
    fontSize: "12px",
    color: "var(--color-text, #444)",
    backgroundColor: "transparent",
    cursor: "default",
    height: "24px",
    gap: "4px"
  };
  const fontSizeSelectStyle = {
    padding: "2px 4px",
    border: "1px solid var(--color-border, #ccc)",
    borderRadius: "3px",
    fontSize: "12px",
    color: "var(--color-text, #444)",
    backgroundColor: "transparent",
    cursor: "pointer",
    height: "24px",
    outline: "none"
  };
  const menuElements = MENUS.map((menu, i) => {
    const children = [menu];
    if (activeMenu === i && MENU_ITEMS[menu]) {
      children.push(
        createElement(
          "div",
          {
            key: "dropdown",
            style: dropdownStyle,
            className: "word-processor__menu-dropdown"
          },
          ...MENU_ITEMS[menu].map(
            (item, j) => createElement(
              "button",
              {
                key: String(j),
                style: dropdownItemStyle,
                onClick: (e) => {
                  e.stopPropagation();
                  handleMenuAction(item.action);
                },
                role: "menuitem"
              },
              item.label
            )
          )
        )
      );
    }
    return createElement(
      "button",
      {
        key: String(i),
        style: makeMenuItemStyle(i),
        role: "menuitem",
        "aria-label": menu,
        onClick: () => handleMenuClick(i),
        onMouseEnter: () => {
          setHoveredMenuIndex(i);
        },
        onMouseLeave: () => setHoveredMenuIndex(-1)
      },
      ...children
    );
  });
  return createElement(
    "div",
    {
      className: `word-processor ${props.className ?? ""}`.trim(),
      style: containerStyle3
    },
    // Menu Bar
    createElement(
      "div",
      { className: "word-processor__menu-bar", style: menuBarStyle, role: "menubar" },
      ...menuElements
    ),
    // Toolbar
    createElement(
      "div",
      { className: "word-processor__toolbar", style: toolbarStyle, role: "toolbar", "aria-label": "Formatting toolbar" },
      // Font family mock dropdown
      createElement(
        "div",
        {
          style: fontDropdownStyle,
          "aria-label": "Font family"
        },
        createElement("span", null, "Arial"),
        createElement("span", { style: { fontSize: "10px", color: "#999" } }, "\u25BC")
      ),
      // Format buttons group (Bold, Italic, Underline)
      createElement(
        "div",
        {
          key: "0",
          style: {
            display: "flex",
            gap: "2px",
            borderLeft: "1px solid var(--color-border, #ccc)",
            paddingLeft: "10px"
          }
        },
        ...FORMAT_BUTTONS.map(
          (btn) => createElement(
            "button",
            {
              key: btn.id,
              style: makeToolBtnStyle(btn.id, btn.style),
              title: btn.shortcut ? `${btn.label} (${btn.shortcut})` : btn.label,
              "aria-label": btn.label,
              "aria-pressed": String(activeStates[btn.id] ?? false),
              onClick: togglers[btn.id],
              onMouseEnter: () => setHoveredToolBtn(btn.id),
              onMouseLeave: () => setHoveredToolBtn("")
            },
            btn.text
          )
        )
      ),
      // Font size selector
      createElement(
        "div",
        {
          key: "1",
          style: {
            display: "flex",
            gap: "2px",
            borderLeft: "1px solid var(--color-border, #ccc)",
            paddingLeft: "10px",
            alignItems: "center"
          }
        },
        createElement(
          "select",
          {
            style: fontSizeSelectStyle,
            "aria-label": "Font size",
            value: fontSize,
            onChange: (e) => {
              const target = e.target;
              handleFontSizeChange(target.value);
            }
          },
          ...FONT_SIZES.map(
            (size) => createElement(
              "option",
              { key: size, value: size },
              FONT_SIZE_LABELS[size]
            )
          )
        )
      ),
      // Align buttons
      createElement(
        "div",
        {
          key: "2",
          style: {
            display: "flex",
            gap: "2px",
            borderLeft: "1px solid var(--color-border, #ccc)",
            paddingLeft: "10px"
          }
        },
        ...ALIGN_BUTTONS.map(
          (btn, bi) => createElement(
            "button",
            {
              key: String(bi),
              style: makeToolBtnStyle(`align-${bi}`),
              title: btn.label,
              "aria-label": btn.label,
              onClick: () => handleAlignClick(btn.command),
              onMouseEnter: () => setHoveredToolBtn(`align-${bi}`),
              onMouseLeave: () => setHoveredToolBtn("")
            },
            btn.text
          )
        )
      )
    ),
    // Ruler
    createElement(
      "div",
      { className: "word-processor__ruler", style: rulerStyle, "aria-hidden": "true" },
      ...rulerTicks
    ),
    // Document Area
    createElement(
      "main",
      {
        className: "word-processor__document-area",
        style: documentAreaStyle,
        onClick: handleDocumentAreaClick
      },
      createElement(
        "div",
        {
          className: "word-processor__page",
          style: pageStyle,
          contentEditable: "true",
          ref: editorRef,
          onInput: handleInput,
          suppressContentEditableWarning: true
        },
        displayContent
      )
    ),
    // Status Bar
    createElement(
      "div",
      { className: "word-processor__status-bar", style: statusBarStyle },
      createElement("span", null, "Page 1 of 1"),
      createElement("span", null, `${displayWordCount} words`),
      createElement("span", null, "100%")
    )
  );
}

// ../components/page/ide/src/IDE.ts
var MENUS2 = ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"];
var MENU_ITEMS2 = {
  File: [
    { label: "New File", action: "newFile" },
    { label: "Open", action: "open" },
    { label: "Save", action: "save" },
    { label: "Save As", action: "saveAs" }
  ],
  Edit: [
    { label: "Undo", action: "undo" },
    { label: "Redo", action: "redo" },
    { label: "Cut", action: "cut" },
    { label: "Copy", action: "copy" },
    { label: "Paste", action: "paste" }
  ],
  View: [
    { label: "Command Palette", action: "commandPalette" },
    { label: "Explorer", action: "explorer" },
    { label: "Search", action: "search" }
  ]
};
var FILE_TREE = [
  { name: "src", indent: 0, isFolder: true },
  { name: "components", indent: 1, isFolder: true, parent: "src" },
  { name: "App.ts", indent: 2, isFolder: false, parent: "components" },
  { name: "Header.ts", indent: 2, isFolder: false, parent: "components" },
  { name: "hooks", indent: 1, isFolder: true, parent: "src" },
  { name: "useAuth.ts", indent: 2, isFolder: false, parent: "hooks" },
  { name: "index.ts", indent: 1, isFolder: false, parent: "src" },
  { name: "main.ts", indent: 1, isFolder: false, parent: "src" },
  { name: "types.ts", indent: 1, isFolder: false, parent: "src" },
  { name: "package.json", indent: 0, isFolder: false },
  { name: "tsconfig.json", indent: 0, isFolder: false }
];
var FILE_CONTENTS = {
  "App.ts": [
    'import { createElement, useState } from "specifyjs";',
    "",
    "interface AppProps {",
    "  title: string;",
    "  version?: number;",
    "}",
    "",
    "export function App(props: AppProps) {",
    "  const [count, setCount] = useState(0);",
    "",
    "  const increment = () => {",
    "    setCount((prev: number) => prev + 1);",
    "  };",
    "",
    "  return createElement(",
    '    "div",',
    '    { className: "app" },',
    '    createElement("h1", null, props.title),',
    '    createElement("p", null, `Count: ${count}`),',
    "    createElement(",
    '      "button",',
    "      { onClick: increment },",
    '      "Increment",',
    "    ),",
    "  );",
    "}"
  ],
  "Header.ts": [
    'import { createElement } from "specifyjs";',
    "",
    "interface HeaderProps {",
    "  title: string;",
    "  subtitle?: string;",
    "}",
    "",
    "export function Header(props: HeaderProps) {",
    "  return createElement(",
    '    "header",',
    '    { className: "header" },',
    '    createElement("h1", null, props.title),',
    "    props.subtitle",
    '      ? createElement("p", null, props.subtitle)',
    "      : null,",
    "  );",
    "}"
  ],
  "useAuth.ts": [
    'import { useState, useCallback } from "specifyjs";',
    "",
    "interface AuthState {",
    "  user: string | null;",
    "  isLoggedIn: boolean;",
    "}",
    "",
    "export function useAuth() {",
    "  const [auth, setAuth] = useState<AuthState>({",
    "    user: null,",
    "    isLoggedIn: false,",
    "  });",
    "",
    "  const login = useCallback((username: string) => {",
    "    setAuth({ user: username, isLoggedIn: true });",
    "  }, []);",
    "",
    "  const logout = useCallback(() => {",
    "    setAuth({ user: null, isLoggedIn: false });",
    "  }, []);",
    "",
    "  return { ...auth, login, logout };",
    "}"
  ],
  "index.ts": [
    'export { App } from "./components/App";',
    'export { Header } from "./components/Header";',
    'export { useAuth } from "./hooks/useAuth";'
  ],
  "main.ts": [
    'import { createElement, createRoot } from "specifyjs";',
    'import { App } from "./components/App";',
    "",
    "const root = createRoot(",
    '  document.getElementById("root")!',
    ");",
    "",
    "root.render(",
    "  createElement(App, {",
    '    title: "My SpecifyJS App",',
    "    version: 1,",
    "  }),",
    ");"
  ],
  "types.ts": [
    "export interface User {",
    "  id: string;",
    "  name: string;",
    "  email: string;",
    '  role: "admin" | "user" | "guest";',
    "}",
    "",
    "export interface Config {",
    "  apiUrl: string;",
    "  debug: boolean;",
    "  maxRetries: number;",
    "}",
    "",
    "export type EventHandler<T = void> = (event: T) => void;"
  ],
  "package.json": [
    "{",
    '  "name": "specifyjs-app",',
    '  "version": "1.0.0",',
    '  "scripts": {',
    '    "dev": "vite",',
    '    "build": "tsc && vite build",',
    '    "preview": "vite preview"',
    "  }",
    "}"
  ],
  "tsconfig.json": [
    "{",
    '  "compilerOptions": {',
    '    "target": "ES2020",',
    '    "module": "ESNext",',
    '    "strict": true,',
    '    "jsx": "preserve"',
    "  },",
    '  "include": ["src"]',
    "}"
  ]
};
var SAMPLE_CODE = FILE_CONTENTS["App.ts"];
var KEYWORDS = /* @__PURE__ */ new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "class",
  "new",
  "throw",
  "try",
  "catch",
  "finally",
  "typeof",
  "instanceof",
  "in",
  "of",
  "default",
  "switch",
  "case",
  "break",
  "continue",
  "do",
  "void",
  "delete",
  "yield",
  "async",
  "await"
]);
var TYPES = /* @__PURE__ */ new Set([
  "string",
  "number",
  "boolean",
  "void",
  "null",
  "undefined",
  "any",
  "never",
  "unknown",
  "object",
  "interface",
  "type",
  "enum"
]);
var COL_KEYWORD = "#569cd6";
var COL_STRING = "#ce9178";
var COL_TYPE = "#4ec9b0";
var COL_COMMENT = "#6a9955";
var COL_FUNCTION = "#dcdcaa";
var COL_DEFAULT = "#d4d4d4";
var COL_PUNCTUATION = "#d4d4d4";
var COL_NUMBER = "#b5cea8";
function tokenizeLine(line) {
  if (!line.trim()) return [{ text: "\xA0", color: COL_DEFAULT }];
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === "/" && line[i + 1] === "/") {
      tokens.push({ text: line.slice(i), color: COL_COMMENT });
      break;
    }
    if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++;
        j++;
      }
      j = Math.min(j + 1, line.length);
      tokens.push({ text: line.slice(i, j), color: COL_STRING });
      i = j;
      continue;
    }
    if (/[0-9]/.test(line[i]) && (i === 0 || /[\s(,=:[\]{}+\-*/]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), color: COL_NUMBER });
      i = j;
      continue;
    }
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      let nextNonSpace = j;
      while (nextNonSpace < line.length && line[nextNonSpace] === " ") nextNonSpace++;
      const isCall = nextNonSpace < line.length && line[nextNonSpace] === "(";
      let color = COL_DEFAULT;
      if (KEYWORDS.has(word)) {
        color = COL_KEYWORD;
      } else if (TYPES.has(word)) {
        color = COL_TYPE;
      } else if (isCall) {
        color = COL_FUNCTION;
      } else if (word === "true" || word === "false") {
        color = COL_KEYWORD;
      }
      tokens.push({ text: word, color });
      i = j;
      continue;
    }
    if (line[i] === " " || line[i] === "	") {
      let j = i;
      while (j < line.length && (line[j] === " " || line[j] === "	")) j++;
      tokens.push({ text: line.slice(i, j), color: COL_DEFAULT });
      i = j;
      continue;
    }
    tokens.push({ text: line[i], color: COL_PUNCTUATION });
    i++;
  }
  return tokens;
}
function IDE(props) {
  const [activeFile, setActiveFile] = useState("App.ts");
  const [expandedFolders, setExpandedFolders] = useState({
    src: true,
    components: true,
    hooks: true
  });
  const [activeMenu, setActiveMenu] = useState(-1);
  const [lineCount, setLineCount] = useState(SAMPLE_CODE.length);
  const editorRef = useRef(null);
  const handleFileClick = useCallback((fileName) => {
    setActiveFile(fileName);
    const content = FILE_CONTENTS[fileName];
    if (content) {
      setLineCount(content.length);
    }
  }, []);
  const handleFolderToggle = useCallback((folderName) => {
    setExpandedFolders((prev) => {
      const next = {};
      const keys = Object.keys(prev);
      for (let i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[folderName] = !prev[folderName];
      return next;
    });
  }, []);
  const handleMenuClick = useCallback((index) => {
    setActiveMenu((prev) => prev === index ? -1 : index);
  }, []);
  const handleMenuAction = useCallback((action) => {
    switch (action) {
      case "undo":
        document.execCommand("undo", false);
        break;
      case "redo":
        document.execCommand("redo", false);
        break;
      case "cut":
        document.execCommand("cut", false);
        break;
      case "copy":
        document.execCommand("copy", false);
        break;
      case "paste":
        document.execCommand("paste", false);
        break;
      case "newFile":
        if (editorRef.current) {
          editorRef.current.textContent = "";
          setLineCount(1);
        }
        break;
      default:
        break;
    }
    setActiveMenu(-1);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.textContent ?? "";
      const lines = text.split("\n");
      setLineCount(Math.max(lines.length, 1));
    }
  }, []);
  const containerStyle3 = useMemo(() => ({
    width: "100%",
    height: "100%",
    minHeight: "500px",
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
    fontSize: "13px",
    color: "#cccccc",
    backgroundColor: "#1e1e1e",
    overflow: "hidden"
  }), []);
  const titleBarStyle = {
    height: "30px",
    backgroundColor: "#323233",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    color: "#999",
    flexShrink: "0",
    borderBottom: "1px solid var(--color-border, #252526)"
  };
  const menuBarStyle = {
    height: "28px",
    backgroundColor: "#3c3c3c",
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    gap: "2px",
    flexShrink: "0",
    position: "relative"
  };
  const menuItemStyleBase = {
    padding: "3px 8px",
    fontSize: "12px",
    color: "#cccccc",
    cursor: "pointer",
    borderRadius: "3px",
    backgroundColor: "transparent",
    border: "none",
    position: "relative"
  };
  const menuItemStyleActive = {
    ...menuItemStyleBase,
    backgroundColor: "rgba(255,255,255,0.1)"
  };
  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: "0",
    minWidth: "180px",
    backgroundColor: "#2d2d2d",
    border: "1px solid #454545",
    borderRadius: "4px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    padding: "4px 0",
    zIndex: "1000"
  };
  const dropdownItemStyle = {
    display: "block",
    width: "100%",
    padding: "6px 16px",
    fontSize: "12px",
    color: "#cccccc",
    backgroundColor: "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.1s"
  };
  const mainAreaStyle = {
    flex: "1",
    display: "flex",
    overflow: "hidden"
  };
  const sidebarStyle = {
    width: "220px",
    backgroundColor: "#252526",
    borderRight: "none",
    display: "flex",
    flexDirection: "column",
    flexShrink: "0",
    overflowY: "auto"
  };
  const sidebarResizeHandleStyle = {
    width: "1px",
    backgroundColor: "#007acc",
    cursor: "col-resize",
    flexShrink: "0",
    opacity: "0.4",
    transition: "opacity 0.2s"
  };
  const sidebarHeaderStyle = {
    padding: "8px 12px",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#bbbbbb"
  };
  const fileItemStyle = (indent, isFolder, isActive) => ({
    padding: "3px 8px",
    paddingLeft: `${12 + indent * 16}px`,
    fontSize: "13px",
    cursor: "pointer",
    color: isFolder ? "#cccccc" : "#d4d4d4",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    borderRadius: "3px",
    margin: "0 4px",
    transition: "background-color 0.1s",
    backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent"
  });
  const editorAreaStyle = {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  };
  const editorTabBarStyle = {
    height: "35px",
    backgroundColor: "#252526",
    display: "flex",
    alignItems: "center",
    flexShrink: "0"
  };
  const activeTabStyle = {
    padding: "0 16px",
    height: "35px",
    lineHeight: "35px",
    backgroundColor: "#1e1e1e",
    color: "#ffffff",
    fontSize: "13px",
    cursor: "pointer",
    border: "none",
    borderBottom: "2px solid #007acc",
    boxSizing: "border-box"
  };
  const editorContentStyle = {
    flex: "1",
    display: "flex",
    overflow: "auto",
    backgroundColor: "#1e1e1e",
    fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
    fontSize: "13px",
    lineHeight: "20px"
  };
  const lineNumbersStyle = {
    padding: "8px 0",
    textAlign: "right",
    color: "#858585",
    userSelect: "none",
    minWidth: "48px",
    paddingRight: "12px",
    paddingLeft: "12px",
    flexShrink: "0"
  };
  const codeAreaStyle = {
    padding: "8px 0",
    flex: "1",
    whiteSpace: "pre",
    overflowX: "auto",
    outline: "none",
    color: "#d4d4d4"
  };
  const minimapStyle = {
    width: "60px",
    backgroundColor: "#1e1e1e",
    borderLeft: "1px solid var(--color-border, #252526)",
    flexShrink: "0",
    padding: "8px 4px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    position: "relative"
  };
  const statusBarStyle = {
    height: "22px",
    backgroundColor: "#007acc",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    fontSize: "12px",
    color: "#ffffff",
    flexShrink: "0"
  };
  const statusItemStyle = {
    cursor: "pointer",
    padding: "0 6px",
    borderRadius: "3px",
    transition: "background-color 0.15s"
  };
  const viewportTop = 8;
  const viewportHeight = 30;
  const currentCode = FILE_CONTENTS[activeFile] ?? SAMPLE_CODE;
  const codeLines = currentCode.map((line, i) => {
    const tokens = tokenizeLine(line);
    const spans = [];
    let spanIdx = 0;
    for (const token of tokens) {
      spans.push(
        createElement("span", {
          key: String(spanIdx++),
          style: { color: token.color }
        }, token.text)
      );
    }
    return createElement(
      "div",
      {
        key: String(i),
        style: {
          minHeight: "20px"
        }
      },
      ...spans
    );
  });
  const actualLineCount = Math.max(lineCount, currentCode.length);
  const lineNumbers = [];
  for (let i = 0; i < actualLineCount; i++) {
    lineNumbers.push(createElement("div", {
      key: String(i)
    }, String(i + 1)));
  }
  const isItemVisible = (item) => {
    if (!item.parent) return true;
    if (!expandedFolders[item.parent]) return false;
    const parentEntry = FILE_TREE.find((e) => e.name === item.parent && e.isFolder);
    if (parentEntry) return isItemVisible(parentEntry);
    return true;
  };
  const menuElements = MENUS2.map((menu, i) => {
    const children = [menu];
    const isActive = activeMenu === i;
    if (isActive && MENU_ITEMS2[menu]) {
      children.push(
        createElement(
          "div",
          {
            key: "dropdown",
            style: dropdownStyle,
            className: "ide__menu-dropdown"
          },
          ...MENU_ITEMS2[menu].map(
            (item, j) => createElement(
              "button",
              {
                key: String(j),
                style: dropdownItemStyle,
                onClick: (e) => {
                  e.stopPropagation();
                  handleMenuAction(item.action);
                },
                role: "menuitem"
              },
              item.label
            )
          )
        )
      );
    }
    return createElement(
      "button",
      {
        key: String(i),
        style: isActive ? menuItemStyleActive : menuItemStyleBase,
        role: "menuitem",
        "aria-label": menu,
        onClick: () => handleMenuClick(i)
      },
      ...children
    );
  });
  const fileTreeElements = FILE_TREE.map((item, i) => {
    if (!isItemVisible(item)) return null;
    const isActiveFile = !item.isFolder && item.name === activeFile;
    const folderIcon = item.isFolder ? expandedFolders[item.name] ? "\u{1F4C2} " : "\u{1F4C1} " : "\u{1F4C4} ";
    return createElement(
      "div",
      {
        key: String(i),
        style: fileItemStyle(item.indent, item.isFolder, isActiveFile),
        onClick: item.isFolder ? () => handleFolderToggle(item.name) : () => handleFileClick(item.name)
      },
      folderIcon,
      item.name
    );
  });
  const visibleFileTreeElements = fileTreeElements.filter((el) => el !== null);
  return createElement(
    "div",
    {
      className: `ide ${props.className ?? ""}`.trim(),
      style: containerStyle3
    },
    // Title Bar
    createElement(
      "div",
      { className: "ide__title-bar", style: titleBarStyle },
      "SpecifyJS IDE"
    ),
    // Menu Bar
    createElement(
      "div",
      { className: "ide__menu-bar", style: menuBarStyle, role: "menubar" },
      ...menuElements
    ),
    // Main Area
    createElement(
      "div",
      { style: mainAreaStyle },
      // Sidebar
      createElement(
        "nav",
        { className: "ide__sidebar", style: sidebarStyle, "aria-label": "File explorer" },
        createElement("div", { style: sidebarHeaderStyle }, "Explorer"),
        ...visibleFileTreeElements
      ),
      // Resize handle between sidebar and editor
      createElement("div", { style: sidebarResizeHandleStyle }),
      // Editor Area
      createElement(
        "div",
        { style: editorAreaStyle },
        // Tab Bar -- shows active file name
        createElement(
          "div",
          { style: editorTabBarStyle },
          createElement("button", { style: activeTabStyle, "aria-label": activeFile }, activeFile)
        ),
        // Editor Content
        createElement(
          "div",
          { style: editorContentStyle },
          // Line Numbers
          createElement(
            "div",
            { style: lineNumbersStyle, "aria-hidden": "true" },
            ...lineNumbers
          ),
          // Code - contentEditable
          createElement(
            "code",
            {
              style: codeAreaStyle,
              contentEditable: "true",
              ref: editorRef,
              onInput: handleEditorInput,
              suppressContentEditableWarning: true
            },
            ...codeLines
          )
        )
      ),
      // Minimap
      createElement(
        "div",
        { className: "ide__minimap", style: minimapStyle, "aria-hidden": "true" },
        // Viewport indicator
        createElement("div", {
          style: {
            position: "absolute",
            top: `${viewportTop}px`,
            left: "0",
            right: "0",
            height: `${viewportHeight}px`,
            backgroundColor: "rgba(100, 100, 200, 0.15)",
            border: "1px solid rgba(100, 100, 200, 0.3)",
            borderRadius: "2px",
            pointerEvents: "none"
          }
        }),
        ...currentCode.map(
          (line, i) => createElement("div", {
            key: String(i),
            style: {
              height: "2px",
              backgroundColor: line.trim() ? "#555555" : "transparent",
              borderRadius: "1px",
              width: `${Math.min(100, line.length * 2)}%`
            }
          })
        )
      )
    ),
    // Status Bar
    createElement(
      "div",
      { className: "ide__status-bar", style: statusBarStyle },
      createElement(
        "div",
        { style: { display: "flex", gap: "16px" } },
        createElement("span", { style: statusItemStyle }, "\u2387 main"),
        createElement("span", { style: statusItemStyle }, "0 errors"),
        createElement("span", { style: statusItemStyle }, "0 warnings")
      ),
      createElement(
        "div",
        { style: { display: "flex", gap: "16px" } },
        createElement("span", { style: statusItemStyle }, "Ln 1, Col 1"),
        createElement("span", { style: statusItemStyle }, "UTF-8"),
        createElement("span", { style: statusItemStyle }, "TypeScript")
      )
    )
  );
}

// ../components/page/trading-dashboard/src/TradingDashboard.ts
var WATCHLIST = [
  { symbol: "AAPL", price: 189.42, change: 1.23, volume: 523e5, spark: [186, 187, 188, 187, 189] },
  { symbol: "GOOGL", price: 141.8, change: -0.87, volume: 231e5, spark: [143, 142, 141, 142, 141] },
  { symbol: "MSFT", price: 378.91, change: 2.45, volume: 187e5, spark: [375, 376, 378, 377, 379] },
  { symbol: "AMZN", price: 185.63, change: -1.12, volume: 314e5, spark: [187, 186, 186, 185, 185] },
  { symbol: "TSLA", price: 248.5, change: 3.78, volume: 672e5, spark: [244, 245, 247, 246, 249] },
  { symbol: "NVDA", price: 875.3, change: 12.5, volume: 418e5, spark: [860, 865, 870, 868, 876] }
];
var ORDER_BOOK_BIDS = [
  { price: 189.4, qty: 1200 },
  { price: 189.38, qty: 3400 },
  { price: 189.35, qty: 800 },
  { price: 189.32, qty: 5600 },
  { price: 189.3, qty: 2100 },
  { price: 189.28, qty: 4300 }
];
var ORDER_BOOK_ASKS = [
  { price: 189.44, qty: 900 },
  { price: 189.47, qty: 2200 },
  { price: 189.5, qty: 1500 },
  { price: 189.53, qty: 3800 },
  { price: 189.55, qty: 1100 },
  { price: 189.58, qty: 2700 }
];
var POSITIONS = [
  { symbol: "AAPL", qty: 100, avgPrice: 185.2, currentPrice: 189.42, pnl: 422 },
  { symbol: "MSFT", qty: 50, avgPrice: 382.1, currentPrice: 378.91, pnl: -159.5 },
  { symbol: "NVDA", qty: 25, avgPrice: 850, currentPrice: 875.3, pnl: 632.5 }
];
var RECENT_TRADES = [
  { time: "14:32:01", symbol: "AAPL", side: "BUY", qty: 50, price: 189.42 },
  { time: "14:31:45", symbol: "MSFT", side: "SELL", qty: 25, price: 378.95 },
  { time: "14:30:22", symbol: "TSLA", side: "BUY", qty: 100, price: 247.8 },
  { time: "14:29:58", symbol: "NVDA", side: "BUY", qty: 10, price: 874.5 },
  { time: "14:28:33", symbol: "GOOGL", side: "SELL", qty: 75, price: 142.1 }
];
var CHART_DATA = [
  185.2,
  186.1,
  185.8,
  187.5,
  188.2,
  187.9,
  186.5,
  187.8,
  188.4,
  189.1,
  188.6,
  187.2,
  188.5,
  189.8,
  189.2,
  188.9,
  189.5,
  190.1,
  189.4,
  188.8,
  189.6,
  190.3,
  189.9,
  189.42
];
var DEPTH_BIDS = [
  { price: 189.4, volume: 1200 },
  { price: 189.35, volume: 3400 },
  { price: 189.3, volume: 2800 },
  { price: 189.25, volume: 5100 },
  { price: 189.2, volume: 4200 }
];
var DEPTH_ASKS = [
  { price: 189.45, volume: 900 },
  { price: 189.5, volume: 2600 },
  { price: 189.55, volume: 1800 },
  { price: 189.6, volume: 4400 },
  { price: 189.65, volume: 3100 }
];
var TIME_LABELS = ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00"];
function formatVolume(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function formatWithCommas(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function formatPrice(n) {
  return n.toFixed(2);
}
var cellStyle = {
  backgroundColor: "#1a1a2e",
  borderRadius: "4px",
  padding: "12px",
  border: "1px solid #2a2a4a",
  overflow: "auto",
  display: "flex",
  flexDirection: "column"
};
var cellTitleStyle = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#8888aa",
  marginBottom: "8px",
  flexShrink: "0"
};
var tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px"
};
var thStyle = {
  textAlign: "left",
  padding: "4px 6px",
  borderBottom: "1px solid #2a2a4a",
  color: "#8888aa",
  fontWeight: "600",
  fontSize: "11px"
};
var tdStyle = {
  padding: "3px 6px",
  borderBottom: "1px solid #16162a",
  color: "#ccccdd",
  fontSize: "12px"
};
var hoverRowStyle = {
  cursor: "default",
  transition: "background-color 0.1s"
};
function buildSparkline(data, isPositive) {
  const w = 40;
  const h = 14;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range2 = max - min || 1;
  const points = data.map((v, i) => {
    const x = i / (data.length - 1) * w;
    const y = h - (v - min) / range2 * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const color = isPositive ? "#00c853" : "#ff1744";
  return createElement(
    "svg",
    {
      viewBox: `0 0 ${w} ${h}`,
      style: {
        width: "40px",
        height: "14px",
        display: "inline-block",
        verticalAlign: "middle",
        marginLeft: "4px"
      },
      "aria-hidden": "true"
    },
    createElement("polyline", {
      points,
      fill: "none",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })
  );
}
function buildPriceChart(data, currentPrice) {
  const width = 360;
  const height = 160;
  const padX = 40;
  const padY = 15;
  const padBottom = 25;
  const chartHeight = height - padY - padBottom;
  const chartWidth = width - padX - 10;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range2 = max - min || 1;
  const stepX = chartWidth / (data.length - 1);
  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - (v - min) / range2) * chartHeight;
    return { x, y };
  });
  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `M${padX},${padY + chartHeight} ` + points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + ` L${points[points.length - 1].x.toFixed(1)},${padY + chartHeight} Z`;
  const segments = [];
  for (let i = 1; i < data.length; i++) {
    const color = data[i] >= data[i - 1] ? "#00c853" : "#ff1744";
    segments.push(
      createElement("line", {
        key: String(i),
        x1: String(points[i - 1].x.toFixed(1)),
        y1: String(points[i - 1].y.toFixed(1)),
        x2: String(points[i].x.toFixed(1)),
        y2: String(points[i].y.toFixed(1)),
        stroke: color,
        strokeWidth: "2",
        strokeLinecap: "round"
      })
    );
  }
  const gridLines = [];
  for (let i = 0; i < 5; i++) {
    const y = padY + i / 4 * chartHeight;
    const priceVal = max - i / 4 * range2;
    gridLines.push(
      createElement("line", {
        key: `g${i}`,
        x1: String(padX),
        y1: String(y.toFixed(1)),
        x2: String(width - 10),
        y2: String(y.toFixed(1)),
        stroke: "#2a2a4a",
        strokeWidth: "0.5",
        strokeDasharray: "3,3"
      })
    );
    gridLines.push(
      createElement("text", {
        key: `yl${i}`,
        x: String(padX - 4),
        y: String((y + 3).toFixed(1)),
        fill: "#6666aa",
        fontSize: "8",
        textAnchor: "end",
        fontFamily: "monospace"
      }, formatPrice(priceVal))
    );
  }
  const timeLabels = [];
  const labelCount = Math.min(TIME_LABELS.length, data.length);
  const labelStep = (data.length - 1) / (labelCount - 1);
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round(i * labelStep);
    const x = padX + idx * stepX;
    timeLabels.push(
      createElement("text", {
        key: `tl${i}`,
        x: String(x.toFixed(1)),
        y: String(height - 4),
        fill: "#6666aa",
        fontSize: "8",
        textAnchor: "middle",
        fontFamily: "monospace"
      }, TIME_LABELS[i])
    );
  }
  const gradientId = "chartGrad";
  return createElement(
    "div",
    { style: cellStyle },
    createElement(
      "div",
      { style: cellTitleStyle },
      "AAPL ",
      createElement("span", { style: { color: "#00c853", fontSize: "14px", fontWeight: "700" } }, `$${formatPrice(currentPrice)}`),
      createElement("span", { style: { color: "#00c853", fontSize: "11px", marginLeft: "8px" } }, "+1.23%")
    ),
    createElement(
      "svg",
      {
        viewBox: `0 0 ${width} ${height}`,
        style: { width: "100%", flex: "1", minHeight: "0" },
        "aria-label": "Price chart",
        role: "img"
      },
      // Gradient definition
      createElement(
        "defs",
        null,
        createElement(
          "linearGradient",
          { id: gradientId, x1: "0", y1: "0", x2: "0", y2: "1" },
          createElement("stop", { offset: "0%", stopColor: "#00c853", stopOpacity: "0.3" }),
          createElement("stop", { offset: "100%", stopColor: "#00c853", stopOpacity: "0.02" })
        )
      ),
      // Area fill under the line
      createElement("path", {
        d: areaPath,
        fill: `url(#${gradientId})`
      }),
      ...gridLines,
      ...timeLabels,
      ...segments,
      // Current price dotted line
      createElement("line", {
        x1: String(padX),
        y1: String((padY + (1 - (currentPrice - min) / range2) * chartHeight).toFixed(1)),
        x2: String(width - 10),
        y2: String((padY + (1 - (currentPrice - min) / range2) * chartHeight).toFixed(1)),
        stroke: "#00c853",
        strokeWidth: "0.5",
        strokeDasharray: "4,2",
        opacity: "0.6"
      })
    )
  );
}
function buildOrderBook() {
  const maxQty = Math.max(
    ...ORDER_BOOK_BIDS.map((b) => b.qty),
    ...ORDER_BOOK_ASKS.map((a) => a.qty)
  );
  return createElement(
    "div",
    { style: cellStyle },
    createElement("div", { style: cellTitleStyle }, "Order Book"),
    createElement(
      "table",
      { style: tableStyle },
      createElement(
        "thead",
        null,
        createElement(
          "tr",
          null,
          createElement("th", { style: thStyle }, "Bid Price"),
          createElement("th", { style: thStyle }, "Qty"),
          createElement("th", { style: thStyle }, "Ask Price"),
          createElement("th", { style: thStyle }, "Qty")
        )
      ),
      createElement(
        "tbody",
        null,
        ...ORDER_BOOK_BIDS.map((bid, i) => {
          const ask = ORDER_BOOK_ASKS[i];
          const bidIntensity = bid.qty / maxQty * 0.25;
          const askIntensity = (ask?.qty ?? 0) / maxQty * 0.25;
          return createElement(
            "tr",
            {
              key: String(i),
              style: hoverRowStyle
            },
            createElement("td", {
              style: {
                ...tdStyle,
                color: "#00c853",
                backgroundColor: `rgba(0,200,83,${bidIntensity.toFixed(3)})`,
                fontFamily: "monospace"
              }
            }, formatPrice(bid.price)),
            createElement("td", {
              style: {
                ...tdStyle,
                backgroundColor: `rgba(0,200,83,${(bidIntensity * 0.5).toFixed(3)})`,
                fontFamily: "monospace"
              }
            }, formatWithCommas(bid.qty)),
            createElement("td", {
              style: {
                ...tdStyle,
                color: "#ff1744",
                backgroundColor: `rgba(255,23,68,${askIntensity.toFixed(3)})`,
                fontFamily: "monospace"
              }
            }, ask ? formatPrice(ask.price) : ""),
            createElement("td", {
              style: {
                ...tdStyle,
                backgroundColor: `rgba(255,23,68,${(askIntensity * 0.5).toFixed(3)})`,
                fontFamily: "monospace"
              }
            }, ask ? formatWithCommas(ask.qty) : "")
          );
        })
      )
    )
  );
}
function buildWatchlist(priceOffset) {
  return createElement(
    "div",
    { style: cellStyle },
    createElement("div", { style: cellTitleStyle }, "Watchlist"),
    createElement(
      "table",
      { style: tableStyle },
      createElement(
        "thead",
        null,
        createElement(
          "tr",
          null,
          createElement("th", { style: thStyle }, "Symbol"),
          createElement("th", { style: thStyle }, "Price"),
          createElement("th", { style: thStyle }, "Chg%"),
          createElement("th", { style: thStyle }, "Volume")
        )
      ),
      createElement(
        "tbody",
        null,
        ...WATCHLIST.map((item, i) => {
          const adjustedPrice = item.price + (i === 0 ? priceOffset : 0);
          const isPositive = item.change >= 0;
          return createElement(
            "tr",
            {
              key: String(i),
              style: hoverRowStyle
            },
            createElement(
              "td",
              { style: { ...tdStyle, fontWeight: "600", color: "#ffffff" } },
              item.symbol,
              buildSparkline(item.spark, isPositive)
            ),
            createElement("td", { style: { ...tdStyle, fontFamily: "monospace" } }, formatPrice(adjustedPrice)),
            createElement("td", {
              style: { ...tdStyle, color: isPositive ? "#00c853" : "#ff1744", fontWeight: "600" }
            }, `${isPositive ? "+" : ""}${formatPrice(item.change)}%`),
            createElement("td", { style: { ...tdStyle, fontFamily: "monospace", color: "#8888aa" } }, formatVolume(item.volume))
          );
        })
      )
    )
  );
}
function buildPositions() {
  const totalPnl = POSITIONS.reduce((sum, p) => sum + p.pnl, 0);
  const totalPositive = totalPnl >= 0;
  return createElement(
    "div",
    { style: cellStyle },
    createElement(
      "div",
      { style: cellTitleStyle },
      "Positions",
      createElement("span", {
        style: {
          marginLeft: "12px",
          color: totalPositive ? "#00c853" : "#ff1744",
          fontWeight: "700",
          fontSize: "12px"
        }
      }, `${totalPositive ? "+" : ""}$${formatPrice(totalPnl)}`)
    ),
    createElement(
      "table",
      { style: tableStyle },
      createElement(
        "thead",
        null,
        createElement(
          "tr",
          null,
          createElement("th", { style: thStyle }, "Symbol"),
          createElement("th", { style: thStyle }, "Qty"),
          createElement("th", { style: thStyle }, "Avg"),
          createElement("th", { style: thStyle }, "P&L")
        )
      ),
      createElement(
        "tbody",
        null,
        ...POSITIONS.map((pos, i) => {
          const isPositive = pos.pnl >= 0;
          return createElement(
            "tr",
            {
              key: String(i),
              style: {
                ...hoverRowStyle,
                backgroundColor: isPositive ? "rgba(0,200,83,0.04)" : "rgba(255,23,68,0.04)"
              }
            },
            createElement("td", { style: { ...tdStyle, fontWeight: "600", color: "#ffffff" } }, pos.symbol),
            createElement("td", { style: { ...tdStyle, fontFamily: "monospace" } }, String(pos.qty)),
            createElement("td", { style: { ...tdStyle, fontFamily: "monospace" } }, formatPrice(pos.avgPrice)),
            createElement("td", {
              style: {
                ...tdStyle,
                color: isPositive ? "#00c853" : "#ff1744",
                fontWeight: "700",
                fontFamily: "monospace"
              }
            }, `${isPositive ? "+" : ""}$${formatPrice(pos.pnl)}`)
          );
        })
      )
    )
  );
}
function buildRecentTrades() {
  return createElement(
    "div",
    { style: cellStyle },
    createElement("div", { style: cellTitleStyle }, "Recent Trades"),
    createElement(
      "table",
      { style: tableStyle },
      createElement(
        "thead",
        null,
        createElement(
          "tr",
          null,
          createElement("th", { style: thStyle }, "Time"),
          createElement("th", { style: thStyle }, "Sym"),
          createElement("th", { style: thStyle }, "Side"),
          createElement("th", { style: thStyle }, "Qty"),
          createElement("th", { style: thStyle }, "Price")
        )
      ),
      createElement(
        "tbody",
        null,
        ...RECENT_TRADES.map((trade, i) => {
          const isBuy = trade.side === "BUY";
          return createElement(
            "tr",
            {
              key: String(i),
              style: hoverRowStyle
            },
            createElement("td", { style: { ...tdStyle, color: "#8888aa", fontFamily: "monospace" } }, trade.time),
            createElement("td", { style: { ...tdStyle, fontWeight: "600", color: "#ffffff" } }, trade.symbol),
            createElement("td", {
              style: { ...tdStyle, color: isBuy ? "#00c853" : "#ff1744", fontWeight: "600" }
            }, trade.side),
            createElement("td", { style: { ...tdStyle, fontFamily: "monospace" } }, formatWithCommas(trade.qty)),
            createElement("td", { style: { ...tdStyle, fontFamily: "monospace" } }, formatPrice(trade.price))
          );
        })
      )
    )
  );
}
function buildMarketDepth() {
  const maxVolume = Math.max(
    ...DEPTH_BIDS.map((b) => b.volume),
    ...DEPTH_ASKS.map((a) => a.volume)
  );
  const barHeight = "16px";
  return createElement(
    "div",
    { style: cellStyle },
    createElement("div", { style: cellTitleStyle }, "Market Depth"),
    createElement(
      "div",
      { style: { flex: "1", display: "flex", flexDirection: "column", gap: "2px", justifyContent: "center" } },
      ...DEPTH_BIDS.map(
        (bid, i) => createElement(
          "div",
          {
            key: `b${i}`,
            style: { display: "flex", alignItems: "center", gap: "6px" }
          },
          createElement("span", { style: { width: "52px", fontSize: "11px", color: "#8888aa", textAlign: "right", fontFamily: "monospace" } }, formatPrice(bid.price)),
          createElement("div", {
            style: {
              height: barHeight,
              width: `${bid.volume / maxVolume * 100}%`,
              backgroundColor: "#00c853",
              opacity: "0.6",
              borderRadius: "2px",
              maxWidth: "60%",
              transition: "width 0.3s"
            }
          }),
          createElement("span", { style: { fontSize: "11px", color: "#ccccdd", fontFamily: "monospace" } }, formatWithCommas(bid.volume))
        )
      ),
      // Separator
      createElement("div", { style: { height: "1px", backgroundColor: "#2a2a4a", margin: "4px 0" } }),
      ...DEPTH_ASKS.map(
        (ask, i) => createElement(
          "div",
          {
            key: `a${i}`,
            style: { display: "flex", alignItems: "center", gap: "6px" }
          },
          createElement("span", { style: { width: "52px", fontSize: "11px", color: "#8888aa", textAlign: "right", fontFamily: "monospace" } }, formatPrice(ask.price)),
          createElement("div", {
            style: {
              height: barHeight,
              width: `${ask.volume / maxVolume * 100}%`,
              backgroundColor: "#ff1744",
              opacity: "0.6",
              borderRadius: "2px",
              maxWidth: "60%",
              transition: "width 0.3s"
            }
          }),
          createElement("span", { style: { fontSize: "11px", color: "#ccccdd", fontFamily: "monospace" } }, formatWithCommas(ask.volume))
        )
      )
    )
  );
}
function TradingDashboard(props) {
  const [priceOffset, setPriceOffset] = useState(0);
  const [clockTime, setClockTime] = useState("--:--:--");
  const [liveVisible, setLiveVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setPriceOffset((_prev) => {
        const delta = (Math.random() - 0.5) * 0.5;
        return Math.round(delta * 100) / 100;
      });
    }, 2e3);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const updateClock = () => {
      const now = /* @__PURE__ */ new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setClockTime(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1e3);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveVisible((prev) => !prev);
    }, 800);
    return () => clearInterval(interval);
  }, []);
  const containerStyle3 = useMemo(() => ({
    width: "100%",
    height: "100%",
    minHeight: "500px",
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
    fontSize: "13px",
    color: "#ccccdd",
    backgroundColor: "#0d0d1a",
    overflow: "hidden"
  }), []);
  const headerStyle = {
    height: "40px",
    backgroundColor: "#12122a",
    borderBottom: "1px solid #2a2a4a",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    flexShrink: "0"
  };
  const headerTitleStyle = {
    fontSize: "14px",
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };
  const gridStyle = {
    flex: "1",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    gap: "8px",
    padding: "8px",
    overflow: "hidden"
  };
  const currentPrice = 189.42 + priceOffset;
  const liveDotStyle = {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#00c853",
    display: "inline-block",
    marginRight: "4px",
    opacity: liveVisible ? "1" : "0.3",
    transition: "opacity 0.3s"
  };
  return createElement(
    "div",
    {
      className: `trading-dashboard ${props.className ?? ""}`.trim(),
      style: containerStyle3
    },
    // Header
    createElement(
      "header",
      { className: "trading-dashboard__header", style: headerStyle },
      createElement(
        "span",
        { style: headerTitleStyle },
        "SpecifyJS Trading Platform",
        createElement(
          "span",
          {
            style: {
              display: "flex",
              alignItems: "center",
              fontSize: "11px",
              color: "#00c853",
              fontWeight: "600",
              marginLeft: "8px"
            }
          },
          createElement("span", { style: liveDotStyle }),
          "LIVE"
        )
      ),
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "16px", fontSize: "12px" } },
        createElement("span", { style: { color: "#ffffff", fontFamily: "monospace", fontWeight: "600", fontSize: "13px" } }, clockTime),
        createElement("span", { style: { color: "#8888aa" } }, "Account: SJS-28401"),
        createElement("span", { style: { color: "#00c853" } }, "Balance: $124,582.30"),
        createElement("span", { style: { color: "#8888aa" } }, "Status: Connected")
      )
    ),
    // Grid
    createElement(
      "div",
      { className: "trading-dashboard__grid", style: gridStyle },
      buildPriceChart(CHART_DATA, currentPrice),
      buildOrderBook(),
      buildWatchlist(priceOffset),
      buildPositions(),
      buildRecentTrades(),
      buildMarketDepth()
    )
  );
}
export {
  Accordion,
  Alert,
  AnalogClock,
  Avatar,
  Badge,
  BarGraph,
  Breadcrumb,
  Card,
  Carousel,
  CartesianGraph2D,
  Checkbox,
  Children,
  ColorPicker,
  ColorWheel,
  ComplexGraph2D,
  Component,
  ContextMenu,
  DataGrid,
  DatePicker,
  DigitalClock,
  Drawer,
  Dropdown,
  EmptyState,
  ErrorBoundary,
  FeatureFlagProvider,
  FeatureGate,
  FileUpload,
  FlexContainer,
  FlexItem,
  Footer,
  FormFieldWrapper,
  Fragment,
  GoogleAnalytics,
  Grid,
  GridItem,
  HypercubeGraph,
  IDE,
  Image,
  LineGraph,
  Link,
  ListView,
  Menubar,
  Modal,
  MultilineField,
  NavWrapper,
  NumberSpinner,
  Pagination,
  Panel,
  PieGraph,
  PolarGraph2D,
  Popover,
  Profiler,
  ProgressBar,
  PureComponent,
  RadioGroup,
  Route,
  Router,
  ScrollContainer,
  Select,
  Sidebar,
  Skeleton,
  Slider,
  Spinner,
  Splitter,
  Stepper,
  StrictMode,
  Suspense,
  Tabs,
  Tag,
  TextEditor,
  TextField,
  TimePicker,
  ToastContainer,
  Toggle,
  Toolbar,
  Tooltip,
  TradingDashboard,
  TreeNav,
  TreeNode,
  UnityDesktop,
  VideoPlayer,
  VirtualScroll,
  VizWrapper,
  WordProcessor,
  act,
  assertSecureUrl,
  buildInputStyle,
  buildNavItemStyle,
  buildRotationMatrix,
  cloneElement,
  computeMandelbrotGrid,
  computeSlices,
  createContext,
  createElement,
  createFactory,
  createPortal,
  createRef,
  createRoot,
  createToaster,
  describeArc,
  flushSync,
  forwardRef,
  generateEdges,
  generateHypercube,
  generatePalette,
  generateVertices,
  getComponentTypeTable,
  createElement as h,
  hydrate,
  hydrateRoot,
  isValidElement,
  lazy,
  matchPath,
  memo,
  numRotationAngles,
  projectTo2D,
  render,
  resolveComponentId,
  secureFetch,
  setComponentIdsEnabled,
  startTransition,
  transformVec,
  unmountComponentAtNode,
  useBarGraphScales,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useFeatureFlags,
  useHead,
  useHover,
  useHypercube,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useLineGraphScales,
  useMemo,
  useNavigate,
  useParams,
  useReducer,
  useRef,
  useRouter,
  useState,
  useSyncExternalStore,
  useToast,
  useTransition
};
