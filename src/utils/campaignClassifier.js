export function classifyCampaign(campaignName) {
  const n = campaignName.toLowerCase();

  if (/jcadtv.*video\s*coverage/.test(n) || /aad.*video\s*coverage/.test(n)) {
    return { bucket: 'JCADTV Video Coverage', topic: n.includes('aad') ? 'AAD' : 'Other' };
  }
  if (/conference\s*coverage/.test(n)) {
    const topic = n.includes('aad') ? 'AAD' : n.includes('asco') ? 'ASCO' : 'Other';
    return { bucket: 'Conference Coverage', topic };
  }
  if (/ons\s*show\s*dailies/.test(n)) return { bucket: 'ONS Show Dailies', topic: 'ONS' };
  if (/sdnp\s*e-?blast/.test(n)) return { bucket: 'SDNP e-blast', topic: 'SDNP' };

  if (/^bt\s/.test(n) || /\bbt\s+/.test(n)) {
    const topic = n.includes('spotlight') ? 'Spotlight on Technology' : n.includes('enl') ? 'eNL' : 'Other';
    return { bucket: 'BT', topic };
  }
  if (/triggered\s*email/.test(n)) {
    const topic = n.includes('calquence') ? 'Calquence' : n.includes('truqap') ? 'Truqap' : n.includes('mcl') ? 'MCL' : 'Other';
    return { bucket: 'Triggered Email', topic };
  }
  if (/^icns\s/.test(n) || /\bicns\s/.test(n)) return { bucket: 'ICNS', topic: 'ICNS New Issue' };
  if (n.includes('digital highlights')) return { bucket: 'Digital Highlights', topic: 'JCAD' };

  if (/new\s*issue\s*e-?alert/.test(n)) {
    const topic = n.includes('nppa') ? 'NPPA' : (n.includes('jcad') || n.includes('journal')) ? 'JCAD' : n.includes('nhr') ? 'NHR' : 'Other';
    return { bucket: 'New Issue E-alert', topic };
  }
  if (n.includes('podcast enl') || /podcast\s*e-?nl/.test(n)) return { bucket: 'Podcast eNL', topic: 'JCAD' };
  if (n.includes('journal review') || n.includes('journal updates')) return { bucket: 'Journal Review', topic: 'JCADTV' };

  if (n.includes('patient edition')) {
    return { bucket: 'Patient Edition', topic: n.includes('multiple myeloma') ? 'Multiple Myeloma' : 'Other' };
  }
  if (/^nhr\s/.test(n) || /\bnhr\s/.test(n)) {
    const topic = n.includes('enl') ? 'eNL' : n.includes('new issue') ? 'New Issue' : 'Other';
    return { bucket: 'NHR', topic };
  }
  if (/supplement/.test(n)) {
    const topic = n.includes('vitiligo roundtable') ? 'Vitiligo Roundtable' : n.includes('spotlight on technology') ? 'Spotlight on Technology' : 'Other';
    return { bucket: 'Supplement', topic };
  }
  if (/jcadtv\s*expert\s*perspectives/.test(n) || /\bep\b/.test(n) || /expert\s*perspectives/.test(n)) {
    let topic = 'Other';
    if (/andrew mastro|naiem issa|lisa swanson|raj chovatiya|diego/.test(n)) topic = 'Atopic Dermatitis';
    else if (/iltefat hamzavi|jennifer silva|julien seneschal/.test(n)) topic = 'Vitiligo';
    else if (/tina bhutani|gpp/.test(n)) topic = 'GPP';
    else if (/jason rizzo|abel jarell|hadas skupsky|melanoma/.test(n)) topic = 'Melanoma';
    else if (n.includes('rcc') || n.includes('cabometyx')) topic = 'RCC';
    else if (n.includes('skincare') || n.includes('skinbetter')) topic = 'Skincare Science';
    return { bucket: 'Expert Perspectives', topic };
  }
  if (/\bcu\b/.test(n) || /clinical\s*updates/.test(n)) {
    let topic = 'Other';
    if (n.includes('breast cancer')) topic = 'Breast Cancer';
    else if (n.includes('allergy') && n.includes('pulmo')) topic = 'Allergy & Pulmonology';
    else if (n.includes('cardiology')) topic = 'Cardiology';
    else if (n.includes('colorectal')) topic = 'Colorectal Surgery';
    else if (n.includes('diabetes')) topic = 'Diabetes';
    else if (n.includes('gastroenterology')) topic = 'Gastroenterology';
    else if (n.includes('gpp') || n.includes('generalized pustular psoriasis')) topic = 'Generalized Pustular Psoriasis';
    else if (n.includes('infectious disease')) topic = 'Infectious Disease';
    else if (n.includes('neonatology')) topic = 'Neonatology';
    else if (n.includes('neuroscience')) topic = 'Neuroscience';
    else if (n.includes('oncology')) topic = 'Oncology';
    else if (n.includes('ophthalmology')) topic = 'Ophthalmology';
    return { bucket: 'Clinical Updates', topic };
  }
  if (/\bht\b/.test(n) || /hot\s*topics/.test(n)) {
    let topic = 'Other';
    if (n.includes('metastatic breast cancer')) topic = 'Metastatic Breast Cancer';
    else if (n.includes('breast cancer')) topic = 'Breast Cancer';
    else if (n.includes('alzheimer')) topic = 'Alzheimers Disease';
    else if (n.includes('multiple myeloma')) topic = 'Multiple Myeloma';
    else if (n.includes('pigmented lesions')) topic = 'Pigmented Lesions';
    else if (n.includes('inflammatory')) topic = 'Inflammatory Diseases';
    else if (n.includes('mcl')) topic = 'MCL';
    else if (n.includes('nsclc')) topic = 'NSCLC';
    else if (n.includes('melanoma')) topic = 'Melanoma';
    else if (n.includes('ophthalmology')) topic = 'Ophthalmology';
    else if (n.includes('cll')) topic = 'CLL';
    return { bucket: 'Hot Topics', topic };
  }
  if (/custom\s*email/.test(n)) {
    const brands = ['verzenio','tagrisso','spevigo','winlevi','vabysmo','kisunla','calquence','truqap','opzelura','rinvoq','skyrizi','imfinzi','carvykti','breyanzi','phesgo','uplizna'];
    for (const brand of brands) {
      if (n.includes(brand)) return { bucket: 'Custom Email', topic: brand.charAt(0).toUpperCase() + brand.slice(1) };
    }
    return { bucket: 'Custom Email', topic: 'Other' };
  }

  return { bucket: 'Other', topic: 'Other' };
}

export function stripAbGroup(name) {
  return name.replace(/\s*[-\u2013\u2014]\s*group\s+[a-z]\b/i, '').trim();
}