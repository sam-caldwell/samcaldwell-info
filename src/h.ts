/**
 * Re-export createElement with a relaxed type signature.
 * SpecifyJS's strict Props generic makes createElement<P> reject
 * custom component props that don't extend Props exactly. This wrapper
 * preserves runtime behavior while accepting any component + props.
 */
import { createElement as _createElement } from 'specifyjs';

export const h: (type: any, props: any, ...children: any[]) => any = _createElement as any;
