import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, OnConnect, Node } from 'reactflow';
import { CheckIcon, CopyIcon, DocumentChartBarIcon, ErrorIcon, XMarkIcon } from '../icons';
import { useTelemetry } from '../../context/TelemetryContext';
import { generateOrchestratorReport } from '../../services/geminiService';
import TabFooter from '../common/TabFooter';
import FileUpload from '../common/FileUpload';
import CustomOrchestratorNode from '../orchestrator/CustomOrchestratorNode';
import { audioService } from '../../services/audioService';
import NodeDetailsPanel from '../orchestrator/NodeDetailsPanel';

export interface OrchestratedItem {
  id: string;
  name: string;
  type: 'Service' | 'Deployment' | 'Workflow' | 'Task';
  status: 'Running' | 'Stopped' | 'Pending' | 'Error';
  lastUpdated: string;
  version?: string;
  dependencies?: string[];
}

type ReportModalState = {
    isOpen: boolean;
    isLoading: boolean;
    title: string;
    content: string;
    error: string | null;
};

const useOrchestratorItems = () => {
  const [items, setItems] = useState<OrchestratedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isManagedExternally, setIsManagedExternally] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mockData: OrchestratedItem[] = [
        { id: 'srv-db', name: 'Primary Database', type: 'Service', status: 'Running', lastUpdated: new Date().toISOString(), version: '14.8', dependencies: [] },
        { id: 'srv-cache', name: 'Redis Cache', type: 'Service', status: 'Running', lastUpdated: new Date().toISOString(), version: '7.2', dependencies: [] },
        { id: 'srv-auth', name: 'Authentication Service', type: 'Service', status: 'Running', lastUpdated: new Date().toISOString(), version: '2.1.0', dependencies: ['srv-db'] },
        { id: 'srv-api', name: 'Main API Gateway', type: 'Service', status: 'Error', lastUpdated: new Date().toISOString(), version: '1.5.2', dependencies: ['srv-auth', 'srv-cache'] },
        { id: 'dep-frontend', name: 'Frontend Web App', type: 'Deployment', status: 'Running', lastUpdated: new Date().toISOString(), version: '3.0.1', dependencies: ['srv-api'] },
        { id: 'wfl-etl', name: 'Nightly ETL Workflow', type: 'Workflow', status: 'Stopped', lastUpdated: new Date().toISOString(), dependencies: ['srv-db'] },
        { id: 'tsk-migration', name: 'DB Migration Task', type: 'Task', status: 'Pending', lastUpdated: new Date().toISOString(), version: '1.0.1', dependencies: ['wfl-etl'] },
      ];
      await new Promise(resolve => setTimeout(() => resolve(mockData), 1000));
      setItems(mockData);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch orchestrated items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isManagedExternally) return;
    fetchItems();
  }, [fetchItems, isManagedExternally]);

  const loadItems = useCallback((newItems: OrchestratedItem[]) => {
    setItems(newItems);
    setIsManagedExternally(true);
    setLoading(false);
  }, []);

  const performAction = useCallback(async (itemId: string, action: 'start' | 'stop') => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, status: action === 'start' ? 'Running' : 'Stopped', lastUpdated: new Date().toISOString() } : item
      )
    );
  }, []);

  return { items, loading, error, performAction, loadItems };
};

