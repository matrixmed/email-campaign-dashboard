import React, { useState, useEffect, useRef, useMemo } from 'react';

const MultiSelectDropdown = ({
  options = [],
  selected = [],
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  label = null,
  popoverWidth = 320,
  maxHeight = 360,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.value.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (value) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAllVisible = () => {
    const merged = new Set(selected);
    filtered.forEach(o => merged.add(o.value));
    onChange(Array.from(merged));
  };

  const clearAll = () => onChange([]);

  const buttonLabel = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  const hasSel = selected.length > 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {label && (
        <div style={{ fontSize: '0.7rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '6px 10px',
          border: `1px solid ${hasSel ? '#555' : '#333336'}`,
          borderRadius: '4px',
          background: hasSel ? 'rgba(255,255,255,0.04)' : 'var(--color-bg-card, #2a2a2d)',
          color: hasSel ? '#e8e8e8' : '#bbb',
          fontSize: '0.82rem',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: hasSel ? 600 : 400,
          maxWidth: '320px',
          whiteSpace: 'nowrap',
        }}
        title={selected.length > 1 ? selected.join(', ') : undefined}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{buttonLabel}</span>
        <span style={{ fontSize: '0.65rem', color: '#888' }}>{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: popoverWidth,
            background: 'var(--color-bg-card, #2a2a2d)',
            border: '1px solid #3a3a3d',
            borderRadius: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 2000,
            padding: '8px',
          }}
        >
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #3a3a3d',
              borderRadius: '3px',
              color: '#eee',
              fontSize: '0.8rem',
              marginBottom: '6px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <button
              type="button"
              onClick={selectAllVisible}
              style={{ padding: '3px 8px', fontSize: '0.7rem', background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '3px', cursor: 'pointer' }}
            >
              Select all{query ? ' visible' : ''}
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={selected.length === 0}
              style={{ padding: '3px 8px', fontSize: '0.7rem', background: 'transparent', border: '1px solid #444', color: selected.length === 0 ? '#555' : '#aaa', borderRadius: '3px', cursor: selected.length === 0 ? 'default' : 'pointer' }}
            >
              Clear
            </button>
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#888', alignSelf: 'center' }}>
              {selected.length}/{options.length}
            </span>
          </div>
          <div style={{ maxHeight, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>No matches</div>
            ) : (
              filtered.map(o => {
                const isSel = selectedSet.has(o.value);
                return (
                  <div
                    key={o.value}
                    onClick={() => toggle(o.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      background: isSel ? 'rgba(255,255,255,0.05)' : 'transparent',
                      borderRadius: '3px',
                      marginBottom: '1px',
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => {}}
                      style={{ marginRight: '8px', accentColor: '#888' }}
                    />
                    <span style={{ flex: 1, color: isSel ? '#e8e8e8' : '#bbb', fontSize: '0.82rem', fontWeight: isSel ? 500 : 400 }}>{o.value}</span>
                    {o.count != null && (
                      <span style={{ color: '#777', fontSize: '0.75rem', marginLeft: '8px' }}>{o.count.toLocaleString()}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;