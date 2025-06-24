import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';

/**
 * The main application component.
 * It orchestrates the layout and interaction between the FileUpload and FileList components.
 */
function App() {
  // State to manage a key for the FileList component.
  // Incrementing this key will force React to re-mount the FileList component,
  // which is a simple way to trigger a refresh after an action in a sibling component.
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Callback function passed to FileUpload.
   * It's called on a successful upload to trigger a refresh of the FileList.
   */
  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Application Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Abnormal Security - File Hub</h1>
          <p className="mt-1 text-sm text-gray-500">
            File management system
          </p>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-6">
            {/* File Upload Component */}
            <div className="bg-white shadow sm:rounded-lg">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>
            {/* File List Component */}
            <div className="bg-white shadow sm:rounded-lg">
              {/* The `key` prop is used here to force a re-render when an upload is successful. */}
              <FileList key={refreshKey} />
            </div>
          </div>
        </div>
      </main>

      {/* Application Footer */}
      <footer className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2024 File Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;