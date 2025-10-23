// components/developers/Developers.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  OnConnect,
  Node,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

import TabFooter from '../common/TabFooter';
import { audioService } from '../../services/audioService';
import AudioSourceNode from './nodes/AudioSourceNode';
import UIEventNode from './nodes/UIEventNode';
import AudioOutputNode from './nodes/AudioOutputNode';
import { CodeIcon, DeveloperIcon } from '../icons';

const initialNodes: Node[] = [
  {
    id: 'audio-1',
    type: 'audioSource',
    position: { x: 100, y: 100 },
    data: { label: 'Click Sound' },
  },
  {
    id: 'event-1',
    type: 'uiEvent',
    position: { x: 100, y: 300 },
    data: { label: 'Button Click' },
  },
  {
    id: 'output-1',
    type: 'audioOutput',
    position: { x: 500, y: 200 },
    data: {},
  },
];

const Developers: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const nodeTypes = useMemo(() => ({ 
      audioSource: AudioSourceNode,
      uiEvent: UIEventNode,
      audioOutput: AudioOutputNode,
  }), []);
  
  const nodeTypesToAdd = [
    { type: 'audioSource', label: 'Audio Source' },
    { type: 'uiEvent', label: 'UI Event Trigger' },
    { type: 'audioOutput', label: 'Audio Output' },
  ];

  const onConnect: OnConnect = useCallback(
    (params) => {
        audioService.playSound('node_connect');
        setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#0891b2', strokeWidth: 2 } }, eds))
    },
    [setEdges]
  );

  const addNode = useCallback((type: string) => {
    const newNode: Node = {
      id: uuidv4(),
      type,
      position: {
        x: Math.random() * (window.innerWidth / 3),
        y: Math.random() * (window.innerHeight / 3),
      },
      data: { label: `New ${type} Node` },
    };
    setNodes((nds) => nds.concat(newNode));
    audioService.playSound('click');
  }, [setNodes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700/50 flex-shrink-0 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <DeveloperIcon className="w-6 h-6 text-cyan-400" />
            <h2 className="font-semibold text-lg text-gray-300">Audio Feedback Orchestrator</h2>
        </div>
        <div className="relative" ref={menuRef}>
            <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
            >
                <CodeIcon className="w-5 h-5" />
                Create Node
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-20 border border-gray-600">
                    {nodeTypesToAdd.map(node => (
                        <button
                            key={node.type}
                            onClick={() => {
                                addNode(node.type);
                                setIsMenuOpen(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 first:rounded-t-md last:rounded-b-md"
                        >
                            {node.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
      <div className="flex-grow relative bg-gray-900/30">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
        >
          <Background gap={24} color="#4a5568" />
          <Controls />
          <MiniMap nodeColor={(n) => '#334155'} pannable zoomable />
        </ReactFlow>
      </div>
      <TabFooter />
    </div>
  );
};

export default Developers;