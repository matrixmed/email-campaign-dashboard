class QueryParser {
  constructor() {
    this.specialtyPatterns = this.buildSpecialtyPatterns();
    this.professionPatterns = this.buildProfessionPatterns();
    this.campaignPatterns = this.buildCampaignPatterns();
    this.metricPatterns = this.buildMetricPatterns();
    this.topicPatterns = this.buildTopicPatterns();
  }

  /**
   * Parse a query to determine type and extract entities
   * @param {string} queryText - The raw query text
   * @returns {object} QueryInfo with type and entities
   */
  parseQuery(queryText) {
    // Normalize the query text
    const normalizedText = queryText.trim().toLowerCase();
    
    // Initialize query info
    const queryInfo = {
      queryType: null,
      entities: {
        specialties: [],
        professions: [],
        campaigns: [],
        topics: [],
        metrics: [],
        timeframe: null,
        email: null,
        limit: null
      },
      originalQuery: queryText
    };
    
    // Determine query type
    queryInfo.queryType = this.determineQueryType(normalizedText);
    
    // Extract entities
    this.extractEntities(normalizedText, queryInfo);
    
    // Set default metrics if none specified
    if (queryInfo.entities.metrics.length === 0) {
      queryInfo.entities.metrics = this.getDefaultMetrics(queryInfo.queryType);
    }
    
    return queryInfo;
  }
  
  /**
   * Determine the type of query based on text patterns
   * @param {string} text - Normalized query text
   * @returns {string} Identified query type
   */
  determineQueryType(text) {
    // User engagement queries
    if (
      (text.includes('top') || text.includes('most engaged') || 
       text.includes('highest open') || text.includes('highest click')) &&
      (text.includes('user') || text.includes('users') || 
       text.includes('who') || text.includes('which'))
    ) {
      return 'top_users';
    }
    
    // Content performance queries
    if (
      (text.includes('content') || text.includes('topic') || 
       text.includes('perform') || text.includes('best')) &&
      !text.includes('user') && !text.includes('when')
    ) {
      return 'content_performance';
    }
    
    // Timing insights queries
    if (
      text.includes('when') || 
      text.includes('time') || 
      text.includes('hour') || 
      text.includes('day') ||
      text.includes('morning') || 
      text.includes('afternoon')
    ) {
      return 'timing_insights';
    }
    
    // Audience overview queries
    if (
      (text.includes('overview') || 
       text.includes('summary') || 
       text.includes('breakdown') ||
       text.includes('demographics')) &&
      (text.includes('audience') || text.includes('user'))
    ) {
      return 'audience_overview';
    }
    
    // User profile queries
    if (
      (text.includes('profile') || text.includes('details')) &&
      (text.includes('@') || text.includes('email') || 
       text.includes('user') || text.includes('npi'))
    ) {
      return 'user_profile';
    }
    
    // Specialty engagement queries
    if (
      (text.includes('specialty') || 
       text.includes('specialist') || 
       this.containsSpecialtyName(text)) &&
      !text.includes('compare')
    ) {
      return 'specialty_engagement';
    }
    
    // Specialty comparison queries
    if (
      (text.includes('compare') || text.includes('vs') || 
       text.includes('versus') || text.includes('difference')) &&
      (text.includes('specialty') || this.containsSpecialtyName(text))
    ) {
      return 'specialty_comparison';
    }
    
    // Count queries
    if (
      (text.includes('how many') || text.includes('count') || 
       text.includes('number of')) &&
      (text.includes('user') || text.includes('audience'))
    ) {
      return 'user_count';
    }
    
    // Default to audience overview if we can't determine
    return 'audience_overview';
  }
  
  /**
   * Extract all entities from the query text
   * @param {string} text - Normalized query text
   * @param {object} queryInfo - Query information to update
   */
  extractEntities(text, queryInfo) {
    // Extract specialties
    this.extractSpecialties(text, queryInfo);
    
    // Extract professions
    this.extractProfessions(text, queryInfo);
    
    // Extract campaigns
    this.extractCampaigns(text, queryInfo);
    
    // Extract metrics
    this.extractMetrics(text, queryInfo);
    
    // Extract timeframe
    this.extractTimeframe(text, queryInfo);
    
    // Extract email
    this.extractEmail(text, queryInfo);
    
    // Extract topics
    this.extractTopics(text, queryInfo);
    
    // Extract limit (for top N queries)
    this.extractLimit(text, queryInfo);
  }
  
  /**
   * Check if query contains any specialty names
   * @param {string} text - Query text
   * @returns {boolean} True if a specialty is found
   */
  containsSpecialtyName(text) {
    return this.specialtyPatterns.some(pattern => pattern.regex.test(text));
  }
  
  /**
   * Extract specialties from query text
   * @param {string} text - Query text
   * @param {object} queryInfo - Query info to update
   */
  extractSpecialties(text, queryInfo) {
    this.specialtyPatterns.forEach(pattern => {
      if (pattern.regex.test(text)) {
        if (!queryInfo.entities.specialties.includes(pattern.value)) {
          queryInfo.entities.specialties.push(pattern.value);
        }
      }
    });
  }
  
  /**
   * Extract professions from query text
   * @param {string} text - Query text
   * @param {object} queryInfo - Query info to update
   */
  extractProfessions(text, queryInfo) {
    this.professionPatterns.forEach(pattern => {
      if (pattern.regex.test(text)) {
        if (Array.isArray(pattern.value)) {
          pattern.value.forEach(value => {
            if (!queryInfo.entities.professions.includes(value)) {
              queryInfo.entities.professions.push(value);
            }
          });
        } else if (!queryInfo.entities.professions.includes(pattern.value)) {
          queryInfo.entities.professions.push(pattern.value);
        }
      }
    });
  }
  
  /**
   * Extract campaign information from query text
   * @param {string} text - Query text
   * @param {object} queryInfo - Query info to update
   */
  extractCampaigns(text, queryInfo) {
    // Extract campaign types
    this.campaignPatterns.forEach(pattern => {
      if (pattern.regex.test(text)) {
        if (!queryInfo.entities.campaigns.includes(pattern.value)) {
          queryInfo.entities.campaigns.push(pattern.value);
        }
      }
    });
    
    // Extract months
    const monthPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)/i;
    const monthMatch = text.match(monthPattern);
    
    // Extract years
    const yearPattern = /(20\d{2})/;
    const yearMatch = text.match(yearPattern);
    
    // Extract deployment numbers
    const deploymentPattern = /deployment\s*#?\s*([1-3])/i;
    const deploymentMatch = text.match(deploymentPattern);
    
    // Build specific campaign identifiers if we have month/year info
    if (monthMatch && yearMatch) {
      const month = monthMatch[1];
      const year = yearMatch[1];
      
      queryInfo.entities.specificCampaigns = queryInfo.entities.specificCampaigns || [];
      
      // If we have campaign types, create specific versions with month/year
      if (queryInfo.entities.campaigns.length > 0) {
        queryInfo.entities.campaigns.forEach(campaign => {
          const specificCampaign = `${campaign} ${month} ${year}`;
          if (!queryInfo.entities.specificCampaigns.includes(specificCampaign)) {
            queryInfo.entities.specificCampaigns.push(specificCampaign);
          }
        });
      } else {
        // If no campaign type, just add the month/year as a timeframe
        const timeframeCampaign = `${month} ${year}`;
        queryInfo.entities.specificCampaigns.push(timeframeCampaign);
      }
    }
    
    // Add deployment information if found
    if (deploymentMatch) {
      queryInfo.entities.deployment = parseInt(deploymentMatch[1]);
    }
  }
  
  /**
   * Extract metric types from query text
   * @param {string} text - Query text
   * @param {object} queryInfo - Query info to update
   */
  extractMetrics(text, queryInfo) {
    this.metricPatterns.forEach(pattern => {
      if (pattern.regex.test(text)) {
        if (!queryInfo.entities.metrics.includes(pattern.value)) {
          queryInfo.entities.metrics.push(pattern.value);
        }
      }
    });
  }
  
  /**
   * Extract timeframe information from query text
   * @param {string} text - Query text
   * @param {object} queryInfo - Query info to update
   */
  extractTimeframe(text, queryInfo) {
    // Match specific months
    const monthMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
    
    // Match year patterns
    const yearMatch = text.match(/\b(20\d{2})\b/);
    
    // Match quarter patterns
    const quarterMatch = text.match(/\bq([1-4])\b/i);
    
    // Match ranges like "January-February"
    const rangeMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:to|-)\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
    
    // Build timeframe object
    let timeframe = {};
    
    if (monthMatch) {
      timeframe.month = monthMatch[1].toLowerCase();
    }
    
    if (yearMatch) {
      timeframe.year = parseInt(yearMatch[1]);
    } else {
      // Default to current year if not specified
      timeframe.year = new Date().getFullYear();
    }
    
    if (quarterMatch) {
      timeframe.quarter = parseInt(quarterMatch[1]);
    }
    
    if (rangeMatch) {
      timeframe.startMonth = rangeMatch[1].toLowerCase();
      timeframe.endMonth = rangeMatch[2].toLowerCase();
    }
    
    // Only set if we have some timeframe information
    if (Object.keys(timeframe).length > 0) {
      queryInfo.entities.timeframe = timeframe;
    }
  }
  
  /**
   * Extract email addresses from query text
   * @param {string} text - Query text
   * @param {object} queryInfo - Query info to update
   */
  extractEmail(text, queryInfo) {
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) {
      queryInfo.entities.email = emailMatch[0].toLowerCase();
    }
  }
  
  /**
   * Extract topics from query text
   * @param {string} text - Query text
   * @param {object} queryInfo - Query info to update
   */
  extractTopics(text, queryInfo) {
    this.topicPatterns.forEach(pattern => {
      if (pattern.regex.test(text)) {
        if (!queryInfo.entities.topics.includes(pattern.value)) {
          queryInfo.entities.topics.push(pattern.value);
        }
      }
    });
  }
  
  /**
   * Extract numeric limit from query text (e.g., "top 10")
   * @param {string} text - Query text
   * @param {object} queryInfo - Query info to update
   */
  extractLimit(text, queryInfo) {
    // Look for patterns like "top 10", "top 20", etc.
    const limitMatch = text.match(/\btop\s+(\d+)\b/i);
    if (limitMatch) {
      queryInfo.entities.limit = parseInt(limitMatch[1]);
    }
  }
  
  /**
   * Get default metrics for a given query type
   * @param {string} queryType - The query type 
   * @returns {string[]} Default metrics for this query type
   */
  getDefaultMetrics(queryType) {
    switch (queryType) {
      case 'top_users':
        return ['engagement_score', 'open_rate', 'click_rate'];
      case 'content_performance':
        return ['engagement_score', 'open_rate', 'click_rate'];
      case 'timing_insights':
        return ['open_time', 'response_time'];
      case 'audience_overview':
        return ['engagement_score', 'open_rate', 'click_rate'];
      case 'user_profile':
        return ['engagement_score', 'open_rate', 'click_rate', 'response_time'];
      case 'specialty_engagement':
        return ['engagement_score', 'open_rate', 'click_rate', 'response_time'];
      case 'specialty_comparison':
        return ['engagement_score', 'open_rate', 'click_rate', 'response_time'];
      case 'user_count':
        return ['user_count'];
      default:
        return ['engagement_score', 'open_rate', 'click_rate'];
    }
  }
  
  /**
   * Build patterns for recognizing specialties in text
   * @returns {object[]} Array of pattern objects
   */
  buildSpecialtyPatterns() {
    return [
      { regex: /dermatolog(y|ist)/i, value: 'Dermatology' },
      { regex: /oncolog(y|ist)/i, value: 'Oncology' },
      { regex: /cardiolog(y|ist)/i, value: 'Cardiology' },
      { regex: /neurolog(y|ist)/i, value: 'Neurology' },
      { regex: /psychiatr(y|ist)/i, value: 'Psychiatry' },
      { regex: /ophthalmolog(y|ist)/i, value: 'Ophthalmology' },
      { regex: /pediatric(s|ian)/i, value: 'Pediatrics' },
      { regex: /family\s+(practice|medicine|physician)/i, value: 'Family Medicine' },
      { regex: /internal\s+medicine/i, value: 'Internal Medicine' },
      { regex: /emergency\s+medicine/i, value: 'Emergency Medicine' },
      { regex: /radiolog(y|ist)/i, value: 'Radiology' },
      { regex: /gastroenterolog(y|ist)/i, value: 'Gastroenterology' },
      { regex: /pulmonolog(y|ist)/i, value: 'Pulmonology' },
      { regex: /endocrinolog(y|ist)/i, value: 'Endocrinology' },
      { regex: /hematolog(y|ist)/i, value: 'Hematology' },
      { regex: /obstetrics|gynecolog(y|ist)|obgyn/i, value: 'Obstetrics & Gynecology' },
      { regex: /orthopedic(s|ist)/i, value: 'Orthopedics' },
      { regex: /plastic\s+surger(y|on)/i, value: 'Plastic Surgery' },
      { regex: /general\s+surger(y|on)/i, value: 'General Surgery' },
      { regex: /urolog(y|ist)/i, value: 'Urology' },
      { regex: /allerg(y|ist)/i, value: 'Allergy & Immunology' },
      { regex: /immunolog(y|ist)/i, value: 'Allergy & Immunology' },
      { regex: /rheumatolog(y|ist)/i, value: 'Rheumatology' },
      { regex: /nephrolog(y|ist)/i, value: 'Nephrology' },
      { regex: /infectious disease/i, value: 'Infectious Disease' }
    ];
  }
  
  /**
   * Build patterns for recognizing professions in text
   * @returns {object[]} Array of pattern objects
   */
  buildProfessionPatterns() {
    return [
      { regex: /\b(np|nurse practitioner)\b/i, value: 'Nurse Practitioner' },
      { regex: /\b(pa|physician assistant)\b/i, value: 'Physician Assistant' },
      { regex: /\b(np.*and.*pa|pa.*and.*np|np.*&.*pa|pa.*&.*np|nppa)\b/i, value: ['Nurse Practitioner', 'Physician Assistant'] },
      { regex: /\b(md|physician|doctor)\b/i, value: 'Physician' },
      { regex: /\b(do|doctor of osteopathy|osteopathic)\b/i, value: 'Physician' },
      { regex: /\b(rn|registered nurse)\b/i, value: 'Registered Nurse' },
      { regex: /\b(pharmd|pharmacist)\b/i, value: 'Pharmacist' },
      { regex: /\bphd\b/i, value: 'PhD' },
      { regex: /\bfellow\b/i, value: 'Fellow' },
      { regex: /\bresident\b/i, value: 'Resident' },
      { regex: /\b(dietitian|nutritionist)\b/i, value: 'Dietitian/Nutritionist' },
      { regex: /\b(student)\b/i, value: 'Student' }
    ];
  }
  
  /**
   * Build patterns for recognizing campaign types in text
   * @returns {object[]} Array of pattern objects
   */
  buildCampaignPatterns() {
    return [
      { regex: /breast cancer/i, value: 'breast cancer' },
      { regex: /jcad(tv)?/i, value: 'jcad' },
      { regex: /nhr/i, value: 'nhr' },
      { regex: /clinical updates/i, value: 'clinical updates' },
      { regex: /webinar/i, value: 'webinar' },
      { regex: /newsletter/i, value: 'newsletter' },
      { regex: /supplement/i, value: 'supplement' },
      { regex: /journal review/i, value: 'journal review' },
      { regex: /e-alert/i, value: 'e-alert' },
      { regex: /spotlight/i, value: 'spotlight' },
      { regex: /digital highlights/i, value: 'digital highlights' },
      { regex: /expert perspectives/i, value: 'expert perspectives' },
      { regex: /podcast/i, value: 'podcast' },
      { regex: /vitiligo roundtable/i, value: 'vitiligo roundtable' },
      { regex: /oncology/i, value: 'oncology' },
      { regex: /ophthalmology/i, value: 'ophthalmology' },
      { regex: /neuroscience/i, value: 'neuroscience' },
      { regex: /nsclc/i, value: 'nsclc' },
      { regex: /melanoma/i, value: 'melanoma' },
      { regex: /icns/i, value: 'icns' },
      { regex: /hot topics/i, value: 'hot topics' },
      { regex: /custom email/i, value: 'custom email' }
    ];
  }
  
  /**
   * Build patterns for recognizing metrics in text
   * @returns {object[]} Array of pattern objects
   */
  buildMetricPatterns() {
    return [
      { regex: /open rate/i, value: 'open_rate' },
      { regex: /click(?:.|-)through rate/i, value: 'click_rate' },
      { regex: /click rate/i, value: 'click_rate' },
      { regex: /engagement/i, value: 'engagement_score' },
      { regex: /bounce rate/i, value: 'bounce_rate' },
      { regex: /delivery rate/i, value: 'delivery_rate' },
      { regex: /response time/i, value: 'response_time' }
    ];
  }
  
  /**
   * Build patterns for recognizing topics in text
   * @returns {object[]} Array of pattern objects
   */
  buildTopicPatterns() {
    return [
      { regex: /\bacne\b/i, value: 'acne' },
      { regex: /\bpsoriasis\b/i, value: 'psoriasis' },
      { regex: /\beczema\b/i, value: 'atopic dermatitis' },
      { regex: /\batopic dermatitis\b/i, value: 'atopic dermatitis' },
      { regex: /\bbreast cancer\b/i, value: 'breast cancer' },
      { regex: /\bheart failure\b/i, value: 'heart failure' },
      { regex: /\bcardiovascular disease\b/i, value: 'cardiovascular disease' },
      { regex: /\bdiabetes\b/i, value: 'diabetes' },
      { regex: /\basthma\b/i, value: 'asthma' },
      { regex: /\bcovid-19\b/i, value: 'covid-19' },
      { regex: /\bcoronavirus\b/i, value: 'covid-19' },
      { regex: /\bmelanoma\b/i, value: 'melanoma' },
      { regex: /\blung cancer\b/i, value: 'lung cancer' },
      { regex: /\bmultiple sclerosis\b/i, value: 'multiple sclerosis' },
      { regex: /\banemia\b/i, value: 'anemia' },
      { regex: /\bvitiligo\b/i, value: 'vitiligo' },
      { regex: /\brosacea\b/i, value: 'rosacea' },
      { regex: /\bmolluscum contagiosum\b/i, value: 'molluscum contagiosum' },
      { regex: /\bpsoriatic arthritis\b/i, value: 'psoriatic arthritis' }
    ];
  }
}

export default QueryParser;