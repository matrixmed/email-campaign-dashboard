import React, { useState, useRef, useEffect } from 'react';

const CreatableSelect = ({ value, options = [], onChange, placeholder = 'Select' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [localOptions, setLocalOptions] = useState(options);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const merged = [...new Set([...options, ...localOptions])].filter(Boolean).sort();
    setLocalOptions(merged);
  }, [options]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setInputValue('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = localOptions.filter(opt =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (opt) => {
    onChange(opt);
    setIsOpen(false);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const trimmed = inputValue.trim();
      if (!localOptions.includes(trimmed)) {
        setLocalOptions(prev => [...prev, trimmed].sort());
      }
      onChange(trimmed);
      setIsOpen(false);
      setInputValue('');
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
  };

  return (
    <div className="ab-creatable-select" ref={containerRef}>
      <div
        className={`ab-creatable-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 50);
          }
        }}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            className="ab-creatable-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={value || placeholder}
            autoFocus
          />
        ) : (
          <span className={`ab-creatable-value ${!value ? 'placeholder' : ''}`}>
            {value || placeholder}
          </span>
        )}
        {value && !isOpen && (
          <span className="ab-creatable-clear" onClick={handleClear}>&times;</span>
        )}
        <span className={`ab-creatable-arrow ${isOpen ? 'open' : ''}`}>&#9662;</span>
      </div>

      {isOpen && (
        <div className="ab-creatable-menu">
          {filtered.length > 0 ? (
            filtered.map((opt, i) => (
              <div
                key={i}
                className={`ab-creatable-option ${opt === value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </div>
            ))
          ) : inputValue.trim() ? (
            <div className="ab-creatable-option ab-creatable-create">
              Press Enter to add "<strong>{inputValue.trim()}</strong>"
            </div>
          ) : (
            <div className="ab-creatable-option ab-creatable-empty">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatableSelect;