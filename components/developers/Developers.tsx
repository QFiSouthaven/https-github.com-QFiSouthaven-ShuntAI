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
  Node as ReactFlowNode,
  ReactFlowProvider,
  useReactFlow,
  useOnViewportChange,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

import TabFooter from '../common/TabFooter';
import { audioService } from '../../services/audioService';
import AudioSourceNode from './nodes/AudioSourceNode';
import UIEventNode from './nodes/UIEventNode';
import AudioOutputNode from './nodes/AudioOutputNode';
import { DeveloperIcon } from '../icons';
import { useSettings } from '../../context/SettingsContext';
import { useTelemetry } from '../../context/TelemetryContext';
import Toolbar from './Toolbar';
import ContextMenu from './ContextMenu';

const initialNodes: ReactFlowNode[] = [
  { id: 'audio-1', type: 'audioSource', position: { x: 100, y: 100 }, data: { label: 'Click Sound', selectedAsset: '' } },
  { id: 'event-1', type: 'uiEvent', position: { x: 100, y: 300 }, data: { label: 'UI Event Trigger' } },
  { id: 'output-1', type: 'audioOutput', position: { x: 500, y: 200 }, data: {} },
];

const RF_STORAGE_KEY = 'aether-shunt-dev-canvas-state';

const DeveloperCanvas: React.FC = () => {
    const { settings } = useSettings();
    const { versionControlService } = useTelemetry();
    const reactFlowInstance = useReactFlow();

    const [nodes, setNodes] = useState<ReactFlowNode[]>(initialNodes);
    const [edges, setEdges] = useState<any[]>([]);
    const [menu, setMenu] = useState<any>(null);
    const [clipboard, setClipboard] = useState<ReactFlowNode[] | null>(null);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    }, [setNodes]);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    }, [setEdges]);

    // Save state to localStorage on any change to nodes, edges, or viewport
    useOnViewportChange({
      onEnd: (viewport) => {
        saveState(nodes, edges, viewport);
      },
    });
    useEffect(() => {
        saveState(nodes, edges, reactFlowInstance.getViewport());
    }, [nodes, edges, reactFlowInstance]);

    // Restore state from localStorage on initial mount
    useEffect(() => {
        const restoredState = restoreState();
        if (restoredState) {
            setNodes(restoredState.nodes || initialNodes);
            setEdges(restoredState.edges || []);
            reactFlowInstance.setViewport(restoredState.viewport);
        }
    }, []);
    
    const saveState = (nodesToSave: ReactFlowNode[], edgesToSave: any[], viewport: any) => {
        const flowState = { nodes: nodesToSave, edges: edgesToSave, viewport };
        localStorage.setItem(RF_STORAGE_KEY, JSON.stringify(flowState));
    };

    const restoreState = () => {
        const storedState = localStorage.getItem(RF_STORAGE_KEY);
        if (storedState) {
            return JSON.parse(storedState);
        }
        return null;
    };

    const nodeTypes = useMemo(() => ({ 
        audioSource: AudioSourceNode,
        uiEvent: UIEventNode,
        audioOutput: AudioOutputNode,
    }), []);
  
    const onNodeDataChange = useCallback((nodeId: string, newData: any) => {
      setNodes((nds) => nds.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      ));
    }, [setNodes]);

    const addNode = useCallback((type: string, position: { x: number; y: number }) => {
      const newNode: ReactFlowNode = {
        id: uuidv4(),
        type,
        position,
        data: {
          label: `New ${type.replace(/([A-Z])/g, ' $1')}`,
          onChange: onNodeDataChange, // Pass handler to node
        },
      };
      setNodes((nds) => nds.concat(newNode));
      audioService.playSound('click');
    }, [setNodes, onNodeDataChange]);

    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setMenu({
          x: event.clientX,
          y: event.clientY,
        });
    }, [setMenu]);
    
    const onConnect: OnConnect = useCallback((params) => {
      audioService.playSound('node_connect');
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#d946ef', strokeWidth: 2 } }, eds));
    }, [setEdges]);

    // Toolbar Actions
    const onSaveSnapshot = useCallback(() => {
        if (!versionControlService) return;
        const graphState = JSON.stringify({ nodes, edges, viewport: reactFlowInstance.getViewport() }, null, 2);
        versionControlService.captureVersion(
            'developer_canvas_snapshot',
            'developer-canvas',
            graphState,
            'user_action',
            'Saved developer canvas snapshot'
        );
        alert('Canvas snapshot saved to Chronicle!');
        audioService.playSound('success');
    }, [versionControlService, nodes, edges, reactFlowInstance]);

    const onCopy = useCallback(() => {
        const selectedNodes = reactFlowInstance.getNodes().filter((node) => node.selected);
        if (selectedNodes.length > 0) {
            setClipboard(selectedNodes);
            audioService.playSound('click');
        }
    }, [reactFlowInstance]);

    const onPaste = useCallback(() => {
        if (!clipboard) return;
        const newNodes = clipboard.map((node) => ({
            ...node,
            id: uuidv4(),
            position: {
                x: node.position.x + 20,
                y: node.position.y + 20,
            },
            selected: false,
        }));
        setNodes((nds) => nds.concat(newNodes));
        audioService.playSound('receive');
    }, [clipboard, setNodes]);

    const onDuplicate = useCallback(() => {
        const selectedNodes = reactFlowInstance.getNodes().filter((node) => node.selected);
        if (selectedNodes.length === 0) return;
        const newNodes = selectedNodes.map((node) => ({
            ...node,
            id: uuidv4(),
            position: { x: node.position.x + 20, y: node.position.y + 20 },
            selected: false,
        }));
        setNodes((nds) => nds.concat(newNodes));
        audioService.playSound('receive');
    }, [reactFlowInstance, setNodes]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
                if (event.key === 'c') onCopy();
                if (event.key === 'v') onPaste();
                if (event.key === 'd') {
                    event.preventDefault();
                    onDuplicate();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCopy, onPaste, onDuplicate]);

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: settings.developerPanelColor }}>
            <div className="p-4 border-b border-gray-700/50 flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DeveloperIcon className="w-6 h-6 text-fuchsia-400" />
                    <h2 className="font-semibold text-lg text-gray-300">Audio Feedback Orchestrator</h2>
                </div>
                <Toolbar onSave={onSaveSnapshot} onCopy={onCopy} onPaste={onPaste} onDuplicate={onDuplicate} />
            </div>
            <div className="flex-grow relative bg-gray-900/30">
                <ReactFlow
                    nodes={nodes.map(n => ({...n, data: {...n.data, onChange: onNodeDataChange}}))}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onPaneContextMenu={onPaneContextMenu}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-transparent"
                >
                    <Background gap={24} color="#4a5568" />
                    <Controls />
                    <MiniMap nodeColor={() => settings.miniMapColor} pannable zoomable />
                </ReactFlow>
                {menu && (
                    <ContextMenu
                        x={menu.x}
                        y={menu.y}
                        onClose={() => setMenu(null)}
                        onAddNode={(type) => {
                            const position = reactFlowInstance.screenToFlowPosition({ x: menu.x, y: menu.y });
                            addNode(type, position);
                            setMenu(null);
                        }}
                    />
                )}
            </div>
            <TabFooter />
        </div>
    );
};

const Developers: React.FC = () => (
    <ReactFlowProvider>
        <DeveloperCanvas />
    </ReactFlowProvider>
);

export default Developers;