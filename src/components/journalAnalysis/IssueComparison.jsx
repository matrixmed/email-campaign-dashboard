import React, { useState, useEffect } from 'react';
import { matchesSearchTerm } from '../../utils/searchUtils';

const WALSWORTH_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/walsworth_metrics.json?sp=r&st=2026-01-15T18:57:16Z&se=2027-09-24T02:12:16Z&spr=https&sv=2024-11-04&sr=b&sig=w1q9PY%2FMzuTUvwwOV%2Bcub%2FV7Cygeff3ESRaC2l1KvPM%3D";

const normalizePublicationName = (publication) => {
    if (!publication) return 'Unknown';
    if (publication.startsWith('Innovations in Clinical Neuroscience') && publication !== 'Innovations in Clinical Neuroscience') {
        return 'Innovations in Clinical Neuroscience';
    }
    if (publication.startsWith('Bariatric Times') && publication !== 'Bariatric Times') {
        return 'Bariatric Times';
    }
    return publication;
};

const parseIssueDateFromName = (name) => {
    if (!name) return new Date(0);
    const months = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
    const lower = name.toLowerCase();
    for (const [month, idx] of Object.entries(months)) {
        if (lower.includes(month)) {
            const yearMatch = name.match(/20\d{2}/);
            if (yearMatch) return new Date(parseInt(yearMatch[0]), idx, 1);
        }
    }
    const yearMatch = name.match(/20\d{2}/);
    if (yearMatch) return new Date(parseInt(yearMatch[0]), 0, 1);
    return new Date(0);
};

const formatNumber = (num) => {
    if (isNaN(num)) return '0';
    return num.toLocaleString();
};

const formatTimeInIssue = (seconds) => {
    if (isNaN(seconds) || seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const IssueComparison = ({ searchTerm = '' }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [issues, setIssues] = useState([]);
    const [sortColumn, setSortColumn] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(WALSWORTH_BLOB_URL);
            const data = await response.json();
            if (data.issues && Array.isArray(data.issues)) {
                const normalized = data.issues
                    .map(issue => ({
                        ...issue,
                        publication: normalizePublicationName(issue.publication),
                        parsedDate: parseIssueDateFromName(issue.issue_name || issue.issue)
                    }))
                    .sort((a, b) => b.parsedDate - a.parsedDate);
                setIssues(normalized);
            }
        } catch (error) {
        }
        setIsLoading(false);
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const getSortValue = (issue, column) => {
        switch (column) {
            case 'date': return issue.parsedDate?.getTime() || 0;
            case 'name': return (issue.issue_name || '').toLowerCase();
            case 'publication': return (issue.publication || '').toLowerCase();
            case 'pageViews': return issue.current?.total_page_views || 0;
            case 'visits': return issue.current?.total_issue_visits || 0;
            case 'avgTime': return issue.current?.seconds_per_visit || 0;
            default: return 0;
        }
    };

    const filtered = issues
        .filter(issue => !searchTerm || matchesSearchTerm(issue.issue_name || '', searchTerm))
        .sort((a, b) => {
            const aVal = getSortValue(a, sortColumn);
            const bVal = getSortValue(b, sortColumn);
            if (typeof aVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

    const SortHeader = ({ column, label }) => (
        <th className="sortable" onClick={() => handleSort(column)} style={{ cursor: 'pointer' }}>
            {label} {sortColumn === column && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
        </th>
    );

    if (isLoading) {
        return <div className="ja-loading">Loading issue data...</div>;
    }

    return (
        <div className="ja-section">
            <div className="ja-matrix-section">
                <h3 className="ja-section-title">All Issues ({filtered.length})</h3>
                <div className="matrix-table-wrapper">
                    <table className="ja-matrix-table ja-issue-table">
                        <thead>
                            <tr>
                                <SortHeader column="name" label="Issue Name" />
                                <SortHeader column="publication" label="Publication" />
                                <SortHeader column="pageViews" label="Page Views" />
                                <SortHeader column="visits" label="Visits" />
                                <SortHeader column="avgTime" label="Avg Time" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((issue, idx) => (
                                <tr key={idx}>
                                    <td className="issue-name-cell">{issue.issue_name}</td>
                                    <td>{issue.publication}</td>
                                    <td className="matrix-value-cell">{formatNumber(issue.current?.total_page_views || 0)}</td>
                                    <td className="matrix-value-cell">{formatNumber(issue.current?.total_issue_visits || 0)}</td>
                                    <td className="matrix-value-cell">{formatTimeInIssue(issue.current?.seconds_per_visit || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IssueComparison;