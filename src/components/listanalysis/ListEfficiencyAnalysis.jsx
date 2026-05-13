import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Explorer from './Explorer';
import IQVIACrossover from './IQVIACrossover';
import LeasingDecision from './LeasingDecision';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import '../../styles/ListEfficiencyAnalysis.css';
import '../../styles/SectionHeaders.css';

const SUB_TABS = [
    { key: 'explorer', label: 'Explorer' },
    { key: 'iqvia-crossover', label: 'IQVIA Crossover' },
    { key: 'leasing-decision', label: 'Leasing Decision' },
];

const TYPE_VALUES = ['brand', 'segment', 'tag', 'digital_list'];

const TYPE_OPTION_LABELS = {
    brand: 'Brands',
    segment: 'AC Segments',
    tag: 'AC Tags',
    digital_list: 'Digital Lists',
};

const LABEL_TO_KEY = Object.fromEntries(
    TYPE_VALUES.map(v => [TYPE_OPTION_LABELS[v], v])
);

const ListEfficiencyAnalysis = ({ externalSearch = '' }) => {
    const [activeSubTab, setActiveSubTab] = useState(() => {
        try {
            return localStorage.getItem('listEfficiencySubTab') || 'explorer';
        } catch (e) {
            return 'explorer';
        }
    });

    const [explorerSelectedTypes, setExplorerSelectedTypes] = useState(() => {
        try {
            const saved = localStorage.getItem('explorerSelectedTypes');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [...TYPE_VALUES];
    });

    const [explorerTypeCounts, setExplorerTypeCounts] = useState({});

    useEffect(() => {
        try { localStorage.setItem('listEfficiencySubTab', activeSubTab); } catch (e) {}
    }, [activeSubTab]);

    useEffect(() => {
        try { localStorage.setItem('explorerSelectedTypes', JSON.stringify(explorerSelectedTypes)); } catch (e) {}
    }, [explorerSelectedTypes]);

    const typeOptions = useMemo(() => (
        TYPE_VALUES.map(v => ({ value: TYPE_OPTION_LABELS[v], count: explorerTypeCounts[v] || 0 }))
    ), [explorerTypeCounts]);

    const selectedTypeLabels = useMemo(() => (
        explorerSelectedTypes.map(t => TYPE_OPTION_LABELS[t])
    ), [explorerSelectedTypes]);

    const handleTypeChange = useCallback((newLabels) => {
        const keys = newLabels.map(l => LABEL_TO_KEY[l]).filter(Boolean);
        setExplorerSelectedTypes(keys);
    }, []);

    return (
        <div className="le-shell">
            <div className="section-header-bar">
                <h3>List Efficiency</h3>
            </div>

            <div className="le-subtabs-row">
                <div className="le-subtabs">
                    {SUB_TABS.map(t => (
                        <button
                            key={t.key}
                            className={`le-subtab ${activeSubTab === t.key ? 'active' : ''}`}
                            onClick={() => setActiveSubTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                {activeSubTab === 'explorer' && (
                    <div className="le-subtabs-controls">
                        <MultiSelectDropdown
                            options={typeOptions}
                            selected={selectedTypeLabels}
                            onChange={handleTypeChange}
                            placeholder="Select types..."
                            searchPlaceholder="Search types..."
                        />
                    </div>
                )}
            </div>

            <div className="le-content">
                {activeSubTab === 'explorer' && (
                    <Explorer
                        externalSearch={externalSearch}
                        selectedTypes={explorerSelectedTypes}
                        onTypeCountsChange={setExplorerTypeCounts}
                    />
                )}
                {activeSubTab === 'iqvia-crossover' && <IQVIACrossover />}
                {activeSubTab === 'leasing-decision' && <LeasingDecision />}
            </div>
        </div>
    );
};

export default ListEfficiencyAnalysis;