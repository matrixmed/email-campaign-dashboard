import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const USStateMap = ({ data, colorScale, tooltipFormatter, title, subtitle, tooltipContent }) => {
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const getMinMax = () => {
    const values = Object.values(data)
      .map(d => d.value)
      .filter(v => v !== null && v !== undefined);

    if (values.length === 0) return { min: 0, max: 100 };

    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  };

  const { min, max } = getMinMax();

  const getColor = (geoId) => {
    const stateData = data[geoId];
    if (!stateData) return '#0d1117';

    const value = stateData.value;
    if (value === null || value === undefined) return '#0d1117';

    const range = max - min;
    const normalizedValue = range > 0 ? (value - min) / range : 0;
    const intensity = Math.pow(Math.min(Math.max(normalizedValue, 0), 1), 0.7);

    if (colorScale === 'engagement' || colorScale === 'diverging') {
      const r = Math.round(10 + (intensity * 10));
      const g = Math.round(26 + (intensity * 229));
      const b = Math.round(31 + (intensity * 224));
      return `rgb(${r}, ${g}, ${b})`;
    } else if (colorScale === 'penetration') {
      const r = Math.round(5 + (intensity * 15));
      const g = Math.round(40 + (intensity * 215));
      const b = Math.round(50 + (intensity * 180));
      return `rgb(${r}, ${g}, ${b})`;
    } else if (colorScale === 'opportunity') {
      if (intensity < 0.33) {
        const subIntensity = intensity / 0.33;
        return `rgb(10, ${Math.round(200 + subIntensity * 55)}, 80)`;
      } else if (intensity < 0.67) {
        const subIntensity = (intensity - 0.33) / 0.34;
        return `rgb(${Math.round(180 + subIntensity * 75)}, ${Math.round(220 - subIntensity * 80)}, 50)`;
      } else {
        const subIntensity = (intensity - 0.67) / 0.33;
        return `rgb(255, ${Math.round(140 - subIntensity * 80)}, ${Math.round(50 - subIntensity * 30)})`;
      }
    } else {
      const r = Math.round(10 + (intensity * 10));
      const g = Math.round(26 + (intensity * 229));
      const b = Math.round(31 + (intensity * 224));
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '350px',
        background: 'var(--color-bg-elevated, #222224)',
        borderRadius: '8px',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
      onMouseMove={handleMouseMove}
    >
      {title && <h4 style={{ color: '#fff', marginBottom: '4px', fontFamily: 'Lora, serif', fontSize: '14px' }}>{title}</h4>}
      {subtitle && <p style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>{subtitle}</p>}

      <div style={{ width: '100%', height: 'calc(100% - 40px)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 800
          }}
          width={800}
          height={500}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '100%'
          }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateId = geo.properties.name;
                const stateData = data[stateId];

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(stateId)}
                    stroke="#333"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: '#0ff', outline: 'none', cursor: 'pointer' },
                      pressed: { outline: 'none' }
                    }}
                    onMouseEnter={() => setHoveredState({ id: stateId, data: stateData })}
                    onMouseLeave={() => setHoveredState(null)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {hoveredState && hoveredState.data && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid #0ff',
            borderRadius: '6px',
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 1000,
            minWidth: '150px',
            transform: 'translateY(-100%)'
          }}
        >
          <div style={{ color: '#0ff', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
            {hoveredState.id}
          </div>
          {tooltipContent ? (
            tooltipContent(hoveredState.id, hoveredState.data)
          ) : (
            <div style={{ color: '#fff', fontSize: '13px' }}>
              {hoveredState.data.label || `Count: ${hoveredState.data.value?.toLocaleString()}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default USStateMap;