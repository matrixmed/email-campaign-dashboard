const findGroup = (publicationName) => {
    if (/JCADTV.*Vitiligo/i.test(publicationName)) return 'JCADTV Vitiligo';
    if (/JCADTV.*Atopic Dermatitis/i.test(publicationName)) return 'JCADTV Atopic Dermatitis';
    if (/JCADTV.*Skin Barrier Care/i.test(publicationName)) return 'JCADTV Skin Barrier Care';
    if (/JCADTV.*Skincare Science/i.test(publicationName)) return 'JCADTV Skincare Science';
    if (/JCADTV.*Therapeutic Skincare/i.test(publicationName)) return 'JCADTV Therapeutic Skincare';
    if (/JCADTV.*Targeted Phototherapy/i.test(publicationName)) return 'JCADTV Targeted Phototherapy';
    if (/JCADTV.*Psoriasis/i.test(publicationName)) return 'JCADTV Psoriasis';
    if (/JCADTV/i.test(publicationName)) return 'JCADTV';
    if (/JCAD.TV/i.test(publicationName)) return 'JCADTV';

    if (/JCAD NPPA|NP\+PA/i.test(publicationName)) return 'JCAD NPPA';
    if (/NPPA/i.test(publicationName)) return 'NPPA';
    if (/JCAD.*Maui Derm/i.test(publicationName)) return 'JCAD Maui Derm';
    if (/Maui Derm/i.test(publicationName)) return 'Maui Derm';
    if (/JCAD.*AAD/i.test(publicationName)) return 'JCAD AAD';
    if (/AAD/i.test(publicationName)) return 'AAD';
    if (/JCAD.*PIA/i.test(publicationName)) return 'JCAD PIA';
    if (/JCAD.*SCA/i.test(publicationName)) return 'JCAD SCA';
    if (/SCA/i.test(publicationName)) return 'SCA';
    if (/JCAD.*EDI/i.test(publicationName)) return 'JCAD EDI';
    if (/JCAD.*Psoriasis/i.test(publicationName)) return 'JCAD Psoriasis';
    if (/JCAD.*Atopic Dermatitis/i.test(publicationName)) return 'JCAD Atopic Dermatitis';
    if (/Psoriasis/i.test(publicationName)) return 'Psoriasis';
    if (/JCAD.*EADV/i.test(publicationName)) return 'JCAD EADV';
    if (/^JCAD/i.test(publicationName)) return 'JCAD';

    if (/Inherited Retinal Diseases/i.test(publicationName)) return 'Inherited Retinal Diseases';
    if (/ICNS/i.test(publicationName)) return 'ICNS';
    if (/CNS/i.test(publicationName)) return 'CNS';
    if (/Psychiatry/i.test(publicationName)) return 'Psychiatry';
    if (/The Neuroscience Report/i.test(publicationName)) return 'The Neuroscience Report';

    if (/Hot Topics.*Squamous Cell Carcinoma/i.test(publicationName)) return 'Hot Topics in Squamous Cell Carcinoma';
    if (/Hot Topics.*Esophageal Diseases/i.test(publicationName)) return 'Hot Topics in Esophageal Diseases';
    if (/Hot Topics.*Melanoma/i.test(publicationName)) return 'Hot Topics in Melanoma';
    if (/Hot Topics.*CLL/i.test(publicationName)) return 'Hot Topics in CLL';
    if (/Hot Topics.*Skin Health/i.test(publicationName)) return 'Hot Topics in Skin Health';
    if (/Hot Topics.*Pain Management/i.test(publicationName)) return 'Hot Topics in Pain Management';
    if (/Hot Topics.*COPD/i.test(publicationName)) return 'Hot Topics in COPD';
    if (/Hot Topics.*Oncology/i.test(publicationName)) return 'Hot Topics in Oncology';
    if (/Hot Topics.*Multiple Sclerosis/i.test(publicationName)) return 'Hot Topics in Multiple Sclerosis';
    if (/Hot Topics.*Diabetes/i.test(publicationName)) return 'Hot Topics in Diabetes';
    if (/Hot Topics.*Psoriasis/i.test(publicationName)) return 'Hot Topics in Psoriasis';
    if (/Hot Topics.*Ovarian Cancer/i.test(publicationName)) return 'Hot Topics in Ovarian Cancer';
    if (/Hot Topics.*Breast Cancer/i.test(publicationName)) return 'Hot Topics in Breast Cancer';
    if (/Hot Topics.*NSCLC/i.test(publicationName)) return 'Hot Topics in NSCLC';
    if (/Hot Topics.*Acne/i.test(publicationName)) return 'Hot Topics in Acne';
    if (/Hot Topics.*Atopic Dermatitis/i.test(publicationName)) return 'Hot Topics in Atopic Dermatitis';
    if (/Hot Topics.*Anemia/i.test(publicationName)) return 'Hot Topics in Anemia';

    if (/Clinical Updates.*CLL/i.test(publicationName)) return 'Clinical Updates in CLL';
    if (/Clinical Updates.*MCL/i.test(publicationName)) return 'Clinical Updates in MCL';
    if (/Clinical Updates.*Breast Cancer/i.test(publicationName)) return 'Clinical Updates in Breast Cancer';
    if (/Clinical Updates.*Diabetes/i.test(publicationName)) return 'Clinical Updates in Diabetes';
    if (/Clinical Updates.*NSCLC/i.test(publicationName)) return 'Clinical Updates in NSCLC';
    if (/Clinical Updates.*Ovarian Cancer/i.test(publicationName)) return 'Clinical Updates in Ovarian Cancer';
    if (/Clinical Updates.*Pancreatic Cancer/i.test(publicationName)) return 'Clinical Updates in Pancreatic Cancer';
    if (/Clinical Updates.*Thyroid Cancer/i.test(publicationName)) return 'Clinical Updates in Thyroid Cancer';
    if (/Clinical Updates.*SCLC/i.test(publicationName)) return 'Clinical Updates in SCLC';
    if (/Clinical Updates.*Acne/i.test(publicationName)) return 'Clinical Updates in Acne';
    if (/Clinical Updates.*Anemia/i.test(publicationName)) return 'Clinical Updates in Anemia';

    if (/Custom Email/i.test(publicationName)) return 'Custom Email';

    return 'Others';
};