const ReportModal: React.FC<{ state: ReportModalState, onClose: () => void }> = ({ state, onClose }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if (state.content && !copied) {
            navigator.clipboard.writeText(state.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    if (!state.isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700"><h2 className="text-lg font-semibold text-gray-200">{state.title}</h2><button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button></header>
                <main className="p-6 overflow-y-auto flex-grow">{state.isLoading ? <div className="flex flex-col justify-center items-center h-full"><svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="mt-4 text-gray-400">Generating report from AI...</p></div> : state.error ? <div className="flex flex-col items-center justify-center h-full text-center"><ErrorIcon className="w-12 h-12 text-red-500 mb-4" /><p className="text-red-400 font-semibold">Failed to Generate Report</p><p className="text-red-500 text-sm mt-1">{state.error}</p></div> : state.content && <pre className="whitespace-pre-wrap break-words font-sans text-gray-300">{state.content}</pre>}</main>
                <footer className="p-4 border-t border-gray-700 flex justify-end"><button onClick={handleCopy} disabled={!state.content || copied} className={`flex items-center gap-2 text-sm px-4 py-2 rounded-md transition-all duration-200 ${copied ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-gray-900/60 border border-gray-600/50 text-gray-300 hover:bg-gray-800/80 hover:border-gray-500 disabled:opacity-50'}`}>{copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}<span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span></button></footer>
            </div>
        </div>
    );
};

const Orchestrator: React.FC = () => {
  const { items, loading, error: dataError, performAction, loadItems } = useOrchestratorItems();
  const { telemetryService, updateTelemetryContext } = useTelemetry();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'All' | OrchestratedItem['status']>('All');
  const [reportModalState, setReportModalState] = useState<ReportModalState>({ isOpen: false, isLoading: false, title: '', content: '', error: null });
  const [activeReport, setActiveReport] = useState<'system' | 'properties' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<OrchestratedItem | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeTypes = useMemo(() => ({ customOrchestratorNode: CustomOrchestratorNode }), []);

  useEffect(() => { updateTelemetryContext({ tab: 'Orchestrator' }); }, [updateTelemetryContext]);
  
  const onConnect: OnConnect = useCallback((params) => {
    audioService.playSound('node_connect');
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#0891b2', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data.item);
    audioService.playSound('click');
  }, []);

  const handleFileUploaded = (files: Array<{ filename: string; content: string }>) => { /* ... */ };
  const handleGenerateReport = async (type: 'system' | 'properties') => { /* ... */ };

  const filteredItems = useMemo(() => items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  }), [items, searchTerm, filterStatus]);

  useEffect(() => {
    const layoutNodes = (nodesToLayout: any[], edgesToLayout: any[]) => {
        const nodeMap = new Map(nodesToLayout.map(n => [n.id, { ...n, children: [] }]));
        const inDegree = new Map(nodesToLayout.map(n => [n.id, 0]));

        edgesToLayout.forEach(edge => {
            if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
                nodeMap.get(edge.source).children.push(nodeMap.get(edge.target));
                inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
            }
        });

        let queue = nodesToLayout.filter(n => inDegree.get(n.id) === 0);
        const levels = new Map<number, any[]>();
        let level = 0;

        while (queue.length > 0) {
            const levelSize = queue.length;
            levels.set(level, []);
            const nextQueue = [];

            for (let i = 0; i < levelSize; i++) {
                const node = queue[i];
                levels.get(level).push(node);
                
                const nodeWithChildren = nodeMap.get(node.id);
                if (nodeWithChildren) {
                    nodeWithChildren.children.forEach((child: any) => {
                        const childId = child.id;
                        const currentDegree = inDegree.get(childId) - 1;
                        inDegree.set(childId, currentDegree);
                        if (currentDegree === 0) {
                            nextQueue.push(child);
                        }
                    });
                }
            }
            queue = nextQueue;
            level++;
        }
        
        const PADDING_X = 280;
        const PADDING_Y = 180;

        levels.forEach((nodesInLevel, lvl) => {
            const levelWidth = (nodesInLevel.length - 1) * PADDING_X;
            const startX = -levelWidth / 2;
            nodesInLevel.forEach((node, index) => {
                const nodeToUpdate = nodesToLayout.find(n => n.id === node.id);
                if (nodeToUpdate) {
                    nodeToUpdate.position = { x: startX + index * PADDING_X, y: lvl * PADDING_Y };
                }
            });
        });

        return nodesToLayout;
    };
    
    const itemMap = new Map(items.map(i => [i.id, i]));
    const visibleNodes = filteredItems.map(item => ({
        id: item.id,
        type: 'customOrchestratorNode',
        data: { item, performAction },
        position: { x: 0, y: 0 },
    }));

    const visibleEdges = [];
    filteredItems.forEach(item => {
        (item.dependencies || []).forEach(depId => {
            if (itemMap.has(depId) && filteredItems.some(i => i.id === depId)) {
                visibleEdges.push({
                    id: `e-${depId}-${item.id}`,
                    source: depId,
                    target: item.id,
                    type: 'smoothstep',
                    animated: item.status === 'Running' || item.status === 'Pending',
                    style: { stroke: '#0891b2', strokeWidth: 2 },
                });
            }
        });
    });

    setNodes(layoutNodes(visibleNodes, visibleEdges));
    setEdges(visibleEdges);
  }, [filteredItems, items, performAction, setNodes, setEdges]);
  
  if (loading) { return <div className="flex justify-center items-center h-full"><svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span className="ml-3 text-gray-400">Loading items...</span></div>; }
  if (dataError) { return <div className="flex justify-center items-center h-full p-4"><div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert"><strong className="font-bold block mb-1">Error! </strong><span className="block sm:inline">{dataError}</span></div></div>; }
  
  return (
    <div className="flex flex-col h-full">
      <ReportModal state={reportModalState} onClose={() => setReportModalState({ ...reportModalState, isOpen: false })} />
      <div className="p-4 md:p-6 border-b border-gray-700/50 flex-shrink-0">
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
          <div className='flex flex-col sm:flex-row gap-4 items-center'>
            <div className="flex-grow flex gap-4 w-full sm:w-auto">
              <input type="text" placeholder="Filter nodes by name..." className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 text-gray-200" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <select className="p-2 border border-gray-600 rounded-md bg-gray-800 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
                <option value="All">All Statuses</option>
                <option value="Running">Running</option>
                <option value="Stopped">Stopped</option>
                <option value="Pending">Pending</option>
                <option value="Error">Error</option>
              </select>
            </div>
            <div className='flex gap-2 flex-shrink-0'>
              <button onClick={() => handleGenerateReport('system')} disabled={!!activeReport} className="flex items-center gap-2 p-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><DocumentChartBarIcon className="w-5 h-5" /><span className='text-sm hidden md:inline'>Analyze Graph</span></button>
            </div>
          </div>
          <div className='mt-4'>
            <FileUpload onFilesUploaded={handleFileUploaded} acceptedFileTypes={['.json', '.zip']} maxFileSizeMB={2} />
            {uploadError && <p className="text-red-400 text-sm mt-2">{uploadError}</p>}
          </div>
        </div>
      </div>
      <div className="flex-grow relative bg-gray-900/30">
        {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">No nodes match your filter criteria.</div>
        ) : (
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                className="bg-transparent"
            >
                <Background gap={24} color="#4a5568" />
                <Controls />
                <MiniMap nodeColor={n => {
                    switch (n.data.item.status) {
                        case 'Running': return '#4ade80';
                        case 'Error': return '#f87171';
                        case 'Pending': return '#facc15';
                        default: return '#9ca3af';
                    }
                }} pannable zoomable />
            </ReactFlow>
        )}
        {selectedNode && <NodeDetailsPanel node={selectedNode} onClose={() => setSelectedNode(null)} />}
      </div>
      <TabFooter />
    </div>
  );
};

export default Orchestrator;