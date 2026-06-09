import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/ListEfficiencyAnalysis.css';
import '../../styles/ReportsManager.css';
import '../../styles/SubscriberIntake.css';

const SOURCE_LABEL = {
    jcad: 'JCAD WP',
    oncology: 'ONC WP',
    icns: 'ICNS WP',
    social_media: 'JCAD Social',
    unknown: 'Unknown',
};

const EDITABLE_FIELDS = [
    { key: 'first_name', label: 'First' },
    { key: 'last_name', label: 'Last' },
    { key: 'email', label: 'Email' },
    { key: 'npi', label: 'NPI' },
    { key: 'specialty', label: 'Specialty' },
    { key: 'degree', label: 'Degree' },
    { key: 'company', label: 'Company' },
    { key: 'address1', label: 'Address 1' },
    { key: 'address2', label: 'Address 2' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zipcode', label: 'Zip' },
    { key: 'country', label: 'Country' },
];

const STORAGE_KEY = 'subscriberIntakeState';
const COMPLETION_KEY = 'subscriberIntakeCompletion';
const COLLAPSED_KEY = 'subscriberIntakeCollapsed';

const ACTION_ADD = 'add';
const ACTION_ALREADY_ON = 'already_on';

const loadPersistedState = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    return {};
};

const loadCompletionState = () => {
    try {
        const saved = localStorage.getItem(COMPLETION_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    return {};
};

const loadCollapsedState = () => {
    try {
        const saved = localStorage.getItem(COLLAPSED_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    return {};
};

const SubscriberIntake = ({ externalSearch = '' }) => {
    const persisted = loadPersistedState();
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState(persisted.fileName || null);
    const [sourceOverride, setSourceOverride] = useState('');
    const [loading, setLoading] = useState(false);
    const [rerouting, setRerouting] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(persisted.data || null);
    const [edits, setEdits] = useState(persisted.edits || {});
    const [chosenCandidate, setChosenCandidate] = useState(persisted.chosenCandidate || {});
    const [reopenedAmbiguous, setReopenedAmbiguous] = useState(persisted.reopenedAmbiguous || {});
    const [step, setStep] = useState(persisted.step || 'review');
    const [showAlreadyOn, setShowAlreadyOn] = useState(persisted.showAlreadyOn || false);
    const [runStatus, setRunStatus] = useState({});
    const [completedLists, setCompletedLists] = useState(loadCompletionState());
    const [collapsedLists, setCollapsedLists] = useState(loadCollapsedState());

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data, edits, chosenCandidate, reopenedAmbiguous, fileName, step, showAlreadyOn,
            }));
        } catch (err) {
            console.warn('SubscriberIntake: failed to persist state to localStorage', err);
        }
    }, [data, edits, chosenCandidate, reopenedAmbiguous, fileName, step, showAlreadyOn]);

    useEffect(() => {
        try {
            localStorage.setItem(COMPLETION_KEY, JSON.stringify(completedLists));
        } catch {}
    }, [completedLists]);

    useEffect(() => {
        try {
            localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedLists));
        } catch {}
    }, [collapsedLists]);

    const completionKey = useMemo(() => {
        if (!fileName || !data) return null;
        return `${fileName}::${data.source_type}`;
    }, [fileName, data]);

    const isListComplete = useCallback((listName) => {
        if (!completionKey) return false;
        return !!(completedLists[completionKey] || {})[listName];
    }, [completedLists, completionKey]);

    const toggleListComplete = (listName) => {
        if (!completionKey) return;
        setCompletedLists(prev => {
            const current = prev[completionKey] || {};
            const next = { ...current, [listName]: !current[listName] };
            return { ...prev, [completionKey]: next };
        });
        setCollapsedLists(prev => {
            const current = prev[completionKey] || {};
            const wasComplete = !!(completedLists[completionKey] || {})[listName];
            const next = { ...current, [listName]: !wasComplete };
            return { ...prev, [completionKey]: next };
        });
    };

    const isListCollapsed = useCallback((listName) => {
        if (!completionKey) return true;
        const entry = (collapsedLists[completionKey] || {})[listName];
        if (entry === undefined) return true;
        return !!entry;
    }, [collapsedLists, completionKey]);

    const toggleListCollapsed = (listName) => {
        if (!completionKey) return;
        setCollapsedLists(prev => {
            const current = prev[completionKey] || {};
            const entry = current[listName];
            const wasCollapsed = entry === undefined ? true : !!entry;
            return { ...prev, [completionKey]: { ...current, [listName]: !wasCollapsed } };
        });
    };

    const onFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) { setFile(f); setError(null); }
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const f = e.dataTransfer.files?.[0];
        if (f) { setFile(f); setError(null); }
    };

    const clearAll = () => {
        setFile(null);
        setFileName(null);
        setData(null);
        setEdits({});
        setChosenCandidate({});
        setReopenedAmbiguous({});
        setRunStatus({});
        setShowAlreadyOn(false);
        setStep('review');
        setError(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    const upload = async () => {
        if (!file) { setError('Choose a CSV file first.'); return; }
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);
        if (sourceOverride) formData.append('source_type', sourceOverride);
        try {
            const resp = await fetch(`${API_BASE_URL}/api/subscriber-intake/process`, {
                method: 'POST',
                body: formData,
            });
            if (!resp.ok) {
                const e = await resp.json();
                throw new Error(e.error || 'Upload failed');
            }
            const result = await resp.json();
            setData(result);
            setFileName(file.name);
            setEdits({});
            setChosenCandidate({});
            setReopenedAmbiguous({});
            setRunStatus({});
            setStep('review');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getEffectiveCleaned = useCallback((row) => {
        const rowEdits = edits[row.row_number] || {};
        return { ...row.cleaned, ...rowEdits };
    }, [edits]);

    const setEdit = (rowNumber, field, value) => {
        setEdits(prev => ({
            ...prev,
            [rowNumber]: { ...(prev[rowNumber] || {}), [field]: value },
        }));
    };

    const pickCandidate = (rowNumber, candidate) => {
        setChosenCandidate(prev => ({ ...prev, [rowNumber]: candidate }));
        setReopenedAmbiguous(prev => {
            const next = { ...prev };
            delete next[rowNumber];
            return next;
        });
        setEdits(prev => ({
            ...prev,
            [rowNumber]: {
                ...(prev[rowNumber] || {}),
                npi: candidate.npi,
                first_name: candidate.first_name,
                last_name: candidate.last_name,
                specialty: candidate.specialty,
                address1: candidate.address1 || '',
                address2: candidate.address2 || '',
                city: candidate.city || '',
                state: candidate.state || '',
                zipcode: candidate.zipcode || '',
                country: candidate.country || '',
            },
        }));
    };

    const reopenAmbiguous = (rowNumber) => {
        setReopenedAmbiguous(prev => ({ ...prev, [rowNumber]: true }));
    };

    const reroute = useCallback(async () => {
        if (!data) return;
        setRerouting(true);
        setError(null);
        try {
            const editedRows = data.rows.map(r => ({
                ...r,
                cleaned: getEffectiveCleaned(r),
            }));
            const resp = await fetch(`${API_BASE_URL}/api/subscriber-intake/reroute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_type: data.source_type, rows: editedRows }),
            });
            if (!resp.ok) {
                const e = await resp.json();
                throw new Error(e.error || 'Reroute failed');
            }
            const result = await resp.json();
            setData(prev => ({ ...prev, ...result }));
        } catch (err) {
            setError(err.message);
        } finally {
            setRerouting(false);
        }
    }, [data, getEffectiveCleaned]);

    const goToLists = async () => {
        await reroute();
        setStep('lists');
    };

    const troubleScore = useCallback((row) => {
        const flags = row.flags || [];
        const reviewFlags = row.review_flags || [];
        const buckets = row.buckets || [];

        const hasBlocking = buckets.some(b => b.name === 'Cleaning Issues');
        if (hasBlocking) return 0;

        const isAmbiguous = reviewFlags.some(f => f.code === 'AMBIGUOUS_MATCH');
        const chosen = chosenCandidate[row.row_number];
        if (isAmbiguous && !chosen) return 1;

        const hasManualReview = buckets.some(b => b.name === 'Manual Review');
        if (hasManualReview) return 2;

        if (flags.length > 0) return 3;

        const hasCurrentlyLicensed = reviewFlags.some(f => f.code === 'CURRENTLY_LICENSED');
        if (hasCurrentlyLicensed) return 4;

        const allAlreadyOn = buckets.length > 0 && buckets.every(b => b.action === ACTION_ALREADY_ON);
        if (allAlreadyOn) return 9;

        return 5;
    }, [chosenCandidate]);

    const sortedRows = useMemo(() => {
        if (!data) return [];
        return [...data.rows].sort((a, b) => {
            const sa = troubleScore(a);
            const sb = troubleScore(b);
            if (sa !== sb) return sa - sb;
            return a.row_number - b.row_number;
        });
    }, [data, troubleScore]);

    const reviewCounts = useMemo(() => {
        if (!data) return { needsAttention: 0, alreadyOn: 0, clean: 0, total: 0 };
        let needsAttention = 0, alreadyOn = 0, clean = 0;
        for (const r of data.rows) {
            const score = troubleScore(r);
            if (score === 9) alreadyOn++;
            else if (score <= 4) needsAttention++;
            else clean++;
        }
        return { needsAttention, alreadyOn, clean, total: data.rows.length };
    }, [data, troubleScore]);

    const visibleReviewRows = useMemo(() => {
        const search = (externalSearch || '').trim().toLowerCase();
        return sortedRows.filter(r => {
            const allAlreadyOn = troubleScore(r) === 9;
            if (allAlreadyOn && !showAlreadyOn) return false;
            if (search) {
                const c = getEffectiveCleaned(r);
                return EDITABLE_FIELDS.some(f => String(c[f.key] ?? '').toLowerCase().includes(search));
            }
            return true;
        });
    }, [sortedRows, externalSearch, showAlreadyOn, troubleScore, getEffectiveCleaned]);

    const listGroups = useMemo(() => {
        if (!data) return [];
        const groups = {};
        for (const r of data.rows) {
            for (const b of r.buckets) {
                if (b.kind === 'review') continue;
                if (!groups[b.name]) {
                    groups[b.name] = {
                        name: b.name,
                        list_name: b.list_name,
                        kind: b.kind,
                        order: b.order,
                        addRows: [],
                        alreadyOnRows: [],
                    };
                }
                if (b.action === ACTION_ALREADY_ON) {
                    groups[b.name].alreadyOnRows.push(r);
                } else {
                    groups[b.name].addRows.push(r);
                }
            }
        }
        return Object.values(groups).sort((a, b) => a.order - b.order);
    }, [data]);

    const completedCount = useMemo(() => {
        return listGroups.filter(g => isListComplete(g.name)).length;
    }, [listGroups, isListComplete]);

    const exportRows = (rows, listName) => {
        if (!rows.length) return;
        const headers = EDITABLE_FIELDS.map(f => f.label);
        const lines = [headers.map(csvEscape).join(',')];
        for (const r of rows) {
            const c = getEffectiveCleaned(r);
            lines.push(EDITABLE_FIELDS.map(f => csvEscape(c[f.key] ?? '')).join(','));
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${listName.replace(/[^A-Za-z0-9]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const runList = async (group) => {
        const rows = group.addRows.map(r => ({ ...r, cleaned: getEffectiveCleaned(r) }));
        if (!rows.length) return;
        const endpoint = group.kind === 'print' ? 'run-print' : 'run-digital';
        setRunStatus(s => ({ ...s, [group.name]: { state: 'running' } }));
        try {
            const resp = await fetch(`${API_BASE_URL}/api/subscriber-intake/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bucket_name: group.name, rows }),
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result.error || 'Run failed');
            setRunStatus(s => ({ ...s, [group.name]: { state: 'done', result } }));
        } catch (err) {
            setRunStatus(s => ({ ...s, [group.name]: { state: 'error', error: err.message } }));
        }
    };

    return (
        <>
            <div className="section-header-bar">
                <h3>Raw File Processing</h3>
                <button className="section-header-clear-btn" onClick={clearAll}>Clear</button>
            </div>
            <div className="subscriber-intake">
                {!data && renderUploadCard({ file, fileName, onFileChange, onDrop,
                    sourceOverride, setSourceOverride, loading, upload, error })}

                {data && (
                    <>
                        <div className="reports-section-header si-result-header">
                            <h3>{fileName}</h3>
                            <div className="reports-header-stats">
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Source:</span>
                                    <span className="reports-header-stat-value">{SOURCE_LABEL[data.source_type]}</span>
                                </span>
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Rows:</span>
                                    <span className="reports-header-stat-value">{data.total_rows}</span>
                                </span>
                                {step === 'review' && (
                                    <>
                                        <span className="reports-header-stat-item">
                                            <span className="reports-header-stat-label">Needs attention:</span>
                                            <span className="reports-header-stat-value" style={{ color: reviewCounts.needsAttention ? '#ffa500' : '#0ff' }}>
                                                {reviewCounts.needsAttention}
                                            </span>
                                        </span>
                                        <span className="reports-header-stat-item">
                                            <span className="reports-header-stat-label">Already on lists:</span>
                                            <span className="reports-header-stat-value">{reviewCounts.alreadyOn}</span>
                                        </span>
                                    </>
                                )}
                                {step === 'lists' && (
                                    <span className="reports-header-stat-item">
                                        <span className="reports-header-stat-label">Completed:</span>
                                        <span className="reports-header-stat-value" style={{ color: '#0ff' }}>
                                            {completedCount} / {listGroups.length}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="archive-agency-tabs">
                            <button
                                className={`archive-tab-button ${step === 'review' ? 'active' : ''}`}
                                onClick={() => setStep('review')}
                            >
                                Review &amp; Clean
                                <span className="si-step-count">{reviewCounts.needsAttention}</span>
                            </button>
                            <button
                                className={`archive-tab-button ${step === 'lists' ? 'active' : ''}`}
                                onClick={goToLists}
                                disabled={rerouting}
                            >
                                Lists
                                <span className="si-step-count">{listGroups.length}</span>
                            </button>
                            {step === 'lists' && (
                                <button
                                    className="btn-secondary si-reroute-btn"
                                    onClick={reroute}
                                    disabled={rerouting}
                                    title="Re-evaluate routing after edits"
                                >
                                    {rerouting ? 'Re-routing...' : 'Re-route'}
                                </button>
                            )}
                        </div>

                        {step === 'review' && renderReview({
                            visibleReviewRows, getEffectiveCleaned, setEdit,
                            chosenCandidate, reopenedAmbiguous, pickCandidate, reopenAmbiguous,
                            showAlreadyOn, setShowAlreadyOn, reviewCounts, goToLists, rerouting,
                        })}

                        {step === 'lists' && renderLists({
                            listGroups, getEffectiveCleaned, exportRows, runList,
                            runStatus, isListComplete, toggleListComplete,
                            isListCollapsed, toggleListCollapsed,
                        })}
                    </>
                )}
            </div>
        </>
    );
};

const renderUploadCard = ({ file, fileName, onFileChange, onDrop, sourceOverride, setSourceOverride, loading, upload, error }) => (
    <div className="si-upload">
        <div className="file-upload-group">
            <label>Subscriber CSV</label>
            <div
                className="drop-zone"
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={onFileChange}
                    className="file-input-hidden"
                    id="subscriber-intake-file-input"
                />
                <label htmlFor="subscriber-intake-file-input" className="drop-zone-label">
                    {file ? (
                        <span className="file-name-display">{file.name}</span>
                    ) : fileName ? (
                        <span className="file-name-display">{fileName} (previously uploaded)</span>
                    ) : (
                        <div className="drop-zone-content">
                            <p>Drag and drop subscriber CSV here</p>
                            <p className="drop-zone-or">or</p>
                            <span className="drop-zone-browse">Click to browse</span>
                        </div>
                    )}
                </label>
            </div>
        </div>
        <div className="si-upload-controls">
            <label className="si-source-override">
                Source type:
                <select value={sourceOverride} onChange={e => setSourceOverride(e.target.value)}>
                    <option value="">Auto-detect</option>
                    <option value="jcad">JCAD WP (online)</option>
                    <option value="oncology">ONC WP</option>
                    <option value="icns">ICNS WP</option>
                    <option value="social_media">JCAD Social</option>
                </select>
            </label>
            <button className="btn-primary" disabled={!file || loading} onClick={upload}>
                {loading ? 'Processing...' : 'Process'}
            </button>
        </div>
        {error && <div className="error-message">{error}</div>}
    </div>
);

const renderReview = ({ visibleReviewRows, getEffectiveCleaned, setEdit, chosenCandidate, reopenedAmbiguous, pickCandidate, reopenAmbiguous, showAlreadyOn, setShowAlreadyOn, reviewCounts, goToLists, rerouting }) => (
    <div className="si-review-pane">
        <div className="si-review-toolbar">
            <label className="si-toggle">
                <input
                    type="checkbox"
                    checked={showAlreadyOn}
                    onChange={e => setShowAlreadyOn(e.target.checked)}
                />
                Show {reviewCounts.alreadyOn} already-on-list rows
            </label>
            <button className="btn-primary si-continue-btn" onClick={goToLists} disabled={rerouting}>
                {rerouting ? 'Routing...' : 'Continue to Lists →'}
            </button>
        </div>

        <div className="si-table-wrap">
            <table className="results-table">
                <thead>
                    <tr>
                        <th className="si-col-num">#</th>
                        <th className="si-col-status">Status</th>
                        {EDITABLE_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                        <th className="si-col-flags">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {visibleReviewRows.map(r => (
                        <ReviewRow
                            key={r.row_number}
                            row={r}
                            effective={getEffectiveCleaned(r)}
                            chosen={chosenCandidate[r.row_number]}
                            isReopened={reopenedAmbiguous[r.row_number]}
                            setEdit={setEdit}
                            pickCandidate={pickCandidate}
                            reopenAmbiguous={reopenAmbiguous}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ReviewRow = ({ row, effective, chosen, isReopened, setEdit, pickCandidate, reopenAmbiguous }) => {
    const flags = row.flags || [];
    const reviewFlags = row.review_flags || [];
    const diffByField = {};
    (row.diff || []).forEach(d => { diffByField[d.field] = d; });
    const flagsByField = {};
    flags.forEach(f => { (flagsByField[f.field] ||= []).push(f); });
    const isAmbiguous = reviewFlags.some(f => f.code === 'AMBIGUOUS_MATCH');
    const showCandidates = isAmbiguous && (!chosen || isReopened);
    const buckets = row.buckets || [];
    const allAlreadyOn = buckets.length > 0 && buckets.every(b => b.action === ACTION_ALREADY_ON);

    let statusLabel = 'Clean', statusClass = 'ok';
    if (buckets.some(b => b.name === 'Cleaning Issues')) { statusLabel = 'Issue'; statusClass = 'err'; }
    else if (isAmbiguous && !chosen) { statusLabel = 'Ambiguous'; statusClass = 'warn'; }
    else if (buckets.some(b => b.name === 'Manual Review')) { statusLabel = 'Review'; statusClass = 'warn'; }
    else if (flags.length > 0) { statusLabel = 'Flag'; statusClass = 'warn'; }
    else if (allAlreadyOn) { statusLabel = 'Skip'; statusClass = 'muted'; }

    return (
        <>
            <tr className={`si-review-row si-status-${statusClass}`}>
                <td className="si-col-num">{row.row_number}</td>
                <td className="si-col-status">
                    <span className={`si-status-badge si-status-badge-${statusClass}`}>{statusLabel}</span>
                </td>
                {EDITABLE_FIELDS.map(f => {
                    const value = effective[f.key] ?? '';
                    const diff = diffByField[f.key];
                    const cellFlags = flagsByField[f.key] || [];
                    const size = Math.max(String(value).length || 1, f.label.length, 6);
                    return (
                        <td
                            key={f.key}
                            className={`si-cell ${diff ? 'si-cell-diff' : ''} ${cellFlags.length ? 'si-cell-flag' : ''}`}
                            title={diff ? `Was: "${diff.from || '(empty)'}"` : cellFlags.length ? cellFlags.map(x => x.message).join('\n') : ''}
                        >
                            <input
                                value={value}
                                size={size}
                                onChange={e => setEdit(row.row_number, f.key, e.target.value)}
                                className="si-cell-input"
                            />
                        </td>
                    );
                })}
                <td className="si-col-flags">
                    {reviewFlags.map((rf, i) => (
                        <span key={`rf${i}`} className={`si-flag-pill si-flag-${rf.code}`} title={rf.message}>
                            {rf.code}
                        </span>
                    ))}
                    {flags.map((f, i) => (
                        <span key={`f${i}`} className="si-flag-pill" title={f.message}>
                            {f.field}:{f.code}
                        </span>
                    ))}
                    {buckets.map((b, i) => {
                        const isComp = b.name && b.name.includes('Comp');
                        const industryMatch = isComp ? row.match?.industry_match : null;
                        return (
                            <span
                                key={`b${i}`}
                                className={`si-flag-pill si-bucket-pill si-bucket-pill-${b.kind} ${b.action === ACTION_ALREADY_ON ? 'is-already-on' : ''}`}
                                title={b.notes || ''}
                            >
                                {b.action === ACTION_ALREADY_ON ? '✓ ' : '→ '}{b.name}
                                {industryMatch ? ` (${industryMatch})` : ''}
                            </span>
                        );
                    })}
                </td>
            </tr>
            {isAmbiguous && showCandidates && (
                <tr className="si-candidate-row">
                    <td colSpan={EDITABLE_FIELDS.length + 3}>
                        <div className="si-candidates">
                            <strong>Pick the right person:</strong>
                            {(row.match.candidates || []).map((c, i) => (
                                <button
                                    key={i}
                                    className={`si-candidate ${chosen?.npi === c.npi ? 'chosen' : ''}`}
                                    onClick={() => pickCandidate(row.row_number, c)}
                                >
                                    <strong>{c.first_name} {c.last_name}</strong> · NPI {c.npi}
                                    <br />
                                    <small>{c.specialty || c.taxonomy_code} · {c.city}, {c.state}</small>
                                </button>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
            {isAmbiguous && chosen && !isReopened && (
                <tr className="si-candidate-row si-candidate-row-resolved">
                    <td colSpan={EDITABLE_FIELDS.length + 3}>
                        <div className="si-candidates-resolved">
                            <span className="si-resolved-label">
                                <span className="si-resolved-check">✓</span>
                                Selected: <strong>{chosen.first_name} {chosen.last_name}</strong> · NPI {chosen.npi}
                            </span>
                            <button className="si-resolved-change" onClick={() => reopenAmbiguous(row.row_number)}>
                                Change selection
                            </button>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

const renderLists = ({ listGroups, getEffectiveCleaned, exportRows, runList, runStatus, isListComplete, toggleListComplete, isListCollapsed, toggleListCollapsed }) => {
    if (!listGroups.length) {
        return <div className="si-empty">No list assignments. Go back to Review and fix issues.</div>;
    }
    return (
        <div className="si-lists-pane">
            {listGroups.map(g => (
                <ListSection
                    key={g.name}
                    group={g}
                    getEffectiveCleaned={getEffectiveCleaned}
                    exportRows={exportRows}
                    runList={runList}
                    status={runStatus[g.name]}
                    completed={isListComplete(g.name)}
                    onToggleComplete={() => toggleListComplete(g.name)}
                    collapsed={isListCollapsed(g.name)}
                    onToggleCollapsed={() => toggleListCollapsed(g.name)}
                />
            ))}
        </div>
    );
};

const ListSection = ({ group, getEffectiveCleaned, exportRows, runList, status, completed, onToggleComplete, collapsed, onToggleCollapsed }) => {
    const [showAlreadyOn, setShowAlreadyOn] = useState(false);
    const addRows = group.addRows;
    const alreadyOnRows = group.alreadyOnRows;

    return (
        <div className={`si-list-section ${completed ? 'si-list-completed' : ''} ${collapsed ? 'si-list-collapsed' : ''}`}>
            <div className="reports-section-header si-list-header">
                <div className="si-list-title">
                    <label className="si-checklist-label" onClick={e => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={completed}
                            onChange={onToggleComplete}
                            className="si-checklist-checkbox"
                        />
                        <span className="si-checklist-marker"></span>
                    </label>
                    <button
                        type="button"
                        className="si-list-toggle"
                        onClick={onToggleCollapsed}
                        aria-expanded={!collapsed}
                    >
                        <span className={`si-list-chevron ${collapsed ? 'collapsed' : ''}`}>▾</span>
                        <h3>{group.name}</h3>
                    </button>
                    <span className={`si-bucket-kind si-bucket-kind-${group.kind}`}>{group.kind}</span>
                </div>
                <div className="reports-header-stats">
                    <span className="reports-header-stat-item">
                        <span className="reports-header-stat-label">Add:</span>
                        <span className="reports-header-stat-value" style={{ color: '#0ff' }}>{addRows.length}</span>
                    </span>
                    {alreadyOnRows.length > 0 && (
                        <span className="reports-header-stat-item">
                            <span className="reports-header-stat-label">Already on:</span>
                            <span className="reports-header-stat-value">{alreadyOnRows.length}</span>
                        </span>
                    )}
                </div>
            </div>

            {!collapsed && (
            <>
            <div className="si-list-actions">
                <button
                    className="btn-export"
                    onClick={() => exportRows(addRows.map(r => ({ ...r, cleaned: getEffectiveCleaned(r) })), group.name)}
                    disabled={!addRows.length}
                >
                    Export CSV
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => runList(group)}
                    disabled={!addRows.length || status?.state === 'running'}
                >
                    {status?.state === 'running' ? 'Running...' : 'Run'}
                </button>
                {alreadyOnRows.length > 0 && (
                    <label className="si-toggle">
                        <input
                            type="checkbox"
                            checked={showAlreadyOn}
                            onChange={e => setShowAlreadyOn(e.target.checked)}
                        />
                        Show {alreadyOnRows.length} already on this list
                    </label>
                )}
            </div>

            {status?.state === 'done' && (
                <div className="si-run-result si-run-success">
                    Inserted: {status.result.inserted}, Updated: {status.result.updated}, Skipped: {status.result.skipped}
                </div>
            )}
            {status?.state === 'error' && (
                <div className="si-run-result si-run-error">Run failed: {status.error}</div>
            )}

            <ListTable rows={addRows} getEffectiveCleaned={getEffectiveCleaned} />

            {showAlreadyOn && alreadyOnRows.length > 0 && (
                <>
                    <div className="si-already-on-divider">
                        Already on {group.name} — review these to confirm skipping is correct
                    </div>
                    <ListTable rows={alreadyOnRows} getEffectiveCleaned={getEffectiveCleaned} dimmed />
                </>
            )}
            </>
            )}
        </div>
    );
};

const ListTable = ({ rows, getEffectiveCleaned, dimmed = false }) => {
    if (!rows.length) {
        return <div className="si-empty">No rows.</div>;
    }
    return (
        <div className="si-table-wrap">
            <table className={`results-table ${dimmed ? 'si-table-dimmed' : ''}`}>
                <thead>
                    <tr>
                        <th className="si-col-num">#</th>
                        {EDITABLE_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => {
                        const c = getEffectiveCleaned(r);
                        return (
                            <tr key={r.row_number}>
                                <td className="si-col-num">{r.row_number}</td>
                                {EDITABLE_FIELDS.map(f => (
                                    <td key={f.key}>{c[f.key] || ''}</td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const csvEscape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
};

export default SubscriberIntake;