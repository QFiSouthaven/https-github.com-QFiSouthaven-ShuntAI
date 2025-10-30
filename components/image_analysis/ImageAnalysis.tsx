// components/image_analysis/ImageAnalysis.tsx
import React, { useState, useCallback } from 'react';
import { analyzeImage } from '../../services/geminiService';
import FileUpload from '../common/FileUpload';
import Loader from '../Loader';
import { PhotoIcon, SparklesIcon, XMarkIcon } from '../icons';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { audioService } from '../../services/audioService';

const ImageAnalysis: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('Describe this image in detail.');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUploaded = (files: Array<{ filename: string; content: string; file: File }>) => {
        if (files.length > 0) {
            const file = files[0].file;
            if (file.type.startsWith('image/')) {
                setImageFile(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    setImageBase64(base64String);
                };
                reader.readAsDataURL(file);
            } else {
                setError('Please upload a valid image file (e.g., PNG, JPG, WEBP).');
            }
        }
    };

    const handleAnalysis = useCallback(async () => {
        if (!prompt.trim() || !imageBase64 || !imageFile || isLoading) {
            setError('Please upload an image and provide a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        audioService.playSound('send');

        try {
            const { resultText } = await analyzeImage(prompt, {
                base64Data: imageBase64,
                mimeType: imageFile.type,
            });
            setResult(resultText);
            audioService.playSound('receive');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
            setError(errorMessage);
            audioService.playSound('error');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, imageBase64, imageFile, isLoading]);

    const handleClear = () => {
        setPrompt('Describe this image in detail.');
        setImageFile(null);
        setImageBase64(null);
        setResult(null);
        setError(null);
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-auto">
                {/* Left Panel: Input & Controls */}
                <div className="flex flex-col gap-6">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-4 flex flex-col">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <PhotoIcon className="w-6 h-6" /> Image Input
                        </h3>
                        {imageBase64 ? (
                            <div className="relative group">
                                <img src={`data:${imageFile?.type};base64,${imageBase64}`} alt="Uploaded preview" className="rounded-md w-full max-h-80 object-contain" />
                                <button onClick={handleClear} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100">
                                    <XMarkIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        ) : (
                            <FileUpload
                                onFilesUploaded={handleFileUploaded}
                                acceptedFileTypes={['image/*', '.png', '.jpg', '.jpeg', '.webp']}
                                maxFileSizeMB={5}
                                enableDirectoryUpload={false}
                            />
                        )}
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-4 flex-grow flex flex-col">
                        <h3 className="text-lg font-semibold text-white mb-4">Prompt</h3>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your request..."
                            className="w-full flex-grow bg-gray-900/50 rounded-md border border-gray-700 p-3 text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleAnalysis}
                            disabled={isLoading || !imageBase64 || !prompt.trim()}
                            className="w-full mt-4 flex-shrink-0 px-6 py-3 bg-fuchsia-600 text-white font-semibold rounded-md hover:bg-fuchsia-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader /> : <SparklesIcon className="w-5 h-5" />}
                            {isLoading ? 'Analyzing...' : 'Analyze Image'}
                        </button>
                    </div>
                </div>
                {/* Right Panel: Output */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg flex flex-col">
                    <h3 className="text-lg font-semibold text-white p-4 border-b border-gray-700/50">Analysis Result</h3>
                    <div className="p-4 flex-grow relative overflow-auto">
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col justify-center items-center bg-gray-800/80 backdrop-blur-sm z-10 rounded-b-lg">
                                <Loader />
                                <p className="mt-4 text-gray-400">AI is analyzing the image...</p>
                            </div>
                        )}
                        {error && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-red-400">
                                <p className="font-semibold">Analysis Failed</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        )}
                        {!isLoading && !error && !result && (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Analysis output will appear here.
                            </div>
                        )}
                        {result && (
                            <MarkdownRenderer content={result} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAnalysis;
