import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../../../config/api';

const ACTION_LABELS = {
    let_expire: 'Let Expire',
    keep: 'Keep',
    convert_to_owned: 'Convert to Owned',
};

const STATUS_LABELS = {
    pending: 'Pending',
    executed: 'Executed',
    reverted: 'Reverted',
};

const DecisionQueueView = ({ results, refreshKey, onDecisionSaved, onSelectNpi }) => {
    const [savedDecisions, setSavedDecisions] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [bulkActionConfirm, setBulkActionConfirm] = useState(null);

    const candidates = useMemo(() => {
        return (results?.combined_unique || []).filter(r => r.ownership_status === 'MMC Owned (let license expire)');
    }, [results]);

    const candidateNpis = useMemo(() => candidates.map(c => c.npi), [candidates]);

    const loadSavedDecisions = useCallback(async () => {
        if (candidateNpis.length === 0) {
            setSavedDecisions({});
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/list-leasing/decisions`);
            if (!res.ok) throw new Error('Failed to load decisions');
            const data = await res.json();
            const map = {};
            (data.decisions || []).forEach(d => {
                if (!map[d.npi]) map[d.npi] = d;
            });
            setSavedDecisions(map);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [candidateNpis]);

    useEffect(() => {
        loadSavedDecisions();
    }, [loadSavedDecisions, refreshKey]);

    const saveDecision = useCallback(async (npi, action, brands, licenseSource) => {
        setSaving(true);
        setError(null);
        try {
            const existing = savedDecisions[npi];
            if (existing) {
                const res = await fetch(`${API_BASE_URL}/api/list-leasing/decisions/${existing.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, license_source: licenseSource, brand_context: brands }),
                });
                if (!res.ok) throw new Error('Save failed');
            } else {
                const res = await fetch(`${API_BASE_URL}/api/list-leasing/decisions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        npi,
                        action,
                        license_source: licenseSource,
                        brand_context: brands,
                        status: 'pending',
                    }),
                });
                if (!res.ok) throw new Error('Save failed');
            }
            await loadSavedDecisions();
            onDecisionSaved && onDecisionSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }, [savedDecisions, loadSavedDecisions, onDecisionSaved]);

    const bulkApply = useCallback(async (action) => {
        setSaving(true);
        setError(null);
        try {
            const items = candidates
                .filter(c => {
                    const existing = savedDecisions[c.npi];
                    return !existing || existing.action !== action;
                })
                .map(c => {
                    const licenseSource = c.iqvia_licensed && c.hld_licensed
                        ? 'IQVIA+HLD'
                        : c.iqvia_licensed ? 'IQVIA' : c.hld_licensed ? 'HLD' : null;
                    return {
                        npi: c.npi,
                        action,
                        license_source: licenseSource,
                        brand_context: (c.all_brands || [c.brand]).join('; '),
                        status: 'pending',
                    };
                });
            if (items.length === 0) {
                setBulkActionConfirm(null);
                setSaving(false);
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/list-leasing/decisions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decisions: items }),
            });
            if (!res.ok) throw new Error('Bulk save failed');
            await loadSavedDecisions();
            onDecisionSaved && onDecisionSaved();
            setBulkActionConfirm(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }, [candidates, savedDecisions, loadSavedDecisions, onDecisionSaved]);

    const exportQueue = useCallback(() => {
        const headers = ['NPI', 'Specialty', 'Brands', 'License Source', 'Decision', 'Status', 'Decided At'];
        const rows = candidates.map(c => {
            const decision = savedDecisions[c.npi];
            const licenseSource = c.iqvia_licensed && c.hld_licensed
                ? 'IQVIA+HLD'
                : c.iqvia_licensed ? 'IQVIA' : c.hld_licensed ? 'HLD' : '';
            return [
                c.npi,
                c.specialty || '',
                (c.all_brands || [c.brand]).join('; '),
                licenseSource,
                decision ? ACTION_LABELS[decision.action] : '',
                decision ? STATUS_LABELS[decision.status] : '',
                decision?.decided_at || '',
            ];
        });
        const csv = [headers, ...rows].map(r =>
            r.map(v => {
                const s = String(v ?? '');
                if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                    return '"' + s.replace(/"/g, '""') + '"';
                }
                return s;
            }).join(',')
        ).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'leasing_decision_queue.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [candidates, savedDecisions]);

    const decisionCounts = useMemo(() => {
        const out = { let_expire: 0, keep: 0, convert_to_owned: 0, undecided: 0 };
        candidates.forEach(c => {
            const d = savedDecisions[c.npi];
            if (d) out[d.action] = (out[d.action] || 0) + 1;
            else out.undecided += 1;
        });
        return out;
    }, [candidates, savedDecisions]);

    if (candidates.length === 0) {
        return (
            <div className="leasing-queue-section">
                <div className="leasing-queue-header">
                    <h3>Decision Queue</h3>
                </div>
                <div className="leasing-empty">No "Let Expire" candidates in current scope. Either you don't have any redundant leases, or no brand sources are selected.</div>
            </div>
        );
    }

    return (
        <div className="leasing-queue-section">
            <div className="leasing-queue-header">
                <h3>Decision Queue ({candidates.length.toLocaleString()} candidates)</h3>
                <div className="leasing-queue-counts">
                    <span className="leasing-pill leasing-pill-let-expire">{decisionCounts.let_expire} Let Expire</span>
                    <span className="leasing-pill leasing-pill-keep">{decisionCounts.keep} Keep</span>
                    <span className="leasing-pill leasing-pill-convert">{decisionCounts.convert_to_owned} Convert</span>
                    <span className="leasing-pill leasing-pill-undecided">{decisionCounts.undecided} Undecided</span>
                </div>
            </div>

            <div className="leasing-queue-actions">
                <button
                    className="leasing-btn leasing-btn-secondary"
                    disabled={saving}
                    onClick={() => setBulkActionConfirm('let_expire')}
                >
                    Mark All as Let Expire
                </button>
                <button className="leasing-btn-export" onClick={exportQueue}>Export Queue CSV</button>
            </div>

            {bulkActionConfirm && (
                <div className="leasing-confirm-banner">
                    <span>Mark all {candidates.length.toLocaleString()} candidates as <strong>{ACTION_LABELS[bulkActionConfirm]}</strong>?</span>
                    <button className="leasing-btn leasing-btn-primary" onClick={() => bulkApply(bulkActionConfirm)} disabled={saving}>
                        {saving ? 'Applying...' : 'Confirm'}
                    </button>
                    <button className="leasing-btn leasing-btn-secondary" onClick={() => setBulkActionConfirm(null)}>Cancel</button>
                </div>
            )}

            {error && <div className="leasing-error">{error}</div>}
            {loading && <div className="leasing-loading">Loading decisions…</div>}

            <div className="leasing-table-wrap">
                <table className="leasing-table">
                    <thead>
                        <tr>
                            <th>NPI</th>
                            <th>Specialty</th>
                            <th>Brands</th>
                            <th>License</th>
                            <th>Decision</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {candidates.map(c => {
                            const decision = savedDecisions[c.npi];
                            const licenseSource = c.iqvia_licensed && c.hld_licensed
                                ? 'IQVIA+HLD'
                                : c.iqvia_licensed ? 'IQVIA' : c.hld_licensed ? 'HLD' : '—';
                            const brandsStr = (c.all_brands || [c.brand]).join(', ');
                            return (
                                <tr key={c.npi}>
                                    <td><button className="leasing-npi-link" onClick={() => onSelectNpi(c.npi)}>{c.npi}</button></td>
                                    <td>{c.specialty || '—'}</td>
                                    <td>{brandsStr}</td>
                                    <td>{licenseSource}</td>
                                    <td>
                                        <select
                                            value={decision?.action || ''}
                                            disabled={saving}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    saveDecision(c.npi, e.target.value, brandsStr, licenseSource === '—' ? null : licenseSource);
                                                }
                                            }}
                                        >
                                            <option value="">— Choose —</option>
                                            <option value="let_expire">{ACTION_LABELS.let_expire}</option>
                                            <option value="keep">{ACTION_LABELS.keep}</option>
                                            <option value="convert_to_owned">{ACTION_LABELS.convert_to_owned}</option>
                                        </select>
                                    </td>
                                    <td>{decision ? STATUS_LABELS[decision.status] : '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DecisionQueueView;