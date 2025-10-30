import React, { useState, useEffect, useCallback } from 'react';
import { generatePerformanceReport } from '../../services/geminiService';
import TabFooter from '../common/TabFooter';
import { TrimIcon, SparklesIcon, DocumentChartBarIcon, CheckIcon, BookIcon } from '../icons';
import Loader from '../Loader';
import { audioService } from '../../services/audioService';
import { logFrontendError, ErrorSeverity } from '../../utils/errorLogger';

type Metric = {
    value: number;
    unit: string;
    trend: number[];
};

type MetricsState = {
    apiLatency: Metric;
    errorRate: Metric;
    cacheHitRatio: Metric;
    userInteractionTime: Metric;
};

const initialMetrics: MetricsState = {
    apiLatency: { value: 120, unit: 'ms', trend: [130, 125, 122, 120] },
    errorRate: { value: 0.5, unit: '%', trend: [0.6, 0.55, 0.52, 0.5] },
    cacheHitRatio: { value: 92, unit: '%', trend: [90, 91, 91.5, 92] },
    userInteractionTime: { value: 85, unit: 'ms', trend: [90, 88, 86, 85] },
};

const MetricCard: React.FC<{ title: string; metric: Metric }> = ({ title, metric }) => {
    const isGood = (title === 'API Latency' && metric.value < 150) || (title === 'Error Rate' && metric.value < 1) || (title === 'Cache Hit Ratio' && metric.value > 90) || (title === 'User Interaction Time' && metric.value < 100);
    const valueColor = isGood ? 'text-green-300' : 'text-yellow-300';
    
    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
            <h4 className="text-sm font-medium text-gray-400">{title}</h4>
            <p className={`text-3xl font-bold mt-2 ${valueColor}`}>
                {metric.value.toFixed(title.includes('Rate') ? 2 : 0)}
                <span className="text-lg ml-1">{metric.unit}</span>
            </p>
        </div>
    );
};

