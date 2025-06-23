import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const PaginationControls = ({
  currentPage,
  totalPages,
  setCurrentPage,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center mt-4 space-x-4">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="flex items-center space-x-2 px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <ArrowLeft size={16} />
        <span>Previous</span>
      </button>
      <span className="text-gray-700 dark:text-gray-300 text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center space-x-2 px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <span>Next</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
};
