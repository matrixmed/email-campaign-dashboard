export const MATRIX_COLORS = {
  primary: '#575757',      // Matrix 
  primaryDark: '#a50001',  // Darker 
  secondary: '#003a6d',    // Matrix Blue Dark
  secondaryLight: '#0066cc', // Matrix Blue Light
  accent: '#00a0e6',       // Light Blue Accent
  
  // Neutrals
  white: '#ffffff',
  lightGray: '#f8f9fa',
  gray: '#6c757d',
  darkGray: '#2c3e50',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e2e8f0',
  
  // Status colors
  success: '#28a745',
  warning: '#ffc107',
  info: '#17a2b8',
  
  // Gradients
  primaryGradient: 'linear-gradient(135deg, #414141 0%, #585858 100%)',
  secondaryGradient: 'linear-gradient(135deg, #003a6d 0%, #0066cc 100%)',
  heroGradient: 'linear-gradient(135deg, #0066cc 0%, #003a6d 100%)',
  cardGradient: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
  specialtyGradient: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)'
};

// JCAD Color Scheme
export const JCAD_COLORS = {
  primary: '#00857a',      // Main Teal
  primaryDark: '#005954',  // Darker Teal
  secondary: '#007837',    // Green
  secondaryLight: '#5aa8a2', // Light Teal
  accent: '#00a0a0',       // Bright Teal Accent
  
  // Neutrals
  white: '#ffffff',
  lightGray: '#f8f9fa',
  gray: '#6c757d',
  darkGray: '#2c3e50',
  text: '#003735',         // Dark teal for text
  textSecondary: '#6c757d',
  border: '#b2dfdb',       // Light teal border
  surface: '#e1f4f3',      // Very light teal
  onSurface: '#003735',    // Dark teal for text
  
  // Status colors
  success: '#28a745',
  warning: '#ffc107',
  info: '#17a2b8',
  
  // Gradients
  primaryGradient: 'linear-gradient(135deg, #00857a 0%, #005954 100%)',
  secondaryGradient: 'linear-gradient(135deg, #007837 0%, #5aa8a2 100%)',
  heroGradient: 'linear-gradient(135deg, #5aa8a2 0%, #00857a 100%)',
  cardGradient: 'linear-gradient(135deg, #ffffff 0%, #e1f4f3 100%)',
  specialtyGradient: 'linear-gradient(135deg, #e1f4f3 0%, #f0fffe 100%)'
};

// NPPA Color Scheme
export const NPPA_COLORS = {
  primary: '#543378',      // Purple
  primaryDark: '#3d2558',  // Darker Purple
  secondary: '#008378',    // Teal
  secondaryLight: '#69727d', // Gray
  accent: '#00a5a5',       // Bright Teal
  
  // Neutrals
  white: '#ffffff',
  lightGray: '#f8f9fa',
  gray: '#6c757d',
  darkGray: '#2c3e50',
  text: '#2a1b3d',         // Dark purple for text
  textSecondary: '#6c757d',
  border: '#e6e0f0',       // Light purple border
  surface: '#f3f1f7',      // Very light purple
  onSurface: '#2a1b3d',    // Dark purple for text
  
  // Status colors
  success: '#28a745',
  warning: '#ffc107',
  info: '#17a2b8',
  
  // Gradients
  primaryGradient: 'linear-gradient(135deg, #543378 0%, #3d2558 100%)',
  secondaryGradient: 'linear-gradient(135deg, #008378 0%, #69727d 100%)',
  heroGradient: 'linear-gradient(135deg, #69727d 0%, #543378 100%)',
  cardGradient: 'linear-gradient(135deg, #ffffff 0%, #f3f1f7 100%)',
  specialtyGradient: 'linear-gradient(135deg, #f3f1f7 0%, #faf9fc 100%)'
};

// Theme configuration
export const THEMES = {
  MATRIX: 'matrix',
  JCAD: 'jcad',
  NPPA: 'nppa'
};

// Theme metadata for UI display
export const THEME_INFO = {
  [THEMES.MATRIX]: {
    name: 'Matrix',
    colors: ['#575757', '#003a6d', '#0066cc'],
    logo: 'matrix.png',
  },
  [THEMES.JCAD]: {
    name: 'JCAD',
    colors: ['#00857a', '#007837', '#5aa8a2'],
    logo: 'jcad.png',
  },
  [THEMES.NPPA]: {
    name: 'NPPA',
    colors: ['#543378', '#008378', '#69727d'],
    logo: 'nppa.png',
  }
};

