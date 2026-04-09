import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config/api';

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const getAreaStyle = (area) => {
  const c = AREA_COLORS[area];
  return c ? { background: c.bg, color: c.primary } : {};
};

const cleanSpecialty = (raw) => {
  if (!raw) return '';
  const parts = raw.split('|');
  return parts[parts.length - 1].trim();
};

const CompanyModal = ({ companyName, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalTab, setModalTab] = useState('overview');
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/company/${encodeURIComponent(companyName)}`);
        const json = await res.json();
        if (json.status === 'success') {
          setData(json);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, [companyName]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const formatCurrency = (num) => {
    if (!num) return '$0';
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
  };

  const handleExport = () => {
    window.open(`${API_BASE_URL}/api/market-intelligence/open-payments/manufacturer/${encodeURIComponent(companyName)}/export`, '_blank');
  };

  const { trials, pdufa, kols, patents, fda, spending, client } = data || { trials: {}, pdufa: {}, kols: {}, patents: {}, fda: {}, spending: {}, client: {} };

  const upcomingTrials = trials?.items?.filter(t => {
    if (!t.primary_completion_date) return false;
    const comp = new Date(t.primary_completion_date);
    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 18);
    return comp >= now && comp <= future;
  }) || [];

  const tabs = [
    { key: 'overview', label: 'Overview' },
  ];
  if (fda?.total > 0) tabs.push({ key: 'fda', label: `FDA Alerts (${fda.total})` });
  tabs.push({ key: 'pipeline', label: `Trials (${trials?.total || 0})` });
  tabs.push({ key: 'kols', label: `KOLs (${kols?.total || 0})` });
  if (pdufa?.total > 0) tabs.push({ key: 'pdufa', label: `PDUFA (${pdufa.total})` });
  if (patents?.total > 0) tabs.push({ key: 'patents', label: `Patents (${patents.total})` });
  if (spending?.total > 0) tabs.push({ key: 'spending', label: `Drug Revenue (${spending.total})` });

  return (
    <div className="campaign-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="campaign-modal" ref={modalRef}>
        <div className="campaign-modal-header">
          <h3>
            {companyName}
            {client?.is_client && (
              <span style={{marginLeft: 12, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)'}}>EXISTING CLIENT</span>
            )}
          </h3>
          <button className="modal-close-button" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <div className="mi-loading"><div className="loading-spinner"></div><p>Loading company data...</p></div>
        ) : !data ? (
          <div className="mi-empty"><p>No data found for {companyName}</p></div>
        ) : (
          <>
            <div className="campaign-modal-info">
              <div className="campaign-modal-info-left" style={{flexWrap: 'wrap'}}>
                {trials?.total > 0 && (
                  <div className="info-pill">
                    <span className="info-label">Trials</span>
                    <span className="info-value">{trials.total}</span>
                  </div>
                )}
                {upcomingTrials.length > 0 && (
                  <div className="info-pill">
                    <span className="info-label">Completing 18mo</span>
                    <span className="info-value" style={{color: '#0ff'}}>{upcomingTrials.length}</span>
                  </div>
                )}
                {pdufa?.pending > 0 && (
                  <div className="info-pill">
                    <span className="info-label">Pending PDUFA</span>
                    <span className="info-value" style={{color: '#fbbf24'}}>{pdufa.pending}</span>
                  </div>
                )}
                {kols?.total > 0 && (
                  <div className="info-pill">
                    <span className="info-label">KOLs Paid</span>
                    <span className="info-value">{kols.total.toLocaleString()}</span>
                  </div>
                )}
                {kols?.in_audience > 0 && (
                  <div className="info-pill" style={{borderColor: 'rgba(0, 255, 255, 0.4)'}}>
                    <span className="info-label">In Our Audience</span>
                    <span className="info-value" style={{color: '#0ff'}}>{kols.in_audience.toLocaleString()}</span>
                  </div>
                )}
                {kols?.spend?.total_spend > 0 && (
                  <div className="info-pill">
                    <span className="info-label">HCP Spend</span>
                    <span className="info-value">{formatCurrency(kols.spend.total_spend)}</span>
                  </div>
                )}
                {patents?.total > 0 && (
                  <div className="info-pill">
                    <span className="info-label">Expiring Patents</span>
                    <span className="info-value">{patents.total}</span>
                  </div>
                )}
                {fda?.total > 0 && (
                  <div className="info-pill" style={{borderColor: 'rgba(74, 222, 128, 0.4)'}}>
                    <span className="info-label">FDA Actions</span>
                    <span className="info-value" style={{color: '#4ade80'}}>{fda.total}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="archive-agency-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`archive-tab-button ${modalTab === tab.key ? 'active' : ''}`}
                  onClick={() => setModalTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {modalTab === 'overview' && (
              <div className="company-modal-overview">
                {client?.is_client && (
                  <div className="company-modal-section">
                    <h4>Our Relationship</h4>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8}}>
                      {client.brands?.map((b, i) => (
                        <span key={i} style={{padding: '3px 10px', borderRadius: 12, fontSize: 12, background: 'rgba(0, 255, 255, 0.08)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#0ff'}}>{b}</span>
                      ))}
                    </div>
                    {client.agencies?.length > 0 && <div style={{fontSize: 13, color: '#8a8a8a'}}>Agency: {client.agencies.join(', ')}</div>}
                    {client.sales?.length > 0 && <div style={{fontSize: 13, color: '#8a8a8a'}}>Sales: {client.sales.join(', ')}</div>}
                  </div>
                )}
                {kols?.in_audience > 0 && (
                  <div className="company-modal-highlight">
                    <div className="company-modal-highlight-num">{kols.in_audience.toLocaleString()}</div>
                    <div className="company-modal-highlight-label">of their KOLs are in our email audience</div>
                    <div className="company-modal-highlight-sub">out of {kols.total.toLocaleString()} total HCPs receiving payments from {companyName}</div>
                  </div>
                )}

                {upcomingTrials.length > 0 && (
                  <div className="company-modal-section">
                    <h4>Pipeline Timeline - Next 18 Months</h4>
                    <div style={{position: 'relative', paddingLeft: '28px', marginTop: '12px'}}>
                      <div style={{position: 'absolute', left: '10px', top: '8px', bottom: '8px', width: '2px', background: '#333336'}} />
                      {upcomingTrials.slice(0, 10).map((t, i) => {
                        const areaColor = AREA_COLORS[t.therapeutic_area]?.primary || '#8a8a8a';
                        return (
                          <div key={i} style={{position: 'relative', marginBottom: '16px', paddingLeft: '16px'}}>
                            <div style={{
                              position: 'absolute', left: '-22px', top: '6px',
                              width: '10px', height: '10px', borderRadius: '50%',
                              background: areaColor, border: '2px solid #1c1c1e',
                            }} />
                            <div style={{display: 'flex', gap: '12px', alignItems: 'baseline'}}>
                              <span style={{fontSize: '0.75rem', color: '#8a8a8a', whiteSpace: 'nowrap', minWidth: '90px'}}>
                                {t.primary_completion_date}
                              </span>
                              <div>
                                <span className="mi-area-tag" style={{...getAreaStyle(t.therapeutic_area), marginRight: 8, fontSize: 10}}>
                                  {t.therapeutic_area}
                                </span>
                                <span style={{fontSize: '0.85rem', color: '#ccc'}}>{t.title}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {upcomingTrials.length > 10 && (
                        <div style={{paddingLeft: '16px', color: '#8a8a8a', fontSize: '0.8rem'}}>
                          + {upcomingTrials.length - 10} more trials
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {fda?.items?.length > 0 && (
                  <div className="company-modal-section">
                    <h4>Recent FDA Actions</h4>
                    {fda.items.slice(0, 5).map((f, i) => (
                      <div key={i} style={{display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center'}}>
                        <span style={{color: '#fff', fontWeight: 600, minWidth: 90, whiteSpace: 'nowrap'}}>{f.approval_date}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          background: f.submission_type === 'ORIG' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                          color: f.submission_type === 'ORIG' ? '#4ade80' : '#fbbf24',
                        }}>
                          {f.submission_type === 'ORIG' ? 'NEW' : 'SUPPL'}
                        </span>
                        <span style={{color: '#ccc'}}>{f.brand_name}</span>
                        {f.submission_description && <span style={{color: '#8a8a8a', fontSize: 12}}>{f.submission_description}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {pdufa?.items?.length > 0 && (
                  <div className="company-modal-section">
                    <h4>PDUFA Decisions</h4>
                    {pdufa.items.map((p, i) => (
                      <div key={i} style={{display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>
                        <span style={{color: '#fff', fontWeight: 600, minWidth: 90}}>{p.target_date}</span>
                        <span style={{color: '#ccc'}}>{p.drug_name}</span>
                        <span className={p.status === 'pending' ? 'mi-status-pending' : p.status === 'approved' ? 'mi-status-approved' : 'mi-status-past'}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {kols?.matched?.length > 0 && (
                  <div className="company-modal-section">
                    <h4 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span>Top KOLs in Our Audience</span>
                      <button className="mi-export-btn" onClick={handleExport} style={{fontSize: 11, padding: '4px 10px'}}>Export All</button>
                    </h4>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                      <thead>
                        <tr>
                          <th style={{padding: '8px 10px', textAlign: 'left', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Name</th>
                          <th style={{padding: '8px 10px', textAlign: 'left', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Specialty</th>
                          <th style={{padding: '8px 10px', textAlign: 'left', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Total Payments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kols.matched.slice(0, 10).map((k, i) => (
                          <tr key={i}>
                            <td style={{padding: '8px 10px', color: '#fff', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{k.physician_name}</td>
                            <td style={{padding: '8px 10px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{cleanSpecialty(k.specialty)}</td>
                            <td style={{padding: '8px 10px', color: '#0ff', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{formatCurrency(k.total_payments)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {kols.matched.length > 10 && (
                      <div style={{color: '#8a8a8a', fontSize: 12, marginTop: 8}}>
                        + {kols.matched.length - 10} more in audience
                      </div>
                    )}
                  </div>
                )}

                {patents?.items?.length > 0 && (
                  <div className="company-modal-section">
                    <h4>Patent Expirations</h4>
                    {patents.items.slice(0, 5).map((p, i) => (
                      <div key={i} style={{display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>
                        <span style={{color: '#fff', fontWeight: 600, minWidth: 90}}>{p.patent_expiration_date}</span>
                        <span style={{color: '#ccc'}}>{p.drug_name}</span>
                        <span style={{color: '#8a8a8a'}}>{p.active_ingredient}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {modalTab === 'pipeline' && (
              <div className="company-modal-tab-content">
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                  <thead>
                    <tr>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Status</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Completion</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Title</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Area</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Enrollment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trials?.items?.map((t, i) => (
                      <tr key={i}>
                        <td style={{padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)'}}><span className={`mi-trial-status ${t.status?.toLowerCase()}`}>{t.status}</span></td>
                        <td style={{padding: '10px 12px', whiteSpace: 'nowrap', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{t.primary_completion_date || '-'}</td>
                        <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'normal', lineHeight: 1.4}}>{t.title}</td>
                        <td style={{padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{t.therapeutic_area && <span className="mi-area-tag" style={getAreaStyle(t.therapeutic_area)}>{t.therapeutic_area}</span>}</td>
                        <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{t.enrollment_count?.toLocaleString() || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {modalTab === 'kols' && (
              <div className="company-modal-tab-content">
                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 12}}>
                  <button className="mi-export-btn" onClick={handleExport}>Export All KOLs</button>
                </div>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                  <thead>
                    <tr>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>NPI</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Name</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Specialty</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Total Payments</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>In Audience</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kols?.items?.map((k, i) => {
                      const inAudience = kols.matched?.some(m => m.npi === k.npi);
                      return (
                        <tr key={i} style={inAudience ? {background: 'rgba(0, 255, 255, 0.03)'} : {}}>
                          <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{k.npi}</td>
                          <td style={{padding: '10px 12px', color: '#fff', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{k.physician_name}</td>
                          <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{cleanSpecialty(k.specialty)}</td>
                          <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{formatCurrency(k.total_payments)}</td>
                          <td style={{padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{inAudience ? <span style={{color: '#0ff', fontWeight: 600}}>Yes</span> : <span style={{color: '#555'}}>No</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {modalTab === 'pdufa' && (
              <div className="company-modal-tab-content">
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                  <thead>
                    <tr>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Date</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Drug</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Type</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Area</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdufa?.items?.map((p, i) => (
                      <tr key={i}>
                        <td style={{padding: '10px 12px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{p.target_date}</td>
                        <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{p.drug_name}</td>
                        <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{p.application_type || '-'}</td>
                        <td style={{padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{p.therapeutic_area && <span className="mi-area-tag" style={getAreaStyle(p.therapeutic_area)}>{p.therapeutic_area}</span>}</td>
                        <td style={{padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)'}}><span className={p.status === 'pending' ? 'mi-status-pending' : p.status === 'approved' ? 'mi-status-approved' : 'mi-status-past'}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {modalTab === 'fda' && (
              <div className="company-modal-tab-content">
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                  <thead>
                    <tr>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Date</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Brand</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Generic</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Type</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Area</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fda?.items?.map((f, i) => (
                      <tr key={i}>
                        <td style={{padding: '10px 12px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{f.approval_date}</td>
                        <td style={{padding: '10px 12px', color: '#ccc', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{f.brand_name || '-'}</td>
                        <td style={{padding: '10px 12px', color: '#8a8a8a', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{f.generic_name || '-'}</td>
                        <td style={{padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                            background: f.submission_type === 'ORIG' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                            color: f.submission_type === 'ORIG' ? '#4ade80' : '#fbbf24',
                          }}>{f.submission_type === 'ORIG' ? 'NEW' : 'SUPPL'}</span>
                        </td>
                        <td style={{padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>
                          {f.therapeutic_area ? <span className="mi-area-tag" style={getAreaStyle(f.therapeutic_area)}>{f.therapeutic_area}</span> : '-'}
                        </td>
                        <td style={{padding: '10px 12px', color: '#999', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'normal', lineHeight: 1.4}}>{f.submission_description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {modalTab === 'patents' && (
              <div className="company-modal-tab-content">
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                  <thead>
                    <tr>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Expiry</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Drug</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Active Ingredient</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patents?.items?.map((p, i) => (
                      <tr key={i}>
                        <td style={{padding: '10px 12px', color: '#fff', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{p.patent_expiration_date}</td>
                        <td style={{padding: '10px 12px', color: '#ccc', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{p.drug_name}</td>
                        <td style={{padding: '10px 12px', color: '#8a8a8a', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{p.active_ingredient}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {modalTab === 'spending' && (
              <div className="company-modal-tab-content">
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                  <thead>
                    <tr>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Brand</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Generic</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Total Spending</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Claims</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', background: '#222224', color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #333'}}>Beneficiaries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spending?.items?.map((s, i) => (
                      <tr key={i}>
                        <td style={{padding: '10px 12px', color: '#fff', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{s.brand_name}</td>
                        <td style={{padding: '10px 12px', color: '#8a8a8a', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{s.generic_name}</td>
                        <td style={{padding: '10px 12px', color: '#0ff', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{formatCurrency(s.total_spending)}</td>
                        <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{s.total_claims?.toLocaleString()}</td>
                        <td style={{padding: '10px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)'}}>{s.total_beneficiaries?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyModal;
