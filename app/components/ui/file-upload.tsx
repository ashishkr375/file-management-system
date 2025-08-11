'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export const FileUpload = ({
  onChange,
  onSubmit,
  warehouseId,
  maxSize = 10, // Max size in MB
  // 10MB
  accept = '*/*',
  multiple = true
}: {
  onChange?: (files: File[]) => void;
  onSubmit?: (formData: FormData) => Promise<any>;
  warehouseId?: string;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Handle drag events
  useEffect(() => {
    const dropArea = dropAreaRef.current;
    if (!dropArea) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer?.files) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    };

    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragenter', handleDragEnter);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);

    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('dragenter', handleDragEnter);
      dropArea.removeEventListener('dragleave', handleDragLeave);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, []);

  const validateFiles = (newFiles: File[]): File[] => {
    // Filter out files that exceed max size
    const validFiles = newFiles.filter(file => {
      const isValidSize = file.size <= maxSize * 1024 * 1024;
      if (!isValidSize) {
        setError(`File "${file.name}" exceeds the maximum size of ${maxSize}MB`);
      }
      return isValidSize;
    });

    return validFiles;
  };

  const handleFiles = (newFiles: File[]) => {
    setError(null);
    const validFiles = validateFiles(newFiles);
    
    if (validFiles.length === 0) return;

    if (!multiple) {
      // Replace existing files if multiple is false
      setFiles(validFiles.slice(0, 1));
      onChange && onChange(validFiles.slice(0, 1));
    } else {
      // Add new files to the existing ones
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      // Pass the complete updated file list to onChange
      onChange && onChange(updatedFiles);
      
      // Log for debugging
      console.log(`Updated files list: ${updatedFiles.length} files total`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log(`File input changed: ${e.target.files.length} file(s) selected`);
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    if (!onSubmit && !warehouseId) {
      console.error('Either onSubmit or warehouseId prop must be provided');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add each file to the formData with the same field name 'file'
      // This allows the server to process them as multiple files
      console.log(`Preparing to upload ${files.length} files`);
      
      files.forEach((file, index) => {
        console.log(`Adding file ${index + 1}/${files.length}: ${file.name} (${file.size} bytes)`);
        formData.append('file', file);
      });
      
      // Log the number of files added to FormData
      console.log(`Total files added to FormData: ${files.length}`);
      
      if (warehouseId) {
        formData.append('warehouseId', warehouseId);
        console.log(`Adding warehouseId: ${warehouseId}`);
      }

      // Log all entries in the FormData
      console.log('FormData entries:');
      for (const pair of formData.entries()) {
        console.log(`${pair[0]}: ${typeof pair[1] === 'object' ? 'File object' : pair[1]}`);
      }

      let response;
      
      if (onSubmit) {
        console.log('Using custom onSubmit handler');
        response = await onSubmit(formData);
      } else {
        // Default upload handler
        console.log('Using default upload handler');
        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          // Get the response text first (works whether it's JSON or not)
          const responseText = await uploadResponse.text();
          console.log('Raw response:', responseText);
          
          // Try to parse it as JSON
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            throw new Error('Invalid server response');
          }
          
          if (!uploadResponse.ok) {
            throw new Error(responseData.error || 'Upload failed');
          }
          
          console.log('Upload response:', responseData);
          
          // Log success message with count
          console.log(`Successfully uploaded ${responseData.count} file(s)`);
          
          // Clear files after successful upload
          setFiles([]);
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          return responseData;
        } catch (error) {
          console.error('Error in default upload handler:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div 
        ref={dropAreaRef}
        onClick={handleClick}
        className={cn(
          "p-10 block rounded-lg cursor-pointer w-full relative overflow-hidden",
          "transition-all duration-200 ease-in-out",
          "bg-white shadow-sm",
          "hover:shadow-md",
          isDragging && "border-2 border-blue-500 bg-blue-50"
        )}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <input
          ref={fileInputRef}
          id="file-upload-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-bold text-gray-900 text-base">
            {multiple ? "Upload files" : "Upload file"}
          </p>
          <p className="relative z-20 font-normal text-gray-500 text-base mt-2">
            Drag or drop your files here or click to upload
          </p>
          
          <div className="relative w-full mt-10 max-w-xl mx-auto">
            {files.length > 0 ? (
              <div className="space-y-4">
                {files.map((file, idx) => (
                  <div
                    key={`file-${idx}`}
                    className={cn(
                      "relative overflow-hidden z-10 bg-white flex flex-col",
                      "items-start justify-start md:h-24 p-4 w-full mx-auto rounded-md",
                      "shadow-sm border border-gray-200"
                    )}
                  >
                    <div className="flex justify-between w-full items-center gap-4">
                      <p className="text-base text-gray-700 truncate max-w-xs">
                        {file.name}
                      </p>
                      <p className="rounded-lg px-2 py-1 w-fit shrink-0 text-sm text-gray-600 bg-gray-100">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        &times;
                      </button>
                    </div>

                    <div className="flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-gray-600">
                      <p className="px-1 py-0.5 rounded-md bg-gray-100">
                        {file.type || 'unknown'}
                      </p>

                      <p>
                        modified{" "}
                        {new Date(file.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div
                  className={cn(
                    "relative bg-white flex items-center justify-center",
                    "h-32 w-full max-w-[8rem] mx-auto rounded-md",
                    "shadow-sm border border-gray-200",
                    "transition-all duration-300",
                    isDragging && "border-blue-500 shadow-md scale-105"
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                {isDragging && (
                  <p className="text-blue-500 font-medium">Drop files here</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 text-red-500 text-sm">
          {error}
        </div>
      )}
      
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isUploading || files.length === 0}
        className={cn(
          "mt-4 w-full py-2 px-4 rounded-md text-white font-medium",
          "transition-all duration-200 ease-in-out",
          files.length > 0 && !isUploading
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-300 cursor-not-allowed"
        )}
      >
        {isUploading 
          ? 'Uploading...' 
          : `Upload ${files.length > 1 ? `${files.length} Files` : 'File'}`}
      </button>
    </div>
  );
};

// CSS for the grid pattern
export const FileUploadCSS = `
.bg-grid-pattern {
  background-image: 
    linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}
`;
