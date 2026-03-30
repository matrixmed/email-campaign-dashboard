import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const getAreaStyle = (area) => {
  const c = AREA_COLORS[area];
  if (!c) return {};
  return { background: c.bg, color: c.primary };
};

const CompanyProfile = ({ companyName, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const formatCurrency = (num) => {
    if (!num) return '$0';
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading company profile...</p></div>;
  }

  if (!data) {
    return <div className="mi-empty"><h3>No data found for {companyName}</h3></div>;
  }

  const { trials, pdufa, kols, patents } = data;

  return (
    <div className="mi-tab-content company-profile">
      <button className="mi-back-btn" onClick={onBack}>Back to Opportunities</button>

      <div className="mi-company-header">
        <h2>{companyName}</h2>
      </div>

      <div className="mi-company-signals">
        <div className={`mi-signal-card ${trials.upcoming_18mo > 0 ? 'active' : ''}`}>
          <div className="mi-signal-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L12.5 7.5L18 8.5L14 12.5L15 18L10 15.5L5 18L6 12.5L2 8.5L7.5 7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
          </div>
          <div className="mi-signal-num">{trials.upcoming_18mo}</div>
          <div className="mi-signal-label">Trials Completing</div>
          <div className="mi-signal-sub">{trials.total} total | {trials.recruiting} recruiting</div>
        </div>
        <div className={`mi-signal-card ${pdufa.pending > 0 ? 'active' : ''}`}>
          <div className="mi-signal-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 8H18" stroke="currentColor" strokeWidth="1.5"/><path d="M6 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div className="mi-signal-num">{pdufa.pending}</div>
          <div className="mi-signal-label">Pending PDUFA</div>
          <div className="mi-signal-sub">{pdufa.total} total decisions</div>
        </div>
        <div className={`mi-signal-card ${kols.in_audience > 0 ? 'audience' : ''}`}>
          <div className="mi-signal-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M3 18C3 14.134 6.134 11 10 11C13.866 11 17 14.134 17 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div className="mi-signal-num">{kols.in_audience}</div>
          <div className="mi-signal-label">KOLs in Our Audience</div>
          <div className="mi-signal-sub">{kols.total} total KOLs paid | {formatCurrency(kols.spend?.total_spend)} spent</div>
        </div>
        <div className={`mi-signal-card ${patents.total > 0 ? 'active' : ''}`}>
          <div className="mi-signal-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="2" width="12" height="16" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M7 6H13M7 9H13M7 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div className="mi-signal-num">{patents.total}</div>
          <div className="mi-signal-label">Expiring Patents</div>
          <div className="mi-signal-sub">Next 3 years</div>
        </div>
      </div>

      {kols.matched?.length > 0 && (
        <>
          <div className="metrics-header">
            <h2>KOLs in Our Email Audience ({kols.in_audience})</h2>
          </div>
          <p className="mi-panel-sub">These HCPs receive payments from {companyName} AND are in our email lists</p>
          <table>
              <thead>
                <tr>
                  <th>NPI</th>
                  <th>Name</th>
                  <th>Specialty</th>
                  <th>Total Payments</th>
                  <th>Payment Count</th>
                </tr>
              </thead>
              <tbody>
                {kols.matched.map((k, i) => (
                  <tr key={i}>
                    <td>{k.npi}</td>
                    <td className="mi-bold">{k.physician_name}</td>
                    <td>{k.specialty}</td>
                    <td>{formatCurrency(k.total_payments)}</td>
                    <td>{k.payment_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </>
      )}

      {trials.items?.length > 0 && (
        <>
          <div className="metrics-header" style={{marginTop: 32}}>
            <h2>Clinical Trials ({trials.total})</h2>
          </div>
          <div className="table-section">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Completion</th>
                  <th>Title</th>
                  <th>Area</th>
                  <th>Enrollment</th>
                </tr>
              </thead>
              <tbody>
                {trials.items.map((t, i) => (
                  <tr key={i}>
                    <td><span className={`mi-trial-status ${t.status?.toLowerCase()}`}>{t.status}</span></td>
                    <td style={{whiteSpace: 'nowrap'}}>{t.primary_completion_date || '-'}</td>
                    <td className="mi-truncate">{t.title}</td>
                    <td>{t.therapeutic_area && <span className="mi-area-tag" style={getAreaStyle(t.therapeutic_area)}>{t.therapeutic_area}</span>}</td>
                    <td>{t.enrollment_count?.toLocaleString() || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pdufa.items?.length > 0 && (
        <>
          <div className="metrics-header" style={{marginTop: 32}}>
            <h2>PDUFA Decisions ({pdufa.total})</h2>
          </div>
          <div className="table-section">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Drug</th>
                  <th>Type</th>
                  <th>Area</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pdufa.items.map((p, i) => (
                  <tr key={i}>
                    <td className="mi-bold" style={{whiteSpace: 'nowrap'}}>{p.target_date}</td>
                    <td>{p.drug_name}</td>
                    <td>{p.application_type || '-'}</td>
                    <td>{p.therapeutic_area && <span className="mi-area-tag" style={getAreaStyle(p.therapeutic_area)}>{p.therapeutic_area}</span>}</td>
                    <td><span className={p.status === 'pending' ? 'mi-status-pending' : p.status === 'approved' ? 'mi-status-approved' : 'mi-status-past'}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {patents.items?.length > 0 && (
        <>
          <div className="metrics-header" style={{marginTop: 32}}>
            <h2>Patent Expirations ({patents.total})</h2>
          </div>
          <div className="table-section">
            <table>
              <thead>
                <tr>
                  <th>Expiry Date</th>
                  <th>Drug</th>
                  <th>Active Ingredient</th>
                </tr>
              </thead>
              <tbody>
                {patents.items.map((p, i) => (
                  <tr key={i}>
                    <td style={{whiteSpace: 'nowrap'}}>{p.patent_expiration_date}</td>
                    <td className="mi-bold">{p.drug_name}</td>
                    <td>{p.active_ingredient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {kols.items?.length > 0 && (
        <>
          <div className="metrics-header" style={{marginTop: 32}}>
            <h2>Top KOLs by Payment ({kols.total} total)</h2>
          </div>
          <div className="table-section">
            <table>
              <thead>
                <tr>
                  <th>NPI</th>
                  <th>Name</th>
                  <th>Specialty</th>
                  <th>Total Payments</th>
                  <th>Avg Payment</th>
                  <th>Max Payment</th>
                </tr>
              </thead>
              <tbody>
                {kols.items.map((k, i) => (
                  <tr key={i}>
                    <td>{k.npi}</td>
                    <td className="mi-bold">{k.physician_name}</td>
                    <td>{k.specialty}</td>
                    <td>{formatCurrency(k.total_payments)}</td>
                    <td>{formatCurrency(k.avg_payment)}</td>
                    <td>{formatCurrency(k.max_payment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default CompanyProfile;