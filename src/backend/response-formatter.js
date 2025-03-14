class ResponseFormatter {
  /**
   * Format a data response based on query type
   * @param {object} data - The raw data from data service
   * @param {object} queryInfo - Information about the query
   * @returns {object} Formatted data for display components
   */
  format(data, queryInfo) {
    if (!data) {
      return this.formatError("No data available", queryInfo);
    }
    
    // Call the appropriate formatter based on query type
    switch (queryInfo.queryType) {
      case 'top_users':
        return this.formatTopUsers(data, queryInfo);
      case 'content_performance':
        return this.formatContentPerformance(data, queryInfo);
      case 'timing_insights':
        return this.formatTimingInsights(data, queryInfo);
      case 'audience_overview':
        return this.formatAudienceOverview(data, queryInfo);
      case 'user_profile':
        return this.formatUserProfile(data, queryInfo);
      case 'specialty_engagement':
        return this.formatSpecialtyEngagement(data, queryInfo);
      case 'specialty_comparison':
        return this.formatSpecialtyComparison(data, queryInfo);
      case 'user_count':
        return this.formatUserCount(data, queryInfo);
      default:
        // Default to audience overview if we don't have a specific formatter
        return this.formatAudienceOverview(data, queryInfo);
    }
  }
  
  /**
   * Format top users data
   * @param {object} data - Raw top users data
   * @param {object} queryInfo - Query information
   * @returns {object} Formatted data
   */
  formatTopUsers(data, queryInfo) {
    // Ensure we have users data
    if (!data.users || !Array.isArray(data.users)) {
      return this.formatError("No user data available", queryInfo);
    }
    
    // Return formatted data that matches TopUsersDisplay component
    return {
      users: data.users.map(user => ({
        email: user.email,
        name: user.name,
        specialty: user.specialty,
        engagementScore: user.engagementScore,
        openRate: user.openRate,
        clickRate: user.clickRate
      })),
      totalMatching: data.totalMatching || data.users.length,
      segment: data.segment || queryInfo.entities.specialties?.[0] || queryInfo.entities.professions?.[0] || null,
      segmentType: data.segmentType || null,
      sortedBy: data.sortedBy || 'engagementScore',
      responseType: 'top_users'
    };
  }
  
  /**
   * Format content performance data
   * @param {object} data - Raw content performance data
   * @param {object} queryInfo - Query information
   * @returns {object} Formatted data
   */
  formatContentPerformance(data, queryInfo) {
    // Ensure we have content data
    if (!data.content || !Array.isArray(data.content)) {
      return this.formatError("No content performance data available", queryInfo);
    }
    
    // Return formatted data that matches ContentPerformanceDisplay component
    return {
      content: data.content.map(item => ({
        topic: item.topic || '',
        engagementScore: item.engagementScore || 0,
        openRate: item.openRate || 0,
        clickRate: item.clickRate || 0,
        totalSent: item.totalSent
      })),
      totalMatching: data.totalMatching || data.content.length,
      segment: data.segment || queryInfo.entities.specialties?.[0] || queryInfo.entities.topics?.[0] || null,
      contentTypes: data.contentTypes || [],
      responseType: 'content_performance'
    };
  }
  
  /**
   * Format timing insights data
   * @param {object} data - Raw timing insights data
   * @param {object} queryInfo - Query information
   * @returns {object} Formatted data
   */
  formatTimingInsights(data, queryInfo) {
    // Ensure we have some timing data
    if (!data.peakHours && !data.dayDistribution && !data.avgTimeToOpen) {
      return this.formatError("No timing insights available", queryInfo);
    }
    
    // Return formatted data that matches TimingInsightsDisplay component
    return {
      avgTimeToOpen: data.avgTimeToOpen || 0,
      medianTimeToOpen: data.medianTimeToOpen || 0,
      peakHours: data.peakHours || [],
      dayDistribution: data.dayDistribution || [],
      segment: data.segment || queryInfo.entities.specialties?.[0] || queryInfo.entities.professions?.[0] || null,
      specialtyMetrics: data.specialtyMetrics || null,
      professionMetrics: data.professionMetrics || null,
      responseType: 'timing_insights'
    };
  }
  
  /**
   * Format audience overview data
   * @param {object} data - Raw audience overview data
   * @param {object} queryInfo - Query information
   * @returns {object} Formatted data
   */
  formatAudienceOverview(data, queryInfo) {
    // We can work with partial data, so no need for strict validation
    const formatted = {
        overallMetrics: data.overallMetrics || null,
        topSpecialties: data.topSpecialties || null,
        contentPreferences: data.contentPreferences || null,
        segmentSummary: data.segmentSummary || null,
        segment: data.segment || queryInfo.entities.specialties?.[0] || null,
        _dataSources: data._dataSources || [],
        responseType: 'audience_overview'
    };
    
    return formatted;
  }
  
  /**
   * Format user profile data
   * @param {object} data - Raw user profile data
   * @param {object} queryInfo - Query information
   * @returns {object} Formatted data
   */
  formatUserProfile(data, queryInfo) {
    // Ensure we have email and at least some profile data
    if (!data.email) {
      return this.formatError("No user profile found", queryInfo);
    }
    
    // Return formatted data that matches UserProfileDisplay component
    return {
      email: data.email,
      personalInfo: data.personalInfo || {},
      engagementMetrics: data.engagementMetrics || {},
      contentPreferences: data.contentPreferences || {},
      journeyPatterns: data.journeyPatterns || {},
      responseType: 'user_profile'
    };
  }
  
  /**
   * Format specialty engagement data
   * @param {object} data - Raw specialty engagement data
   * @param {object} queryInfo - Query information
   * @returns {object} Formatted data
   */
  formatSpecialtyEngagement(data, queryInfo) {
    // Ensure we have a specialty
    if (!data.specialty) {
      return this.formatError("No specialty engagement data available", queryInfo);
    }
    
    // Return formatted data that matches SpecialtyEngagementDisplay component
    return {
      specialty: data.specialty,
      userCount: data.userCount || 0,
      engagementMetrics: data.engagementMetrics || null,
      preferredTopics: data.preferredTopics || [],
      bestContent: data.bestContent || [],
      statisticalValidity: data.statisticalValidity || {
        confidence_level: 'low',
        sample_size_adequate: false
      },
      responseType: 'specialty_engagement'
    };
  }
  
  /**
   * Format specialty comparison data
   * @param {object} data - Raw specialty comparison data
   * @param {object} queryInfo - Query information
   * @returns {object} Formatted data
   */
  formatSpecialtyComparison(data, queryInfo) {
    // Ensure we have specialties to compare
    if (!data.specialties || !Array.isArray(data.specialties) || data.specialties.length === 0) {
      return this.formatError("No specialty comparison data available", queryInfo);
    }
    
    // Return formatted data that matches SpecialtyComparisonDisplay component
    return {
      specialties: data.specialties.map(specialty => ({
        specialty: specialty.specialty || 'Unknown',
        userCount: specialty.userCount || 0,
        engagementMetrics: specialty.engagementMetrics || {
          openRate: 0,
          clickRate: 0,
          responseTime: 0
        },
        topTopics: specialty.topTopics || [],
        devicePreference: specialty.devicePreference || 'unknown'
      })),
      responseType: 'specialty_comparison'
    };
  }
  
  /**
   * Format user count data
   * @param {object} data - Raw user count data
   * @param {object} queryInfo - Query information
   * @returns {object} Formatted data
   */
  formatUserCount(data, queryInfo) {
    // Ensure we have at least total users
    if (data.totalUsers === undefined) {
      return this.formatError("No user count data available", queryInfo);
    }
    
    // Return formatted data that matches UserCountDisplay component
    return {
      totalUsers: data.totalUsers,
      specialtyUsers: data.specialtyUsers,
      specialty: data.specialty,
      professionUsers: data.professionUsers,
      profession: data.profession,
      confidence: data.confidence || 'medium',
      responseType: 'user_count'
    };
  }
  
  /**
   * Format error responses
   * @param {string} message - Error message
   * @param {object} queryInfo - Query information
   * @param {string} technicalDetails - Optional technical details
   * @returns {object} Formatted error data
   */
  formatError(message, queryInfo, technicalDetails = "") {
    return {
      responseType: 'error',
      message: message || "Sorry, I couldn't find the information you asked for.",
      technicalDetails: technicalDetails,
      suggestions: this.generateFallbackSuggestions(queryInfo),
      originalQuery: queryInfo?.originalQuery || ""
    };
  }
  
  /**
   * Generate fallback suggestions based on query type
   * @param {object} queryInfo - Query information
   * @returns {string[]} Fallback suggestions
   */
  generateFallbackSuggestions(queryInfo) {
    // General suggestions that work for most queries
    const generalSuggestions = [
      "Show me top engaged users",
      "What content works best for dermatologists?",
      "When do physicians prefer to read our content?",
      "Give me an overview of our audience"
    ];
    
    // Get more specific suggestions based on query type
    if (queryInfo && queryInfo.queryType) {
      switch (queryInfo.queryType) {
        case 'top_users':
          return [
            "Show me the top 20 most engaged users",
            "Who are our most engaged dermatologists?",
            "Which oncologists have the highest open rates?",
            ...generalSuggestions
          ];
        case 'content_performance':
          return [
            "What content types perform best overall?",
            "Show me our best-performing content by open rate",
            "What content performed well for oncology specialists?",
            ...generalSuggestions
          ];
        case 'timing_insights':
          return [
            "When do most users open our emails?",
            "What's the best time to send emails to dermatologists?",
            "What day of week has highest open rates?",
            ...generalSuggestions
          ];
        case 'user_profile':
          return [
            "Show me profile for a specific user by entering their email",
            "What are the content preferences for our top users?",
            ...generalSuggestions
          ];
        case 'specialty_engagement':
          return [
            "How do dermatologists engage with our content?",
            "What topics are popular among psychiatrists?",
            "Show timing preferences by medical specialty",
            ...generalSuggestions
          ];
        default:
          return generalSuggestions;
      }
    }
    
    return generalSuggestions;
  }
}

export default ResponseFormatter;