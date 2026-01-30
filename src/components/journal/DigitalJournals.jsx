import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../../styles/journal.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { useSearch } from '../../context/SearchContext';

const normalizePublicationName = (publication) => {
    if (!publication) return 'Unknown';
    if (publication.startsWith('Innovations in Clinical Neuroscience') && publication !== 'Innovations in Clinical Neuroscience') {
        return 'Innovations in Clinical Neuroscience';
    }
    if (publication.startsWith('Bariatric Times') && publication !== 'Bariatric Times') {
        return 'Bariatric Times';
    }
    return publication;
};

const DigitalJournals = () => {
    const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
    const [dataSource, setDataSource] = useState('walsworth');
    const [journalsData, setJournalsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [walsworthData, setWalsworthData] = useState([]);
    const [walsworthFilteredData, setWalsworthFilteredData] = useState([]);
    const [walsworthAggregates, setWalsworthAggregates] = useState({
        totalPageViews: 0,
        uniquePageViews: 0,
        totalIssueVisits: 0,
        avgTimeInIssue: 0
    });
    const [walsworthLastUpdated, setWalsworthLastUpdated] = useState(null);
    const [googleAnalyticsLastUpdated, setGoogleAnalyticsLastUpdated] = useState(null);
    const [search, setSearch] = useState(searchTerms.journalMetrics || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedWalsworthIssue, setSelectedWalsworthIssue] = useState(null);
    const [walsworthModalOpen, setWalsworthModalOpen] = useState(false);
    const [walsworthTimeFilter, setWalsworthTimeFilter] = useState('all');
    const walsworthModalRef = useRef(null);
    const [selectedPublications, setSelectedPublications] = useState([]);
    const [selectedProperties, setSelectedProperties] = useState([]);
    const [gaModalTab, setGaModalTab] = useState('overview');
    const [walsworthViewMode, setWalsworthViewMode] = useState('all');
    const [gaViewMode, setGaViewMode] = useState('all');
    
    const BANNED_TITLES = [
        'no title',
        'title not found',
        'untitled',
        ''
    ];

    const isTitleBanned = (title) => {
        if (!title || typeof title !== 'string') return true;
        const normalizedTitle = title.toLowerCase().trim();
        return BANNED_TITLES.includes(normalizedTitle);
    };

    const getUniquePublications = () => {
        const pubs = [...new Set(walsworthData.map(item => item.publication).filter(Boolean))];
        return pubs.sort();
    };

    const getUniqueProperties = () => {
        const props = [...new Set(journalsData.map(item => item.property_name).filter(Boolean))];
        return props.sort();
    };

    const togglePublication = (pub) => {
        setSelectedPublications(prev =>
            prev.includes(pub) ? prev.filter(p => p !== pub) : [...prev, pub]
        );
    };

    const toggleProperty = (prop) => {
        setSelectedProperties(prev =>
            prev.includes(prop) ? prev.filter(p => p !== prop) : [...prev, prop]
        );
    };

    const extractBaseUrl = (url) => {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            let pathname = urlObj.pathname;
            pathname = pathname.replace(/\/+$/, '');
            pathname = pathname
                .replace(/\/Page\s*\d+.*$/i, '')
                .replace(/\/S\d+.*$/i, '')
                .replace(/\/contentsBrowser.*$/i, '')
                .replace(/\/issuelistBrowser.*$/i, '')
                .replace(/\/issuelist.*$/i, '')
                .replace(/\/contents.*$/i, '');
            return (urlObj.hostname + pathname).toLowerCase();
        } catch {
            let base = url.toLowerCase();
            base = base.split('?')[0];
            base = base.replace(/\/page\s*\d+.*$/i, '');
            base = base.replace(/\/s\d+.*$/i, '');
            return base;
        }
    };

    const extractTitleFromUrl = (url) => {
        if (!url) return 'untitled';
        try {
            const urlObj = new URL(url);
            let pathname = urlObj.pathname;
            pathname = pathname.replace(/\/+$/, '');
            pathname = pathname
                .replace(/\/Page\s*\d+.*$/i, '')
                .replace(/\/S\d+.*$/i, '')
                .replace(/\/contentsBrowser.*$/i, '')
                .replace(/\/issuelistBrowser.*$/i, '');
            const segments = pathname.split('/').filter(s => s && s !== 'index.html' && s !== 'view');
            if (segments.length > 0) {
                return segments.join(' / ').toLowerCase();
            }
            return urlObj.hostname.toLowerCase();
        } catch {
            return url.substring(0, 100).toLowerCase();
        }
    };

    const groupJournalsByTitle = (journals) => {
        if (!groupByTitle) return journals;

        const grouped = {};

        journals.forEach(journal => {
            const url = journal.fullUrl || journal.url;
            if (!url) return;

            const baseUrl = extractBaseUrl(url);
            if (!baseUrl) return;

            const displayTitle = extractTitleFromUrl(url);
            if (isTitleBanned(displayTitle)) return;

            if (!grouped[baseUrl]) {
                grouped[baseUrl] = {
                    ...journal,
                    title: displayTitle,
                    baseUrl: baseUrl,
                    combinedUrls: [url],
                    originalJournals: [journal]
                };
            } else {
                grouped[baseUrl].combinedUrls.push(url);
                grouped[baseUrl].originalJournals.push(journal);

                const existingUsers = grouped[baseUrl].totalUsers || 0;
                const newUsers = journal.totalUsers || 0;
                const totalUsers = existingUsers + newUsers;

                const existingDuration = grouped[baseUrl].avgDuration || 0;
                const newDuration = journal.avgDuration || 0;
                grouped[baseUrl].avgDuration = totalUsers > 0
                    ? (existingDuration * existingUsers + newDuration * newUsers) / totalUsers
                    : 0;

                const existingBounce = grouped[baseUrl].bounceRate || 0;
                const newBounce = journal.bounceRate || 0;
                grouped[baseUrl].bounceRate = totalUsers > 0
                    ? (existingBounce * existingUsers + newBounce * newUsers) / totalUsers
                    : 0;

                grouped[baseUrl].totalUsers = totalUsers;
                grouped[baseUrl].latestMonthUsers = totalUsers;

                if (journal.devices) {
                    if (!grouped[baseUrl].devices) grouped[baseUrl].devices = {};
                    Object.entries(journal.devices).forEach(([device, count]) => {
                        grouped[baseUrl].devices[device] = (grouped[baseUrl].devices[device] || 0) + count;
                    });
                }

                if (journal.sources) {
                    if (!grouped[baseUrl].sources) grouped[baseUrl].sources = {};
                    Object.entries(journal.sources).forEach(([source, count]) => {
                        grouped[baseUrl].sources[source] = (grouped[baseUrl].sources[source] || 0) + count;
                    });
                }

                if (journal.history && journal.history.length > 0) {
                    if (!grouped[baseUrl].history) grouped[baseUrl].history = [];
                    journal.history.forEach(histItem => {
                        const existingHistItem = grouped[baseUrl].history.find(h => h.date === histItem.date);
                        if (existingHistItem) {
                            existingHistItem.total_users = (existingHistItem.total_users || 0) + (histItem.total_users || 0);
                            const oldUsers = existingHistItem.total_users - (histItem.total_users || 0);
                            const newHistUsers = histItem.total_users || 0;
                            if (oldUsers + newHistUsers > 0) {
                                existingHistItem.avg_duration = ((existingHistItem.avg_duration || 0) * oldUsers + (histItem.avg_duration || 0) * newHistUsers) / (oldUsers + newHistUsers);
                                existingHistItem.bounce_rate = ((existingHistItem.bounce_rate || 0) * oldUsers + (histItem.bounce_rate || 0) * newHistUsers) / (oldUsers + newHistUsers);
                            }
                        } else {
                            grouped[baseUrl].history.push({ ...histItem });
                        }
                    });
                    grouped[baseUrl].history.sort((a, b) => a.date.localeCompare(b.date));
                }
            }
        });

        return Object.values(grouped);
    };
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJournal, setSelectedJournal] = useState(null);
    const [timeframeFilter, setTimeframeFilter] = useState('12');
    const [groupByTitle, setGroupByTitle] = useState(true);
    const [aggregateMetrics, setAggregateMetrics] = useState({
        totalUsers: 0,
        avgDuration: 0,
        bounceRate: 0,
        mobileToDesktopRatio: 0
    });
    const modalRef = useRef(null);

    const GOOGLE_ANALYTICS_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/google_analytics_metrics.json?sp=r&st=2026-01-16T21:12:00Z&se=2028-04-14T04:27:00Z&spr=https&sv=2024-11-04&sr=b&sig=fDQhUjngrEfV4mfCzwx7itsVhoyQYVkuNEwi86NSFf8%3D";

    useEffect(() => {
        async function fetchUrlData() {
            const blobUrl = GOOGLE_ANALYTICS_BLOB_URL;
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();

                if (!jsonData.urls || jsonData.urls.length === 0) {
                    return;
                }

                const processedData = jsonData.urls
                    .filter(item => item.url)
                    .map(item => {
                        const title = item.title || extractTitleFromUrl(item.url);
                        const current = item.current || {};

                        return {
                            ...item,
                            title: title,
                            fullUrl: item.url,
                            totalUsers: current.total_users || 0,
                            avgDuration: current.avg_duration || 0,
                            bounceRate: current.bounce_rate || 0,
                            devices: current.devices || {},
                            sources: current.sources || {},
                            latestMonthUsers: current.total_users || 0
                        };
                    })
                    .filter(item => !isTitleBanned(item.title));


                const groupedData = groupByTitle ? groupJournalsByTitle(processedData) : processedData;
                const sortedData = groupedData.sort((a, b) => (b.totalUsers || b.latestMonthUsers || 0) - (a.totalUsers || a.latestMonthUsers || 0));

                setJournalsData(sortedData);
                setFilteredData(sortedData);

                calculateAggregateMetrics(sortedData, timeframeFilter);
                if (jsonData.last_updated) {
                    setGoogleAnalyticsLastUpdated(jsonData.last_updated);
                }
            } catch (error) {
            }
        }
        fetchUrlData();
    }, []);

    useEffect(() => {
        calculateAggregateMetrics(filteredData, timeframeFilter);
    }, [timeframeFilter, filteredData]);

    useEffect(() => {
        if (journalsData.length > 0) {
            const reprocessData = async () => {
                const blobUrl = GOOGLE_ANALYTICS_BLOB_URL;
                try {
                    const response = await fetch(blobUrl);
                    const jsonData = await response.json();

                    const processedData = (jsonData.urls || [])
                        .filter(item => item.url)
                        .map(item => {
                            const title = item.title || extractTitleFromUrl(item.url);
                            const current = item.current || {};

                            return {
                                ...item,
                                title: title,
                                fullUrl: item.url,
                                totalUsers: current.total_users || 0,
                                avgDuration: current.avg_duration || 0,
                                bounceRate: current.bounce_rate || 0,
                                devices: current.devices || {},
                                sources: current.sources || {},
                                latestMonthUsers: current.total_users || 0
                            };
                        })
                        .filter(item => !isTitleBanned(item.title));

                    const groupedData = groupByTitle ? groupJournalsByTitle(processedData) : processedData;
                    const sortedData = groupedData.sort((a, b) => (b.totalUsers || 0) - (a.totalUsers || 0));
                    setJournalsData(sortedData);
                    setFilteredData(sortedData);

                    calculateAggregateMetrics(sortedData, timeframeFilter);
                    if (jsonData.last_updated) {
                        setGoogleAnalyticsLastUpdated(jsonData.last_updated);
                    }
                } catch (error) {
                }
            };
            reprocessData();
        }
    }, [groupByTitle]);

    useEffect(() => {
        async function fetchWalsworthData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/walsworth_metrics.json?sp=r&st=2026-01-15T18:57:16Z&se=2027-09-24T02:12:16Z&spr=https&sv=2024-11-04&sr=b&sig=w1q9PY%2FMzuTUvwwOV%2Bcub%2FV7Cygeff3ESRaC2l1KvPM%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();

                if (jsonData.issues && Array.isArray(jsonData.issues)) {
                    const normalizedData = jsonData.issues.map(issue => ({
                        ...issue,
                        publication: normalizePublicationName(issue.publication)
                    }));
                    const sortedData = normalizedData.sort((a, b) => {
                        const aDate = parseIssueDateFromName(a.issue || a.issue_name);
                        const bDate = parseIssueDateFromName(b.issue || b.issue_name);
                        return bDate - aDate;
                    });
                    setWalsworthData(sortedData);
                    setWalsworthFilteredData(sortedData);
                    calculateWalsworthAggregates(sortedData);
                    if (jsonData.last_updated) {
                        setWalsworthLastUpdated(jsonData.last_updated);
                    }
                }
            } catch (error) {
            }
        }
        fetchWalsworthData();
    }, []);

    useEffect(() => {
        if (walsworthData.length > 0) {
            const filtered = walsworthData.filter(issue => {
                const name = issue.issue_name || '';
                const matchesSearch = matchesSearchTerm(name, search);
                const matchesPub = selectedPublications.length === 0 || selectedPublications.includes(issue.publication);
                return matchesSearch && matchesPub;
            });
            setWalsworthFilteredData(filtered);
            calculateWalsworthAggregates(filtered);
        }
    }, [search, walsworthData, selectedPublications]);

    useEffect(() => {
        function handleWalsworthClickOutside(event) {
            if (walsworthModalRef.current && !walsworthModalRef.current.contains(event.target)) {
                setWalsworthModalOpen(false);
            }
        }

        if (walsworthModalOpen) {
            document.addEventListener('mousedown', handleWalsworthClickOutside);
        } else {
            document.removeEventListener('mousedown', handleWalsworthClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleWalsworthClickOutside);
        };
    }, [walsworthModalOpen]);

    function calculateJournalMetricsForTimeframe(journal) {
        if (!journal || !journal.timeData) {
            return { users: 0, avgDuration: 0, bounceRate: 0 };
        }
        
        const timeData = getTimeframeData(journal);
        
        let totalUsers = 0;
        let totalDuration = 0;
        let totalBounces = 0;
        
        timeData.forEach(monthData => {
            totalUsers += monthData.users || 0;
            totalDuration += (monthData.avgDuration || 0) * (monthData.users || 0);
            totalBounces += (monthData.bounceRate / 100 || 0) * (monthData.users || 0);
        });
        
        const avgDuration = totalUsers > 0 ? totalDuration / totalUsers : 0;
        const bounceRate = totalUsers > 0 ? totalBounces / totalUsers : 0;
        
        return {
            users: totalUsers,
            avgDuration,
            bounceRate
        };
    }

    const calculateMobileToDesktopRatio = (journal) => {
        if (!journal.devices) return 0;

        let mobileCount = 0;
        let desktopCount = 0;

        Object.entries(journal.devices).forEach(([device, count]) => {
            const deviceLower = device.toLowerCase();
            if (deviceLower === 'mobile' || deviceLower === 'tablet') {
                mobileCount += count;
            } else if (deviceLower === 'desktop') {
                desktopCount += count;
            }
        });

        if (desktopCount === 0) return mobileCount > 0 ? 999 : 0;
        return mobileCount / desktopCount;
    };

    const formatMobileToDesktopRatio = (ratio) => {
        if (ratio === 0) return "0:1";
        if (ratio === 999) return "∞:1";
        return `${ratio.toFixed(2)}:1`;
    };

    const formatTimeInIssue = (seconds) => {
        if (isNaN(seconds) || seconds <= 0) return "0s";
        seconds = Math.round(seconds);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            if (minutes > 0 && secs > 0) return `${hours}h ${minutes}m ${secs}s`;
            if (minutes > 0) return `${hours}h ${minutes}m`;
            if (secs > 0) return `${hours}h ${secs}s`;
            return `${hours}h`;
        }
        if (minutes > 0) {
            if (secs > 0) return `${minutes}m ${secs}s`;
            return `${minutes}m`;
        }
        return `${secs}s`;
    };

    const calculateWalsworthAggregates = (data) => {
        if (!data || data.length === 0) {
            setWalsworthAggregates({ totalPageViews: 0, uniquePageViews: 0, totalIssueVisits: 0, avgTimeInIssue: 0 });
            return;
        }

        let totalPageViews = 0;
        let uniquePageViews = 0;
        let totalIssueVisits = 0;
        let totalWeightedSeconds = 0;

        data.forEach(issue => {
            const current = issue.current || {};
            totalPageViews += current.total_page_views || 0;
            uniquePageViews += current.unique_page_views || 0;
            totalIssueVisits += current.total_issue_visits || 0;
            totalWeightedSeconds += (current.seconds_per_visit || 0) * (current.total_issue_visits || 0);
        });

        const avgTimeInIssue = totalIssueVisits > 0 ? totalWeightedSeconds / totalIssueVisits : 0;

        setWalsworthAggregates({ totalPageViews, uniquePageViews, totalIssueVisits, avgTimeInIssue });
    };

    const filterWalsworthHistory = (history, filter) => {
        if (!history || history.length === 0) return [];
        if (filter === 'all') return history;

        const days = parseInt(filter, 10);
        return history.slice(-days);
    };

    const parseIssueDateFromName = (issueName) => {
        if (!issueName) return new Date(0);

        const months = {
            'january': 0, 'february': 1, 'march': 2, 'april': 3,
            'may': 4, 'june': 5, 'july': 6, 'august': 7,
            'september': 8, 'october': 9, 'november': 10, 'december': 11,
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3,
            'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'sept': 8,
            'oct': 9, 'nov': 10, 'dec': 11,
            'spring': 3, 'summer': 6, 'fall': 9, 'autumn': 9, 'winter': 0
        };

        const lowerName = issueName.toLowerCase();

        const monthYearMatch = lowerName.match(/([a-z]+)\s*[-\/]?\s*(\d{4})/);
        if (monthYearMatch) {
            const monthStr = monthYearMatch[1];
            const year = parseInt(monthYearMatch[2], 10);
            if (months.hasOwnProperty(monthStr)) {
                return new Date(year, months[monthStr], 1);
            }
        }

        const yearMonthMatch = lowerName.match(/(\d{4})\s*[-\/]?\s*([a-z]+)/);
        if (yearMonthMatch) {
            const year = parseInt(yearMonthMatch[1], 10);
            const monthStr = yearMonthMatch[2];
            if (months.hasOwnProperty(monthStr)) {
                return new Date(year, months[monthStr], 1);
            }
        }

        const yearMatch = lowerName.match(/(\d{4})/);
        if (yearMatch) {
            return new Date(parseInt(yearMatch[1], 10), 0, 1);
        }

        return new Date(0);
    };

    const calculateAggregateMetrics = (data, timeframe) => {
        let totalUsers = 0;
        let totalDuration = 0;
        let totalBounces = 0;
        let totalMobile = 0;
        let totalDesktop = 0;

        data.forEach(journal => {
            const users = journal.totalUsers || 0;
            totalUsers += users;
            totalDuration += (journal.avgDuration || 0) * users;
            totalBounces += (journal.bounceRate || 0) * users;

            if (journal.devices) {
                Object.entries(journal.devices).forEach(([device, count]) => {
                    const deviceLower = device.toLowerCase();
                    if (deviceLower === 'mobile' || deviceLower === 'tablet') {
                        totalMobile += count;
                    } else if (deviceLower === 'desktop') {
                        totalDesktop += count;
                    }
                });
            }
        });

        const avgDuration = totalUsers > 0 ? totalDuration / totalUsers : 0;
        const avgBounceRate = totalUsers > 0 ? (totalBounces / totalUsers) : 0;
        const mobileToDesktopRatio = totalDesktop > 0 ? totalMobile / totalDesktop : (totalMobile > 0 ? 999 : 0);

        setAggregateMetrics({
            totalUsers,
            avgDuration,
            bounceRate: avgBounceRate,
            mobileToDesktopRatio
        });
    };

    const getLatestMonthData = (journal) => {
        if (!journal.timeData || Object.keys(journal.timeData).length === 0) {
            return { month: "No Data", users: 0 };
        }
        
        const months = Object.keys(journal.timeData).sort();
        const latestMonth = months[months.length - 1];
        
        return { 
            month: latestMonth, 
            users: journal.timeData[latestMonth]?.users || 0 
        };
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false);
            }
        }
        
        if (isModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModalOpen]);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value;
        setSearch(searchValue);
        setGlobalSearchTerm('journalMetrics', searchValue);

        const newFilteredData = journalsData.filter(item => {
            if (isTitleBanned(item.title)) return false;
            const displayText = getDisplayTitle(item);
            const matchesSearch = matchesSearchTerm(displayText, searchValue);
            const matchesProp = selectedProperties.length === 0 || selectedProperties.includes(item.property_name);
            return matchesSearch && matchesProp;
        });

        setFilteredData(newFilteredData);
        setCurrentPage(1);

        calculateAggregateMetrics(newFilteredData, timeframeFilter);
    };

    useEffect(() => {
        if (journalsData.length > 0) {
            const newFilteredData = journalsData.filter(item => {
                if (isTitleBanned(item.title)) return false;
                const displayText = getDisplayTitle(item);
                const matchesSearch = matchesSearchTerm(displayText, search);
                const matchesProp = selectedProperties.length === 0 || selectedProperties.includes(item.property_name);
                return matchesSearch && matchesProp;
            });
            setFilteredData(newFilteredData);
            calculateAggregateMetrics(newFilteredData, timeframeFilter);
        }
    }, [selectedProperties]);

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleJournalClick = (journal) => {
        setSelectedJournal(journal);
        setGaModalTab('overview');
        setIsModalOpen(true);
    };

    const handleGlobalTimeframeChange = (e) => {
        setTimeframeFilter(e.target.value);
    };

    const getDisplayTitle = (item) => {
        if (item.title && item.title.trim() && !isTitleBanned(item.title)) {
            return formatTitle(item.title);
        }
        return "untitled";
    };

    const formatTitle = (title) => {
        if (!title) return "untitled";
        return title.toLowerCase();
    };

    const formatEngagement = (seconds) => {
        if (isNaN(seconds) || seconds < 0) {
            return "0s";
        }

        seconds = Math.round(seconds);
        
        if (seconds < 60) {
            return `${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (remainingSeconds === 0) {
            return `${minutes}m`;
        }
        
        return `${minutes}m ${remainingSeconds}s`;
    };
    
    const formatBounceRate = (rate) => {
        if (isNaN(rate)) return "0%";
        return `${(rate * 100).toFixed(2)}%`;
    };
    
    const formatNumber = (num) => {
        if (isNaN(num)) return "0";
        return num.toLocaleString();
    };
    
    const getTimeframeData = (journal, selectedTimeframe = timeframeFilter) => {
        if (!journal || !journal.timeData) return [];
        
        const timeDataArray = Object.entries(journal.timeData).map(([month, data]) => ({
            month,
            users: data.users || 0,
            avgDuration: data.avgDuration || 0,
            bounceRate: (data.bounceRate || 0) * 100
        }));
        
        timeDataArray.sort((a, b) => a.month.localeCompare(b.month));
        
        if (selectedTimeframe === 'all') {
            return timeDataArray;
        } else {
            const monthsToShow = parseInt(selectedTimeframe, 10);
            return timeDataArray.slice(-monthsToShow);
        }
    };

    const exportToCSV = () => {
        const header = ['Title', 'URL', 'Total Users', 'Avg Duration', 'Bounce Rate'];
    
        const rows = filteredData.map(item => [
            getDisplayTitle(item),
            item.fullUrl || item.url,
            item.totalUsers,
            item.avgDuration,
            item.bounceRate
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

    const validData = filteredData.filter(item => {
        if (isTitleBanned(item.title)) return false;
        return item.title && item.title.trim();
    });

    const totalPages = Math.ceil(validData.length / rowsPerPage);
    
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = validData.slice(indexOfFirstRow, indexOfLastRow);

    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    return (
        <div className="digital-journals-container">
            <div className="page-header">
                <h1>Digital Journal Metrics</h1>
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            <div className="data-source-toggle">
                <div
                    className={`data-source-option ${dataSource === 'walsworth' ? 'active' : ''}`}
                    onClick={() => { setDataSource('walsworth'); setCurrentPage(1); }}
                >
                    Walsworth
                </div>
                <div
                    className={`data-source-option ${dataSource === 'google' ? 'active' : ''}`}
                    onClick={() => { setDataSource('google'); setCurrentPage(1); }}
                >
                    Google Analytics
                </div>
            </div>

            {dataSource === 'walsworth' ? (
                <div className="journal-metrics-summary">
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Total Page Views</div>
                        <div className="metric-summary-value">{formatNumber(walsworthAggregates.totalPageViews)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Unique Page Views</div>
                        <div className="metric-summary-value">{formatNumber(walsworthAggregates.uniquePageViews)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Total Issue Visits</div>
                        <div className="metric-summary-value">{formatNumber(walsworthAggregates.totalIssueVisits)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Avg Time in Issue</div>
                        <div className="metric-summary-value">{formatTimeInIssue(walsworthAggregates.avgTimeInIssue)}</div>
                    </div>
                </div>
            ) : (
                <div className="journal-metrics-summary">
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Total Users</div>
                        <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalUsers)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Avg Duration</div>
                        <div className="metric-summary-value">{formatEngagement(aggregateMetrics.avgDuration)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Bounce Rate</div>
                        <div className="metric-summary-value">{formatBounceRate(aggregateMetrics.bounceRate)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Mobile:Desktop Ratio</div>
                        <div className="metric-summary-value">{formatMobileToDesktopRatio(aggregateMetrics.mobileToDesktopRatio)}</div>
                    </div>
                </div>
            )}

            {dataSource === 'walsworth' ? (
                <div className="table-section">
                    <div className="table-header-row">
                        <h2 className="table-title">Walsworth Metrics</h2>
                        <div className="table-header-controls">
                            <div className="rows-per-page-control">
                                <label htmlFor="walsworthRowsPerPage">Rows per page:</label>
                                <select
                                    id="walsworthRowsPerPage"
                                    value={rowsPerPage}
                                    onChange={handleRowsPerPageChange}
                                >
                                    {[10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((num) => (
                                        <option key={num} value={num}>{num}</option>
                                    ))}
                                </select>
                            </div>
                            {getUniquePublications().length > 0 && (
                                <div className="view-mode-toggle">
                                    <div
                                        className={`view-mode-option ${walsworthViewMode === 'all' ? 'active' : ''}`}
                                        onClick={() => { setWalsworthViewMode('all'); setSelectedPublications([]); }}
                                    >
                                        All Issues ({walsworthData.length})
                                    </div>
                                    <div
                                        className={`view-mode-option ${walsworthViewMode === 'publication' ? 'active' : ''}`}
                                        onClick={() => setWalsworthViewMode('publication')}
                                    >
                                        By Publication
                                    </div>
                                </div>
                            )}
                            {walsworthLastUpdated && (
                                <div className="last-updated-tag">
                                    Last Updated: {new Date(walsworthLastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    </div>

                    {walsworthViewMode === 'publication' && getUniquePublications().length > 0 && (
                        <div className="filter-chips-container">
                            <div className="filter-chips-scroll">
                                {getUniquePublications().map(pub => (
                                    <div
                                        key={pub}
                                        className={`filter-chip ${selectedPublications.includes(pub) ? 'active' : ''}`}
                                        onClick={() => togglePublication(pub)}
                                    >
                                        <span className="filter-chip-title">{pub}</span>
                                        <span className="filter-chip-count">
                                            {walsworthData.filter(i => i.publication === pub).length}
                                        </span>
                                    </div>
                                ))}
                                {selectedPublications.length > 0 && (
                                    <div
                                        className="filter-chip clear-all"
                                        onClick={() => setSelectedPublications([])}
                                    >
                                        Clear All
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <table className="digital-journals-table">
                        <thead>
                            <tr>
                                <th className="journal-title-column">Issue Name</th>
                                <th>Publication</th>
                                <th>Page Views</th>
                                <th>Unique Views</th>
                                <th>Visits</th>
                                <th>Avg Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {walsworthFilteredData
                                .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                                .map((issue, index) => (
                                    <tr key={index}>
                                        <td
                                            className="journal-title-column journal-title"
                                            onClick={() => { setSelectedWalsworthIssue(issue); setWalsworthModalOpen(true); }}
                                        >
                                            {issue.issue_name}
                                        </td>
                                        <td>{issue.publication}</td>
                                        <td>{formatNumber(issue.current?.total_page_views || 0)}</td>
                                        <td>{formatNumber(issue.current?.unique_page_views || 0)}</td>
                                        <td>{formatNumber(issue.current?.total_issue_visits || 0)}</td>
                                        <td>{formatTimeInIssue(issue.current?.seconds_per_visit || 0)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>

                    <div className="table-footer">
                        <div className="pagination">
                            {currentPage > 1 && (
                                <button onClick={() => setCurrentPage(currentPage - 1)}>Previous</button>
                            )}
                            {Array.from({ length: Math.min(5, Math.ceil(walsworthFilteredData.length / rowsPerPage)) }, (_, i) => {
                                const totalWalsworthPages = Math.ceil(walsworthFilteredData.length / rowsPerPage);
                                const startP = Math.max(1, currentPage - 2);
                                const endP = Math.min(totalWalsworthPages, startP + 4);
                                return startP + i;
                            }).filter(num => num <= Math.ceil(walsworthFilteredData.length / rowsPerPage)).map(num => (
                                <button
                                    key={num}
                                    onClick={() => setCurrentPage(num)}
                                    className={currentPage === num ? 'active' : ''}
                                >
                                    {num}
                                </button>
                            ))}
                            {currentPage < Math.ceil(walsworthFilteredData.length / rowsPerPage) && (
                                <button onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="table-section">
                    <div className="table-header-row">
                        <h2 className="table-title">Google Analytics Metrics</h2>
                        <div className="table-header-controls">
                            <div className="digital-journals-toggles">
                                <div className="specialty-combine-toggle">
                                    <input
                                        type="checkbox"
                                        id="groupByTitleToggle"
                                        checked={groupByTitle}
                                        onChange={(e) => setGroupByTitle(e.target.checked)}
                                    />
                                    <label htmlFor="groupByTitleToggle" className="specialty-toggle-slider"></label>
                                    <span className="specialty-toggle-label">Group by Page</span>
                                </div>
                            </div>
                            <div className="rows-per-page-control">
                                <label htmlFor="rowsPerPage">Rows per page:</label>
                                <select
                                    id="rowsPerPage"
                                    value={rowsPerPage}
                                    onChange={handleRowsPerPageChange}
                                >
                                    {[10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((num) => (
                                        <option key={num} value={num}>{num}</option>
                                    ))}
                                </select>
                            </div>
                            {getUniqueProperties().length > 0 && (
                                <div className="view-mode-toggle">
                                    <div
                                        className={`view-mode-option ${gaViewMode === 'all' ? 'active' : ''}`}
                                        onClick={() => { setGaViewMode('all'); setSelectedProperties([]); }}
                                    >
                                        All URLs ({journalsData.length})
                                    </div>
                                    <div
                                        className={`view-mode-option ${gaViewMode === 'property' ? 'active' : ''}`}
                                        onClick={() => setGaViewMode('property')}
                                    >
                                        By Property
                                    </div>
                                </div>
                            )}
                            {googleAnalyticsLastUpdated && (
                                <div className="last-updated-tag">
                                    Last Updated: {new Date(googleAnalyticsLastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    </div>

                    {gaViewMode === 'property' && getUniqueProperties().length > 0 && (
                        <div className="filter-chips-container">
                            <div className="filter-chips-scroll">
                                {getUniqueProperties().map(prop => (
                                    <div
                                        key={prop}
                                        className={`filter-chip ${selectedProperties.includes(prop) ? 'active' : ''}`}
                                        onClick={() => toggleProperty(prop)}
                                    >
                                        <span className="filter-chip-title">{prop}</span>
                                        <span className="filter-chip-count">
                                            {journalsData.filter(i => i.property_name === prop).length}
                                        </span>
                                    </div>
                                ))}
                                {selectedProperties.length > 0 && (
                                    <div
                                        className="filter-chip clear-all"
                                        onClick={() => setSelectedProperties([])}
                                    >
                                        Clear All
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <table className="digital-journals-table">
                    <thead>
                        <tr>
                            <th className="journal-title-column">Title</th>
                            <th>Property</th>
                            <th>Total Users</th>
                            <th>Avg Duration</th>
                            <th>Bounce Rate</th>
                            <th>Mobile:Desktop</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((item, index) => (
                            <tr key={index}>
                                <td
                                    className="journal-title-column journal-title"
                                    onClick={() => handleJournalClick(item)}
                                >
                                    {getDisplayTitle(item)}
                                </td>
                                <td className="property-cell">{item.property_name || '-'}</td>
                                <td>{formatNumber(item.totalUsers || 0)}</td>
                                <td>{formatEngagement(item.avgDuration || 0)}</td>
                                <td>{formatBounceRate(item.bounceRate || 0)}</td>
                                <td>{formatMobileToDesktopRatio(calculateMobileToDesktopRatio(item))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="table-footer">
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
                </div>
                <div className="export-button-container">
                    <button className="export-button" onClick={exportToCSV}>
                        Export CSV
                    </button>
                </div>
            </div>
            )}

            {isModalOpen && selectedJournal && (
                <div className="journal-modal-overlay">
                    <div className="journal-modal" ref={modalRef}>
                        <div className="journal-modal-header">
                            <h3>{getDisplayTitle(selectedJournal)}</h3>
                            <button 
                                className="modal-close-button"
                                onClick={() => setIsModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="journal-modal-url">
                            {selectedJournal.fullUrl || selectedJournal.url}
                            {selectedJournal.property_name && (
                                <span className="property-tag">{selectedJournal.property_name}</span>
                            )}
                        </div>

                        <div className="modal-tabs">
                            <div
                                className={`modal-tab ${gaModalTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setGaModalTab('overview')}
                            >
                                Overview
                            </div>
                            <div
                                className={`modal-tab ${gaModalTab === 'traffic' ? 'active' : ''}`}
                                onClick={() => setGaModalTab('traffic')}
                            >
                                Traffic Sources
                            </div>
                            <div
                                className={`modal-tab ${gaModalTab === 'geography' ? 'active' : ''}`}
                                onClick={() => setGaModalTab('geography')}
                            >
                                Geography
                            </div>
                            <div
                                className={`modal-tab ${gaModalTab === 'demographics' ? 'active' : ''}`}
                                onClick={() => setGaModalTab('demographics')}
                            >
                                Demographics
                            </div>
                            <div
                                className={`modal-tab ${gaModalTab === 'technology' ? 'active' : ''}`}
                                onClick={() => setGaModalTab('technology')}
                            >
                                Technology
                            </div>
                            {groupByTitle && selectedJournal.combinedUrls && selectedJournal.combinedUrls.length > 1 && (
                                <div
                                    className={`modal-tab ${gaModalTab === 'pages' ? 'active' : ''}`}
                                    onClick={() => setGaModalTab('pages')}
                                >
                                    Pages ({selectedJournal.combinedUrls.length})
                                </div>
                            )}
                        </div>

                        {gaModalTab === 'overview' && (
                            <>
                                <div className="journal-modal-controls">
                                    <div className="timeframe-filter">
                                        <label htmlFor="modalTimeframeFilter">Timeframe:</label>
                                        <select
                                            id="modalTimeframeFilter"
                                            value={timeframeFilter}
                                            onChange={handleGlobalTimeframeChange}
                                        >
                                            <option value="all">All Time</option>
                                            <option value="12">Last 12 Months</option>
                                            <option value="6">Last 6 Months</option>
                                            <option value="3">Last 3 Months</option>
                                            <option value="1">Last Month</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="journal-modal-metrics">
                                    <div className="metric-card">
                                        <div className="metric-label">Total Users</div>
                                        <div className="metric-value">
                                            {formatNumber(selectedJournal.totalUsers || 0)}
                                        </div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-label">Avg Duration</div>
                                        <div className="metric-value">
                                            {formatEngagement(selectedJournal.avgDuration || 0)}
                                        </div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-label">Bounce Rate</div>
                                        <div className="metric-value">
                                            {formatBounceRate(selectedJournal.bounceRate || 0)}
                                        </div>
                                    </div>
                                </div>

                                <div className="journal-modal-monthly">
                                    <h4>Historical Data</h4>
                                    {selectedJournal.history && selectedJournal.history.length > 0 ? (
                                        <>
                                            <table className="detail-table monthly-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Users</th>
                                                        <th>Avg Duration</th>
                                                        <th>Bounce Rate</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedJournal.history.slice().reverse().map((data, index) => (
                                                        <tr key={index}>
                                                            <td>{data.date}</td>
                                                            <td>{formatNumber(data.total_users || 0)}</td>
                                                            <td>{formatEngagement(data.avg_duration || 0)}</td>
                                                            <td>{((data.bounce_rate || 0) * 100).toFixed(2)}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="journal-chart-container">
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <LineChart
                                                        data={selectedJournal.history}
                                                        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis yAxisId="left" />
                                                        <YAxis yAxisId="right" orientation="right" />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Line yAxisId="left" type="monotone" dataKey="total_users" stroke="#8884d8" name="Users" activeDot={{ r: 8 }} />
                                                        <Line yAxisId="right" type="monotone" dataKey="avg_duration" stroke="#82ca9d" name="Avg Duration (sec)" />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </>
                                    ) : (
                                        <p>No historical data available</p>
                                    )}
                                </div>

                            </>
                        )}

                        {gaModalTab === 'traffic' && (
                            <div className="journal-modal-details">
                                <div className="device-breakdown full-width">
                                    <h4>Traffic Sources</h4>
                                    {selectedJournal.sources && Object.entries(selectedJournal.sources).length > 0 ? (
                                        <table className="detail-table">
                                            <thead>
                                                <tr>
                                                    <th>Source</th>
                                                    <th>Sessions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedJournal.sources)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .map(([source, count], index) => (
                                                        <tr key={index}>
                                                            <td>{source}</td>
                                                            <td>{formatNumber(count)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No traffic source data available</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {gaModalTab === 'geography' && (
                            <div className="journal-modal-details">
                                <div className="device-breakdown">
                                    <h4>Top Countries</h4>
                                    {selectedJournal.breakdowns?.geography?.countries && Object.keys(selectedJournal.breakdowns.geography.countries).length > 0 ? (
                                        <table className="detail-table">
                                            <thead>
                                                <tr>
                                                    <th>Country</th>
                                                    <th>Users</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedJournal.breakdowns.geography.countries)
                                                    .sort(([,a], [,b]) => (b.users || b) - (a.users || a))
                                                    .map(([country, data], index) => (
                                                        <tr key={index}>
                                                            <td>{country}</td>
                                                            <td>{formatNumber(data.users || data)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No country data available</p>
                                    )}
                                </div>
                                <div className="source-breakdown">
                                    <h4>Top Cities</h4>
                                    {selectedJournal.breakdowns?.geography?.cities && Object.keys(selectedJournal.breakdowns.geography.cities).length > 0 ? (
                                        <table className="detail-table">
                                            <thead>
                                                <tr>
                                                    <th>City</th>
                                                    <th>Users</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedJournal.breakdowns.geography.cities)
                                                    .sort(([,a], [,b]) => b - a)
                                                    .map(([city, users], index) => (
                                                        <tr key={index}>
                                                            <td>{city}</td>
                                                            <td>{formatNumber(users)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No city data available</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {gaModalTab === 'demographics' && (
                            <div className="journal-modal-details">
                                <div className="device-breakdown">
                                    <h4>Age Groups</h4>
                                    {selectedJournal.breakdowns?.demographics?.ageGroups && Object.keys(selectedJournal.breakdowns.demographics.ageGroups).length > 0 ? (
                                        <table className="detail-table">
                                            <thead>
                                                <tr>
                                                    <th>Age</th>
                                                    <th>Users</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedJournal.breakdowns.demographics.ageGroups)
                                                    .sort(([a], [b]) => a.localeCompare(b))
                                                    .map(([age, users], index) => (
                                                        <tr key={index}>
                                                            <td>{age}</td>
                                                            <td>{formatNumber(users)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No age data available</p>
                                    )}
                                </div>
                                <div className="source-breakdown">
                                    <h4>Gender</h4>
                                    {selectedJournal.breakdowns?.demographics?.genders && Object.keys(selectedJournal.breakdowns.demographics.genders).length > 0 ? (
                                        <table className="detail-table">
                                            <thead>
                                                <tr>
                                                    <th>Gender</th>
                                                    <th>Users</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedJournal.breakdowns.demographics.genders)
                                                    .sort(([,a], [,b]) => b - a)
                                                    .map(([gender, users], index) => (
                                                        <tr key={index}>
                                                            <td>{gender}</td>
                                                            <td>{formatNumber(users)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No gender data available</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {gaModalTab === 'technology' && (
                            <>
                            <div className="journal-modal-details">
                                <div className="device-breakdown">
                                    <h4>Device Breakdown</h4>
                                    {selectedJournal.devices && Object.entries(selectedJournal.devices).length > 0 ? (
                                        <table className="detail-table">
                                            <thead>
                                                <tr>
                                                    <th>Device</th>
                                                    <th>Users</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedJournal.devices)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .map(([device, count], index) => (
                                                        <tr key={index}>
                                                            <td>{device.charAt(0).toUpperCase() + device.slice(1)}</td>
                                                            <td>{formatNumber(count)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No device data available</p>
                                    )}
                                </div>
                            </div>
                            <div className="journal-modal-details">
                                <div className="device-breakdown">
                                    <h4>Browsers</h4>
                                    {selectedJournal.breakdowns?.technology?.browsers && Object.keys(selectedJournal.breakdowns.technology.browsers).length > 0 ? (
                                        <table className="detail-table">
                                            <thead>
                                                <tr>
                                                    <th>Browser</th>
                                                    <th>Users</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedJournal.breakdowns.technology.browsers)
                                                    .sort(([,a], [,b]) => b - a)
                                                    .map(([browser, users], index) => (
                                                        <tr key={index}>
                                                            <td>{browser}</td>
                                                            <td>{formatNumber(users)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No browser data available</p>
                                    )}
                                </div>
                                <div className="source-breakdown">
                                    <h4>Operating Systems</h4>
                                    {selectedJournal.breakdowns?.technology?.operatingSystems && Object.keys(selectedJournal.breakdowns.technology.operatingSystems).length > 0 ? (
                                        <table className="detail-table">
                                            <thead>
                                                <tr>
                                                    <th>OS</th>
                                                    <th>Users</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedJournal.breakdowns.technology.operatingSystems)
                                                    .sort(([,a], [,b]) => b - a)
                                                    .map(([os, users], index) => (
                                                        <tr key={index}>
                                                            <td>{os}</td>
                                                            <td>{formatNumber(users)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No OS data available</p>
                                    )}
                                </div>
                            </div>
                            </>
                        )}

                        {gaModalTab === 'pages' && groupByTitle && selectedJournal.combinedUrls && selectedJournal.combinedUrls.length > 1 && (
                            <div className="journal-modal-combined-urls">
                                <h4>Combined Pages ({selectedJournal.combinedUrls.length} URLs)</h4>
                                <div className="combined-urls-grid">
                                    {selectedJournal.combinedUrls
                                        .sort((a, b) => {
                                            const getPageNumber = (url) => {
                                                const lastPart = url.split('/').pop();
                                                if (lastPart?.match(/^Page\s+(\d+)$/i)) {
                                                    return parseInt(lastPart.match(/(\d+)/)[1]);
                                                }
                                                if (lastPart?.match(/^S-(\d+)$/i)) {
                                                    return parseInt(lastPart.match(/(\d+)/)[1]);
                                                }
                                                return 999;
                                            };
                                            return getPageNumber(a) - getPageNumber(b);
                                        })
                                        .map((url, index) => {
                                            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                                            return (
                                                <div key={index} className="combined-url-card">
                                                    <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="url-card-link">
                                                        {url.split('/').pop() || `URL ${index + 1}`}
                                                    </a>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}


                    </div>
                </div>
            )}

            {walsworthModalOpen && selectedWalsworthIssue && (
                <div className="journal-modal-overlay">
                    <div className="journal-modal" ref={walsworthModalRef}>
                        <div className="journal-modal-header">
                            <h3>{selectedWalsworthIssue.issue_name}</h3>
                            <button className="modal-close-button" onClick={() => setWalsworthModalOpen(false)}>×</button>
                        </div>

                        {selectedWalsworthIssue.issue_url && (
                            <div className="journal-modal-url">
                                <a href={selectedWalsworthIssue.issue_url} target="_blank" rel="noopener noreferrer">
                                    {selectedWalsworthIssue.issue_url}
                                </a>
                            </div>
                        )}

                        <div className="journal-modal-controls">
                            <div className="timeframe-filter">
                                <label>Timeframe:</label>
                                <select
                                    value={walsworthTimeFilter}
                                    onChange={(e) => setWalsworthTimeFilter(e.target.value)}
                                >
                                    <option value="all">All Time</option>
                                    <option value="7">Last 7 Days</option>
                                    <option value="14">Last 14 Days</option>
                                </select>
                            </div>
                        </div>

                        <div className="journal-modal-metrics">
                            <div className="metric-card">
                                <div className="metric-label">Total Page Views</div>
                                <div className="metric-value">{formatNumber(selectedWalsworthIssue.current?.total_page_views || 0)}</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Unique Page Views</div>
                                <div className="metric-value">{formatNumber(selectedWalsworthIssue.current?.unique_page_views || 0)}</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Total Issue Visits</div>
                                <div className="metric-value">{formatNumber(selectedWalsworthIssue.current?.total_issue_visits || 0)}</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Avg Time in Issue</div>
                                <div className="metric-value">{formatTimeInIssue(selectedWalsworthIssue.current?.seconds_per_visit || 0)}</div>
                            </div>
                        </div>

                        <div className="journal-modal-monthly">
                            <h4>Daily History</h4>
                            {selectedWalsworthIssue.history && selectedWalsworthIssue.history.length > 0 ? (
                                <>
                                    <table className="detail-table monthly-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Page Views</th>
                                                <th>Unique Views</th>
                                                <th>Visits</th>
                                                <th>Avg Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filterWalsworthHistory(selectedWalsworthIssue.history, walsworthTimeFilter)
                                                .slice()
                                                .reverse()
                                                .map((entry, index) => (
                                                    <tr key={index}>
                                                        <td>{entry.date}</td>
                                                        <td>{formatNumber(entry.total_page_views || 0)}</td>
                                                        <td>{formatNumber(entry.unique_page_views || 0)}</td>
                                                        <td>{formatNumber(entry.total_issue_visits || 0)}</td>
                                                        <td>{formatTimeInIssue(entry.seconds_per_visit || 0)}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>

                                    <div className="journal-chart-container">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart
                                                data={filterWalsworthHistory(selectedWalsworthIssue.history, walsworthTimeFilter)}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" />
                                                <YAxis yAxisId="left" />
                                                <YAxis yAxisId="right" orientation="right" />
                                                <Tooltip />
                                                <Legend />
                                                <Line
                                                    yAxisId="left"
                                                    type="monotone"
                                                    dataKey="total_page_views"
                                                    stroke="#8884d8"
                                                    name="Page Views"
                                                    activeDot={{ r: 8 }}
                                                />
                                                <Line
                                                    yAxisId="right"
                                                    type="monotone"
                                                    dataKey="total_issue_visits"
                                                    stroke="#82ca9d"
                                                    name="Visits"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <p>No historical data available</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DigitalJournals;