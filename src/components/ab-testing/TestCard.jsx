import React, { useState, useEffect, useCallback } from 'react';
import GroupCard from './GroupCard';
import StatisticalAnalysis from './StatisticalAnalysis';
import CreatableSelect from './CreatableSelect';
import { API_BASE_URL } from '../../config/api';

const TestCard = ({
  test,
  categoryOptions,
  marketOptions,
  subcategoryOptions,
  onMetadataChanged
}) => {
  const [description, setDescription] = useState(test.metadata?.description || '');
  const [notes, setNotes] = useState(test.metadata?.notes || '');
  const [category, setCategory] = useState(test.metadata?.category || '');
  const [market, setMarket] = useState(test.metadata?.market || '');
  const [status, setStatus] = useState(test.metadata?.status || 'active');
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setDescription(test.metadata?.description || '');
    setNotes(test.metadata?.notes || '');
    setCategory(test.metadata?.category || '');
    setMarket(test.metadata?.market || '');
    setStatus(test.metadata?.status || 'active');
  }, [test.metadata]);

  const autoSaveMetadata = useCallback(async (field, value) => {
    const payload = {
      base_campaign_name: test.baseName,
      [field]: value,
      groups: test.groups.map(g => ({
        group_label: g.label,
        campaign_name_pattern: g.campaignNamePattern
      }))
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/ab-testing/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success' && onMetadataChanged) {
        onMetadataChanged(data.test);
      }
    } catch (e) {}
  }, [test.baseName, test.groups, onMetadataChanged]);

  const handleCategoryChange = (val) => {
    setCategory(val);
    autoSaveMetadata('category', val);
  };

  const handleMarketChange = (val) => {
    setMarket(val);
    autoSaveMetadata('market', val);
  };

  const handleDescriptionBlur = () => {
    autoSaveMetadata('description', description);
  };

  const handleNotesBlur = () => {
    autoSaveMetadata('notes', notes);
  };

  const handleUpdateGroup = async (groupId, updates) => {
    try {
      await fetch(`${API_BASE_URL}/api/ab-testing/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {}
  };

  const groupsData = {};
  test.groups.forEach(g => {
    groupsData[g.label] = g.metrics;
  });

  return (
    <div className="ab-test-card">
      <div className="ab-test-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="ab-test-card-title-row">
          <h3 className="ab-test-card-name">{test.baseName}</h3>
          <div className="ab-test-card-badges">
            {category && <span className="ab-badge ab-badge-category">{category}</span>}
            {market && <span className="ab-badge ab-badge-market">{market}</span>}
            <span className={`ab-badge ab-badge-status ab-badge-${status}`}>{status}</span>
          </div>
          <span className={`ab-test-expand-icon ${expanded ? 'expanded' : ''}`}>&#9662;</span>
        </div>
      </div>

      {expanded && (
        <div className="ab-test-card-body">
          <div className="ab-test-meta-row">
            <div className="ab-test-meta-field">
              <label>Category</label>
              <CreatableSelect
                value={category}
                options={categoryOptions}
                onChange={handleCategoryChange}
                placeholder="Select"
              />
            </div>
            <div className="ab-test-meta-field">
              <label>Market</label>
              <CreatableSelect
                value={market}
                options={marketOptions}
                onChange={handleMarketChange}
                placeholder="Select"
              />
            </div>
            <div className="ab-test-meta-field">
              <label>Status</label>
              <select
                className="ab-test-status-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  autoSaveMetadata('status', e.target.value);
                }}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="ab-test-textarea-row">
            <div className="ab-test-textarea-field">
              <label>Description</label>
              <textarea
                className="ab-test-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Description"
                rows={2}
              />
            </div>
            <div className="ab-test-textarea-field">
              <label>Notes</label>
              <textarea
                className="ab-test-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Notes"
                rows={2}
              />
            </div>
          </div>

          <div className="ab-groups-comparison">
            {test.groups.map((group, idx) => {
              const otherGroup = test.groups.find((_, i) => i !== idx);
              return (
                <React.Fragment key={group.label}>
                  {idx > 0 && <div className="ab-vs-divider"><span>VS</span></div>}
                  <GroupCard
                    group={{
                      ...group,
                      id: group.dbId,
                      group_label: group.label,
                      campaign_name_pattern: group.campaignNamePattern,
                      subcategory: group.subcategory,
                      notes: group.notes
                    }}
                    metrics={group.metrics}
                    otherGroupMetrics={otherGroup?.metrics}
                    category={category}
                    subcategoryOptions={subcategoryOptions}
                    onUpdateGroup={handleUpdateGroup}
                    testId={test.metadata?.id}
                  />
                </React.Fragment>
              );
            })}
          </div>

          <StatisticalAnalysis groupsData={groupsData} status={status} />
        </div>
      )}
    </div>
  );
};

export default TestCard;