import React, { useState } from 'react';
import Papa from 'papaparse';
import { API_BASE_URL } from '../../config/api';
import '../../styles/SubscriberIntake.css';

const DIGITAL_LISTS = [
    'JCAD US Subscribers',
    'JCAD International Subscribers',
    'JCAD NPPA (MMC)',
    'JCAD Comp',
    'Oncology (MMC)',
    'ICNS US Subscribers',
    'ICNS International Subscribers',
    'Nutrition Health Review',
];

const PRINT_LISTS = [
    'JCAD Print List',
    'NP+PA Print List',
    'JCAD Comp List',
];

const FILENAME_RULES = [
    [/nppa[-_ ]?print/i, 'print', 'NP+PA Print List'],
    [/nppa[-_ ]?digital/i, 'digital', 'JCAD NPPA (MMC)'],
    [/jcad[-_ ]?print/i, 'print', 'JCAD Print List'],
    [/jcad[-_ ]?us[-_ ]?subscribers/i, 'digital', 'JCAD US Subscribers'],
    [/jcad[-_ ]?international/i, 'digital', 'JCAD International Subscribers'],
    [/comp[-_ ]?list[-_ ]?print/i, 'print', 'JCAD Comp List'],
    [/comp[-_ ]?list/i, 'digital', 'JCAD Comp'],
    [/oncology/i, 'digital', 'Oncology (MMC)'],
    [/icns[-_ ]?international|international[-_ ]?icns/i, 'digital', 'ICNS International Subscribers'],
    [/icns/i, 'digital', 'ICNS US Subscribers'],
    [/nhr|nutrition[-_ ]?health/i, 'digital', 'Nutrition Health Review'],
];

const HEADER_ALIASES = {
    'first name': 'first_name', 'firstname': 'first_name',
    'last name': 'last_name', 'lastname': 'last_name',
    'email': 'email', 'email address': 'email', 'email enter email': 'email',
    'degree': 'degree', 'degrees': 'degree',
    'npi': 'npi', 'npi id': 'npi',
    'specialty': 'specialty',
    'company': 'company', 'company or facility name': 'company',
    'name of company healthcare facility or clinic': 'company',
    'address 1': 'address1', 'address1': 'address1', 'address street address': 'address1',
    'address 2': 'address2', 'address2': 'address2', 'address address line 2': 'address2',
    'city': 'city', 'address city': 'city',
    'state': 'state', 'state code': 'state', 'state province': 'state', 'address state province': 'state',
    'zip': 'zipcode', 'zipcode': 'zipcode', 'postal code': 'zipcode', 'postal': 'zipcode', 'address zip postal code': 'zipcode',
    'country': 'country', 'address country': 'country',
    'job title': 'job_title',
};

const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const detectFromName = (name) => {
    for (const [re, kind, list] of FILENAME_RULES) {
        if (re.test(name)) return { kind, list };
    }
    return null;
};

const STATUS_CLASS = {
    inserted: 'ok',
    updated: 'ok',
    skipped: 'muted',
    failed: 'err',
};

const CleanedListImport = () => {
    const [fileName, setFileName] = useState(null);
    const [parsed, setParsed] = useState(null);
    const [selection, setSelection] = useState('');
    const [detected, setDetected] = useState(true);
    const [error, setError] = useState(null);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [showSkipped, setShowSkipped] = useState(true);

    const handleFile = (f) => {
        if (!f) return;
        setError(null);
        setResult(null);
        Papa.parse(f, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
                const fields = res.meta.fields || [];
                const map = {};
                fields.forEach((orig) => {
                    const key = HEADER_ALIASES[normalizeHeader(orig)];
                    if (key && !Object.values(map).includes(key)) map[orig] = key;
                });
                const rows = res.data
                    .map((r) => {
                        const out = {};
                        Object.entries(map).forEach(([orig, key]) => {
                            out[key] = (r[orig] ?? '').toString().trim();
                        });
                        return out;
                    })
                    .filter((r) => Object.values(r).some((v) => v));
                setFileName(f.name);
                setParsed({
                    rows,
                    recognized: Object.values(map),
                    ignored: fields.filter((x) => !map[x]),
                });
                const det = detectFromName(f.name);
                if (det) {
                    setSelection(`${det.kind}::${det.list}`);
                    setDetected(true);
                } else {
                    setSelection('');
                    setDetected(false);
                }
            },
            error: (err) => setError(err.message),
        });
    };

    const onFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const clearAll = () => {
        setFileName(null);
        setParsed(null);
        setSelection('');
        setDetected(true);
        setError(null);
        setResult(null);
    };

    const run = async () => {
        if (!parsed?.rows?.length) {
            setError('No rows parsed from the file.');
            return;
        }
        if (!selection) {
            setError('Pick which list this file belongs to.');
            return;
        }
        const [kind, listName] = selection.split('::');
        setRunning(true);
        setError(null);
        try {
            const resp = await fetch(`${API_BASE_URL}/api/subscriber-intake/ingest-clean`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ list_name: listName, kind, rows: parsed.rows }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Ingest failed');
            setResult(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setRunning(false);
        }
    };

    const visibleResults = result
        ? result.results.filter((r) => showSkipped || r.status !== 'skipped')
        : [];

    return (
        <>
            <div className="section-header-bar">
                <h3>Cleaned List Import</h3>
                <button className="section-header-clear-btn" onClick={clearAll}>Clear</button>
            </div>
            <div className="subscriber-intake">
                <div className="si-upload">
                    <div className="file-upload-group">
                        <label>Cleaned list CSV</label>
                        <div
                            className="drop-zone"
                            onDrop={onDrop}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                onChange={onFileChange}
                                className="file-input-hidden"
                                id="cleaned-list-file-input"
                            />
                            <label htmlFor="cleaned-list-file-input" className="drop-zone-label">
                                {fileName ? (
                                    <span className="file-name-display">{fileName}</span>
                                ) : (
                                    <div className="drop-zone-content">
                                        <p>Drag and drop a cleaned list CSV here</p>
                                        <p className="drop-zone-or">or</p>
                                        <span className="drop-zone-browse">Click to browse</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {parsed && (
                        <div className="si-upload-controls" style={{ flexWrap: 'wrap', gap: '12px' }}>
                            <label className="si-source-override">
                                Target list:
                                <select value={selection} onChange={(e) => setSelection(e.target.value)}>
                                    <option value="">— Select list —</option>
                                    <optgroup label="Digital lists">
                                        {DIGITAL_LISTS.map((l) => (
                                            <option key={l} value={`digital::${l}`}>{l}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Print lists">
                                        {PRINT_LISTS.map((l) => (
                                            <option key={l} value={`print::${l}`}>{l}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </label>
                            <button className="btn-primary" disabled={running || !selection} onClick={run}>
                                {running ? 'Ingesting...' : 'Ingest into database'}
                            </button>
                        </div>
                    )}

                    {parsed && (
                        <div className="si-clean-meta">
                            <span className="reports-header-stat-item">
                                <span className="reports-header-stat-label">Rows:</span>
                                <span className="reports-header-stat-value">{parsed.rows.length}</span>
                            </span>
                            <span className="reports-header-stat-item">
                                <span className="reports-header-stat-label">Detected:</span>
                                <span className="reports-header-stat-value" style={{ color: detected ? '#0ff' : '#ffa500' }}>
                                    {detected && selection ? selection.split('::')[1] : 'none — pick a list'}
                                </span>
                            </span>
                            <span className="reports-header-stat-item">
                                <span className="reports-header-stat-label">Mapped columns:</span>
                                <span className="reports-header-stat-value">{parsed.recognized.join(', ') || 'none'}</span>
                            </span>
                            {parsed.ignored.length > 0 && (
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Ignored:</span>
                                    <span className="reports-header-stat-value" style={{ color: '#888' }}>
                                        {parsed.ignored.join(', ')}
                                    </span>
                                </span>
                            )}
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}
                </div>

                {result && (
                    <>
                        <div className="reports-section-header si-result-header">
                            <h3>{result.list_name}</h3>
                            <div className="reports-header-stats">
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Added:</span>
                                    <span className="reports-header-stat-value" style={{ color: '#0ff' }}>{result.summary.inserted}</span>
                                </span>
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Updated:</span>
                                    <span className="reports-header-stat-value" style={{ color: '#0ff' }}>{result.summary.updated}</span>
                                </span>
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Skipped:</span>
                                    <span className="reports-header-stat-value">{result.summary.skipped}</span>
                                </span>
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Failed:</span>
                                    <span className="reports-header-stat-value" style={{ color: result.summary.failed ? '#ff5555' : '#888' }}>
                                        {result.summary.failed}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div className="si-review-toolbar">
                            <label className="si-toggle">
                                <input
                                    type="checkbox"
                                    checked={showSkipped}
                                    onChange={(e) => setShowSkipped(e.target.checked)}
                                />
                                Show skipped rows
                            </label>
                        </div>

                        <div className="si-table-wrap">
                            <table className="results-table">
                                <thead>
                                    <tr>
                                        <th className="si-col-num">#</th>
                                        <th className="si-col-status">Result</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleResults.map((r) => (
                                        <tr key={r.row} className={`si-status-${STATUS_CLASS[r.status] || 'muted'}`}>
                                            <td className="si-col-num">{r.row}</td>
                                            <td className="si-col-status">
                                                <span className={`si-status-badge si-status-badge-${STATUS_CLASS[r.status] || 'muted'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td>{r.name}</td>
                                            <td>{r.email}</td>
                                            <td>{r.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default CleanedListImport;
