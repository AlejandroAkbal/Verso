export type OpdsAuth = {
  username: string;
  password: string;
};

export type OPDSEntry = {
  id: string;
  title: string;
  author: string;
  summary: string;
  coverUrl: string;
  downloadUrl: string;
  mime: string;
  updated: string;
  categories: string[];
};

export type OPDSNavigationEntry = {
  title: string;
  href: string;
};

export type OPDSFeed = {
  title: string;
  entries: OPDSEntry[];
  navigationEntries: OPDSNavigationEntry[];
  nextUrl: string | null;
  searchUrl: string | null;
};

export type ParsedBook = OPDSEntry & {
  bookId: string;
  serverId: string;
  opdsId: string;
};
