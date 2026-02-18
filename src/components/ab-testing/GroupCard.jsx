import React, { useState, useEffect } from 'react';
import CreatableSelect from './CreatableSelect';
import { API_BASE_URL } from '../../config/api';

const GroupCard = ({
  group,
  metrics,
  otherGroupMetrics,
  category,
  subcategoryOptions,
  onUpdateGroup,
  testId
}) => {
  const [subcategory, setSubcategory] = useState(group.subcategory || '');
  const [notes, setNotes] = useState(group.notes || '');
  const [contextInfo, setContextInfo] = useState(null);

  useEffect(() => {
    setSubcategory(group.subcategory || '');
    setNotes(group.notes || '');
  }, [group]);

  useEffect(() => {
    if (category === 'Time of Day' && !group.sendTime && group.campaign_name_pattern) {
      fetchCampaignDetails(group.campaign_name_pattern);
    }
  }, [category, group.campaign_name_pattern, group.sendTime]);

  const fetchCampaignDetails = async (pattern) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ab-testing/campaign-details?pattern=${encodeURIComponent(pattern)}`);
      const data = await res.json();
      if (data.status === 'success' && data.details && data.details.length > 0) {
        setContextInfo(data.details[0]);
      }
    } catch (e) {}
  };

  const handleSubcategoryChange = (val) => {
    setSubcategory(val);
    if (group.id && onUpdateGroup) {
      onUpdateGroup(group.id, { subcategory: val });
    }
  };

  const handleNotesBlur = () => {
    if (group.id && onUpdateGroup) {
      onUpdateGroup(group.id, { notes });
    }
  };

  const formatNumber = (n) => {
    if (n === undefined || n === null) return '0';
    return n.toLocaleString();
  };

  const formatRate = (n) => {
    if (n === undefined || n === null) return '0.00%';
    return n.toFixed(2) + '%';
  };

  const getBarWidth = (val, otherVal) => {
    if (!val && !otherVal) return 50;
    const max = Math.max(val || 0, otherVal || 0);
    if (max === 0) return 50;
    return ((val || 0) / max) * 100;
  };

  const isWinner = (val, otherVal) => {
    if (val === undefined || otherVal === undefined) return false;
    return val > otherVal;
  };

  const renderContextDisplay = () => {
    const elements = [];

    if (group.campaign_name_pattern) {
      elements.push(
        <div key="name" className="ab-group-context">
          <span className="ab-group-context-value ab-group-context-name">{group.campaign_name_pattern}</span>
        </div>
      );
    }

    if (category === 'Time of Day') {
      const sendTime = group.sendTime || contextInfo?.send_time;
      if (sendTime) {
        const date = new Date(sendTime);
        if (!isNaN(date)) {
          elements.push(
            <div key="time" className="ab-group-context">
              <span className="ab-group-context-label">Send Time:</span>
              <span className="ab-group-context-value">
                {date.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            </div>
          );
        }
      }
    }

    return elements.length > 0 ? <>{elements}</> : null;
  };

  const metricRows = [
    { label: 'Delivered', key: 'Delivered', format: formatNumber },
    { label: 'Unique Opens', key: 'Unique_Opens', format: formatNumber },
    { label: 'Unique Open Rate', key: 'Unique_Open_Rate', format: formatRate, isRate: true },
    { label: 'Total Opens', key: 'Total_Opens', format: formatNumber },
    { label: 'Total Open Rate', key: 'Total_Open_Rate', format: formatRate, isRate: true },
  ];

  return (
    <div className="ab-group-card">
      <div className="ab-group-header">
        <span className="ab-group-label">Group {group.group_label}</span>
      </div>

      {renderContextDisplay()}

      <div className="ab-group-meta">
        <div className="ab-group-field">
          <label>Subcategory</label>
          <CreatableSelect
            value={subcategory}
            options={subcategoryOptions}
            onChange={handleSubcategoryChange}
            placeholder="Select"
          />
        </div>
        <div className="ab-group-field">
          <label>Notes</label>
          <textarea
            className="ab-group-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Notes"
            rows={2}
          />
        </div>
      </div>

      <div className="ab-group-metrics">
        {metricRows.map(({ label, key, format, isRate }) => {
          const val = metrics?.[key];
          const otherVal = otherGroupMetrics?.[key];
          const winner = isRate && isWinner(val, otherVal);

          return (
            <div key={key} className={`ab-metric-row ${winner ? 'winner' : ''}`}>
              <div className="ab-metric-label">{label}</div>
              <div className="ab-metric-value">{format(val)}</div>
              {isRate && (
                <div className="ab-metric-bar-container">
                  <div
                    className={`ab-metric-bar ${winner ? 'bar-winner' : 'bar-loser'}`}
                    style={{ width: `${getBarWidth(val, otherVal)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupCard;