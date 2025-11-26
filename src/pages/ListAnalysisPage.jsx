import React, { useRef } from 'react';
import ListEfficiencyAnalysis from '../components/listanalysis/ListEfficiencyAnalysis';
import NPIQuickLookup from '../components/listanalysis/NPIQuickLookup';
import '../styles/ListAnalysisPage.css';

const ListAnalysisPage = () => {
  const listAnalysisRef = useRef();
  const npiLookupRef = useRef();

  const handleClear = () => {
    if (listAnalysisRef.current) {
      listAnalysisRef.current.clearAnalysis();
    }
    if (npiLookupRef.current) {
      npiLookupRef.current.clearLookup();
    }
  };

  return (
    <div className="list-analysis-page">
      <div className="list-analysis-page-header">
        <h1>List Analysis</h1>
        <button onClick={handleClear} className="btn-clear-header">
          Clear
        </button>
      </div>

      <div className="list-analysis-sections">
        <ListEfficiencyAnalysis ref={listAnalysisRef} />
        <NPIQuickLookup ref={npiLookupRef} />
      </div>
    </div>
  );
};

export default ListAnalysisPage;