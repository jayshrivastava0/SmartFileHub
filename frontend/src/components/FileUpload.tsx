import React, { useState, useEffect } from 'react';
import { fileService, DuplicateFileError } from '../services/fileService';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Savings } from '../types/file';

interface FileUploadProps {
  // Callback function to notify the parent component of a successful upload.
  onUploadSuccess: () => void;
}

/**
 * A React component for handling file uploads.
 * It provides a drag-and-drop interface, shows upload progress,
 * handles success and error states (including duplicate files),
 * and displays total storage savings.
 */
export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  // State for the currently selected file.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // State for displaying error messages to the user.
  const [error, setError] = useState<string | null>(null);
  // State for displaying informational messages (e.g., duplicate file notice).
  const [info, setInfo] = useState<string | null>(null);
  // State to store and display the total storage savings from deduplication.
  const [savings, setSavings] = useState<Savings | null>(null);
  // Access the React Query client for cache operations.
  const queryClient = useQueryClient();

  /**
   * Fetches the total storage savings data from the API.
   */
  const fetchSavingSize = async () => {
    try {
      const savingsData = await fileService.getTotalSavingSize();
      setSavings(savingsData);
    } catch (e) {
      // If fetching fails, reset the savings data.
      setSavings(null);
    }
  };

  // Fetch the initial savings size when the component mounts.
  useEffect(() => {
    fetchSavingSize();
  }, []);

  // `useMutation` for handling the file upload API call.
  const uploadMutation = useMutation({
    mutationFn: fileService.uploadFile,
    onSuccess: () => {
      // On successful upload of a new file:
      queryClient.invalidateQueries({ queryKey: ['files'] }); // Refresh the file list.
      setSelectedFile(null); // Clear the selected file.
      setInfo(null); // Clear any info messages.
      setError(null); // Clear any error messages.
      onUploadSuccess(); // Notify the parent component.
      fetchSavingSize(); // Refresh the savings data.
    },
    onError: (error: unknown) => {
      // Custom error handling, especially for duplicate files (409 Conflict).
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 'DUPLICATE' &&
        'duplicate_file_id' in error
      ) {
        // This is a specific duplicate file error thrown by our fileService.
        const duplicateError = error as DuplicateFileError;
        const fileSize = selectedFile ? formatFileSize(selectedFile.size) : '';
        // Set an informational message about the deduplication.
        setInfo(`File Uploaded. Similar file already exists. Saved ${fileSize} of storage by using a reference.`);
        setError(null); // Clear any generic error.
        fetchSavingSize(); // Refresh savings data as it might have changed.
      } else {
        // Handle generic upload errors.
        setError('Failed to upload file. Please try again.');
        setInfo(null);
      }
      console.error('Upload error:', error);
    },
  });

  /**
   * Formats a file size in bytes into a human-readable string (e.g., "1.23 MB").
   * @param bytes - The file size in bytes.
   * @returns A formatted string.
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Handles the file selection from the file input.
   * @param event - The input change event.
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null); // Clear previous errors on new selection.
    }
  };

  /**
   * Triggers the file upload mutation.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    try {
      setError(null); // Clear error before attempting upload.
      await uploadMutation.mutateAsync(selectedFile);
    } catch (err) {
      // Error handling is managed by the `onError` callback in `useMutation`.
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <CloudArrowUpIcon className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Upload File</h2>
      </div>
      <div className="mt-4 space-y-4">
        {/* File input area */}
        <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
          <div className="space-y-1 text-center">
            <div className="flex text-sm text-gray-600">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                <span>Upload a file</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileSelect} disabled={uploadMutation.isPending} />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">Any file up to 10MB</p>
          </div>
        </div>
        {/* Display selected file name */}
        {selectedFile && (
          <div className="text-sm text-gray-600">
            Selected: {selectedFile.name}
          </div>
        )}
        {/* Display informational messages */}
        {info && (
          <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
            {info}
          </div>
        )}
        {/* Display error messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        {/* Upload Button with loading state */}
        <button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending} className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${!selectedFile || uploadMutation.isPending ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'}`}>
          {uploadMutation.isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            'Upload'
          )}
        </button>
        {/* Display total storage savings */}
        {savings && (
          <div className="text-xs text-gray-500 text-right mt-2">
            <span className="bg-gray-100 px-2 py-1 rounded">
              Total storage saved by deduplication: {savings.size} {savings.unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};