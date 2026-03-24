export const KEYWORD_INDUSTRY_MAP = {
  'atopic dermatitis': 'Dermatology',
  'chronic hand eczema': 'Dermatology',
  'pustular psoriasis': 'Dermatology',
  'prurigo nodularis': 'Dermatology',
  'pigmented lesion': 'Dermatology',
  'skincare science': 'Dermatology',
  'maui derm': 'Dermatology',
  'psoriasis': 'Dermatology',
  'melanoma': 'Dermatology',
  'vitiligo': 'Dermatology',
  'alopecia': 'Dermatology',
  'eczema': 'Dermatology',
  'acne': 'Dermatology',
  'jcad': 'Dermatology',
  'nppa': 'Dermatology',
  'sdnp': 'Dermatology',
  'gpp': 'Dermatology',
  'aad': 'Dermatology',
  'non-small cell lung cancer': 'Oncology',
  'renal cell carcinoma': 'Oncology',
  'neuroendocrine tumor': 'Oncology',
  'bladder cancer': 'Oncology',
  'breast cancer': 'Oncology',
  'lung cancer': 'Oncology',
  'colorectal': 'Oncology',
  'oncology': 'Oncology',
  'nsclc': 'Oncology',
  'sabcs': 'Oncology',
  'sclc': 'Oncology',
  'asco': 'Oncology',
  'suo': 'Oncology',
  'rcc': 'Oncology',
  'chronic lymphocytic leukemia': 'Hematology',
  'mantle cell lymphoma': 'Hematology',
  'follicular lymphoma': 'Hematology',
  'multiple myeloma': 'Hematology',
  'jadpro': 'Hematology',
  'bcma': 'Hematology',
  'ash 20': 'Hematology',
  'mcl': 'Hematology',
  'cll': 'Hematology',
  'neuroscience': 'Neuroscience',
  'alzheimer': 'Neuroscience',
  'parkinson': 'Neuroscience',
  'icns': 'Neuroscience',
  'ophthalmology': 'Ophthalmology',
  'gastroenterology': 'Gastroenterology',
  'neonatal': 'Neonatology',
  'nhr': 'Neonatology',
  'inflammatory disease': 'Allergy & Immunology',
  'pulmonology': 'Allergy & Immunology',
  'allergy': 'Allergy & Immunology',
  'diabetes': 'Endocrinology',
  'cardiology': 'Cardiology',
  'infectious disease': 'Infectious Disease',
  'aap 20': 'Pediatrics',
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