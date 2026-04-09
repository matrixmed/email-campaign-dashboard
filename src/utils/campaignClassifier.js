const BRAND_TO_DISEASE = {
  // Dermatology
  'spevigo': 'Generalized Pustular Psoriasis',
  'opzelura': 'Atopic Dermatitis',
  'winlevi': 'Acne',
  'cabtreo': 'Acne',
  'rinvoq': 'Atopic Dermatitis',
  'skyrizi': 'Psoriasis',
  'adbry': 'Atopic Dermatitis',
  'dupixent': 'Atopic Dermatitis',
  'nemluvio': 'Atopic Dermatitis',
  'sotyktu': 'Psoriasis',
  'vtama': 'Psoriasis',
  'zoryve': 'Psoriasis',
  'bimzelx': 'Psoriasis',
  'otezla': 'Psoriasis',
  'taltz': 'Psoriasis',
  'cimzia': 'Psoriasis',
  'ilumya': 'Psoriasis',
  'litfulo': 'Alopecia Areata',
  'leqselvi': 'Alopecia Areata',
  'anzupgo': 'Chronic Hand Eczema',
  'delgocitinib': 'Chronic Hand Eczema',
  'ycanth': 'Molluscum Contagiosum',
  'dermablend': 'Vitiligo',
  'castle': 'Melanoma',
  'decision-dx': 'Melanoma',
  'decisiondx': 'Melanoma',
  'mypath': 'Melanoma',
  'rhofade': 'Rosacea',
  'seysara': 'Acne',
  'absorica': 'Acne',
  'altreno': 'Acne',
  'arazlo': 'Acne',
  'sol gel': 'Acne',

  // Oncology
  'verzenio': 'Breast Cancer',
  'tagrisso': 'Lung Cancer',
  'imfinzi': 'Lung Cancer',
  'imfinzi gi': 'GI Cancers',
  'imfinzi gu': 'Bladder Cancer',
  'truqap': 'Breast Cancer',
  'phesgo': 'Breast Cancer',
  'enhertu': 'Breast Cancer',
  'imlunestrant': 'Breast Cancer',
  'inluriyo': 'Breast Cancer',
  'inluryio': 'Breast Cancer',
  'itovebi': 'Breast Cancer',
  'dato dxd': 'Breast Cancer',
  'datroway': 'Breast Cancer',
  'one lung': 'Lung Cancer',
  'lynparza': 'Ovarian Cancer',
  'retevmo': 'Thyroid Cancer',
  'halaven': 'Breast Cancer',
  'abraxane': 'Breast Cancer',
  'cabometyx': 'Renal Cell Carcinoma',
  'tecentriq': 'Lung Cancer',
  'keytruda': 'Lung Cancer',

  // Hematology
  'calquence': 'Chronic Lymphocytic Leukemia',
  'jaypirca': 'Chronic Lymphocytic Leukemia',
  'carvykti': 'Multiple Myeloma',
  'breyanzi': 'Lymphoma',
  'lyfgenia': 'Sickle Cell Disease',
  'reblozyl': 'Anemia',
  'injectafer': 'Anemia',

  // Neuroscience
  'kisunla': 'Alzheimers Disease',
  'ocrevus': 'Multiple Sclerosis',
  'vyalev': 'Parkinsons Disease',

  // Ophthalmology
  'vabysmo': 'Retinal Disease',

  // Immunology
  'uplizna': 'Inflammatory Diseases',

  // Endocrinology
  'invokana': 'Diabetes',
  'jardiance': 'Diabetes',
  'gvoke': 'Diabetes',
};

const DISEASE_ABBREVIATIONS = {
  'gpp': 'Generalized Pustular Psoriasis',
  'nsclc': 'Lung Cancer',
  'sclc': 'Lung Cancer',
  'rcc': 'Renal Cell Carcinoma',
  'mcl': 'Mantle Cell Lymphoma',
  'cll': 'Chronic Lymphocytic Leukemia',
  'scc': 'Squamous Cell Carcinoma',
  'mbc': 'Breast Cancer',
  'fl': 'Follicular Lymphoma',
  'net': 'Neuroendocrine Tumors',
  'dme': 'Diabetic Macular Edema',
  'namd': 'Age-Related Macular Degeneration',
  'nmosd': 'Neuromyelitis Optica',
  'ird': 'Inherited Retinal Diseases',
  'copd': 'COPD',
  'bcma': 'Multiple Myeloma',
};

