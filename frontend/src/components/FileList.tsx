import React, { useState } from 'react';
import { fileService, FileFilters } from '../services/fileService';
import { File as FileType } from '../types/file';
import { DocumentIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * A React component that displays a list of uploaded files.
 * It provides functionality for searching, filtering, downloading, and deleting files.
 */
export const FileList: React.FC = () => {
  // Access the React Query client instance for cache invalidation.
  const queryClient = useQueryClient();

  // State to hold the currently applied filters for the API query.
  const [filters, setFilters] = useState<FileFilters>({});
  // State to hold the user's input in the filter fields before they click "Search".
  const [inputFilters, setInputFilters] = useState<FileFilters>({});

  // `useQuery` hook from React Query to fetch the list of files.
  // The query is re-fetched whenever the `filters` state changes.
  const { data: files, isLoading, error } = useQuery({
    queryKey: ['files', filters], // Unique key for this query, includes filters to auto-refetch on change.
    queryFn: () => fileService.getFiles(filters), // The function that fetches the data.
  });

  /**
   * Handles changes in the filter input fields and updates the temporary `inputFilters` state.
   * @param e - The input change event.
   */
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputFilters(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Applies the current `inputFilters` to the main `filters` state, triggering a data refetch.
   */
  const handleSearch = () => {
    setFilters(inputFilters);
  };

  // `useMutation` for deleting files. It handles the API call and cache invalidation.
  const deleteMutation = useMutation({
    mutationFn: fileService.deleteFile, // The function that performs the mutation.
    onSuccess: () => {
      // After a successful deletion, invalidate the 'files' query to refetch the list.
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  // `useMutation` for downloading files.
  const downloadMutation = useMutation({
    mutationFn: ({ fileUrl, filename }: { fileUrl: string; filename: string }) =>
      fileService.downloadFile(fileUrl, filename),
  });

  /**
   * Calls the delete mutation for a specific file ID.
   * @param id - The ID of the file to delete.
   */
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  /**
   * Calls the download mutation for a specific file.
   * @param fileUrl - The URL of the file to download.
   * @param filename - The original name to save the file as.
   */
  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      await downloadMutation.mutateAsync({ fileUrl, filename });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // Display a loading skeleton UI while the files are being fetched.
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Display an error message if the data fetching fails.
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Failed to load files. Please try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Uploaded Files</h2>
      
      {/* Filter and Search Section */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {/* Filename Search Input */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">Filename</label>
            <input type="text" name="search" id="search" placeholder="e.g., report.docx" value={inputFilters.search || ''} onChange={handleFilterChange} className="mt-1 p-2 block w-full border rounded-md shadow-sm" />
          </div>
          {/* File Type Filter Input */}
          <div>
            <label htmlFor="file_type" className="block text-sm font-medium text-gray-700">File Type</label>
            <input type="text" name="file_type" id="file_type" placeholder="e.g., image/jpeg" value={inputFilters.file_type || ''} onChange={handleFilterChange} className="mt-1 p-2 block w-full border rounded-md shadow-sm" />
          </div>
          {/* Min Size Filter Input */}
          <div>
            <label htmlFor="min_size" className="block text-sm font-medium text-gray-700">Min Size (KB)</label>
            <input type="number" name="min_size" id="min_size" placeholder="e.g., 1" value={inputFilters.min_size || ''} onChange={handleFilterChange} className="mt-1 p-2 block w-full border rounded-md shadow-sm" />
          </div>
          {/* Max Size Filter Input */}
          <div>
            <label htmlFor="max_size" className="block text-sm font-medium text-gray-700">Max Size (KB)</label>
            <input type="number" name="max_size" id="max_size" placeholder="e.g., 1024" value={inputFilters.max_size || ''} onChange={handleFilterChange} className="mt-1 p-2 block w-full border rounded-md shadow-sm" />
          </div>
          {/* Min Date Filter Input */}
          <div>
            <label htmlFor="min_uploaded_at" className="block text-sm font-medium text-gray-700">Min Date</label>
            <input type={inputFilters.min_uploaded_at ? 'date' : 'text'} name="min_uploaded_at" id="min_uploaded_at" placeholder="Select start date" value={inputFilters.min_uploaded_at || ''} onChange={handleFilterChange} onFocus={(e) => (e.target.type = 'date')} onBlur={(e) => {if (!e.target.value) e.target.type = 'text'}} className="mt-1 p-2 block w-full border rounded-md shadow-sm" />
          </div>
          {/* Max Date Filter Input */}
          <div>
            <label htmlFor="max_uploaded_at" className="block text-sm font-medium text-gray-700">Max Date</label>
            <input type={inputFilters.max_uploaded_at ? 'date' : 'text'} name="max_uploaded_at" id="max_uploaded_at" placeholder="Select end date" value={inputFilters.max_uploaded_at || ''} onChange={handleFilterChange} onFocus={(e) => (e.target.type = 'date')} onBlur={(e) => {if (!e.target.value) e.target.type = 'text'}} className="mt-1 p-2 block w-full border rounded-md shadow-sm" />
          </div>
        </div>
        <div className="mt-4">
          <button onClick={handleSearch} className="w-full bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700">
            Search
          </button>
        </div>
      </div>

      {/* Conditional rendering for the file list */}
      {!files || files.length === 0 ? (
        // Displayed when no files match the filters or no files are uploaded.
        <div className="text-center py-12">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No files matching the filters</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading a file
          </p>
        </div>
      ) : (
        // Display the list of files.
        <div className="mt-6 flow-root">
          <ul className="-my-5 divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file.id} className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <DocumentIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.original_filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {file.file_type} • {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <p className="text-sm text-gray-500">
                      Uploaded {new Date(file.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {/* Download Button */}
                    <button onClick={() => handleDownload(file.file, file.original_filename)} disabled={downloadMutation.isPending} className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    {/* Delete Button */}
                    <button onClick={() => handleDelete(file.id)} disabled={deleteMutation.isPending} className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};