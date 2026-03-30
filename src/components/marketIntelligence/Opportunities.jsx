import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const Opportunities = ({ searchTerm, onSelectCompany }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/opportunities`);
        const json = await res.json();
        if (json.status === 'success') {
          setData(json);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatCurrency = (num) => {
    if (!num) return '-';
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
  };

  const getTierClass = (score) => {
    if (score >= 70) return 'tier-hot';
    if (score >= 50) return 'tier-warm';
    if (score >= 30) return 'tier-moderate';
    return '';
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Scoring opportunities...</p></div>;
  }

  const filtered = data?.opportunities?.filter(o => {
    if (!searchTerm) return true;
    return o.company?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const hot = filtered.filter(o => o.opportunity_score >= 70).length;
  const warm = filtered.filter(o => o.opportunity_score >= 50 && o.opportunity_score < 70).length;

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Ranked Opportunities ({filtered.length})</h3>
      </div>

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Trials (18mo)</th>
              <th>PDUFA</th>
              <th>KOLs Paid</th>
              <th>In Our Audience</th>
              <th>HCP Spend</th>
              <th>Expiring Patents</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr
                key={i}
                className={`clickable-row ${getTierClass(o.opportunity_score)}`}
                onClick={() => onSelectCompany(o.company)}
              >
                <td className="mi-bold">{o.company}</td>
                <td>
                  {o.upcoming_trials > 0
                    ? <span className="mi-highlight">{o.upcoming_trials}</span>
                    : <span className="mi-dim">0</span>
                  }
                  {o.total_trials > 0 && <span className="mi-dim"> / {o.total_trials}</span>}
                </td>
                <td>
                  {o.pending_pdufa > 0
                    ? <span className="mi-highlight">{o.pending_pdufa} pending</span>
                    : <span className="mi-dim">-</span>
                  }
                </td>
                <td>{o.total_kols > 0 ? o.total_kols.toLocaleString() : <span className="mi-dim">-</span>}</td>
                <td>
                  {o.audience_kols > 0
                    ? <span className="mi-audience-match">{o.audience_kols.toLocaleString()}</span>
                    : <span className="mi-dim">-</span>
                  }
                </td>
                <td>{o.total_spend > 0 ? formatCurrency(o.total_spend) : <span className="mi-dim">-</span>}</td>
                <td>{o.expiring_drugs > 0 ? o.expiring_drugs : <span className="mi-dim">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Opportunities;