// Get colors based on theme - FIXED TO ENSURE PROPER THEME APPLICATION
export const getThemeColors = (theme) => {
  switch (theme) {
    case THEMES.JCAD:
      return JCAD_COLORS;
    case THEMES.NPPA:
      return NPPA_COLORS;
    case THEMES.MATRIX:
    default:
      return MATRIX_COLORS;
  }
};

export const getThemeLogo = (theme) => {
  const themeInfo = THEME_INFO[theme];
  return `${process.env.PUBLIC_URL}/${themeInfo?.logo || 'matrix.png'}`;
};


export const getComponentStyle = ({ type, position, style = {}, theme }) => {
  const colors = getThemeColors(theme);
  
  const baseStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    borderRadius: '8px',
    padding: '16px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };
  
  const typeStyles = {
    hero: {
      background: colors.heroGradient,
      color: '#ffffff',
      boxShadow: `0 4px 16px ${colors.secondary}33`,
      border: 'none'
    },
    secondary: {
      background: colors.cardGradient,
      color: colors.secondary,
      border: `1px solid ${colors.border}`,
      borderTop: `4px solid ${colors.secondary}`
    },
    metric: {
      background: colors.cardGradient,
      color: colors.secondary,
      border: `1px solid ${colors.border}`,
      borderTop: `3px solid ${colors.secondary}`
    },
    specialty: {
      background: colors.specialtyGradient,
      color: colors.text,
      border: `1px solid ${colors.border}`,
    },
    table: {
      background: colors.cardGradient,
      color: colors.text,
      border: `1px solid ${colors.border}`
    },
    title: {
      background: 'transparent',
      color: colors.text,
      border: 'none'
    },
    'specialty-strips': {
      background: 'transparent',
      border: 'none'
    }
  };
  
  return {
    ...baseStyle,
    ...(typeStyles[type] || typeStyles.metric),
    ...style 
  };
};

// Typography scale for consistent sizing
export const TYPOGRAPHY_SCALE = {
  hero: {
    title: { size: 26, weight: 700, color: 'rgba(255, 255, 255, 0.9)' },
    value: { size: 48, weight: 800, color: '#ffffff' },
    subtitle: { size: 13, weight: 600, color: 'rgba(255, 255, 255, 0.9)' }
  },
  secondary: {
    title: { size: 11, weight: 700 },
    value: { size: 28, weight: 800 },
    subtitle: { size: 10, weight: 500 }
  },
  metric: {
    title: { size: 10, weight: 700 },
    value: { size: 20, weight: 800 },
    subtitle: { size: 9, weight: 500 }
  },
  specialty: {
    title: { size: 11, weight: 700 },
    value: { size: 24, weight: 800 },
    subtitle: { size: 9, weight: 500 }
  },
  table: {
    title: { size: 14, weight: 700 },
    header: { size: 11, weight: 600 },
    cell: { size: 10, weight: 500 }
  },
  title: {
    title: { size: 32, weight: 900 },
    subtitle: { size: 16, weight: 600 }
  }
};

// Get typography style based on component type and element
export const getTypographyStyle = (componentType, element, theme) => {
  const colors = getThemeColors(theme);
  const scale = TYPOGRAPHY_SCALE[componentType] || TYPOGRAPHY_SCALE.metric;
  const elementStyle = scale[element] || scale.title;
  
  // Apply theme-specific colors for text elements
  let textColor = elementStyle.color;
  if (!textColor || textColor === 'inherit') {
    if (componentType === 'hero') {
      textColor = '#ffffff';
    } else {
      textColor = colors.text;
    }
  }
  
  return {
    fontSize: `${elementStyle.size}px`,
    fontWeight: elementStyle.weight,
    color: textColor,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };
};

// Spacing constants
export const SPACING = {
  canvas: { padding: 24 },
  section: { marginBottom: 32 },
  card: { gap: 16, padding: 10 },
  grid: { snap: 8 },
  component: { minGap: 0 }
};

// Component size defaults
export const COMPONENT_SIZES = {
  hero: { width: 280, height: 120 },
  secondary: { width: 280, height: 120 },
  metric: { width: 140, height: 85 },
  specialty: { width: 200, height: 110 },
  table: { width: 420, height: 180 },
  chart: { width: 350, height: 250 },
  title: { width: 700, height: 60 },
  logo: { width: 150, height: 60 }
};

// Template types
export const TEMPLATE_TYPES = {
  SINGLE_NONE: 'single-none',
  SINGLE_ONE: 'single-one', 
  SINGLE_TWO: 'single-two',
  SINGLE_THREE: 'single-three',
  MULTI_NONE: 'multi-none',
  MULTI_ONE: 'multi-one',
  MULTI_TWO: 'multi-two',
  MULTI_THREE: 'multi-three'
};

