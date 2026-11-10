export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  /** UTC ISO instant. */
  createdAt: string;
  /** "Sarah B.": first name and initial only. */
  author: string;
};

export type ReviewPage = {
  reviews: PublicReview[];
  /** Published reviews of the restaurant, all pages. */
  count: number;
  /** Mean rating to one decimal, or null with no review. */
  average: number | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
