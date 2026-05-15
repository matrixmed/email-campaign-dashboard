import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import TablePagination from '../common/TablePagination';
import { getSpecialtyFromTaxonomy } from '../listanalysis/taxonomyMapping';
import PrintListAddModal from './PrintListAddModal';
import PrintListUnsubscribeModal from './PrintListUnsubscribeModal';
import PrintListBlacklistModal from './PrintListBlacklistModal';
import PrintListBlacklistTab from './PrintListBlacklistTab';
import PrintListEditAddressModal from './PrintListEditAddressModal';
import HCPProfileModal from './HCPProfileModal';
import '../../styles/ReportsManager.css';
import '../../styles/AudienceQueryBuilder.css';

const isTaxonomyCode = (v) => v && /^\d{3}[A-Z0-9]{6}X$/.test(v);
const resolveSpecialty = (m) => {
  if (m.primary_specialty && !isTaxonomyCode(m.primary_specialty)) return m.primary_specialty;
  const code = m.primary_taxonomy_code || m.primary_specialty;
  if (code) return getSpecialtyFromTaxonomy(code) || code;
  return m.company || '';
};

const splitAddress = (raw) => {
  const s = (raw || '').trim();
  if (!s) return ['', ''];
  const m = s.match(/^(.*?)[\s,]+(ste\.?|suite|apt\.?|apartment|unit|#|bldg\.?|building|fl\.?|floor|rm\.?|room|ph|penthouse|lobby|mailstop|ms|po box)\b\s*(.*)$/i);
  if (m) return [m[1].trim().replace(/[,;]$/, ''), `${m[2]} ${m[3]}`.trim()];
  return [s, ''];
};

const resolveAddress = (m) => {
  const a1 = (m.practice_address_1 || '').trim();
  const a2 = (m.practice_address_2 || '').trim();
  if (a2) return [a1, a2];
  return splitAddress(a1);
};

const summarizeFlags = (m) => {
  const flags = [];
  if (m.is_active === false) {
    flags.push({
      label: 'Inactive',
      tone: 'warn',
      tooltip: [
        'Record marked inactive (is_active=FALSE).',
        m.unsubscribe_reason && `Reason: ${m.unsubscribe_reason}`,
      ].filter(Boolean).join('\n'),
    });
  }
  const ps = (m.provider_status || '').trim();
  if (ps && ps.toLowerCase() !== 'active') {
    flags.push({
      label: ps,
      tone: ps.toLowerCase().startsWith('ncoa') ? 'bad' : (ps === 'Deceased' || ps === 'Retired' ? 'warn' : 'info'),
      tooltip: `Provider status: ${ps}${m.provider_status_source ? ` (source: ${m.provider_status_source})` : ''}`,
    });
  }
  if (m.address_flag_event) {
    const label = m.address_flag_event === 'undeliverable' ? 'Undeliverable' : 'Address flagged';
    flags.push({
      label,
      tone: 'bad',
      tooltip: [
        m.address_flag_reason && `Reason: ${m.address_flag_reason}`,
        m.address_flag_source && `Source: ${m.address_flag_source}`,
        m.address_flag_at && `At: ${m.address_flag_at}`,
      ].filter(Boolean).join('\n'),
    });
  }
  if (m.inactive_reason && !flags.some(f => f.label === m.inactive_reason)) {
    flags.push({
      label: m.inactive_reason,
      tone: 'warn',
      tooltip: `Inactive: ${m.inactive_reason}${m.inactive_source ? ` (source: ${m.inactive_source})` : ''}`,
    });
  }
  return flags;
};

const FlagBadge = ({ flag }) => {
  const palette = flag.tone === 'bad'
    ? { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', color: '#fca5a5' }
    : flag.tone === 'warn'
      ? { bg: 'rgba(217,184,127,0.15)', border: '#d9b87f', color: '#d9b87f' }
      : { bg: 'rgba(0,255,255,0.08)', border: '#0ff', color: '#0ff' };
  return (
    <span
      title={flag.tooltip}
      style={{
        display: 'inline-block', padding: '2px 6px', marginRight: 4, marginBottom: 2,
        fontSize: '0.7rem', borderRadius: 3, background: palette.bg,
        border: `1px solid ${palette.border}`, color: palette.color, whiteSpace: 'nowrap',
      }}
    >
      {flag.label}
    </span>
  );
};

const adaptPrintRowForModal = (m) => ({
  email: m.audience_email || m.email || null,
  npi: m.npi || null,
  name: [m.first_name, m.last_name].filter(Boolean).join(' '),
  first_name: m.first_name,
  last_name: m.last_name,
  specialty: resolveSpecialty(m),
  city: m.practice_city || null,
  state: m.practice_state || null,
});

const SUBSCRIBED_OPTIONS = ['JCAD Print List', 'NP+PA Print List', 'JCAD Comp List'];
const PER_PAGE = 100;

const PrintListDisplay = ({ externalSearch = '' }) => {
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(false);
  const [activeType, setActiveType] = useState('subscribed');
  const [selectedLists, setSelectedLists] = useState([SUBSCRIBED_OPTIONS[0]]);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [audienceCount, setAudienceCount] = useState(0);
  const [sortField, setSortField] = useState('last_name');
  const [sortDir, setSortDir] = useState('asc');
  const [unsubData, setUnsubData] = useState(null);
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [blacklistTotal, setBlacklistTotal] = useState(0);
  const [blacklistRefreshKey, setBlacklistRefreshKey] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [unsubTarget, setUnsubTarget] = useState(null);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistInitial, setBlacklistInitial] = useState({});
  const [exporting, setExporting] = useState(false);
  const [modalRow, setModalRow] = useState(null);
  const [modalIndex, setModalIndex] = useState(-1);
  const [editAddrTarget, setEditAddrTarget] = useState(null);

  const [debouncedSearch, setDebouncedSearch] = useState(externalSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(externalSearch), 300);
    return () => clearTimeout(t);
  }, [externalSearch]);

  const fetchOverview = useCallback(() => {
    fetch(`${API_BASE_URL}/api/list-management/print-lists/overview`)
      .then(r => r.json())
      .then(d => { setOverview(d); setOverviewError(false); })
      .catch(() => setOverviewError(true));

    setUnsubLoading(true);
    fetch(`${API_BASE_URL}/api/list-management/print-lists/unsubscribed-counts`)
      .then(r => r.json())
      .then(d => { setUnsubData(d); setUnsubLoading(false); })
      .catch(() => setUnsubLoading(false));

    fetch(`${API_BASE_URL}/api/list-management/print-lists/blacklist?per_page=1`)
      .then(r => r.json())
      .then(d => { setBlacklistTotal(d.total || 0); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    if (activeType === 'blacklisted') return;
    let next;
    if (activeType === 'subscribed') {
      const counts = overview?.subscribed_counts;
      next = counts
        ? [SUBSCRIBED_OPTIONS.find(n => counts[n]) || SUBSCRIBED_OPTIONS[0]]
        : [SUBSCRIBED_OPTIONS[0]];
    } else {
      const counts = unsubData?.counts || {};
      const keys = Object.keys(counts);
      next = keys.length ? [keys[0]] : [];
    }
    setSelectedLists(prev => {
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
      return next;
    });
  }, [activeType, overview, unsubData]);

  const subscribedDropdownOptions = useMemo(() => {
    const counts = overview?.subscribed_counts || {};
    return SUBSCRIBED_OPTIONS.map(n => ({ value: n, count: counts[n] || 0 }));
  }, [overview]);

  const unsubscribedDropdownOptions = useMemo(() => {
    const counts = unsubData?.counts || {};
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ value: name, count }));
  }, [unsubData]);

  const dropdownOptions = activeType === 'subscribed' ? subscribedDropdownOptions : unsubscribedDropdownOptions;

  const fetchMembers = useCallback((lists, type, pg, search) => {
    if (type === 'blacklisted') return;
    if (!lists || lists.length === 0) {
      setMembers([]); setTotal(0); setAudienceCount(0); setTotalPages(1);
      return;
    }
    setMembersLoading(true);
    const params = new URLSearchParams({
      lists: lists.join(','),
      list: lists[0],
      type,
      page: pg,
      per_page: PER_PAGE,
      search: search || '',
    });
    fetch(`${API_BASE_URL}/api/list-management/print-lists/members?${params}`)
      .then(r => r.json())
      .then(d => {
        setMembers(d.members || []);
        setTotal(d.total || 0);
        setAudienceCount(d.audience_count || 0);
        setTotalPages(d.total_pages || 1);
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    if (activeType === 'blacklisted') return;
    setPage(1);
    fetchMembers(selectedLists, activeType, 1, debouncedSearch);
  }, [selectedLists, activeType, debouncedSearch, fetchMembers]);

  useEffect(() => {
    if (activeType === 'blacklisted') return;
    if (page > 1) fetchMembers(selectedLists, activeType, page, debouncedSearch);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const openProfileModal = (m, idx) => {
    setModalRow(adaptPrintRowForModal(m));
    setModalIndex(idx);
  };

  const closeProfileModal = () => {
    setModalRow(null);
    setModalIndex(-1);
  };

  const navigateProfileModal = (dir) => {
    const newIdx = modalIndex + dir;
    if (newIdx >= 0 && newIdx < sortedMembers.length) {
      setModalRow(adaptPrintRowForModal(sortedMembers[newIdx]));
      setModalIndex(newIdx);
    }
  };

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let av = a[sortField] ?? '';
      let bv = b[sortField] ?? '';
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [members, sortField, sortDir]);

  const exportCSV = useCallback(async () => {
    if (selectedLists.length === 0) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        lists: selectedLists.join(','),
        list: selectedLists[0],
        type: activeType,
        search: debouncedSearch || '',
        all: 'true',
      });
      const res = await fetch(`${API_BASE_URL}/api/list-management/print-lists/members?${params}`);
      const data = await res.json();
      const all = data.members || [];

      const headers = ['NPI', 'First Name', 'Last Name', 'Specialty', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip', 'In Audience', 'Source', 'Email',
        'Flags', 'Provider Status', 'Provider Status Source',
        ...(activeType === 'unsubscribed' ? ['Reason'] : [])
      ];
      const rows = all.map(m => {
        const flagSummary = summarizeFlags(m).map(f => f.label).join(' | ');
        const [addr1, addr2] = resolveAddress(m);
        return [
          m.npi || '', m.first_name || '', m.last_name || '', resolveSpecialty(m),
          addr1,
          addr2,
          m.practice_city || '', m.practice_state || '', m.practice_zipcode || '',
          m.in_audience ? 'Yes' : 'No',
          m.in_audience ? (m.audience_source || 'Owned') : '',
          m.audience_email || '',
          flagSummary,
          m.provider_status && m.provider_status !== 'Active' ? m.provider_status : '',
          m.provider_status_source || '',
          ...(activeType === 'unsubscribed' ? [m.unsubscribe_reason || ''] : [])
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });
      const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = (selectedLists.length === 1 ? selectedLists[0] : `${selectedLists.length}_lists`).replace(/[:\s/]+/g, '_');
      a.download = `${fname}_${activeType}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  }, [selectedLists, activeType, debouncedSearch]);

  const refreshAll = useCallback(() => {
    fetchOverview();
    if (activeType !== 'blacklisted') fetchMembers(selectedLists, activeType, page, debouncedSearch);
    setBlacklistRefreshKey(k => k + 1);
  }, [fetchOverview, fetchMembers, selectedLists, activeType, page, debouncedSearch]);

  const handleResubscribe = async (m) => {
    const lists = m.print_lists_unsubscribed && m.print_lists_unsubscribed.length
      ? m.print_lists_unsubscribed.filter(l => selectedLists.includes(l))
      : selectedLists;
    if (!lists.length) return;
    if (!window.confirm(`Resubscribe ${m.first_name || ''} ${m.last_name || ''} to: ${lists.join(', ')}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/list-management/print-lists/resubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: m.source_table, id: m.source_id, lists }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.reason || data.error || 'Failed to resubscribe.');
        return;
      }
      refreshAll();
    } catch (e) { alert(e.message); }
  };

  const unsubTotal = unsubData?.total ?? 0;

  const buildRowForModal = (m) => ({
    ...m,
    id: m.source_id,
    table_name: m.source_table,
    address_1: m.practice_address_1 || m.address_1,
    city: m.practice_city || m.city,
    state: m.practice_state || m.state,
    zipcode: m.practice_zipcode || m.zipcode,
  });

  return (
    <div className="shadow-engagers">
      <div className="reports-section-header">
        <h3>Print List Management</h3>
        <div className="reports-header-stats">
          <button
            onClick={() => setEditMode(e => !e)}
            title={editMode ? 'Exit edit mode' : 'Enter edit mode to add/remove subscribers'}
            style={{
              padding: '4px 12px', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer',
              border: '1px solid ' + (editMode ? '#ef4444' : '#333336'),
              background: editMode ? 'rgba(239,68,68,0.12)' : 'transparent',
              color: editMode ? '#fca5a5' : '#888',
              marginRight: 12,
            }}
          >
            {editMode ? '● Editing' : '✎ Edit'}
          </button>
          <span className="reports-header-stat-item">
            <span className="reports-header-stat-label">Total Subscribed:</span>
            <span className="reports-header-stat-value">{(overview?.total_subscribed || 0).toLocaleString()}</span>
          </span>
          <span className="reports-header-stat-item">
            <span className="reports-header-stat-label">In Audience:</span>
            <span className="reports-header-stat-value" style={{ color: '#0ff' }}>{(overview?.total_in_audience || 0).toLocaleString()}</span>
          </span>
          {overviewError && (
            <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: 8 }}>· Failed to load totals</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div className="archive-agency-tabs" style={{ margin: 0, flex: '1 1 auto', minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.archive-agency-tabs::-webkit-scrollbar { display: none; }`}</style>
          <button
            className={`archive-tab-button ${activeType === 'subscribed' ? 'active' : ''}`}
            onClick={() => setActiveType('subscribed')}
          >
            Subscribed ({(overview?.total_subscribed || 0).toLocaleString()})
          </button>
          <button
            className={`archive-tab-button ${activeType === 'unsubscribed' ? 'active' : ''}`}
            onClick={() => setActiveType('unsubscribed')}
          >
            Unsubscribed ({unsubLoading ? '…' : unsubTotal.toLocaleString()})
          </button>
          <button
            className={`archive-tab-button ${activeType === 'blacklisted' ? 'active' : ''}`}
            onClick={() => setActiveType('blacklisted')}
          >
            Blacklisted ({blacklistTotal.toLocaleString()})
          </button>
        </div>
        {activeType !== 'blacklisted' && (
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {editMode && (
              <button
                onClick={() => setShowAddModal(true)}
                className="export-button"
                title={activeType === 'subscribed' ? 'Add a new subscriber' : 'Add someone to unsubscribed (e.g. Hot Topics opt-out)'}
              >
                + Add
              </button>
            )}
            <MultiSelectDropdown
              options={dropdownOptions}
              selected={selectedLists}
              onChange={setSelectedLists}
              placeholder={activeType === 'subscribed' ? 'Select print lists...' : 'Select unsubscribe lists...'}
              searchPlaceholder="Search lists..."
            />
          </div>
        )}
      </div>

      {activeType === 'blacklisted' ? (
        <PrintListBlacklistTab
          editMode={editMode}
          externalSearch={externalSearch}
          refreshKey={blacklistRefreshKey}
          onAddBlacklist={() => { setBlacklistInitial({}); setShowBlacklistModal(true); }}
        />
      ) : (
        <>
          <div className="shadow-table-controls" style={{ background: 'var(--color-bg-card, #2a2a2d)', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', padding: '8px 12px', marginBottom: '4px', marginTop: '8px' }}>
            <span className="shadow-result-count">{total.toLocaleString()} total</span>
            <span style={{ fontSize: '0.8rem', color: '#0ff' }}>{audienceCount.toLocaleString()} in audience</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              {activeType === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}
            </span>
            {membersLoading && (
              <span style={{ fontSize: '0.75rem', color: '#0ff' }}>Searching…</span>
            )}
            {(sortedMembers.length > 0 || exporting) && (
              <button className="export-button" onClick={exportCSV} disabled={exporting}>
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            )}
          </div>

          {selectedLists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Select at least one list to view members.</div>
          ) : (
            <div className="x-table-container" style={{ opacity: membersLoading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
              <table className="results-table">
                <thead>
                  <tr>
                    {[
                      ['last_name', 'Name'],
                      ['npi', 'NPI'],
                      ['primary_specialty', 'Specialty'],
                      ['practice_address_1', 'Address'],
                      ['practice_address_2', 'Address 2'],
                      ['practice_city', 'City'],
                      ['practice_state', 'State'],
                      ['in_audience', 'In Audience'],
                      ['provider_status', 'Flags'],
                      ...(activeType === 'unsubscribed' ? [['unsubscribe_reason', 'Reason']] : []),
                    ].map(([key, label]) => (
                      <th key={key} onClick={() => handleSort(key)} className="sortable" style={{ cursor: 'pointer' }}>
                        {label} {sortField === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                    ))}
                    {editMode && <th style={{ width: 40 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.length === 0 ? (
                    <tr><td colSpan={(activeType === 'unsubscribed' ? 10 : 9) + (editMode ? 1 : 0)} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                      {membersLoading ? 'Loading…' : 'No records found'}
                    </td></tr>
                  ) : (
                    sortedMembers.map((m, i) => (
                      <tr key={`${m.npi || m.audience_email || 'r'}_${i}`} style={{ cursor: 'pointer' }} onClick={() => openProfileModal(m, i)}>
                        <td>{[m.first_name, m.last_name].filter(Boolean).join(' ') || '—'}</td>
                        <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem' }}>{m.npi || '—'}</td>
                        <td>{resolveSpecialty(m) || '—'}</td>
                        {(() => {
                          const [a1, a2] = resolveAddress(m);
                          return (
                            <>
                              <td style={{ fontSize: '0.8rem' }}>{a1 || '—'}</td>
                              <td style={{ fontSize: '0.8rem', color: a2 ? undefined : '#555' }}>{a2 || ''}</td>
                            </>
                          );
                        })()}
                        <td>{m.practice_city || '—'}</td>
                        <td>{m.practice_state || '—'}</td>
                        <td>
                          {m.in_audience ? (
                            m.audience_source === 'Licensed' ? (
                              <span style={{ color: '#d9b87f', fontWeight: 600 }} title="Licensed">Yes</span>
                            ) : (
                              <span style={{ color: '#22c55e', fontWeight: 600 }} title="Owned">Yes</span>
                            )
                          ) : (
                            <span style={{ color: '#888' }}>No</span>
                          )}
                        </td>
                        <td>
                          {(() => {
                            const flags = summarizeFlags(m);
                            if (!flags.length) return <span style={{ color: '#555' }}>—</span>;
                            return flags.map((f, idx) => <FlagBadge key={idx} flag={f} />);
                          })()}
                        </td>
                        {activeType === 'unsubscribed' && (
                          <td style={{ color: '#aaa' }}>{m.unsubscribe_reason || '—'}</td>
                        )}
                        {editMode && (
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditAddrTarget(m); }}
                              title="Edit address"
                              style={{ background: 'transparent', border: '1px solid #333336', color: '#0ff', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, marginRight: 4 }}
                            >✎</button>
                            {activeType === 'subscribed' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setUnsubTarget(buildRowForModal(m)); }}
                                title="Unsubscribe"
                                style={{ background: 'transparent', border: '1px solid #333336', color: '#ef4444', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                              >−</button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleResubscribe(m); }}
                                title="Resubscribe"
                                style={{ background: 'transparent', border: '1px solid #333336', color: '#22c55e', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                              >+</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {showAddModal && (
        <PrintListAddModal
          initialAction={activeType === 'unsubscribed' ? 'unsubscribe' : 'subscribe'}
          availableUnsubLists={Object.keys(unsubData?.counts || {})}
          onClose={() => setShowAddModal(false)}
          onSaved={refreshAll}
        />
      )}

      {unsubTarget && (
        <PrintListUnsubscribeModal
          row={unsubTarget}
          currentLists={
            (unsubTarget.print_lists_subscribed && unsubTarget.print_lists_subscribed.length
              ? unsubTarget.print_lists_subscribed
              : selectedLists) || []
          }
          onClose={() => setUnsubTarget(null)}
          onSaved={refreshAll}
        />
      )}

      {showBlacklistModal && (
        <PrintListBlacklistModal
          initial={blacklistInitial}
          onClose={() => setShowBlacklistModal(false)}
          onSaved={refreshAll}
        />
      )}

      {modalRow && (
        <HCPProfileModal
          hcp={modalRow}
          position={`${modalIndex + 1} of ${sortedMembers.length}`}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < sortedMembers.length - 1}
          onPrev={() => navigateProfileModal(-1)}
          onNext={() => navigateProfileModal(1)}
          onClose={closeProfileModal}
        />
      )}

      {editAddrTarget && (
        <PrintListEditAddressModal
          row={editAddrTarget}
          onClose={() => setEditAddrTarget(null)}
          onSaved={refreshAll}
        />
      )}
    </div>
  );
};

export default PrintListDisplay;