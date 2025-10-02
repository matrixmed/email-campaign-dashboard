import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import MetricCard from './MetricCard';
import CostComparisonCard from './CostComparisonCard';
import ComponentSidebar from './ComponentSidebar';
import useDashboardData from './hooks/useDashboardData';
import DraggableImage from './template/DraggableImage';
import TableComponent from './TableComponent';
import TitleComponent from './TitleComponent';
import GroupComponent from './template/GroupComponent';
import SpecialtyKPIStrips from './SpecialtyKPIStrips';
import { useDragDrop } from './hooks/useDragDrop';
import { exportDashboard } from './utils/exportUtils';
import { calculateAlignmentGuides, AlignmentGuides } from './template/AlignmentGuides';
import { createGroup, ungroupComponents, getComponentsInRect, SelectionBox, MultiSelectToolbar } from './template/ComponentGrouping';
import TemplateSelectionModal from './TemplateSelectionModal';
import { generateTemplate } from './template/TemplateLibrary';
import { getThemeLogo, getMetricValue, getThemeColors, TABLE_TYPES, TABLE_DEFINITIONS, getSmartTableSelection } from './template/LayoutTemplates';

const DashboardCanvasContent = () => {
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedMultiCampaigns, setSelectedMultiCampaigns] = useState([]);
  const [cards, setCards] = useState([]);
  const [deletedCards, setDeletedCards] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [specialtyMergeMode, setSpecialtyMergeMode] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [budgetedCost, setBudgetedCost] = useState(10.00);
  const [actualCost, setActualCost] = useState(5.00);
  const [costComparisonMode, setCostComparisonMode] = useState('none');
  const [showPatientImpact, setShowPatientImpact] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('matrix');
  const [userModifications, setUserModifications] = useState(new Map());
  const [userEdits, setUserEdits] = useState(() => {
    const saved = localStorage.getItem('dashboard-user-edits');
    return saved ? JSON.parse(saved) : {};
  });
  const [deletedCardIds, setDeletedCardIds] = useState(new Set());
  
  // Table selection state
  const [selectedTableTypes, setSelectedTableTypes] = useState({
    table1: TABLE_TYPES.ONLINE_JOURNAL,
    table2: TABLE_TYPES.VIDEO_METRICS, 
    table3: TABLE_TYPES.SOCIAL_MEDIA
  });
  const canvasRef = useRef(null);

  const {
    campaigns,
    loading,
    error,
    getAvailableMetrics,
    getGeographicData,
    getAuthorityMetrics
  } = useDashboardData();
  
  const handleBudgetedCostChange = useCallback((value) => {
    setBudgetedCost(value);
  }, []);
  
  const handleActualCostChange = useCallback((value) => {
    setActualCost(value);
  }, []);

  const preserveEdit = useCallback((componentId, editData) => {
    setUserEdits(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        ...editData,
        timestamp: Date.now()
      }
    }));
  }, []);
  
  const applyPreservedEdits = useCallback((components) => {
    return components.map(component => {
      const edits = userEdits[component.id];
      if (edits) {
        const updatedComponent = {
          ...component,
          title: edits.title !== undefined ? edits.title : component.title,
          value: edits.value !== undefined ? edits.value : component.value,
          subtitle: edits.subtitle !== undefined ? edits.subtitle : component.subtitle
        };
        
        // Handle table data preservation
        if (edits.config?.customData) {
          updatedComponent.config = {
            ...component.config,
            customData: edits.config.customData
          };
        } else if (edits.data) {
          // Legacy support for old data format
          updatedComponent.config = {
            ...component.config,
            customData: edits.data
          };
        }
        
        return updatedComponent;
      }
      return component;
    });
  }, [userEdits]);

  useEffect(() => {
    localStorage.setItem('dashboard-user-edits', JSON.stringify(userEdits));
  }, [userEdits]);

  // Template regeneration should only happen for specific triggers, not card edits
  const [lastRegenerationTrigger, setLastRegenerationTrigger] = useState('');

  useEffect(() => {
    const triggerKey = `${specialtyMergeMode}-${costComparisonMode}-${showPatientImpact}-${currentTheme}-${selectedCampaign?.campaign_name || ''}-${selectedMultiCampaigns?.length || 0}-${currentTemplate?.id || ''}-${JSON.stringify(selectedTableTypes)}`;
    
    
    // Only regenerate if this is a new trigger, not just a card edit
    if (triggerKey !== lastRegenerationTrigger && cards.length > 0 && currentTemplate) {
      let templateConfig;
      
      if (selectedCampaign) {
        templateConfig = {
          template: currentTemplate,
          campaigns: [selectedCampaign],
          theme: currentTheme,
          type: 'single',
          mergeSubspecialties: specialtyMergeMode,
          costComparisonMode: costComparisonMode,
          showPatientImpact: showPatientImpact,
          selectedTableTypes: selectedTableTypes
        };
      } else if (selectedMultiCampaigns && selectedMultiCampaigns.length > 0) {
        templateConfig = {
          template: currentTemplate,
          campaigns: selectedMultiCampaigns,
          theme: currentTheme,
          type: 'multi',
          mergeSubspecialties: specialtyMergeMode,
          costComparisonMode: costComparisonMode,
          showPatientImpact: showPatientImpact,
          selectedTableTypes: selectedTableTypes
        };
      }
      
      if (templateConfig) {
        try {
          // Get existing custom components BEFORE regeneration
          const existingCards = [...cards];
          
          // Identify custom components by ID pattern (section property gets lost during card operations)
          const isCustomComponent = (comp) => {
            return (comp.id.startsWith('table-') || 
                    comp.id.startsWith('chart-') || 
                    comp.id.startsWith('custom-') ||
                    comp.id.startsWith('authority-') ||
                    comp.id.startsWith('geographic-')) && 
                   !deletedCardIds.has(comp.id);
          };
          
          const customComponents = existingCards.filter(isCustomComponent);
          
          // Apply current theme to custom components
          const themeColors = getThemeColors(currentTheme);
          const themedCustomComponents = customComponents.map(comp => ({
            ...comp,
            style: {
              ...comp.style,
              background: themeColors.cardGradient || '#ffffff',
              border: `1px solid ${themeColors.border || '#e2e8f0'}`,
              color: themeColors.text || '#1f2937'
            }
          }));
          
          const regeneratedComponents = generateTemplate(templateConfig);
          const preservedComponents = applyPreservedEdits(regeneratedComponents);
          
          // Preserve user deletions - filter out deleted components from template
          const filteredComponents = preservedComponents.filter(comp => 
            !deletedCardIds.has(comp.id)
          );
          
          // Only preserve positions if the template layout hasn't fundamentally changed
          // (i.e., only theme changes, not structural changes like patient impact/cost)
          const structuralChangeKeys = ['costComparisonMode', 'showPatientImpact'];
          const currentStructuralState = `${costComparisonMode}-${showPatientImpact}`;
          const lastStructuralState = lastRegenerationTrigger.split('-').slice(1, 3).join('-');
          const isStructuralChange = currentStructuralState !== lastStructuralState;
          
          const updatedCards = filteredComponents.map(newComp => {
            const existingComp = existingCards.find(existing => existing.id === newComp.id);
            if (existingComp && !isStructuralChange) {
              // Only preserve position for theme-only changes, not structural changes
              return {
                ...newComp,
                position: existingComp.position, // Preserve position
                // Update only theme-related style properties
                style: {
                  ...existingComp.style,
                  background: newComp.style?.background || existingComp.style?.background,
                  color: newComp.style?.color || existingComp.style?.color,
                  border: newComp.style?.border || existingComp.style?.border
                }
              };
            }
            return newComp; // Use new position for structural changes or new components
          });
          
          const finalCards = [...updatedCards, ...themedCustomComponents];
          setCards(finalCards);
          setLastRegenerationTrigger(triggerKey);
        } catch (error) {
          console.error('Template regeneration failed:', error);
        }
      }
    }
  }, [specialtyMergeMode, costComparisonMode, showPatientImpact, currentTheme, selectedCampaign, selectedMultiCampaigns, currentTemplate, applyPreservedEdits, deletedCardIds, lastRegenerationTrigger, selectedTableTypes]);

  const handleCardEdit = useCallback((cardId, newData) => {
    // Normalize table data format - convert data to config.customData if needed
    const normalizedData = { ...newData };
    if (newData.data && !newData.config) {
      normalizedData.config = { customData: newData.data };
      delete normalizedData.data;
    } else if (newData.data && newData.config) {
      normalizedData.config = { ...newData.config, customData: newData.data };
      delete normalizedData.data;
    }
    
    preserveEdit(cardId, normalizedData);
    
    const modifications = userModifications.get(cardId) || new Set();
    
    if (normalizedData.title !== undefined) modifications.add('title');
    if (normalizedData.value !== undefined) modifications.add('value');
    if (normalizedData.subtitle !== undefined) modifications.add('subtitle');
    if (normalizedData.config?.customData !== undefined || newData.data !== undefined) modifications.add('tableData');
    
    setUserModifications(prev => new Map(prev.set(cardId, modifications)));
    
    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, ...normalizedData } : card
    ));
  }, [preserveEdit, userModifications]);

  const clearAllEdits = () => {
    setUserEdits({});
    localStorage.removeItem('dashboard-user-edits');
  };

  const handleGlobalClick = useCallback((e) => {
    const isClickOutsideCards = !e.target.closest('.dashboard-canvas-card') &&
                               !e.target.closest('.dashboard-canvas-table') &&
                               !e.target.closest('.dashboard-canvas-title') &&
                               !e.target.closest('.cost-comparison-card') &&
                               !e.target.closest('.specialty-strips') &&
                               !e.target.closest('.draggable-image') &&
                               !e.target.closest('.dc-sidebar') &&
                               !e.target.closest('.template-modal') &&
                               !e.target.closest('button') &&
                               !e.target.closest('input') &&
                               !e.target.closest('select') &&
                               !e.target.closest('td') &&
                               !e.target.closest('th');
  
  
    if (isClickOutsideCards && !isEditing) {
      setSelectedElement(null);
      setSelectedComponents([]);
    }
  }, [isEditing]);

  const handleGlobalKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setSelectedElement(null);
      setSelectedComponents([]);
      setIsEditing(null);
    }
  }, []);
  
  useEffect(() => {
    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleGlobalClick, handleGlobalKeyDown]);

  const handleCardDelete = useCallback((cardId) => {
    const cardToDelete = cards.find(card => card.id === cardId);
    if (cardToDelete) {
      setDeletedCards(prev => [...prev, cardToDelete]);
      setDeletedCardIds(prev => new Set([...prev, cardId])); // Track deleted IDs permanently
      setCards(prev => prev.filter(card => card.id !== cardId));
    }
  }, [cards]);

  const handleCardMove = useCallback((cardId, newPosition) => {
    const draggedCard = cards.find(card => card.id === cardId);
    if (!draggedCard) return;
  
    const draggedComponent = {
      ...draggedCard,
      position: { ...draggedCard.position, ...newPosition }
    };
    
    const { guides, snapPosition } = calculateAlignmentGuides(
      draggedComponent, 
      cards,
      { width: 1024, height: 576 }
    );
    
    setAlignmentGuides(guides);
    
    const finalPosition = snapPosition ? 
      { ...newPosition, ...snapPosition } : 
      newPosition;
  
    setCards(prev => prev.map(card => 
      card.id === cardId ? { 
        ...card, 
        position: { ...card.position, ...finalPosition }
      } : card
    ));
  }, [cards]);

  const handleCardResize = useCallback((cardId, newSize) => {
    setCards(prev => prev.map(card => 
      card.id === cardId ? { 
        ...card, 
        position: { ...card.position, ...newSize }
      } : card
    ));
  }, []);

  const handleTemplateSelection = useCallback((templateConfig) => {
    clearAllEdits();

    try {
      const generatedComponents = generateTemplate({
        ...templateConfig,
        mergeSubspecialties: specialtyMergeMode,
        costComparisonMode: costComparisonMode,
        showPatientImpact: showPatientImpact,
        selectedTableTypes: selectedTableTypes
      });
      setCards(generatedComponents);
      setCurrentTheme(templateConfig.theme);
      setCurrentTemplate(templateConfig.template);
      setDeletedCards([]);
      setDeletedCardIds(new Set()); // Reset deleted card tracking
      setUploadedImages([]);
      
      if (templateConfig.type === 'single' && templateConfig.campaigns.length > 0) {
        setSelectedCampaign(templateConfig.campaigns[0]);
        setSelectedMultiCampaigns([]);
      } else if (templateConfig.type === 'multi' && templateConfig.campaigns.length > 0) {
        setSelectedCampaign(null);
        setSelectedMultiCampaigns(templateConfig.campaigns);
      }
    } catch (error) {
      console.error('Template selection failed:', error);
    }
  }, [specialtyMergeMode, costComparisonMode, showPatientImpact, selectedTableTypes]);

  const handleThemeChange = useCallback((newTheme) => {
    setCurrentTheme(newTheme);
    // Template regeneration useEffect will handle updating the cards with new theme
  }, []);

  const handleCampaignChange = useCallback((newCampaign) => {
    setSelectedCampaign(newCampaign);
    
    // Smart table selection based on campaign title
    if (newCampaign?.campaign_name) {
      const smartOrder = getSmartTableSelection(newCampaign.campaign_name);
      setSelectedTableTypes({
        table1: smartOrder[0] || TABLE_TYPES.ONLINE_JOURNAL,
        table2: smartOrder[1] || TABLE_TYPES.VIDEO_METRICS,
        table3: smartOrder[2] || TABLE_TYPES.SOCIAL_MEDIA
      });
    }
    
    if (newCampaign) {
      setCards(prev => prev.map(card => {
        if (card.type === 'metric' && card.originalKey) {
          return { ...card, value: getMetricValue(newCampaign, card.originalKey) };
        }
        return card;
      }));
    }
  }, []);

  const handleTableTypeChange = useCallback((tablePosition, newType) => {
    setSelectedTableTypes(prev => ({
      ...prev,
      [tablePosition]: newType
    }));
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('dashboard-canvas-background')) {
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedComponents([]);
        setSelectedElement(null);
      }
      
      const rect = e.currentTarget.getBoundingClientRect();
      setSelectionStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsMultiSelecting(true);
    }
  }, []);
  
  const handleCanvasMouseMove = useCallback((e) => {
    if (isMultiSelecting && selectionStart) {
      const rect = e.currentTarget.getBoundingClientRect();
      setSelectionEnd({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, [isMultiSelecting, selectionStart]);
  
  const handleCanvasMouseUp = useCallback(() => {
    if (isMultiSelecting && selectionStart && selectionEnd) {
      const selectionRect = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        width: Math.abs(selectionEnd.x - selectionStart.x),
        height: Math.abs(selectionEnd.y - selectionStart.y)
      };
      
      const selectedCards = getComponentsInRect(selectionRect, cards);
      setSelectedComponents(selectedCards);
    }
    
    setIsMultiSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setAlignmentGuides([]);
  }, [isMultiSelecting, selectionStart, selectionEnd, cards]);

  const handleGroupComponents = useCallback(() => {
    if (selectedComponents.length < 2) return;
    
    const group = createGroup(selectedComponents);
    if (!group) return;
    
    setCards(prev => [
      ...prev.filter(card => !selectedComponents.find(sc => sc.id === card.id)),
      group
    ]);
    
    setSelectedComponents([]);
  }, [selectedComponents]);
  
  const handleUngroupComponents = useCallback(() => {
    const groupsToUngroup = selectedComponents.filter(comp => comp.type === 'group');
    if (groupsToUngroup.length === 0) return;
    
    let newCards = [...cards];
    
    groupsToUngroup.forEach(group => {
      const ungroupedComponents = ungroupComponents(group);
      newCards = newCards.filter(card => card.id !== group.id);
      newCards = [...newCards, ...ungroupedComponents];
    });
    
    setCards(newCards);
    setSelectedComponents([]);
  }, [selectedComponents, cards]);
  
  const handleDuplicateComponents = useCallback(() => {
    const duplicates = selectedComponents.map(comp => ({
      ...comp,
      id: `${comp.id}-copy-${Date.now()}`,
      position: {
        ...comp.position,
        x: comp.position.x + 20,
        y: comp.position.y + 20
      }
    }));
    
    setCards(prev => [...prev, ...duplicates]);
    setSelectedComponents(duplicates);
  }, [selectedComponents]);
  
  const handleDeleteSelected = useCallback(() => {
    setCards(prev => prev.filter(card => 
      !selectedComponents.find(sc => sc.id === card.id)
    ));
    setSelectedComponents([]);
  }, [selectedComponents]);
  
  const handleComponentClick = useCallback((componentId, e) => {
    e?.stopPropagation?.();
    
    if (e?.ctrlKey || e?.metaKey) {
      setSelectedComponents(prev => {
        const exists = prev.find(comp => comp.id === componentId);
        if (exists) {
          return prev.filter(comp => comp.id !== componentId);
        } else {
          const component = cards.find(card => card.id === componentId);
          return component ? [...prev, component] : prev;
        }
      });
    } else {
      setSelectedElement(componentId);
      setSelectedComponents([]);
    }
  }, [cards]);

  const handleCostModeChange = useCallback((mode) => {
    setCostComparisonMode(mode);
  }, []);

  const handlePatientImpactToggle = useCallback(() => {
    setShowPatientImpact(!showPatientImpact);
  }, [showPatientImpact]);

  const handleAddCard = useCallback((cardType, customData = {}) => {
    const themeColors = getThemeColors(currentTheme);
    const newCard = {
      id: `custom-${Date.now()}`,
      type: cardType,
      title: customData.title || 'New Card',
      value: customData.value || '0',
      subtitle: customData.subtitle || '',
      position: { 
        x: 100 + (cards.length * 20), 
        y: 100 + (cards.length * 20), 
        width: 200, 
        height: 100 
      },
      style: {
        background: themeColors.cardGradient || '#ffffff',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '8px',
        color: themeColors.text || '#1f2937'
      },
      section: 'custom'
    };
    
    setCards(prev => [...prev, newCard]);
  }, [cards.length, currentTheme]);

  const handleAddMetric = useCallback((item) => {
    if (item.id && item.type && item.position) {
      setCards(prev => [...prev, item]);
      return;
    }

    if (item.type === 'table') {
      const themeColors = getThemeColors(currentTheme);
      const newTable = {
        id: `table-${Date.now()}`,
        type: 'table',
        title: item.config.title,
        config: item.config,
        position: { 
          x: 100 + (cards.length * 20), 
          y: 100 + (cards.length * 20), 
          width: 400, 
          height: 300 
        },
        style: {
          background: themeColors.cardGradient || '#ffffff',
          border: `1px solid ${themeColors.border || '#e2e8f0'}`,
          borderRadius: '8px',
          color: themeColors.text || '#1f2937'
        },
        section: 'custom'
      };
      setCards(prev => [...prev, newTable]);
    } else if (item.type === 'chart') {
      const themeColors = getThemeColors(currentTheme);
      const newChart = {
        id: `chart-${Date.now()}`,
        type: 'chart',
        title: item.config.title,
        config: item.config,
        position: { 
          x: 100 + (cards.length * 20), 
          y: 100 + (cards.length * 20), 
          width: 350, 
          height: 250 
        },
        style: {
          background: themeColors.cardGradient || '#ffffff',
          border: `1px solid ${themeColors.border || '#e2e8f0'}`,
          borderRadius: '8px',
          color: themeColors.text || '#1f2937'
        },
        section: 'custom'
      };
      setCards(prev => [...prev, newChart]);
    } else if (item.category === 'geographic') {
      const geoData = getGeographicData(selectedCampaign);
      geoData.forEach((region, index) => {
        handleAddCard('metric', {
          title: `${region.region} Region`,
          value: `${region.engagement.toFixed(1)}%`,
          subtitle: `${region.volume.toLocaleString()} professionals`
        });
      });
    } else if (item.category === 'authority') {
      const authorityData = getAuthorityMetrics(selectedCampaign);
      const degrees = ['MD', 'DO', 'NP', 'PA'];
      degrees.forEach(degree => {
        const key = `${degree.toLowerCase()}Engagement`;
        if (authorityData[key] > 0) {
          handleAddCard('metric', {
            title: `${degree} Engagement`,
            value: `${authorityData[key].toFixed(1)}%`,
            subtitle: 'Professional engagement rate'
          });
        }
      });
    } else {
      handleAddCard('metric', {
        title: item.name,
        value: item.value,
        subtitle: item.category
      });
    }
  }, [selectedCampaign, getGeographicData, getAuthorityMetrics, handleAddCard, cards.length]);

  const handleRestoreCard = useCallback((card) => {
    setCards(prev => [...prev, card]);
    setDeletedCards(prev => prev.filter(c => c.id !== card.id));
    setDeletedCardIds(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(card.id);
      return newSet;
    });
  }, []);

  const handleImageUpload = useCallback((imageData, position = null) => {
    const newImage = {
      id: `image-${Date.now()}`,
      src: imageData,
      position: position || { 
        x: 800, 
        y: 150, 
        width: 300, 
        height: 200 
      }
    };
    setUploadedImages(prev => [...prev, newImage]);
  }, []);

  const handleImageMove = useCallback((imageId, newPosition) => {
    setUploadedImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, position: { ...img.position, ...newPosition } } : img
    ));
  }, []);

  const handleImageResize = useCallback((imageId, newSize) => {
    setUploadedImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, position: { ...img.position, ...newSize } } : img
    ));
  }, []);

  const handleImageDelete = useCallback((imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              handleImageUpload(event.target.result);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleImageUpload]);

  const handleExportScreenshot = useCallback(async () => {
    if (!canvasRef.current) return;
    
    let dashboardName;
    if (selectedCampaign) {
      dashboardName = selectedCampaign.campaign_name;
    } else if (selectedMultiCampaigns && selectedMultiCampaigns.length > 0) {
      const campaignNames = selectedMultiCampaigns.map(c => c.campaign_name).slice(0, 2).join(' + ');
      dashboardName = selectedMultiCampaigns.length > 2 ? 
        `${campaignNames} + ${selectedMultiCampaigns.length - 2} more` : campaignNames;
    } else {
      return;
    }
    
    const result = await exportDashboard(canvasRef, dashboardName);
    
    if (!result.success) {
    }
  }, [selectedCampaign, selectedMultiCampaigns]);

  const { drop, isOver, canDrop, getDropZoneStyles, createDraggableMetric } = useDragDrop(
    cards,
    handleAddMetric,
    handleCardMove,
    () => true,
    (metric) => metric
  );

  const availableMetrics = selectedCampaign ? getAvailableMetrics(selectedCampaign) : [];

  if (loading) {
    return (
      <div style={{
        minHeight: '92vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Readex Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: 'white',
        borderRadius: '8px',
        fontSize: '18px'
      }}>
        Loading campaigns...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '92vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Readex Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: 'white',
        borderRadius: '8px',
        fontSize: '18px'
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '92vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 0,
      margin: 0,
      fontFamily: "'Readex Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        margin: '20px 20px 16px 20px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        zIndex: 100
      }}>
        <button 
          onClick={() => setShowTemplateModal(true)}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
          }}
        >
          Generate
        </button>
        
        <button 
          onClick={handleExportScreenshot}
          disabled={!selectedCampaign && !(selectedMultiCampaigns && selectedMultiCampaigns.length > 0)}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            cursor: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            background: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#e2e8f0',
            color: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? 'white' : '#94a3b8',
            boxShadow: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none'
          }}
        >
          Export
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        <div style={{
          position: 'relative',
          width: sidebarOpen ? '320px' : '0px',
          transition: 'width 0.3s ease',
          overflow: 'hidden'
        }}>
          <ComponentSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            campaigns={campaigns}
            selectedCampaign={selectedCampaign}
            currentTheme={currentTheme}
            costComparisonMode={costComparisonMode}
            showPatientImpact={showPatientImpact}
            specialtyMergeMode={specialtyMergeMode}
            onThemeChange={handleThemeChange}
            onCostModeChange={handleCostModeChange}
            onPatientImpactToggle={handlePatientImpactToggle}
            onCampaignChange={handleCampaignChange}
            onToggleSpecialtyMerge={() => setSpecialtyMergeMode(!specialtyMergeMode)}
            onAddComponent={handleAddMetric}
            budgetedCost={budgetedCost}
            actualCost={actualCost}
            onBudgetedCostChange={handleBudgetedCostChange}
            onActualCostChange={handleActualCostChange}
            deletedCards={deletedCards}
            onRestoreCard={handleRestoreCard}
            currentTemplate={currentTemplate?.id || 'single'}
            selectedTableTypes={selectedTableTypes}
            onTableTypeChange={handleTableTypeChange}
          />
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            left: sidebarOpen ? '320px' : '0px',
            top: '40%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '0 8px 8px 0',
            padding: '12px 8px',
            cursor: 'pointer',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            fontSize: '16px',
            color: '#667eea'
          }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 20px 20px 20px'
        }}>
          <div 
            ref={drop}
            style={{
              position: 'relative',
              width: '1024px',
              height: '576px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(8px)',
              cursor: isMultiSelecting ? 'crosshair' : 'default',
              ...getDropZoneStyles()
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
          >
            <div 
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative'
              }}
            >
              {selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0) ? (
                <>
                <div style={{
                    position: 'absolute',
                    top: '30px',
                    right: '25px',
                    zIndex: 10
                  }}>
                    <img 
                      src={getThemeLogo(currentTheme)} 
                      alt="Logo"
                      style={{
                        height: '40px',
                        width: 'auto'
                      }}
                    />
                  </div>

                  {cards.map(card => {
                    const isComponentSelected = selectedComponents.some(comp => comp.id === card.id);
                    
                    if (card.type === 'group') {
                      return (
                        <GroupComponent
                          key={card.id}
                          {...card}
                          currentTheme={currentTheme}
                          onEdit={handleCardEdit}
                          onDelete={handleCardDelete}
                          onMove={handleCardMove}
                          onResize={handleCardResize}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          isSelected={selectedElement === card.id || isComponentSelected}
                          onSelect={() => handleComponentClick(card.id, { ctrlKey: false })}
                          campaign={selectedCampaign}
                        />
                      );
                    }
                    
                    if (card.type === 'title') {
                      return (
                        <TitleComponent
                          key={card.id}
                          {...card}
                          currentTheme={currentTheme}
                          onEdit={handleCardEdit}
                          onDelete={handleCardDelete}
                          onMove={handleCardMove}
                          onResize={handleCardResize}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          isSelected={selectedElement === card.id || isComponentSelected}
                          onSelect={(e) => handleComponentClick(card.id, e || {})}
                        />
                      );
                    }
                    
                    if (card.type === 'table') {
                      return (
                        <TableComponent
                          key={card.id}
                          {...card}
                          currentTheme={currentTheme}
                          onEdit={handleCardEdit}
                          onDelete={handleCardDelete}
                          onMove={handleCardMove}
                          onResize={handleCardResize}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          isSelected={selectedElement === card.id || isComponentSelected}
                          onSelect={(e) => handleComponentClick(card.id, e || {})}
                          campaign={selectedCampaign}
                        />
                      );
                    }

                    if (card.type === 'cost-comparison') {
                      return (
                        <CostComparisonCard
                          key={card.id}
                          id={card.id}
                          mode={costComparisonMode}
                          contractedCost={budgetedCost}
                          currentTheme={currentTheme}
                          actualCost={actualCost}
                          position={card.position}
                          style={card.style}
                          theme={currentTheme}
                          onEdit={handleCardEdit}
                          onDelete={handleCardDelete}
                          onResize={handleCardResize}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          isSelected={selectedElement === card.id || isComponentSelected}
                          onSelect={(e) => handleComponentClick(card.id, e || {})}
                        />
                      );
                    }

                    if (card.type === 'specialty-strips') {
                      return (
                        <SpecialtyKPIStrips
                          key={card.id}
                          {...card}
                          currentTheme={currentTheme}
                          onEdit={handleCardEdit}
                          onDelete={handleCardDelete}
                          onMove={handleCardMove}
                          onSelect={(e) => handleComponentClick(card.id, e || {})}
                          isSelected={selectedElement === card.id || isComponentSelected}
                        />
                      );
                    }

                    // Skip rendering image types here - they're rendered separately below
                    if (card.type === 'image') {
                      return null;
                    }

                    return (
                      <MetricCard
                        key={card.id}
                        {...card}
                        currentTheme={currentTheme}
                        onEdit={handleCardEdit}
                        onDelete={handleCardDelete}
                        onMove={handleCardMove}
                        onResize={handleCardResize}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        isSelected={selectedElement === card.id || isComponentSelected}
                        onSelect={(e) => handleComponentClick(card.id, e || {})}
                      />
                    );
                  })}

                  {uploadedImages.map(image => (
                    <DraggableImage
                      key={image.id}
                      image={image}
                      onMove={handleImageMove}
                      onResize={handleImageResize}
                      onDelete={handleImageDelete}
                      isSelected={selectedElement === image.id}
                      onSelect={() => setSelectedElement(image.id)}
                    />
                  ))}

                  {/* Render logo images from template */}
                  {cards.filter(card => card.type === 'image').map(image => (
                    <img
                      key={image.id}
                      src={image.src}
                      alt="Matrix Logo"
                      style={{
                        position: 'absolute',
                        left: `${image.position.x}px`,
                        top: `${image.position.y}px`,
                        width: `${image.position.width}px`,
                        height: `${image.position.height}px`,
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        zIndex: 5
                      }}
                    />
                  ))}

                  <AlignmentGuides guides={alignmentGuides} />

                  <SelectionBox 
                    isVisible={isMultiSelecting}
                    startPoint={selectionStart}
                    endPoint={selectionEnd}
                  />

                  <MultiSelectToolbar
                    selectedComponents={selectedComponents}
                    onGroup={handleGroupComponents}
                    onUngroup={handleUngroupComponents}
                    onDelete={handleDeleteSelected}
                    onDuplicate={handleDuplicateComponents}
                  />
                </>
              ) : (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '16px',
                  lineHeight: '1.6'
                }}>
                  <h2 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Create Your Dashboard</h2>
                  <p style={{ margin: '8px 0', opacity: 0.8 }}>Click "Generate" to get started with templates</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        campaigns={campaigns}
        onTemplateSelect={handleTemplateSelection}
      />
    </div>
  );
};

const DashboardCanvas = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <DashboardCanvasContent />
    </DndProvider>
  );
};

export default DashboardCanvas;