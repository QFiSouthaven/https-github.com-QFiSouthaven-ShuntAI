import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { VersionRecord } from '../../types/telemetry';
import { HistoryIcon, CopyIcon, CheckIcon } from '../icons';

const EventLog: React.FC = () => {
    const { versionControlService } = useTelemetry();
    const [versions, setVersions] = useState<VersionRecord[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<VersionRecord | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchVersions = useCallback(() => {
        if (versionControlService) {
            setVersions(versionControlService.getAllVersions());
        }
    }, [versionControlService]);

    useEffect(() => {
        fetchVersions();
        const interval = setInterval(fetchVersions, 5000);
        return () => clearInterval(interval);
    }, [fetchVersions]);

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderContent = (version: VersionRecord) => {
        if (!versionControlService) return <p>Service not available.</p>;
        const content = versionControlService.getVersionContent(version.versionId);
        if (!content) return <p className="text-gray-500 italic">Content not available.</p>;

        try {
            const parsed = JSON.parse(content);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return content;
        }
    };
    
    // FIX: Create a separate function to get the content as a string for the copy handler.
    const getContentAsString = (version: VersionRecord): string => {
        if (!versionControlService) return "Service not available.";
        const content = versionControlService.getVersionContent(version.versionId);
        if (!content) return "Content not available.";

        try {
            const parsed = JSON.parse(content);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return content;
        }
    };
    
    return (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 flex flex-col h-full">
            <header className="p-3 border-b border-gray-700/50 flex-shrink-0">
                <h3 className="font-semibold text-gray-300">Persistent Event Log (Chronicle)</h3>
            </header>
            <main className="flex-grow overflow-hidden flex">
                <div className="w-1/3 border-r border-gray-700/50 overflow-y-auto">
                    <ul className="p-2 space-y-2">
                        {versions.map(version => (
                            <li key={version.versionId}>
                                <button
                                    onClick={() => setSelectedVersion(version)}
                                    className={`w-full text-left p-2 rounded-md transition-colors text-xs ${selectedVersion?.versionId === version.versionId ? 'bg-fuchsia-900/50' : 'bg-gray-800/50 hover:bg-gray-700/50'}`}
                                >
                                    <p className="font-semibold text-fuchsia-300 truncate">{version.summary}</p>
                                    <p className="text-gray-500 mt-1">{new Date(version.timestamp).toLocaleString()}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="w-2/3 overflow-y-auto p-4">
                    {selectedVersion ? (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-semibold text-gray-300">{selectedVersion.summary}</p>
                                <button onClick={() => handleCopy(getContentAsString(selectedVersion))} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${copied ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                                    {copied ? <CheckIcon className="w-3 h-3"/> : <CopyIcon className="w-3 h-3" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all font-mono">
                                {renderContent(selectedVersion)}
                            </pre>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <HistoryIcon className="w-10 h-10 mb-2"/>
                            <p>Select an event to view details.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default EventLog;