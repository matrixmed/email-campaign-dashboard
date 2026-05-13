import React, { useState, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../../../config/api';

const TIME_WINDOWS = [
    { value: 3, label: 'Last 3 months' },
    { value: 6, label: 'Last 6 months' },
    { value: 12, label: 'Last 12 months' },
    { value: 0, label: 'All time' },
];

const UNIVERSE_OPTIONS = [
    { value: 'derm', label: 'Universal Derms (taxonomy 207N*)' },
    { value: 'all_active', label: 'All active universal profiles' },
    { value: 'uploaded', label: 'Upload custom universe' },
];

const SourceSelectionPanel = ({
    scope,
    onScopeChange,
    availableSources,
    sourcesLoading,
    sourcesError,
    onRefreshSources,
    onRunAnalysis,
    resultsLoading,
    hasResults,
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeMode, setActiveMode] = useState('dashboard');
    const [uploadingBrandFile, setUploadingBrandFile] = useState(false);
    const [uploadingUniverseFile, setUploadingUniverseFile] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [expandedBrands, setExpandedBrands] = useState(new Set());
    const [pendingBrandLabel, setPendingBrandLabel] = useState('');

    const update = useCallback((patch) => {
        onScopeChange({ ...scope, ...patch });
    }, [scope, onScopeChange]);

    const selectedCampaignIds = useMemo(() => {
        const ids = new Set();
        (scope.brand_sources || []).forEach(src => {
            if (src.type === 'campaign') {
                (src.campaign_ids || []).forEach(id => ids.add(id));
            }
        });
        return ids;
    }, [scope.brand_sources]);

    const toggleCampaign = useCallback((brand, campaignId) => {
        const existing = (scope.brand_sources || []).filter(s => !(s.type === 'campaign' && s.brand_label === brand));
        const existingForBrand = (scope.brand_sources || []).find(s => s.type === 'campaign' && s.brand_label === brand);
        let ids = existingForBrand ? [...existingForBrand.campaign_ids] : [];
        if (ids.includes(campaignId)) {
            ids = ids.filter(id => id !== campaignId);
        } else {
            ids.push(campaignId);
        }
        if (ids.length > 0) {
            existing.push({ type: 'campaign', brand_label: brand, campaign_ids: ids });
        }
        update({ brand_sources: existing });
    }, [scope.brand_sources, update]);

    const toggleAllForBrand = useCallback((brand, campaigns) => {
        const existing = (scope.brand_sources || []).filter(s => !(s.type === 'campaign' && s.brand_label === brand));
        const allIds = campaigns.map(c => c.campaign_id);
        const allSelected = allIds.every(id => selectedCampaignIds.has(id));
        if (!allSelected) {
            existing.push({ type: 'campaign', brand_label: brand, campaign_ids: allIds });
        }
        update({ brand_sources: existing });
    }, [scope.brand_sources, selectedCampaignIds, update]);

    const selectAllVisible = useCallback(() => {
        if (!availableSources?.brands) return;
        const sources = availableSources.brands.map(b => ({
            type: 'campaign',
            brand_label: b.brand,
            campaign_ids: b.campaigns.map(c => c.campaign_id),
        }));
        update({ brand_sources: sources });
    }, [availableSources, update]);

    const clearAllSelections = useCallback(() => {
        update({ brand_sources: [] });
    }, [update]);

    const toggleExpand = useCallback((brand) => {
        setExpandedBrands(prev => {
            const next = new Set(prev);
            if (next.has(brand)) next.delete(brand);
            else next.add(brand);
            return next;
        });
    }, []);

    const uploadBrandFile = useCallback(async (file) => {
        if (!file) return;
        setUploadingBrandFile(true);
        setUploadError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('role', 'brand');
            if (pendingBrandLabel) fd.append('brand_label', pendingBrandLabel);
            const res = await fetch(`${API_BASE_URL}/api/list-leasing/upload-temp-file`, {
                method: 'POST',
                body: fd,
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }
            const data = await res.json();
            const uploaded = [...(scope.uploaded_brand_files || []), data];
            update({ uploaded_brand_files: uploaded });
            setPendingBrandLabel('');
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploadingBrandFile(false);
        }
    }, [scope.uploaded_brand_files, update, pendingBrandLabel]);

    const uploadUniverseFile = useCallback(async (file) => {
        if (!file) return;
        setUploadingUniverseFile(true);
        setUploadError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('role', 'universe');
            const res = await fetch(`${API_BASE_URL}/api/list-leasing/upload-temp-file`, {
                method: 'POST',
                body: fd,
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }
            const data = await res.json();
            update({ uploaded_universe_file: data });
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploadingUniverseFile(false);
        }
    }, [update]);

    const removeBrandFile = useCallback(async (token) => {
        const remaining = (scope.uploaded_brand_files || []).filter(f => f.file_token !== token);
        update({ uploaded_brand_files: remaining });
        try {
            await fetch(`${API_BASE_URL}/api/list-leasing/temp-files/${token}`, { method: 'DELETE' });
        } catch (e) {}
    }, [scope.uploaded_brand_files, update]);

    const removeUniverseFile = useCallback(async () => {
        const token = scope.uploaded_universe_file?.file_token;
        update({ uploaded_universe_file: null, universe: { type: 'derm' } });
        if (token) {
            try {
                await fetch(`${API_BASE_URL}/api/list-leasing/temp-files/${token}`, { method: 'DELETE' });
            } catch (e) {}
        }
    }, [scope.uploaded_universe_file, update]);

    const totalSelectedNPIs = useMemo(() => {
        if (!availableSources?.brands) return 0;
        let total = 0;
        availableSources.brands.forEach(b => {
            b.campaigns.forEach(c => {
                if (selectedCampaignIds.has(c.campaign_id)) {
                    total += c.npi_count || 0;
                }
            });
        });
        (scope.uploaded_brand_files || []).forEach(f => { total += f.npi_count || 0; });
        return total;
    }, [availableSources, selectedCampaignIds, scope.uploaded_brand_files]);

    const allBrandsCollapsed = expandedBrands.size === 0;
    const isAnyBrandSelected = (scope.brand_sources || []).length > 0 || (scope.uploaded_brand_files || []).length > 0;

    if (collapsed && hasResults) {
        return (
            <div className="leasing-source-panel collapsed">
                <div className="leasing-source-collapsed-row">
                    <div className="leasing-source-collapsed-summary">
                        <span><strong>{totalSelectedNPIs.toLocaleString()}</strong> NPIs selected from <strong>{(scope.brand_sources || []).length + (scope.uploaded_brand_files || []).length}</strong> source{((scope.brand_sources || []).length + (scope.uploaded_brand_files || []).length) === 1 ? '' : 's'}</span>
                        <span>Universe: {UNIVERSE_OPTIONS.find(u => u.value === (scope.universe?.type || 'derm'))?.label}</span>
                        <span>Window: {TIME_WINDOWS.find(w => w.value === scope.time_window_months)?.label}</span>
                    </div>
                    <div className="leasing-source-collapsed-actions">
                        <button className="leasing-btn leasing-btn-secondary" onClick={() => setCollapsed(false)}>Edit Scope</button>
                        <button className="leasing-btn leasing-btn-primary" onClick={onRunAnalysis} disabled={resultsLoading}>
                            {resultsLoading ? 'Running...' : 'Re-run Analysis'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="leasing-source-panel">
            <div className="leasing-source-header">
                <h3>Source Selection</h3>
                {hasResults && (
                    <button className="leasing-link-btn" onClick={() => setCollapsed(true)}>Collapse</button>
                )}
            </div>

            <div className="leasing-source-section">
                <div className="leasing-section-label">Universe</div>
                <div className="leasing-radio-group">
                    {UNIVERSE_OPTIONS.map(opt => (
                        <label key={opt.value} className="leasing-radio">
                            <input
                                type="radio"
                                name="universe"
                                checked={(scope.universe?.type || 'derm') === opt.value}
                                onChange={() => update({ universe: { type: opt.value } })}
                            />
                            <span>{opt.label}</span>
                        </label>
                    ))}
                </div>
                {scope.universe?.type === 'uploaded' && (
                    <div className="leasing-upload-area">
                        {scope.uploaded_universe_file ? (
                            <div className="leasing-uploaded-file">
                                <span>{scope.uploaded_universe_file.filename}</span>
                                <span className="leasing-pill">{scope.uploaded_universe_file.npi_count.toLocaleString()} NPIs</span>
                                <button className="leasing-link-btn-danger" onClick={removeUniverseFile}>Remove</button>
                            </div>
                        ) : (
                            <label className="leasing-file-input-label">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={(e) => uploadUniverseFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                />
                                {uploadingUniverseFile ? 'Uploading...' : 'Drop universe file or click to browse'}
                            </label>
                        )}
                    </div>
                )}
            </div>

            <div className="leasing-source-section">
                <div className="leasing-section-label-row">
                    <div className="leasing-section-label">Brand Target Lists</div>
                    <div className="leasing-mode-tabs">
                        <button
                            className={`leasing-mode-tab ${activeMode === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveMode('dashboard')}
                        >
                            From Dashboard
                        </button>
                        <button
                            className={`leasing-mode-tab ${activeMode === 'upload' ? 'active' : ''}`}
                            onClick={() => setActiveMode('upload')}
                        >
                            Upload Files
                        </button>
                    </div>
                </div>

                {activeMode === 'dashboard' && (
                    <div className="leasing-dashboard-mode">
                        {sourcesLoading && <div className="leasing-loading">Loading available sources…</div>}
                        {sourcesError && (
                            <div className="leasing-error">
                                {sourcesError}
                                <button className="leasing-link-btn" onClick={onRefreshSources}>Retry</button>
                            </div>
                        )}
                        {availableSources && (
                            <>
                                <div className="leasing-bulk-actions">
                                    <button className="leasing-link-btn" onClick={selectAllVisible}>Select all in window</button>
                                    <button className="leasing-link-btn" onClick={clearAllSelections}>Clear selection</button>
                                    <button className="leasing-link-btn" onClick={onRefreshSources}>Refresh</button>
                                </div>
                                {availableSources.brands.length === 0 ? (
                                    <div className="leasing-empty">No campaigns with attached target lists in this window.</div>
                                ) : (
                                    <div className="leasing-brand-list">
                                        {availableSources.brands.map(brand => {
                                            const isExpanded = expandedBrands.has(brand.brand);
                                            const brandSelectedCount = brand.campaigns.filter(c => selectedCampaignIds.has(c.campaign_id)).length;
                                            return (
                                                <div key={brand.brand} className="leasing-brand-block">
                                                    <div className="leasing-brand-row">
                                                        <button
                                                            className="leasing-expand-toggle"
                                                            onClick={() => toggleExpand(brand.brand)}
                                                        >
                                                            {isExpanded ? '▼' : '▶'}
                                                        </button>
                                                        <span className="leasing-brand-name">{brand.brand}</span>
                                                        {brand.industry && <span className="leasing-industry-tag">{brand.industry}</span>}
                                                        <span className="leasing-brand-meta">
                                                            {brand.campaign_count} campaign{brand.campaign_count === 1 ? '' : 's'} · {brand.total_npi_count.toLocaleString()} NPIs
                                                        </span>
                                                        <label className="leasing-brand-all-check">
                                                            <input
                                                                type="checkbox"
                                                                checked={brandSelectedCount === brand.campaigns.length && brand.campaigns.length > 0}
                                                                ref={el => { if (el) el.indeterminate = brandSelectedCount > 0 && brandSelectedCount < brand.campaigns.length; }}
                                                                onChange={() => toggleAllForBrand(brand.brand, brand.campaigns)}
                                                            />
                                                            <span>All</span>
                                                        </label>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="leasing-campaign-list">
                                                            {brand.campaigns.map(c => (
                                                                <label key={c.campaign_id} className="leasing-campaign-row">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedCampaignIds.has(c.campaign_id)}
                                                                        onChange={() => toggleCampaign(brand.brand, c.campaign_id)}
                                                                    />
                                                                    <span className="leasing-campaign-name">{c.campaign_name || c.campaign_id}</span>
                                                                    <span className="leasing-campaign-meta">
                                                                        {c.attached_at ? new Date(c.attached_at).toLocaleDateString() : '—'} · {(c.npi_count || 0).toLocaleString()} NPIs
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {availableSources.unknown_brand_campaigns?.length > 0 && (
                                    <div className="leasing-unknown-notice">
                                        {availableSources.unknown_brand_campaigns.length} campaign{availableSources.unknown_brand_campaigns.length === 1 ? '' : 's'} with no detected brand — not selectable here.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeMode === 'upload' && (
                    <div className="leasing-upload-mode">
                        <div className="leasing-upload-row">
                            <input
                                type="text"
                                className="leasing-text-input"
                                placeholder="Brand label (e.g., Leqselvi H1'26)"
                                value={pendingBrandLabel}
                                onChange={(e) => setPendingBrandLabel(e.target.value)}
                            />
                            <label className="leasing-file-input-label">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={(e) => uploadBrandFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                />
                                {uploadingBrandFile ? 'Uploading...' : 'Drop file or click to browse'}
                            </label>
                        </div>
                        {uploadError && <div className="leasing-error">{uploadError}</div>}
                        {(scope.uploaded_brand_files || []).length > 0 && (
                            <div className="leasing-uploaded-list">
                                {scope.uploaded_brand_files.map(f => (
                                    <div key={f.file_token} className="leasing-uploaded-file">
                                        <span className="leasing-uploaded-brand-label">{f.brand_label || '(unlabeled)'}</span>
                                        <span className="leasing-uploaded-filename">{f.filename}</span>
                                        <span className="leasing-pill">{f.npi_count.toLocaleString()} NPIs</span>
                                        <button className="leasing-link-btn-danger" onClick={() => removeBrandFile(f.file_token)}>Remove</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="leasing-source-section">
                <div className="leasing-section-label">Filters</div>
                <div className="leasing-filter-row">
                    <label className="leasing-filter-label">
                        Time Window
                        <select
                            value={scope.time_window_months}
                            onChange={(e) => update({ time_window_months: Number(e.target.value) })}
                        >
                            {TIME_WINDOWS.map(w => (
                                <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                        </select>
                    </label>
                    {availableSources?.industries?.length > 0 && (
                        <label className="leasing-filter-label">
                            Market
                            <select
                                multiple
                                value={scope.market_filter || []}
                                onChange={(e) => {
                                    const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                                    update({ market_filter: vals.length ? vals : null });
                                }}
                            >
                                {availableSources.industries.map(i => (
                                    <option key={i} value={i}>{i}</option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            </div>

            <div className="leasing-run-row">
                <div className="leasing-run-summary">
                    {isAnyBrandSelected || activeMode === 'dashboard' ? (
                        <>
                            <strong>{totalSelectedNPIs.toLocaleString()}</strong> NPIs selected across <strong>{(scope.brand_sources || []).length + (scope.uploaded_brand_files || []).length}</strong> source{((scope.brand_sources || []).length + (scope.uploaded_brand_files || []).length) === 1 ? '' : 's'}
                        </>
                    ) : (
                        <>Will use all available campaigns in window</>
                    )}
                </div>
                <button
                    className="leasing-btn leasing-btn-primary leasing-btn-large"
                    onClick={onRunAnalysis}
                    disabled={resultsLoading}
                >
                    {resultsLoading ? 'Running Analysis...' : 'Run Analysis'}
                </button>
            </div>
        </div>
    );
};

export default SourceSelectionPanel;