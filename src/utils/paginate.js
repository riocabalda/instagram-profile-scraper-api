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