const DISEASE_KEYWORDS = [
  'generalized pustular psoriasis',
  'non-small cell lung cancer',
  'small cell lung cancer',
  'chronic lymphocytic leukemia',
  'age-related macular degeneration',
  'metastatic breast cancer',
  'mantle cell lymphoma',
  'renal cell carcinoma',
  'squamous cell carcinoma',
  'neuroendocrine tumor',
  'follicular lymphoma',
  'chronic hand eczema',
  'prurigo nodularis',
  'diabetic macular edema',
  'inherited retinal disease',
  'neuromyelitis optica',
  'molluscum contagiosum',
  'inflammatory disease',
  'sickle cell disease',
  'multiple sclerosis',
  'multiple myeloma',
  'atopic dermatitis',
  'esophageal disease',
  'pigmented lesion',
  'alopecia areata',
  'ovarian cancer',
  'prostate cancer',
  'pancreatic cancer',
  'thyroid cancer',
  'bladder cancer',
  'breast cancer',
  'lung cancer',
  'gi cancer',
  'alzheimer',
  'parkinson',
  'colorectal',
  'melanoma',
  'psoriasis',
  'vitiligo',
  'rosacea',
  'alopecia',
  'epilepsy',
  'diabetes',
  'anemia',
  'eczema',
  'copd',
  'acne',
];

const DISEASE_DISPLAY_NAME = {
  'generalized pustular psoriasis': 'Generalized Pustular Psoriasis',
  'non-small cell lung cancer': 'Lung Cancer',
  'small cell lung cancer': 'Lung Cancer',
  'chronic lymphocytic leukemia': 'Chronic Lymphocytic Leukemia',
  'age-related macular degeneration': 'Age-Related Macular Degeneration',
  'metastatic breast cancer': 'Breast Cancer',
  'mantle cell lymphoma': 'Mantle Cell Lymphoma',
  'renal cell carcinoma': 'Renal Cell Carcinoma',
  'squamous cell carcinoma': 'Squamous Cell Carcinoma',
  'neuroendocrine tumor': 'Neuroendocrine Tumors',
  'follicular lymphoma': 'Follicular Lymphoma',
  'chronic hand eczema': 'Chronic Hand Eczema',
  'prurigo nodularis': 'Prurigo Nodularis',
  'diabetic macular edema': 'Diabetic Macular Edema',
  'inherited retinal disease': 'Inherited Retinal Diseases',
  'neuromyelitis optica': 'Neuromyelitis Optica',
  'molluscum contagiosum': 'Molluscum Contagiosum',
  'inflammatory disease': 'Inflammatory Diseases',
  'sickle cell disease': 'Sickle Cell Disease',
  'multiple sclerosis': 'Multiple Sclerosis',
  'multiple myeloma': 'Multiple Myeloma',
  'atopic dermatitis': 'Atopic Dermatitis',
  'esophageal disease': 'Esophageal Diseases',
  'pigmented lesion': 'Pigmented Lesions',
  'alopecia areata': 'Alopecia Areata',
  'ovarian cancer': 'Ovarian Cancer',
  'prostate cancer': 'Prostate Cancer',
  'pancreatic cancer': 'Pancreatic Cancer',
  'thyroid cancer': 'Thyroid Cancer',
  'bladder cancer': 'Bladder Cancer',
  'breast cancer': 'Breast Cancer',
  'lung cancer': 'Lung Cancer',
  'gi cancer': 'GI Cancers',
  'alzheimer': 'Alzheimers Disease',
  'parkinson': 'Parkinsons Disease',
  'colorectal': 'Colorectal Cancer',
  'melanoma': 'Melanoma',
  'psoriasis': 'Psoriasis',
  'vitiligo': 'Vitiligo',
  'rosacea': 'Rosacea',
  'alopecia': 'Alopecia Areata',
  'epilepsy': 'Epilepsy',
  'diabetes': 'Diabetes',
  'anemia': 'Anemia',
  'eczema': 'Atopic Dermatitis',
  'copd': 'COPD',
  'acne': 'Acne',
};

