// components/mission_control/Orchestrator.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  OnConnect,
  Node,
  Edge,
  NodeMouseHandler
} from 'reactflow';
import { generateOrchestratorReport } from '../../services/geminiService';
import TabFooter from '../common/TabFooter';
import { audioService } from '../../services/audioService';
import { useTelemetry } from '../../context/TelemetryContext';
import CustomOrchestratorNode from '../orchestrator/CustomOrchestratorNode';
import NodeDetailsPanel from '../orchestrator/NodeDetailsPanel';
import { SparklesIcon } from '../icons';
import Loader from '../Loader';

// FIX: Define and export the OrchestratedItem type to be used by child components, resolving the import error.
export type OrchestratedItem = {
    id: string;
    name: string;
    type: 'Service' | 'Deployment' | 'Workflow' | 'Task';
    status: 'Running' | 'Stopped' | 'Pending' | 'Error';
    version?: string;
    lastUpdated: string;
    dependencies?: string[];
};

const initialItems: OrchestratedItem[] = [
    { id: 'auth-service', name: 'Authentication Service', type: 'Service', status: 'Running', version: '2.1.0', lastUpdated: new Date().toISOString(), dependencies: ['user-db'] },
    { id: 'user-db', name: 'User Database', type: 'Deployment', status: 'Running', version: 'pg-14.2', lastUpdated: new Date().toISOString(), dependencies: [] },
    { id: 'billing-service', name: 'Billing Service', type: 'Service', status: 'Error', version: '1.8.2', lastUpdated: new Date().toISOString(), dependencies: ['auth-service', 'stripe-gw'] },
    { id: 'stripe-gw', name: 'Stripe Gateway', type: 'Service', status: 'Pending', version: '3.0.0', lastUpdated: new Date().toISOString(), dependencies: [] },
    { id: 'data-pipeline', name: 'Data Pipeline', type: 'Workflow', status: 'Running', version: '1.2.0', lastUpdated: new Date().toISOString(), dependencies: ['user-db'] },
    { id: 'nightly-backup', name: 'Nightly Backup', type: 'Task', status: 'Stopped', version: '1.0.0', lastUpdated: new Date().toISOString(), dependencies: ['user-db'] },
];

const initialNodes: Node[] = [
    { id: 'auth-service', type: 'custom', position: { x: 250, y: 150 }, data: { item: initialItems[0] } },
    { id: 'user-db', type: 'custom', position: { x: 500, y: 300 }, data: { item: initialItems[1] } },
    { id: 'billing-service', type: 'custom', position: { x: 250, y: 450 }, data: { item: initialItems[2] } },
    { id: 'stripe-gw', type: 'custom', position: { x: 0, y: 300 }, data: { item: initialItems[3] } },
    { id: 'data-pipeline', type: 'custom', position: { x: 750, y: 150 }, data: { item: initialItems[4] } },
    { id: 'nightly-backup', type: 'custom', position: { x: 750, y: 450 }, data: { item: initialItems[5] } },
];

const initialEdges: Edge[] = [
    { id: 'e-auth-db', source: 'auth-service', target: 'user-db', animated: true, type: 'smoothstep' },
    { id: 'e-billing-auth', source: 'billing-service', target: 'auth-service', animated: true, type: 'smoothstep' },
    { id: 'e-billing-stripe', source: 'billing-service', target: 'stripe-gw', animated: true, type: 'smoothstep' },
    { id: 'e-pipeline-db', source: 'data-pipeline', target: 'user-db', animated: true, type: 'smoothstep' },
    { id: 'e-backup-db', source: 'nightly-backup', target: 'user-db', animated: true, type: 'smoothstep' },
];

const Orchestrator: React.FC = () => {
  const { updateTelemetryContext } = useTelemetry();
  const [items, setItems] = useState<OrchestratedItem[]>(initialItems);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<OrchestratedItem | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const nodeTypes = useMemo(() => ({ custom: CustomOrchestratorNode }), []);

  const performAction = useCallback((id: string, action: 'start' | 'stop') => {
      setItems(prevItems => {
          return prevItems.map(item => {
              if (item.id === id) {
                  return { ...item, status: action === 'start' ? 'Running' : 'Stopped', lastUpdated: new Date().toISOString() };
              }
              return item;
          });
      });
      audioService.playSound('click');
  }, []);

  useEffect(() => {
    const reactFlowNodes = items.map(item => {
        const existingNode = initialNodes.find(n => n.id === item.id);
        return {
            ...existingNode!,
            data: { item, performAction },
        };
    });
    setNodes(reactFlowNodes);
  }, [items, performAction, setNodes]);


  useEffect(() => {
    updateTelemetryContext({ tab: 'Orchestrator' });
  }, [updateTelemetryContext]);
  
  const onConnect: OnConnect = useCallback(
    (params) => {
      audioService.playSound('node_connect');
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds));
    },
    [setEdges]
  );
  
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node.data.item);
    audioService.playSound('click');
  }, []);

  const handleGenerateReport = useCallback(async () => {
    setIsReportLoading(true);
    setReport(null);
    audioService.playSound('send');
    try {
        const reportText = await generateOrchestratorReport(JSON.stringify(items, null, 2));
        setReport(reportText);
        audioService.playSound('receive');
    } catch (error) {
        setReport(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        audioService.playSound('error');
    } finally {
        setIsReportLoading(false);
    }
  }, [items]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow relative bg-gray-900/30">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
        >
          <Background gap={24} color="#4a5568" />
          <Controls />
          <MiniMap nodeColor={(n) => {
            const status = n.data?.item?.status;
            if (status === 'Running') return '#4ade80';
            if (status === 'Error') return '#f87171';
            if (status === 'Pending') return '#facc15';
            return '#9ca3af';
          }} pannable zoomable />
        </ReactFlow>
        <div className="absolute top-4 left-4 z-10 bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg border border-gray-700/50">
            <button
                onClick={handleGenerateReport}
                disabled={isReportLoading}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors bg-fuchsia-600/80 text-white hover:bg-fuchsia-600"
            >
                {isReportLoading ? <Loader /> : <SparklesIcon className="w-4 h-4" />}
                {isReportLoading ? 'Analyzing...' : 'Generate AI Health Report'}
            </button>
            {report && (
                <div className="mt-2 text-xs text-gray-300 p-2 bg-black/30 rounded-md max-w-sm max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans">{report}</pre>
                </div>
            )}
        </div>
      </div>
      {selectedNode && <NodeDetailsPanel node={selectedNode} onClose={() => setSelectedNode(null)} />}
      <TabFooter />
    </div>
  );
};

export default Orchestrator;
