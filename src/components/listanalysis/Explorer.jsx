import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';
import ExplorerEntityDetail from './leasing/ExplorerEntityDetail';
import '../../styles/AudienceQueryBuilder.css';
import '../../styles/Explorer.css';

const TYPE_LABELS = {
    brand: 'Brand',
    segment: 'AC Segment',
    tag: 'AC Tag',
    digital_list: 'Digital List',
};

const Explorer = ({ externalSearch = '', selectedTypes = [], onTypeCountsChange }) => {
    const [allEntities, setAllEntities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [cacheExpiresAt, setCacheExpiresAt] = useState(null);

    const [sortField, setSortField] = useState('size');
    const [sortDir, setSortDir] = useState('desc');

    const [selectedEntity, setSelectedEntity] = useState(null);

    const searchTerm = externalSearch;

    const fetchEntities = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/list-leasing/entities`);
            if (!res.ok) throw new Error('Failed to load entities');
            const data = await res.json();
            setAllEntities(data.entities || []);
            if (onTypeCountsChange) onTypeCountsChange(data.type_counts || {});
            setCacheExpiresAt(data.cache_expires_at);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [onTypeCountsChange]);

    useEffect(() => {
        fetchEntities();
    }, [fetchEntities]);

    const handleSort = useCallback((field) => {
        if (sortField === field) {
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir(field === 'name' || field === 'type' ? 'asc' : 'desc');
        }
    }, [sortField]);

    const filteredEntities = useMemo(() => {
        let list = allEntities;
        const typeSet = new Set(selectedTypes);
        list = list.filter(e => typeSet.has(e.type));
        if (searchTerm && searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            list = list.filter(e =>
                (e.name || '').toLowerCase().includes(q)
                || (e.market || '').toLowerCase().includes(q)
                || (e.agency || '').toLowerCase().includes(q)
                || (e.top_specialty || '').toLowerCase().includes(q)
            );
        }
        const sorted = [...list];
        sorted.sort((a, b) => {
            let av = a[sortField];
            let bv = b[sortField];
            if (av == null) av = '';
            if (bv == null) bv = '';
            if (typeof av === 'string') {
                const cmp = av.localeCompare(bv);
                return sortDir === 'asc' ? cmp : -cmp;
            }
            return sortDir === 'asc' ? av - bv : bv - av;
        });
        return sorted;
    }, [allEntities, selectedTypes, searchTerm, sortField, sortDir]);

    const exportCSV = useCallback(() => {
        const headers = ['Type', 'Name', 'Size', 'Owned', 'IQVIA', 'HLD', 'Missing', 'Owned %', 'Market', 'Agency', 'Top Specialty'];
        const rows = filteredEntities.map(e => [
            TYPE_LABELS[e.type] || e.type,
            e.name,
            e.size,
            e.owned,
            e.iqvia,
            e.hld,
            e.missing,
            ((e.owned_pct || 0) * 100).toFixed(1) + '%',
            e.market || '',
            e.agency || '',
            e.top_specialty || '',
        ]);
        const esc = (v) => {
            const s = String(v ?? '');
            return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'list_explorer.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredEntities]);

    const sortIndicator = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    return (
        <div className="explorer-container">
            {error && <div className="explorer-error">{error}</div>}

            {loading && allEntities.length === 0 && (
                <div className="explorer-loading-card">
                    <div className="explorer-loading-title">Loading…</div>
                </div>
            )}

            {!loading && allEntities.length > 0 && (
                <div className="explorer-meta-row">
                    <div className="explorer-meta-left">
                        <span><strong>{filteredEntities.length.toLocaleString()}</strong> of {allEntities.length.toLocaleString()} entities</span>
                        {cacheExpiresAt && (
                            <span className="explorer-cache-stamp">Cache valid until {new Date(cacheExpiresAt).toLocaleTimeString()}</span>
                        )}
                    </div>
                    {filteredEntities.length > 0 && (
                        <button className="export-button" onClick={exportCSV}>Export CSV</button>
                    )}
                </div>
            )}

            {!loading && filteredEntities.length === 0 && allEntities.length > 0 && (
                <div className="explorer-empty">No entities match your filters.</div>
            )}

            {filteredEntities.length > 0 && (
                <div className="explorer-table-wrap">
                    <table className="explorer-table">
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => handleSort('type')}>Type{sortIndicator('type')}</th>
                                <th className="sortable" onClick={() => handleSort('name')}>Name{sortIndicator('name')}</th>
                                <th className="num sortable" onClick={() => handleSort('size')}>Size{sortIndicator('size')}</th>
                                <th className="num sortable" onClick={() => handleSort('owned')}>Owned{sortIndicator('owned')}</th>
                                <th className="num sortable" onClick={() => handleSort('iqvia')}>IQVIA{sortIndicator('iqvia')}</th>
                                <th className="num sortable" onClick={() => handleSort('hld')}>HLD{sortIndicator('hld')}</th>
                                <th className="num sortable" onClick={() => handleSort('missing')}>Missing{sortIndicator('missing')}</th>
                                <th className="num sortable" onClick={() => handleSort('owned_pct')}>Owned %{sortIndicator('owned_pct')}</th>
                                <th className="sortable" onClick={() => handleSort('market')}>Market / Agency{sortIndicator('market')}</th>
                                <th className="sortable" onClick={() => handleSort('top_specialty')}>Top Specialty{sortIndicator('top_specialty')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntities.map((e, i) => (
                                <tr key={`${e.type}-${e.name}-${i}`} onClick={() => setSelectedEntity({ type: e.type, name: e.name })}>
                                    <td>{TYPE_LABELS[e.type] || e.type}</td>
                                    <td className="explorer-name-cell">{e.name}</td>
                                    <td className="num">{e.size.toLocaleString()}</td>
                                    <td className="num">{e.owned.toLocaleString()}</td>
                                    <td className="num">{e.iqvia.toLocaleString()}</td>
                                    <td className="num">{e.hld.toLocaleString()}</td>
                                    <td className="num">{e.missing.toLocaleString()}</td>
                                    <td className="num">{((e.owned_pct || 0) * 100).toFixed(1)}%</td>
                                    <td className="explorer-market-cell">
                                        {e.market || '—'}
                                        {e.agency && <span className="explorer-agency"> · {e.agency}</span>}
                                    </td>
                                    <td className="explorer-spec-cell">{e.top_specialty || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedEntity && (
                <ExplorerEntityDetail
                    entityType={selectedEntity.type}
                    entityName={selectedEntity.name}
                    onClose={() => setSelectedEntity(null)}
                    onSelectEntity={(t, n) => setSelectedEntity({ type: t, name: n })}
                />
            )}
        </div>
    );
};

export default Explorer;