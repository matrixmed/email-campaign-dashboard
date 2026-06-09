import React, { useState } from 'react';
import CleanedListImport from './CleanedListImport';
import SubscriberIntake from './SubscriberIntake';
import '../../styles/SubscriberIntake.css';

const SUBTAB_KEY = 'subscriberIntakeSubtab';

const SubscriberIntakeTab = ({ externalSearch = '' }) => {
    const [activeSub, setActiveSub] = useState(() => {
        try { return localStorage.getItem(SUBTAB_KEY) || 'import'; } catch { return 'import'; }
    });

    const select = (v) => {
        setActiveSub(v);
        try { localStorage.setItem(SUBTAB_KEY, v); } catch {}
    };

    return (
        <div className="subscriber-intake-tab">
            <div className="section-header-bar">
                <h3>Subscriber Intake</h3>
            </div>
            <div className="archive-agency-tabs">
                <button
                    className={`archive-tab-button ${activeSub === 'import' ? 'active' : ''}`}
                    onClick={() => select('import')}
                >
                    Cleaned
                </button>
                <button
                    className={`archive-tab-button ${activeSub === 'raw' ? 'active' : ''}`}
                    onClick={() => select('raw')}
                >
                    Raw
                </button>
            </div>
            {activeSub === 'import'
                ? <CleanedListImport />
                : <SubscriberIntake externalSearch={externalSearch} />}
        </div>
    );
};

export default SubscriberIntakeTab;
