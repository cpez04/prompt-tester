"use client";

import { TestRun } from "@/types/admin";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  testRun: TestRun | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  isOpen,
  testRun,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">Delete Test Run</h3>
        <p className="py-4">
          Are you sure you want to delete the test run &quot;{testRun?.assistantName}&quot;? 
          This action cannot be undone.
        </p>
        <div className="modal-action">
          <button className="btn" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button
            className="btn btn-error"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}