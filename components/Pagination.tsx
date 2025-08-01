interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPage = parseInt(e.target.value) - 1;
    if (
      !isNaN(newPage) &&
      newPage >= 0 &&
      newPage < totalPages
    ) {
      onPageChange(newPage);
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const newPage = parseInt(e.currentTarget.value) - 1;
      if (
        !isNaN(newPage) &&
        newPage >= 0 &&
        newPage < totalPages
      ) {
        onPageChange(newPage);
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        className="btn btn-sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0 || isLoading}
      >
        Previous
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm">Page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage + 1}
          onChange={handlePageInputChange}
          onKeyDown={handlePageInputKeyDown}
          className="input input-bordered input-sm w-16 text-center"
          disabled={isLoading}
        />
        <span className="text-sm">
          of {totalPages}
        </span>
      </div>
      <button
        className="btn btn-sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage + 1 >= totalPages || isLoading}
      >
        Next
      </button>
    </div>
  );
}