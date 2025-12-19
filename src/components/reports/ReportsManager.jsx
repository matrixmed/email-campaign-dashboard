import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, CheckCircle, FileText, Eye, Copy, Link, Unlink, PlusCircle } from 'lucide-react';
import '../../styles/ReportsManager.css';
import { API_BASE_URL } from '../../config/api';

const ReportsManager = () => {
    const [reportsData, setReportsData] = useState([]);
    const [campaignMetadata, setCampaignMetadata] = useState([]);
    const [cmiContractValues, setCmiContractValues] = useState([]);
    const [cmiExpectedNoData, setCmiExpectedNoData] = useState({ pldAndAgg: [], aggOnly: [], allExpectedPlacementIds: [] });
    const [loading, setLoading] = useState(true);
    const [checkedReports, setCheckedReports] = useState({});
    const [selectedCMIReport, setSelectedCMIReport] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchCMIJSON, setBatchCMIJSON] = useState(null);
    const [activeTab, setActiveTab] = useState('current');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [futureCurrentPage, setFutureCurrentPage] = useState(1);
    const [archiveCurrentPage, setArchiveCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [futureRowsPerPage, setFutureRowsPerPage] = useState(10);
    const [archiveRowsPerPage, setArchiveRowsPerPage] = useState(100);
    const [sortBy, setSortBy] = useState('send_date');
    const [sortDirection, setSortDirection] = useState('asc');
    const [archiveAgencyTab, setArchiveAgencyTab] = useState('CMI');
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [movingReport, setMovingReport] = useState(null);
    const [moveNote, setMoveNote] = useState('');

    const [attachedAGGs, setAttachedAGGs] = useState({});
    const [standaloneAGGs, setStandaloneAGGs] = useState([]);
    const [movedPLDAGGs, setMovedPLDAGGs] = useState([]);
    const [moveMode, setMoveMode] = useState('attach'); 
    const [selectedAttachTarget, setSelectedAttachTarget] = useState(null);

    const [showPlacementIdModal, setShowPlacementIdModal] = useState(false);
    const [placementIdReport, setPlacementIdReport] = useState(null);
    const [placementIdInput, setPlacementIdInput] = useState('');
    const [manualMetadata, setManualMetadata] = useState(() => {
        const saved = localStorage.getItem('manualMetadata');
        return saved ? JSON.parse(saved) : {};
    }); 

    const [editedJSON, setEditedJSON] = useState('');
    const [isEditingJSON, setIsEditingJSON] = useState(false);
    const [editedBatchJSON, setEditedBatchJSON] = useState('');
    const [isEditingBatchJSON, setIsEditingBatchJSON] = useState(false);

    const [editFormData, setEditFormData] = useState({});
    const [modalViewMode, setModalViewMode] = useState('layout');
    const [gcmPlacements, setGcmPlacements] = useState([]);
    const [gcmUploadBrand, setGcmUploadBrand] = useState('');
    const [gcmUploadFile, setGcmUploadFile] = useState(null);
    const [notNeededReports, setNotNeededReports] = useState({});
    const [gcmUploadStatus, setGcmUploadStatus] = useState('');
    const [showGcmSelectionModal, setShowGcmSelectionModal] = useState(false);
    const [gcmSelectionData, setGcmSelectionData] = useState({ campaignId: null, gcmArray: [], gcmDescriptions: [], selectedIds: [] });
    const [brandsData, setBrandsData] = useState([]);
    const [navigableCampaigns, setNavigableCampaigns] = useState([]);
    const [currentCampaignIndex, setCurrentCampaignIndex] = useState(-1);

    const getPharmaCompanyFromBrand = (brandName) => {
        if (!brandName) return '';

        const normalizedBrand = brandName.toLowerCase().trim();

        const brandToPharma = {
            // Lilly
            'taltz': 'Lilly', 'verzenio': 'Lilly', 'trulicity': 'Lilly', 'mounjaro': 'Lilly',
            'zepbound': 'Lilly', 'retevmo': 'Lilly', 'jaypirca': 'Lilly', 'kisunla': 'Lilly',
            'ebglyss': 'Lilly', 'omvoh': 'Lilly', 'cyramza': 'Lilly', 'erbitux': 'Lilly',
            'olumiant': 'Lilly', 'emgality': 'Lilly', 'reyvow': 'Lilly', 'lyumjev': 'Lilly',
            'humalog': 'Lilly', 'humulin': 'Lilly', 'basaglar': 'Lilly',
            'pirtobrutinib': 'Lilly', 'imlunestrant': 'Lilly', 'lebrikizumab': 'Lilly',
            // AstraZeneca
            'tagrisso': 'AstraZeneca', 'farxiga': 'AstraZeneca', 'lynparza': 'AstraZeneca',
            'imfinzi': 'AstraZeneca', 'calquence': 'AstraZeneca', 'enhertu': 'AstraZeneca',
            'breztri': 'AstraZeneca', 'symbicort': 'AstraZeneca', 'fasenra': 'AstraZeneca',
            'saphnelo': 'AstraZeneca', 'tezspire': 'AstraZeneca', 'lokelma': 'AstraZeneca',
            'beyfortus': 'AstraZeneca', 'ultomiris': 'AstraZeneca', 'soliris': 'AstraZeneca',
            'airsupra': 'AstraZeneca', 'truqap': 'AstraZeneca', 'capivasertib': 'AstraZeneca',
            'dato-dxd': 'AstraZeneca', 'volrustomig': 'AstraZeneca',
            // Abbvie
            'skyrizi': 'Abbvie', 'rinvoq': 'Abbvie', 'humira': 'Abbvie', 'botox': 'Abbvie',
            'vraylar': 'Abbvie', 'ubrelvy': 'Abbvie', 'qulipta': 'Abbvie', 'venclexta': 'Abbvie',
            'imbruvica': 'Abbvie', 'epkinly': 'Abbvie', 'elahere': 'Abbvie', 'linzess': 'Abbvie',
            // J&J / Janssen
            'stelara': 'J&J', 'darzalex': 'J&J', 'tremfya': 'J&J', 'erleada': 'J&J',
            'carvykti': 'J&J', 'tecvayli': 'J&J', 'talvey': 'J&J', 'rybrevant': 'J&J',
            'spravato': 'J&J', 'invega': 'J&J', 'xarelto': 'J&J', 'simponi': 'J&J',
            'remicade': 'J&J', 'balversa': 'J&J', 'akeega': 'J&J', 'nipocalimab': 'J&J',
            // BI (Boehringer Ingelheim)
            'ofev': 'BI', 'trajenta': 'BI', 'jardiance': 'BI', 'synjardy': 'BI',
            'stiolto': 'BI', 'spiriva': 'BI', 'gilotrif': 'BI', 'praxbind': 'BI',
            'pradaxa': 'BI', 'spevigo': 'BI', 'ayvakyt': 'BI',
            // Exelixis
            'cabometyx': 'Exelixis', 'cometriq': 'Exelixis',
            // Other
            'dg': 'DG', 'dsi': 'DSI'
        };

        for (const [brand, pharma] of Object.entries(brandToPharma)) {
            if (normalizedBrand.includes(brand)) {
                return pharma;
            }
        }

        if (brandsData.length > 0) {
            const exactMatch = brandsData.find(b => b.brand?.toLowerCase() === normalizedBrand);
            if (exactMatch?.pharma_company) {
                return exactMatch.pharma_company;
            }

            const partialMatch = brandsData.find(b => {
                const dbBrand = b.brand?.toLowerCase() || '';
                return normalizedBrand.includes(dbBrand) || dbBrand.includes(normalizedBrand);
            });
            if (partialMatch?.pharma_company) {
                return partialMatch.pharma_company;
            }
        }

        return '';
    };

    const cleanCampaignName = (name) => {
        if (!name) return name;
        let cleaned = name.split(/\s*[-–—]?\s*deployment\s+#?\d+/i)[0].trim();
        cleaned = cleaned.replace(/[():#']/g, '').trim();
        return cleaned;
    };

    const findMatchingMetadata = (report) => {
        if (!campaignMetadata || campaignMetadata.length === 0) return null;

        const reportId = report.campaign_id || report.id;
        const reportName = cleanCampaignName(report.campaign_name || '').toLowerCase();
        const reportSendDate = report.send_date;

        for (const meta of campaignMetadata) {
            if (meta.campaign_id && reportId && String(meta.campaign_id) === String(reportId)) {
                return { ...meta, match_confidence: 1.0 };
            }
        }

        for (const meta of campaignMetadata) {
            const metaName = cleanCampaignName(meta.campaign_name || '').toLowerCase();

            if (metaName === reportName) {
                if (meta.send_date && reportSendDate && meta.send_date === reportSendDate) {
                    return { ...meta, match_confidence: 1.0 };
                }
                if (!meta.send_date || !reportSendDate) {
                    return { ...meta, match_confidence: 0.9 };
                }
            }

            if (metaName.includes(reportName) || reportName.includes(metaName)) {
                if (meta.send_date && reportSendDate && meta.send_date === reportSendDate) {
                    return { ...meta, match_confidence: 0.8 };
                }
            }
        }

        return null;
    };

    const getDeploymentNumber = (name) => {
        if (!name) return 0;
        const match = name.match(/[-–—\s]*[-–—]\s*deployment\s+#?(\d+)/i);
        return match ? parseInt(match[1]) : 0;
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('asc');
        }
    };

    const sortReports = (reports) => {
        if (!reports || reports.length === 0) return reports;

        return [...reports].sort((a, b) => {
            let aVal, bVal;

            if (sortBy === 'brand') {
                aVal = (a.brand || '').toLowerCase();
                bVal = (b.brand || '').toLowerCase();

                const brandCompare = aVal.localeCompare(bVal);
                if (brandCompare !== 0) {
                    return sortDirection === 'asc' ? brandCompare : -brandCompare;
                }

                const aCampaign = (a.campaign_name || '').toLowerCase();
                const bCampaign = (b.campaign_name || '').toLowerCase();
                return aCampaign.localeCompare(bCampaign);
            } else if (sortBy === 'send_date') {
                aVal = a.send_date || '';
                bVal = b.send_date || '';
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const deduplicateReports = (reports) => {
        const groups = {};
        reports.forEach(report => {
            const stdName = report.standardized_campaign_name || cleanCampaignName(report.campaign_name);
            if (!groups[stdName]) {
                groups[stdName] = [];
            }
            groups[stdName].push(report);
        });

        const deduplicated = [];
        Object.values(groups).forEach(group => {
            if (group.length === 1) {
                deduplicated.push(group[0]);
            } else {
                const deployment1 = group.find(r => getDeploymentNumber(r.campaign_name) === 1);
                const noDeployment = group.find(r => getDeploymentNumber(r.campaign_name) === 0);

                if (noDeployment) {
                    deduplicated.push(noDeployment);
                } else if (deployment1) {
                    deduplicated.push(deployment1);
                } else {
                    deduplicated.push(group[0]);
                }
            }
        });

        return deduplicated;
    };

    useEffect(() => {
        const fetchReportsData = async () => {
            try {
                const reportsResponse = await fetch(`${API_BASE_URL}/api/cmi/reports/all?days_back=90`);
                const data = await reportsResponse.json();

                const deduplicatedData = deduplicateReports(data);
                setReportsData(deduplicatedData);

                try {
                    const metadataResponse = await fetch(`${API_BASE_URL}/api/campaigns/metadata/all`);
                    if (metadataResponse.ok) {
                        const metadataResult = await metadataResponse.json();
                        if (metadataResult.status === 'success') {
                            setCampaignMetadata(metadataResult.metadata);
                        }
                    }
                } catch (metaError) {
                    console.error('Error fetching campaign metadata:', metaError);
                }

                try {
                    const contractsResponse = await fetch(`${API_BASE_URL}/api/cmi-contracts?year=2025`);
                    if (contractsResponse.ok) {
                        const contractsResult = await contractsResponse.json();
                        if (contractsResult.status === 'success') {
                            setCmiContractValues(contractsResult.contracts);
                        }
                    }
                } catch (contractsError) {
                    console.error('Error fetching CMI contract values:', contractsError);
                }

                try {
                    const noDataResponse = await fetch(`${API_BASE_URL}/api/unified/no-data`);
                    if (noDataResponse.ok) {
                        const noDataResult = await noDataResponse.json();
                        if (noDataResult.status === 'success') {
                            setCmiExpectedNoData({
                                pldAndAgg: noDataResult.pld_and_agg || [],
                                aggOnly: noDataResult.agg_only || [],
                                allExpectedPlacementIds: noDataResult.all_expected_placement_ids || []
                            });
                        }
                    }
                } catch (noDataError) {
                    console.error('Error fetching CMI expected no-data reports:', noDataError);
                }

                try {
                    const brandsResponse = await fetch(`${API_BASE_URL}/api/brands`);
                    if (brandsResponse.ok) {
                        const brandsResult = await brandsResponse.json();
                        if (brandsResult.status === 'success') {
                            setBrandsData(brandsResult.brands || []);
                        }
                    }
                } catch (brandsError) {
                    console.error('Error fetching brands data:', brandsError);
                }

                const newCheckedStates = {};
                const notNeededStates = {};
                deduplicatedData.forEach(report => {
                    if (report.is_submitted && report.id) {
                        const reportId = report.id;
                        newCheckedStates[`${reportId}_week_1`] = true;
                        newCheckedStates[`${reportId}_week_2`] = true;
                        newCheckedStates[`${reportId}_week_3`] = true;
                        if (report.is_no_data_report) {
                            newCheckedStates[`${reportId}_no_data`] = true;
                        }
                    }
                    if (report.is_not_needed && report.id) {
                        notNeededStates[report.id] = true;
                    }
                });
                setNotNeededReports(notNeededStates);

                try {
                    const savedMonthlyStates = JSON.parse(localStorage.getItem('monthlyReportStates') || '{}');
                    Object.assign(newCheckedStates, savedMonthlyStates);
                } catch (e) {
                    console.error('Error loading monthly report states:', e);
                }

                setCheckedReports(newCheckedStates);

            } catch (error) {
                console.error('Error fetching reports data:', error);
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

    const openMoveModal = (report) => {
        setMovingReport(report);
        setMoveNote('');
        setMoveMode('attach');
        setSelectedAttachTarget(null);
        setShowMoveModal(true);
    };

    const closeMoveModal = () => {
        setShowMoveModal(false);
        setMovingReport(null);
        setMoveNote('');
        setMoveMode('attach');
        setSelectedAttachTarget(null);
    };

    const handleMoveToDue = async () => {
        if (!movingReport) return;

        try {
            if (moveMode === 'attach' && selectedAttachTarget) {
                await fetch(`${API_BASE_URL}/api/cmi/expected/${movingReport.id}/attach`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attach_to_campaign_id: selectedAttachTarget.id
                    })
                });

                if (movingReport.contract_metric || movingReport.agg_metric) {
                    await fetch(`${API_BASE_URL}/api/cmi/expected/${movingReport.id}/agg-values`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agg_metric: movingReport.contract_metric || movingReport.agg_metric || '',
                            agg_value: movingReport.agg_value || ''
                        })
                    });
                }

            } else if (moveMode === 'standalone') {
                await fetch(`${API_BASE_URL}/api/cmi/expected/${movingReport.id}/attach`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attach_to_campaign_id: null
                    })
                });

                if (movingReport.contract_metric || movingReport.agg_metric) {
                    await fetch(`${API_BASE_URL}/api/cmi/expected/${movingReport.id}/agg-values`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agg_metric: movingReport.contract_metric || movingReport.agg_metric || '',
                            agg_value: movingReport.agg_value || ''
                        })
                    });
                }
            }

            await fetch(`${API_BASE_URL}/api/cmi/expected/${movingReport.id}/move-to-due`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: moveNote,
                    assigned_campaign_id: selectedAttachTarget?.id
                })
            });

            await refreshAGGData();
        } catch (error) {
            console.error('Error updating backend:', error);
        }

        closeMoveModal();
    };

    const handleDetachAGG = async (campaignId, aggIndex) => {
        const agg = attachedAGGs[campaignId]?.[aggIndex];
        if (agg && agg.id) {
            try {
                await fetch(`${API_BASE_URL}/api/cmi/expected/${agg.id}/detach`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                await refreshAGGData();
            } catch (error) {
                console.error('Error detaching AGG:', error);
            }
        }
    };

    const handleUpdateAttachedAGG = async (campaignId, aggIndex, field, value) => {
        const agg = attachedAGGs[campaignId]?.[aggIndex];
        if (agg && agg.id) {
            const newAttachedAGGs = { ...attachedAGGs };
            newAttachedAGGs[campaignId][aggIndex][field] = value;
            setAttachedAGGs(newAttachedAGGs);

            try {
                await fetch(`${API_BASE_URL}/api/cmi/expected/${agg.id}/agg-values`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agg_metric: field === 'agg_metric' ? value : agg.agg_metric,
                        agg_value: field === 'agg_value' ? value : agg.agg_value
                    })
                });
            } catch (error) {
                console.error('Error updating AGG values:', error);
            }
        }
    };

    const handleUpdateStandaloneAGG = async (index, field, value) => {
        const agg = standaloneAGGs[index];
        if (agg && agg.id) {
            const newStandaloneAGGs = [...standaloneAGGs];
            newStandaloneAGGs[index][field] = value;
            setStandaloneAGGs(newStandaloneAGGs);

            try {
                await fetch(`${API_BASE_URL}/api/cmi/expected/${agg.id}/agg-values`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agg_metric: field === 'agg_metric' ? value : agg.agg_metric,
                        agg_value: field === 'agg_value' ? value : agg.agg_value
                    })
                });
            } catch (error) {
                console.error('Error updating standalone AGG values:', error);
            }
        }
    };

    const handleRemoveStandaloneAGG = async (index) => {
        const agg = standaloneAGGs[index];
        if (agg && agg.id) {
            try {
                await fetch(`${API_BASE_URL}/api/cmi/expected/${agg.id}/detach`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                await refreshAGGData();
            } catch (error) {
                console.error('Error removing standalone AGG:', error);
            }
        }
    };

    const handleMovePLDAGG = async (report) => {
        try {
            await fetch(`${API_BASE_URL}/api/cmi/expected/${report.id}/move-to-due`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            await refreshAGGData();
        } catch (error) {
            console.error('Error moving PLD AGG:', error);
        }
    };

    const handleRemovePLDAGG = async (index) => {
        const report = movedPLDAGGs[index];
        if (report && report.id) {
            try {
                await fetch(`${API_BASE_URL}/api/cmi/expected/${report.id}/detach`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                await refreshAGGData();
            } catch (error) {
                console.error('Error detaching PLD AGG:', error);
            }
        }
    };

    const refreshAGGData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cmi/expected`);
            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success') {
                    const attached = {};
                    const standalone = [];
                    const movedPLD = [];

                    result.reports.forEach(report => {
                        if (report.status === 'moved_to_due' || report.status === 'attached' || report.status === 'standalone') {
                            if (report.attached_to_campaign_id) {
                                if (!attached[report.attached_to_campaign_id]) {
                                    attached[report.attached_to_campaign_id] = [];
                                }
                                attached[report.attached_to_campaign_id].push({
                                    ...report,
                                    brand: report.brand_name,
                                    contract_metric: report.agg_metric || report.contract_metric,
                                    contract_notes: report.contract_notes || report.notes || report.placement_description,
                                    placement_description: report.placement_description,
                                    frequency: report.expected_data_frequency || report.contract_frequency
                                });
                            } else if (report.is_standalone || report.is_agg_only) {
                                standalone.push({
                                    ...report,
                                    brand: report.brand_name,
                                    contract_metric: report.agg_metric || report.contract_metric,
                                    contract_notes: report.contract_notes || report.notes || report.placement_description,
                                    placement_description: report.placement_description,
                                    frequency: report.expected_data_frequency || report.contract_frequency
                                });
                            } else if (!report.is_agg_only && report.data_type !== 'AGG') {
                                movedPLD.push({
                                    ...report,
                                    brand: report.brand_name,
                                    frequency: report.expected_data_frequency || report.contract_frequency
                                });
                            }
                        }
                    });

                    setAttachedAGGs(attached);
                    setStandaloneAGGs(standalone);
                    setMovedPLDAGGs(movedPLD);
                }
            }
        } catch (error) {
            console.error('Error loading AGG data:', error);
        }
    };

    useEffect(() => {
        refreshAGGData();
    }, []);

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

    const isFirstWeekOfMonth = () => {
        const reportingMonday = getCurrentWeekMonday();
        reportingMonday.setDate(reportingMonday.getDate() - 7);

        const dayOfMonth = reportingMonday.getDate();
        return dayOfMonth <= 7;
    };

    const getMonthlyReports = () => {
        if (!isFirstWeekOfMonth()) return [];

        const reportingMonday = getCurrentWeekMonday();
        reportingMonday.setDate(reportingMonday.getDate() - 7);

        const prevMonth = new Date(reportingMonday);
        prevMonth.setMonth(prevMonth.getMonth() - 1);

        const monthName = prevMonth.toLocaleString('default', { month: 'long' });
        const year = prevMonth.getFullYear();

        const monthlyReports = [];

        const castleCampaigns = reportsData.filter(report => {
            if (!report.send_date || report.is_no_data_report) return false;

            const agency = (report.agency || '').toLowerCase();
            if (agency !== 'castle') return false;

            const sendDate = parseSendDate(report.send_date);
            if (!sendDate) return false;

            return sendDate.getMonth() === prevMonth.getMonth() &&
                   sendDate.getFullYear() === prevMonth.getFullYear();
        });

        castleCampaigns.forEach(campaign => {
            monthlyReports.push({
                ...campaign,
                is_monthly_castle: true,
                unique_key: `${campaign.id}_castle_monthly`
            });
        });

        monthlyReports.push({
            id: `iqvia_monthly_${year}_${prevMonth.getMonth()}`,
            campaign_name: `IQVIA Monthly Report - ${monthName} ${year}`,
            brand: 'IQVIA',
            agency: 'IQVIA',
            send_date: reportingMonday.toISOString().split('T')[0],
            is_monthly: true,
            unique_key: `iqvia_monthly_${year}_${prevMonth.getMonth()}`
        });

        return monthlyReports;
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
            (report.campaign_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (report.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (report.agency || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const getCurrentWeekReports = useMemo(() => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const reports = [];
        const isMonthlyWeek = isFirstWeekOfMonth();

        const monthlyReportIds = new Set();
        if (isMonthlyWeek) {
            const reportingMonday = getCurrentWeekMonday();
            reportingMonday.setDate(reportingMonday.getDate() - 7);
            const prevMonth = new Date(reportingMonday);
            prevMonth.setMonth(prevMonth.getMonth() - 1);

            reportsData.forEach(report => {
                const agency = (report.agency || '').toLowerCase();
                if (agency === 'castle' && report.send_date) {
                    const sendDate = parseSendDate(report.send_date);
                    if (sendDate &&
                        sendDate.getMonth() === prevMonth.getMonth() &&
                        sendDate.getFullYear() === prevMonth.getFullYear()) {
                        monthlyReportIds.add(report.id);
                    }
                }
            });
        }

        reportsData.forEach(report => {
            if (report.is_no_data_report) return;
            if (monthlyReportIds.has(report.id)) return;

            const week = getReportWeek(report.send_date);

            if (week !== null) {
                reports.push({
                    ...report,
                    week_number: week,
                    week_range: currentTimeframe,
                    unique_key: `${report.id}_week_${week}`,
                    is_overdue: false
                });
            }
        });

        const monthlyReports = getMonthlyReports();
        monthlyReports.forEach(monthlyReport => {
            reports.push({
                ...monthlyReport,
                week_number: 1,
                week_range: currentTimeframe,
                is_overdue: false,
                is_monthly: true
            });
        });

        return filterReports(reports);
    }, [reportsData, searchTerm, checkedReports]);

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
                    unique_key: `${report.id}_no_data`,
                    data_type: report.cmi_metadata?.data_type || report.data_type || 'Unknown'
                });
            }
        });

        return filterReports(reports);
    }, [reportsData, searchTerm]);

    const dueThisWeekPlacementIds = useMemo(() => {
        const ids = new Set();
        getCurrentWeekReports.forEach(report => {
            const placementId = report.cmi_placement_id || report.cmi_metadata?.cmi_placement_id;
            if (placementId) {
                ids.add(String(placementId));
            }
        });
        return ids;
    }, [getCurrentWeekReports]);

    const campaignsWithExpectedStatus = useMemo(() => {
        return new Set(cmiExpectedNoData.allExpectedPlacementIds || []);
    }, [cmiExpectedNoData.allExpectedPlacementIds]);

    const getAttachableCampaigns = useMemo(() => {
        return getCurrentWeekReports.filter(r => r.agency === 'CMI' && !r.is_no_data_report);
    }, [getCurrentWeekReports]);

    const movedReportIds = useMemo(() => {
        const ids = new Set();

        Object.values(attachedAGGs).forEach(aggList => {
            aggList.forEach(agg => {
                if (agg.id) ids.add(agg.id);
            });
        });

        standaloneAGGs.forEach(agg => {
            if (agg.id) ids.add(agg.id);
        });

        movedPLDAGGs.forEach(report => {
            if (report.id) ids.add(report.id);
        });

        return ids;
    }, [attachedAGGs, standaloneAGGs, movedPLDAGGs]);

    const contractsByPlacementId = useMemo(() => {
        const lookup = {};
        cmiContractValues.forEach(contract => {
            if (contract.placement_id) {
                lookup[String(contract.placement_id)] = contract;
            }
        });
        return lookup;
    }, [cmiContractValues]);

    const getNoDataReportsByType = useMemo(() => {

        const filterMoved = (reports) => {
            return reports.filter(report => !movedReportIds.has(report.id));
        };

        const filterMatched = (reports) => {
            return reports.filter(report => {
                const placementId = report.cmi_placement_id;
                if (!placementId) return true;
                return !dueThisWeekPlacementIds.has(String(placementId));
            });
        };

        const pldAndAgg = filterMatched(filterMoved(cmiExpectedNoData.pldAndAgg || []));
        const aggOnly = filterMatched(filterMoved(cmiExpectedNoData.aggOnly || []));

        const sortByBrand = (a, b) => {
            const brandA = (a.brand || '').toLowerCase();
            const brandB = (b.brand || '').toLowerCase();
            return brandA.localeCompare(brandB);
        };

        pldAndAgg.sort(sortByBrand);
        aggOnly.sort(sortByBrand);

        return { pldAndAgg, aggOnly };
    }, [cmiExpectedNoData, dueThisWeekPlacementIds, movedReportIds]);

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
                        unique_key: `${report.id}_week_${w}`,
                        days_ago: Math.floor((new Date() - mondayFromData) / (24 * 60 * 60 * 1000))
                    });
                }
            }
        });

        return filterReports(expandedReports);
    }, [reportsData, searchTerm]);

    const archiveAgencies = useMemo(() => {
        const agencies = new Set();
        getPastReports.forEach(report => {
            if (report.agency) agencies.add(report.agency);
        });
        return Array.from(agencies).sort((a, b) => {
            if (a === 'CMI') return -1;
            if (b === 'CMI') return 1;
            return a.localeCompare(b);
        });
    }, [getPastReports]);

    const getFilteredArchiveReports = useMemo(() => {
        return getPastReports.filter(r => r.agency === archiveAgencyTab);
    }, [getPastReports, archiveAgencyTab]);

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

    const handleCheckboxChange = async (reportId, week, isMonthlyReport = false) => {
        const key = `${reportId}_week_${week}`;
        const newCheckedState = !checkedReports[key];

        const newStates = {
            ...checkedReports,
            [key]: newCheckedState
        };
        setCheckedReports(newStates);

        if (isMonthlyReport || typeof reportId === 'string') {
            try {
                const savedMonthlyStates = JSON.parse(localStorage.getItem('monthlyReportStates') || '{}');
                savedMonthlyStates[key] = newCheckedState;
                localStorage.setItem('monthlyReportStates', JSON.stringify(savedMonthlyStates));
            } catch (e) {
                console.error('Error saving monthly report state:', e);
            }
            return;
        }

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
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                setCheckedReports(checkedReports);
                console.error('Failed to update submission status:', response.status, errorData);
                alert(`Failed to update: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            setCheckedReports(checkedReports);
            console.error('Error updating submission status:', error);
        }
    };

    const toggleNotNeeded = async (reportId) => {
        const newValue = !notNeededReports[reportId];
        const newNotNeeded = {
            ...notNeededReports,
            [reportId]: newValue
        };
        setNotNeededReports(newNotNeeded);

        try {
            await fetch(`${API_BASE_URL}/api/cmi/reports/${reportId}/not-needed`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_not_needed: newValue })
            });
        } catch (error) {
            console.error('Error updating not-needed status:', error);
            setNotNeededReports(notNeededReports);
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
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                setCheckedReports(checkedReports);
                console.error('Failed to update no-data submission status:', response.status, errorData);
                alert(`Failed to update: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            setCheckedReports(checkedReports);
            console.error('Error updating no-data submission status:', error);
        }
    };

    const generateAgencyJSON = (report, specificWeek = null, overrideMeta = null) => {
        const agency = (report.agency || '').toLowerCase();

        switch(agency) {
            case 'cmi':
                return generateCMIJSON(report, specificWeek, overrideMeta);
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

    const generateCMIJSON = (report, specificWeek = null, overrideMeta = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const baseMeta = findMatchingMetadata(report) || {};
        const manualMeta = manualMetadata[report.id] || {};
        const matchedMeta = overrideMeta || { ...baseMeta, ...manualMeta };

        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ? `${year}-${month}-${day}T23:59:59` : `${year}-${month}-${day}T00:00:00`;
        };

        const getContractInfo = (placementId) => {
            if (!placementId) return null;
            return cmiContractValues.find(c => String(c.placement_id) === String(placementId));
        };

        const buildGcmArray = () => {
            const gcmId = matchedMeta?.gcm_placement_id;
            if (!gcmId) return [];
            if (Array.isArray(gcmId)) return gcmId;
            if (typeof gcmId === 'string') {
                try {
                    const parsed = JSON.parse(gcmId);
                    return Array.isArray(parsed) ? parsed : [gcmId];
                } catch {
                    return gcmId ? [gcmId] : [];
                }
            }
            return [];
        };

        const placementId = matchedMeta?.cmi_placement_id;
        const contractInfo = getContractInfo(placementId);
        const brandName = matchedMeta?.brand_name || contractInfo?.brand || report.brand || '';

        let clientIdValue = '';
        const rawClientId = matchedMeta?.client_id;
        if (rawClientId === true || rawClientId === 'true') {
            clientIdValue = getPharmaCompanyFromBrand(brandName);
        } else if (typeof rawClientId === 'string' && rawClientId.length > 0 && rawClientId !== 'false') {
            clientIdValue = rawClientId;
        }

        return {
            start_date: formatISODateTime(currentTimeframe.start),
            end_date: formatISODateTime(currentTimeframe.end, true),
            cmi_placement_id: matchedMeta?.cmi_placement_id || '',
            client_placement_id: matchedMeta?.client_placement_id || '',
            client_id: clientIdValue,
            client_campaign_name: matchedMeta?.campaign_name_from_file || '',
            target_list_id: matchedMeta?.target_list_id || '',
            creative_code: matchedMeta?.creative_code || '',
            gcm_placement_id: buildGcmArray(),
            brand_name: brandName,
            vehicle_name: matchedMeta?.vehicle_name || contractInfo?.vehicle || '',
            media_tactic_id: matchedMeta?.media_tactic_id || '',
            contract_number: matchedMeta?.contract_number || contractInfo?.contract_number || '',
            placement_description: matchedMeta?.placement_description || contractInfo?.placement_description || '',
            buy_component_type: matchedMeta?.buy_component_type || contractInfo?.buy_component_type || 'e-Newsletters- Targeted/Programmatic',
            metric: contractInfo?.metric || 'Opens_Unique'
        };
    };

    const generateBIJSON = (report, specificWeek = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const cleanedCampaignName = (report.standardized_campaign_name || cleanCampaignName(report.campaign_name || '')).replace(/[():#']/g, '').trim();

        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ?
                `${year}-${month}-${day}T23:59:59` :
                `${year}-${month}-${day}T00:00:00`;
        };

        const monthMatch = cleanedCampaignName.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const monthRaw = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });
        const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1).toLowerCase();

        return {
            "campaigns": [
                {
                    "campaign_name": cleanedCampaignName,
                    "topic_brand": (report.brand || '').toUpperCase(),
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
        const cleanedCampaignName = (report.standardized_campaign_name || cleanCampaignName(report.campaign_name || '')).replace(/[():#']/g, '').trim();

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

        const monthMatch = cleanedCampaignName.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const monthRaw = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });
        const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1).toLowerCase();

        return {
            "folder": month,
            "start_date": formatISODateTime(currentTimeframe.start),
            "end_date": formatISODateTime(currentTimeframe.end, true),
            "internal_campaign_name": cleanedCampaignName,
            "channel_partner": "Matrix_Medical",
            "channel": "EM",
            "brand_name": (report.brand || '').toUpperCase(),
            "promotion_type": "Branded",
            "campaign_target_date": formatDate(currentTimeframe.start),
            "campaign_code": `${(report.brand || '').toUpperCase()}11778`,
            "offer_name": `${(report.brand || '').toUpperCase()} MATRIX_EM`,
            "offer_code": "CampOffer-08492",
            "vendor_code": "VC-00103",
            "tactic_name": `${(report.brand || '').toUpperCase()} EMAIL`,
            "tactic_id": "Tactic-019998",
            "contact_filename_base": "CONTACT_DATA",
            "response_filename_base": "RESPONSE",
            "aggregate_filename_base": "AggReport"
        };
    };

    const generateOrthoJSON = (report, specificWeek = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const cleanedCampaignName = (report.standardized_campaign_name || cleanCampaignName(report.campaign_name || '')).replace(/[():#']/g, '').trim();

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

        const monthMatch = cleanedCampaignName.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const monthRaw = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });
        const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1).toLowerCase();
        const today = new Date();

        return {
            "internal_campaign_name": cleanedCampaignName,
            "folder": month,
            "finalFileName": "Ortho_PLD_",
            "aggFileName": "Ortho_AGG_",
            "campaginMonth": formatDate(currentTimeframe.start).substring(0, 6),
            "date": `${currentTimeframe.start.getMonth() + 1}/${currentTimeframe.start.getDate()}/${currentTimeframe.start.getFullYear()}`,
            "dateOfSubmission": formatDate(today),
            "start_date": formatISODateTime(currentTimeframe.start),
            "end_date": formatISODateTime(currentTimeframe.end, true)
        };
    };

    const generateDefaultJSON = (report, specificWeek = null) => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const cleanedCampaignName = (report.standardized_campaign_name || cleanCampaignName(report.campaign_name || '')).replace(/[():#']/g, '').trim();

        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ?
                `${year}-${month}-${day}T23:59:59` :
                `${year}-${month}-${day}T00:00:00`;
        };

        const monthMatch = cleanedCampaignName.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const monthRaw = monthMatch ? monthMatch[0] : currentTimeframe.start.toLocaleString('default', { month: 'long' });
        const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1).toLowerCase();

        return {
            "folder": month,
            "internal_campaign_name": cleanedCampaignName,
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

    const generateBatchCMIJSON = () => {
        const currentTimeframe = getCurrentWeekTimeframe();
        const cmiReports = getCurrentWeekReports.filter(r => r.agency === 'CMI' && !r.is_no_data_report && !notNeededReports[r.id]);
        const sortedCMIReports = sortReports(cmiReports);

        const cleanName = (name) => {
            if (!name) return '';
            return name.replace(/[():#']/g, '').replace(/\s+/g, ' ').trim();
        };

        const formatISODateTime = (date, isEndOfDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return isEndOfDay ?
                `${year}-${month}-${day}T23:59:59` :
                `${year}-${month}-${day}T00:00:00`;
        };

        const getContractInfo = (placementId) => {
            if (!placementId) return null;
            return cmiContractValues.find(c => String(c.placement_id) === String(placementId));
        };

        const buildGcmArray = (meta) => {
            if (!meta?.gcm_placement_id) return [];

            const gcmId = meta.gcm_placement_id;
            if (Array.isArray(gcmId)) return gcmId;

            if (typeof gcmId === 'string') {
                try {
                    const parsed = JSON.parse(gcmId);
                    return Array.isArray(parsed) ? parsed : [gcmId];
                } catch {
                    return gcmId ? [gcmId] : [];
                }
            }
            return [];
        };

        const campaigns = {};
        sortedCMIReports.forEach(report => {
            const baseMeta = findMatchingMetadata(report) || {};
            const manualMeta = manualMetadata[report.id] || {};
            const matchedMeta = { ...baseMeta, ...manualMeta };
            const campaignName = cleanName(report.standardized_campaign_name || report.campaign_name || '');
            const placementId = matchedMeta?.cmi_placement_id;
            const contractInfo = getContractInfo(placementId);
            const brandName = matchedMeta?.brand_name || report.brand || '';

            let clientIdValue = '';
            const rawClientId = matchedMeta?.client_id;
            if (rawClientId === true || rawClientId === 'true') {
                clientIdValue = getPharmaCompanyFromBrand(brandName);
            } else if (typeof rawClientId === 'string' && rawClientId.length > 0 && rawClientId !== 'false') {
                clientIdValue = rawClientId;
            }

            campaigns[campaignName] = {
                cmi_placement_id: matchedMeta?.cmi_placement_id || '',
                client_placement_id: matchedMeta?.client_placement_id || '',
                client_id: clientIdValue,
                client_campaign_name: matchedMeta?.campaign_name_from_file || '',
                target_list_id: matchedMeta?.target_list_id || '',
                creative_code: matchedMeta?.creative_code || '',
                gcm_placement_id: buildGcmArray(matchedMeta),
                brand_name: brandName,
                vehicle_name: matchedMeta?.vehicle_name || contractInfo?.vehicle || '',
                media_tactic_id: matchedMeta?.media_tactic_id || '',
                contract_number: matchedMeta?.contract_number || contractInfo?.contract_number || '',
                placement_description: matchedMeta?.placement_description || contractInfo?.placement_description || '',
                buy_component_type: matchedMeta?.buy_component_type || contractInfo?.buy_component_type || 'e-Newsletters- Targeted/Programmatic',
                metric: contractInfo?.metric || 'Opens_Unique'
            };
        });

        const aggregate = {};
        const allAggs = [...Object.values(attachedAGGs).flat(), ...standaloneAGGs];
        allAggs.forEach(agg => {
            const contractInfo = getContractInfo(agg.cmi_placement_id);
            const aggName = cleanName(agg.notes || agg.placement_description || `${agg.brand || ''} - ${agg.cmi_placement_id || ''}`);

            aggregate[aggName] = {
                cmi_placement_id: agg.cmi_placement_id || '',
                creative_code: '',
                gcm_placement_id: [],
                brand_name: agg.brand || contractInfo?.brand || '',
                vehicle_name: agg.vehicle || contractInfo?.vehicle || '',
                media_tactic_id: agg.media_tactic_id || '',
                contract_number: agg.contract_number || contractInfo?.contract_number || '',
                placement_description: agg.placement_description || contractInfo?.placement_description || '',
                buy_component_type: agg.buy_component_type || contractInfo?.buy_component_type || '',
                metric: agg.agg_metric || agg.contract_metric || contractInfo?.metric || '',
                value: agg.agg_value || ''
            };
        });

        const pldNoData = {};
        const aggNoData = {};

        const pldAndAggReports = getNoDataReportsByType.pldAndAgg || [];
        const aggOnlyReports = getNoDataReportsByType.aggOnly || [];

        pldAndAggReports.forEach(report => {
            const contractInfo = getContractInfo(report.cmi_placement_id);
            const name = cleanName(report.contract_notes || report.brand || `${report.cmi_placement_id || ''}`);
            const baseEntry = {
                cmi_placement_id: report.cmi_placement_id || '',
                client_placement_id: report.client_placement_id || '',
                brand_name: report.brand || contractInfo?.brand || '',
                vehicle_name: report.vehicle || contractInfo?.vehicle || '',
                media_tactic_id: report.media_tactic_id || '',
                contract_number: report.contract_number || contractInfo?.contract_number || '',
                placement_description: report.placement_description || contractInfo?.placement_description || '',
                buy_component_type: report.buy_component_type || contractInfo?.buy_component_type || '',
                gcm_placement_id: [],
                target_list_id: '',
                creative_code: ''
            };

            pldNoData[name] = baseEntry;

            const dataType = (contractInfo?.data_type || '').toUpperCase();
            if (dataType.includes('AGG')) {
                aggNoData[`${name} AGG`] = {
                    ...baseEntry,
                    metric: report.contract_metric || contractInfo?.metric || ''
                };
            }
        });

        aggOnlyReports.forEach(report => {
            const contractInfo = getContractInfo(report.cmi_placement_id);
            const name = cleanName(report.contract_notes || report.brand || `${report.cmi_placement_id || ''}`);
            aggNoData[name] = {
                cmi_placement_id: report.cmi_placement_id || '',
                client_placement_id: report.client_placement_id || '',
                brand_name: report.brand || contractInfo?.brand || '',
                vehicle_name: report.vehicle || contractInfo?.vehicle || '',
                media_tactic_id: report.media_tactic_id || '',
                contract_number: report.contract_number || contractInfo?.contract_number || '',
                placement_description: report.placement_description || contractInfo?.placement_description || '',
                buy_component_type: report.buy_component_type || contractInfo?.buy_component_type || '',
                gcm_placement_id: [],
                target_list_id: '',
                creative_code: '',
                metric: report.contract_metric || contractInfo?.metric || ''
            };
        });

        const result = {
            start_date: formatISODateTime(currentTimeframe.start),
            end_date: formatISODateTime(currentTimeframe.end, true),
            campaigns
        };

        if (Object.keys(aggregate).length > 0) {
            result.aggregate = aggregate;
        }

        if (Object.keys(pldNoData).length > 0) {
            result.pld_no_data = pldNoData;
        }

        if (Object.keys(aggNoData).length > 0) {
            result.agg_no_data = aggNoData;
        }

        return result;
    };

    const openBatchCMIModal = () => {
        const batchData = generateBatchCMIJSON();
        setBatchCMIJSON(batchData);
        setShowBatchModal(true);
    };

    const copyBatchToClipboard = async () => {
        try {
            const jsonToCopy = isEditingBatchJSON ? editedBatchJSON : JSON.stringify(batchCMIJSON, null, 4);
            await navigator.clipboard.writeText(jsonToCopy);
            const button = document.querySelector('.batch-modal-copy-btn');
            if (button) {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    const openCMIModal = async (report, specificWeek = null, campaignsList = null) => {
        const matchedMeta = findMatchingMetadata(report);
        const manualMeta = manualMetadata[report.id];
        const hasMetadata = matchedMeta || manualMeta;

        if (!hasMetadata && report.agency === 'CMI') {
            setPlacementIdReport(report);
            setPlacementIdInput('');
            setShowPlacementIdModal(true);
            return;
        }

        const jsonData = generateAgencyJSON(report, specificWeek);
        const confidence = matchedMeta?.match_confidence !== undefined
            ? (matchedMeta.match_confidence * 100).toFixed(0) + '%'
            : manualMeta ? 'Manual' : 'N/A';
        setSelectedCMIReport({ ...jsonData, _confidence: confidence, _report: report });
        setEditFormData(jsonData);
        setEditedJSON(JSON.stringify(jsonData, null, 2));
        setModalViewMode('layout');
        setShowModal(true);

        if (campaignsList) {
            setNavigableCampaigns(campaignsList);
            const idx = campaignsList.findIndex(c => c.id === report.id || c.campaign_id === report.campaign_id);
            setCurrentCampaignIndex(idx >= 0 ? idx : 0);
        }

        if (jsonData.brand_name) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/campaigns/gcm/placements?brand=${encodeURIComponent(jsonData.brand_name)}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.status === 'success') {
                        setGcmPlacements(result.placements || []);
                    }
                }
            } catch (e) {}
        }
    };

    const navigateCampaign = (direction) => {
        if (navigableCampaigns.length === 0) return;

        let newIndex = currentCampaignIndex;
        if (direction === 'prev' && currentCampaignIndex > 0) {
            newIndex = currentCampaignIndex - 1;
        } else if (direction === 'next' && currentCampaignIndex < navigableCampaigns.length - 1) {
            newIndex = currentCampaignIndex + 1;
        }

        if (newIndex !== currentCampaignIndex) {
            const nextReport = navigableCampaigns[newIndex];
            setCurrentCampaignIndex(newIndex);

            const matchedMeta = findMatchingMetadata(nextReport);
            const manualMeta = manualMetadata[nextReport.id];
            const jsonData = generateAgencyJSON(nextReport);
            const confidence = matchedMeta?.match_confidence !== undefined
                ? (matchedMeta.match_confidence * 100).toFixed(0) + '%'
                : manualMeta ? 'Manual' : 'N/A';

            setSelectedCMIReport({ ...jsonData, _confidence: confidence, _report: nextReport });
            setEditFormData(jsonData);
            setEditedJSON(JSON.stringify(jsonData, null, 2));
        }
    };

    const handlePlacementIdSubmit = async () => {
        if (!placementIdInput || !placementIdReport) return;

        const contractData = cmiContractValues.find(c => String(c.placement_id) === String(placementIdInput));

        const newManualMeta = {
            cmi_placement_id: placementIdInput,
            brand_name: contractData?.brand || placementIdReport.brand || '',
            vehicle_name: contractData?.vehicle || '',
            contract_number: contractData?.contract_number || '',
            placement_description: contractData?.placement_description || '',
            buy_component_type: contractData?.buy_component_type || '',
            client: contractData?.client || '',
            frequency: contractData?.frequency || '',
            metric: contractData?.metric || '',
            notes: contractData?.notes || ''
        };

        try {
            await fetch(`${API_BASE_URL}/api/cmi/reports/${placementIdReport.id}/placement`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cmi_placement_id: placementIdInput })
            });
        } catch (error) {
            console.error('Error saving placement ID:', error);
        }

        const updatedManualMetadata = {
            ...manualMetadata,
            [placementIdReport.id]: newManualMeta
        };
        setManualMetadata(updatedManualMetadata);
        localStorage.setItem('manualMetadata', JSON.stringify(updatedManualMetadata));

        setShowPlacementIdModal(false);

        const jsonData = generateAgencyJSON(placementIdReport, null, newManualMeta);
        setSelectedCMIReport({ ...jsonData, _confidence: 'Manual', _report: placementIdReport });
        setShowModal(true);

        setPlacementIdReport(null);
        setPlacementIdInput('');
    };

    const copyToClipboard = async () => {
        try {
            const jsonToCopy = isEditingJSON
                ? editedJSON
                : JSON.stringify(Object.fromEntries(
                    Object.entries(selectedCMIReport).filter(([key]) => !key.startsWith('_'))
                  ), null, 2);
            await navigator.clipboard.writeText(jsonToCopy);
            const button = document.querySelector('.json-modal-copy-btn:not(.batch-modal-copy-btn)');
            if (button) {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    useEffect(() => {
        if (showModal && selectedCMIReport) {
            const jsonStr = JSON.stringify(
                Object.fromEntries(
                    Object.entries(selectedCMIReport).filter(([key]) => !key.startsWith('_'))
                ),
                null,
                2
            );
            setEditedJSON(jsonStr);
            setIsEditingJSON(false);
        }
    }, [showModal, selectedCMIReport]);

    useEffect(() => {
        if (showBatchModal && batchCMIJSON) {
            setEditedBatchJSON(JSON.stringify(batchCMIJSON, null, 4));
            setIsEditingBatchJSON(false);
        }
    }, [showBatchModal, batchCMIJSON]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showModal || showGcmSelectionModal) return;

            if (e.key === 'ArrowLeft' && currentCampaignIndex > 0) {
                e.preventDefault();
                navigateCampaign('prev');
            } else if (e.key === 'ArrowRight' && currentCampaignIndex < navigableCampaigns.length - 1) {
                e.preventDefault();
                navigateCampaign('next');
            } else if (e.key === 'Escape') {
                setShowModal(false);
            }
        };

        if (showModal) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showModal, showGcmSelectionModal, currentCampaignIndex, navigableCampaigns.length]);

    const handleGcmUpload = async () => {
        if (!gcmUploadFile || !gcmUploadBrand) {
            setGcmUploadStatus('Please select a file and enter a brand name');
            return;
        }

        const formData = new FormData();
        formData.append('tags_file', gcmUploadFile);
        formData.append('brand', gcmUploadBrand);

        setGcmUploadStatus('Uploading...');

        try {
            const response = await fetch(`${API_BASE_URL}/api/campaigns/gcm/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.status === 'success') {
                setGcmUploadStatus(`Uploaded ${result.count} placements for ${result.brand}`);
                setGcmUploadFile(null);
                setGcmUploadBrand('');

                if (editFormData.brand_name && editFormData.brand_name.toLowerCase().includes(gcmUploadBrand.toLowerCase())) {
                    const placementsResponse = await fetch(`${API_BASE_URL}/api/campaigns/gcm/placements?brand=${encodeURIComponent(editFormData.brand_name)}`);
                    if (placementsResponse.ok) {
                        const placementsResult = await placementsResponse.json();
                        if (placementsResult.status === 'success') {
                            setGcmPlacements(placementsResult.placements || []);
                        }
                    }
                }
            } else {
                setGcmUploadStatus(`Error: ${result.message}`);
            }
        } catch (error) {
            setGcmUploadStatus(`Error: ${error.message}`);
        }
    };

    const saveEditFormChanges = async () => {
        const reportId = selectedCMIReport?._report?.id;

        if (reportId) {
            const updatedManualMetadata = {
                ...manualMetadata,
                [reportId]: {
                    ...manualMetadata[reportId],
                    cmi_placement_id: editFormData.cmi_placement_id,
                    client_placement_id: editFormData.client_placement_id,
                    target_list_id: editFormData.target_list_id,
                    creative_code: editFormData.creative_code,
                    gcm_placement_id: editFormData.gcm_placement_id,
                    client_id: editFormData.client_id,
                    brand_name: editFormData.brand_name,
                    vehicle_name: editFormData.vehicle_name,
                    placement_description: editFormData.placement_description,
                    buy_component_type: editFormData.buy_component_type,
                    media_tactic_id: editFormData.media_tactic_id,
                    contract_number: editFormData.contract_number
                }
            };
            setManualMetadata(updatedManualMetadata);
            localStorage.setItem('manualMetadata', JSON.stringify(updatedManualMetadata));
        }

        const jsonStr = JSON.stringify(editFormData, null, 2);
        setEditedJSON(jsonStr);
        setShowModal(false);
    };

    const openGcmSelectionModal = (campaignId, meta) => {
        const gcmArray = meta?.gcm_placement_id_array || [];
        const gcmDescriptions = meta?.gcm_placement_id_description || [];

        let currentSelected = [];
        if (meta?.gcm_placement_id) {
            const gcmId = meta.gcm_placement_id;
            if (Array.isArray(gcmId)) {
                currentSelected = gcmId;
            } else if (typeof gcmId === 'string') {
                try {
                    const parsed = JSON.parse(gcmId);
                    currentSelected = Array.isArray(parsed) ? parsed : [gcmId];
                } catch {
                    currentSelected = gcmId ? [gcmId] : [];
                }
            }
        }

        setGcmSelectionData({
            campaignId,
            gcmArray,
            gcmDescriptions,
            selectedIds: currentSelected
        });
        setShowGcmSelectionModal(true);
    };

    const toggleGcmSelection = (gcmId) => {
        setGcmSelectionData(prev => {
            const isSelected = prev.selectedIds.includes(gcmId);
            let newSelected;
            if (isSelected) {
                newSelected = prev.selectedIds.filter(id => id !== gcmId);
            } else {
                if (prev.selectedIds.length >= 2) {
                    newSelected = [prev.selectedIds[1], gcmId];
                } else {
                    newSelected = [...prev.selectedIds, gcmId];
                }
            }
            return { ...prev, selectedIds: newSelected };
        });
    };

    const saveGcmSelection = async () => {
        setEditFormData(prev => ({
            ...prev,
            gcm_placement_id: gcmSelectionData.selectedIds
        }));

        if (gcmSelectionData.campaignId) {
            try {
                await fetch(`${API_BASE_URL}/api/campaigns/${gcmSelectionData.campaignId}/gcm-selection`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gcm_placement_id: gcmSelectionData.selectedIds })
                });

                const metadataResponse = await fetch(`${API_BASE_URL}/api/campaigns/metadata/all`);
                if (metadataResponse.ok) {
                    const metadataResult = await metadataResponse.json();
                    if (metadataResult.status === 'success') {
                        setCampaignMetadata(metadataResult.metadata);
                    }
                }
            } catch (error) {
                console.error('Error saving GCM selection:', error);
            }
        }

        setShowGcmSelectionModal(false);
    };

    const updateEditFormField = (field, value) => {
        setEditFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const lookupAndFillFromContract = (placementId) => {
        if (!placementId) return;
        const contract = cmiContractValues.find(c => String(c.placement_id) === String(placementId));
        if (contract) {
            setEditFormData(prev => ({
                ...prev,
                brand_name: contract.brand || prev.brand_name,
                vehicle_name: contract.vehicle || prev.vehicle_name,
                contract_number: contract.contract_number || prev.contract_number,
                placement_description: contract.placement_description || prev.placement_description,
                buy_component_type: contract.buy_component_type || prev.buy_component_type,
                media_tactic_id: contract.media_tactic_id || prev.media_tactic_id
            }));
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

    const renderNoDataReportRow = (report, rowIndex, isPLDAGG = false) => {
        const placementId = report.cmi_placement_id || '';
        const displayName = `${report.brand || 'Unknown'}${placementId ? ` - ${placementId}` : ''}`;
        const frequency = report.frequency || '';
        const metric = report.contract_metric || '';
        const notes = report.contract_notes || '';
        const hasContractMatch = report.has_contract_match;
        const uniqueKey = report.unique_key || `expected_${report.id}_${placementId}`;

        return (
            <tr key={uniqueKey} className={`report-row no-data-row ${rowIndex % 2 === 0 ? 'even-row' : 'odd-row'} ${hasContractMatch ? 'has-contract' : 'no-contract'}`}>
                <td className="campaign-column">
                    <div className="no-data-info">
                        <span className="no-data-brand" title={displayName}>
                            {displayName}
                        </span>
                    </div>
                </td>
                <td className="no-data-frequency-column">
                    {frequency && <span className={`frequency-badge frequency-${frequency.toLowerCase()}`}>{frequency}</span>}
                </td>
                <td className="no-data-metric-column">
                    {metric && <span className="reports-metric-value">{metric}</span>}
                </td>
                <td className="no-data-notes-column">
                    {notes && (
                        <span className="no-data-notes-text">
                            {notes}
                        </span>
                    )}
                </td>
                <td className="no-data-status-column">
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            checked={checkedReports[`${report.id}_no_data`] || false}
                            onChange={() => handleNoDataCheckboxChange(report.id)}
                        />
                        <span className="checkmark"></span>
                    </label>
                </td>
                <td className="no-data-action-column">
                    {isPLDAGG ? (
                        <button
                            className="move-to-due-btn pld-agg-move-btn"
                            onClick={() => handleMovePLDAGG(report)}
                            title="Move to Due This Week"
                        >
                            Move
                        </button>
                    ) : (
                        <button
                            className="move-to-due-btn"
                            onClick={() => openMoveModal(report)}
                            title="Assign to campaign"
                        >
                            Assign
                        </button>
                    )}
                </td>
            </tr>
        );
    };

    const renderCurrentReportRow = (report, rowIndex, allReports) => {
        const isMonthly = report.is_monthly || report.is_monthly_castle;
        const isCMI = report.agency === 'CMI';

        const matchedMeta = findMatchingMetadata(report);
        const manualMeta = manualMetadata[report.id];
        const placementId = report.cmi_placement_id ||
                           report.cmi_metadata?.cmi_placement_id ||
                           matchedMeta?.cmi_placement_id ||
                           manualMeta?.cmi_placement_id;
        const isCMIExpected = isCMI && placementId && campaignsWithExpectedStatus.has(String(placementId));

        const week1Explicitly = checkedReports[`${report.id}_week_1`];
        const week2Explicitly = checkedReports[`${report.id}_week_2`];
        const week3Checked = checkedReports[`${report.id}_week_3`] || false;

        const week1Checked = report.week_number > 1 ? (week1Explicitly !== false) : (week1Explicitly || false);
        const week2Checked = report.week_number > 2 ? (week2Explicitly !== false) : (week2Explicitly || false);

        const week1Overdue = report.week_number > 1 && week1Explicitly === false;
        const week2Overdue = report.week_number > 2 && week2Explicitly === false;
        const hasOverdue = week1Overdue || week2Overdue;

        const renderWeekCell = (weekNum, isChecked, isPreviousWeek = false, isOverdue = false) => {
            if (isPreviousWeek && isChecked) {
                return (
                    <span
                        className="completed-icon-clickable"
                        onDoubleClick={() => handleCheckboxChange(report.id, weekNum, isMonthly)}
                        title="Double-click to uncheck"
                    >
                        <CheckCircle size={18} className="completed-icon" />
                    </span>
                );
            } else if (isPreviousWeek && !isChecked) {
                return (
                    <label className="checkbox-container overdue-checkbox">
                        <input
                            type="checkbox"
                            checked={false}
                            onChange={() => handleCheckboxChange(report.id, weekNum, isMonthly)}
                        />
                        <span className="checkmark overdue"></span>
                    </label>
                );
            } else {
                return (
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(report.id, weekNum, isMonthly)}
                        />
                        <span className="checkmark"></span>
                    </label>
                );
            }
        };

        const campaignAttachedAGGs = attachedAGGs[report.id] || [];
        const hasAttachedAGGs = campaignAttachedAGGs.length > 0;

        const isMissingPlacementId = isCMI && !placementId;
        const isNotNeeded = notNeededReports[report.id];

        return (
            <React.Fragment key={report.unique_key}>
                <tr className={`report-row ${rowIndex % 2 === 0 ? 'even-row' : 'odd-row'} ${isCMIExpected ? 'cmi-expected-row' : ''} ${hasAttachedAGGs ? 'has-attached-aggs' : ''} ${isMissingPlacementId ? 'missing-placement-id' : ''} ${isNotNeeded ? 'not-needed-row' : ''}`}>
                    <td className="campaign-column">
                        <div
                            className="reports-campaign-text clickable-campaign"
                            onClick={() => openCMIModal(report, null, allReports.filter(r => r.agency === 'CMI'))}
                            title={report.campaign_name}
                        >
                            <span className="reports-campaign-name" title={report.campaign_name}>
                                {cleanCampaignName(report.campaign_name)}
                            </span>
                            {isCMIExpected && (
                                <span className="cmi-expected-badge" title="CMI expects this report">
                                    Expected
                                </span>
                            )}
                            {isMissingPlacementId && (
                                <span className="missing-placement-badge" title="Click to enter CMI Placement ID">
                                    No ID
                                </span>
                            )}
                            {hasAttachedAGGs && (
                                <span className="attached-agg-badge" title={`${campaignAttachedAGGs.length} AGG report(s) attached`}>
                                    +{campaignAttachedAGGs.length} AGG
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="brand-column">{report.brand || '-'}</td>
                    <td className="agency-column">
                        <span
                            className={`agency-badge ${(report.agency || '').toLowerCase()} clickable-agency ${isNotNeeded ? 'not-needed' : ''}`}
                            onClick={() => toggleNotNeeded(report.id)}
                            title={isNotNeeded ? "Click to mark as needed" : "Click to mark as not needed"}
                        >
                            {report.agency || '-'}
                        </span>
                    </td>
                    <td className={`date-column-report ${hasOverdue ? 'overdue-date' : ''}`}>
                        {formatSendDate(report.send_date)}
                    </td>
                <td className="week-column">
                    {isNotNeeded ? (
                        <span className="week-inactive">-</span>
                    ) : isMonthly ? (
                        renderWeekCell(1, week1Checked, false)
                    ) : report.week_number >= 1 ? (
                        renderWeekCell(1, week1Checked, report.week_number > 1, week1Overdue)
                    ) : (
                        <span className="week-inactive">-</span>
                    )}
                </td>
                <td className="week-column">
                    {isNotNeeded ? (
                        <span className="week-inactive">-</span>
                    ) : isMonthly ? (
                        <span className="week-inactive"></span>
                    ) : report.week_number >= 2 ? (
                        renderWeekCell(2, week2Checked, report.week_number > 2, week2Overdue)
                    ) : (
                        <span className="week-inactive">-</span>
                    )}
                </td>
                    <td className="week-column">
                        {isNotNeeded ? (
                            <span className="week-inactive">-</span>
                        ) : isMonthly ? (
                            <span className="week-inactive"></span>
                        ) : report.week_number >= 3 ? (
                            renderWeekCell(3, week3Checked, false)
                        ) : (
                            <span className="week-inactive">-</span>
                        )}
                    </td>
                </tr>
                {campaignAttachedAGGs.map((agg, aggIndex) => {
                    const notes = agg.contract_notes || agg.notes || agg.placement_description || '';
                    return (
                        <tr key={`${report.unique_key}_agg_${aggIndex}`} className="agg-report-row attached-agg-row">
                            <td className="campaign-column">
                                <div className="agg-notes-cell attached">
                                    <span className="attached-agg-indicator">└─</span>
                                    {notes || <span className="no-notes">-</span>}
                                </div>
                            </td>
                            <td className="brand-column">
                                <span className="agg-brand-text">{agg.brand || 'Unknown'}</span>
                            </td>
                            <td className="agency-column">
                                <span className="agency-badge cmi">CMI</span>
                            </td>
                            <td className="date-column-report">
                                <input
                                    type="text"
                                    className="agg-value-input-styled"
                                    placeholder="Value"
                                    value={agg.agg_value || ''}
                                    onChange={(e) => handleUpdateAttachedAGG(report.id, aggIndex, 'agg_value', e.target.value)}
                                />
                            </td>
                            <td className="week-column"></td>
                            <td className="week-column"></td>
                            <td className="week-column">
                                <button
                                    className="agg-remove-btn"
                                    onClick={() => handleDetachAGG(report.id, aggIndex)}
                                    title="Remove"
                                >
                                    <X size={14} />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </React.Fragment>
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
                        <span>Current Week ({getCurrentWeekReports.length})</span>
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'archive' ? 'active' : ''}`}
                        onClick={() => handleTabChange('archive')}
                    >
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
                        <div className="reports-section-header">
                            <h3>Campaign Reports Due This Week</h3>
                            <div className="reports-header-stats">
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Total:</span>
                                    <span className="reports-header-stat-value">{allCurrentReports.length}</span>
                                </span>
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">CMI:</span>
                                    <span className="reports-header-stat-value reports-header-cmi">
                                        {allCurrentReports.filter(r => r.agency === 'CMI').length}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="table-container table-rounded">
                            <table className="reports-table">
                                <thead>
                                    <tr>
                                        <th className="campaign-header">Campaign</th>
                                        <th
                                            className={`brand-header sortable ${sortBy === 'brand' ? 'sorted' : ''}`}
                                            onClick={() => handleSort('brand')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            Brand {sortBy === 'brand' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="agency-header">Agency</th>
                                        <th
                                            className={`date-header sortable ${sortBy === 'send_date' ? 'sorted' : ''}`}
                                            onClick={() => handleSort('send_date')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            Send Date {sortBy === 'send_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
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
                                                        {searchTerm ? 'No matching reports' : 'No reports due this week'}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const sortedReports = sortReports(paginatedCurrentReports);

                                        const groupedReports = sortedReports.reduce((acc, report) => {
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
                                                    <td className="report-agency-section-title">
                                                        {agency === 'CMI' ? (
                                                            <span
                                                                className={`agency-badge ${agency.toLowerCase()} clickable-badge`}
                                                                onClick={openBatchCMIModal}
                                                                title="Click to view batch JSON for all CMI campaigns"
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                {agency}
                                                            </span>
                                                        ) : (
                                                            <span className={`agency-badge ${agency.toLowerCase()}`}>{agency}</span>
                                                        )}
                                                        <span className="agency-count">({groupedReports[agency].length} reports)</span>
                                                    </td>
                                                    <td className="agency-section-empty"></td>
                                                    <td className="agency-section-empty"></td>
                                                    <td className="agency-section-empty"></td>
                                                    <td className="agency-section-empty"></td>
                                                    <td className="agency-section-empty"></td>
                                                    <td className="agency-section-empty"></td>
                                                </tr>
                                                {groupedReports[agency].map((report) => {
                                                    const row = renderCurrentReportRow(report, globalIndex, paginatedCurrentReports);
                                                    globalIndex++;
                                                    return row;
                                                })}
                                                {agency === 'CMI' && standaloneAGGs.map((agg, index) => {
                                                    const notes = agg.contract_notes || agg.notes || agg.placement_description || '';
                                                    return (
                                                        <tr key={`standalone_agg_${index}`} className="agg-report-row standalone-agg-row">
                                                            <td className="campaign-column">
                                                                <div className="agg-notes-cell">
                                                                    <span className="standalone-agg-badge">Standalone</span>
                                                                    {notes || <span className="no-notes">-</span>}
                                                                </div>
                                                            </td>
                                                            <td className="brand-column">
                                                                <span className="agg-brand-text">{agg.brand || 'Unknown'}</span>
                                                            </td>
                                                            <td className="agency-column">
                                                                <span className="agency-badge cmi">CMI</span>
                                                            </td>
                                                            <td className="date-column-report">
                                                                <input
                                                                    type="text"
                                                                    className="agg-value-input-styled"
                                                                    placeholder="Value"
                                                                    value={agg.agg_value || ''}
                                                                    onChange={(e) => handleUpdateStandaloneAGG(index, 'agg_value', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="week-column"></td>
                                                            <td className="week-column"></td>
                                                            <td className="week-column">
                                                                <button
                                                                    className="agg-remove-btn"
                                                                    onClick={() => handleRemoveStandaloneAGG(index)}
                                                                    title="Remove"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {agency === 'CMI' && movedPLDAGGs.map((report, index) => {
                                                    const notes = report.contract_notes || report.notes || report.placement_description || '';
                                                    return (
                                                        <tr key={`pld_agg_${index}`} className="pld-agg-report-row">
                                                            <td className="campaign-column">
                                                                <div className="agg-notes-cell">
                                                                    <span className="pld-agg-badge">PLD & AGG</span>
                                                                    {notes || <span className="no-notes">-</span>}
                                                                </div>
                                                            </td>
                                                            <td className="brand-column">
                                                                <span className="agg-brand-text">{report.brand || 'Unknown'}</span>
                                                            </td>
                                                            <td className="agency-column">
                                                                <span className="agency-badge cmi">CMI</span>
                                                            </td>
                                                            <td className="date-column-report"></td>
                                                            <td className="week-column"></td>
                                                            <td className="week-column"></td>
                                                            <td className="week-column">
                                                                <button
                                                                    className="agg-remove-btn"
                                                                    onClick={() => handleRemovePLDAGG(index)}
                                                                    title="Remove"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
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

                        {(getNoDataReportsByType.pldAndAgg.length > 0 || getNoDataReportsByType.aggOnly.length > 0) && (
                            <>
                                {getNoDataReportsByType.aggOnly.length > 0 && (
                                    <div className="no-data-reports-section" style={{ marginTop: '40px' }}>
                                        <div className="reports-section-header">
                                            <h3>No Data to Report - AGG Only</h3>
                                            <div className="reports-header-stats">
                                                <span className="reports-header-stat-item">
                                                    <span className="reports-header-stat-label">Total:</span>
                                                    <span className="reports-header-stat-value">{getNoDataReportsByType.aggOnly.length}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="table-container table-rounded">
                                            <table className="reports-table no-data-table">
                                                <thead>
                                                    <tr>
                                                        <th className="campaign-header">Brand - Placement ID</th>
                                                        <th className="frequency-header">Frequency</th>
                                                        <th className="metric-header">Metric</th>
                                                        <th className="notes-header">Notes</th>
                                                        <th className="status-header">Confirmed</th>
                                                        <th className="attach-header">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getNoDataReportsByType.aggOnly.map((report, index) => renderNoDataReportRow(report, index, false))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {getNoDataReportsByType.pldAndAgg.length > 0 && (
                                    <div className="no-data-reports-section" style={{ marginTop: '40px' }}>
                                        <div className="reports-section-header">
                                            <h3>No Data to Report - PLD & AGG</h3>
                                            <div className="reports-header-stats">
                                                <span className="reports-header-stat-item">
                                                    <span className="reports-header-stat-label">Total:</span>
                                                    <span className="reports-header-stat-value">{getNoDataReportsByType.pldAndAgg.length}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="table-container table-rounded">
                                            <table className="reports-table no-data-table">
                                                <thead>
                                                    <tr>
                                                        <th className="campaign-header">Brand - Placement ID</th>
                                                        <th className="frequency-header">Frequency</th>
                                                        <th className="metric-header">Metric</th>
                                                        <th className="notes-header">Notes</th>
                                                        <th className="status-header">Confirmed</th>
                                                        <th className="attach-header">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getNoDataReportsByType.pldAndAgg.map((report, index) => renderNoDataReportRow(report, index, true))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                );
            })()}

            {activeTab === 'archive' && (() => {
                const filteredArchiveReports = getFilteredArchiveReports;
                const totalPages = getTotalPages(filteredArchiveReports.length, archiveRowsPerPage);
                const paginatedArchiveReports = getPaginatedData(filteredArchiveReports, archiveCurrentPage, archiveRowsPerPage);

                return (
                    <div className="reports-section archive-reports">
                        <div className="reports-section-header">
                            <h3>Past Reports Archive</h3>
                            <div className="reports-header-stats">
                                <span className="reports-header-stat-item">
                                    <span className="reports-header-stat-label">Total:</span>
                                    <span className="reports-header-stat-value">{filteredArchiveReports.length}</span>
                                </span>
                            </div>
                        </div>
                        <div className="archive-agency-tabs">
                            {archiveAgencies.map(agency => (
                                <button
                                    key={agency}
                                    className={`archive-tab-button ${archiveAgencyTab === agency ? 'active' : ''}`}
                                    onClick={() => { setArchiveAgencyTab(agency); setArchiveCurrentPage(1); }}
                                >
                                    {agency} ({getPastReports.filter(r => r.agency === agency).length})
                                </button>
                            ))}
                        </div>
                        <div className="table-container table-rounded">
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
                                <tbody key={`archive-${archiveCurrentPage}-${archiveRowsPerPage}-${archiveAgencyTab}`}>
                                    {paginatedArchiveReports.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="empty-state">
                                                {searchTerm ? 'No matching past reports' : 'No past reports found'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedArchiveReports.map((report, index) => {
                                            const isCMI = report.agency === 'CMI';
                                            return (
                                                <tr key={report.unique_key} className={`report-row archive-row ${index % 2 === 0 ? 'even-row' : 'odd-row'} ${report.is_no_data_report ? 'no-data-row' : ''}`}>
                                                    <td className="campaign-column">
                                                        <div
                                                            className="campaign-text clickable-campaign"
                                                            onClick={() => openCMIModal(report, report.week_number, filteredArchiveReports.filter(r => r.agency === 'CMI'))}
                                                            title={report.campaign_name}
                                                        >
                                                            <span className={`campaign-name ${report.is_no_data_report ? 'no-data-campaign' : ''}`} title={report.campaign_name}>
                                                                {cleanCampaignName(report.campaign_name)}
                                                                {report.is_no_data_report && <span className="no-data-indicator">(No Data)</span>}
                                                            </span>
                                                            {isCMI && (
                                                                <div className="cmi-info">
                                                                    <FileText className="cmi-icon" size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="brand-column">{report.brand || '-'}</td>
                                                    <td className="agency-column">
                                                        <span className={`agency-badge ${(report.agency || '').toLowerCase()}`}>
                                                            {report.agency || '-'}
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
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {renderPaginationButtons(archiveCurrentPage, totalPages, 'archive')}
                    </div>
                );
            })()}

            </div>

            {showModal && selectedCMIReport && (
                <div className="edit-form-modal-overlay" onClick={() => setShowModal(false)}>
                    {navigableCampaigns.length > 1 && currentCampaignIndex > 0 && (
                        <button
                            className="modal-nav-arrow modal-nav-left"
                            onClick={(e) => { e.stopPropagation(); navigateCampaign('prev'); }}
                            aria-label="Previous campaign"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                    )}
                    {navigableCampaigns.length > 1 && currentCampaignIndex < navigableCampaigns.length - 1 && (
                        <button
                            className="modal-nav-arrow modal-nav-right"
                            onClick={(e) => { e.stopPropagation(); navigateCampaign('next'); }}
                            aria-label="Next campaign"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    )}
                    <div className="edit-form-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="edit-form-modal-header">
                            <h3 title={selectedCMIReport._report?.campaign_name || selectedCMIReport._report?.notes || 'Campaign Data'}>
                                {selectedCMIReport._report?.campaign_name || selectedCMIReport._report?.notes || 'Campaign Data'}
                                {navigableCampaigns.length > 1 && (
                                    <span className="modal-nav-counter"> ({currentCampaignIndex + 1}/{navigableCampaigns.length})</span>
                                )}
                            </h3>
                            <button className="edit-form-modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-view-toggle-bar">
                            <button
                                className={`toggle-btn ${modalViewMode === 'layout' ? 'active' : ''}`}
                                onClick={() => setModalViewMode('layout')}
                            >
                                Layout
                            </button>
                            <button
                                className={`toggle-btn ${modalViewMode === 'json' ? 'active' : ''}`}
                                onClick={() => {
                                    setEditedJSON(JSON.stringify(editFormData, null, 2));
                                    setModalViewMode('json');
                                }}
                            >
                                JSON
                            </button>
                        </div>
                        <div className="edit-form-modal-body">
                            {modalViewMode === 'layout' ? (
                                <div className="edit-form-grid">
                                    <div className="edit-form-field">
                                        <label>CMI Placement ID</label>
                                        <input
                                            type="text"
                                            value={editFormData.cmi_placement_id || ''}
                                            onChange={(e) => updateEditFormField('cmi_placement_id', e.target.value)}
                                            onBlur={(e) => lookupAndFillFromContract(e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>Client Placement ID</label>
                                        <input
                                            type="text"
                                            value={editFormData.client_placement_id || ''}
                                            onChange={(e) => updateEditFormField('client_placement_id', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>Target List ID</label>
                                        <input
                                            type="text"
                                            value={editFormData.target_list_id || ''}
                                            onChange={(e) => updateEditFormField('target_list_id', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>Creative Code</label>
                                        <input
                                            type="text"
                                            value={editFormData.creative_code || ''}
                                            onChange={(e) => updateEditFormField('creative_code', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>GCM Placement IDs</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(editFormData.gcm_placement_id)
                                                ? editFormData.gcm_placement_id.join(', ')
                                                : (editFormData.gcm_placement_id || '')}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const arr = value.split(',').map(s => s.trim()).filter(s => s);
                                                updateEditFormField('gcm_placement_id', arr);
                                            }}
                                            placeholder="Comma separated"
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        {selectedCMIReport?._report && findMatchingMetadata(selectedCMIReport._report)?.gcm_placement_id_array?.length > 0 ? (
                                            <>
                                                <label>&nbsp;</label>
                                                <button
                                                    type="button"
                                                    className="gcm-selection-btn"
                                                    onClick={() => {
                                                        const meta = findMatchingMetadata(selectedCMIReport._report);
                                                        openGcmSelectionModal(meta?.campaign_id, meta);
                                                    }}
                                                >
                                                    Select from Tags
                                                </button>
                                            </>
                                        ) : (
                                            <>&nbsp;</>
                                        )}
                                    </div>
                                    <div className="edit-form-field">
                                        <label>Client ID</label>
                                        <input
                                            type="text"
                                            value={editFormData.client_id || ''}
                                            onChange={(e) => updateEditFormField('client_id', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>Brand Name</label>
                                        <input
                                            type="text"
                                            value={editFormData.brand_name || ''}
                                            onChange={(e) => updateEditFormField('brand_name', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field full-width">
                                        <label>Vehicle Name</label>
                                        <input
                                            type="text"
                                            value={editFormData.vehicle_name || ''}
                                            onChange={(e) => updateEditFormField('vehicle_name', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field full-width">
                                        <label>Placement Description</label>
                                        <input
                                            type="text"
                                            value={editFormData.placement_description || ''}
                                            onChange={(e) => updateEditFormField('placement_description', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field full-width">
                                        <label>Buy Component Type</label>
                                        <input
                                            type="text"
                                            value={editFormData.buy_component_type || ''}
                                            onChange={(e) => updateEditFormField('buy_component_type', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>Media Tactic ID</label>
                                        <input
                                            type="text"
                                            value={editFormData.media_tactic_id || ''}
                                            onChange={(e) => updateEditFormField('media_tactic_id', e.target.value)}
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>Contract Number</label>
                                        <input
                                            type="text"
                                            value={editFormData.contract_number || ''}
                                            onChange={(e) => updateEditFormField('contract_number', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="json-view-container">
                                    <div className="json-modal-actions">
                                        <button
                                            className="json-modal-copy-btn"
                                            onClick={copyToClipboard}
                                        >
                                            <Copy size={14} />
                                            Copy JSON
                                        </button>
                                    </div>
                                    <div className="json-modal-code">
                                        <pre>{editedJSON}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="edit-form-modal-footer">
                            <button className="edit-form-cancel-btn" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="edit-form-save-btn" onClick={saveEditFormChanges}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showGcmSelectionModal && (
                <div className="edit-form-modal-overlay" onClick={() => setShowGcmSelectionModal(false)}>
                    <div className="edit-form-modal-content gcm-selection-modal" onClick={e => e.stopPropagation()}>
                        <div className="edit-form-modal-header">
                            <h3>Select GCM Placement IDs</h3>
                            <button className="edit-form-modal-close" onClick={() => setShowGcmSelectionModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="edit-form-modal-body">
                            <p className="gcm-selection-hint">Select up to 2 GCM Placement IDs for this campaign. Currently selected: {gcmSelectionData.selectedIds.length}</p>
                            <div className="gcm-selection-list">
                                {gcmSelectionData.gcmArray.map((gcmId, idx) => (
                                    <div
                                        key={gcmId}
                                        className={`gcm-selection-item ${gcmSelectionData.selectedIds.includes(gcmId) ? 'selected' : ''}`}
                                        onClick={() => toggleGcmSelection(gcmId)}
                                    >
                                        <div className="gcm-selection-checkbox">
                                            {gcmSelectionData.selectedIds.includes(gcmId) && <CheckCircle size={16} />}
                                        </div>
                                        <div className="gcm-selection-info">
                                            <div className="gcm-selection-id">{gcmId}</div>
                                            <div className="gcm-selection-desc">{gcmSelectionData.gcmDescriptions[idx] || ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="edit-form-modal-footer">
                            <button className="edit-form-cancel-btn" onClick={() => setShowGcmSelectionModal(false)}>Cancel</button>
                            <button className="edit-form-save-btn" onClick={saveGcmSelection}>Save Selection</button>
                        </div>
                    </div>
                </div>
            )}

            {showBatchModal && batchCMIJSON && (
                <div className="json-modal-overlay" onClick={() => setShowBatchModal(false)}>
                    <div className="json-modal-content batch-modal" onClick={e => e.stopPropagation()}>
                        <div className="json-modal-header">
                            <div className="json-modal-title">
                                <FileText size={20} />
                                <h3>CMI Batch JSON - All Campaigns This Week</h3>
                            </div>
                            <button
                                className="json-modal-close"
                                onClick={() => setShowBatchModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="json-modal-body">
                            <div className="batch-modal-info">
                                <span className="batch-modal-count">
                                    {Object.keys(batchCMIJSON.campaigns || {}).length} CMI campaigns
                                </span>
                                <span className="batch-modal-dates">
                                    Week: {batchCMIJSON.monday_date}
                                </span>
                            </div>
                            <div className="json-modal-actions">
                                <span className="json-modal-label">
                                    {isEditingBatchJSON ? 'Editing JSON' : 'Copy to cmi_batch.json'}
                                </span>
                                <div className="json-modal-buttons">
                                    <button
                                        className={`json-modal-edit-btn ${isEditingBatchJSON ? 'editing' : ''}`}
                                        onClick={() => setIsEditingBatchJSON(!isEditingBatchJSON)}
                                    >
                                        {isEditingBatchJSON ? 'View' : 'Edit'}
                                    </button>
                                    <button
                                        className="json-modal-copy-btn batch-modal-copy-btn"
                                        onClick={copyBatchToClipboard}
                                    >
                                        <Copy size={14} />
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <div className="json-modal-code batch-modal-code">
                                {isEditingBatchJSON ? (
                                    <textarea
                                        className="json-editor"
                                        value={editedBatchJSON}
                                        onChange={(e) => setEditedBatchJSON(e.target.value)}
                                        spellCheck={false}
                                    />
                                ) : (
                                    <pre>{editedBatchJSON}</pre>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showMoveModal && movingReport && (
                <div className="json-modal-overlay" onClick={closeMoveModal}>
                    <div className="move-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="json-modal-header">
                            <div className="json-modal-title">
                                <Link size={20} />
                                <h3>Assign Report</h3>
                            </div>
                            <button className="json-modal-close" onClick={closeMoveModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="move-modal-body">
                            <div className="move-modal-source-card">
                                <span className="move-source-brand">{movingReport.brand || 'Unknown'}</span>
                                <span className="move-source-placement">{movingReport.cmi_placement_id || movingReport.cmi_metadata?.cmi_placement_id || ''}</span>
                            </div>

                            <div className="move-modal-mode-selection">
                                <button
                                    className={`move-mode-btn ${moveMode === 'attach' ? 'active' : ''}`}
                                    onClick={() => setMoveMode('attach')}
                                >
                                    <Link size={16} />
                                    Attach to Campaign
                                </button>
                                <button
                                    className={`move-mode-btn ${moveMode === 'standalone' ? 'active' : ''}`}
                                    onClick={() => setMoveMode('standalone')}
                                >
                                    <PlusCircle size={16} />
                                    Standalone
                                </button>
                            </div>

                            {moveMode === 'attach' && (
                                <div className="move-modal-campaign-list">
                                    {getAttachableCampaigns.length === 0 ? (
                                        <div className="move-modal-no-campaigns">No CMI campaigns available</div>
                                    ) : (
                                        getAttachableCampaigns.map(campaign => (
                                            <div
                                                key={campaign.id}
                                                className={`move-modal-campaign-option ${selectedAttachTarget?.id === campaign.id ? 'selected' : ''}`}
                                                onClick={() => setSelectedAttachTarget(campaign)}
                                            >
                                                <div className="campaign-option-name">
                                                    {cleanCampaignName(campaign.campaign_name)}
                                                </div>
                                                <div className="campaign-option-details">
                                                    <span className="campaign-option-brand">{campaign.brand}</span>
                                                    <span className="campaign-option-date">{formatSendDate(campaign.send_date)}</span>
                                                    {attachedAGGs[campaign.id]?.length > 0 && (
                                                        <span className="campaign-option-attached-count">
                                                            +{attachedAGGs[campaign.id].length} AGG
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {moveMode === 'standalone' && (
                                <div className="move-modal-standalone-info">
                                    This will be added as a standalone AGG entry.
                                </div>
                            )}

                            <div className="move-modal-actions">
                                <button
                                    className="move-modal-confirm-btn"
                                    onClick={handleMoveToDue}
                                >
                                    {moveMode === 'attach' ? 'Attach' : 'Add Standalone'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPlacementIdModal && placementIdReport && (
                <div className="json-modal-overlay" onClick={() => setShowPlacementIdModal(false)}>
                    <div className="placement-id-modal-simple" onClick={e => e.stopPropagation()}>
                        <button className="placement-id-modal-close" onClick={() => setShowPlacementIdModal(false)}>
                            <X size={18} />
                        </button>
                        <div className="placement-id-modal-campaign-name">
                            {cleanCampaignName(placementIdReport.campaign_name)}
                        </div>
                        <div className="placement-id-modal-input-row">
                            <label>CMI Placement ID</label>
                            <input
                                type="text"
                                value={placementIdInput}
                                onChange={(e) => setPlacementIdInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && placementIdInput.trim() && handlePlacementIdSubmit()}
                                autoFocus
                            />
                        </div>
                        <button
                            className="placement-id-modal-enter-btn"
                            onClick={handlePlacementIdSubmit}
                            disabled={!placementIdInput.trim()}
                        >
                            Enter
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsManager;