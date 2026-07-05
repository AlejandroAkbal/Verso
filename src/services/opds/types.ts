export type OPDSEntry = {
  id: string;
  title: string;
  author: string;
  summary: string;
  coverUrl: string;
  downloadUrl: string;
  mime: string;
  updated: string;
};

export type OPDSFeed = {
  title: string;
  entries: OPDSEntry[];
  nextUrl: string | null;
};

export type ParsedBook = OPDSEntry & {
  bookId: string;
  serverId: string;
  opdsId: string;
};
