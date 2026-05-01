import { useHead } from 'specifyjs';

/** Convenience wrapper to set page-specific SEO meta tags */
export function useSeoHead(title: string, description: string): void {
  useHead({
    title: `${title} \u2014 samcaldwell.info`,
    description,
  });
}
