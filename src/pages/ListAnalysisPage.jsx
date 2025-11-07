import React, { useRef } from 'react';
import ListEfficiencyAnalysis from '../components/listanalysis/ListEfficiencyAnalysis';
import '../styles/ListAnalysisPage.css';

const ListAnalysisPage = () => {
  const listAnalysisRef = useRef();

  const handleClear = () => {
    if (listAnalysisRef.current) {
      listAnalysisRef.current.clearAnalysis();
    }
  };

  return (
    <div className="list-analysis-page">
      <div className="list-analysis-page-header">
        <h1>List Efficiency Analysis</h1>
        <button onClick={handleClear} className="btn-clear-header">
          Clear
        </button>
      </div>

      <div className="list-analysis-sections">
        <ListEfficiencyAnalysis ref={listAnalysisRef} />
      </div>
    </div>
  );
};

export default ListAnalysisPage;
