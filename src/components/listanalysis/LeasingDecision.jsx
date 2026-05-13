import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';
import SourceSelectionPanel from './leasing/SourceSelectionPanel';
import LeasingResultsViewer from './leasing/LeasingResultsViewer';
import DecisionQueueView from './leasing/DecisionQueueView';
import HCPDrillDown from './leasing/HCPDrillDown';
import '../../styles/LeasingDecision.css';

const LeasingDecision = () => {
    const [availableSources, setAvailableSources] = useState(null);
    const [sourcesLoading, setSourcesLoading] = useState(false);
    const [sourcesError, setSourcesError] = useState(null);

    const [scope, setScope] = useState(() => {
        try {
            const saved = localStorage.getItem('leasingDecisionScope');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            universe: { type: 'derm' },
            brand_sources: [],
            time_window_months: 12,
            specialty_filter: null,
            market_filter: null,
            uploaded_brand_files: [],
            uploaded_universe_file: null,
        };
    });

    const [results, setResults] = useState(null);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [resultsError, setResultsError] = useState(null);

    const [drillNpi, setDrillNpi] = useState(null);
    const [showDecisionQueue, setShowDecisionQueue] = useState(false);
    const [decisionRefreshKey, setDecisionRefreshKey] = useState(0);

    useEffect(() => {
        try {
            localStorage.setItem('leasingDecisionScope', JSON.stringify(scope));
        } catch (e) {}
    }, [scope]);

    const fetchSources = useCallback(async (windowMonths) => {
        setSourcesLoading(true);
        setSourcesError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/list-leasing/available-sources?window_months=${windowMonths || 12}`);
            if (!res.ok) throw new Error('Failed to load source list');
            const data = await res.json();
            setAvailableSources(data);
        } catch (err) {
            setSourcesError(err.message);
        } finally {
            setSourcesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSources(scope.time_window_months);
    }, [scope.time_window_months, fetchSources]);

    const runAnalysis = useCallback(async () => {
        setResultsLoading(true);
        setResultsError(null);
        try {
            const universe = scope.universe?.type === 'uploaded' && scope.uploaded_universe_file
                ? { type: 'uploaded', file_token: scope.uploaded_universe_file.file_token }
                : scope.universe;

            const brand_sources = [...(scope.brand_sources || [])];
            (scope.uploaded_brand_files || []).forEach(f => {
                brand_sources.push({
                    type: 'uploaded',
                    file_token: f.file_token,
                    brand_label: f.brand_label || f.filename,
                });
            });

            const body = {
                universe,
                brand_sources,
                time_window_months: scope.time_window_months,
                specialty_filter: scope.specialty_filter,
                market_filter: scope.market_filter,
            };

            const res = await fetch(`${API_BASE_URL}/api/list-leasing/run-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Analysis failed');
            }
            const data = await res.json();
            setResults(data);
        } catch (err) {
            setResultsError(err.message);
        } finally {
            setResultsLoading(false);
        }
    }, [scope]);

    const handleDecisionSaved = useCallback(() => {
        setDecisionRefreshKey(k => k + 1);
    }, []);

    const summaryCounts = useMemo(() => {
        if (!results?.summary) return {};
        const out = {};
        results.summary.forEach(s => { out[s.status] = s.count; });
        return out;
    }, [results]);

    return (
        <div className="leasing-decision-container">
            <SourceSelectionPanel
                scope={scope}
                onScopeChange={setScope}
                availableSources={availableSources}
                sourcesLoading={sourcesLoading}
                sourcesError={sourcesError}
                onRefreshSources={() => fetchSources(scope.time_window_months)}
                onRunAnalysis={runAnalysis}
                resultsLoading={resultsLoading}
                hasResults={!!results}
            />

            {resultsError && (
                <div className="leasing-error">{resultsError}</div>
            )}

            {results && (
                <div className="leasing-results-section">
                    <div className="leasing-action-row">
                        <div className="leasing-totals-strip">
                            <span><strong>{results.totals.master_size?.toLocaleString()}</strong> NPIs in universe</span>
                            <span><strong>{results.totals.brands}</strong> brand{results.totals.brands === 1 ? '' : 's'}</span>
                            <span>{results.totals.matrix_npis_in_db?.toLocaleString()} Matrix Owned</span>
                            <span>{results.totals.iqvia_npis_in_db?.toLocaleString()} IQVIA</span>
                            <span>{results.totals.hld_npis_in_db?.toLocaleString()} HLD</span>
                        </div>
                        <div className="leasing-action-buttons">
                            <button
                                className="leasing-btn leasing-btn-secondary"
                                onClick={() => setShowDecisionQueue(s => !s)}
                            >
                                {showDecisionQueue ? 'Hide Decision Queue' : 'Decision Queue'}
                            </button>
                        </div>
                    </div>

                    {showDecisionQueue && (
                        <DecisionQueueView
                            results={results}
                            refreshKey={decisionRefreshKey}
                            onDecisionSaved={handleDecisionSaved}
                            onSelectNpi={setDrillNpi}
                        />
                    )}

                    <LeasingResultsViewer
                        results={results}
                        summaryCounts={summaryCounts}
                        onSelectNpi={setDrillNpi}
                    />
                </div>
            )}

            {drillNpi && (
                <HCPDrillDown
                    npi={drillNpi}
                    onClose={() => setDrillNpi(null)}
                    onDecisionSaved={handleDecisionSaved}
                />
            )}
        </div>
    );
};

export default LeasingDecision;