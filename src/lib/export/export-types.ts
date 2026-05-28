export type ExportWorkRow = Record<string, string | number>;

export type ExportWorkFilters = {
  author?: string;
  category?: string;
  externalId?: string;
  ids?: string[];
  rating?: string;
  reviewStatus?: string;
  title?: string;
};

export type ExportWorkbookPayload = {
  rows: ExportWorkRow[];
  fileName: string;
};
