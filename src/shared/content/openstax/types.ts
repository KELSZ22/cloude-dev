export type OpenStaxPackCategory =
  "science" | "history" | "technology" | "culture";

export type OpenStaxPackRecord = {
  id: string;
  title: string;
  category: OpenStaxPackCategory;
  resourceCount: number;
  bookCount: number;
  sizeBytes: number;
  sizeMb: number;
  updatedAt: string;
  description: string;
  highlights: string[];
  publisher: string;
};

export type OpenStaxBookRecord = {
  id: string;
  slug: string;
  bookId: number;
  title: string;
  packId: string;
  packTitle: string;
  category: OpenStaxPackCategory;
  locale: string;
  summary: string;
  overview: string;
  highlight: string;
  resourceCount: number;
  sizeBytes: number;
  coverUrl: string | null;
  sourcePage: string | null;
  licenseName: string;
  licenseUrl: string | null;
  /** Direct textbook PDF from the OpenStax download manifest, when one was retrieved. */
  pdfUrl: string | null;
  updatedAt: string;
  tags: string;
  readMinutes: number;
};

export type OpenStaxPackAsset = {
  path: string;
  url: string;
  bytes: number;
  sha256: string | null;
};

export type OpenStaxPackAssetsFile = {
  schemaVersion: number;
  generatedAt: string;
  packs: Record<
    string,
    {
      totalBytes: number;
      assets: OpenStaxPackAsset[];
    }
  >;
};

export type OpenStaxInitialResources = {
  schemaVersion: number;
  generatedAt: string;
  source: {
    name: string;
    catalogRetrievedAt: string;
    verification: {
      verifiedAt: string;
      books: number;
      downloadedAssets: number;
      downloadedBytes: number;
    };
  };
  packs: OpenStaxPackRecord[];
  books: OpenStaxBookRecord[];
};
