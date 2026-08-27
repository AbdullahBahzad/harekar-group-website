/**
 * Lets the console render with no database behind it.
 *
 * The admin surface is almost entirely database reads, so without Postgres
 * every station is a stack trace and the design cannot be reviewed at all.
 * This substitutes representative sample data instead — but *only* outside
 * production, and only when the query genuinely failed.
 *
 * The guard is deliberately strict. A console that invents plausible numbers
 * when its database is down is far more dangerous than one that errors: an
 * operator would read a fabricated national posture and believe it. In
 * production the original error is rethrown untouched.
 */
export const isPreviewEnvironment = process.env.NODE_ENV !== "production";

export type Previewed<T> = { data: T; preview: boolean };

export async function orPreview<T>(
  query: () => Promise<T>,
  sample: T,
): Promise<Previewed<T>> {
  try {
    return { data: await query(), preview: false };
  } catch (error) {
    if (!isPreviewEnvironment) throw error;
    console.warn("[console] database unreachable — rendering preview data");
    void error;
    return { data: sample, preview: true };
  }
}

/* ---- sample data --------------------------------------------------------- */

const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);

export const sampleMarkers = [
  {
    id: "p1", label: "Baghdad", longitude: 44.36, latitude: 33.31,
    severity: "ELEVATED" as const, access: "OPEN" as const,
    headline: "Checkpoint density increased across the eastern approaches.",
    body: "Movement through Karrada and the airport road remains viable with advance notice. Convoy timings should avoid the 06:00–08:00 window.",
    published: true, updatedAt: ago(0.2), updatedBy: { name: "Operations", email: null },
  },
  {
    id: "p2", label: "Basra", longitude: 47.78, latitude: 30.51,
    severity: "CLEAR" as const, access: "OPEN" as const,
    headline: "Port operations normal.",
    body: null, published: true, updatedAt: ago(1.4),
    updatedBy: { name: "Operations", email: null },
  },
  {
    id: "p3", label: "Mosul", longitude: 43.13, latitude: 36.34,
    severity: "ELEVATED" as const, access: "OPEN" as const,
    headline: "Reconstruction corridors periodically closed.",
    body: null, published: true, updatedAt: ago(2.1),
    updatedBy: { name: "Analyst", email: null },
  },
  {
    id: "p4", label: "Erbil", longitude: 44.01, latitude: 36.19,
    severity: "CLEAR" as const, access: "OPEN" as const,
    headline: "Routine posture maintained.",
    body: null, published: true, updatedAt: ago(3),
    updatedBy: { name: "Operations", email: null },
  },
  {
    id: "p5", label: "Kirkuk", longitude: 44.39, latitude: 35.47,
    severity: "CRITICAL" as const, access: "LOCKED" as const,
    headline: "Restricted assessment — subscriber access only.",
    body: "Full assessment withheld from the open picture.",
    published: true, updatedAt: ago(0.05),
    updatedBy: { name: "Operations", email: null },
  },
  {
    id: "p6", label: "Sulaymaniyah", longitude: 45.43, latitude: 35.56,
    severity: "CLEAR" as const, access: "OPEN" as const,
    headline: null, body: null,
    // Draft, so the console shows both states side by side.
    published: false, updatedAt: ago(0.4),
    updatedBy: { name: "Analyst", email: null },
  },
];

export const sampleMessages = [
  {
    id: "m1", name: "Layla Hassan", email: "l.hassan@example.com",
    organization: "Zagros Energy", phone: "+964 750 000 0000",
    message:
      "We are mobilising a survey team to two sites near Kirkuk next month and need static guarding plus armoured transfer between them. Could you quote for a 90-day deployment?",
    createdAt: ago(0.3),
  },
  {
    id: "m2", name: "Omar Faridun", email: "omar@example.com",
    organization: null, phone: null,
    message: "Do you provide K9 screening for private residences in Erbil?",
    createdAt: ago(1.2),
  },
  {
    id: "m3", name: "Sarah Duncan", email: "s.duncan@example.org",
    organization: "Meridian Aid", phone: "+964 751 111 1111",
    message:
      "Requesting a quote for medevac standby cover for a field clinic in Nineveh, six months, two vehicles.",
    createdAt: ago(4.6),
  },
];

export const sampleApplications = [
  {
    id: "a1", name: "Karwan Ahmed", email: "karwan@example.com",
    phone: "+964 770 222 2222", city: "Erbil", position: "Static Security Officer",
    coverLetter:
      "Eight years with a private security contractor covering fixed sites in the Kurdistan Region. Trained in access control and incident reporting. Available immediately.",
    cvName: "karwan-ahmed-cv.pdf", cvSize: 284_512, createdAt: ago(0.8),
  },
  {
    id: "a2", name: "Noor Al-Jubouri", email: "noor@example.com",
    phone: "+964 771 333 3333", city: "Baghdad", position: "Medevac Paramedic",
    coverLetter:
      "Registered paramedic with four years of pre-hospital trauma experience in Baghdad. Fluent Arabic and English.",
    cvName: "noor-cv.pdf", cvSize: 512_000, createdAt: ago(3.2),
  },
];

export const sampleUsers = [
  {
    id: "u1", name: "Abdullah Bahzad", email: "abdulla.amedii@gmail.com",
    isPro: true, isAdmin: true, proUntil: null, createdAt: ago(30),
    orders: [] as { amountMinor: number; currency: string }[],
  },
  {
    id: "u2", name: "Zagros Energy", email: "ops@zagros.example.com",
    isPro: false, isAdmin: false, proUntil: new Date(Date.now() + 21 * day),
    createdAt: ago(12), orders: [{ amountMinor: 250_000, currency: "USD" }],
  },
  {
    id: "u3", name: "Omar Faridun", email: "omar@example.com",
    isPro: false, isAdmin: false, proUntil: null, createdAt: ago(2),
    orders: [] as { amountMinor: number; currency: string }[],
  },
];

/**
 * Sample catalogue for the services station.
 *
 * Uses the real shipped WebP files as imagery, so the preview shows the actual
 * cards rather than grey placeholders — the photo is the thing being reviewed.
 */
export const sampleServices = [
  {
    id: "s1", slug: "facility", group: "protection",
    titleEn: "Facility Security Services",
    titleAr: "خدمات أمن المنشآت", titleKu: "خزمەتگوزاری ئاسایشی دامەزراوە",
    descriptionEn:
      "End-to-end protection programs for corporate, industrial, and institutional sites.",
    descriptionAr: null, descriptionKu: null,
    icon: "facility", hasUpload: false,
    imageUrl: "/services/facility.webp",
    published: true, sortOrder: 0,
  },
  {
    id: "s2", slug: "static", group: "protection",
    titleEn: "Static Security Services",
    titleAr: null, titleKu: null,
    descriptionEn:
      "Vetted, uniformed guarding at fixed posts, with defined escalation procedures.",
    descriptionAr: null, descriptionKu: null,
    icon: "static", hasUpload: false,
    imageUrl: "/services/static.webp",
    published: true, sortOrder: 1,
  },
  {
    id: "s3", slug: "k9", group: "protection",
    titleEn: "K9 Security Dog Units",
    titleAr: null, titleKu: null,
    descriptionEn: "Handler-led detection and patrol teams.",
    descriptionAr: null, descriptionKu: null,
    icon: "k9", hasUpload: false,
    imageUrl: "/services/k9.webp",
    published: true, sortOrder: 2,
  },
  {
    id: "s4", slug: "medevac", group: "response",
    titleEn: "Medical Evacuation",
    titleAr: null, titleKu: null,
    descriptionEn: "Standby and on-call casualty evacuation.",
    descriptionAr: null, descriptionKu: null,
    icon: "medevac", hasUpload: false,
    imageUrl: "/services/medevac.webp",
    // Hidden, so the console shows both states.
    published: false, sortOrder: 3,
  },
];

/** Sample catalogue for the reports station. */
export const sampleReports = [
  {
    id: "r1", date: ago(0), kurdistanThreat: "MODERATE" as const, iraqThreat: "HIGH" as const,
    politicalKurdistan: "Stable", politicalIraq: "Acceptable", weather: null,
    content: {
      items: [
        {
          title: "KDP, PUK leaders to meet amid KRI government talks.",
          body: "The two parties are preparing for a high-level meeting as negotiations over forming the Kurdistan Region's new government move closer to an agreement.",
          url: "https://www.shafaq.com/en/Kurdistan/KDP-PUK-leaders-to-meet-amid-KRI-government-talks",
          region: "KURDISTAN" as const,
        },
        {
          title: "Fuel-smuggling network busted in Iraq's Al-Muthanna.",
          body: "Iraq's National Security Service arrested several suspects as part of a network allegedly involved in smuggling petroleum products.",
          url: "https://www.shafaq.com/en/Security/Fuel-smuggling-network-busted-in-Iraq-s-Al-Muthanna",
          region: "IRAQ" as const,
        },
      ],
    },
    createdAt: ago(0), createdBy: { name: "Analyst", email: null },
  },
  {
    id: "r2", date: ago(1), kurdistanThreat: "MODERATE" as const, iraqThreat: "HIGH" as const,
    politicalKurdistan: "Stable", politicalIraq: "Acceptable", weather: "Clear, 38°C",
    content: {
      items: [
        {
          title: "Erbil security forces arrest suspect in Green Belt shooting.",
          body: "Asayish arrested a suspect after three workers were wounded in a shooting at the city's Green Belt project in the Baharka district.",
          url: "https://www.shafaq.com/en/Kurdistan/Erbil-security-forces-arrest-suspect-in-Green-Belt-shooting",
          region: "KURDISTAN" as const,
        },
      ],
    },
    createdAt: ago(1), createdBy: { name: "Operations", email: null },
  },
];

/** Sample row for the site content station — mirrors the shipped copy. */
export const sampleSiteContent = {
  id: "site",
  heroEyebrowEn: "Security & Operational Services", heroEyebrowAr: null, heroEyebrowKu: null,
  heroTitleEn: "Protection built on discipline.", heroTitleAr: null, heroTitleKu: null,
  heroSubtitleEn: "Harekar Group delivers security, emergency response, and operational support for organizations that cannot afford uncertainty.", heroSubtitleAr: null, heroSubtitleKu: null,

  aboutEyebrowEn: "About Us", aboutEyebrowAr: null, aboutEyebrowKu: null,
  aboutTitleEn: "Unparalleled security across the Kurdistan Region.", aboutTitleAr: null, aboutTitleKu: null,
  aboutBody1En: "At Harekar Group, we provide unparalleled security solutions throughout the Kurdistan Region of Iraq (KRI). Our extensive expertise covers a comprehensive range of security domains, including static security, mobile security, K9 units, armored vehicles and more. We are relentlessly dedicated to ensuring the absolute safety and security of our clients through cutting-edge, dependable solutions.", aboutBody1Ar: null, aboutBody1Ku: null,
  aboutBody2En: "Our security services are backed by rigorous training, advanced technology and a proactive approach to threat management. We anticipate risks before they become threats, ensuring our clients can operate with complete peace of mind.", aboutBody2Ar: null, aboutBody2Ku: null,
  aboutBody3En: "In addition to our security services, we excel in civil works, offering specialized knowledge in construction and infrastructure development. Our projects are characterized by quality and adherence to the highest standards, ensuring successful outcomes.", aboutBody3Ar: null, aboutBody3Ku: null,

  missionTitleEn: "Mission", missionTitleAr: null, missionTitleKu: null,
  missionBodyEn: "Our mission is to safeguard lives, assets and infrastructure with unwavering dedication and accountability. We view security challenges as opportunities for innovation and advancement, setting new standards in industry. By consistently delivering value and quality, we aim to become a symbol of reliability and excellence in security services, civil work, fuel transport and other scopes of work.", missionBodyAr: null, missionBodyKu: null,

  visionTitleEn: "Vision", visionTitleAr: null, visionTitleKu: null,
  visionBodyEn: "At Harekar Group, our vision is to lead the security industry with integrity and innovative methods. We envision a future where advanced technology and human expertise blend seamlessly to provide top-notch security solutions. Our goal is to be recognized for our excellence in security, construction and fuel logistics, ensuring the safety and success of our clients.", visionBodyAr: null, visionBodyKu: null,

  statExperienceValue: "15+", statExperienceLabelEn: "Years operating", statExperienceLabelAr: null, statExperienceLabelKu: null,
  statPersonnelValue: "800+", statPersonnelLabelEn: "Vetted personnel", statPersonnelLabelAr: null, statPersonnelLabelKu: null,
  statSitesValue: "120+", statSitesLabelEn: "Sites protected", statSitesLabelAr: null, statSitesLabelKu: null,
  statCoverageValue: "24/7", statCoverageLabelEn: "Operations centre", statCoverageLabelAr: null, statCoverageLabelKu: null,

  footerTaglineEn: "Security and operational services.", footerTaglineAr: null, footerTaglineKu: null,

  faqEyebrowEn: "Frequently Asked Questions", faqEyebrowAr: null, faqEyebrowKu: null,
  faqTitleEn: "Answers, before you ask.", faqTitleAr: null, faqTitleKu: null,
  faqSubtitleEn: "The questions we hear most, answered plainly.", faqSubtitleAr: null, faqSubtitleKu: null,
  faqCtaTitleEn: "Still have a question?", faqCtaTitleAr: null, faqCtaTitleKu: null,
  faqCtaBodyEn: "Tell us what you need to protect and a member of our team will respond directly.", faqCtaBodyAr: null, faqCtaBodyKu: null,

  contactEyebrowEn: "Start a conversation", contactEyebrowAr: null, contactEyebrowKu: null,
  contactTitleEn: "Request a quote.", contactTitleAr: null, contactTitleKu: null,
  contactSubtitleEn: "Tell us what you need protected and where. Our team will follow up within one business day.", contactSubtitleAr: null, contactSubtitleKu: null,

  careersEyebrowEn: "Open applications", careersEyebrowAr: null, careersEyebrowKu: null,
  careersTitleEn: "Apply for jobs", careersTitleAr: null, careersTitleKu: null,

  proEyebrowEn: "Pro", proEyebrowAr: null, proEyebrowKu: null,
  proTitleEn: "Pro intelligence access", proTitleAr: null, proTitleKu: null,
  proSubtitleEn: "Unlock the restricted assessments behind every locked marker on the map.", proSubtitleAr: null, proSubtitleKu: null,

  planMonthlyNameEn: "Monthly", planMonthlyNameAr: null, planMonthlyNameKu: null,
  planMonthlyPeriodEn: "/ month", planMonthlyPeriodAr: null, planMonthlyPeriodKu: null,
  planMonthlyBlurbEn: "Full access to restricted reports, billed each month.", planMonthlyBlurbAr: null, planMonthlyBlurbKu: null,
  planYearlyNameEn: "Yearly", planYearlyNameAr: null, planYearlyNameKu: null,
  planYearlyPeriodEn: "/ year", planYearlyPeriodAr: null, planYearlyPeriodKu: null,
  planYearlyBlurbEn: "Full access for twelve months — two months free against monthly.", planYearlyBlurbAr: null, planYearlyBlurbKu: null,

  updatedAt: ago(2),
};

