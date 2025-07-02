import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import MetricCard from './MetricCard';
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
import { getThemeLogo } from './template/LayoutTemplates';

const DashboardCanvasContent = () => {
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [cards, setCards] = useState([]);
  const [deletedCards, setDeletedCards] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [specialtyMergeMode, setSpecialtyMergeMode] = useState(true);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('matrix');
  const canvasRef = useRef(null);

  const {
    campaigns,
    loading,
    error,
    getAvailableMetrics,
    getGeographicData,
    getAuthorityMetrics
  } = useDashboardData();

  const generateSpecialtySection = useCallback((campaign) => {
    return [];
  }, []);

  const handleCardEdit = useCallback((cardId, newData) => {
    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, ...newData } : card
    ));
  }, []);

  const handleCardDelete = useCallback((cardId) => {
    const cardToDelete = cards.find(card => card.id === cardId);
    if (cardToDelete) {
      setDeletedCards(prev => [...prev, cardToDelete]);
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
    try {
      const generatedComponents = generateTemplate(templateConfig);
      setCards(generatedComponents);
      setCurrentTheme(templateConfig.theme);
      setDeletedCards([]);
      setUploadedImages([]);
      
      if (templateConfig.type === 'single' && templateConfig.campaigns.length > 0) {
        setSelectedCampaign(templateConfig.campaigns[0]);
      }
    } catch (error) {
      console.error('Template generation failed:', error);
    }
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === e.currentTarget) {
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
    if (e.ctrlKey || e.metaKey) {
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

  const handleAddCard = useCallback((cardType, customData = {}) => {
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
      section: 'custom'
    };
    
    setCards(prev => [...prev, newCard]);
  }, [cards.length]);

  const handleAddMetric = useCallback((item) => {
    if (item.type === 'table') {
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
        section: 'custom'
      };
      setCards(prev => [...prev, newTable]);
    } else if (item.type === 'chart') {
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
    setCards(prev => [...prev, { ...card, id: `${card.id}-restored-${Date.now()}` }]);
    setDeletedCards(prev => prev.filter(c => c !== card));
  }, []);

  const handleSpecialtyMergeToggle = useCallback(() => {
    setSpecialtyMergeMode(prev => {
      const newMode = !prev;
      if (selectedCampaign) {
        setCards(prev => prev.filter(card => card.section !== 'specialty'));
        const specialtyCards = generateSpecialtySection(selectedCampaign);
        setCards(prev => [...prev, ...specialtyCards]);
      }
      return newMode;
    });
  }, [selectedCampaign, generateSpecialtySection]);

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
    if (!canvasRef.current || !selectedCampaign) return;
    
    const result = await exportDashboard(canvasRef, selectedCampaign.campaign_name);
    
    if (!result.success) {
      console.error('Export failed:', result.error);
    }
  }, [selectedCampaign]);

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
          disabled={!selectedCampaign}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            cursor: selectedCampaign ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            background: selectedCampaign ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#e2e8f0',
            color: selectedCampaign ? 'white' : '#94a3b8',
            boxShadow: selectedCampaign ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none'
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
            availableMetrics={availableMetrics}
            deletedCards={deletedCards}
            onRestoreCard={handleRestoreCard}
            specialtyMergeMode={specialtyMergeMode}
            onToggleSpecialtyMerge={handleSpecialtyMergeToggle}
            createDraggableMetric={createDraggableMetric}
            onAddCard={handleAddCard}
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
              {selectedCampaign ? (
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

                    if (card.type === 'specialty-strips') {
                      return (
                        <SpecialtyKPIStrips
                          key={card.id}
                          {...card}
                          onEdit={handleCardEdit}
                          onDelete={handleCardDelete}
                          onMove={handleCardMove}
                          onSelect={(e) => handleComponentClick(card.id, e || {})}
                          isSelected={selectedElement === card.id || isComponentSelected}
                        />
                      );
                    }
                    
                    return (
                      <MetricCard
                        key={card.id}
                        {...card}
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