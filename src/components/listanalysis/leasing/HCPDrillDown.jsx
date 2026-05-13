import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../../../config/api';

const HCPDrillDown = ({ npi, onClose, onDecisionSaved }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [savingDecision, setSavingDecision] = useState(false);
    const [decisionForm, setDecisionForm] = useState({ action: '', notes: '' });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/list-leasing/hcp/${npi}`);
            if (!res.ok) throw new Error('Failed to load HCP');
            const d = await res.json();
            setData(d);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [npi]);

    useEffect(() => { load(); }, [load]);

    const currentSegments = useMemo(() => {
        if (!data?.user_profiles) return [];
        const all = new Set();
        data.user_profiles.forEach(up => {
            (up.ac_segments || []).forEach(s => all.add(s));
        });
        return Array.from(all);
    }, [data]);

    const currentTags = useMemo(() => {
        if (!data?.user_profiles) return [];
        const all = new Set();
        data.user_profiles.forEach(up => {
            (up.ac_tags || []).forEach(t => all.add(t));
        });
        return Array.from(all);
    }, [data]);

    const targetListEntries = useMemo(() => {
        const entries = [];
        if (data?.universal_profile?.target_lists) {
            (data.universal_profile.target_lists || []).forEach(tl => entries.push(tl));
        }
        return entries.sort((a, b) => (b.attached_at || '').localeCompare(a.attached_at || ''));
    }, [data]);

    const inferLicenseSource = useMemo(() => {
        const hasIQVIA = currentSegments.includes('IQVIA HCPs');
        const hasHLD = currentSegments.includes('HLD HCPs');
        if (hasIQVIA && hasHLD) return 'IQVIA+HLD';
        if (hasIQVIA) return 'IQVIA';
        if (hasHLD) return 'HLD';
        return null;
    }, [currentSegments]);

    const saveDecision = useCallback(async () => {
        if (!decisionForm.action) return;
        setSavingDecision(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/list-leasing/decisions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    npi,
                    action: decisionForm.action,
                    license_source: inferLicenseSource,
                    notes: decisionForm.notes,
                    status: 'pending',
                }),
            });
            if (!res.ok) throw new Error('Save failed');
            setDecisionForm({ action: '', notes: '' });
            await load();
            onDecisionSaved && onDecisionSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingDecision(false);
        }
    }, [npi, decisionForm, inferLicenseSource, load, onDecisionSaved]);

    const segmentEvents = data?.membership_events?.filter(e => e.dimension === 'segment') || [];
    const profile = data?.universal_profile;
    const fullName = profile
        ? [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ')
        : '';

    return (
        <div className="leasing-modal-overlay" onClick={onClose}>
            <div className="leasing-modal" onClick={(e) => e.stopPropagation()}>
                <div className="leasing-modal-header">
                    <div>
                        <h3>NPI {npi}</h3>
                        {fullName && <div className="leasing-modal-subtitle">{fullName}{profile.credential ? `, ${profile.credential}` : ''}</div>}
                    </div>
                    <button className="leasing-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="leasing-modal-body">
                    {loading && <div className="leasing-loading">Loading…</div>}
                    {error && <div className="leasing-error">{error}</div>}

                    {data && (
                        <>
                            {profile && (
                                <div className="leasing-drill-section">
                                    <h4>Profile</h4>
                                    <div className="leasing-drill-grid">
                                        <div><span className="leasing-drill-label">Specialty</span><span>{profile.primary_specialty || '—'}</span></div>
                                        <div><span className="leasing-drill-label">Taxonomy</span><span>{profile.primary_taxonomy_code || '—'}</span></div>
                                        <div><span className="leasing-drill-label">Organization</span><span>{profile.organization_name || '—'}</span></div>
                                        <div><span className="leasing-drill-label">Location</span><span>{[profile.practice_city, profile.practice_state].filter(Boolean).join(', ') || '—'}</span></div>
                                        <div><span className="leasing-drill-label">Active</span><span>{profile.is_active ? 'Yes' : 'No'}</span></div>
                                    </div>
                                </div>
                            )}

                            <div className="leasing-drill-section">
                                <h4>Current AC Segments ({currentSegments.length})</h4>
                                {currentSegments.length === 0 ? (
                                    <div className="leasing-empty-inline">No segments on record</div>
                                ) : (
                                    <div className="leasing-segment-list">
                                        {currentSegments.map(s => (
                                            <span key={s} className={`leasing-segment-pill ${s.includes('Matrix Owned') ? 'owned' : (s.includes('IQVIA') || s.includes('HLD')) ? 'licensed' : ''}`}>{s}</span>
                                        ))}
                                    </div>
                                )}
                                {currentTags.length > 0 && (
                                    <div className="leasing-tags-row">
                                        <span className="leasing-drill-label">Tags:</span>
                                        {currentTags.map(t => <span key={t} className="leasing-tag-pill">{t}</span>)}
                                    </div>
                                )}
                            </div>

                            {data.engagement && (
                                <div className="leasing-drill-section">
                                    <h4>Engagement</h4>
                                    <div className="leasing-drill-grid">
                                        <div><span className="leasing-drill-label">Received</span><span>{data.engagement.campaigns_received?.toLocaleString() || 0}</span></div>
                                        <div><span className="leasing-drill-label">Opened</span><span>{data.engagement.campaigns_opened?.toLocaleString() || 0}</span></div>
                                        <div><span className="leasing-drill-label">Clicked</span><span>{data.engagement.campaigns_clicked?.toLocaleString() || 0}</span></div>
                                        <div><span className="leasing-drill-label">Unique Open Rate</span><span>{data.engagement.unique_open_rate || 0}%</span></div>
                                        <div><span className="leasing-drill-label">Last Engaged</span><span>{data.engagement.last_campaign_date || '—'}</span></div>
                                    </div>
                                </div>
                            )}

                            <div className="leasing-drill-section">
                                <h4>Target List History ({targetListEntries.length})</h4>
                                {targetListEntries.length === 0 ? (
                                    <div className="leasing-empty-inline">Not on any uploaded target lists</div>
                                ) : (
                                    <div className="leasing-tl-list">
                                        {targetListEntries.map((tl, i) => (
                                            <div key={i} className="leasing-tl-entry">
                                                <span className="leasing-tl-name">{tl.campaign_name || tl.campaign_id || '—'}</span>
                                                <span className="leasing-tl-date">{tl.attached_at ? new Date(tl.attached_at).toLocaleDateString() : '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="leasing-drill-section">
                                <h4>Segment Change Timeline</h4>
                                {segmentEvents.length === 0 ? (
                                    <div className="leasing-empty-inline">No segment events recorded</div>
                                ) : (
                                    <div className="leasing-event-list">
                                        {segmentEvents.slice(0, 30).map((ev, i) => (
                                            <div key={i} className={`leasing-event-row leasing-event-${ev.event}`}>
                                                <span className="leasing-event-date">{ev.at ? new Date(ev.at).toLocaleDateString() : '—'}</span>
                                                <span className={`leasing-event-badge event-${ev.event}`}>{ev.event}</span>
                                                <span className="leasing-event-name">{ev.name}</span>
                                            </div>
                                        ))}
                                        {segmentEvents.length > 30 && (
                                            <div className="leasing-empty-inline">+{segmentEvents.length - 30} more</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="leasing-drill-section">
                                <h4>Decision History ({data.decisions?.length || 0})</h4>
                                {(data.decisions || []).length === 0 ? (
                                    <div className="leasing-empty-inline">No decisions on record</div>
                                ) : (
                                    <div className="leasing-decision-history">
                                        {data.decisions.map(d => (
                                            <div key={d.id} className="leasing-decision-row">
                                                <span className="leasing-decision-action">{d.action}</span>
                                                <span className="leasing-decision-meta">{d.license_source || '—'}</span>
                                                <span className="leasing-decision-status">{d.status}</span>
                                                <span className="leasing-decision-date">{d.decided_at ? new Date(d.decided_at).toLocaleDateString() : '—'}</span>
                                                {d.notes && <div className="leasing-decision-notes">{d.notes}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="leasing-drill-section leasing-decision-form">
                                <h4>Add Decision</h4>
                                <div className="leasing-form-row">
                                    <select
                                        value={decisionForm.action}
                                        onChange={(e) => setDecisionForm({ ...decisionForm, action: e.target.value })}
                                    >
                                        <option value="">— Choose action —</option>
                                        <option value="let_expire">Let Expire</option>
                                        <option value="keep">Keep</option>
                                        <option value="convert_to_owned">Convert to Owned</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Notes (optional)"
                                        value={decisionForm.notes}
                                        onChange={(e) => setDecisionForm({ ...decisionForm, notes: e.target.value })}
                                    />
                                    <button
                                        className="leasing-btn leasing-btn-primary"
                                        disabled={!decisionForm.action || savingDecision}
                                        onClick={saveDecision}
                                    >
                                        {savingDecision ? 'Saving...' : 'Save Decision'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HCPDrillDown;