const SPECIALTY_NOT_DISEASE = new Set([
  'oncology', 'ophthalmology', 'gastroenterology', 'cardiology',
  'neuroscience', 'neurology', 'neonatology', 'pulmonology',
  'pain management', 'general surgery', 'infectious disease',
  'skincare science', 'skin health', 'skin barrier',
  'therapeutic skincare', 'targeted phototherapy',
]);

function extractDiseaseFromStructuralPattern(campaignName) {
  const match = campaignName.match(
    /(?:updates|perspectives|topics|dialogues|innovations|trends)\s+in\s+(.+?)(?:\s+(?:-\s|january|february|march|april|may|june|july|august|september|october|november|december|20\d{2}|enl|e-?blast|custom|new\s+issue|traffic|triggered|wrap|promo|advisor|meeting|supplement|recap|launch|patient|hcp)\b)/i
  );
  if (match) {
    return match[1].replace(/\s*[-–—]\s*$/, '').trim();
  }
  return null;
}

function extractDiseaseFromParenthetical(campaignName) {
  const parens = [];
  const regex = /\(([^)]+)\)/g;
  let m;
  while ((m = regex.exec(campaignName)) !== null) {
    parens.push(m[1].trim());
  }

  for (const content of parens) {
    const lower = content.toLowerCase();
    if (lower === 'unsponsored' || lower.includes('list') || lower.includes('segment')) continue;
    if (BRAND_TO_DISEASE[lower]) continue;

    if (DISEASE_ABBREVIATIONS[lower]) return DISEASE_ABBREVIATIONS[lower];

    for (const keyword of DISEASE_KEYWORDS) {
      if (lower.includes(keyword)) return DISEASE_DISPLAY_NAME[keyword];
    }
  }
  return null;
}

export function getDiseaseFromCampaign(campaignName) {
  const n = campaignName.toLowerCase();

  const structural = extractDiseaseFromStructuralPattern(campaignName);
  if (structural) {
    const sLower = structural.toLowerCase();

    if (SPECIALTY_NOT_DISEASE.has(sLower)) return null;

    if (DISEASE_ABBREVIATIONS[sLower]) return DISEASE_ABBREVIATIONS[sLower];

    for (const keyword of DISEASE_KEYWORDS) {
      if (sLower.includes(keyword)) return DISEASE_DISPLAY_NAME[keyword];
    }

    if (/allergy|pulmo/i.test(structural)) return null;

  }

  const parenDisease = extractDiseaseFromParenthetical(campaignName);
  if (parenDisease) return parenDisease;

  for (const keyword of DISEASE_KEYWORDS) {
    if (n.includes(keyword)) {
      if (SPECIALTY_NOT_DISEASE.has(keyword)) continue;
      return DISEASE_DISPLAY_NAME[keyword];
    }
  }

  for (const [abbrev, disease] of Object.entries(DISEASE_ABBREVIATIONS)) {
    const abbrRegex = new RegExp(`\\b${abbrev}\\b`, 'i');
    if (abbrRegex.test(n)) return disease;
  }

  const sortedBrands = Object.entries(BRAND_TO_DISEASE)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [brand, disease] of sortedBrands) {
    if (n.includes(brand)) return disease;
  }

  const doctorMap = [
    [/andrew mastro|naiem issa|lisa swanson|raj chovatiya|peter lio|matthew zirwas|douglas diruggiero|margaret bobonich/i, 'Atopic Dermatitis'],
    [/iltefat hamzavi|jennifer silva|julien seneschal|david rosmarin|nada elbuluk|shanna miranti|gina mangin/i, 'Vitiligo'],
    [/tina bhutani|johann.*gudjonsson/i, 'Generalized Pustular Psoriasis'],
    [/jason rizzo|abel jarell|hadas skupsky/i, 'Melanoma'],
    [/seemal desai/i, 'Vitiligo'],
    [/george martin/i, 'Psoriasis'],
    [/andrea nguyen/i, 'Chronic Hand Eczema'],
  ];
  for (const [pattern, disease] of doctorMap) {
    if (pattern.test(campaignName)) return disease;
  }

  return null;
}