const TrimAgent: React.FC = () => {
    const [metrics, setMetrics] = useState<MetricsState>(initialMetrics);
    const [cacheStats, setCacheStats] = useState({ items: 512, size: 2.3 });
    const [report, setReport] = useState<string | null>(null);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [optimizationLog, setOptimizationLog] = useState<string[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => ({
                apiLatency: { ...prev.apiLatency, value: prev.apiLatency.value * (0.98 + Math.random() * 0.04) },
                errorRate: { ...prev.errorRate, value: Math.max(0, prev.errorRate.value + (Math.random() - 0.5) * 0.1) },
                cacheHitRatio: { ...prev.cacheHitRatio, value: Math.min(100, prev.cacheHitRatio.value + (Math.random() - 0.45)) },
                userInteractionTime: { ...prev.userInteractionTime, value: prev.userInteractionTime.value * (0.97 + Math.random() * 0.05) },
            }));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleGenerateReport = useCallback(async () => {
        setIsReportLoading(true);
        setReport(null);
        setReportError(null);
        audioService.playSound('send');
        const metricsString = `
- API Latency (p95): ${metrics.apiLatency.value.toFixed(0)} ms
- Error Rate: ${metrics.errorRate.value.toFixed(2)}%
- Cache Hit Ratio: ${metrics.cacheHitRatio.value.toFixed(2)}%
- Avg. User Interaction Time: ${metrics.userInteractionTime.value.toFixed(0)} ms
- Cache Items: ${cacheStats.items}
- Cache Size: ${cacheStats.size} MB
        `;
        try {
            const { resultText } = await generatePerformanceReport(metricsString);
            setReport(resultText);
            audioService.playSound('success');
        } catch (e) {
            logFrontendError(e, ErrorSeverity.High, { context: 'TrimAgent.handleGenerateReport' });
            setReportError(e instanceof Error ? e.message : 'An unknown error occurred.');
            audioService.playSound('error');
        } finally {
            setIsReportLoading(false);
        }
    }, [metrics, cacheStats]);

    const handlePurgeCache = useCallback(() => {
        audioService.playSound('click');
        setCacheStats({ items: 0, size: 0 });
        setTimeout(() => setCacheStats({ items: 450 + Math.floor(Math.random() * 100), size: 1.8 + Math.random() }), 2000);
    }, []);

    const handleOptimize = useCallback(() => {
        if (isOptimizing) return;
        setIsOptimizing(true);
        setOptimizationLog([]);
        audioService.playSound('send');

        const steps = [
            "[1/4] Analyzing real-time telemetry data...",
            "[2/4] Identifying cache inefficiencies... Found 12 redundant keys.",
            "[3/4] Purging stale cache entries and applying adaptive eviction policy...",
            "[4/4] Optimization complete. System performance improved by an estimated 15%.",
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setOptimizationLog(prev => [...prev, steps[currentStep]]);
                currentStep++;
            } else {
                clearInterval(interval);
                setIsOptimizing(false);
                audioService.playSound('success');
            }
        }, 1500);
    }, [isOptimizing]);

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="p-4 md:p-6 space-y-6">
                {/* 1. Autonomous Optimization Panel */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-white flex items-center gap-3"><TrimIcon className="w-6 h-6 text-fuchsia-400" />Autonomous Optimization</h2>
                            <p className="text-gray-400 mt-2">Leverage AI to analyze metrics, identify bottlenecks, and apply performance improvements automatically.</p>
                        </div>
                        <button onClick={handleOptimize} disabled={isOptimizing} className="w-full md:w-auto flex-shrink-0 px-6 py-3 bg-fuchsia-600 text-white font-semibold rounded-md hover:bg-fuchsia-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                            {isOptimizing ? <Loader /> : <SparklesIcon className="w-5 h-5" />}
                            {isOptimizing ? 'Optimizing...' : 'Run 1-Click Optimization'}
                        </button>
                    </div>
                    {optimizationLog.length > 0 && (
                        <div className="mt-4 p-4 bg-black/30 rounded-md font-mono text-xs text-gray-300 max-h-40 overflow-y-auto">
                            {optimizationLog.map((log, i) => <p key={i} className="animate-fade-in">{log}</p>)}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. Performance Metrics Panel */}
                    <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Live Performance Metrics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <MetricCard title="API Latency" metric={metrics.apiLatency} />
                            <MetricCard title="Error Rate" metric={metrics.errorRate} />
                            <MetricCard title="Cache Hit Ratio" metric={metrics.cacheHitRatio} />
                            <MetricCard title="User Interaction Time" metric={metrics.userInteractionTime} />
                        </div>
                    </div>

                    {/* 3. Cache & Analytics Panel */}
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Cache Health</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">Items in Cache:</span> <span className="font-mono text-gray-200">{cacheStats.items}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Cache Size:</span> <span className="font-mono text-gray-200">{cacheStats.size.toFixed(1)} MB</span></div>
                            </div>
                            <button onClick={handlePurgeCache} className="w-full mt-4 text-sm px-4 py-2 bg-red-600/50 text-red-200 rounded-md hover:bg-red-600/80 transition-colors">Purge Cache</button>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">AI Performance Analytics</h3>
                            <button onClick={handleGenerateReport} disabled={isReportLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50">
                                {isReportLoading ? <Loader /> : <DocumentChartBarIcon className="w-5 h-5" />}
                                {isReportLoading ? 'Analyzing...' : 'Generate Report'}
                            </button>
                            {report && (
                                <div className="mt-4 p-3 bg-gray-900/50 rounded-md border border-gray-600/50 max-h-60 overflow-y-auto">
                                    <pre className="text-xs whitespace-pre-wrap font-sans text-gray-300">{report}</pre>
                                </div>
                            )}
                             {reportError && (
                                <div className="mt-4 p-3 bg-red-900/50 border border-red-700/50 rounded-md text-sm text-red-300">
                                    {reportError}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <TabFooter />
        </div>
    );
};

export default TrimAgent;