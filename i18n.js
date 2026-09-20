(function () {
  const translations = {
    hi: {
      'Crop Procurement, Coordinated': 'फसल खरीद, समन्वित', 'Farmer Login': 'किसान लॉगिन', 'Staff Login': 'कर्मचारी लॉगिन', 'Back to home': 'होम पर वापस जाएं', 'Staff Login': 'कर्मचारी लॉगिन', 'Select your designation to continue.': 'जारी रखने के लिए अपना पद चुनें।', 'Employee ID': 'कर्मचारी आईडी', 'Password': 'पासवर्ड', 'Login': 'लॉगिन', 'Center In-Charge': 'केंद्र प्रभारी', 'Quality Inspector': 'गुणवत्ता निरीक्षक', 'Quantity Inspector': 'मात्रा निरीक्षक', 'Disbursing Officer': 'संवितरण अधिकारी', 'Overview': 'अवलोकन', 'My Profile': 'मेरी प्रोफ़ाइल', 'Procurement Slots': 'खरीद स्लॉट', 'Help & Support': 'सहायता और समर्थन', 'Logout': 'लॉगआउट', 'Hi ': 'नमस्ते ', 'Here is the latest update on your procurement journey.': 'आपकी खरीद प्रक्रिया का नवीनतम अपडेट यहां है।', 'Book a procurement slot': 'खरीद स्लॉट बुक करें', 'Current application': 'वर्तमान आवेदन', 'Registered land': 'पंजीकृत भूमि', 'Last payment': 'अंतिम भुगतान', 'Procurement status': 'खरीद स्थिति', 'My profile': 'मेरी प्रोफ़ाइल', 'Notifications': 'सूचनाएं', 'Need help?': 'सहायता चाहिए?', 'Farmer profiles': 'किसान प्रोफ़ाइल', 'Weighing station': 'तौल केंद्र', 'Inspection Queue': 'निरीक्षण कतार', 'Process Payment': 'भुगतान प्रक्रिया', 'Farmer Payments': 'किसान भुगतान', 'Payment History': 'भुगतान इतिहास', 'Pending / Failed': 'लंबित / विफल', 'Register Farmer': 'किसान पंजीकृत करें', 'Quantity procured, by crop': 'फसल के अनुसार खरीदी गई मात्रा', 'Today’s queue': 'आज की कतार', "Today's queue": 'आज की कतार', 'Farmer details': 'किसान विवरण', 'Procurement details': 'खरीद विवरण', 'Crop': 'फसल', 'Farmer ID': 'किसान आईडी', 'Name': 'नाम', 'Mobile': 'मोबाइल', 'Status': 'स्थिति', 'Quality result': 'गुणवत्ता परिणाम', 'Expected quantity': 'अपेक्षित मात्रा', 'Actual weight': 'वास्तविक वजन', 'Quality check': 'गुणवत्ता जांच', 'Submit Quantity': 'मात्रा जमा करें', 'Actual weight (quintals)': 'वास्तविक वजन (क्विंटल)', 'Select language': 'भाषा चुनें'
    },
    te: {
      'Crop Procurement, Coordinated': 'పంట సేకరణ, సమన్వయం', 'Farmer Login': 'రైతు లాగిన్', 'Staff Login': 'సిబ్బంది లాగిన్', 'Back to home': 'హోమ్‌కు తిరిగి వెళ్లండి', 'Select your designation to continue.': 'కొనసాగించడానికి మీ హోదాను ఎంచుకోండి.', 'Employee ID': 'ఉద్యోగి ID', 'Password': 'పాస్‌వర్డ్', 'Login': 'లాగిన్', 'Center In-Charge': 'కేంద్ర ఇన్‌ఛార్జ్', 'Quality Inspector': 'నాణ్యత ఇన్‌స్పెక్టర్', 'Quantity Inspector': 'క్వాంటిటీ ఇన్‌స్పెక్టర్', 'Disbursing Officer': 'చెల్లింపు అధికారి', 'Overview': 'అవలోకనం', 'My Profile': 'నా ప్రొఫైల్', 'Procurement Slots': 'సేకరణ స్లాట్‌లు', 'Help & Support': 'సహాయం మరియు మద్దతు', 'Logout': 'లాగ్‌అవుట్', 'Here is the latest update on your procurement journey.': 'మీ సేకరణ ప్రక్రియ తాజా నవీకరణ ఇక్కడ ఉంది.', 'Book a procurement slot': 'సేకరణ స్లాట్‌ను బుక్ చేయండి', 'Current application': 'ప్రస్తుత దరఖాస్తు', 'Registered land': 'నమోదైన భూమి', 'Last payment': 'చివరి చెల్లింపు', 'Procurement status': 'సేకరణ స్థితి', 'My profile': 'నా ప్రొఫైల్', 'Notifications': 'నోటిఫికేషన్‌లు', 'Need help?': 'సహాయం కావాలా?', 'Farmer profiles': 'రైతు ప్రొఫైల్‌లు', 'Weighing station': 'తూకం కేంద్రం', 'Inspection Queue': 'తనిఖీ క్యూ', 'Process Payment': 'చెల్లింపును ప్రాసెస్ చేయండి', 'Farmer Payments': 'రైతు చెల్లింపులు', 'Payment History': 'చెల్లింపు చరిత్ర', 'Pending / Failed': 'పెండింగ్ / విఫలమైనవి', 'Register Farmer': 'రైతును నమోదు చేయండి', 'Quantity procured, by crop': 'పంట వారీగా సేకరించిన పరిమాణం', 'Today’s queue': 'ఈరోజు క్యూ', "Today's queue": 'ఈరోజు క్యూ', 'Farmer details': 'రైతు వివరాలు', 'Procurement details': 'సేకరణ వివరాలు', 'Crop': 'పంట', 'Farmer ID': 'రైతు ID', 'Name': 'పేరు', 'Mobile': 'మొబైల్', 'Status': 'స్థితి', 'Quality result': 'నాణ్యత ఫలితం', 'Expected quantity': 'అంచనా పరిమాణం', 'Actual weight': 'వాస్తవ బరువు', 'Quality check': 'నాణ్యత తనిఖీ', 'Submit Quantity': 'పరిమాణాన్ని సమర్పించండి', 'Actual weight (quintals)': 'వాస్తవ బరువు (క్వింటాళ్లు)', 'Select language': 'భాషను ఎంచుకోండి'
    }
  };

  function translateNode(node, dict) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(textNode => {
      const value = textNode.nodeValue;
      const trimmed = value.trim();
      if (dict[trimmed]) textNode.nodeValue = value.replace(trimmed, dict[trimmed]);
    });
    node.querySelectorAll('input[placeholder], textarea[placeholder], [aria-label]').forEach(element => {
      ['placeholder', 'aria-label'].forEach(attribute => {
        if (element.hasAttribute(attribute) && dict[element.getAttribute(attribute)]) element.setAttribute(attribute, dict[element.getAttribute(attribute)]);
      });
    });
  }

  function applyLanguage(lang) {
    const selected = translations[lang] ? lang : 'en';
    document.documentElement.setAttribute('data-lang', selected);
    if (selected !== 'en') translateNode(document.body, translations[selected]);
    localStorage.setItem('sasyaLanguage', selected);
    const selector = document.getElementById('langSwitch');
    if (selector) selector.value = selected;
  }

  window.SasyaI18n = { applyLanguage };
  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('sasyaLanguage') || 'en';
    applyLanguage(saved);
    const selector = document.getElementById('langSwitch');
    if (selector) selector.addEventListener('change', event => applyLanguage(event.target.value));
    new MutationObserver(records => {
      const lang = document.documentElement.getAttribute('data-lang');
      if (translations[lang]) records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE) translateNode(node, translations[lang]); }));
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
