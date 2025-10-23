// features/mia/MiaPanel.tsx
import React from 'react';
import MiaChat from './MiaChat';
import MiaAlerts from './MiaAlerts';

interface MiaPanelProps {
  onClose: () => void;
}

const MiaPanel: React.FC<MiaPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'chat' | 'alerts'>('chat');

  return (
    <div className="mia-panel">
      <div className="mia-panel-header">
        <h3 className="text-gray-800 font-semibold">Mia Assistant</h3>
        <button onClick={onClose} aria-label="Close panel">✖</button>
      </div>
      <div className="mia-panel-tabs">
        <button
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={activeTab === 'alerts' ? 'active' : ''}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
        </button>
      </div>
      <div className="mia-panel-content">
        {activeTab === 'chat' && <MiaChat />}
        {activeTab === 'alerts' && <MiaAlerts />}
      </div>
    </div>
  );
};

export default MiaPanel;
