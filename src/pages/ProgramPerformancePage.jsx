import React, { useState, useEffect, useMemo, useCallback } from 'react';
import _ from 'lodash';
import ProgramCard from '../components/programs/ProgramCard';
import ProgramCreator from '../components/programs/ProgramCreator';
import { API_BASE_URL } from '../config/api';
import '../styles/ProgramPerformance.css';
import '../styles/AnalyticsHub.css';

const BLOB_URLS = {
  emailCampaigns: 'https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D',
  youtube: 'https://emaildash.blob.core.windows.net/json-data/youtube_metrics.json?sp=r&st=2026-01-23T22:10:53Z&se=2028-02-03T06:25:53Z&spr=https&sv=2024-11-04&sr=b&sig=5a4p0mFtPn4d9In830LMCQOJlaqkcuPCt7okIDLSHBA%3D',
  vimeo: 'https://emaildash.blob.core.windows.net/json-data/vimeo_metrics.json?sp=r&st=2026-01-16T21:10:17Z&se=2028-06-21T04:25:17Z&spr=https&sv=2024-11-04&sr=b&sig=KxSCICZ7CgOWv07ct%2Bv2ZViTuZoNtdd5osIS5PgfKa8%3D',
  facebookProfile: 'https://emaildash.blob.core.windows.net/json-data/facebook_profile_metrics.json?sp=r&st=2026-02-18T21:02:49Z&se=2028-05-21T04:17:49Z&spr=https&sv=2024-11-04&sr=b&sig=uE7Yej8V8qJ6W3FKIzWkexVON7c074h9Xnkd1RWqOPE%3D',
  facebookEngagement: 'https://emaildash.blob.core.windows.net/json-data/facebook_engagement_metrics.json?sp=r&st=2026-02-18T21:03:59Z&se=2028-05-17T04:18:59Z&spr=https&sv=2024-11-04&sr=b&sig=mZyVxrFi1U5Z234HHVICAxysq73m14Jpm3r%2BzCOzvKs%3D',
  instagramProfile: 'https://emaildash.blob.core.windows.net/json-data/instagram_profile_metrics.json?sp=r&st=2026-02-18T21:03:17Z&se=2028-05-27T04:18:17Z&spr=https&sv=2024-11-04&sr=b&sig=Iu%2B57JgpeateOx9zTPFEMnOEUMMFA8JMsXX8OPz5SXY%3D',
  instagramEngagement: 'https://emaildash.blob.core.windows.net/json-data/instagram_engagement_metrics.json?sp=r&st=2026-02-18T21:03:38Z&se=2028-05-16T04:18:38Z&spr=https&sv=2024-11-04&sr=b&sig=ZkHZS8lQQmkvTGjkxy3fFZVUtWNO5WGMOazVdkPNYVI%3D',
  linkedinProfile: 'https://emaildash.blob.core.windows.net/json-data/linkedin_profile_metrics.json?sp=r&st=2026-03-03T19:38:32Z&se=2027-08-05T02:53:32Z&spr=https&sv=2024-11-04&sr=b&sig=gCWLltCNiATBL6XysEg4WNh4JW%2FMD%2B16BkTt8jOP914%3D',
  linkedinEngagement: 'https://emaildash.blob.core.windows.net/json-data/linkedin_engagement_metrics.json?sp=r&st=2026-03-03T19:33:54Z&se=2028-03-22T02:48:54Z&spr=https&sv=2024-11-04&sr=b&sig=rAHmId4vA4G20FmRltPMwqoFMmpmQEmD1Y8CbUsZiU0%3D',
  walsworth: 'https://emaildash.blob.core.windows.net/json-data/walsworth_metrics.json?sp=r&st=2026-01-15T18:57:16Z&se=2027-09-24T02:12:16Z&spr=https&sv=2024-11-04&sr=b&sig=w1q9PY%2FMzuTUvwwOV%2Bcub%2FV7Cygeff3ESRaC2l1KvPM%3D',
  googleAnalytics: 'https://emaildash.blob.core.windows.net/json-data/google_analytics_metrics.json?sp=r&st=2026-01-16T21:12:00Z&se=2028-04-14T04:27:00Z&spr=https&sv=2024-11-04&sr=b&sig=fDQhUjngrEfV4mfCzwx7itsVhoyQYVkuNEwi86NSFf8%3D',
};

