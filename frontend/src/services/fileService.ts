import axios, { AxiosError } from 'axios';
import { File as FileType, Savings } from '../types/file';

// The base URL for the backend API. It falls back to a default if the environment variable is not set.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Custom error interface for handling duplicate file responses from the backend.
export interface DuplicateFileError {
  status: 'DUPLICATE';
  message: string;
  duplicate_file_id: string;
}

// Interface defining the available filter options for fetching files.
export interface FileFilters {
  search?: string;
  min_size?: number;
  max_size?: number;
  file_type?: string;
  min_uploaded_at?: string;
  max_uploaded_at?: string;
}

// Interface for the expected response body when a duplicate file is detected.
interface DuplicateFileResponse {
  message: string;
  duplicate_file_id: string;
}

/**
 * A service object that centralizes all API interactions related to files.
 */
export const fileService = {
  /**
   * Uploads a file to the server.
   * @param file - The file object to upload.
   * @returns A promise that resolves with the file data from the API.
   * @throws A custom `DuplicateFileError` if the server responds with a 409 status.
   */
  async uploadFile(file: File): Promise<FileType> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/files/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      // Custom error handling to identify duplicate file uploads.
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<DuplicateFileResponse>;
        // If the status is 409 (Conflict), it's a duplicate.
        if (axiosError.response?.status === 409 && axiosError.response.data) {
          // Throw a structured error object that the UI can easily handle.
          throw {
            status: 'DUPLICATE',
            message: axiosError.response.data.message,
            duplicate_file_id: axiosError.response.data.duplicate_file_id
          } as DuplicateFileError;
        }
      }
      // Re-throw any other errors.
      throw error;
    }
  },

  /**
   * Fetches a list of files from the server, applying optional filters.
   * @param filters - An object containing filter parameters.
   * @returns A promise that resolves with an array of file objects.
   */
  async getFiles(filters: FileFilters = {}): Promise<FileType[]> {
    const params = new URLSearchParams();
    // Build the query string from the filters object, ignoring empty values.
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });
    const response = await axios.get(`${API_URL}/files/`, { params });
    
    // The API might return an array directly.
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // The API might return an object with a 'detail' key if no files are found.
    // In this case, return an empty array to the UI for consistent handling.
    if (response.data && typeof response.data.detail === 'string') {
        return [];
    }

    // Fallback for paginated responses (if implemented).
    return response.data.results || [];
  },

  /**
   * Deletes a file from the server.
   * @param id - The ID of the file to delete.
   */
  async deleteFile(id: string): Promise<void> {
    await axios.delete(`${API_URL}/files/${id}/`);
  },

  /**
   * Downloads a file from a given URL.
   * @param fileUrl - The direct URL to the file content.
   * @param filename - The desired name for the downloaded file.
   */
  async downloadFile(fileUrl: string, filename: string): Promise<void> {
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'blob', // Important: request the response as a binary large object.
      });
      
      // Create a temporary link element to trigger the browser's download prompt.
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click(); // Programmatically click the link.
      document.body.removeChild(link); // Clean up the link.
      window.URL.revokeObjectURL(url); // Free up memory.
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download file');
    }
  },

  /**
   * Fetches the total storage savings data from the server.
   * @returns A promise that resolves with the savings data.
   */
  async getTotalSavingSize(): Promise<Savings> {
    const response = await axios.get(`${API_URL}/files/total_saving_size/`);
    return response.data;
  },
};