// Available metrics from JSON data
export const AVAILABLE_METRICS = [
  'unique_open_rate',
  'total_open_rate', 
  'unique_click_rate',
  'total_click_rate',
  'delivery_rate',
  '1_hour_open_rate',
  '6_hour_open_rate', 
  '12_hour_open_rate',
  '24_hour_open_rate',
  'mobile_engagement_rate',
  'average_time_to_open_hours',
  'unique_opens',
  'total_opens',
  'unique_clicks', 
  'total_clicks',
  'delivered',
  'sent',
  'bounces',
  'cost_per_engaged_professional',
  'estimated_patient_impact'
];

// Table configuration types
export const TABLE_TYPES = {
  SOCIAL_MEDIA_METRICS: {
    title: 'Social Media Metrics',
    columns: 3,
    rows: 4,
    defaultData: [
      ['Platform', 'Reach', 'Engagement'],
      ['LinkedIn', '12.5K', '2.1%'],
      ['Facebook', '8.3K', '1.8%'],
      ['Twitter', '5.2K', '3.2%']
    ]
  },
  DIGITAL_METRICS: {
    title: 'Digital Metrics', 
    columns: 3,
    rows: 4,
    defaultData: [
      ['Metric', 'Value', 'Change'],
      ['Email CTR', '3.2%', '+0.4%'],
      ['Website Visits', '15.7K', '+12%'],
      ['Conversion Rate', '2.8%', '+0.2%']
    ]
  },
  VIDEO_METRICS: {
    title: 'Video Metrics',
    columns: 3, 
    rows: 4,
    defaultData: [
      ['Metric', 'Value', 'Benchmark'],
      ['Views', '22.1K', '18K avg'],
      ['Completion', '78%', '65% avg'],
      ['Engagement', '4.2min', '3.1min avg']
    ]
  },
  CUSTOM: {
    title: 'Custom Table',
    columns: 3,
    rows: 5,
    defaultData: [
      ['Header 1', 'Header 2', 'Header 3'],
      ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],
      ['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3'],
      ['Row 3 Col 1', 'Row 3 Col 2', 'Row 3 Col 3'],
      ['Row 4 Col 1', 'Row 4 Col 2', 'Row 4 Col 3']
    ]
  }
};

// Utility functions
export const getMetricValue = (campaign, metricKey) => {
  const keys = metricKey.split('.');
  let value = campaign;
  
  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return null;
    }
  }
  
  return value;
};

export const formatMetricValue = (value, type = 'number') => {
  if (value === null || value === undefined) return 'N/A';
  
  switch (type) {
    case 'percentage':
      return `${parseFloat(value).toFixed(1)}%`;
    case 'currency':
      return `$${parseFloat(value).toFixed(2)}`;
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : value;
    default:
      return value.toString();
  }
};

// Merge subspecialties (remove "- " suffixes and combine)
export const mergeSpecialties = (specialtyData) => {
  if (!specialtyData || typeof specialtyData !== 'object') return {};
  
  const merged = {};
  
  Object.entries(specialtyData).forEach(([name, data]) => {
    const baseName = name.split(' - ')[0];
    
    if (!merged[baseName]) {
      merged[baseName] = {
        audience_total: 0,
        unique_opens: 0,
        performance_delta: 0,
        count: 0
      };
    }
    
    merged[baseName].audience_total += data.audience_total || 0;
    merged[baseName].unique_opens += data.unique_opens || 0;
    merged[baseName].performance_delta += data.performance_delta || 0;
    merged[baseName].count += 1;
  });
  
  // Calculate averages
  Object.values(merged).forEach(data => {
    data.unique_open_rate = data.audience_total > 0 ? (data.unique_opens / data.audience_total) * 100 : 0;
    data.performance_delta = data.performance_delta / data.count;
  });
  
  return merged;
};

export default {
  MATRIX_COLORS,
  JCAD_COLORS,
  NPPA_COLORS,
  THEMES,
  THEME_INFO,
  getThemeColors,
  getThemeLogo,
  getComponentStyle,
  TYPOGRAPHY_SCALE,
  getTypographyStyle,
  SPACING,
  COMPONENT_SIZES,
  TEMPLATE_TYPES,
  AVAILABLE_METRICS,
  TABLE_TYPES,
  getMetricValue,
  formatMetricValue,
  mergeSpecialties
};