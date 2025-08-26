import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, CheckCircle, FileText, Eye, Copy } from 'lucide-react';

const ReportsManager = () => {
    const [reportsData, setReportsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkedReports, setCheckedReports] = useState({});
    const [selectedCMIReport, setSelectedCMIReport] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('current');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [futureCurrentPage, setFutureCurrentPage] = useState(1);
    const [archiveCurrentPage, setArchiveCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [futureRowsPerPage, setFutureRowsPerPage] = useState(10);
    const [archiveRowsPerPage, setArchiveRowsPerPage] = useState(10);

    useEffect(() => {
        const fetchReportsData = async () => {
            try {
                const response = await fetch('https://emaildash.blob.core.windows.net/json-data/report_resource.json?sp=r&st=2025-08-19T18:46:57Z&se=2028-10-27T03:01:57Z&spr=https&sv=2024-11-04&sr=b&sig=ckSR839%2FioPD%2F7Si5EoW7E1%2B5ybwAe5MMw3q2r8M6rA%3D');
                const data = await response.json();
                setReportsData(data);
                
                const savedStates = localStorage.getItem('reportCheckboxStates');
                if (savedStates) {
                    const { states, lastUpdate } = JSON.parse(savedStates);
                    const oneWeekAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);
                    const lastMonday = getLastMonday();
                    
                    if (lastUpdate > oneWeekAgo && lastUpdate > lastMonday.getTime()) {
                        setCheckedReports(states);
                    } else {
                        localStorage.removeItem('reportCheckboxStates');
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        fetchReportsData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        setFutureCurrentPage(1);
        setArchiveCurrentPage(1);
    }, [searchTerm]);

    const getLastMonday = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    };

    const parseSendDate = (dateString) => {
        if (!dateString) return null;
        const [year, month, day] = dateString.split('-').map(num => parseInt(num));
        return new Date(Date.UTC(year, month - 1, day));
    };

    const getCurrentWeekMonday = () => {
        const today = new Date();
        const day = today.getDay();
        const mondayThisWeek = new Date(today);
        const daysToMonday = day === 0 ? -6 : 1 - day;
        mondayThisWeek.setDate(today.getDate() + daysToMonday);
        mondayThisWeek.setHours(0, 0, 0, 0);
        const mondayLastWeek = new Date(mondayThisWeek);
        mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);
        return mondayLastWeek;
    };

    const getReportWeek = (sendDate) => {
        if (!sendDate) return null;
        
        const send = parseSendDate(sendDate);
        if (!send) return null;
        
        const currentMonday = getCurrentWeekMonday();
        
        const sendDay = send.getDay();
        const daysToSendMonday = sendDay === 0 ? -6 : 1 - sendDay;
        const sendMonday = new Date(send);
        sendMonday.setDate(send.getDate() + daysToSendMonday);
        sendMonday.setHours(0, 0, 0, 0);
        
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weeksDiff = Math.floor((currentMonday - sendMonday) / msPerWeek);
        
        if (weeksDiff === 0) return 1;
        if (weeksDiff === 1) return 2;
        if (weeksDiff === 2) return 3;
        
        return null;
    };

    const getCurrentWeekTimeframe = () => {
        const monday = getCurrentWeekMonday();
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: monday, end: sunday };
    };
    
    const formatDateRange = (start, end) => {
        if (!start || !end) return '-';
        const formatDate = (date) => {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}/${day}`;
        };
        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    const filterReports = (reports) => {
        if (!searchTerm) return reports;
        return reports.filter(report => 
            report.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.agency.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const getCurrentWeekReports = useMemo(() => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const reports = [];
        
        reportsData.forEach(report => {
            const week = getReportWeek(report.send_date);
            if (week !== null) {
                reports.push({
                    ...report,
                    week_number: week,
                    week_range: currentTimeframe,
                    unique_key: `${report.campaign_id}_week_${week}`
                });
            }
        });
        
        return filterReports(reports);
    }, [reportsData, searchTerm]);

    const getPastReports = useMemo(() => {
        const expandedReports = [];
        
        reportsData.forEach(report => {
            const week = getReportWeek(report.send_date);
            
            if (week === null && report.send_date && report.monday_date) {
                const [year, month, day] = report.monday_date.split('-').map(num => parseInt(num));
                const mondayFromData = new Date(year, month - 1, day); 
                
                for (let w = 1; w <= 3; w++) {
                    const weekStart = new Date(mondayFromData);
                    weekStart.setDate(mondayFromData.getDate() + (w - 1) * 7);
                    
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    
                    expandedReports.push({
                        ...report,
                        week_number: w,
                        week_range: { start: weekStart, end: weekEnd },
                        unique_key: `${report.campaign_id}_week_${w}`,
                        days_ago: Math.floor((new Date() - mondayFromData) / (24 * 60 * 60 * 1000))
                    });
                }
            }
        });
        
        return filterReports(expandedReports);
    }, [reportsData, searchTerm]);

    const getPaginatedData = (data, currentPageParam, rowsPerPageParam) => {
        const startIndex = (currentPageParam - 1) * rowsPerPageParam;
        const endIndex = startIndex + rowsPerPageParam;
        return data.slice(startIndex, endIndex);
    };

    const getTotalPages = (dataLength, rowsPerPageParam) => {
        return Math.ceil(dataLength / rowsPerPageParam);
    };

    const renderPaginationButtons = (currentPageParam, totalPages, tab) => {
        if (totalPages <= 1) return null;
        
        const maxVisiblePages = 5;
        const startPage = Math.max(1, Math.min(currentPageParam - Math.floor(maxVisiblePages / 2), totalPages - maxVisiblePages + 1));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        return (
            <div className="pagination">
                {currentPageParam > 1 && (
                    <button onClick={() => handlePagination(currentPageParam - 1, tab)}>Previous</button>
                )}
                {Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i).map(num => (
                    <button
                        key={num}
                        onClick={() => handlePagination(num, tab)}
                        className={currentPageParam === num ? 'active' : ''}
                    >
                        {num}
                    </button>
                ))}
                {currentPageParam < totalPages && (
                    <button onClick={() => handlePagination(currentPageParam + 1, tab)}>Next</button>
                )}
            </div>
        );
    };

    const getCurrentRowsPerPage = () => {
        if (activeTab === 'current') return rowsPerPage;
        if (activeTab === 'future') return futureRowsPerPage;
        if (activeTab === 'archive') return archiveRowsPerPage;
        return 10;
    };

    const handleCurrentTabRowsChange = (e) => {
        handleRowsPerPageChange(e, activeTab);
    };

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        if (newTab === 'current') {
            setCurrentPage(1);
        } else if (newTab === 'future') {
            setFutureCurrentPage(1);
        } else if (newTab === 'archive') {
            setArchiveCurrentPage(1);
        }
    };

    const handleCheckboxChange = (reportId, week) => {
        const key = `${reportId}_week_${week}`;
        const newStates = {
            ...checkedReports,
            [key]: !checkedReports[key]
        };
        
        setCheckedReports(newStates);
        
        localStorage.setItem('reportCheckboxStates', JSON.stringify({
            states: newStates,
            lastUpdate: new Date().getTime()
        }));
    };

    const generateCMIJSON = (report, specificWeek = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        
        const formatDate = (date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}${day}${year}`;
        };
        
        const formatDateSlash = (date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
        };
        
        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ? 
                `${year}-${month}-${day}T23:59:59` : 
                `${year}-${month}-${day}T00:00:00`;
        };
        
        const monthMatch = report.campaign_name.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        const month = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });
        
        const previousMonday = new Date(currentTimeframe.start);
        previousMonday.setDate(previousMonday.getDate() - 7);
        
        return {
            "folder": month,
            "dateOfSubmission": formatDate(currentTimeframe.end),
            "mondayDate": formatDate(previousMonday),
            "mondaydate": formatDateSlash(currentTimeframe.start),
            "start_date": formatISODateTime(currentTimeframe.start),
            "end_date": formatISODateTime(currentTimeframe.end, true),
            "internal_campaign_name": report.campaign_name,
            "client_campaign_name": "",
            "TargetListID": report.cmi_metadata?.target_list_id || "",
            "CMI_PlacementID": report.cmi_metadata?.cmi_placement_id || "",
            "Client_PlacementID": report.cmi_metadata?.client_placement_id || "",
            "Creative_Code": report.cmi_metadata?.creative_code || "",
            "GCM_Placement_ID": report.cmi_metadata?.gcm_placement_id || "",
            "GCM_Placement_ID2": "",
            "Client_ID": "",
            "finalFileName": `${report.brand}_PLD_${report.cmi_metadata?.vehicle_name || ''}_${report.cmi_metadata?.contract_number || ''}`,
            "aggFileName": `${report.brand}_AGG_${report.cmi_metadata?.vehicle_name || ''}_${report.cmi_metadata?.contract_number || ''}`,
            "Brand_Name": report.brand,
            "Supplier": report.cmi_metadata?.supplier || "",
            "Vehicle_Name": report.cmi_metadata?.vehicle_name || "",
            "Placement_Description": report.cmi_metadata?.placement_description || ""
        };
    };

    const openCMIModal = (report, specificWeek = null) => {
        setSelectedCMIReport(generateCMIJSON(report, specificWeek));
        setShowModal(true);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(selectedCMIReport, null, 2));
            const button = document.querySelector('.copy-button');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            alert('Failed to copy to clipboard');
        }
    };

    const handleRowsPerPageChange = (e, tab) => {
        const newRowsPerPage = Number(e.target.value);
        if (tab === 'current') {
            setRowsPerPage(newRowsPerPage);
            setCurrentPage(1);
        } else if (tab === 'future') {
            setFutureRowsPerPage(newRowsPerPage);
            setFutureCurrentPage(1);
        } else if (tab === 'archive') {
            setArchiveRowsPerPage(newRowsPerPage);
            setArchiveCurrentPage(1);
        }
    };

    const handlePagination = (pageNumber, tab) => {
        if (tab === 'current') {
            setCurrentPage(pageNumber);
        } else if (tab === 'future') {
            setFutureCurrentPage(pageNumber);
        } else if (tab === 'archive') {
            setArchiveCurrentPage(pageNumber);
        }
    };

    const formatSendDate = (dateString) => {
        const date = parseSendDate(dateString);
        if (!date) return '-';
        return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
    };

    const renderCurrentReportRow = (report) => {
        const isCMI = report.agency === 'CMI';
        
        return (
            <tr key={report.unique_key} className={`report-row ${isCMI ? 'cmi-report-row' : ''}`}>
                <td className="campaign-column">
                    <div 
                        className={`campaign-text ${isCMI ? 'clickable-campaign' : ''}`}
                        onClick={isCMI ? () => openCMIModal(report) : undefined}
                        title={isCMI ? 'Click to open CMI JSON modal' : report.campaign_name}
                    >
                        <span className="campaign-name">{report.campaign_name}</span>
                        {isCMI && <FileText className="cmi-icon" size={16} />}
                    </div>
                </td>
                <td className="brand-column">{report.brand}</td>
                <td className="agency-column">
                    <span className={`agency-badge ${report.agency.toLowerCase()}`}>
                        {report.agency}
                    </span>
                </td>
                <td className="date-column-report">{formatSendDate(report.send_date)}</td>
                <td className="week-column">Week {report.week_number}</td>
                <td className="timeframe-column">{formatDateRange(report.week_range.start, report.week_range.end)}</td>
                <td className="week-column">
                    {report.week_number === 1 ? (
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={checkedReports[`${report.campaign_id}_week_1`] || false}
                                onChange={() => handleCheckboxChange(report.campaign_id, 1)}
                            />
                            <span className="checkmark"></span>
                        </label>
                    ) : (
                        <CheckCircle size={18} className="completed-icon" />
                    )}
                </td>
                <td className="week-column">
                    {report.week_number === 2 ? (
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={checkedReports[`${report.campaign_id}_week_2`] || false}
                                onChange={() => handleCheckboxChange(report.campaign_id, 2)}
                            />
                            <span className="checkmark"></span>
                        </label>
                    ) : report.week_number === 3 ? (
                        <CheckCircle size={18} className="completed-icon" />
                    ) : (
                        <span className="week-inactive">-</span>
                    )}
                </td>
                <td className="week-column">
                    {report.week_number === 3 ? (
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={checkedReports[`${report.campaign_id}_week_3`] || false}
                                onChange={() => handleCheckboxChange(report.campaign_id, 3)}
                            />
                            <span className="checkmark"></span>
                        </label>
                    ) : (
                        <span className="week-inactive">-</span>
                    )}
                </td>
            </tr>
        );
    };

    if (loading) {
        return (
            <div className="reports-manager">
                <div className="loading-container">
                    <div className="spinner">
                        <div></div><div></div><div></div><div></div><div></div><div></div>
                    </div>
                    <p>Loading reports data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reports-manager">
            <div className="reports-header">
                <h2>Reports Manager</h2>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search campaigns, brands, or agencies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>
            
            <div className="reports-tabs">
                <button 
                    className={`tab-button ${activeTab === 'current' ? 'active' : ''}`}
                    onClick={() => handleTabChange('current')}
                >
                    <Clock size={16} />
                    <span>Current Week ({getCurrentWeekReports.length})</span>
                </button>
                <button 
                    className={`tab-button ${activeTab === 'archive' ? 'active' : ''}`}
                    onClick={() => handleTabChange('archive')}
                >
                    <FileText size={16} />
                    <span>Archive ({getPastReports.length})</span>
                </button>
                <div className="rows-control">
                    <label htmlFor="rowsPerPage">Rows per page:</label>
                    <select
                        id="rowsPerPage"
                        value={getCurrentRowsPerPage()}
                        onChange={handleCurrentTabRowsChange}
                    >
                        {[7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((num) => (
                            <option key={num} value={num}>
                                {num}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {activeTab === 'current' && (() => {
                const allCurrentReports = getCurrentWeekReports;
                const totalPages = getTotalPages(allCurrentReports.length, rowsPerPage);
                const paginatedCurrentReports = getPaginatedData(allCurrentReports, currentPage, rowsPerPage);
                
                return (
                    <div className="reports-section current-reports">
                        <div className="section-header">
                            <h3>Reports Due This Week</h3>
                            <div className="section-stats">
                                <span className="stat-item">
                                    <span className="stat-label">Total:</span>
                                    <span className="stat-value">{allCurrentReports.length}</span>
                                </span>
                                <span className="stat-item">
                                    <span className="stat-label">CMI:</span>
                                    <span className="stat-value cmi-count">
                                        {allCurrentReports.filter(r => r.agency === 'CMI').length}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="reports-table">
                                <thead>
                                    <tr>
                                        <th className="campaign-header">Campaign</th>
                                        <th className="brand-header">Brand</th>
                                        <th className="agency-header">Agency</th>
                                        <th className="date-header">Send Date</th>
                                        <th className="week-header">Week</th>
                                        <th className="timeframe-header">Timeframe</th>
                                        <th className="week-header">Week 1</th>
                                        <th className="week-header">Week 2</th>
                                        <th className="week-header">Week 3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCurrentReports.map(report => renderCurrentReportRow(report))}
                                    {paginatedCurrentReports.length === 0 && (
                                        <tr>
                                            <td colSpan="9" className="empty-state">
                                                {searchTerm ? 'No reports match your search' : 'No reports due this week'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {renderPaginationButtons(currentPage, totalPages, 'current')}
                    </div>
                );
            })()}


            {activeTab === 'archive' && (() => {
                const allArchiveReports = getPastReports;
                const totalPages = getTotalPages(allArchiveReports.length, archiveRowsPerPage);
                const paginatedArchiveReports = getPaginatedData(allArchiveReports, archiveCurrentPage, archiveRowsPerPage);
                
                return (
                    <div className="reports-section archive-reports">
                        <div className="section-header">
                            <h3>Past Reports Archive</h3>
                        </div>
                        <div className="table-container">
                            <table className="reports-table">
                                <thead>
                                    <tr>
                                        <th className="campaign-header">Campaign</th>
                                        <th className="brand-header">Brand</th>
                                        <th className="agency-header">Agency</th>
                                        <th className="date-header">Send Date</th>
                                        <th className="week-header">Week</th>
                                        <th className="timeframe-header">Timeframe</th>
                                        <th className="status-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody key={`archive-${archiveCurrentPage}-${archiveRowsPerPage}`}>
                                    {paginatedArchiveReports.map(report => (
                                        <tr key={report.unique_key} className={`report-row archive-row ${report.agency === 'CMI' ? 'cmi-report-row' : ''}`}>
                                            <td className="campaign-column">
                                                <div 
                                                    className={`campaign-text ${report.agency === 'CMI' ? 'clickable-campaign' : ''}`}
                                                    onClick={report.agency === 'CMI' ? () => openCMIModal(report, report.week_number) : undefined}
                                                >
                                                    <span className="campaign-name">{report.campaign_name}</span>
                                                    {report.agency === 'CMI' && <FileText className="cmi-icon" size={16} />}
                                                </div>
                                            </td>
                                            <td className="brand-column">{report.brand}</td>
                                            <td className="agency-column">
                                                <span className={`agency-badge ${report.agency.toLowerCase()}`}>
                                                    {report.agency}
                                                </span>
                                            </td>
                                            <td className="date-column-report">{formatSendDate(report.send_date)}</td>
                                            <td className="week-column">Week {report.week_number}</td>
                                            <td className="timeframe-column">{formatDateRange(report.week_range.start, report.week_range.end)}</td>
                                            <td className="status-column">
                                                {report[`week_${report.week_number}_completed`] ? (
                                                    <span className="status-completed">Completed</span>
                                                ) : (
                                                    <span className="status-pending">Pending</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedArchiveReports.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="empty-state">
                                                {searchTerm ? 'No past reports match your search' : 'No past reports found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {renderPaginationButtons(archiveCurrentPage, totalPages, 'archive')}
                    </div>
                );
            })()}

            {showModal && selectedCMIReport && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <FileText size={20} />
                                <h3>CMI Report JSON</h3>
                            </div>
                            <button 
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="json-preview">
                                <div className="json-header">
                                    <span className="json-label">Generated JSON Structure</span>
                                    <button 
                                        className="copy-button"
                                        onClick={copyToClipboard}
                                    >
                                        <Copy size={14} />
                                        Copy to Clipboard
                                    </button>
                                </div>
                                <div className="json-container">
                                    <pre className="json-content">
                                        {JSON.stringify(selectedCMIReport, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsManager;
