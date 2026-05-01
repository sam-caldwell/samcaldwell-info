import { Router, Route, useRouter, useHead } from 'specifyjs';
import { h } from './h.js';
import { AppSidebar } from './components/AppSidebar.js';
import { AppFooter } from './components/AppFooter.js';
import { routes } from './routes.js';

/** Wrapper that sets useHead based on the matched route */
function PageWithHead(props: { component: Function; title: string; description: string }) {
  useHead({
    title: `${props.title} \u2014 samcaldwell.info`,
    description: props.description,
  });
  return h(props.component, null);
}

function AppContent() {
  const { pathname } = useRouter();

  // Find matched route for 404 detection
  const matched = routes.find(r => {
    if (r.exact) return r.path === pathname;
    return pathname.startsWith(r.path);
  });

  return h('div', { className: 'app-main' },
    h('div', { className: 'app-content' },
      ...routes.map(r =>
        h(Route, {
          key: r.path,
          path: r.path,
          exact: r.exact,
          component: () => h(PageWithHead, {
            component: r.component,
            title: r.title,
            description: r.description,
          }),
        })
      ),
      // 404 fallback
      !matched ? h('div', null,
        h('h1', null, 'Page not found'),
        h('p', null, 'The page you requested does not exist.'),
      ) : null,
    ),
    h(AppFooter, null),
  );
}

export function App() {
  return h(Router, null,
    h('div', { className: 'app-layout' },
      h(AppSidebar, null),
      h(AppContent, null),
    ),
  );
}