const groupPublications = (data) => {
        const groups = {
            'ICNS': [],
            'CNS': [],
            'The Neuroscience Report': [],
            'Psychiatry': [],
            'JCADTV Vitiligo': [],
            'JCADTV Atopic Dermatitis': [],
            'JCADTV Skin Barrier Care': [],
            'JCADTV Skincare Science': [],
            'JCADTV Therapeutic Skincare': [],
            'JCADTV Targeted Phototherapy': [],
            'JCADTV Psoriasis': [],
            'JCADTV': [],
            'JCAD': [],
            'JCAD NPPA': [],
            'NPPA': [],
            'JCAD Maui Derm': [],
            'Maui Derm': [],
            'JCAD AAD': [],
            'AAD': [],
            'JCAD PIA': [],
            'JCAD SCA': [],
            'SCA': [],
            'JCAD EDI': [],
            'JCAD Psoriasis': [],
            'JCAD Atopic Dermatitis': [],
            'Psoriasis': [],
            'JCAD EADV': [],
            'Inherited Retinal Diseases': [],
            'Hot Topics in Squamous Cell Carcinoma': [],
            'Hot Topics in Esophageal Diseases': [],
            'Hot Topics in Melanoma': [],
            'Hot Topics in CLL': [],
            'Hot Topics in Skin Health': [],
            'Hot Topics in Pain Management': [],
            'Hot Topics in COPD': [],
            'Hot Topics in Oncology': [],
            'Hot Topics in Multiple Sclerosis': [],
            'Hot Topics in Diabetes': [],
            'Hot Topics in Psoriasis': [],
            'Innovations in Prostate Cancer': [],
            'Clinical Updates in CLL': [],
            'Clinical Updates in MCL': [],
            'Clinical Updates in Diabetes': [],
            'Clinical Updates in Breast Cancer': [],
            'Clinical Updates in Ovarian Cancer': [],
            'Hot Topics in Ovarian Cancer': [],
            'Clinical Updates in Pancreatic Cancer': [],
            'Hot Topics in Breast Cancer': [],
            'Hot Topics in NSCLC': [],
            'Clinical Updates in NSCLC': [],
            'Clinical Updates in Thyroid Cancer': [],
            'Clinical Updates in SCLC': [],
            'Hot Topics in Acne': [],
            'Clinical Updates in Acne': [],
            'Hot Topics in Atopic Dermatitis': [],
            'Clinical Updates in Anemia': [],
            'Hot Topics in Anemia': [],
            'Custom Email': [],
            'Others': []
        };
    
        data.forEach(item => {
            const group = findGroup(item.Publication) || 'Others'; 
        
            if (!groups[group]) {
                console.error(`Group "${group}" does not exist in the groups object.`);
            } else {
                groups[group].push(item);
            }
        });
        
        return groups;
    }; 

export { groupPublications, findGroup };
