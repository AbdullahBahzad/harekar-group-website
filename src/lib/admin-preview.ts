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
