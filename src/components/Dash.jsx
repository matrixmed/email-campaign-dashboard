import React from 'react';
import './Dash.css';

const Dash = () => {
  const campaignData = {
    title: "Hot Topics in Alzheimer's Disease – June 2025",
    totalReached: 14287,
    totalEngaged: 4156,
    engagementRate: 29.1,
    uniqueClickRate: 2.8,
    deliveryRate: 99.3,
    avgClicksPerUser: 2.7,
    patientReach: "5.6M",
    costPerEngaged: 12.45,
    issueViews: 8924,
    timeInIssue: "4:23",
    socialShares: 234,
    linkedinCTR: 7.8,
    facebookReach: 45600,
    emailForwards: 156,
    downloadRate: 18.2,
    mobileOpenRate: 67.4,
    peakEngagementHour: "2 PM EST"
  };

  const specialtyData = [
    { name: "Psychiatry & Neurology", rate: 38.4, change: +6.2, volume: 892, authority: "High", costPer: 8.95 },
    { name: "Internal Medicine - Geriatric", rate: 34.7, change: +4.1, volume: 1247, authority: "High", costPer: 9.12 },
    { name: "Neurological Surgery", rate: 32.1, change: +8.9, volume: 156, authority: "Premium", costPer: 15.67 },
    { name: "Internal Medicine", rate: 28.6, change: +2.3, volume: 1834, authority: "Medium", costPer: 6.78 },
    { name: "Physician Assistant", rate: 26.4, change: +1.7, volume: 743, authority: "Medium", costPer: 7.23 },
    { name: "Nurse Practitioner", rate: 24.8, change: -0.8, volume: 612, authority: "Medium", costPer: 8.45 },
    { name: "Emergency Medicine", rate: 23.1, change: +3.2, volume: 298, authority: "High", costPer: 11.34 },
    { name: "Family Medicine", rate: 21.9, change: +1.4, volume: 567, authority: "Medium", costPer: 7.89 }
  ];

  const benchmarkData = {
    industryAverage: 21.4,
    matrixAverage: 23.7,
    competitorAverage: 19.8,
    performance: "+15% above industry",
    matrixPerformance: "+23% above Matrix avg"
  };

  const demographicData = {
    mdEngagement: 72,
    doEngagement: 68,
    npEngagement: 45,
    paEngagement: 41,
    avgYearsExperience: 12.3,
    academicAffiliation: 34,
    privatepractice: 56,
    hospitalBased: 38
  };

  const geographicData = [
    { region: "Northeast", engagement: 31.2, volume: 2890 },
    { region: "Southeast", engagement: 28.7, volume: 3245 },
    { region: "Midwest", engagement: 26.8, volume: 2156 },
    { region: "West", engagement: 30.9, volume: 2634 },
    { region: "Southwest", engagement: 25.4, volume: 1876 }
  ];

  const timeData = {
    firstHourOpens: 18.2,
    first24HourOpens: 76.8,
    first72HourOpens: 89.4,
    peakDay: "Tuesday",
    avgTimeToOpen: "3.2 hours",
    reEngagementRate: 23.7
  };

  return (
    <div className="campaign-dash">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-campaign-title">
          <h1>{campaignData.title}</h1>
          <img src={`${process.env.PUBLIC_URL}/matrix.png`} alt="matrix" className="dash-matrix-icon" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dash-main-grid">
        
        {/* Hero Metrics Row */}
        <div className="dash-hero-section">
          <div className="dash-hero-metric primary">
            <img src={`${process.env.PUBLIC_URL}/icons/engagement.png`} />
            <div className="dash-metric-label">Unique Engagement Rate</div>
            <div className="dash-metric-value">{campaignData.engagementRate}%</div>
            <div className="dash-benchmark-indicator">
              <span className="dash-benchmark-text">{benchmarkData.performance}</span>
              <img src={`${process.env.PUBLIC_URL}/icons/trending.png`}/>
            </div>
          </div>

          <div className="dash-hero-metric secondary">
            <img src={`${process.env.PUBLIC_URL}/icons/cost.png`}/>
            <div className="dash-metric-label">Cost Per Engaged Professional</div>
            <div className="dash-metric-value">${campaignData.costPerEngaged}</div>
            <div className="dash-metric-subtitle">87% below industry average</div>
          </div>

          <div className="dash-hero-metric secondary">
            <img src={`${process.env.PUBLIC_URL}/icons/reach.png`}/>
            <div className="dash-metric-label">Potential Patient Impact</div>
            <div className="dash-metric-value">{campaignData.patientReach}</div>
            <div className="dash-metric-subtitle">Calculated using verified patient panel sizes</div>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="dash-metrics-section">
          <h3 className="dash-section-title">Campaign Performance</h3>
          <div className="dash-metrics-grid">
            <div className="dash-metric-card">
              <img src={`${process.env.PUBLIC_URL}/icons/users.png`}/>
              <div className="dash-metric-number">{campaignData.totalReached.toLocaleString()}</div>
              <div className="dash-metric-desc">Healthcare Professionals Reached</div>
              <div className="dash-metric-trend positive">+12% vs last campaign</div>
            </div>
            
            <div className="dash-metric-card highlighted">
              <img src={`${process.env.PUBLIC_URL}/icons/engagement.png`}/>
              <div className="dash-metric-number">{campaignData.totalEngaged.toLocaleString()}</div>
              <div className="dash-metric-desc">Unique Healthcare Professional Engagements</div>
              <div className="dash-metric-border"></div>
            </div>

            <div className="dash-metric-card">
              <img src={`${process.env.PUBLIC_URL}/icons/delivery.png`}/>
              <div className="dash-metric-number">{campaignData.deliveryRate}%</div>
              <div className="dash-metric-desc">Delivery Rate</div>
            </div>
            
            <div className="dash-metric-card">
              <img src={`${process.env.PUBLIC_URL}/icons/click.png`}/>
              <div className="dash-metric-number">{campaignData.uniqueClickRate}%</div>
              <div className="dash-metric-desc">Click Actions</div>
              <div className="dash-metric-trend positive">+0.8% vs Industry avg</div>
            </div>            

            <div className="dash-metric-card">
              <img src={`${process.env.PUBLIC_URL}/icons/mobile.png`}/>
              <div className="dash-metric-number">{campaignData.mobileOpenRate}%</div>
              <div className="dash-metric-desc">Mobile Engagement Rate</div>
            </div>

            <div className="dash-metric-card">
              <img src={`${process.env.PUBLIC_URL}/icons/time.png`}/>
              <div className="dash-metric-number">{timeData.avgTimeToOpen}</div>
              <div className="dash-metric-desc">Average Time to Open</div>
            </div>
            <div className="dash-timing-card">
              <img src={`${process.env.PUBLIC_URL}/icons/speed.png`}/>
              <div className="dash-timing-value">{timeData.first24HourOpens}%</div>
              <div className="dash-timing-label">24-Hour Open Rate</div>
            </div>
          </div>
        </div>

         {/* Specialty Performance */}
        <div className="dash-specialty-section">
          <h3 className="dash-section-title">Specialty Engagement Performance</h3>
          <div className="dash-specialty-grid">
            {specialtyData.map((specialty, index) => (
              <div key={index} className="dash-specialty-card">
                <div className="dash-specialty-header">
                  <div className="dash-specialty-name">{specialty.name}</div>
                  <div className={`dash-authority-badge ${specialty.authority.toLowerCase()}`}>
                    {specialty.authority}
                  </div>
                </div>
                <div className="dash-specialty-metrics">
                  <span className="dash-specialty-rate">{specialty.rate}%</span>
                  <span className={`dash-specialty-change ${specialty.change > 0 ? 'positive' : 'negative'}`}>
                    {specialty.change > 0 ? '↗' : '↘'} {Math.abs(specialty.change)}%
                  </span>
                </div>
                <div className="dash-specialty-details">
                  <span className="dash-specialty-volume">{specialty.volume} engaged</span>
                  <span className="dash-specialty-cost">${specialty.costPer}/engaged</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-authority-section">
          <h3 className="dash-section-title">Professional Authority Analysis</h3>
          <div className="dash-authority-grid">
            <div className="dash-authority-card premium">
              <img src={`${process.env.PUBLIC_URL}/icons/doctor.png`}/>
              <div className="dash-authority-value">{demographicData.mdEngagement}%</div>
              <div className="dash-authority-label">MD Engagement</div>
            </div>
            <div className="dash-authority-card high">
              <img src={`${process.env.PUBLIC_URL}/icons/doctor.png`}/>
              <div className="dash-authority-value">{demographicData.doEngagement}%</div>
              <div className="dash-authority-label">DO Engagement</div>
            </div>
            <div className="dash-authority-card medium">
              <img src={`${process.env.PUBLIC_URL}/icons/experience.png`}/>
              <div className="dash-authority-value">{demographicData.avgYearsExperience}</div>
              <div className="dash-authority-label">Avg Years Experience</div>
            </div>
            <div className="dash-authority-card academic">
              <img src={`${process.env.PUBLIC_URL}/icons/academic.png`}/>
              <div className="dash-authority-value">{demographicData.academicAffiliation}%</div>
              <div className="dash-authority-label">Academic Affiliation</div>
            </div>
          </div>
        </div>

        {/* Journal Cover & Digital Metrics */}
        <div className="dash-journal-section">
          <div className="dash-journal-cover">
            <div className="dash-journal-mockup">
              <div className="dash-journal-header">Hot Topics in</div>
              <div className="dash-journal-title">ALZHEIMER'S DISEASE</div>
              <div className="dash-journal-subtitle">Evidence-based Information for Healthcare Professionals</div>
              <div className="dash-journal-date">June 2025</div>
              <div className="dash-journal-visual">
                <img src={`${process.env.PUBLIC_URL}/icons/brain.png`}/>
              </div>
              <div className="dash-journal-sponsor">Sponsored Content</div>
            </div>
          </div>

          <div className="dash-digital-metrics">
            <h4>Digital Journal Performance</h4>
            <div className="dash-digital-grid">
              <div className="dash-digital-card">
                <img src={`${process.env.PUBLIC_URL}/icons/views.png`}/>
                <span className="dash-digital-number">{campaignData.issueViews.toLocaleString()}</span>
                <span className="dash-digital-label">Issue Views</span>
              </div>
              <div className="dash-digital-card">
                <img src={`${process.env.PUBLIC_URL}/icons/time.png`}/>
                <span className="dash-digital-number">{campaignData.timeInIssue}</span>
                <span className="dash-digital-label">Avg Time in Issue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Performance */}
        <div className="dash-social-section">
          <h3 className="dash-section-title">Social Media Amplification</h3>
          <div className="dash-social-grid">
            <div className="dash-social-card linkedin">
              <img src={`${process.env.PUBLIC_URL}/icons/linkedin.png`}/>
              <div className="dash-social-metric">
                <span className="dash-social-value">{campaignData.linkedinCTR}%</span>
                <span className="dash-social-label">LinkedIn CTR</span>
              </div>
            </div>
            <div className="dash-social-card facebook">
              <img src={`${process.env.PUBLIC_URL}/icons/facebook.png`}/>
              <div className="dash-social-metric">
                <span className="dash-social-value">{campaignData.facebookReach.toLocaleString()}</span>
                <span className="dash-social-label">Facebook Reach</span>
              </div>
            </div>
            <div className="dash-social-card shares">
              <img src={`${process.env.PUBLIC_URL}/icons/share.png`}/>
              <div className="dash-social-metric">
                <span className="dash-social-value">{campaignData.socialShares}</span>
                <span className="dash-social-label">Social Shares</span>
              </div>
            </div>
          </div>
        </div>

        {/* Geographic Performance */}
        <div className="dash-geographic-section">
          <h3 className="dash-section-title">Regional Performance</h3>
          <div className="dash-geographic-grid">
            {geographicData.map((region, index) => (
              <div key={index} className="dash-geographic-card">
                <div className="dash-region-name">{region.region}</div>
                <div className="dash-region-rate">{region.engagement}%</div>
                <div className="dash-region-volume">{region.volume.toLocaleString()} professionals</div>
                <div className="dash-region-bar">
                  <div className="dash-region-fill" style={{width: `${(region.engagement/35)*100}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dash;