// components/image_analysis/ImageAnalysis.tsx
import React, { useState, useCallback } from 'react';
import { analyzeImage } from '../../services/geminiService';
import FileUpload from '../common/FileUpload';
import { PhotoIcon, SparklesIcon } from '../icons';
import Loader from '../Loader';
import TabFooter from '../common/TabFooter';
import { logFrontendError, ErrorSeverity } from '../../utils/errorLogger';
import { audioService } from '../../services/audioService';

const ImageAnalysis: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [image, setImage] = useState<{ base64Data: string; mimeType: string; name: string } | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback((files: Array<{ filename: string; content: string; file: File }>) => {
        if (files.length === 0) return;
        const file = files[0].file;
        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            setImage({ base64Data: base64String, mimeType: file.type, name: file.name });
            setError(null);
            setAnalysisResult('');
        };
        reader.onerror = () => {
            setError('Failed to read the image file.');
        };
        reader.readAsDataURL(file);
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!image || !prompt.trim()) {
            setError('Please upload an image and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult('');
        audioService.playSound('send');
        try {
            const { resultText } = await analyzeImage(prompt, image);
            setAnalysisResult(resultText);
            audioService.playSound('success');
        } catch (e) {
            logFrontendError(e, ErrorSeverity.High, { context: 'ImageAnalysis.handleAnalyze' });
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            audioService.playSound('error');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, image]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 md:p-6 space-y-6 flex-grow overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                    {/* Input Column */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-3"><PhotoIcon className="w-6 h-6 text-cyan-400" /> Image Input</h2>
                            <div className="mt-4">
                                <FileUpload
                                    onFilesUploaded={handleFileChange}
                                    acceptedFileTypes={['image/*']}
                                    maxFileSizeMB={4}
                                    enableDirectoryUpload={false}
                                />
                            </div>
                            {image && (
                                <div className="mt-4 p-3 bg-gray-900/50 rounded-md text-center">
                                    <p className="text-sm text-gray-300">Loaded: <span className="font-mono text-cyan-300">{image.name}</span></p>
                                    <img src={`data:${image.mimeType};base64,${image.base64Data}`} alt="Preview" className="mt-2 max-h-48 mx-auto rounded-md" />
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6">
                             <h2 className="text-xl font-semibold text-white flex items-center gap-3"><SparklesIcon className="w-6 h-6 text-cyan-400" /> Analysis Prompt</h2>
                             <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe this image in detail. The analysis will include a technical breakdown for 3D artists if a character is detected."
                                className="w-full h-32 mt-4 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            />
                            <button
                                onClick={handleAnalyze}
                                disabled={isLoading || !image || !prompt}
                                className="mt-4 w-full px-6 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                            >
                                {isLoading ? <Loader /> : 'Analyze Image'}
                            </button>
                        </div>
                    </div>
                    {/* Output Column */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 flex flex-col">
                        <h2 className="text-xl font-semibold text-white mb-4">Analysis Result</h2>
                        <div className="flex-grow bg-gray-900/50 rounded-md p-4 overflow-y-auto relative">
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col justify-center items-center bg-gray-800/50 backdrop-blur-sm z-10">
                                    <Loader />
                                    <p className="mt-4 text-gray-400">Analyzing...</p>
                                </div>
                            )}
                            {error && <p className="text-red-400">{error}</p>}
                            {analysisResult ? (
                                <pre className="text-gray-300 whitespace-pre-wrap font-sans">{analysisResult}</pre>
                            ) : (
                                !isLoading && !error && <p className="text-gray-500">Analysis will appear here.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <TabFooter />
        </div>
    );
};

export default ImageAnalysis;