/** Stable IDs so re-runs of seeding never duplicate rows. */
export type DefaultServerSeed = {
  id: string;
  title: string;
  url: string;
};

/** Public OPDS catalogs bundled for demo use and library-switch testing. */
export const DEFAULT_PUBLIC_SERVERS: readonly DefaultServerSeed[] = [
  {
    id: 'seed-gutenberg-popular',
    title: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/ebooks/search.opds/?sort_order=downloads',
  },
  {
    id: 'seed-gutenberg-latest',
    title: 'Project Gutenberg (Latest)',
    url: 'https://www.gutenberg.org/ebooks/search.opds/?sort_order=release_date',
  },
] as const;
