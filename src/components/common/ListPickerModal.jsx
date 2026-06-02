import React, { useState, useMemo } from 'react';

const ListPickerModal = ({
  title,
  options = [],
  selected = [],
  onChange,
  onClose,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No matches.',
  loading = false,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.value.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (value) => {
    if (selectedSet.has(value)) onChange(selected.filter(v => v !== value));
    else onChange([...selected, value]);
  };

  const selectAllVisible = () => {
    const merged = new Set(selected);
    filtered.forEach(o => merged.add(o.value));
    onChange(Array.from(merged));
  };

  const clearAll = () => onChange([]);

  return (
    <div className="aqb-modal-overlay" onClick={onClose}>
      <div className="aqb-modal-content" onClick={e => e.stopPropagation()}>
        <div className="aqb-modal-header">
          <h2>{title}</h2>
          <button className="aqb-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="aqb-modal-search">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="aqb-search-input"
          />
        </div>
        <div className="aqb-modal-actions">
          <button type="button" onClick={selectAllVisible} className="aqb-action-button select-all">
            {query ? 'Select All Visible' : 'Select All'}
          </button>
          <button type="button" onClick={clearAll} className="aqb-action-button clear-all">
            Clear All
          </button>
          <div className="aqb-selection-count">{selected.length} selected</div>
        </div>
        <div className="aqb-modal-list">
          {loading ? (
            <div className="aqb-modal-loading">
              <div className="aqb-modal-spinner" />
              <p>Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
              <p>{emptyLabel}</p>
            </div>
          ) : (
            filtered.map(o => {
              const isSel = selectedSet.has(o.value);
              return (
                <div
                  key={o.value}
                  className={`aqb-modal-list-item ${isSel ? 'selected' : ''}`}
                  onClick={() => toggle(o.value)}
                >
                  <div className="aqb-item-checkbox">
                    {isSel && <span className="checkmark">\u2713</span>}
                  </div>
                  <div className="aqb-item-info">
                    <div className="aqb-item-name">{o.value}</div>
                    {o.count != null && (
                      <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>{o.count.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="aqb-modal-footer">
          <button type="button" onClick={onClose} className="aqb-done-button">Done</button>
        </div>
      </div>
    </div>
  );
};

export default ListPickerModal;