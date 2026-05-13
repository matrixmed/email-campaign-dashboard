import React, { useState, useMemo, useCallback } from 'react';

const RESULT_VIEWS = [
    { key: 'summary', label: 'Summary' },
    { key: 'brand-breakdown', label: 'Brand Breakdown' },
    { key: 'master-match', label: 'Master Match' },
    { key: 'top-hcps', label: 'Top HCPs' },
    { key: 'combined-unique', label: 'Combined (Unique)' },
    { key: 'match-results', label: 'Match Results' },
    { key: 'per-brand', label: 'Per Brand' },
];

const STATUS_ORDER = [
    'MMC Owned (let license expire)',
    'MMC Owned',
    'IQVIA + HLD Licensed',
    'IQVIA Licensed',
    'HLD Licensed',
    'Missing',
];

const STATUS_CLASS = {
    'MMC Owned (let license expire)': 'status-let-expire',
    'MMC Owned': 'status-owned',
    'IQVIA + HLD Licensed': 'status-both',
    'IQVIA Licensed': 'status-iqvia',
    'HLD Licensed': 'status-hld',
    'Missing': 'status-missing',
};

const downloadCSV = (filename, headers, rows) => {
    const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };
    const csv = [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const LeasingResultsViewer = ({ results, summaryCounts, onSelectNpi }) => {
    const [activeView, setActiveView] = useState('summary');
    const [perBrandSelected, setPerBrandSelected] = useState(null);
    const [pageSize] = useState(100);
    const [pages, setPages] = useState({});

    const setPage = useCallback((key, p) => {
        setPages(prev => ({ ...prev, [key]: p }));
    }, []);

    const currentPage = (key) => pages[key] || 1;

    const summarySorted = useMemo(() => {
        if (!results?.summary) return [];
        const map = {};
        results.summary.forEach(s => { map[s.status] = s.count; });
        const ordered = STATUS_ORDER
            .filter(s => map[s] !== undefined)
            .map(s => ({ status: s, count: map[s] }));
        const extras = results.summary.filter(s => !STATUS_ORDER.includes(s.status));
        return [...ordered, ...extras];
    }, [results]);

    const totalMaster = results?.totals?.master_size || 0;

    const renderSummary = () => (
        <div className="leasing-summary-view">
            <div className="leasing-summary-grid">
                {summarySorted.map(s => {
                    const pct = totalMaster ? ((s.count / totalMaster) * 100).toFixed(1) : '0.0';
                    return (
                        <div key={s.status} className={`leasing-status-card ${STATUS_CLASS[s.status] || ''}`}>
                            <div className="leasing-status-label">{s.status}</div>
                            <div className="leasing-status-count">{s.count.toLocaleString()}</div>
                            <div className="leasing-status-pct">{pct}% of universe</div>
                        </div>
                    );
                })}
            </div>
            <div className="leasing-summary-note">
                <strong>Let-Expire candidates</strong> are HCPs we already own (Matrix Owned Emails) AND have an active IQVIA or HLD lease for — likely redundant spend.
            </div>
        </div>
    );

    const renderBrandBreakdown = () => {
        const rows = results.brand_breakdown || [];
        if (rows.length === 0) return <div className="leasing-empty">No brand-target data in selected scope.</div>;
        return (
            <div className="leasing-table-section">
                <div className="leasing-table-actions">
                    <button
                        className="leasing-btn-export"
                        onClick={() => downloadCSV(
                            'brand_breakdown.csv',
                            ['Brand', 'Total NPIs', 'MMC Owned', 'Let Expire (Owned + Leased)', 'IQVIA Licensed (not owned)', 'HLD Licensed (not owned)', 'Missing'],
                            rows.map(r => [r.brand, r.total_npis, r.mmc_owned, r.let_expire, r.iqvia_licensed_not_owned, r.hld_licensed_not_owned, r.missing])
                        )}
                    >
                        Export CSV
                    </button>
                </div>
                <div className="leasing-table-wrap">
                    <table className="leasing-table">
                        <thead>
                            <tr>
                                <th>Brand</th>
                                <th className="num">Total NPIs</th>
                                <th className="num">MMC Owned</th>
                                <th className="num">Let Expire</th>
                                <th className="num">IQVIA Only</th>
                                <th className="num">HLD Only</th>
                                <th className="num">Missing</th>
                                <th className="num">Owned %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.brand}>
                                    <td>{r.brand}</td>
                                    <td className="num">{r.total_npis.toLocaleString()}</td>
                                    <td className="num">{r.mmc_owned.toLocaleString()}</td>
                                    <td className={`num ${r.let_expire > 0 ? 'highlight-let-expire' : ''}`}>{r.let_expire.toLocaleString()}</td>
                                    <td className="num">{r.iqvia_licensed_not_owned.toLocaleString()}</td>
                                    <td className="num">{r.hld_licensed_not_owned.toLocaleString()}</td>
                                    <td className="num">{r.missing.toLocaleString()}</td>
                                    <td className="num">{r.total_npis ? ((r.mmc_owned / r.total_npis) * 100).toFixed(1) : '0.0'}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderMasterMatch = () => {
        const rows = (results.master_match_results || []).filter(r => r.specialty);
        if (rows.length === 0) return <div className="leasing-empty">No specialty data available in universe.</div>;
        return (
            <div className="leasing-table-section">
                <div className="leasing-table-actions">
                    <button
                        className="leasing-btn-export"
                        onClick={() => downloadCSV(
                            'master_match_results.csv',
                            ['Specialty', 'MMC Owned', 'IQVIA Licensed', 'HLD Licensed', 'Total Reach', 'Total', 'Reach %'],
                            rows.map(r => [r.specialty, r.mmc_owned, r.iqvia_licensed, r.hld_licensed, r.total_reach, r.total, (r.reach_pct * 100).toFixed(1)])
                        )}
                    >
                        Export CSV
                    </button>
                </div>
                <div className="leasing-table-wrap">
                    <table className="leasing-table">
                        <thead>
                            <tr>
                                <th>Specialty</th>
                                <th className="num">MMC Owned</th>
                                <th className="num">IQVIA</th>
                                <th className="num">HLD</th>
                                <th className="num">Total Reach</th>
                                <th className="num">Total</th>
                                <th className="num">Reach %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i}>
                                    <td>{r.specialty}</td>
                                    <td className="num">{r.mmc_owned.toLocaleString()}</td>
                                    <td className="num">{r.iqvia_licensed.toLocaleString()}</td>
                                    <td className="num">{r.hld_licensed.toLocaleString()}</td>
                                    <td className="num">{r.total_reach.toLocaleString()}</td>
                                    <td className="num">{r.total.toLocaleString()}</td>
                                    <td className="num">{(r.reach_pct * 100).toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderTopHCPs = () => {
        const rows = results.top_hcps || [];
        if (rows.length === 0) return <div className="leasing-empty">No HCPs appear on multiple brand lists.</div>;
        const page = currentPage('top-hcps');
        const slice = rows.slice((page - 1) * pageSize, page * pageSize);
        const totalPages = Math.ceil(rows.length / pageSize);
        return (
            <div className="leasing-table-section">
                <div className="leasing-table-actions">
                    <span className="leasing-row-count">{rows.length.toLocaleString()} HCPs on ≥1 brand list</span>
                    <button
                        className="leasing-btn-export"
                        onClick={() => downloadCSV(
                            'top_hcps.csv',
                            ['NPI', 'Specialty', '# of Lists', 'Brands'],
                            rows.map(r => [r.npi, r.specialty, r.list_count, (r.brands || []).join('; ')])
                        )}
                    >
                        Export CSV
                    </button>
                </div>
                <div className="leasing-table-wrap">
                    <table className="leasing-table">
                        <thead>
                            <tr>
                                <th>NPI</th>
                                <th>Specialty</th>
                                <th className="num"># of Lists</th>
                                <th>Brands</th>
                            </tr>
                        </thead>
                        <tbody>
                            {slice.map((r, i) => (
                                <tr key={i}>
                                    <td>
                                        <button className="leasing-npi-link" onClick={() => onSelectNpi(r.npi)}>{r.npi}</button>
                                    </td>
                                    <td>{r.specialty || '—'}</td>
                                    <td className="num">{r.list_count}</td>
                                    <td>{(r.brands || []).join(', ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <Pagination page={page} totalPages={totalPages} onChange={(p) => setPage('top-hcps', p)} />
                )}
            </div>
        );
    };

    const renderCombinedUnique = () => {
        const rows = results.combined_unique || [];
        if (rows.length === 0) return <div className="leasing-empty">No universe NPIs appear on any brand list.</div>;
        const page = currentPage('combined-unique');
        const slice = rows.slice((page - 1) * pageSize, page * pageSize);
        const totalPages = Math.ceil(rows.length / pageSize);
        return (
            <div className="leasing-table-section">
                <div className="leasing-table-actions">
                    <span className="leasing-row-count">{rows.length.toLocaleString()} universe NPIs targeted</span>
                    <button
                        className="leasing-btn-export"
                        onClick={() => downloadCSV(
                            'combined_unique.csv',
                            ['NPI', 'Specialty', 'Brand', 'All Brands', 'MMC Owned', 'IQVIA', 'HLD', 'Ownership Status'],
                            rows.map(r => [r.npi, r.specialty, r.brand, (r.all_brands || []).join('; '), r.mmc_owned || '', r.iqvia_licensed || '', r.hld_licensed || '', r.ownership_status])
                        )}
                    >
                        Export CSV
                    </button>
                </div>
                <div className="leasing-table-wrap">
                    <table className="leasing-table">
                        <thead>
                            <tr>
                                <th>NPI</th>
                                <th>Specialty</th>
                                <th>Brand(s)</th>
                                <th>Ownership Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {slice.map((r, i) => (
                                <tr key={i}>
                                    <td><button className="leasing-npi-link" onClick={() => onSelectNpi(r.npi)}>{r.npi}</button></td>
                                    <td>{r.specialty || '—'}</td>
                                    <td>{(r.all_brands || [r.brand]).join(', ')}</td>
                                    <td><span className={`leasing-status-pill ${STATUS_CLASS[r.ownership_status] || ''}`}>{r.ownership_status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <Pagination page={page} totalPages={totalPages} onChange={(p) => setPage('combined-unique', p)} />
                )}
            </div>
        );
    };

    const renderMatchResults = () => {
        const rows = (results.match_results || []).filter(r => r.specialty);
        if (rows.length === 0) return <div className="leasing-empty">No matched specialty data.</div>;
        return (
            <div className="leasing-table-section">
                <div className="leasing-table-actions">
                    <button
                        className="leasing-btn-export"
                        onClick={() => downloadCSV(
                            'match_results.csv',
                            ['Specialty', 'MMC Owned', 'IQVIA Licensed', 'HLD Licensed', 'Total'],
                            rows.map(r => [r.specialty, r.mmc_owned, r.iqvia_licensed, r.hld_licensed, r.total])
                        )}
                    >
                        Export CSV
                    </button>
                </div>
                <div className="leasing-table-wrap">
                    <table className="leasing-table">
                        <thead>
                            <tr>
                                <th>Specialty</th>
                                <th className="num">MMC Owned</th>
                                <th className="num">IQVIA</th>
                                <th className="num">HLD</th>
                                <th className="num">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i}>
                                    <td>{r.specialty}</td>
                                    <td className="num">{r.mmc_owned.toLocaleString()}</td>
                                    <td className="num">{r.iqvia_licensed.toLocaleString()}</td>
                                    <td className="num">{r.hld_licensed.toLocaleString()}</td>
                                    <td className="num">{r.total.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderPerBrand = () => {
        const perBrand = results.per_brand || {};
        const brands = Object.keys(perBrand);
        if (brands.length === 0) return <div className="leasing-empty">No brand data.</div>;
        const selected = perBrandSelected || brands[0];
        const rows = perBrand[selected] || [];
        const page = currentPage(`pb-${selected}`);
        const slice = rows.slice((page - 1) * pageSize, page * pageSize);
        const totalPages = Math.ceil(rows.length / pageSize);
        return (
            <div className="leasing-per-brand-section">
                <div className="leasing-per-brand-selector">
                    <label>Brand:</label>
                    <select value={selected} onChange={(e) => setPerBrandSelected(e.target.value)}>
                        {brands.map(b => (
                            <option key={b} value={b}>{b} ({(perBrand[b] || []).length.toLocaleString()})</option>
                        ))}
                    </select>
                </div>
                <div className="leasing-table-section">
                    <div className="leasing-table-actions">
                        <span className="leasing-row-count">{rows.length.toLocaleString()} NPIs on {selected}</span>
                        <button
                            className="leasing-btn-export"
                            onClick={() => downloadCSV(
                                `${selected}_npis.csv`,
                                ['NPI', 'Specialty'],
                                rows.map(r => [r.npi, r.specialty])
                            )}
                        >
                            Export CSV
                        </button>
                    </div>
                    <div className="leasing-table-wrap">
                        <table className="leasing-table">
                            <thead>
                                <tr>
                                    <th>NPI</th>
                                    <th>Specialty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slice.map((r, i) => (
                                    <tr key={i}>
                                        <td><button className="leasing-npi-link" onClick={() => onSelectNpi(r.npi)}>{r.npi}</button></td>
                                        <td>{r.specialty || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <Pagination page={page} totalPages={totalPages} onChange={(p) => setPage(`pb-${selected}`, p)} />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="leasing-results-viewer">
            <div className="leasing-result-nav">
                {RESULT_VIEWS.map(v => (
                    <button
                        key={v.key}
                        className={`leasing-result-tab ${activeView === v.key ? 'active' : ''}`}
                        onClick={() => setActiveView(v.key)}
                    >
                        {v.label}
                    </button>
                ))}
            </div>
            <div className="leasing-result-body">
                {activeView === 'summary' && renderSummary()}
                {activeView === 'brand-breakdown' && renderBrandBreakdown()}
                {activeView === 'master-match' && renderMasterMatch()}
                {activeView === 'top-hcps' && renderTopHCPs()}
                {activeView === 'combined-unique' && renderCombinedUnique()}
                {activeView === 'match-results' && renderMatchResults()}
                {activeView === 'per-brand' && renderPerBrand()}
            </div>
        </div>
    );
};

const Pagination = ({ page, totalPages, onChange }) => (
    <div className="leasing-pagination">
        <button disabled={page === 1} onClick={() => onChange(page - 1)}>‹ Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next ›</button>
    </div>
);

export default LeasingResultsViewer;