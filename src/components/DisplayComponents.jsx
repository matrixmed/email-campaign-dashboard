import React from 'react';

const formatNumber = (value, decimals = 2, defaultVal = 'N/A') => {
  if (value === undefined || value === null) return defaultVal;
  return typeof value === 'number' ? value.toFixed(decimals) : defaultVal;
};

const NoDataPlaceholder = ({ message = "No data available", suggestion = null }) => (
  <div className="no-data-placeholder">
    <p>{message}</p>
    {suggestion && <p className="suggestion">{suggestion}</p>}
  </div>
);

export const ErrorDisplay = ({ data }) => (
  <div className="error-display">
    <div className="error-message">
      <p>{data.message}</p>
      {data.technicalDetails && (
        <details>
          <summary>Technical Details</summary>
          <p className="technical-details">{data.technicalDetails}</p>
        </details>
      )}
    </div>
    
    {data.suggestions && data.suggestions.length > 0 && (
      <div className="error-suggestions">
        <p>Suggestions:</p>
        <ul>
          {data.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export const UserCountDisplay = ({ data }) => (
  <div className="user-count-display">
    <h3>User Count</h3>
    
    <div className="metrics-grid">
      {data.totalUsers !== undefined && (
        <div className="metric-card">
          <div className="metric-card-title">Total Users</div>
          <div className="metric-card-value">
            {typeof data.totalUsers === 'number' ? data.totalUsers.toLocaleString() : 'N/A'}
          </div>
        </div>
      )}
      
      {data.specialtyUsers !== undefined && data.specialty && (
        <div className="metric-card">
          <div className="metric-card-title">{data.specialty} Users</div>
          <div className="metric-card-value">
            {typeof data.specialtyUsers === 'number' ? data.specialtyUsers.toLocaleString() : 'N/A'}
          </div>
        </div>
      )}
    </div>
    
    {data.specialty && data.specialtyUsers !== undefined && data.totalUsers !== undefined && (
      <div style={{ marginTop: '20px' }}>
        <h4>Distribution</h4>
        <div style={{ 
          display: 'flex', 
          height: '30px', 
          width: '100%', 
          backgroundColor: '#333',
          borderRadius: '4px',
          overflow: 'hidden',
          marginTop: '10px'
        }}>
          <div style={{ 
            width: `${Math.min(100, (data.specialtyUsers / data.totalUsers) * 100)}%`, 
            backgroundColor: '#0077ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px'
          }}>
            {data.specialtyUsers > 0 ? `${Math.round((data.specialtyUsers / data.totalUsers) * 100)}%` : '0%'}
          </div>
        </div>
        <div style={{ marginTop: '5px', fontSize: '14px' }}>
          {data.specialty} represents {Math.round((data.specialtyUsers / data.totalUsers) * 100)}% of total users
        </div>
      </div>
    )}
    
    {data.confidence && (
      <div className="data-confidence" style={{ marginTop: '20px', fontSize: '14px', color: '#999' }}>
        <p>Data confidence: {data.confidence}</p>
      </div>
    )}
  </div>
);

export const SpecialtyEngagementDisplay = ({ data }) => (
  <div className="specialty-engagement-display">
    <h3>Engagement Metrics for {data.specialty}</h3>
    
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-card-title">Users</div>
        <div className="metric-card-value">
          {typeof data.userCount === 'number' ? data.userCount.toLocaleString() : 'N/A'}
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-card-title">Open Rate</div>
        <div className="metric-card-value">
          {formatNumber(data.engagementMetrics?.openRate)}%
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-card-title">Click Rate</div>
        <div className="metric-card-value">
          {formatNumber(data.engagementMetrics?.clickRate)}%
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-card-title">Response Time</div>
        <div className="metric-card-value">
          {formatNumber(data.engagementMetrics?.responseTime)} hours
        </div>
      </div>
    </div>
    
    {data.preferredTopics && data.preferredTopics.length > 0 && (
      <div style={{ marginTop: '25px' }}>
        <h4 style={{ color: '#0ff', marginBottom: '15px' }}>Preferred Topics</h4>
        <div className="topics-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '15px' 
        }}>
          {data.preferredTopics.map((topic, index) => (
            <div key={index} className="metric-card">
              <div className="metric-card-title">{topic.topic}</div>
              <div style={{ marginTop: '8px' }}>
                Engagement: {formatNumber(topic.score)}
              </div>
              {topic.openRate !== undefined && (
                <div>
                  Open Rate: {formatNumber(topic.openRate)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
    
    {data.bestContent && data.bestContent.length > 0 && (
      <div style={{ marginTop: '25px' }}>
        <h4 style={{ color: '#0ff', marginBottom: '15px' }}>Best Performing Content</h4>
        <table className="users-table">
          <thead>
            <tr>
              <th>Content</th>
              <th>Engagement</th>
              <th>Session Duration</th>
            </tr>
          </thead>
          <tbody>
            {data.bestContent.map((content, index) => (
              <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td>{content.campaign_name || content.topic || 'N/A'}</td>
                <td>{formatNumber(content.score || content.avg_session_duration)}</td>
                <td>{content.avg_session_duration ? `${formatNumber(content.avg_session_duration)} sec` : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    
    {data.statisticalValidity && (
      <div className="statistical-validity" style={{ marginTop: '25px', fontSize: '14px', color: '#999' }}>
        <p>Statistical confidence: {data.statisticalValidity.confidence_level}</p>
        {data.statisticalValidity.sample_size_adequate === false && (
          <p style={{ color: 'orange' }}>Note: Sample size may be too small for high statistical confidence</p>
        )}
      </div>
    )}
  </div>
);

export const SpecialtyComparisonDisplay = ({ data }) => {
  const getMetricValue = (specialty, metricName, defaultValue = 0) => {
    return specialty.engagementMetrics?.[metricName] ?? defaultValue;
  };
  
  const getMaxMetricValue = (metricName) => {
    return Math.max(...data.specialties.map(s => getMetricValue(s, metricName, 0)));
  };
  
  const getPercentOfMax = (value, metricName) => {
    const max = getMaxMetricValue(metricName);
    return max > 0 ? (value / max) * 100 : 0;
  };
  
  return (
    <div className="specialty-comparison-display">
      <h3>Specialty Comparison</h3>
      
      {data.specialties.length === 0 ? (
        <NoDataPlaceholder message="No specialty data available for comparison." />
      ) : (
        <>
          <div className="comparison-grid" style={{ marginTop: '20px' }}>
            <div className="comparison-headers" style={{ 
              display: 'grid',
              gridTemplateColumns: '200px repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '15px',
              fontWeight: 'bold'
            }}>
              <div>Specialty</div>
              <div>Open Rate</div>
              <div>Click Rate</div>
              <div>Response Time</div>
            </div>
            
            {data.specialties.map((specialty, index) => (
              <div key={index} className="comparison-row" style={{ 
                display: 'grid',
                gridTemplateColumns: '200px repeat(3, 1fr)',
                gap: '10px',
                marginBottom: '10px'
              }}>
                <div className="specialty-name" style={{ fontWeight: 'bold' }}>
                  {specialty.specialty}
                  <div style={{ fontSize: '12px', fontWeight: 'normal' }}>
                    {specialty.userCount > 0 ? `${specialty.userCount.toLocaleString()} users` : 'N/A'}
                  </div>
                </div>
                
                <div className="metric-cell">
                  <div className="metric-value">{formatNumber(getMetricValue(specialty, 'openRate'))}%</div>
                  <div className="metric-bar" style={{ 
                    height: '8px',
                    width: `${getPercentOfMax(getMetricValue(specialty, 'openRate'), 'openRate')}%`,
                    backgroundColor: '#0077ff',
                    borderRadius: '4px',
                    marginTop: '5px'
                  }}></div>
                </div>
                
                <div className="metric-cell">
                  <div className="metric-value">{formatNumber(getMetricValue(specialty, 'clickRate'))}%</div>
                  <div className="metric-bar" style={{ 
                    height: '8px',
                    width: `${getPercentOfMax(getMetricValue(specialty, 'clickRate'), 'clickRate')}%`,
                    backgroundColor: '#00cc99',
                    borderRadius: '4px',
                    marginTop: '5px'
                  }}></div>
                </div>
                
                <div className="metric-cell">
                  <div className="metric-value">{formatNumber(getMetricValue(specialty, 'responseTime'))} hrs</div>
                  <div className="metric-bar" style={{ 
                    height: '8px',
                    width: `${getPercentOfMax(getMetricValue(specialty, 'responseTime'), 'responseTime')}%`,
                    backgroundColor: '#ff9900',
                    borderRadius: '4px',
                    marginTop: '5px'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="topic-preferences" style={{ marginTop: '30px' }}>
            <h4 style={{ color: '#0ff', marginBottom: '15px' }}>Preferred Topics by Specialty</h4>
            
            <div className="topics-comparison" style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {data.specialties.map((specialty, index) => (
                <div key={index} className="specialty-topics">
                  <h5>{specialty.specialty}</h5>
                  {specialty.topTopics && specialty.topTopics.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {specialty.topTopics.map((topic, topicIndex) => (
                        <li key={topicIndex} style={{ 
                          padding: '8px',
                          backgroundColor: '#333',
                          marginBottom: '5px',
                          borderRadius: '4px'
                        }}>
                          {topic.topic}
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            Score: {formatNumber(topic.score)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No topic data available</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="device-preferences" style={{ marginTop: '30px' }}>
            <h4 style={{ color: '#0ff', marginBottom: '15px' }}>Device Preferences</h4>
            
            <div className="device-comparison" style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px'
            }}>
              {data.specialties.map((specialty, index) => (
                <div key={index} className="specialty-device metric-card">
                  <div className="metric-card-title">{specialty.specialty}</div>
                  <div className="metric-card-value">
                    {specialty.devicePreference || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const TopUsersDisplay = ({ data }) => {
  const users = data.users || [];
  const sortedBy = data.sortedBy || 'engagementScore';
  const sortedByLabel = 
    sortedBy === 'engagementScore' ? 'Engagement Score' :
    sortedBy === 'openRate' ? 'Open Rate' :
    sortedBy === 'clickRate' ? 'Click Rate' : 'Engagement';
  
  return (
    <div className="top-users-display">
      <h3>Top Engaged Users {data.segment ? `in ${data.segment}` : ''}</h3>
      
      {users.length === 0 ? (
        <NoDataPlaceholder 
          message="No user data available for this query." 
          suggestion="Try a different segment or a more general query."
        />
      ) : (
        <>
          <div className="result-summary">
            Found {users.length} highly engaged users
            {data.segmentType ? ` in ${data.segmentType}: ${data.segment}` : ''}
            {data.totalMatching > users.length && ` (showing top ${users.length} of ${data.totalMatching})`}
            {sortedBy && ` sorted by ${sortedByLabel}`}
          </div>
          
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Specialty</th>
                <th className={sortedBy === 'engagementScore' ? 'sorted-column' : ''}>
                  Engagement Score
                </th>
                <th className={sortedBy === 'openRate' ? 'sorted-column' : ''}>
                  Open Rate
                </th>
                {sortedBy === 'clickRate' && (
                  <th className="sorted-column">Click Rate</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="user-cell">
                    {user.name}
                    <div className="user-email">{user.email}</div>
                  </td>
                  <td>{user.specialty || 'N/A'}</td>
                  <td className={sortedBy === 'engagementScore' ? 'sorted-column' : ''}>
                    {formatNumber(user.engagementScore)}
                  </td>
                  <td className={sortedBy === 'openRate' ? 'sorted-column' : ''}>
                    {formatNumber(user.openRate)}%
                  </td>
                  {sortedBy === 'clickRate' && (
                    <td className="sorted-column">{formatNumber(user.clickRate)}%</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export const ContentPerformanceDisplay = ({ data }) => {
  const content = data.content || [];
  const contentTypes = data.contentTypes && data.contentTypes.length > 0 
    ? data.contentTypes.join(', ') 
    : null;
  
  return (
    <div className="content-performance-display">
      <h3>
        Best Performing Content
        {data.segment ? ` for ${data.segment}` : ''}
        {contentTypes ? ` (${contentTypes})` : ''}
      </h3>
      
      {content.length === 0 ? (
        <NoDataPlaceholder 
          message="No content performance data available for this query." 
          suggestion="Try a different segment or a more general query."
        />
      ) : (
        <>
          <div className="result-summary">
            Showing top {content.length} content items by engagement score
            {data.totalMatching > content.length && ` (out of ${data.totalMatching} matching items)`}
          </div>
          
          <table className="users-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Engagement Score</th>
                <th>Open Rate</th>
                <th>Click Rate</th>
                {content[0].totalSent !== undefined && <th>Total Sent</th>}
              </tr>
            </thead>
            <tbody>
              {content.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td>{item.topic}</td>
                  <td>{formatNumber(item.engagementScore)}</td>
                  <td>{formatNumber(item.openRate)}%</td>
                  <td>{formatNumber(item.clickRate)}%</td>
                  {item.totalSent !== undefined && (
                    <td>{typeof item.totalSent === 'number' ? item.totalSent.toLocaleString() : 'N/A'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {content.length > 0 && (
            <div className="content-insights">
              <h4>Key Insights</h4>
              <ul>
                <li>
                  <strong>Top performer:</strong> {content[0].topic} with an engagement score of {formatNumber(content[0].engagementScore)}
                </li>
                <li>
                  <strong>Average open rate:</strong> {formatNumber(content.reduce((sum, item) => sum + item.openRate, 0) / content.length)}%
                </li>
                {content[0].clickRate !== undefined && (
                  <li>
                    <strong>Average click rate:</strong> {formatNumber(content.reduce((sum, item) => sum + item.clickRate, 0) / content.length)}%
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const TimingInsightsDisplay = ({ data }) => {
  const peakHours = data.peakHours || [];
  const hasSpecialtyMetrics = data.specialtyMetrics && Object.keys(data.specialtyMetrics).length > 0;
  const dayDistribution = data.dayDistribution || [];
  
  return (
    <div className="timing-insights-display">
      <h3>
        Timing Insights
        {data.segment ? ` for ${data.segment}` : ''}
      </h3>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-title">Average Time to Open</div>
          <div className="metric-card-value">
            {data.avgTimeToOpen ? `${formatNumber(data.avgTimeToOpen)} hours` : 'N/A'}
          </div>
        </div>
      </div>
      
      {peakHours.length === 0 ? (
        <NoDataPlaceholder 
          message="No peak hour data available." 
          suggestion="Try a different segment or check data sources."
        />
      ) : (
        <>
          <h4 style={{ marginTop: '20px', color: '#0ff' }}>Peak Engagement Hours</h4>
          <div className="result-summary">
            When your audience is most active
          </div>
          
          <div className="chart-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              {peakHours.map((hour, index) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{hour.hour}</div>
                  <div style={{ 
                    height: `${Math.min(100, hour.count / (Math.max(...peakHours.map(h => h.count)) / 100))}px`, 
                    width: '30px', 
                    background: 'linear-gradient(to top, #0077ff, #00ccff)',
                    margin: '0 auto',
                    borderRadius: '3px 3px 0 0'
                  }}></div>
                  <div style={{ marginTop: '5px' }}>{hour.count.toLocaleString()} opens</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {hasSpecialtyMetrics && (
        <div>
          <h4 style={{ marginTop: '20px', color: '#0ff' }}>Specialty-Specific Timing</h4>
          <div className="result-summary">
            {data.segment} responds in {formatNumber(data.specialtyMetrics.average_hours)} hours on average
          </div>
        </div>
      )}
      
      {dayDistribution.length > 0 && (
        <div>
          <h4 style={{ marginTop: '20px', color: '#0ff' }}>Day of Week Distribution</h4>
          <div className="day-distribution-chart">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              {dayDistribution.map((day, index) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{day.day}</div>
                  <div style={{ 
                    height: `${Math.min(100, day.count / (Math.max(...dayDistribution.map(d => d.count)) / 100))}px`,
                    width: '40px', 
                    background: 'linear-gradient(to top, #00cc99, #00ffcc)',
                    margin: '0 auto',
                    borderRadius: '3px 3px 0 0'
                  }}></div>
                  <div style={{ marginTop: '5px' }}>{day.count.toLocaleString()} engagements</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="timing-recommendations" style={{ marginTop: '30px' }}>
        <h4>Recommendations</h4>
        <ul>
          {peakHours.length > 0 && (
            <li>Optimal send time: <strong>{peakHours[0].hour}</strong> for maximum opens</li>
          )}
          {dayDistribution.length > 0 && (
            <li>Optimal send day: <strong>{dayDistribution[0].day}</strong> for maximum engagement</li>
          )}
          {data.avgTimeToOpen && (
            <li>Average response window: <strong>{formatNumber(data.avgTimeToOpen)} hours</strong> (plan follow-ups accordingly)</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export const AudienceOverviewDisplay = ({ data }) => {
  const topSpecialties = data.topSpecialties || [];
  const bestTopics = data.contentPreferences?.bestTopics || [];
  const bestHours = data.contentPreferences?.timing?.bestHours || [];
  const hasMetrics = data.overallMetrics && Object.keys(data.overallMetrics).length > 0;
  
  return (
    <div className="audience-overview-display">
      <h3>Audience Overview {data.segment ? `for ${data.segment}` : ''}</h3>
      
      {!hasMetrics ? (
        <NoDataPlaceholder message="Overall metrics data is not available." />
      ) : (
        <div className="metrics-grid">
          {data.overallMetrics.totalUsers !== undefined && (
            <div className="metric-card">
              <div className="metric-card-title">Total Users</div>
              <div className="metric-card-value">
                {typeof data.overallMetrics.totalUsers === 'number' 
                  ? data.overallMetrics.totalUsers.toLocaleString() 
                  : 'N/A'}
              </div>
            </div>
          )}
          
          {data.overallMetrics.avgOpenRate !== undefined && (
            <div className="metric-card">
              <div className="metric-card-title">Average Open Rate</div>
              <div className="metric-card-value">
                {formatNumber(data.overallMetrics.avgOpenRate)}%
              </div>
            </div>
          )}
          
          {data.overallMetrics.avgClickRate !== undefined && (
            <div className="metric-card">
              <div className="metric-card-title">Average Click Rate</div>
              <div className="metric-card-value">
                {formatNumber(data.overallMetrics.avgClickRate)}%
              </div>
            </div>
          )}
        </div>
      )}
      
      <h4 style={{ marginTop: '30px', color: '#0ff' }}>Top Specialties</h4>
      
      {!topSpecialties || topSpecialties.length === 0 ? (
        <NoDataPlaceholder message="No specialty data available." />
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Specialty</th>
              <th>Users</th>
              <th>Average Open Rate</th>
            </tr>
          </thead>
          <tbody>
            {topSpecialties.map((specialty, index) => (
              <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td>{specialty.specialty}</td>
                <td>{typeof specialty.userCount === 'number' ? specialty.userCount.toLocaleString() : 'N/A'}</td>
                <td>{specialty.avgOpenRate !== undefined ? `${formatNumber(specialty.avgOpenRate)}%` : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <h4 style={{ marginTop: '30px', color: '#0ff' }}>Top Performing Content</h4>
      
      {!bestTopics || bestTopics.length === 0 ? (
        <NoDataPlaceholder message="No content performance data available." />
      ) : (
        <div className="content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '15px', marginTop: '15px' }}>
          {bestTopics.map((topic, index) => (
            <div key={index} className="metric-card">
              <div className="metric-card-title">{topic.topic}</div>
              <div style={{ fontSize: '16px', marginTop: '5px' }}>
                {topic.engagementScore !== undefined && `Engagement: ${formatNumber(topic.engagementScore)}`}
                {topic.engagementScore !== undefined && topic.openRate !== undefined && ' | '}
                {topic.openRate !== undefined && `Open Rate: ${formatNumber(topic.openRate)}%`}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <h4 style={{ marginTop: '30px', color: '#0ff' }}>Best Send Times</h4>
      
      {!bestHours || bestHours.length === 0 ? (
        <NoDataPlaceholder message="No timing data available." />
      ) : (
        <div className="content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginTop: '15px' }}>
          {bestHours.map((hour, index) => (
            <div key={index} className="metric-card">
              <div className="metric-card-title">
                {hour.hour < 12 
                  ? `${hour.hour} AM` 
                  : hour.hour === 12 
                    ? '12 PM' 
                    : `${hour.hour - 12} PM`
                }
              </div>
              <div style={{ fontSize: '16px', marginTop: '5px' }}>
                {typeof hour.count === 'number' ? hour.count.toLocaleString() : 'N/A'} opens
              </div>
            </div>
          ))}
        </div>
      )}
      
      {data.segmentSummary && (
        <>
          <h4 style={{ marginTop: '30px', color: '#0ff' }}>Audience Segments</h4>
          <div className="segment-distribution" style={{ display: 'flex', marginTop: '15px' }}>
            <div className="segment-bar" style={{ 
              flex: data.segmentSummary.highEngagement || 1, 
              backgroundColor: '#00cc99', 
              padding: '8px 4px', 
              color: 'white', 
              textAlign: 'center' 
            }}>
              High ({data.segmentSummary.highEngagement || 0})
            </div>
            <div className="segment-bar" style={{ 
              flex: data.segmentSummary.moderateEngagement || 1, 
              backgroundColor: '#0088cc', 
              padding: '8px 4px', 
              color: 'white', 
              textAlign: 'center' 
            }}>
              Moderate ({data.segmentSummary.moderateEngagement || 0})
            </div>
            <div className="segment-bar" style={{ 
              flex: data.segmentSummary.lowEngagement || 1, 
              backgroundColor: '#666666', 
              padding: '8px 4px', 
              color: 'white', 
              textAlign: 'center' 
            }}>
              Low ({data.segmentSummary.lowEngagement || 0})
            </div>
          </div>
        </>
      )}
      
      {data._dataSources && data._dataSources.length > 0 && (
        <div className="data-sources" style={{ marginTop: '30px', fontSize: '14px', color: '#999' }}>
          <p>Data sources: {data._dataSources.join(', ')}</p>
        </div>
      )}
    </div>
  );
};

export const UserProfileDisplay = ({ data }) => {
  const hasPersonalInfo = data.personalInfo && Object.keys(data.personalInfo).length > 0;
  const hasEngagementMetrics = data.engagementMetrics && Object.keys(data.engagementMetrics).length > 0;
  const hasContentPreferences = data.contentPreferences && 
                               data.contentPreferences.top_topics && 
                               data.contentPreferences.top_topics.length > 0;
  const hasJourneyPatterns = data.journeyPatterns && Object.keys(data.journeyPatterns).length > 0;
  
  return (
    <div className="user-profile-display">
      <h3>User Profile: {data.email}</h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h4 style={{ color: '#0ff', marginBottom: '15px' }}>Personal Information</h4>
          
          {!hasPersonalInfo ? (
            <NoDataPlaceholder message="No personal information available for this user." />
          ) : (
            <table className="users-table">
              <tbody>
                <tr>
                  <td><strong>Name</strong></td>
                  <td>{`${data.personalInfo.first_name || ''} ${data.personalInfo.last_name || ''}`.trim() || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Specialty</strong></td>
                  <td>{data.personalInfo.specialty || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Profession</strong></td>
                  <td>{data.personalInfo.profession || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Organization</strong></td>
                  <td>{data.personalInfo.organization || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Location</strong></td>
                  <td>{data.personalInfo.state || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        
        <div style={{ flex: '1 1 300px' }}>
          <h4 style={{ color: '#0ff', marginBottom: '15px' }}>Engagement Metrics</h4>
          
          {!hasEngagementMetrics ? (
            <NoDataPlaceholder message="No engagement metrics available for this user." />
          ) : (
            <table className="users-table">
              <tbody>
                <tr>
                  <td><strong>Open Rate</strong></td>
                  <td>{typeof data.engagementMetrics.open_rate === 'number' ? `${formatNumber(data.engagementMetrics.open_rate)}%` : 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Click Rate</strong></td>
                  <td>{typeof data.engagementMetrics.click_rate === 'number' ? `${formatNumber(data.engagementMetrics.click_rate)}%` : 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Average Response Time</strong></td>
                  <td>{typeof data.engagementMetrics.avg_response_time === 'number' ? `${formatNumber(data.engagementMetrics.avg_response_time)} hours` : 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Engagement Score</strong></td>
                  <td>{typeof data.engagementMetrics.engagement_score === 'number' ? formatNumber(data.engagementMetrics.engagement_score) : 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <h4 style={{ color: '#0ff', marginBottom: '15px' }}>Content Preferences</h4>
      
      {!hasContentPreferences ? (
        <NoDataPlaceholder message="No content preference data available for this user." />
      ) : (
        <div className="content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {data.contentPreferences.top_topics.map((topic, index) => (
            <div key={index} className="metric-card">
              <div className="metric-card-title">{topic.topic}</div>
              <div style={{ marginTop: '8px' }}>
                Engagement: {formatNumber(topic.engagement_score)}
              </div>
              <div>
                Open Rate: {formatNumber((topic.open_rate || 0) * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}
      
      <h4 style={{ color: '#0ff', marginTop: '25px', marginBottom: '15px' }}>Journey Patterns</h4>
      
      {!hasJourneyPatterns ? (
        <NoDataPlaceholder message="No journey data available for this user." />
      ) : (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card-title">Total Journeys</div>
            <div className="metric-card-value">{data.journeyPatterns.total_journeys || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-title">Avg Time to Site</div>
            <div className="metric-card-value">
              {typeof data.journeyPatterns.avg_time_to_visit === 'number' ? `${formatNumber(data.journeyPatterns.avg_time_to_visit)} min` : 'N/A'}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-card-title">Favorite Device</div>
            <div className="metric-card-value">{data.journeyPatterns.favorite_device || 'N/A'}</div>
          </div>
        </div>
      )}
      
      {hasEngagementMetrics && (
        <div className="user-engagement-summary" style={{ marginTop: '30px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '5px' }}>
          <h4>Engagement Summary</h4>
          <p>
            This user is a <strong>{data.personalInfo.profession || 'healthcare professional'}</strong> specializing in <strong>{data.personalInfo.specialty || 'healthcare'}</strong>.
            They have an engagement score of <strong>{formatNumber(data.engagementMetrics.engagement_score)}</strong>,
            with an open rate of <strong>{formatNumber(data.engagementMetrics.open_rate)}%</strong>
            {typeof data.engagementMetrics.click_rate === 'number' && ` and a click rate of <strong>${formatNumber(data.engagementMetrics.click_rate)}%</strong>`}.
            {hasContentPreferences && data.contentPreferences.top_topics.length > 0 && 
               ` Their top content interests include ${data.contentPreferences.top_topics.slice(0, 3).map(t => t.topic).join(', ')}.`}
          </p>
        </div>
      )}
    </div>
  );
};

const DisplayComponents = {
  TopUsersDisplay,
  ContentPerformanceDisplay,
  TimingInsightsDisplay,
  AudienceOverviewDisplay,
  UserProfileDisplay,
  SpecialtyEngagementDisplay,
  SpecialtyComparisonDisplay,
  UserCountDisplay,
  ErrorDisplay
};

export default DisplayComponents;