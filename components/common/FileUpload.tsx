import React, { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { UploadIcon, CheckIcon } from '../icons';

// Set up the PDF.js worker. This is crucial for performance.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs';

interface FileUploadProps {
  onFilesUploaded: (files: Array<{ filename: string; content: string; file: File }>) => void;
  acceptedFileTypes: string[];
  maxFileSizeMB: number;
  enableDirectoryUpload?: boolean;
}

const SKIPPED_EXTENSIONS = [
    // Archives not handled by JSZip
    '.tar', '.gz', '.rar', '.7z', '.tar.gz',
    // Fonts
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    // Common binary formats (excluding images which are handled separately)
    '.mp3', '.wav', '.ogg', '.flac',
    '.mp4', '.webm', '.mov', '.avi',
    '.exe', '.dll', '.so', '.dmg', '.app',
    '.docx', '.pptx', '.xlsx',
];

const Loader: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-fuchsia-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const FileUpload: React.FC<FileUploadProps> = ({ onFilesUploaded, acceptedFileTypes, maxFileSizeMB, enableDirectoryUpload = true }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successTimeoutRef = useRef<number | null>(null);

  const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const validateFile = useCallback((name: string, size: number, type: string): string | null | 'SKIP' => {
      const nameLower = name.toLowerCase();
      // Silently skip common binary/unsupported files and macOS metadata files
      if (SKIPPED_EXTENSIONS.some(ext => nameLower.endsWith(ext)) || name.endsWith('/.DS_Store') || name === '.DS_Store') {
          return 'SKIP';
      }

      const maxSizeInBytes = maxFileSizeMB * 1024 * 1024;
      if (size > maxSizeInBytes) {
          return `'${name}' (${formatBytes(size)}) is too large. The maximum file size is ${maxFileSizeMB}MB.`;
      }
      
      // Allow any image type if image/* is accepted
      if (acceptedFileTypes.includes('image/*') && type.startsWith('image/')) {
          return null;
      }
      
      let identifier: string;
      const parts = name.split('.');
      if (parts.length === 1) { // e.g. Dockerfile
          identifier = name.toLowerCase();
      } else if (parts[0] === '' && parts.length === 2) { // e.g. .gitignore
          identifier = `.${parts[1].toLowerCase()}`;
      } else { // e.g. script.js
          identifier = `.${parts[parts.length - 1].toLowerCase()}`;
      }

      if (!acceptedFileTypes.includes(identifier)) {
           return `'${name}' has an unsupported file type. Please use one of the following: ${acceptedFileTypes.join(', ')}.`;
      }
      return null;
  }, [acceptedFileTypes, maxFileSizeMB]);


  const processSingleFile = useCallback(async (file: File, pathPrefix: string = ''): Promise<{ fileData: { filename: string; content: string; file: File } | null, warning: string | null }> => {
    const filename = pathPrefix + file.name;
    const validationResult = validateFile(filename, file.size, file.type);
    
    if (validationResult === 'SKIP') {
        return { fileData: null, warning: null }; // Silently skip
    }
    if (validationResult) {
        return { fileData: null, warning: validationResult };
    }

    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    let content = '';
    let warning: string | null = null;

    if (file.type.startsWith('image/')) {
        // For images, we don't read the content as text. The consumer will handle the file object.
        content = `[Image File: ${filename}]`;
    } else if (fileExtension === '.pdf') {
        try {
            const buffer = await file.arrayBuffer();
            const typedarray = new Uint8Array(buffer);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let textContent = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();
                textContent += text.items.map(item => (item as any).str).join(' ');
                if (i < pdf.numPages) textContent += '\n\n--- Page Break ---\n\n';
            }
            content = textContent.trim();
        } catch (e) {
            warning = `Failed to parse PDF "${filename}". It may be corrupt or encrypted.`;
        }
    } else {
        try {
            content = await file.text();
        } catch (e) {
            warning = `Could not read "${filename}" as text. It might be a binary file.`;
        }
    }
    
    if (warning) return { fileData: null, warning };
    return { fileData: { filename, content, file }, warning: null };
  }, [validateFile]);


  const handleFileProcessing = useCallback(async (files: FileList) => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setIsProcessing(true);
    setIsDragOver(false);
    setWarnings([]);
    setUploadSuccessMessage(null);

    const processedFiles: Array<{ filename: string; content: string; file: File }> = [];
    const currentWarnings: string[] = [];

    try {
        for (const file of Array.from(files)) {
          const filename = (file as any).webkitRelativePath || file.name;
          const fileExtension = `.${filename.split('.').pop()?.toLowerCase()}`;

          if (fileExtension === '.zip') {
            try {
              const zip = await JSZip.loadAsync(file);
              for (const zipFilename in zip.files) {
                if (zip.files[zipFilename].dir) continue;
                
                const zipFile = zip.files[zipFilename];
                const newFile = new File([await zipFile.async('blob')], zipFile.name, { type: 'application/octet-stream' });
                const { fileData, warning } = await processSingleFile(
                    newFile,
                    `${file.name}/` // Prefix with zip file name
                );
                if(warning) currentWarnings.push(warning);
                if(fileData) processedFiles.push(fileData);
              }
            } catch (e) {
                currentWarnings.push(`Failed to process ZIP file "${filename}". It may be corrupt.`);
            }
          } else {
            const { fileData, warning } = await processSingleFile(file, '');
            if(warning) currentWarnings.push(warning);
            if(fileData) processedFiles.push(fileData);
          }
        }

        if (processedFiles.length > 0) {
          onFilesUploaded(processedFiles);
          const message = `${processedFiles.length} file(s) processed successfully.`;
          setUploadSuccessMessage(message);
          successTimeoutRef.current = window.setTimeout(() => {
              setUploadSuccessMessage(null);
          }, 3000);
        }
    } catch(e) {
        console.error("Error during file processing:", e);
        currentWarnings.push("An unexpected error occurred during processing.");
    } finally {
        if (currentWarnings.length > 0) {
          setWarnings(currentWarnings);
        }
        setIsProcessing(false);
    }
  }, [onFilesUploaded, processSingleFile]);
  
  const readAllDirectoryEntries = async (directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
        let entries: FileSystemEntry[] = [];
        const readEntries = () => {
            directoryReader.readEntries(results => {
                if (results.length > 0) {
                    entries = entries.concat(Array.from(results));
                    readEntries();
                } else {
                    resolve(entries);
                }
            }, (err) => {
                console.error('Error reading directory entries:', err);
                reject(new Error('Failed to read directory entries. The directory might be corrupted or permissions may be denied.'));
            });
        };
        readEntries();
    });
  };

  const traverseFileTree = useCallback(async (entry: FileSystemEntry | null, path: string = ''): Promise<{ files: File[], warnings: string[] }> => {
      const collectedFiles: File[] = [];
      const collectedWarnings: string[] = [];
      if (!entry) return { files: [], warnings: [] };

      if (entry.isFile) {
          await new Promise<void>(resolve => {
              (entry as FileSystemFileEntry).file(file => {
                  (file as any).webkitRelativePath = path + file.name;
                  collectedFiles.push(file);
                  resolve();
              }, () => {
                  collectedWarnings.push(`Failed to read file: ${path}${entry.name}`);
                  resolve();
              });
          });
      } else if (entry.isDirectory) {
          const dirReader = (entry as FileSystemDirectoryEntry).createReader();
          const entries = await readAllDirectoryEntries(dirReader);
          for (const subEntry of entries) {
              const result = await traverseFileTree(subEntry, path + entry.name + '/');
              collectedFiles.push(...result.files);
              collectedWarnings.push(...result.warnings);
          }
      }
      return { files: collectedFiles, warnings: collectedWarnings };
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
        const items = Array.from(e.dataTransfer.items);
        const allFiles: File[] = [];
        let allWarnings: string[] = [];

        const treePromises = items.map(item => traverseFileTree((item as any).webkitGetAsEntry(), ''));
        const results = await Promise.all(treePromises);
        
        results.forEach(result => {
            allFiles.push(...result.files);
            allWarnings.push(...result.warnings);
        });

        if (allFiles.length > 0) {
            const dataTransfer = new DataTransfer();
            allFiles.forEach(file => dataTransfer.items.add(file));
            await handleFileProcessing(dataTransfer.files);
        }
        if (allWarnings.length > 0) {
            setWarnings(prev => [...prev, ...allWarnings]);
        }
    } catch (err) {
        console.error("Error processing dropped directory:", err);
        setWarnings(prev => [...prev, "An error occurred while reading a directory. Some files may not have been processed."]);
    }
}, [handleFileProcessing, traverseFileTree]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileProcessing(e.target.files);
    }
    e.target.value = '';
  };
  
  const stateClasses = isProcessing
    ? 'border-gray-500 bg-gray-700/50 cursor-wait'
    : uploadSuccessMessage
    ? 'border-green-500 bg-green-900/30'
    : isDragOver
    ? 'border-fuchsia-400 bg-fuchsia-900/30'
    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30';

  const inputProps: any = {
      type: "file",
      ref: fileInputRef,
      onChange: onFileSelect,
      multiple: true,
      className: "hidden",
      accept: acceptedFileTypes.join(','),
  };
  if (enableDirectoryUpload) {
      inputProps.webkitdirectory = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        className={`p-6 border-2 border-dashed rounded-lg text-center transition-all duration-300 ${stateClasses}`}
      >
        <input {...inputProps} />
        
        {isProcessing ? (
            <div className="flex flex-col items-center justify-center pointer-events-none">
                <Loader />
                <p className="mt-2 text-gray-400">Processing files...</p>
            </div>
        ) : uploadSuccessMessage ? (
            <div className="flex flex-col items-center justify-center pointer-events-none text-green-300">
                <CheckIcon className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">{uploadSuccessMessage}</p>
            </div>
        ) : (
            <div className="pointer-events-none">
                <UploadIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-300">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-semibold text-fuchsia-400 bg-transparent border-none p-0 underline hover:no-underline pointer-events-auto"
                >
                    Upload files{enableDirectoryUpload && ' or a folder'}
                </button>
                </p>
                <p className="text-sm text-gray-400">or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">
                Supported: {acceptedFileTypes.join(', ')} (Max {maxFileSizeMB})
                </p>
            </div>
        )}

      </div>
      {warnings.length > 0 && (
        <div className="mt-3 p-3 bg-yellow-900/50 border border-yellow-700 rounded-md text-sm">
          <p className="font-semibold text-yellow-300">Processing Warnings:</p>
          <ul className="list-disc list-inside mt-1 text-yellow-400">
            {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
