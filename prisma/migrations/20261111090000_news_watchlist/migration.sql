-- Keyword fetching for the Sources station: one shared setup row.
CREATE TABLE "NewsWatchlist" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "includeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchArticles" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "NewsWatchlist_pkey" PRIMARY KEY ("id")
);
