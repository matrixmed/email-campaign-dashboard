export const KEYWORD_INDUSTRY_MAP = {
  // Dermatology
  'atopic dermatitis': 'Dermatology',
  'chronic hand eczema': 'Dermatology',
  'pustular psoriasis': 'Dermatology',
  'prurigo nodularis': 'Dermatology',
  'molluscum contagiosum': 'Dermatology',
  'squamous cell carcinoma': 'Dermatology',
  'pigmented lesion': 'Dermatology',
  'skincare science': 'Dermatology',
  'skin health': 'Dermatology',
  'skin barrier': 'Dermatology',
  'maui derm': 'Dermatology',
  'psoriasis': 'Dermatology',
  'melanoma': 'Dermatology',
  'vitiligo': 'Dermatology',
  'rosacea': 'Dermatology',
  'alopecia': 'Dermatology',
  'eczema': 'Dermatology',
  'acne': 'Dermatology',
  'jcad': 'Dermatology',
  'nppa': 'Dermatology',
  'sdnp': 'Dermatology',
  'scc': 'Dermatology',
  'gpp': 'Dermatology',
  'aad': 'Dermatology',
  // Dermatology brands
  'spevigo': 'Dermatology',
  'opzelura': 'Dermatology',
  'winlevi': 'Dermatology',
  'cabtreo': 'Dermatology',
  'rinvoq': 'Dermatology',
  'skyrizi': 'Dermatology',
  'bimzelx': 'Dermatology',
  'leqselvi': 'Dermatology',
  'anzupgo': 'Dermatology',
  'nemluvio': 'Dermatology',
  'zoryve': 'Dermatology',
  'skinbetter': 'Dermatology',
  'neutrogena': 'Dermatology',
  'castle': 'Dermatology',
  'decision-dx': 'Dermatology',
  'decisiondx': 'Dermatology',

  // Oncology
  'non-small cell lung cancer': 'Oncology',
  'renal cell carcinoma': 'Oncology',
  'neuroendocrine tumor': 'Oncology',
  'pancreatic cancer': 'Oncology',
  'ovarian cancer': 'Oncology',
  'prostate cancer': 'Oncology',
  'thyroid cancer': 'Oncology',
  'bladder cancer': 'Oncology',
  'breast cancer': 'Oncology',
  'lung cancer': 'Oncology',
  'gi cancer': 'Oncology',
  'cancer': 'Oncology',
  'colorectal': 'Oncology',
  'oncology': 'Oncology',
  'nsclc': 'Oncology',
  'sabcs': 'Oncology',
  'sclc': 'Oncology',
  'asco': 'Oncology',
  'suo': 'Oncology',
  'ons': 'Oncology',
  'rcc': 'Oncology',
  // Oncology brands
  'verzenio': 'Oncology',
  'tagrisso': 'Oncology',
  'imfinzi': 'Oncology',
  'truqap': 'Oncology',
  'phesgo': 'Oncology',
  'enhertu': 'Oncology',
  'cabometyx': 'Oncology',
  'one lung': 'Oncology',
  'imlunestrant': 'Oncology',
  'inluriyo': 'Oncology',
  'inluryio': 'Oncology',
  'itovebi': 'Oncology',
  'dato dxd': 'Oncology',
  'datroway': 'Oncology',

  // Hematology
  'chronic lymphocytic leukemia': 'Hematology',
  'mantle cell lymphoma': 'Hematology',
  'follicular lymphoma': 'Hematology',
  'sickle cell disease': 'Hematology',
  'multiple myeloma': 'Hematology',
  'lymphoma': 'Hematology',
  'anemia': 'Hematology',
  'jadpro': 'Hematology',
  'bcma': 'Hematology',
  'ash 20': 'Hematology',
  'mcl': 'Hematology',
  'cll': 'Hematology',
  // Hematology brands
  'calquence': 'Hematology',
  'jaypirca': 'Hematology',
  'carvykti': 'Hematology',
  'breyanzi': 'Hematology',
  'lyfgenia': 'Hematology',
  'reblozyl': 'Hematology',
  'injectafer': 'Hematology',

  // Neuroscience
  'multiple sclerosis': 'Neuroscience',
  'neuroscience': 'Neuroscience',
  'neurology': 'Neuroscience',
  'alzheimer': 'Neuroscience',
  'parkinson': 'Neuroscience',
  'epilepsy': 'Neuroscience',
  'icns': 'Neuroscience',
  // Neuroscience brands
  'kisunla': 'Neuroscience',
  'ocrevus': 'Neuroscience',
  'vyalev': 'Neuroscience',

  // Ophthalmology
  'inherited retinal disease': 'Ophthalmology',
  'macular degeneration': 'Ophthalmology',
  'macular edema': 'Ophthalmology',
  'retinal disease': 'Ophthalmology',
  'ophthalmology': 'Ophthalmology',
  'ird': 'Ophthalmology',
  // Ophthalmology brands
  'vabysmo': 'Ophthalmology',

  // Gastroenterology
  'esophageal disease': 'Gastroenterology',
  'gastroenterology': 'Gastroenterology',

  // Neonatology
  'neonatal': 'Neonatology',
  'nicu': 'Neonatology',

  // Allergy & Immunology
  'inflammatory disease': 'Allergy & Immunology',
  'pulmonology': 'Allergy & Immunology',
  'allergy': 'Allergy & Immunology',
  'copd': 'Allergy & Immunology',
  // Allergy brands
  'uplizna': 'Allergy & Immunology',

  // Bariatrics
  'bariatric': 'Bariatrics',
  'metabolic surgery': 'Bariatrics',
  'obesity': 'Bariatrics',
  'bt ': 'Bariatrics',

  // Endocrinology
  'diabetes': 'Endocrinology',
  'gvoke': 'Endocrinology',

  // Cardiology
  'cardiology': 'Cardiology',

  // Infectious Disease
  'infectious disease': 'Infectious Disease',

  // Pediatrics
  'aap 20': 'Pediatrics',
  'claritin': 'Pediatrics',

  // Nutrition
  'nhr': "NHR",
};

export const getIndustryFromMap = (campaignName, industryMap) => {
  const name = campaignName.toLowerCase();
  let matched = null;
  let matchedLen = 0;
  for (const [brand, industry] of Object.entries(industryMap)) {
    if (name.includes(brand) && brand.length > matchedLen) {
      matched = industry;
      matchedLen = brand.length;
    }
  }
  return matched;
};

const INDUSTRY_NORMALIZE = {
  "women's health": 'Oncology',
  'neurology': 'Neuroscience',
};

export const getIndustry = (campaignName, brandIndustryMap) => {
  const combined = { ...KEYWORD_INDUSTRY_MAP, ...brandIndustryMap };
  const raw = getIndustryFromMap(campaignName, combined);
  if (!raw) return null;
  return INDUSTRY_NORMALIZE[raw.toLowerCase()] || raw;
};