import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../../config/api';

const TYPE_LABELS = {
    brand: 'Brand',
    segment: 'AC Segment',
    tag: 'AC Tag',
    digital_list: 'Digital List',
};

const OVERLAP_TYPE_LABELS = {
    brand: 'Brands',
    segment: 'AC Segments',
    tag: 'AC Tags',
    digital_list: 'Digital Lists',
};

const ExplorerEntityDetail = ({ entityType, entityName, onClose, onSelectEntity }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const url = `${API_BASE_URL}/api/list-leasing/entities/${entityType}/${encodeURIComponent(entityName)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to load entity detail');
            setData(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [entityType, entityName]);

    useEffect(() => { load(); }, [load]);

    const exportMembers = useCallback(() => {
        if (!data?.sample_members) return;
        const headers = ['NPI', 'Name', 'Specialty', 'State', 'City', 'Active'];
        const rows = data.sample_members.map(m => [m.npi, m.name, m.specialty, m.state, m.city, m.is_active ? 'Yes' : 'No']);
        const esc = (v) => {
            const s = String(v ?? '');
            return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${entityType}_${entityName.replace(/[^a-z0-9]/gi, '_')}_members.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [data, entityType, entityName]);

    const entity = data?.entity;

    return (
        <div className="explorer-modal-overlay" onClick={onClose}>
            <div className="explorer-modal" onClick={(e) => e.stopPropagation()}>
                <div className="explorer-modal-header">
                    <div>
                        <span className={`explorer-type-tag type-${entityType}`}>{TYPE_LABELS[entityType]}</span>
                        <h3>{entityName}</h3>
                        {entity?.market && <div className="explorer-modal-subtitle">{entity.market}{entity.agency ? ` · ${entity.agency}` : ''}{entity.pharma_company ? ` · ${entity.pharma_company}` : ''}</div>}
                    </div>
                    <button className="explorer-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="explorer-modal-body">
                    {loading && (
                        <div className="explorer-loading-card">
                            <div className="explorer-loading-title">Computing overlaps…</div>
                            <div className="explorer-loading-detail">Intersecting this entity against every other list and segment.</div>
                        </div>
                    )}
                    {error && <div className="explorer-error">{error}</div>}

                    {data && entity && (
                        <>
                            <div className="explorer-stat-grid">
                                <div className="explorer-stat-card">
                                    <div className="explorer-stat-label">Total HCPs</div>
                                    <div className="explorer-stat-value">{entity.size.toLocaleString()}</div>
                                </div>
                                <div className="explorer-stat-card status-owned">
                                    <div className="explorer-stat-label">MMC Owned</div>
                                    <div className="explorer-stat-value">{entity.owned.toLocaleString()}</div>
                                    <div className="explorer-stat-sub">{((entity.owned_pct || 0) * 100).toFixed(1)}%</div>
                                </div>
                                <div className="explorer-stat-card status-iqvia">
                                    <div className="explorer-stat-label">IQVIA Only</div>
                                    <div className="explorer-stat-value">{entity.iqvia.toLocaleString()}</div>
                                </div>
                                <div className="explorer-stat-card status-hld">
                                    <div className="explorer-stat-label">HLD Only</div>
                                    <div className="explorer-stat-value">{entity.hld.toLocaleString()}</div>
                                </div>
                                <div className="explorer-stat-card status-missing">
                                    <div className="explorer-stat-label">Missing</div>
                                    <div className="explorer-stat-value">{entity.missing.toLocaleString()}</div>
                                </div>
                            </div>

                            {data.top_specialties && data.top_specialties.length > 0 && (
                                <div className="explorer-detail-section">
                                    <h4>Top Specialties</h4>
                                    <div className="explorer-spec-list">
                                        {data.top_specialties.slice(0, 8).map((s, i) => (
                                            <div key={i} className="explorer-spec-row">
                                                <span className="explorer-spec-name">{s.specialty || '—'}</span>
                                                <span className="explorer-spec-count">{s.count.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {Object.entries(data.overlaps || {}).some(([, items]) => items.length > 0) && (
                                <div className="explorer-detail-section">
                                    <h4>Overlaps With Other Entities</h4>
                                    <div className="explorer-overlap-grid">
                                        {Object.entries(data.overlaps).map(([type, items]) => (
                                            items.length > 0 && (
                                                <div key={type} className="explorer-overlap-group">
                                                    <div className="explorer-overlap-group-label">{OVERLAP_TYPE_LABELS[type] || type}</div>
                                                    <div className="explorer-overlap-list">
                                                        {items.map((o, i) => {
                                                            const pctHere = (o.pct_of_target || 0) * 100;
                                                            const pctThere = o.their_size ? (o.overlap / o.their_size) * 100 : 0;
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    className="explorer-overlap-row"
                                                                    onClick={() => onSelectEntity(o.type, o.name)}
                                                                    title={`${o.overlap.toLocaleString()} overlap · ${pctHere.toFixed(0)}% of this entity · ${pctThere.toFixed(0)}% of ${o.name} (${(o.their_size || 0).toLocaleString()})`}
                                                                >
                                                                    <span className="explorer-overlap-name">{o.name}</span>
                                                                    <span className="explorer-overlap-meta">
                                                                        <strong>{o.overlap.toLocaleString()}</strong>
                                                                        <span className="explorer-overlap-pct">
                                                                            <span style={{ color: '#888' }}>{pctHere.toFixed(0)}%</span>
                                                                            <span style={{ color: '#555', margin: '0 3px' }}>↔</span>
                                                                            <span style={{ color: '#0ff' }}>{pctThere.toFixed(0)}%</span>
                                                                        </span>
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}

                            {data.sample_members && data.sample_members.length > 0 && (
                                <div className="explorer-detail-section">
                                    <div className="explorer-section-header">
                                        <h4>Sample Members ({data.sample_members.length})</h4>
                                        <button className="explorer-export-btn-small" onClick={exportMembers}>Export sample</button>
                                    </div>
                                    <div className="explorer-member-table-wrap">
                                        <table className="explorer-member-table">
                                            <thead>
                                                <tr>
                                                    <th>NPI</th>
                                                    <th>Name</th>
                                                    <th>Specialty</th>
                                                    <th>Location</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.sample_members.map((m, i) => (
                                                    <tr key={i}>
                                                        <td className="mono">{m.npi}</td>
                                                        <td>{m.name || '—'}</td>
                                                        <td>{m.specialty || '—'}</td>
                                                        <td>{[m.city, m.state].filter(Boolean).join(', ') || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExplorerEntityDetail;