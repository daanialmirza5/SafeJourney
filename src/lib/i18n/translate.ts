/**
 * Localization (spec section 27). Rather than an abstract-key dictionary
 * (which would require touching every component up front), this retrofits
 * translation onto the existing English strings at their exact display
 * sites: `translate(lang, "Some English string")` returns the Hindi/
 * Marathi string for that exact English text, or the English text
 * unchanged if `lang` is "en" or no translation is registered yet.
 *
 * Coverage is deliberately concentrated on the patient/caregiver-facing
 * surfaces (nav, "My Journey", the journey checklist and next-action
 * copy) -- the surfaces spec section 27 actually cares about ("patient and
 * caregiver friendly... multilingual-ready"), not exhaustively across
 * every provider-facing microcopy string. See docs/15_LIMITATIONS.md.
 *
 * Extending coverage: add more `[english]: translated` entries below. No
 * component changes are needed elsewhere -- just wrap the new string with
 * `translate(lang, "...")` at its display site.
 */

export type SupportedLanguage = "en" | "hi" | "mr";

type Dictionary = Record<string, string>;

const HI: Dictionary = {
  // Nav
  Dashboard: "डैशबोर्ड",
  Referrals: "रेफरल",
  "Incoming referrals": "आने वाले रेफरल",
  "Scan passport": "पासपोर्ट स्कैन करें",
  "My Journey": "मेरी यात्रा",
  "Linked cases": "जुड़े हुए मामले",
  "Follow-up": "फॉलो-अप",
  Notifications: "सूचनाएं",
  Analytics: "विश्लेषण",
  "Admin panel": "एडमिन पैनल",
  Settings: "सेटिंग्स",

  // Role labels
  Doctor: "डॉक्टर",
  "Receiving Coordinator": "प्राप्तकर्ता समन्वयक",
  Patient: "मरीज़",
  Caregiver: "देखभालकर्ता",
  "Follow-up Worker": "फॉलो-अप कार्यकर्ता",
  Administrator: "प्रशासक",

  // Patient dashboard / journey
  "Your referral, in plain language.": "आपका रेफरल, सरल भाषा में।",
  "No referral yet": "अभी तक कोई रेफरल नहीं",
  "When your doctor creates a referral for you, it will appear here with your next steps.":
    "जब आपका डॉक्टर आपके लिए रेफरल बनाएगा, तो यह यहां आपके अगले कदमों के साथ दिखाई देगा।",
  "View full details, documents & Referral Passport": "पूरी जानकारी, दस्तावेज़ और रेफरल पासपोर्ट देखें",
  "What happens next?": "आगे क्या होगा?",
  "Doctor referral created": "डॉक्टर द्वारा रेफरल बनाया गया",
  "Hospital accepted": "अस्पताल ने स्वीकार किया",
  "Transport assigned": "परिवहन नियुक्त किया गया",
  "In transit": "मार्ग में",
  "Arrival confirmed": "आगमन की पुष्टि हुई",
  Discharged: "छुट्टी दी गई",
  "Follow-up complete": "फॉलो-अप पूर्ण",

  // Next-action messages
  "Waiting for the receiving facility to accept your referral.":
    "आपके रेफरल को स्वीकार करने के लिए प्राप्तकर्ता सुविधा की प्रतीक्षा है।",
  "Your referral is taking longer than expected to be acknowledged. Your care team has been notified.":
    "आपके रेफरल को स्वीकार होने में सामान्य से अधिक समय लग रहा है। आपकी देखभाल टीम को सूचित कर दिया गया है।",
  "Your referral was accepted. Transport is being arranged.":
    "आपका रेफरल स्वीकार कर लिया गया है। परिवहन की व्यवस्था की जा रही है।",
  "Your referral was accepted. Please make your way to the receiving facility with your documents.":
    "आपका रेफरल स्वीकार कर लिया गया है। कृपया अपने दस्तावेज़ों के साथ प्राप्तकर्ता सुविधा तक जाएं।",
  "Transport has been requested and is being assigned.": "परिवहन का अनुरोध किया गया है और इसे नियुक्त किया जा रहा है।",
  "Transport has been assigned. Please keep your documents ready.":
    "परिवहन नियुक्त कर दिया गया है। कृपया अपने दस्तावेज़ तैयार रखें।",
  "You are on the way. Show your Referral Passport QR code at the receiving facility.":
    "आप रास्ते में हैं। प्राप्तकर्ता सुविधा पर अपना रेफरल पासपोर्ट क्यूआर कोड दिखाएं।",
  "You have arrived and are under the receiving facility's care.":
    "आप पहुंच चुके हैं और प्राप्तकर्ता सुविधा की देखभाल में हैं।",
  "Discharge is complete. A back-referral is being prepared to hand your care back.":
    "छुट्टी पूरी हो गई है। आपकी देखभाल वापस सौंपने के लिए बैक-रेफरल तैयार किया जा रहा है।",
  "A follow-up worker will reach out to complete your handoff.":
    "एक फॉलो-अप कार्यकर्ता आपकी हैंडऑफ पूरी करने के लिए संपर्क करेगा।",
  "Your referral journey is complete.": "आपकी रेफरल यात्रा पूर्ण हो गई है।",
  "This referral was cancelled. Please speak with your doctor about next steps.":
    "यह रेफरल रद्द कर दिया गया था। कृपया अगले कदमों के बारे में अपने डॉक्टर से बात करें।",
  "Don't let a referral end with a piece of paper.": "रेफरल को कागज़ के एक टुकड़े पर खत्म न होने दें।",
  "Emergency helpline": "आपातकालीन हेल्पलाइन",
  "Maternal health record": "मातृ स्वास्थ्य रिकॉर्ड",
  "Postpartum care": "प्रसवोत्तर देखभाल",
  "Immunization reminder": "टीकाकरण अनुस्मारक",
};

const MR: Dictionary = {
  // Nav
  Dashboard: "डॅशबोर्ड",
  Referrals: "रेफरल्स",
  "Incoming referrals": "येणारे रेफरल्स",
  "Scan passport": "पासपोर्ट स्कॅन करा",
  "My Journey": "माझा प्रवास",
  "Linked cases": "जोडलेली प्रकरणे",
  "Follow-up": "फॉलो-अप",
  Notifications: "सूचना",
  Analytics: "विश्लेषण",
  "Admin panel": "प्रशासन पॅनेल",
  Settings: "सेटिंग्ज",

  // Role labels
  Doctor: "डॉक्टर",
  "Receiving Coordinator": "प्राप्तकर्ता समन्वयक",
  Patient: "रुग्ण",
  Caregiver: "काळजीवाहक",
  "Follow-up Worker": "फॉलो-अप कार्यकर्ता",
  Administrator: "प्रशासक",

  // Patient dashboard / journey
  "Your referral, in plain language.": "तुमचा रेफरल, सोप्या भाषेत.",
  "No referral yet": "अद्याप कोणताही रेफरल नाही",
  "When your doctor creates a referral for you, it will appear here with your next steps.":
    "जेव्हा तुमचे डॉक्टर तुमच्यासाठी रेफरल तयार करतील, तेव्हा ते इथे तुमच्या पुढील पावलांसह दिसेल.",
  "View full details, documents & Referral Passport": "संपूर्ण तपशील, कागदपत्रे आणि रेफरल पासपोर्ट पहा",
  "What happens next?": "पुढे काय होणार?",
  "Doctor referral created": "डॉक्टरांनी रेफरल तयार केले",
  "Hospital accepted": "रुग्णालयाने स्वीकारले",
  "Transport assigned": "वाहतूक नियुक्त केली",
  "In transit": "मार्गावर",
  "Arrival confirmed": "आगमनाची पुष्टी झाली",
  Discharged: "डिस्चार्ज केले",
  "Follow-up complete": "फॉलो-अप पूर्ण",

  // Next-action messages
  "Waiting for the receiving facility to accept your referral.":
    "तुमचा रेफरल स्वीकारण्यासाठी प्राप्तकर्ता सुविधेची वाट पाहत आहोत.",
  "Your referral is taking longer than expected to be acknowledged. Your care team has been notified.":
    "तुमचा रेफरल स्वीकारण्यास अपेक्षेपेक्षा जास्त वेळ लागत आहे. तुमच्या काळजी टीमला कळवण्यात आले आहे.",
  "Your referral was accepted. Transport is being arranged.": "तुमचा रेफरल स्वीकारला गेला आहे. वाहतुकीची व्यवस्था केली जात आहे.",
  "Your referral was accepted. Please make your way to the receiving facility with your documents.":
    "तुमचा रेफरल स्वीकारला गेला आहे. कृपया तुमच्या कागदपत्रांसह प्राप्तकर्ता सुविधेकडे जा.",
  "Transport has been requested and is being assigned.": "वाहतुकीची विनंती केली गेली आहे आणि ती नियुक्त केली जात आहे.",
  "Transport has been assigned. Please keep your documents ready.":
    "वाहतूक नियुक्त केली गेली आहे. कृपया तुमची कागदपत्रे तयार ठेवा.",
  "You are on the way. Show your Referral Passport QR code at the receiving facility.":
    "तुम्ही मार्गावर आहात. प्राप्तकर्ता सुविधेवर तुमचा रेफरल पासपोर्ट क्यूआर कोड दाखवा.",
  "You have arrived and are under the receiving facility's care.": "तुम्ही पोहोचला आहात आणि प्राप्तकर्ता सुविधेच्या काळजीत आहात.",
  "Discharge is complete. A back-referral is being prepared to hand your care back.":
    "डिस्चार्ज पूर्ण झाला आहे. तुमची काळजी परत सोपवण्यासाठी बॅक-रेफरल तयार केला जात आहे.",
  "A follow-up worker will reach out to complete your handoff.": "एक फॉलो-अप कार्यकर्ता तुमचे हँडऑफ पूर्ण करण्यासाठी संपर्क साधेल.",
  "Your referral journey is complete.": "तुमचा रेफरल प्रवास पूर्ण झाला आहे.",
  "This referral was cancelled. Please speak with your doctor about next steps.":
    "हा रेफरल रद्द करण्यात आला होता. कृपया पुढील पावलांबद्दल तुमच्या डॉक्टरांशी बोला.",
  "Your care team is coordinating the next step.": "तुमची काळजी टीम पुढील पाऊल समन्वयित करत आहे.",

  "Don't let a referral end with a piece of paper.": "रेफरलला कागदाच्या तुकड्यावर संपू देऊ नका.",
  "Emergency helpline": "आपत्कालीन हेल्पलाइन",
  "Maternal health record": "मातृ आरोग्य नोंद",
  "Postpartum care": "प्रसूतीनंतरची काळजी",
  "Immunization reminder": "लसीकरण स्मरणपत्र",
};

const DICTIONARIES: Record<SupportedLanguage, Dictionary> = { en: {}, hi: HI, mr: MR };

export function translate(lang: string, text: string): string {
  const dict = DICTIONARIES[lang as SupportedLanguage];
  return dict?.[text] ?? text;
}