/** Sample rows for the FAQ station — the six questions the site shipped with. */
export const sampleFaqItems = [
  {
    id: "f1", questionEn: "What types of security services do you offer?", questionAr: null, questionKu: null,
    answerEn: "We offer a comprehensive range of security services, including:", answerAr: null, answerKu: null,
    listEn: [
      "Facility security", "Static security", "Access control & surveillance", "Mobile security operations",
      "K9 security dog units", "Emergency response planning", "Crisis management", "Medical evacuation",
      "Cash in transit", "Armored vehicle deployments", "Construction & camp security design",
      "Fuel & water supply and transport", "Heavy equipment rental",
    ],
    listAr: null, listKu: null,
    published: true, sortOrder: 0,
  },
  {
    id: "f2", questionEn: "What are your operating hours?", questionAr: null, questionKu: null,
    answerEn: "Our operations centre runs 24 hours a day, seven days a week.", answerAr: null, answerKu: null,
    listEn: null, listAr: null, listKu: null,
    published: true, sortOrder: 1,
  },
  {
    id: "f3", questionEn: "How quickly can you respond?", questionAr: null, questionKu: null,
    answerEn: "Response times depend on the service and location, and are agreed with each client during onboarding.", answerAr: null, answerKu: null,
    listEn: null, listAr: null, listKu: null,
    published: true, sortOrder: 2,
  },
  {
    id: "f4", questionEn: "Are you licensed?", questionAr: null, questionKu: null,
    answerEn: "Yes — Harekar Group operates under the licences required by the Kurdistan Region of Iraq.", answerAr: null, answerKu: null,
    listEn: null, listAr: null, listKu: null,
    published: true, sortOrder: 3,
  },
  {
    id: "f5", questionEn: "How are personnel vetted?", questionAr: null, questionKu: null,
    answerEn: "Every operator goes through background checks and rigorous training before deployment.", answerAr: null, answerKu: null,
    listEn: null, listAr: null, listKu: null,
    published: true, sortOrder: 4,
  },
  {
    id: "f6", questionEn: "Do you handle specialized requests?", questionAr: null, questionKu: null,
    answerEn: "Yes — contact our team to discuss a scope that isn't listed above.", answerAr: null, answerKu: null,
    listEn: null, listAr: null, listKu: null,
    published: true, sortOrder: 5,
  },
];

/** Sample rows for the career benefits station — the five cards the site shipped with. */
export const sampleCareerBenefits = [
  { id: "b1", titleEn: "Environment", titleAr: null, titleKu: null, bodyEn: "A disciplined, safety-first culture.", bodyAr: null, bodyKu: null, published: true, sortOrder: 0 },
  { id: "b2", titleEn: "Development", titleAr: null, titleKu: null, bodyEn: "Ongoing training and clear paths to advance.", bodyAr: null, bodyKu: null, published: true, sortOrder: 1 },
  { id: "b3", titleEn: "Collaboration", titleAr: null, titleKu: null, bodyEn: "Teams that rely on each other and deliver together.", bodyAr: null, bodyKu: null, published: true, sortOrder: 2 },
  { id: "b4", titleEn: "Projects", titleAr: null, titleKu: null, bodyEn: "Meaningful work across security, construction and logistics.", bodyAr: null, bodyKu: null, published: true, sortOrder: 3 },
  { id: "b5", titleEn: "Excellence", titleAr: null, titleKu: null, bodyEn: "A standard the whole company is held to.", bodyAr: null, bodyKu: null, published: true, sortOrder: 4 },
];

/** Sample rows for the clients station — a handful across each category. */
export const sampleClients = [
  { id: "c1", name: "Example NGO", category: "ngos", hasUpload: false, imageUrl: "/harekar-mark.png", w: 30.6, cx: 50, cy: 49.5, published: true, sortOrder: 0 },
  { id: "c2", name: null, category: "ngos", hasUpload: false, imageUrl: "/harekar-mark.png", w: 44.6, cx: 50, cy: 52.1, published: true, sortOrder: 1 },
  { id: "c3", name: "Example Energy Co.", category: "energy", hasUpload: false, imageUrl: "/harekar-mark.png", w: 53.3, cx: 51.6, cy: 50, published: true, sortOrder: 2 },
  { id: "c4", name: null, category: "consulates", hasUpload: false, imageUrl: "/harekar-mark.png", w: 30.8, cx: 50.1, cy: 50, published: true, sortOrder: 3 },
  { id: "c5", name: "Example Local Co.", category: "locals", hasUpload: false, imageUrl: "/harekar-mark.png", w: 35.6, cx: 51.7, cy: 51, published: false, sortOrder: 4 },
];
