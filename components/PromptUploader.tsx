"use client";

import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react"; // Import close icon from Lucide

export default function PromptUploader({ onPromptChange, onFilesChange }) {
  const [prompt, setPrompt] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prompt") || "";
    }
    return "";
  });

  const [files, setFiles] = useState<File[]>([]);
  const [acceptedFileTypes, setAcceptedFileTypes] = useState({});

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

  const { getRootProps, getInputProps } = useDropzone({
    accept: acceptedFileTypes,
    multiple: true,
    onDrop: (acceptedFiles) => {
      setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]); // Append new files
      onFilesChange([...files, ...acceptedFiles]);
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

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 bg-base-100 rounded-md p-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between bg-base-200 p-2 rounded-md mb-1"
              >
                <span className="text-sm truncate max-w-[75%]">
                  {file.name}
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
