// components/common/TabFooter.tsx

import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

const TabFooter: React.FC = () => {
    const { globalContext } = useTelemetry();
    const { appVersion, userID, sessionID } = globalContext;

    if (!appVersion || !userID || !sessionID) {
        return null;
    }

    return (
        <footer className="flex-shrink-0 px-4 py-2 border-t border-gray-700/50 bg-gray-900/20 text-xs text-gray-500">
            <div className="flex justify-between items-center">
                <span className="truncate" title={userID}>
                    UserID: <span className="font-mono">{userID}</span>
                </span>
                <span className="truncate" title={sessionID}>
                    SessionID: <span className="font-mono">{sessionID}</span>
                </span>
                <span title={`Version ${appVersion}`}>
                    v{appVersion}
                </span>
            </div>
        </footer>
    );
};

export default TabFooter;