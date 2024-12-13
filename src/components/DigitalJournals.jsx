import React, { useState, useEffect } from 'react';

const DigitalJournals = () => {
    const [journalsData, setJournalsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        async function fetchDigitalJournalsData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/digital_journals.json?sp=r&st=2024-12-12T21:12:35Z&se=2026-01-01T05:12:35Z&spr=https&sv=2022-11-02&sr=b&sig=weuFPecVrWdag7gIH%2FGNEVRobleTGtJ47q52HGiGvGQ%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                const sortedData = jsonData.sort((a, b) => b.sessions - a.sessions);
                setJournalsData(sortedData);
                setFilteredData(sortedData);
            } catch (error) {
                console.error("Error fetching digital journals data:", error);
            }
        }
        fetchDigitalJournalsData();
    }, []);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value.toLowerCase();
        setSearch(searchValue);
        setFilteredData(journalsData.filter(item =>
            searchValue.split(' ').every(word => item.title.toLowerCase().includes(word))
        ));
        setCurrentPage(1);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const formatTitle = (title) => {
        return title
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());
    };

    const formatEngagement = (seconds) => {
        if (isNaN(seconds) || seconds < 0) {
            return "0.00 minutes"; 
        }
    
        const minutes = seconds / 60; 
        return `${minutes.toFixed(2)} minutes`; 
    };    

    const exportToCSV = () => {
        const header = ['Title', 'Sessions', 'Engaged Sessions', 'Avg Session Duration', 'Bounce Rate', 'Active Users', 'Property', 'Page Number', 'Count'];
    
        const rows = filteredData.map(item => [
            item.title,
            item.sessions,
            item.engagedSessions,
            item.averageSessionDuration,
            item.bounceRate,
            item.activeUsers,
            item.property,
            item.pageNumber,
            item.count
        ]);
    
        const csvContent = [header, ...rows]
            .map(row => row.map(field => 
                `"${String(field).replace(/"/g, '""')}"`
            ).join(","))
            .join("\n");
    
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "digital_journals_data.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    return (
        <div className="table-section">
            <div className="digital-journals-header">
                <h2>Digital Journal Metrics</h2>
                <div className="search-container">
                    <input
                        type="text"
                        className="digital-journals-search-box"
                        placeholder="Search by Title"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
                <div className="digital-journals-controls">
                    <div className="digital-ed-rows-per-page">
                        <label htmlFor="rowsPerPage">Rows per page:</label>
                        <select
                            id="rowsPerPage"
                            value={rowsPerPage}
                            onChange={handleRowsPerPageChange}
                        >
                            {[10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((num) => (
                                <option key={num} value={num}>
                                    {num}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th className="title-column">Title</th>
                        <th>Sessions</th>
                        <th>Engaged Sessions</th>
                        <th>Avg Session Duration</th>
                        <th>Bounce Rate</th>
                        <th>Active Users</th>
                    </tr>
                </thead>
                <tbody>
                    {currentRows
                        .filter(item => item.title.toLowerCase() !== "title not found")
                        .map((item, index) => (
                            <tr key={index}>
                                <td className="title-cell">{formatTitle(item.title)}</td>
                                <td>{item.sessions}</td>
                                <td>{item.engagedSessions}</td>
                                <td>{formatEngagement(item.averageSessionDuration)}</td>
                                <td>{(item.bounceRate * 100).toFixed(2)}%</td>
                                <td>{item.activeUsers}</td>
                            </tr>
                        ))}
                </tbody>
            </table>
            <div className="pagination">
                {currentPage > 1 && (
                    <button onClick={() => handlePagination(currentPage - 1)}>Previous</button>
                )}
                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(num => (
                    <button
                        key={num}
                        onClick={() => handlePagination(num)}
                        className={currentPage === num ? 'active' : ''}
                    >
                        {num}
                    </button>
                ))}
                {currentPage < totalPages && (
                    <button onClick={() => handlePagination(currentPage + 1)}>Next</button>
                )}
            </div>
            <div className="export-button-container">
                <button className="export-button" onClick={exportToCSV}>
                    Export CSV
                </button>
            </div>
        </div>
    );
};

export default DigitalJournals;
