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
import StatHighlight from './StatHighlight';
import MetricStrip from './MetricStrip';
import ImageSlot from './ImageSlot';
import { useDragDrop } from './hooks/useDragDrop';
import { exportDashboard, exportAsPDF } from './utils/exportUtils';
import { calculateAlignmentGuides, AlignmentGuides } from './template/AlignmentGuides';
import { createGroup, ungroupComponents, getComponentsInRect, SelectionBox, MultiSelectToolbar } from './template/ComponentGrouping';
import TemplateSelectionModal from './TemplateSelectionModal';
import { generateTemplate } from './template/TemplateLibrary';
import { getThemeLogo, getMetricValue, getThemeColors, TABLE_TYPES, TABLE_DEFINITIONS, getSmartTableSelection } from './template/LayoutTemplates';
import { API_BASE_URL } from '../../config/api';
import '../../styles/DashboardBuilder.css';
import { sanitizeTitle, reformatCampaignTitle } from './template/TemplateLibrary';

const DashboardCanvasContent = () => {
  const loadInitialState = () => {
    const saved = localStorage.getItem('dashboard-canvas-state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const initialState = loadInitialState();

  const [selectedCampaign, setSelectedCampaign] = useState(initialState?.selectedCampaign || null);
  const [selectedMultiCampaigns, setSelectedMultiCampaigns] = useState(initialState?.selectedMultiCampaigns || []);
  const [cards, setCards] = useState(initialState?.cards || []);
  const [deletedCards, setDeletedCards] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState(initialState?.currentTemplate || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [specialtyMergeMode, setSpecialtyMergeMode] = useState(initialState?.specialtyMergeMode || false);
  const [uploadedImages, setUploadedImages] = useState(initialState?.uploadedImages || []);
  const [selectedElement, setSelectedElement] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [budgetedCost, setBudgetedCost] = useState(initialState?.budgetedCost || 10.00);
  const [actualCost, setActualCost] = useState(initialState?.actualCost || 5.00);
  const [costComparisonMode, setCostComparisonMode] = useState(initialState?.costComparisonMode || 'none');
  const [showTotalSends, setShowTotalSends] = useState(initialState?.showTotalSends || false);
  const [currentTheme, setCurrentTheme] = useState(initialState?.currentTheme || 'matrix');
  const [userModifications, setUserModifications] = useState(new Map());
  const [userEdits, setUserEdits] = useState(() => {
    const saved = localStorage.getItem('dashboard-user-edits');
    return saved ? JSON.parse(saved) : {};
  });
  const [deletedCardIds, setDeletedCardIds] = useState(new Set(initialState?.deletedCardIds || []));
  const [selectedRowInfo, setSelectedRowInfo] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [bannerImpressionsMode, setBannerImpressionsMode] = useState(initialState?.bannerImpressionsMode || false);
  const [thumbnailOverlayEnabled, setThumbnailOverlayEnabled] = useState(initialState?.thumbnailOverlayEnabled || false);
  const [socialPostOverlayEnabled, setSocialPostOverlayEnabled] = useState(initialState?.socialPostOverlayEnabled || false);
  const [showPharmaLogo, setShowPharmaLogo] = useState(initialState?.showPharmaLogo !== undefined ? initialState.showPharmaLogo : true);
  const [brandData, setBrandData] = useState([]);
  const [pharmaLogoSrc, setPharmaLogoSrc] = useState(null);
  const [showBottomLogo, setShowBottomLogo] = useState(initialState?.showBottomLogo !== undefined ? initialState.showBottomLogo : true);

  const [selectedTableTypes, setSelectedTableTypes] = useState(initialState?.selectedTableTypes || {
    table1: TABLE_TYPES.ONLINE_JOURNAL,
    table2: TABLE_TYPES.VIDEO_METRICS,
    table3: TABLE_TYPES.SOCIAL_MEDIA
  });
  const [isRestoring, setIsRestoring] = useState(false);
  const canvasRef = useRef(null);

  const {
    campaigns,
    loading,
    error,
    getAvailableMetrics,
    getGeographicData,
    getAuthorityMetrics
  } = useDashboardData();
  
  useEffect(() => {
    async function fetchBrandData() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/brand-management`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setBrandData(data);
        } else if (data.brands) {
          setBrandData(data.brands);
        }
      } catch (error) {
      }
    }
    fetchBrandData();
  }, []);

  useEffect(() => {
    if (brandData.length === 0 || !showPharmaLogo) {
      setPharmaLogoSrc(null);
      return;
    }

    const campaignName = selectedCampaign?.campaign_name ||
      (selectedMultiCampaigns && selectedMultiCampaigns.length > 0 ? selectedMultiCampaigns[0]?.campaign_name : null);
    if (!campaignName) {
      setPharmaLogoSrc(null);
      return;
    }

    const { pharmaLogoFile } = reformatCampaignTitle(campaignName, brandData);
    if (pharmaLogoFile) {
      setPharmaLogoSrc(`${process.env.PUBLIC_URL}/pharma/${pharmaLogoFile}`);
    } else {
      setPharmaLogoSrc(null);
    }
  }, [brandData, showPharmaLogo, selectedCampaign, selectedMultiCampaigns]);

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
        
        if (edits.config?.customData) {
          updatedComponent.config = {
            ...component.config,
            customData: edits.config.customData
          };
        } else if (edits.data) {
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

  useEffect(() => {
    const stateToSave = {
      cards,
      uploadedImages,
      selectedCampaign,
      selectedMultiCampaigns,
      currentTemplate,
      currentTheme,
      specialtyMergeMode,
      costComparisonMode,
      showTotalSends,
      budgetedCost,
      actualCost,
      selectedTableTypes,
      deletedCardIds: Array.from(deletedCardIds),
      bannerImpressionsMode,
      thumbnailOverlayEnabled,
      socialPostOverlayEnabled,
      showPharmaLogo,
      showBottomLogo
    };
    localStorage.setItem('dashboard-canvas-state', JSON.stringify(stateToSave));
  }, [cards, uploadedImages, selectedCampaign, selectedMultiCampaigns, currentTemplate, currentTheme, specialtyMergeMode, costComparisonMode, showTotalSends, budgetedCost, actualCost, selectedTableTypes, deletedCardIds, bannerImpressionsMode, thumbnailOverlayEnabled, socialPostOverlayEnabled, showPharmaLogo, showBottomLogo]);

  const [lastRegenerationTrigger, setLastRegenerationTrigger] = useState('');

  useEffect(() => {
    if (isRestoring) return;

    const triggerKey = `${specialtyMergeMode}-${costComparisonMode}-${showTotalSends}-${currentTheme}-${selectedCampaign?.campaign_name || ''}-${selectedMultiCampaigns?.length || 0}-${currentTemplate?.id || ''}-${JSON.stringify(selectedTableTypes)}-${bannerImpressionsMode}`;

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
          showTotalSends: showTotalSends,
          selectedTableTypes: selectedTableTypes,
          bannerImpressionsMode: bannerImpressionsMode
        };
      } else if (selectedMultiCampaigns && selectedMultiCampaigns.length > 0) {
        templateConfig = {
          template: currentTemplate,
          campaigns: selectedMultiCampaigns,
          theme: currentTheme,
          type: 'multi',
          mergeSubspecialties: specialtyMergeMode,
          costComparisonMode: costComparisonMode,
          showTotalSends: showTotalSends,
          selectedTableTypes: selectedTableTypes,
          bannerImpressionsMode: bannerImpressionsMode
        };
      }
      
      if (templateConfig) {
        try {
          const existingCards = [...cards];

          const isCustomComponent = (comp) => {
            if (comp.section === 'custom') {
              return !deletedCardIds.has(comp.id);
            }
            return (comp.id.startsWith('table-') ||
                    comp.id.startsWith('chart-') ||
                    comp.id.startsWith('custom-') ||
                    comp.id.startsWith('image-') ||
                    comp.id.startsWith('authority-') ||
                    comp.id.startsWith('geographic-')) &&
                   !deletedCardIds.has(comp.id) &&
                   comp.section !== 'template';
          };

          const customComponents = existingCards.filter(isCustomComponent);
          
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

          const regenTitleCard = regeneratedComponents.find(c => c.type === 'title');
          if (regenTitleCard && brandData.length > 0) {
            const campaignNameForLogo = templateConfig.campaigns[0]?.campaign_name || regenTitleCard.title;
            const { displayTitle } = reformatCampaignTitle(campaignNameForLogo, brandData);
            regenTitleCard.title = displayTitle;
          }

          const preservedComponents = applyPreservedEdits(regeneratedComponents);
          
          const filteredComponents = preservedComponents.filter(comp => 
            !deletedCardIds.has(comp.id)
          );
          
          const structuralChangeKeys = ['costComparisonMode', 'showTotalSends'];
          const currentStructuralState = `${costComparisonMode}-${showTotalSends}`;
          const lastStructuralState = lastRegenerationTrigger.split('-').slice(1, 3).join('-');
          const isStructuralChange = currentStructuralState !== lastStructuralState;
          
          const updatedCards = filteredComponents.map(newComp => {
            const existingComp = existingCards.find(existing => existing.id === newComp.id);
            if (existingComp && !isStructuralChange) {
              return {
                ...newComp,
                position: existingComp.position,
                style: {
                  ...existingComp.style,
                  background: newComp.style?.background || existingComp.style?.background,
                  color: newComp.style?.color || existingComp.style?.color,
                  border: newComp.style?.border || existingComp.style?.border
                }
              };
            }
            return newComp; 
          });
          
          const finalCards = [...updatedCards, ...themedCustomComponents];
          setCards(finalCards);
          setLastRegenerationTrigger(triggerKey);
        } catch (error) {
        }
      }
    }
  }, [specialtyMergeMode, costComparisonMode, showTotalSends, currentTheme, selectedCampaign, selectedMultiCampaigns, currentTemplate, applyPreservedEdits, deletedCardIds, lastRegenerationTrigger, selectedTableTypes, isRestoring, bannerImpressionsMode]);

  const handleCardEdit = useCallback((cardId, newData) => {
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
      setDeletedCardIds(prev => new Set([...prev, cardId]));
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
        showTotalSends: showTotalSends,
        selectedTableTypes: selectedTableTypes,
        bannerImpressionsMode: bannerImpressionsMode
      });
      const titleCard = generatedComponents.find(c => c.type === 'title');
      if (titleCard && brandData.length > 0) {
        const { displayTitle } = reformatCampaignTitle(titleCard.title, brandData);
        titleCard.title = displayTitle;
      }

      setCards(generatedComponents);
      setCurrentTheme(templateConfig.theme);
      setCurrentTemplate(templateConfig.template);
      setDeletedCards([]);
      setDeletedCardIds(new Set());

      const tplId = typeof templateConfig.template === 'string' ? templateConfig.template : templateConfig.template?.id;
      const isCreativeTemplate = tplId?.includes('hot-topics') || tplId?.includes('expert-perspectives');
      setShowPharmaLogo(isCreativeTemplate);

      setUploadedImages([]);
      
      if (templateConfig.type === 'single' && templateConfig.campaigns.length > 0) {
        setSelectedCampaign(templateConfig.campaigns[0]);
        setSelectedMultiCampaigns([]);
      } else if (templateConfig.type === 'multi' && templateConfig.campaigns.length > 0) {
        setSelectedCampaign(null);
        setSelectedMultiCampaigns(templateConfig.campaigns);
      }
    } catch (error) {
    }
  }, [specialtyMergeMode, costComparisonMode, showTotalSends, selectedTableTypes, bannerImpressionsMode]);

  const handleThemeChange = useCallback((newTheme) => {
    setCurrentTheme(newTheme);
  }, []);

  const handleCampaignChange = useCallback((newCampaign) => {
    setSelectedCampaign(newCampaign);
    
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

  const handleAddJournalMetricRow = useCallback((label, value) => {
    setCards(prev => {
      const journalTableIndex = prev.findIndex(card =>
        card.type === 'table' &&
        (card.title === 'Online Journal Metrics' || card.id?.includes('journal'))
      );

      if (journalTableIndex === -1) return prev;

      const updatedCards = [...prev];
      const journalTable = { ...updatedCards[journalTableIndex] };
      const currentData = journalTable.config?.customData || [];

      const existingRowIndex = currentData.findIndex(row => row[0] === label);

      let newData;
      if (existingRowIndex !== -1) {
        newData = currentData.map((row, idx) =>
          idx === existingRowIndex ? [label, value] : row
        );
      } else {
        newData = [...currentData, [label, value]];
      }

      journalTable.config = {
        ...journalTable.config,
        customData: newData
      };

      updatedCards[journalTableIndex] = journalTable;

      preserveEdit(journalTable.id, { config: { customData: newData } });

      return updatedCards;
    });
  }, [preserveEdit]);

  const handleAddVideoMetricRow = useCallback((label, value) => {
    setCards(prev => {
      const videoTableIndex = prev.findIndex(card =>
        card.type === 'table' &&
        (card.title === 'Video Metrics' || card.id?.includes('video'))
      );

      if (videoTableIndex === -1) return prev;

      const updatedCards = [...prev];
      const videoTable = { ...updatedCards[videoTableIndex] };
      const rawData = videoTable.config?.customData;
      const currentData = Array.isArray(rawData) ? rawData : [];

      let newData;

      if (label === 'Total Views') {
        const impressionsIndex = currentData.findIndex(row => row[0] === 'Total Impressions');
        if (impressionsIndex !== -1) {
          newData = currentData.map((row, idx) =>
            idx === impressionsIndex ? ['Total Views', value] : row
          );
        } else {
          const existingIndex = currentData.findIndex(row => row[0] === 'Total Views');
          if (existingIndex !== -1) {
            newData = currentData.map((row, idx) =>
              idx === existingIndex ? [label, value] : row
            );
          } else {
            newData = [...currentData, [label, value]];
          }
        }
      } else {
        const existingRowIndex = currentData.findIndex(row => row[0] === label);
        if (existingRowIndex !== -1) {
          newData = currentData.map((row, idx) =>
            idx === existingRowIndex ? [label, value] : row
          );
        } else {
          newData = [...currentData, [label, value]];
        }
      }

      videoTable.config = {
        ...videoTable.config,
        customData: newData
      };

      updatedCards[videoTableIndex] = videoTable;

      preserveEdit(videoTable.id, { config: { customData: newData } });

      return updatedCards;
    });
  }, [preserveEdit]);

  const handleAddSocialMetricRow = useCallback((label, value) => {
    setCards(prev => {
      const socialTableIndex = prev.findIndex(card =>
        card.type === 'table' &&
        (card.title === 'Social Media Metrics' || card.title?.includes('Social Media') || card.id?.includes('social'))
      );

      if (socialTableIndex === -1) return prev;

      const updatedCards = [...prev];
      const socialTable = { ...updatedCards[socialTableIndex] };
      const currentData = socialTable.config?.customData || [];

      const existingRowIndex = currentData.findIndex(row => row[0] === label);

      let newData;
      if (existingRowIndex !== -1) {
        newData = currentData.map((row, idx) =>
          idx === existingRowIndex ? [label, value] : row
        );
      } else {
        newData = [...currentData, [label, value]];
      }

      socialTable.config = {
        ...socialTable.config,
        customData: newData
      };

      updatedCards[socialTableIndex] = socialTable;

      preserveEdit(socialTable.id, { config: { customData: newData } });

      return updatedCards;
    });
  }, [preserveEdit]);

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

  const handleTotalSendsToggle = useCallback(() => {
    setShowTotalSends(!showTotalSends);
  }, [showTotalSends]);

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
      const itemWithSection = {
        ...item,
        section: item.section || 'custom'
      };
      setCards(prev => [...prev, itemWithSection]);
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
    const cardWithSection = {
      ...card,
      section: card.section || 'custom'
    };
    setCards(prev => [...prev, cardWithSection]);
    setDeletedCards(prev => prev.filter(c => c.id !== card.id));
    setDeletedCardIds(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(card.id);
      return newSet;
    });
  }, []);

  const handleAddThumbnails = useCallback((thumbnailArray) => {
    const templateId = typeof currentTemplate === 'string' ? currentTemplate : currentTemplate?.id;
    const isEPSingle = templateId === 'single-expert-perspectives';
    const isEPMulti = templateId === 'multi-expert-perspectives';

    let thumbsToAdd = thumbnailArray;
    if (isEPSingle) {
      thumbsToAdd = thumbnailArray.slice(0, 1);
    } else if (isEPMulti) {
      thumbsToAdd = thumbnailArray.slice(0, 2);
    }

    let startX, startY, thumbWidth, thumbHeight, gap;

    if (isEPSingle) {
      startX = 640;
      startY = 344;
      thumbWidth = 352;
      thumbHeight = 200;
      gap = 8;
    } else if (isEPMulti) {
      startX = 752;
      startY = 264;
      thumbWidth = 248;
      thumbHeight = 136;
      gap = 8;
    } else {
      startX = 800;
      startY = 80;
      thumbWidth = 200;
      thumbHeight = 112;
      gap = 8;
    }

    if (!isEPSingle && !isEPMulti) {
      const existingMaxX = uploadedImages.reduce((max, img) => {
        return Math.max(max, img.position.x + img.position.width);
      }, 0);
      if (existingMaxX > startX) startX = existingMaxX + 10;
    }

    const newImages = thumbsToAdd.map((thumb, index) => ({
      id: `yt-thumb-${Date.now()}-${index}`,
      src: `https://img.youtube.com/vi/${thumb.videoId}/maxresdefault.jpg`,
      fallbackSrc: `https://img.youtube.com/vi/${thumb.videoId}/hqdefault.jpg`,
      position: {
        x: Math.min(startX, 1024 - thumbWidth),
        y: startY + index * (thumbHeight + gap),
        width: thumbWidth,
        height: thumbHeight
      },
      isYouTubeThumbnail: true,
      videoMetadata: {
        videoId: thumb.videoId,
        title: thumb.title,
        views: thumb.views,
        avgPercentWatched: thumb.avgPercentWatched
      }
    }));

    setUploadedImages(prev => [...prev, ...newImages]);
  }, [uploadedImages, currentTemplate]);

  const handleAddJournalCover = useCallback((covers) => {
    const coverArray = Array.isArray(covers) ? covers : [covers];
    if (coverArray.length === 0) return;

    setUploadedImages(prev => prev.filter(img => !img.isJournalCover));

    const templateId = typeof currentTemplate === 'string' ? currentTemplate : currentTemplate?.id;
    const isHotTopics = templateId === 'single-hot-topics' || templateId === 'multi-hot-topics';

    const isMultiHT = templateId === 'multi-hot-topics';

    if (coverArray.length === 1) {
      const cover = coverArray[0];
      const newImage = {
        id: `journal-cover-${Date.now()}`,
        src: cover.coverUrl,
        position: isMultiHT
          ? { x: 32, y: 208, width: 256, height: 336 }
          : { x: 24, y: 208, width: 256, height: 336 },
        isJournalCover: true,
        journalMetadata: {
          issueName: cover.issueName,
          publication: cover.publication
        }
      };
      setUploadedImages(prev => [...prev, newImage]);
    } else {
      const oldest = coverArray[coverArray.length - 1];
      const newest = coverArray[0];

      const olderImage = {
        id: `journal-cover-older-${Date.now()}`,
        src: oldest.coverUrl,
        position: isMultiHT
          ? { x: 32, y: 200, width: 192, height: 256 }
          : { x: 24, y: 200, width: 192, height: 256 },
        isJournalCover: true,
        journalMetadata: {
          issueName: oldest.issueName,
          publication: oldest.publication
        }
      };

      const newerImage = {
        id: `journal-cover-newer-${Date.now() + 1}`,
        src: newest.coverUrl,
        position: isMultiHT
          ? { x: 88, y: 288, width: 192, height: 256 }
          : { x: 80, y: 288, width: 192, height: 256 },
        isJournalCover: true,
        journalMetadata: {
          issueName: newest.issueName,
          publication: newest.publication
        }
      };

      setUploadedImages(prev => [...prev, olderImage, newerImage]);
    }
  }, [currentTemplate]);


  const handleAddSocialPosts = useCallback((postsArray) => {
    if (!postsArray || postsArray.length === 0) return;

    setUploadedImages(prev => prev.filter(img => !img.isSocialPost));

    const startY = 80;
    const postSize = 200;
    const gap = 8;
    const startX = 800;

    const newImages = postsArray.map((post, index) => ({
      id: `social-post-${Date.now()}-${index}`,
      src: post.imageUrl,
      position: {
        x: Math.min(startX, 1024 - postSize),
        y: startY + index * (postSize + gap),
        width: postSize,
        height: postSize
      },
      isSocialPost: true,
      socialMetadata: {
        postId: post.postId,
        text: post.text,
        engagements: post.engagements,
        platform: post.platform
      }
    }));

    setUploadedImages(prev => [...prev, ...newImages]);
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

  const handleSaveDashboard = useCallback(async () => {
    setSaveStatus('saving');

    const titleCard = cards.find(card => card.type === 'title');
    const dashboardName = titleCard?.title || (selectedCampaign
      ? selectedCampaign.campaign_name
      : selectedMultiCampaigns && selectedMultiCampaigns.length > 0
        ? `Multi: ${selectedMultiCampaigns.map(c => c.campaign_name).join(', ')}`
        : 'Untitled Dashboard');

    const title = dashboardName;

    const dashboardState = {
      cards: cards.map(card => ({
        ...card,
        position: card.position,
        config: card.config,
        title: card.title,
        value: card.value,
        subtitle: card.subtitle
      })),
      uploadedImages: uploadedImages.map(img => ({
        id: img.id,
        src: img.src,
        position: img.position,
        fallbackSrc: img.fallbackSrc,
        isYouTubeThumbnail: img.isYouTubeThumbnail,
        videoMetadata: img.videoMetadata
      })),
      selectedCampaign: selectedCampaign?.campaign_name,
      selectedMultiCampaigns: selectedMultiCampaigns?.map(c => c.campaign_name),
      theme: currentTheme,
      specialtyMergeMode,
      costComparisonMode,
      showTotalSends,
      budgetedCost,
      actualCost,
      selectedTableTypes,
      currentTemplate: currentTemplate?.id,
      userEdits,
      deletedCardIds: Array.from(deletedCardIds),
      bannerImpressionsMode,
      thumbnailOverlayEnabled,
      socialPostOverlayEnabled,
      showPharmaLogo,
      showBottomLogo
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboards/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'default_user',
          title,
          state_json: dashboardState,
          theme: currentTheme
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setSaveStatus('success');
        if (canvasRef.current) {
          const canvasEl = canvasRef.current.parentElement;
          canvasEl?.classList.add('canvas-save-flash');
          setTimeout(() => canvasEl?.classList.remove('canvas-save-flash'), 800);
        }
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [cards, uploadedImages, selectedCampaign, selectedMultiCampaigns, currentTheme, specialtyMergeMode, costComparisonMode, showTotalSends, budgetedCost, actualCost, selectedTableTypes, currentTemplate, userEdits, deletedCardIds, bannerImpressionsMode, thumbnailOverlayEnabled, socialPostOverlayEnabled, showPharmaLogo, showBottomLogo]);

  const handleRestoreDashboard = useCallback(async (dashboardId) => {
    setIsRestoring(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboards/${dashboardId}`);
      const data = await response.json();

      if (data.status === 'success') {
        const state = data.dashboard.state_json;

        if (state.userEdits) {
          setUserEdits(state.userEdits);
        }

        if (state.cards) {
          setCards(state.cards);
        }

        if (state.uploadedImages) {
          setUploadedImages(state.uploadedImages);
        }

        if (state.theme) {
          setCurrentTheme(state.theme);
        }

        if (state.specialtyMergeMode !== undefined) {
          setSpecialtyMergeMode(state.specialtyMergeMode);
        }

        if (state.costComparisonMode) {
          setCostComparisonMode(state.costComparisonMode);
        }

        if (state.showTotalSends !== undefined) {
          setShowTotalSends(state.showTotalSends);
        }

        if (state.budgetedCost !== undefined) {
          setBudgetedCost(state.budgetedCost);
        }

        if (state.actualCost !== undefined) {
          setActualCost(state.actualCost);
        }

        if (state.selectedTableTypes) {
          setSelectedTableTypes(state.selectedTableTypes);
        }

        if (state.bannerImpressionsMode !== undefined) {
          setBannerImpressionsMode(state.bannerImpressionsMode);
        }

        if (state.thumbnailOverlayEnabled !== undefined) {
          setThumbnailOverlayEnabled(state.thumbnailOverlayEnabled);
        }

        if (state.socialPostOverlayEnabled !== undefined) {
          setSocialPostOverlayEnabled(state.socialPostOverlayEnabled);
        }

        if (state.showPharmaLogo !== undefined) {
          setShowPharmaLogo(state.showPharmaLogo);
        }

        if (state.showBottomLogo !== undefined) {
          setShowBottomLogo(state.showBottomLogo);
        }

        if (state.deletedCardIds) {
          setDeletedCardIds(new Set(state.deletedCardIds));
        }

        let restoredCampaign = null;
        if (state.selectedCampaign) {
          restoredCampaign = campaigns.find(c => c.campaign_name === state.selectedCampaign);
          if (restoredCampaign) {
            setSelectedCampaign(restoredCampaign);
          }
        }

        let restoredMultiCampaigns = [];
        if (state.selectedMultiCampaigns && state.selectedMultiCampaigns.length > 0) {
          restoredMultiCampaigns = state.selectedMultiCampaigns
            .map(name => campaigns.find(c => c.campaign_name === name))
            .filter(c => c);
          if (restoredMultiCampaigns.length > 0) {
            setSelectedMultiCampaigns(restoredMultiCampaigns);
          }
        }

        if (state.currentTemplate) {
          setCurrentTemplate({ id: state.currentTemplate });
        }

        const triggerKey = `${state.specialtyMergeMode || false}-${state.costComparisonMode || 'none'}-${state.showTotalSends || false}-${state.theme || 'matrix'}-${state.selectedCampaign || ''}-${restoredMultiCampaigns?.length || 0}-${state.currentTemplate || ''}-${JSON.stringify(state.selectedTableTypes || {})}-${state.bannerImpressionsMode || false}`;
        setLastRegenerationTrigger(triggerKey);
      } else {
      }
    } catch (error) {
    } finally {
      setTimeout(() => setIsRestoring(false), 100);
    }
  }, [campaigns]);

  const handleExportScreenshot = useCallback(async () => {
    if (!canvasRef.current) return;

    const titleCard = cards.find(card => card.type === 'title');
    const dashboardName = titleCard?.title || (selectedCampaign
      ? selectedCampaign.campaign_name
      : selectedMultiCampaigns && selectedMultiCampaigns.length > 0
        ? `Multi: ${selectedMultiCampaigns.map(c => c.campaign_name).join(', ')}`
        : 'Dashboard');

    const result = await exportAsPDF(canvasRef, dashboardName);

    if (!result.success) {
    }
  }, [cards, selectedCampaign, selectedMultiCampaigns]);

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
      height: '100%',
      background: 'rgba(102, 126, 234, 0.15)',
      padding: '20px',
      margin: 0,
      fontFamily: "'Readex Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      borderRadius: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        position: 'relative',
        zIndex: 100,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowTemplateModal(true)}
            style={{
              padding: '10px 24px',
              border: '2px solid #2a2a2d',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              background: 'rgba(42, 42, 45, 0.05)',
              color: '#2a2a2d',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#1a1a1d';
              e.target.style.color = '#1a1a1d';
              e.target.style.background = 'rgba(42, 42, 45, 0.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#2a2a2d';
              e.target.style.color = '#2a2a2d';
              e.target.style.background = 'rgba(42, 42, 45, 0.05)';
            }}
          >
            Generate
          </button>

          <button
            onClick={() => {
              setCards([]);
              setUploadedImages([]);
              setSelectedCampaign(null);
              setSelectedMultiCampaigns([]);
              setCurrentTemplate(null);
              setDeletedCards([]);
              setDeletedCardIds(new Set());
              setSelectedElement(null);
              setSelectedComponents([]);
              clearAllEdits();
              localStorage.removeItem('dashboard-canvas-state');
            }}
            style={{
              padding: '10px 24px',
              border: '2px solid #2a2a2d',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              background: 'rgba(42, 42, 45, 0.05)',
              color: '#2a2a2d',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#1a1a1d';
              e.target.style.color = '#1a1a1d';
              e.target.style.background = 'rgba(42, 42, 45, 0.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#2a2a2d';
              e.target.style.color = '#2a2a2d';
              e.target.style.background = 'rgba(42, 42, 45, 0.05)';
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSaveDashboard}
            disabled={saveStatus === 'saving' || (!selectedCampaign && !(selectedMultiCampaigns && selectedMultiCampaigns.length > 0))}
            className={
              saveStatus === 'saving' ? 'save-btn-saving' :
              saveStatus === 'success' ? 'save-btn-success' :
              saveStatus === 'error' ? 'save-btn-error' : ''
            }
            style={{
              padding: '10px 24px',
              border: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? '2px solid #2a2a2d' : '2px solid #d1d5db',
              borderRadius: '8px',
              cursor: (saveStatus === 'saving' || (!selectedCampaign && !(selectedMultiCampaigns && selectedMultiCampaigns.length > 0))) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              background: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? 'rgba(42, 42, 45, 0.05)' : 'transparent',
              color: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? '#2a2a2d' : '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? 1 : 0.6
            }}
            onMouseOver={(e) => {
              if (saveStatus === 'idle' && (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0))) {
                e.target.style.borderColor = '#1a1a1d';
                e.target.style.color = '#1a1a1d';
                e.target.style.background = 'rgba(42, 42, 45, 0.1)';
              }
            }}
            onMouseOut={(e) => {
              if (saveStatus === 'idle' && (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0))) {
                e.target.style.borderColor = '#2a2a2d';
                e.target.style.color = '#2a2a2d';
                e.target.style.background = 'rgba(42, 42, 45, 0.05)';
              }
            }}
          >
            {saveStatus === 'saving' ? 'Saving...' :
             saveStatus === 'success' ? '\u2713 Saved!' :
             saveStatus === 'error' ? 'Error' : 'Save'}
          </button>

          <button
            onClick={handleExportScreenshot}
            disabled={!selectedCampaign && !(selectedMultiCampaigns && selectedMultiCampaigns.length > 0)}
            style={{
              padding: '10px 24px',
              border: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? '2px solid #2a2a2d' : '2px solid #d1d5db',
              borderRadius: '8px',
              cursor: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              background: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? 'rgba(42, 42, 45, 0.05)' : 'transparent',
              color: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? '#2a2a2d' : '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) ? 1 : 0.6
            }}
            onMouseOver={(e) => {
              if (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) {
                e.target.style.borderColor = '#1a1a1d';
                e.target.style.color = '#1a1a1d';
                e.target.style.background = 'rgba(42, 42, 45, 0.1)';
              }
            }}
            onMouseOut={(e) => {
              if (selectedCampaign || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0)) {
                e.target.style.borderColor = '#2a2a2d';
                e.target.style.color = '#2a2a2d';
                e.target.style.background = 'rgba(42, 42, 45, 0.05)';
              }
            }}
          >
            Export
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
        borderRadius: '12px'
      }}>
        <div style={{
          position: 'relative',
          width: sidebarOpen ? '320px' : '0px',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          flexShrink: 0,
          borderRadius: '12px'
        }}>
          <ComponentSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            campaigns={campaigns}
            selectedCampaign={selectedCampaign}
            selectedMultiCampaigns={selectedMultiCampaigns}
            currentTheme={currentTheme}
            costComparisonMode={costComparisonMode}
            showTotalSends={showTotalSends}
            specialtyMergeMode={specialtyMergeMode}
            onThemeChange={handleThemeChange}
            onCostModeChange={handleCostModeChange}
            onTotalSendsToggle={handleTotalSendsToggle}
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
            onRestoreDashboard={handleRestoreDashboard}
            selectedRowInfo={selectedRowInfo}
            onAddJournalMetricRow={handleAddJournalMetricRow}
            hasJournalTable={cards.some(card => card.type === 'table' && (card.title === 'Online Journal Metrics' || card.id?.includes('journal')))}
            onAddVideoMetricRow={handleAddVideoMetricRow}
            hasVideoTable={cards.some(card => card.type === 'table' && (card.title === 'Video Metrics' || card.id?.includes('video')))}
            bannerImpressionsMode={bannerImpressionsMode}
            onBannerImpressionsModeToggle={() => setBannerImpressionsMode(!bannerImpressionsMode)}
            onAddThumbnails={handleAddThumbnails}
            thumbnailOverlayEnabled={thumbnailOverlayEnabled}
            onThumbnailOverlayToggle={() => setThumbnailOverlayEnabled(!thumbnailOverlayEnabled)}
            showPharmaLogo={showPharmaLogo}
            onShowPharmaLogoToggle={() => setShowPharmaLogo(!showPharmaLogo)}
            showBottomLogo={showBottomLogo}
            onShowBottomLogoToggle={() => setShowBottomLogo(!showBottomLogo)}
            onAddJournalCover={handleAddJournalCover}
            onAddSocialMetricRow={handleAddSocialMetricRow}
            hasSocialTable={cards.some(card => card.type === 'table' && (card.title === 'Social Media Metrics' || card.title?.includes('Social Media') || card.id?.includes('social')))}
            onAddSocialPosts={handleAddSocialPosts}
            socialPostOverlayEnabled={socialPostOverlayEnabled}
            onSocialPostOverlayToggle={() => setSocialPostOverlayEnabled(!socialPostOverlayEnabled)}
          />
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            left: sidebarOpen ? 'calc(320px + 20px)' : '20px',
            top: '40%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
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
          padding: '16px',
          overflow: 'auto',
          minHeight: 0
        }}>
          <div
            ref={drop}
            style={{
              position: 'relative',
              width: 'min(1024px, 100%)',
              height: 'min(576px, calc(100vh - 200px))',
              maxWidth: '1024px',
              maxHeight: '576px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(8px)',
              cursor: isMultiSelecting ? 'crosshair' : 'default',
              flexShrink: 0,
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

                  {pharmaLogoSrc && showPharmaLogo && (
                    <div style={{
                      position: 'absolute',
                      top: '30px',
                      left: '25px',
                      zIndex: 10
                    }}>
                      <img
                        src={pharmaLogoSrc}
                        alt="Pharma Logo"
                        style={{
                          height: '40px',
                          width: 'auto',
                          maxWidth: '130px',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  )}

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
                          onRowSelect={setSelectedRowInfo}
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

                    if (card.type === 'stat-highlight') {
                      return (
                        <StatHighlight
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

                    if (card.type === 'metric-strip') {
                      return (
                        <MetricStrip
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

                    if (card.type === 'image-slot') {
                      return (
                        <ImageSlot
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
                      showOverlay={(thumbnailOverlayEnabled && image.isYouTubeThumbnail) || (socialPostOverlayEnabled && image.isSocialPost)}
                    />
                  ))}

                  {cards.filter(card => card.type === 'image' && (showBottomLogo || card.id !== 'matrix-logo-bottom')).map(image => (
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
                  <h2 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Create Dashboard</h2>
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