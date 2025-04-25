"use client";

import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

type PromptUploaderProps = {
  onPromptChange: (prompt: string) => void;
  onFilesChange: (files: File[]) => void;
};

export default function PromptUploader({
  onPromptChange,
  onFilesChange,
}: PromptUploaderProps) {
  const [prompt, setPrompt] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prompt") || "";
    }
    return "";
  });

  const [files, setFiles] = useState<File[]>([]);
  const [acceptedFileTypes, setAcceptedFileTypes] = useState({});
  const [error, setError] = useState<string>("");

  const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB in bytes
  const MAX_FILE_COUNT = 5;

  useEffect(() => {
    localStorage.setItem("prompt", prompt);
    onPromptChange(prompt);
  }, [onPromptChange, prompt]);

  // Fetch accepted file types from JSON
  useEffect(() => {
    fetch("/acceptedFiles.json")
      .then((res) => res.json())
      .then((data) => setAcceptedFileTypes(data))
      .catch((err) =>
        console.error("Failed to load accepted file types:", err),
      );
  }, []);

  const validateFiles = (newFiles: File[]): boolean => {
    // Check total file count
    if (files.length + newFiles.length > MAX_FILE_COUNT) {
      setError(`Maximum ${MAX_FILE_COUNT} files allowed`);
      return false;
    }

    // Check individual file sizes
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds the 512MB size limit`);
        return false;
      }
    }

    setError("");
    return true;
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: acceptedFileTypes,
    multiple: true,
    onDrop: (acceptedFiles) => {
      if (validateFiles(acceptedFiles)) {
        setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
        onFilesChange([...files, ...acceptedFiles]);
      }
    },
  });

  const removeFile = (
    event: React.MouseEvent<HTMLButtonElement>,
    fileName: string,
  ) => {
    event.stopPropagation();
    const updatedFiles = files.filter((file) => file.name !== fileName);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    setError(""); // Clear any errors when removing files
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Prompt Input Box */}
      <div className="flex-1 p-4 border border-base-300 bg-base-200 rounded-lg shadow-md">
        <label className="block text-lg font-semibold mb-2">
          Add Your Prompt
        </label>
        <textarea
          className="textarea textarea-bordered w-full h-32"
          value={prompt}
          maxLength={256000}
          onChange={(e) => {
            setPrompt(e.target.value);
            onPromptChange(e.target.value);
          }}
          placeholder="Type your prompt here..."
        />
      </div>

      {/* File Upload Box */}
      <div
        {...getRootProps()}
        className="flex-1 p-4 border border-base-300 bg-base-200 rounded-lg shadow-md flex flex-col justify-center text-center cursor-pointer relative"
      >
        <input {...getInputProps()} />
        <p className="text-lg text-gray-500">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Maximum {MAX_FILE_COUNT} files, 512MB each
        </p>

        {error && (
          <div className="mt-2 p-2 bg-error/10 text-error rounded-md">
            {error}
          </div>
        )}

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 bg-base-100 rounded-md p-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between bg-base-200 p-2 rounded-md mb-1"
              >
                <span className="text-sm truncate max-w-[75%]">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                </span>
                <button
                  onClick={(event) => removeFile(event, file.name)}
                  className="btn btn-sm btn-ghost text-error"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
