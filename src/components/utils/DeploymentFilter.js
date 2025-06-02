import React from 'react';

const DeploymentFilter = ({ selectedDeployment, setSelectedDeployment }) => {
  const deploymentOptions = [
    { value: "all", label: "All Deployments" },
    { value: "1", label: "Deployment 1" },
    { value: "2", label: "Deployment 2" },
    { value: "3", label: "Deployment 3" },
    { value: "none", label: "No Deployment" }
  ];

  return (
    <div className="deployment-filter">
      <label htmlFor="deploymentFilter">Filter by Deployment:</label>
      <select
        id="deploymentFilter"
        value={selectedDeployment}
        onChange={(e) => setSelectedDeployment(e.target.value)}
        className="deployment-select"
      >
        {deploymentOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DeploymentFilter;