export function classifyCampaign(campaignName) {
  const n = campaignName.toLowerCase();
  const disease = getDiseaseFromCampaign(campaignName) || 'General';

  if (/expert\s*perspectives/i.test(n) || /\bep\b/.test(n)) {
    return { bucket: 'Expert Perspectives', topic: disease };
  }
  if (/clinical\s*updates/i.test(n) || /(?:^|[\s_-])cu(?:[\s_-])/i.test(n)) {
    return { bucket: 'Clinical Updates', topic: disease };
  }
  if (/hot\s*topics/i.test(n) || /(?:^|[\s_-])ht(?:[\s_-])/i.test(n)) {
    return { bucket: 'Hot Topics', topic: disease };
  }
  if (/dialogues\s*in/i.test(n) || /treatment\s*perspectives/i.test(n) || /innovations\s*in/i.test(n) || /current\s*trends/i.test(n)) {
    return { bucket: 'Expert Perspectives', topic: disease };
  }
  if (/advisor/i.test(n) && !/traffic/i.test(n)) {
    return { bucket: 'Expert Perspectives', topic: disease };
  }
  if (/patient\s*edition/i.test(n)) {
    return { bucket: 'Patient Edition', topic: disease };
  }
  if (/mini-?roundtable/i.test(n) || /roundtable/i.test(n)) {
    return { bucket: 'Expert Perspectives', topic: disease };
  }
  if (/triggered\s*email/i.test(n)) {
    return { bucket: 'Triggered Email', topic: disease };
  }
  if (/custom\s*email/i.test(n)) {
    return { bucket: 'Custom Email', topic: disease };
  }
  if (/rep\s*follow/i.test(n)) {
    return { bucket: 'Custom Email', topic: disease };
  }
  if (/conference\s*coverage/i.test(n)) {
    return { bucket: 'Conference Coverage', topic: disease };
  }
  if (/show\s*dailies/i.test(n)) {
    return { bucket: 'Show Dailies', topic: disease };
  }
  if (/video\s*coverage/i.test(n)) {
    return { bucket: 'Expert Perspectives', topic: disease };
  }
  if (/video\s*e-?blast/i.test(n)) {
    return { bucket: 'Expert Perspectives', topic: disease };
  }
  if (/journal\s*review/i.test(n) || /journal\s*updates/i.test(n)) {
    return { bucket: 'Journal Review', topic: disease };
  }
  if (/podcast/i.test(n)) {
    return { bucket: 'Podcast', topic: disease };
  }
  if (/digital\s*highlights/i.test(n)) {
    return { bucket: 'Digital Highlights', topic: disease };
  }
  if (/webinar|webcast/i.test(n)) {
    return { bucket: 'Webinar', topic: disease };
  }
  if (/spotlight\s*on/i.test(n)) {
    return { bucket: 'Supplement', topic: disease };
  }
  if (/supplement/i.test(n)) {
    return { bucket: 'Supplement', topic: disease };
  }
  if (/new\s*issue/i.test(n)) {
    return { bucket: 'New Issue E-alert', topic: disease };
  }
  if (/exhibitor\s*showcase/i.test(n)) {
    return { bucket: 'E-blast', topic: disease };
  }
  if (/e-?blast/i.test(n)) {
    return { bucket: 'E-blast', topic: disease };
  }
  if (/traffic\s*driver/i.test(n)) {
    return { bucket: 'eNL', topic: disease };
  }
  if (/enl|e-?nl|e-?newsletter/i.test(n)) {
    return { bucket: 'eNL', topic: disease };
  }
  if (disease !== 'General') {
    return { bucket: 'Custom Email', topic: disease };
  }

  return { bucket: 'Other', topic: 'General' };
}

export function stripAbGroup(name) {
  return name.replace(/\s*[-\u2013\u2014]\s*group\s+[a-z]\b/i, '').trim();
}