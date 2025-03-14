class QueryEngine {
  constructor() {
    // Initialize state
    this.lastQuery = null;
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
    this.dataService = null;
    this.responseFormatter = null;
    
    // Storage account settings for Azure Blob
    this.storageConfig = {
      accountName: process.env.REACT_APP_AZURE_ACCOUNT_NAME,
      containerName: process.env.REACT_APP_AZURE_CONTAINER_NAME
    };
  }

  /**
   * Process a user query and return formatted results
   * @param {string} queryText - The raw query text from the user
   * @returns {Promise<object>} - Formatted results for display
   */
  async processQuery(queryText) {
    try {
      // Trim and normalize the query
      const normalizedQuery = queryText.trim().toLowerCase();
      
      // Check cache for this query
      const cachedResult = this.checkCache(normalizedQuery);
      if (cachedResult) {
        return {
          ...cachedResult,
          fromCache: true,
          originalQuery: queryText,
          timestamp: new Date().toISOString()
        };
      }

      // Step 1: Parse query to identify intent and extract entities
      const queryInfo = this.parseQuery(normalizedQuery);
      
      // Step 2: Based on query type, fetch appropriate data
      const data = await this.fetchDataForQuery(queryInfo);
      
      // Step 3: Format the response for display
      const response = this.formatResponse(data, queryInfo);
      
      // Store in cache
      this.storeInCache(normalizedQuery, response);
      
      // Add metadata to response
      return {
        ...response,
        originalQuery: queryText,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Return error response
      return {
        responseType: 'error',
        message: 'Sorry, I had trouble understanding that question.',
        technicalDetails: error.message,
        suggestions: this.generateFallbackSuggestions(),
        originalQuery: queryText,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Parse the query to determine type and extract entities
   * @param {string} queryText - Normalized query text
   * @returns {object} Query information with type and entities
   */
  parseQuery(queryText) {
    // Default query information
    const queryInfo = {
      queryType: null,
      entities: {
        specialties: [],
        professions: [],
        campaigns: [],
        metrics: [],
        timeframe: null,
        email: null,
        topics: []
      }
    };
    
    // Determine query type based on keywords and patterns
    queryInfo.queryType = this.determineQueryType(queryText);
    
    // Extract entities based on query type
    this.extractEntities(queryText, queryInfo);
    
    // Set default metrics if none specified
    if (queryInfo.entities.metrics.length === 0) {
      queryInfo.entities.metrics = this.getDefaultMetrics(queryInfo.queryType);
    }
    
    return queryInfo;
  }
  
  /**
   * Determine the type of query based on text analysis
   * @param {string} queryText - The normalized query
   * @returns {string} The identified query type
   */
  determineQueryType(queryText) {
    // User engagement queries
    if (
      (queryText.includes('top') || queryText.includes('most engaged') || 
       queryText.includes('highest open') || queryText.includes('highest click')) &&
      (queryText.includes('user') || queryText.includes('users') || 
       queryText.includes('who') || queryText.includes('which'))
    ) {
      return 'top_users';
    }
    
    // Content performance queries
    if (
      (queryText.includes('content') || queryText.includes('topic') || 
       queryText.includes('perform') || queryText.includes('best')) &&
      !queryText.includes('user') && !queryText.includes('when')
    ) {
      return 'content_performance';
    }
    
    // Timing insights queries
    if (
      queryText.includes('when') || 
      queryText.includes('time') || 
      queryText.includes('hour') || 
      queryText.includes('day') ||
      queryText.includes('morning') || 
      queryText.includes('afternoon')
    ) {
      return 'timing_insights';
    }
    
    // Audience overview queries
    if (
      (queryText.includes('overview') || 
       queryText.includes('summary') || 
       queryText.includes('breakdown') ||
       queryText.includes('demographics')) &&
      (queryText.includes('audience') || queryText.includes('user'))
    ) {
      return 'audience_overview';
    }
    
    // User profile queries
    if (
      (queryText.includes('profile') || queryText.includes('details')) &&
      (queryText.includes('@') || queryText.includes('email') || 
       queryText.includes('user') || queryText.includes('npi'))
    ) {
      return 'user_profile';
    }
    
    // Specialty engagement queries
    if (
      (queryText.includes('specialty') || 
       queryText.includes('specialist') || 
       this.containsSpecialtyName(queryText)) &&
      !queryText.includes('compare')
    ) {
      return 'specialty_engagement';
    }
    
    // Specialty comparison queries
    if (
      (queryText.includes('compare') || queryText.includes('vs') || 
       queryText.includes('versus') || queryText.includes('difference')) &&
      (queryText.includes('specialty') || this.containsSpecialtyName(queryText))
    ) {
      return 'specialty_comparison';
    }
    
    // Simple count queries
    if (
      (queryText.includes('how many') || queryText.includes('count') || 
       queryText.includes('number of')) &&
      (queryText.includes('user') || queryText.includes('audience'))
    ) {
      return 'user_count';
    }
    
    // Default to audience overview if we can't determine
    return 'audience_overview';
  }
  
  /**
   * Check if query contains any known specialty names
   * @param {string} queryText - The query text
   * @returns {boolean} True if a specialty is found
   */
  containsSpecialtyName(queryText) {
    const specialties = [
      'dermatology', 'oncology', 'cardiology', 'neurology', 
      'psychiatry', 'ophthalmology', 'pediatrics', 'family medicine',
      'internal medicine', 'emergency medicine', 'radiology',
      'anesthesiology', 'gastroenterology', 'endocrinology'
    ];
    
    return specialties.some(specialty => queryText.includes(specialty));
  }
  
  /**
   * Extract entities from the query text based on query type
   * @param {string} queryText - The normalized query
   * @param {object} queryInfo - The query information to update
   */
  extractEntities(queryText, queryInfo) {
    // Extract specialties
    this.extractSpecialties(queryText, queryInfo);
    
    // Extract professions
    this.extractProfessions(queryText, queryInfo);
    
    // Extract campaigns
    this.extractCampaigns(queryText, queryInfo);
    
    // Extract metrics
    this.extractMetrics(queryText, queryInfo);
    
    // Extract timeframe
    this.extractTimeframe(queryText, queryInfo);
    
    // Extract email
    this.extractEmail(queryText, queryInfo);
    
    // Extract topics
    this.extractTopics(queryText, queryInfo);
  }
  
  /**
   * Extract specialty entities from query
   * @param {string} queryText - The normalized query
   * @param {object} queryInfo - The query information to update
   */
  extractSpecialties(queryText, queryInfo) {
    // Based on the Specialty field in the full_list.csv and campaign files
    const specialtyPatterns = [
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
      { regex: /urology|urologist/i, value: 'Urology' },
      { regex: /allerg(y|ist)/i, value: 'Allergy & Immunology' },
      { regex: /immunolog(y|ist)/i, value: 'Allergy & Immunology' },
      { regex: /rheumatolog(y|ist)/i, value: 'Rheumatology' },
      { regex: /nephrology|nephrologist/i, value: 'Nephrology' },
      { regex: /infectious disease/i, value: 'Infectious Disease' }
    ];
    
    specialtyPatterns.forEach(pattern => {
      if (pattern.regex.test(queryText)) {
        if (!queryInfo.entities.specialties.includes(pattern.value)) {
          queryInfo.entities.specialties.push(pattern.value);
        }
      }
    });
  }
  
  /**
   * Extract profession entities from query
   * @param {string} queryText - The normalized query
   * @param {object} queryInfo - The query information to update
   */
  extractProfessions(queryText, queryInfo) {
    // Based on the Type_of_Professional field in the full_list.csv
    const professionPatterns = [
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
    
    professionPatterns.forEach(pattern => {
      if (pattern.regex.test(queryText)) {
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
   * Extract campaign entities from query
   * @param {string} queryText - The normalized query
   * @param {object} queryInfo - The query information to update
   */
  extractCampaigns(queryText, queryInfo) {
    // Common campaign names and types based on the actual file listing
    const campaignPatterns = [
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
    
    // Extract months that might be part of campaign names
    const monthPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)/i;
    const monthMatch = queryText.match(monthPattern);
    
    // Extract years that might be part of campaign names
    const yearPattern = /(20\d{2})/;
    const yearMatch = queryText.match(yearPattern);
    
    // Look for deployment numbers
    const deploymentPattern = /deployment\s*#?\s*([1-3])/i;
    const deploymentMatch = queryText.match(deploymentPattern);
    
    // Add extracted campaign patterns
    campaignPatterns.forEach(pattern => {
      if (pattern.regex.test(queryText)) {
        if (!queryInfo.entities.campaigns.includes(pattern.value)) {
          queryInfo.entities.campaigns.push(pattern.value);
        }
      }
    });
    
    // Build a more specific campaign name if we have month/year information
    if (monthMatch && yearMatch) {
      const month = monthMatch[1];
      const year = yearMatch[1];
      
      // Check for specific campaigns with this month/year
      for (const campaign of queryInfo.entities.campaigns) {
        const specificCampaign = `${campaign} ${month} ${year}`;
        if (!queryInfo.entities.specificCampaigns) {
          queryInfo.entities.specificCampaigns = [];
        }
        queryInfo.entities.specificCampaigns.push(specificCampaign);
      }
    }
    
    // Add deployment information if found
    if (deploymentMatch) {
      queryInfo.entities.deployment = parseInt(deploymentMatch[1]);
    }
  }
  
  /**
   * Extract metric entities from query
   * @param {string} queryText - The normalized query
   * @param {object} queryInfo - The query information to update
   */
  extractMetrics(queryText, queryInfo) {
    const metricPatterns = [
      { regex: /open rate/i, value: 'open_rate' },
      { regex: /click(?:.|-)through rate/i, value: 'click_rate' },
      { regex: /click rate/i, value: 'click_rate' },
      { regex: /engagement/i, value: 'engagement_score' },
      { regex: /bounce rate/i, value: 'bounce_rate' },
      { regex: /delivery rate/i, value: 'delivery_rate' },
      { regex: /response time/i, value: 'response_time' }
    ];
    
    metricPatterns.forEach(pattern => {
      if (pattern.regex.test(queryText)) {
        if (!queryInfo.entities.metrics.includes(pattern.value)) {
          queryInfo.entities.metrics.push(pattern.value);
        }
      }
    });
  }
  
  /**
   * Extract timeframe entities from query
   * @param {string} queryText - The normalized query
   * @param {object} queryInfo - The query information to update
   */
  extractTimeframe(queryText, queryInfo) {
    // Match specific months
    const monthMatch = queryText.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
    
    // Match year patterns
    const yearMatch = queryText.match(/\b(20\d{2})\b/);
    
    // Match quarter patterns
    const quarterMatch = queryText.match(/\bq([1-4])\b/i);
    
    // Match ranges like "January-February"
    const rangeMatch = queryText.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:to|-)\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
    
    // Build timeframe object based on matches
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
   * Extract email entities from query
   * @param {string} queryText - The normalized query
   * @param {object} queryInfo - The query information to update
   */
  extractEmail(queryText, queryInfo) {
    const emailMatch = queryText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) {
      queryInfo.entities.email = emailMatch[0].toLowerCase();
    }
  }
  
  /**
   * Extract topic entities from query
   * @param {string} queryText - The normalized query
   * @param {object} queryInfo - The query information to update
   */
  extractTopics(queryText, queryInfo) {
    // Based on the topic_patterns in topic_affinity.py
    const topicPatterns = [
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
      { regex: /\bhemoglobin levels\b/i, value: 'anemia' },
      { regex: /\bferric carboxymaltose\b/i, value: 'anemia' },
      { regex: /\binjectafer\b/i, value: 'anemia' },
      { regex: /\batopic dermatitis\b/i, value: 'atopic dermatitis' },
      { regex: /\beczema\b/i, value: 'atopic dermatitis' },
      { regex: /\bdupilumab\b/i, value: 'atopic dermatitis' },
      { regex: /\bupadacitinib\b/i, value: 'atopic dermatitis' },
      { regex: /\bthalassemia\b/i, value: 'beta thalassemia & myelodysplastic syndromes' },
      { regex: /\bmds\b/i, value: 'beta thalassemia & myelodysplastic syndromes' },
      { regex: /\bmyelodysplastic syndromes\b/i, value: 'beta thalassemia & myelodysplastic syndromes' },
      { regex: /\bchronic lymphocytic leukemia\b/i, value: 'chronic lymphocytic leukemia' },
      { regex: /\bcll\b/i, value: 'chronic lymphocytic leukemia' },
      { regex: /\bmantle cell lymphoma\b/i, value: 'mantle cell lymphoma' },
      { regex: /\bmcl\b/i, value: 'mantle cell lymphoma' },
      { regex: /\bbtk inhibitor\b/i, value: 'chronic lymphocytic leukemia' },
      { regex: /\bvitiligo\b/i, value: 'vitiligo' },
      { regex: /\brosacea\b/i, value: 'rosacea' },
      { regex: /\bmolluscum contagiosum\b/i, value: 'molluscum contagiosum' },
      { regex: /\bpsoriatic arthritis\b/i, value: 'psoriatic arthritis' },
      { regex: /\bpsa\b/i, value: 'psoriatic arthritis' }
    ];
    
    topicPatterns.forEach(pattern => {
      if (pattern.regex.test(queryText)) {
        if (!queryInfo.entities.topics.includes(pattern.value)) {
          queryInfo.entities.topics.push(pattern.value);
        }
      }
    });
  }
  
  /**
   * Get default metrics for a query type if none specified
   * @param {string} queryType - The type of query
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
   * Fetch data for the parsed query
   * @param {object} queryInfo - The parsed query information
   * @returns {Promise<object>} The data for the query
   */
  async fetchDataForQuery(queryInfo) {
    // Initialize our DataService if needed
    if (!this.dataService) {
      // Lazy-load data service on first use
      const DataService = (await import('./data-service.js')).default;
      this.dataService = new DataService();
    }
    
    try {
      console.log('Fetching data for query type:', queryInfo.queryType);

      // Call the appropriate method based on query type
      switch (queryInfo.queryType) {
        case 'top_users':
          return await this.dataService.getTopUsers(queryInfo.entities);
          
        case 'content_performance':
          return await this.dataService.getContentPerformance(queryInfo.entities);
          
        case 'timing_insights':
          return await this.dataService.getTimingInsights(queryInfo.entities);
          
        case 'audience_overview':
          return await this.dataService.getAudienceOverview(queryInfo.entities);
          
        case 'user_profile':
          return await this.dataService.getUserProfile(queryInfo.entities);
          
        case 'specialty_engagement':
          return await this.dataService.getSpecialtyEngagement(queryInfo.entities);
          
        case 'specialty_comparison':
          return await this.dataService.getSpecialtyComparison(queryInfo.entities);
          
        case 'user_count':
          return await this.dataService.getUserCount(queryInfo.entities);
          
        default:
          // Default to audience overview if we don't have a specific handler
          return await this.dataService.getAudienceOverview(queryInfo.entities);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }

  /**
   * Format the response for display
   * @param {object} data - The raw data from the data service
   * @param {object} queryInfo - The query information
   * @returns {object} Formatted response for the frontend
   */
  formatResponse(data, queryInfo) {
    // Initialize our ResponseFormatter if needed
    if (!this.responseFormatter) {
      // Lazy-load response formatter
      this.responseFormatter = new (require('./response-formatter').default)();
    }
    
    try {
      // Format the response based on the query type
      const formatted = this.responseFormatter.format(data, queryInfo);
      
      // Make sure the response has the correct type
      formatted.responseType = queryInfo.queryType;
      
      return formatted;
    } catch (error) {
      console.error('Error formatting response:', error);
      
      // Return an error response if formatting fails
      return {
        responseType: 'error',
        message: 'There was a problem formatting the results.',
        technicalDetails: error.message,
        suggestions: this.generateFallbackSuggestions(),
        originalQuery: queryInfo.originalQuery || 'Unknown query'
      };
    }
  }

  /**
   * Check cache for a previous query result
   * @param {string} queryText - The normalized query text
   * @returns {object|null} Cached result or null if not found
   */
  checkCache(queryText) {
    if (!this.queryCache.has(queryText)) {
      return null;
    }
    
    const cachedItem = this.queryCache.get(queryText);
    const now = Date.now();
    
    // Check if cache has expired
    if (now - cachedItem.timestamp > this.cacheTimeout) {
      this.queryCache.delete(queryText);
      return null;
    }
    
    return cachedItem.result;
  }

  /**
   * Store a result in the cache
   * @param {string} queryText - The normalized query text
   * @param {object} result - The result to cache
   */
  storeInCache(queryText, result) {
    this.queryCache.set(queryText, {
      result,
      timestamp: Date.now()
    });
    
    // Limit cache size to 50 items
    if (this.queryCache.size > 50) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }
  }

  /**
   * Generate fallback suggestions for error cases
   * @returns {string[]} List of suggested queries
   */
  generateFallbackSuggestions() {
    return [
      "Show me top engaged users",
      "What content works best for dermatologists?",
      "When do physicians prefer to read our content?",
      "Give me an overview of our audience",
      "Compare dermatology vs oncology engagement",
      "Show metrics for JCAD Journal Review January 2025 Emmy Graber campaign",
      "How many Nurse Practitioners opened the January 2025 emails?",
      "What were the peak opening hours for Oncology contacts?"
    ];
  }
  
  /**
   * Initialize the system by preloading dependencies
   * This can be called at app startup to warm up the system
   */
  async initialize() {
    try {
      // Preload dependencies
      const DataService = (await import('./data-service.js')).default;
      this.dataService = new DataService(this.storageConfig);
      await this.dataService.initialize();
      
      const ResponseFormatter = (await import('./response-formatter.js')).default;
      this.responseFormatter = new ResponseFormatter();
      
      console.log('QueryEngine initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing QueryEngine:', error);
      return false;
    }
  }
}

export default QueryEngine;