// services/telemetry.service.ts

import {
    InteractionEvent,
    TelemetryConfig,
    GlobalTelemetryContext,
} from '../types/telemetry';

// Sensible defaults to ensure the service is operational even with minimal configuration
const DEFAULT_CONFIG: TelemetryConfig = {
    backendEndpoint: '/api/telemetry/events', // Standardized API endpoint for telemetry ingestion
    batchSize: 10, // Optimize network traffic by grouping events
    batchIntervalMs: 5000, // Ensure timely data transmission even for sparse event streams
    maxQueueSize: 100, // Safeguard against excessive memory consumption
};

/**
 * A robust, performance-optimized Telemetry Service for capturing and
 * persistently sending structured interaction events. It intelligently handles
 * event enrichment, resilient queuing, and asynchronous batch transmission
 * to prevent any degradation of frontend responsiveness.
 */
export class TelemetryService {
    private config: TelemetryConfig;
    private globalContext: GlobalTelemetryContext;
    private eventQueue: InteractionEvent[] = []; // In-memory queue for accumulating events
    private sendTimeout: ReturnType<typeof setTimeout> | null = null; // Manages timed dispatches
    private isSending: boolean = false; // Flag to prevent concurrent network requests and race conditions

    constructor(globalContext: GlobalTelemetryContext, config?: Partial<TelemetryConfig>) {
        if (!globalContext.userID || !globalContext.sessionID) {
            console.warn('TelemetryService initialized without valid userID or sessionID. Events may lack crucial context, impacting analytical insights.');
        }
        this.globalContext = globalContext;
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Proactively start the periodic send interval to ensure data freshness
        this.startSendInterval();
    }

    public updateGlobalContext(newContext: Partial<GlobalTelemetryContext>): void {
        this.globalContext = { ...this.globalContext, ...newContext };
        console.log('TelemetryService global context dynamically updated:', this.globalContext);
    }

    public getGlobalContext(): GlobalTelemetryContext {
        return this.globalContext;
    }

    public recordEvent(partialEvent: Omit<InteractionEvent, 'id' | 'timestamp' | 'userID' | 'sessionID'>): void {
        if (this.eventQueue.length >= this.config.maxQueueSize!) {
            console.warn(`TelemetryService queue is full (max: ${this.config.maxQueueSize}). Dropping event of type: ${partialEvent.eventType}. Consider increasing maxQueueSize or optimizing event frequency.`);
            return;
        }

        const enrichedEvent: InteractionEvent = {
            id: crypto.randomUUID(), // Assign a universally unique identifier
            timestamp: new Date().toISOString(), // Capture precise moment of event creation in ISO 8601
            ...this.globalContext, // Incorporate all static global context attributes
            ...partialEvent, // Overlay event-specific data
            contextDetails: { // Smartly merge contextDetails to avoid overwriting
                ...this.globalContext.contextDetails,
                ...partialEvent.contextDetails,
            }
        };

        this.eventQueue.push(enrichedEvent);
        console.log(`TelemetryService: Event '${enrichedEvent.eventType}' queued. Current queue size: ${this.eventQueue.length}.`);

        // Trigger an immediate send if the batch size threshold is met
        if (this.eventQueue.length >= this.config.batchSize!) {
            this.sendQueuedEvents();
        }
    }

    private async sendQueuedEvents(): Promise<void> {
        if (this.isSending || this.eventQueue.length === 0) {
            return; // Prevent redundant or concurrent dispatches
        }

        this.isSending = true;
        const eventsToSend = [...this.eventQueue]; // Capture current queue state
        this.eventQueue = []; // Clear the queue immediately
        
        // Clear any pending timed send to avoid duplicates
        if (this.sendTimeout) {
            clearTimeout(this.sendTimeout);
            this.sendTimeout = null;
        }

        try {
            console.log(`TelemetryService: Attempting to send ${eventsToSend.length} events to ${this.config.backendEndpoint}...`);
            const response = await fetch(this.config.backendEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventsToSend),
                keepalive: true, // Crucial for ensuring requests complete on page navigation/closure
            });

            if (!response.ok) {
                // Log non-2xx responses, but don't re-queue to prevent infinite loops for bad data
                console.error(`TelemetryService: Failed to send events. Status: ${response.status}. Response: ${await response.text()}`);
            } else {
                console.log(`TelemetryService: Successfully dispatched ${eventsToSend.length} events.`);
            }
        } catch (error) {
            console.error('TelemetryService: Network error encountered while sending events. Data might be lost:', error);
        } finally {
            this.isSending = false;
            this.startSendInterval(); // Re-arm the periodic sender
        }
    }

    private startSendInterval(): void {
        if (this.sendTimeout) clearTimeout(this.sendTimeout); // Clear existing timer to prevent duplicates
        this.sendTimeout = setTimeout(() => {
            if (this.eventQueue.length > 0) {
                this.sendQueuedEvents(); // Send if there are events
            } else {
                this.startSendInterval(); // If no events, re-arm the timer
            }
        }, this.config.batchIntervalMs);
    }

    public flushOnUnload(): void {
        if (this.eventQueue.length === 0) return;

        const eventsToFlush = [...this.eventQueue];
        this.eventQueue = []; // Clear the queue

        console.log(`TelemetryService: Attempting to flush ${eventsToFlush.length} events on application unload...`);

        if (navigator.sendBeacon) {
            // sendBeacon is ideal for analytics as it doesn't block page unload
            const success = navigator.sendBeacon(
                this.config.backendEndpoint,
                new Blob([JSON.stringify(eventsToFlush)], { type: 'application/json' })
            );
            if (!success) {
                 console.warn('TelemetryService: navigator.sendBeacon failed. Data may not have been sent reliably.');
            } else {
                 console.log(`TelemetryService: Successfully initiated sendBeacon for ${eventsToFlush.length} events.`);
            }
        } else {
            // Fallback for older browsers: use fetch with keepalive, which is less reliable on unload
             fetch(this.config.backendEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventsToFlush),
                keepalive: true,
            }).catch(e => console.error('TelemetryService: Fallback fetch on unload failed:', e));
        }
    }
}