const cleanCampaignName = (name) => {
  return name.split(/\s*[-\u2013\u2014]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
};

const mergeDeployments = (campaigns) => {
  if (!campaigns || !campaigns.length) return [];
  const valid = campaigns.filter(item => (item.Delivered || 0) >= 100);
  const grouped = _.groupBy(valid, item => cleanCampaignName(item.Campaign));

  return Object.entries(grouped).map(([campaignName, deployments]) => {
    if (deployments.length === 1) {
      const d = deployments[0];
      return {
        ...d,
        Campaign: campaignName,
        Unique_Open_Rate: d.Delivered > 0 ? (d.Unique_Opens / d.Delivered) * 100 : 0,
        Total_Open_Rate: d.Delivered > 0 ? (d.Total_Opens / d.Delivered) * 100 : 0,
        Unique_Click_Rate: d.Unique_Opens > 0 ? (d.Unique_Clicks / d.Unique_Opens) * 100 : 0,
        Total_Click_Rate: d.Total_Opens > 0 ? (d.Total_Clicks / d.Total_Opens) * 100 : 0,
      };
    }

    const d1 = deployments.find(d => {
      const n = d.Campaign.toLowerCase();
      return n.includes('deployment 1') || n.includes('deployment #1') || n.includes('deployment1');
    });
    const base = d1 || deployments[0];
    const totalUniqueOpens = _.sumBy(deployments, 'Unique_Opens');
    const totalTotalOpens = _.sumBy(deployments, 'Total_Opens');
    const totalUniqueClicks = _.sumBy(deployments, 'Unique_Clicks');
    const totalTotalClicks = _.sumBy(deployments, 'Total_Clicks');

    return {
      Campaign: campaignName,
      Send_Date: base.Send_Date,
      Sent: base.Sent,
      Delivered: base.Delivered,
      Unique_Opens: totalUniqueOpens,
      Total_Opens: totalTotalOpens,
      Unique_Clicks: totalUniqueClicks,
      Total_Clicks: totalTotalClicks,
      Hard_Bounces: _.sumBy(deployments, 'Hard_Bounces'),
      Soft_Bounces: _.sumBy(deployments, 'Soft_Bounces'),
      Total_Bounces: _.sumBy(deployments, 'Total_Bounces'),
      Filtered_Bot_Clicks: _.sumBy(deployments, 'Filtered_Bot_Clicks'),
      Unique_Open_Rate: base.Delivered > 0 ? (totalUniqueOpens / base.Delivered) * 100 : 0,
      Total_Open_Rate: base.Delivered > 0 ? (totalTotalOpens / base.Delivered) * 100 : 0,
      Unique_Click_Rate: totalUniqueOpens > 0 ? (totalUniqueClicks / totalUniqueOpens) * 100 : 0,
      Total_Click_Rate: totalTotalOpens > 0 ? (totalTotalClicks / totalTotalOpens) * 100 : 0,
      DeploymentCount: deployments.length,
    };
  });
};

const ProgramPerformancePage = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreator, setShowCreator] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);

  const [allData, setAllData] = useState({
    emailCampaigns: [],
    basisCampaigns: [],
    basisBrands: [],
    youtubeData: { videos: {}, playlists: {} },
    vimeoVideos: [],
    facebookData: {},
    instagramData: {},
    linkedinData: {},
    walsPublications: [],
    googleAnalytics: [],
  });

  const fetchBlob = async (url) => {
    try {
      const res = await fetch(url + `&_t=${Date.now()}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  };

  useEffect(() => {
    const loadAll = async () => {
      const [
        emailRes,
        basisCampaignRes,
        basisBrandRes,
        ytRes,
        vmRes,
        fbProfileRes,
        fbEngRes,
        igProfileRes,
        igEngRes,
        liProfileRes,
        liEngRes,
        walsRes,
        gaRes,
        programsRes,
      ] = await Promise.all([
        fetchBlob(BLOB_URLS.emailCampaigns),
        fetch(`${API_BASE_URL}/api/basis/exchange-stats?group_by=campaign`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE_URL}/api/basis/exchange-stats?group_by=brand`).then(r => r.json()).catch(() => null),
        fetchBlob(BLOB_URLS.youtube),
        fetchBlob(BLOB_URLS.vimeo),
        fetchBlob(BLOB_URLS.facebookProfile),
        fetchBlob(BLOB_URLS.facebookEngagement),
        fetchBlob(BLOB_URLS.instagramProfile),
        fetchBlob(BLOB_URLS.instagramEngagement),
        fetchBlob(BLOB_URLS.linkedinProfile),
        fetchBlob(BLOB_URLS.linkedinEngagement),
        fetchBlob(BLOB_URLS.walsworth),
        fetchBlob(BLOB_URLS.googleAnalytics),
        fetch(`${API_BASE_URL}/api/programs/`).then(r => r.json()).catch(() => null),
      ]);

      const rawEmails = Array.isArray(emailRes) ? emailRes : (emailRes?.campaigns || []);
      const mergedEmails = mergeDeployments(rawEmails);

      const fbMerged = { companies: {} };
      const fbProf = fbProfileRes?.companies || {};
      const fbEng = fbEngRes?.companies || {};
      const fbKeys = new Set([...Object.keys(fbProf), ...Object.keys(fbEng)]);
      fbKeys.forEach(key => {
        fbMerged.companies[key] = { ...fbProf[key], ...fbEng[key] };
      });

      const igMerged = { companies: {} };
      const igProf = igProfileRes?.companies || {};
      const igEng = igEngRes?.companies || {};
      const igKeys = new Set([...Object.keys(igProf), ...Object.keys(igEng)]);
      igKeys.forEach(key => {
        igMerged.companies[key] = { ...igProf[key], ...igEng[key] };
      });

      const liMerged = { companies: {} };
      const liProf = liProfileRes?.companies || {};
      const liEng = liEngRes?.companies || {};
      const liKeys = new Set([...Object.keys(liProf), ...Object.keys(liEng)]);
      liKeys.forEach(key => {
        liMerged.companies[key] = { ...liProf[key], ...liEng[key] };
      });

      setAllData({
        emailCampaigns: mergedEmails,
        basisCampaigns: basisCampaignRes?.data || [],
        basisBrands: basisBrandRes?.data || [],
        youtubeData: ytRes || { videos: {}, playlists: {} },
        vimeoVideos: Array.isArray(vmRes) ? vmRes : (vmRes?.videos || []),
        facebookData: fbMerged,
        instagramData: igMerged,
        linkedinData: liMerged,
        walsPublications: walsRes?.issues || (Array.isArray(walsRes) ? walsRes : []),
        googleAnalytics: gaRes?.urls || (Array.isArray(gaRes) ? gaRes : []),
      });

      if (programsRes?.status === 'success') {
        setPrograms(programsRes.programs || []);
      }

      setLoading(false);
    };

    loadAll();
  }, []);

  const handleSaveProgram = useCallback(async (programData) => {
    try {
      const isEdit = !!programData.id;
      const url = isEdit ? `${API_BASE_URL}/api/programs/${programData.id}` : `${API_BASE_URL}/api/programs/`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: programData.name,
          description: programData.market || '',
          has_sub_programs: programData.has_sub_programs || false,
          items: programData.items || [],
          sub_programs: programData.sub_programs || [],
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (isEdit) {
          setPrograms(prev => prev.map(p => p.id === data.program.id ? data.program : p));
        } else {
          setPrograms(prev => [data.program, ...prev]);
        }
        setShowCreator(false);
        setEditingProgram(null);
      }
    } catch (e) {}
  }, []);

  const handleUpdateProgram = useCallback((updated) => {
    setPrograms(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  const handleDeleteProgram = useCallback((id) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleEditProgram = useCallback((program) => {
    setEditingProgram(program);
    setShowCreator(true);
  }, []);

  const filteredPrograms = useMemo(() => {
    let filtered = programs.filter(p => activeTab === 'active' ? p.status === 'active' : p.status === 'completed');
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return filtered;
  }, [programs, activeTab, searchTerm]);

  const activeCount = programs.filter(p => p.status === 'active').length;
  const completedCount = programs.filter(p => p.status === 'completed').length;

  return (
    <div className="pp-page analytics-hub">
      <div className="page-header">
        <h1>Program Performance</h1>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search"
          />
        </div>
      </div>

      <div className="analytics-tabs-container">
        <div className="analytics-tabs">
          <button className={`tab-button ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
            <span>Active Programs ({loading ? '...' : activeCount})</span>
          </button>
          <button className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
            <span>Completed Programs ({loading ? '...' : completedCount})</span>
          </button>
        </div>
        <div className="tab-controls">
          <button className="pp-btn pp-btn-create" onClick={() => { setEditingProgram(null); setShowCreator(true); }}>
            + Create Program
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pp-loading">
          <div className="pp-loading-spinner"></div>
          <span>Loading program data...</span>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="pp-empty-state">
          <h3>No {activeTab === 'active' ? 'Active' : 'Completed'} Programs</h3>
          <p>
            {programs.length === 0
              ? 'Create your first program to bundle campaigns, brands, videos, social posts, and publications into one unified view.'
              : 'No programs match your search.'}
          </p>
          {programs.length === 0 && (
            <button className="pp-btn pp-btn-create pp-btn-lg" onClick={() => { setEditingProgram(null); setShowCreator(true); }}>
              + Create Your First Program
            </button>
          )}
        </div>
      ) : (
        <div className="pp-programs-list">
          {filteredPrograms.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              allData={allData}
              onUpdate={handleUpdateProgram}
              onDelete={handleDeleteProgram}
              onEdit={handleEditProgram}
            />
          ))}
        </div>
      )}

      {showCreator && (
        <ProgramCreator
          allData={allData}
          editingProgram={editingProgram}
          onSave={handleSaveProgram}
          onClose={() => { setShowCreator(false); setEditingProgram(null); }}
        />
      )}
    </div>
  );
};

export default ProgramPerformancePage;