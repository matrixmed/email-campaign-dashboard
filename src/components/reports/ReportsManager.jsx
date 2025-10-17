import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, CheckCircle, FileText, Eye, Copy } from 'lucide-react';
import '../../styles/ReportsManager.css';
import { API_BASE_URL } from '../../config/api';

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
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [futureRowsPerPage, setFutureRowsPerPage] = useState(10);
    const [archiveRowsPerPage, setArchiveRowsPerPage] = useState(10);

    useEffect(() => {
        const fetchReportsData = async () => {
            try {
                const response = await fetch('https://emaildash.blob.core.windows.net/json-data/report_resource.json?sp=r&st=2025-08-19T18:46:57Z&se=2028-10-27T03:01:57Z&spr=https&sv=2024-11-04&sr=b&sig=ckSR839%2FioPD%2F7Si5EoW7E1%2B5ybwAe5MMw3q2r8M6rA%3D');
                const data = await response.json();
                setReportsData(data);

                try {
                    const currentWeekMonday = getCurrentWeekMonday();
                    currentWeekMonday.setDate(currentWeekMonday.getDate() - 7);
                    const weekStart = currentWeekMonday.toISOString().split('T')[0];

                    const statusResponse = await fetch(`${API_BASE_URL}/api/cmi/reports/week/${weekStart}`);
                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json();

                        const newCheckedStates = {};
                        statusData.reports?.forEach(report => {
                            if (report.is_submitted) {
                                const campaignId = report.campaign_id;
                                newCheckedStates[`${campaignId}_week_1`] = true;
                                newCheckedStates[`${campaignId}_week_2`] = true;
                                newCheckedStates[`${campaignId}_week_3`] = true;
                                if (report.report_category === 'no_data') {
                                    newCheckedStates[`${campaignId}_no_data`] = true;
                                }
                            }
                        });
                        setCheckedReports(newCheckedStates);
                    } else {
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
                    }
                } catch (error) {
                    console.error('Error fetching submission statuses from backend:', error);
                    const savedStates = localStorage.getItem('reportCheckboxStates');
                    if (savedStates) {
                        const { states } = JSON.parse(savedStates);
                        setCheckedReports(states);
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
        return mondayThisWeek;
    };

    const getReportWeek = (sendDate) => {
        if (!sendDate) return null;

        const send = parseSendDate(sendDate);
        if (!send) return null;

        const reportingMonday = getCurrentWeekMonday();
        reportingMonday.setDate(reportingMonday.getDate() - 7);

        const sendDay = send.getUTCDay();
        const daysToSendMonday = sendDay === 0 ? -6 : 1 - sendDay;
        const sendMonday = new Date(send);
        sendMonday.setUTCDate(send.getUTCDate() + daysToSendMonday);
        sendMonday.setUTCHours(0, 0, 0, 0);

        const reportingMondayUTC = new Date(Date.UTC(
            reportingMonday.getFullYear(),
            reportingMonday.getMonth(),
            reportingMonday.getDate()
        ));

        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weeksDiff = Math.round((reportingMondayUTC - sendMonday) / msPerWeek);

        if (weeksDiff === 0) return 1; 
        if (weeksDiff === 1) return 2; 
        if (weeksDiff === 2) return 3;

        return null;
    };

    const getCurrentWeekTimeframe = () => {
        const reportingMonday = getCurrentWeekMonday();
        reportingMonday.setDate(reportingMonday.getDate() - 7);
        const sunday = new Date(reportingMonday);
        sunday.setDate(reportingMonday.getDate() + 6);
        return { start: reportingMonday, end: sunday };
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
            if (report.is_no_data_report) return;

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

    const getCurrentWeekNoDataReports = useMemo(() => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const reports = [];

        reportsData.forEach(report => {
            if (!report.is_no_data_report) return;

            const week = getReportWeek(report.send_date);
            if (week !== null) {
                reports.push({
                    ...report,
                    week_number: week,
                    week_range: currentTimeframe,
                    unique_key: `${report.campaign_id}_no_data`
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

    const handleCheckboxChange = async (reportId, week) => {
        const key = `${reportId}_week_${week}`;
        const newCheckedState = !checkedReports[key];

        const newStates = {
            ...checkedReports,
            [key]: newCheckedState
        };
        setCheckedReports(newStates);

        try {
            const response = await fetch(`${API_BASE_URL}/api/cmi/reports/${reportId}/submit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_submitted: newCheckedState,
                    submitted_by: 'user'
                })
            });

            if (!response.ok) {
                setCheckedReports(checkedReports);
                console.error('Failed to update submission status');
            }
        } catch (error) {
            setCheckedReports(checkedReports);
            console.error('Error updating submission status:', error);
        }
    };

    const handleNoDataCheckboxChange = async (reportId) => {
        const key = `${reportId}_no_data`;
        const newCheckedState = !checkedReports[key];

        const newStates = {
            ...checkedReports,
            [key]: newCheckedState
        };
        setCheckedReports(newStates);

        try {
            const response = await fetch(`${API_BASE_URL}/api/cmi/reports/${reportId}/submit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_submitted: newCheckedState,
                    submitted_by: 'user'
                })
            });

            if (!response.ok) {
                setCheckedReports(checkedReports);
                console.error('Failed to update no-data submission status');
            }
        } catch (error) {
            setCheckedReports(checkedReports);
            console.error('Error updating no-data submission status:', error);
        }
    };

    const generateAgencyJSON = (report, specificWeek = null) => {
        const agency = report.agency.toLowerCase();

        switch(agency) {
            case 'cmi':
                return generateCMIJSON(report, specificWeek);
            case 'bi':
                return generateBIJSON(report, specificWeek);
            case 'amg':
                return generateAMGJSON(report, specificWeek);
            case 'ortho':
                return generateOrthoJSON(report, specificWeek);
            case 'sun':
                return generateSunJSON(report, specificWeek);
            case 'cas':
                return generateCasJSON(report, specificWeek);
            case 'deer':
                return generateDeerJSON(report, specificWeek);
            case 'good':
                return generateGoodJSON(report, specificWeek);
            case 'iq':
                return generateIQJSON(report, specificWeek);
            case 'klik':
                return generateKlikJSON(report, specificWeek);
            case 'sl':
                return generateSLJSON(report, specificWeek);
            default:
                return generateDefaultJSON(report, specificWeek);
        }
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

        const brandName = report.cmi_metadata?.Brand_Name || report.brand || "";
        const vehicleName = report.cmi_metadata?.Vehicle_Name || "";
        const contractNumber = report.cmi_metadata?.contract_number || "";

        return {
            "folder": month.toLowerCase(),
            "dateOfSubmission": formatDate(currentTimeframe.end),
            "mondayDate": formatDate(previousMonday),
            "mondaydate": formatDateSlash(currentTimeframe.start),
            "start_date": formatISODateTime(currentTimeframe.start),
            "end_date": formatISODateTime(currentTimeframe.end, true),
            "internal_campaign_name": report.campaign_name || "",
            "client_campaign_name": report.cmi_metadata?.client_campaign_name || "",
            "TargetListID": report.cmi_metadata?.target_list_id || "",
            "CMI_PlacementID": report.cmi_metadata?.placement_id || "",
            "Client_PlacementID": report.cmi_metadata?.Client_PlacementID || "",
            "Creative_Code": report.cmi_metadata?.creative_code || "",
            "GCM_Placement_ID": report.cmi_metadata?.GCM_Placement_ID || "",
            "GCM_Placement_ID2": report.cmi_metadata?.GCM_Placement_ID2 || "",
            "Client_ID": "",
            "finalFileName": `${brandName}_PLD_${vehicleName}_${contractNumber}`,
            "aggFileName": `${brandName}_AGG_${vehicleName}_${contractNumber}`,
            "Brand_Name": brandName,
            "Supplier": report.cmi_metadata?.Supplier || "",
            "Vehicle_Name": vehicleName,
            "Placement_Description": report.cmi_metadata?.Placement_Description || "",
            "Buy_Component_Type": report.cmi_metadata?.Buy_Component_Type || "",
            "Campaign_Type": report.cmi_metadata?.Campaign_Type || ""
        };
    };

    const generateBIJSON = (report, specificWeek = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const cleanCampaignName = report.campaign_name.replace(/\([^)]*\)/g, '').trim();

        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ?
                `${year}-${month}-${day}T23:59:59` :
                `${year}-${month}-${day}T00:00:00`;
        };

        const monthMatch = report.campaign_name.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const month = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });

        return {
            "campaigns": [
                {
                    "campaign_name": cleanCampaignName,
                    "topic_brand": report.brand.toUpperCase(),
                    "topic_therapeutic_area": "IMMUNOLOGY",
                    "topic_asset_ids": ["1339853"]
                }
            ],
            "folder": month,
            "channel": "Email",
            "sub_channel": "Third Party Initiated Email",
            "interaction_functional_area": "Human Pharma Commercial",
            "start_date": formatISODateTime(currentTimeframe.start),
            "end_date": formatISODateTime(currentTimeframe.end, true)
        };
    };

    const generateAMGJSON = (report, specificWeek = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const cleanCampaignName = report.campaign_name.replace(/\([^)]*\)/g, '').trim();

        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ?
                `${year}-${month}-${day}T23:59:59` :
                `${year}-${month}-${day}T00:00:00`;
        };

        const formatDate = (date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${year}${month}${day}`;
        };

        const monthMatch = report.campaign_name.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const month = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });

        return {
            "folder": month,
            "start_date": formatISODateTime(currentTimeframe.start),
            "end_date": formatISODateTime(currentTimeframe.end, true),
            "internal_campaign_name": cleanCampaignName,
            "channel_partner": "Matrix_Medical",
            "channel": "EM",
            "brand_name": report.brand.toUpperCase(),
            "promotion_type": "Branded",
            "campaign_target_date": formatDate(currentTimeframe.start),
            "campaign_code": `${report.brand.toUpperCase()}11778`,
            "offer_name": `${report.brand.toUpperCase()} MATRIX_EM`,
            "offer_code": "CampOffer-08492",
            "vendor_code": "VC-00103",
            "tactic_name": `${report.brand.toUpperCase()} EMAIL`,
            "tactic_id": "Tactic-019998",
            "contact_filename_base": "CONTACT_DATA",
            "response_filename_base": "RESPONSE",
            "aggregate_filename_base": "AggReport"
        };
    };

    const generateOrthoJSON = (report, specificWeek = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const cleanCampaignName = report.campaign_name.replace(/\([^)]*\)/g, '').trim();

        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ?
                `${year}-${month}-${day}T23:59:59` :
                `${year}-${month}-${day}T00:00:00`;
        };

        const formatDate = (date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}${day}${year}`;
        };

        const monthMatch = report.campaign_name.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const month = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });

        return {
            "internal_campaign_name": cleanCampaignName,
            "folder": month,
            "finalFileName": "Ortho_PLD_",
            "aggFileName": "Ortho_AGG_",
            "campaginMonth": formatDate(currentTimeframe.start).substring(0, 6),
            "date": `${currentTimeframe.start.getMonth() + 1}/${currentTimeframe.start.getDate()}/${currentTimeframe.start.getFullYear()}`,
            "dateOfSubmission": formatDate(currentTimeframe.end),
            "start_date": formatISODateTime(currentTimeframe.start),
            "end_date": formatISODateTime(currentTimeframe.end, true)
        };
    };

    const generateDefaultJSON = (report, specificWeek = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const cleanCampaignName = report.campaign_name.replace(/\([^)]*\)/g, '').trim();

        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ?
                `${year}-${month}-${day}T23:59:59` :
                `${year}-${month}-${day}T00:00:00`;
        };

        const monthMatch = report.campaign_name.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const month = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });

        return {
            "folder": month,
            "internal_campaign_name": cleanCampaignName,
            "brand_name": report.brand,
            "agency": report.agency,
            "start_date": formatISODateTime(currentTimeframe.start),
            "end_date": formatISODateTime(currentTimeframe.end, true)
        };
    };

    const generateSunJSON = generateDefaultJSON;
    const generateCasJSON = generateDefaultJSON;
    const generateDeerJSON = generateDefaultJSON;
    const generateGoodJSON = generateDefaultJSON;
    const generateIQJSON = generateDefaultJSON;
    const generateKlikJSON = generateDefaultJSON;
    const generateSLJSON = generateDefaultJSON;

    const openCMIModal = (report, specificWeek = null) => {
        const jsonData = generateAgencyJSON(report, specificWeek);
        const confidence = report.cmi_metadata?.match_confidence !== undefined
            ? (report.cmi_metadata.match_confidence * 100).toFixed(0) + '%'
            : 'N/A';
        setSelectedCMIReport({ ...jsonData, _confidence: confidence });
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
            console.error('Failed to copy to clipboard:', err);
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
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const year = String(date.getUTCFullYear()).slice(-2);
        return `${month}/${day}/${year}`;
    };

    const renderNoDataReportRow = (report, rowIndex) => {
        const isCMI = report.agency === 'CMI';

        return (
            <tr key={report.unique_key} className={`report-row no-data-row ${rowIndex % 2 === 0 ? 'even-row' : 'odd-row'}`}>
                <td className="campaign-column">
                    <div
                        className="campaign-text clickable-campaign"
                        onClick={() => openCMIModal(report)}
                        title={report.campaign_name}
                    >
                        <span className="campaign-name no-data-campaign" title={report.campaign_name}>
                            {report.campaign_name}
                        </span>
                        {isCMI && (
                            <div className="cmi-info">
                                <FileText className="cmi-icon" size={16} />
                            </div>
                        )}
                    </div>
                </td>
                <td className="brand-column">{report.brand}</td>
                <td className="agency-column">
                    <span className={`agency-badge ${report.agency.toLowerCase()}`}>
                        {report.agency}
                    </span>
                </td>
                <td className="date-column-report">{formatDateRange(report.week_range.start, report.week_range.end)}</td>
                <td className="no-data-status-column">
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            checked={checkedReports[`${report.campaign_id}_no_data`] || false}
                            onChange={() => handleNoDataCheckboxChange(report.campaign_id)}
                        />
                        <span className="checkmark"></span>
                    </label>
                </td>
            </tr>
        );
    };

    const renderCurrentReportRow = (report, rowIndex, allReports) => {
        const isCMI = report.agency === 'CMI';

        const brandCount = isCMI ? allReports.filter(r => r.agency === 'CMI' && r.brand === report.brand).length : 0;

        return (
            <tr key={report.unique_key} className={`report-row ${rowIndex % 2 === 0 ? 'even-row' : 'odd-row'}`}>
                <td className="campaign-column">
                    <div
                        className="reports-campaign-text clickable-campaign"
                        onClick={() => openCMIModal(report)}
                        title={report.campaign_name}
                    >
                        <span className="reports-campaign-name" title={report.campaign_name}>
                            {report.campaign_name}
                        </span>
                        {isCMI && (
                            <div className="cmi-info">
                                <FileText className="cmi-icon" size={16} />
                                {brandCount > 1 && (
                                    <span className="weeks-count" title={`${brandCount} ${report.brand} campaigns due this week`}>
                                        {brandCount}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </td>
                <td className="brand-column">{report.brand}</td>
                <td className="agency-column">
                    <span className={`agency-badge ${report.agency.toLowerCase()}`}>
                        {report.agency}
                    </span>
                </td>
                <td className="date-column-report">{formatSendDate(report.send_date)}</td>
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
            <div className="reports-sticky-header">
                <div className="page-header">
                    <h1>Reports Manager</h1>
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search"
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
            </div>

            <div className="reports-scrollable-content">

            {activeTab === 'current' && (() => {
                const allCurrentReports = getCurrentWeekReports;
                const allNoDataReports = getCurrentWeekNoDataReports;
                const totalPages = getTotalPages(allCurrentReports.length, rowsPerPage);
                const paginatedCurrentReports = getPaginatedData(allCurrentReports, currentPage, rowsPerPage);

                return (
                    <div className="reports-section current-reports">
                        <div className="section-header">
                            <h3>Campaign Reports Due This Week</h3>
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
                                        <th className="week-header">Week 1</th>
                                        <th className="week-header">Week 2</th>
                                        <th className="week-header">Week 3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        if (paginatedCurrentReports.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="7" className="empty-state">
                                                        {searchTerm ? 'No reports match your search' : 'No reports due this week'}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const groupedReports = paginatedCurrentReports
                                            .sort((a, b) => {
                                                const dateA = parseSendDate(a.send_date);
                                                const dateB = parseSendDate(b.send_date);
                                                return dateA - dateB;
                                            })
                                            .reduce((acc, report) => {
                                                const agency = report.agency;
                                                if (!acc[agency]) acc[agency] = [];
                                                acc[agency].push(report);
                                                return acc;
                                            }, {});

                                        const sortedAgencies = Object.keys(groupedReports).sort((a, b) => {
                                            if (a === 'CMI') return -1;
                                            if (b === 'CMI') return 1;
                                            return a.localeCompare(b);
                                        });

                                        let globalIndex = 0;
                                        return sortedAgencies.map((agency, agencyIndex) => (
                                            <React.Fragment key={`agency-${agency}`}>
                                                <tr className="agency-section-header">
                                                    <td colSpan="7" className="agency-section-title">
                                                        <span className={`agency-badge ${agency.toLowerCase()}`}>{agency}</span>
                                                        <span className="agency-count">({groupedReports[agency].length} reports)</span>
                                                    </td>
                                                </tr>
                                                {groupedReports[agency].map((report) => {
                                                    const row = renderCurrentReportRow(report, globalIndex, paginatedCurrentReports);
                                                    globalIndex++;
                                                    return row;
                                                })}
                                                {agencyIndex < sortedAgencies.length - 1 && (
                                                    <tr className="agency-divider">
                                                        <td colSpan="7"></td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        {renderPaginationButtons(currentPage, totalPages, 'current')}

                        {allNoDataReports.length > 0 && (
                            <div className="no-data-reports-section" style={{ marginTop: '40px' }}>
                                <div className="section-header">
                                    <h3>No Data Reports Due This Week</h3>
                                    <div className="section-stats">
                                        <span className="stat-item">
                                            <span className="stat-label">Total:</span>
                                            <span className="stat-value">{allNoDataReports.length}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="table-container">
                                    <table className="reports-table no-data-table">
                                        <thead>
                                            <tr>
                                                <th className="campaign-header">No Data Report</th>
                                                <th className="brand-header">Brand</th>
                                                <th className="agency-header">Agency</th>
                                                <th className="timeframe-header">Week Timeframe</th>
                                                <th className="status-header">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allNoDataReports.map((report, index) => renderNoDataReportRow(report, index))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
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
                                    {(() => {
                                        if (paginatedArchiveReports.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="7" className="empty-state">
                                                        {searchTerm ? 'No past reports match your search' : 'No past reports found'}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const groupedReports = paginatedArchiveReports.reduce((acc, report) => {
                                            const agency = report.agency;
                                            if (!acc[agency]) acc[agency] = [];
                                            acc[agency].push(report);
                                            return acc;
                                        }, {});

                                        const sortedAgencies = Object.keys(groupedReports).sort((a, b) => {
                                            if (a === 'CMI') return -1;
                                            if (b === 'CMI') return 1;
                                            return a.localeCompare(b);
                                        });

                                        let globalIndex = 0;
                                        return sortedAgencies.map((agency, agencyIndex) => (
                                            <React.Fragment key={`archive-agency-${agency}`}>
                                                <tr className="agency-section-header">
                                                    <td colSpan="7" className="agency-section-title">
                                                        <span className={`agency-badge ${agency.toLowerCase()}`}>{agency}</span>
                                                        <span className="agency-count">({groupedReports[agency].length} reports)</span>
                                                    </td>
                                                </tr>
                                                {groupedReports[agency].map((report) => {
                                                    const isCMI = report.agency === 'CMI';
                                                    const row = (
                                                        <tr key={report.unique_key} className={`report-row archive-row ${globalIndex % 2 === 0 ? 'even-row' : 'odd-row'} ${report.is_no_data_report ? 'no-data-row' : ''}`}>
                                                            <td className="campaign-column">
                                                                <div
                                                                    className="campaign-text clickable-campaign"
                                                                    onClick={() => openCMIModal(report, report.week_number)}
                                                                    title={report.campaign_name}
                                                                >
                                                                    <span className={`campaign-name ${report.is_no_data_report ? 'no-data-campaign' : ''}`} title={report.campaign_name}>
                                                                        {report.campaign_name}
                                                                        {report.is_no_data_report && <span className="no-data-indicator">(No Data)</span>}
                                                                    </span>
                                                                    {isCMI && (
                                                                        <div className="cmi-info">
                                                                            <FileText className="cmi-icon" size={16} />
                                                                        </div>
                                                                    )}
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
                                                                {report.is_submitted || report[`week_${report.week_number}_completed`] ? (
                                                                    <span className="status-completed">Submitted</span>
                                                                ) : (
                                                                    <span className="status-pending">Pending</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                    globalIndex++;
                                                    return row;
                                                })}
                                                {agencyIndex < sortedAgencies.length - 1 && (
                                                    <tr className="agency-divider">
                                                        <td colSpan="7"></td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        {renderPaginationButtons(archiveCurrentPage, totalPages, 'archive')}
                    </div>
                );
            })()}

            </div>

            {showModal && selectedCMIReport && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <FileText size={20} />
                                <h3>Campaign JSON</h3>
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
                                {selectedCMIReport._confidence && (
                                    <div className="confidence-display">
                                        <span className="confidence-label">Match Confidence:</span>
                                        <span className="confidence-value">{selectedCMIReport._confidence}</span>
                                    </div>
                                )}
                                <div className="json-header">
                                    <span className="json-label">Generated JSON Structure</span>
                                    <button
                                        className="copy-button"
                                        onClick={copyToClipboard}
                                    >
                                        <Copy size={14} />
                                        Copy
                                    </button>
                                </div>
                                <div className="json-container">
                                    <pre className="json-content">
                                        {JSON.stringify(Object.fromEntries(Object.entries(selectedCMIReport).filter(([key]) => key !== '_confidence')), null, 2)}
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