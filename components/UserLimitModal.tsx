"use client";

interface UserLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  userLimit: number;
  setUserLimit: (limit: number) => void;
  userName: string;
}

export default function UserLimitModal({
  isOpen,
  onClose,
  onSave,
  userLimit,
  setUserLimit,
  userName,
}: UserLimitModalProps) {
  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          Update {userName}&apos;s Limit
        </h3>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Maximum Test Runs</span>
          </label>
          <input
            type="number"
            className="input input-bordered"
            value={userLimit}
            onChange={(e) => setUserLimit(Number(e.target.value))}
            min="0"
          />
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
}
