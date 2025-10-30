// components/developers/nodes/RhythmClickNode.tsx
import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MusicalNoteIcon, SparklesIcon } from '../../icons';
import Loader from '../../Loader';

interface RhythmClickData {
    label?: string;
    selectedAsset?: string;
    segmentDuration?: number;
    onChange: (id: string, data: any) => void;
}

// Re-using assets, making them real URLs now
const mockAudioAssets = [
    { value: '', label: 'Select a track...' },
    // Sourced from Pixabay, free license
    { value: 'https://cdn.pixabay.com/audio/2023/04/23/audio_7819e9999c.mp3', label: 'short_calm_loop.ogg' },
    { value: 'https://cdn.pixabay.com/audio/2022/01/18/audio_854c6f5051.mp3', label: 'drum_loop.wav' },
    { value: 'https://cdn.pixabay.com/audio/2022/08/04/audio_34bcf1b723.mp3', label: 'synth_arp_loop.mp3' }
];

const RhythmClickNode = ({ id, data, selected }: NodeProps<RhythmClickData>) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackHeadRef = useRef(0);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize AudioContext on mount
    useEffect(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }, []);
    
    // Effect to load audio when selectedAsset changes
    useEffect(() => {
        if (!data.selectedAsset || !audioContextRef.current) {
            setAudioBuffer(null);
            playbackHeadRef.current = 0;
            return;
        }

        setIsLoading(true);
        setError(null);
        fetch(data.selectedAsset)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioContextRef.current!.decodeAudioData(arrayBuffer))
            .then(decodedBuffer => {
                setAudioBuffer(decodedBuffer);
                playbackHeadRef.current = 0; // Reset head on new file
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Error loading audio file:', err);
                setError('Failed to load audio.');
                setIsLoading(false);
            });
    }, [data.selectedAsset]);

    const handleTrigger = () => {
        if (!audioBuffer || !audioContextRef.current) return;

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        const duration = data.segmentDuration || 1.0;
        source.start(0, playbackHeadRef.current, duration);

        let newPlaybackHead = playbackHeadRef.current + duration;
        
        if (newPlaybackHead >= audioBuffer.duration) {
            newPlaybackHead = 0;
        }
        playbackHeadRef.current = newPlaybackHead;
    };

    return (
        <div className="relative">
            <Handle type="target" position={Position.Left} id="trigger-input" style={{ top: '50%' }} className="!bg-green-500" />
            <div className="absolute left-[-34px] top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-900 px-1 rounded">Trigger</div>
            
            <div className={`
                bg-gray-800 rounded-lg shadow-lg border-2 w-72 transition-all duration-300
                border-gray-600/50
                ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
            `}>
                <header className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-t-md border-b border-gray-700/50">
                    <MusicalNoteIcon className="w-5 h-5 text-gray-300" />
                    <h3 className="font-semibold text-gray-200 truncate flex-grow">Rhythm Click</h3>
                </header>
                <main className="p-4 text-sm space-y-4">
                    <div>
                        <label htmlFor={`asset-select-${id}`} className="block text-xs text-gray-400 mb-1">Master Audio Track</label>
                        <select
                            id={`asset-select-${id}`}
                            value={data.selectedAsset || ''}
                            onChange={(e) => data.onChange(id, { ...data, selectedAsset: e.target.value })}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 text-sm"
                            disabled={isLoading}
                        >
                            {mockAudioAssets.map(asset => (
                                <option key={asset.value} value={asset.value}>{asset.label}</option>
                            ))}
                        </select>
                        {isLoading && <div className="flex items-center gap-2 mt-2 text-xs text-gray-400"><Loader /> Loading track...</div>}
                        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Segment Duration</label>
                        <div className="flex gap-2">
                           { [0.5, 1.0].map(duration => (
                                <button
                                    key={duration}
                                    onClick={() => data.onChange(id, { ...data, segmentDuration: duration })}
                                    className={`flex-1 text-center py-1.5 rounded-md text-xs transition-colors ${
                                        (data.segmentDuration || 1.0) === duration
                                        ? 'bg-fuchsia-600 text-white font-semibold'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {duration.toFixed(1)}s
                                </button>
                           ))}
                        </div>
                    </div>

                    <button
                        onClick={handleTrigger}
                        disabled={!audioBuffer || isLoading}
                        className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       <SparklesIcon className="w-4 h-4" /> Test Trigger
                    </button>
                </main>
            </div>
            
            <Handle type="source" position={Position.Right} id="audio-output" className="!bg-blue-500" />
            <div className="absolute right-[-28px] top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-900 px-1 rounded">Audio</div>
        </div>
    );
};

export default memo(RhythmClickNode);