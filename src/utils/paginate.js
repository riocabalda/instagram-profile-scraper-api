export const withPagination = (results) => {
  return {
    total: results.totalDocs,
    page_size: results.limit,
    total_pages: results.totalPages,
    current_page: results.page,
    has_prev_page: results.hasPrevPage,
    has_next_page: results.hasNextPage,
    prev_page: results.prevPage,
    next_page: results.nextPage,
  };
};

/**
 * Pagination metadata in the same shape mongoose-paginate-v2 exposes to withPagination.
 * @param {number} totalDocs
 * @param {number} page 1-based
 * @param {number} limit
 */
export const paginationFromCount = (totalDocs, page, limit) => {
  const totalPages = limit > 0 ? Math.ceil(totalDocs / limit) || 1 : 1;
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;
  return withPagination({
    totalDocs,
    limit,
    page,
    totalPages,
    hasPrevPage,
    hasNextPage,
    prevPage: hasPrevPage ? page - 1 : null,
    nextPage: hasNextPage ? page + 1 : null,
  });
};
