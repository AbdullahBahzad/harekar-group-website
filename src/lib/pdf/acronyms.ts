/**
 * The acronym glossary printed on every Daily Security Report's cover page.
 *
 * This is fixed reference material — the vocabulary of a security bulletin
 * covering Iraq and Kurdistan — not something that changes report to report,
 * so it lives here as static data rather than a database table an operator
 * could accidentally edit or delete mid-report.
 *
 * Laid out as three columns to match the printed template. The split is by
 * position (26/23/21 entries) rather than by any grouping, same as the
 * original.
 */

export type Acronym = { term: string; definition: string };

export const ACRONYM_COLUMNS: readonly Acronym[][] = [
  [
    { term: "AQIZAM", definition: "Al Qaida Associated Movements" },
    { term: "AO", definition: "Area of Operations" },
    { term: "APC", definition: "Armored Personnel Carrier" },
    { term: "APIED", definition: "Anti-Personnel IED" },
    { term: "AQ", definition: "Al-Qaeda" },
    { term: "AT", definition: "Anti-Tank" },
    { term: "ATGW", definition: "Anti Tank Guided Weapon" },
    { term: "AVIED", definition: "Anti-Vehicle IED" },
    { term: "BXP", definition: "Border Crossing Point" },
    { term: "BBIED", definition: "Body Borne IED" },
    { term: "CP", definition: "Check Point" },
    { term: "CLC", definition: "Concerned Local Citizens" },
    { term: "CPX", definition: "Complex Attack" },
    { term: "C-PERS", definition: "Captured Personnel" },
    { term: "CoP", definition: "Chief of Police" },
    { term: "CET", definition: "Convoy Escort Team" },
    { term: "DBS", definition: "Drive by Shooting" },
    { term: "DoD", definition: "Department of Defense" },
    { term: "DoS", definition: "Department of State" },
    { term: "ECP", definition: "Entry Control Point" },
    { term: "EOD", definition: "Explosive Ordinance Disposal" },
    { term: "EFP", definition: "Explosively-Formed Projectile" },
    { term: "FoM", definition: "Freedom of Movement" },
    { term: "GoI", definition: "Government of Iraq" },
  ],
  [
    { term: "HCN", definition: "Host Country National" },
    { term: "HG", definition: "Hand Grenade" },
    { term: "HME", definition: "Home Made Explosive" },
    { term: "HMG", definition: "Heavy Machine Gun" },
    { term: "HVT", definition: "High Value Target" },
    { term: "IDF", definition: "Indirect Fire" },
    { term: "IDP", definition: "Internally Displaced Persons" },
    { term: "IED", definition: "Improvised Explosive Device" },
    { term: "IOC", definition: "International Oil Company" },
    { term: "IRL", definition: "Improvised Rocket Launcher" },
    { term: "IS", definition: "Islamic State" },
    { term: "ISIS", definition: "Islamic State of Iraq and Syria" },
    { term: "IA", definition: "Iraqi Army" },
    { term: "ISF", definition: "Iraqi Security Forces" },
    { term: "ISIL", definition: "Islamic State Iraq and Levant" },
    { term: "KIA", definition: "Killed in Action" },
    { term: "MIA", definition: "Missing in Action" },
    { term: "MoD", definition: "Ministry of Defense" },
    { term: "MoI", definition: "Ministry of Interior" },
    { term: "MoO", definition: "Ministry of Oil" },
    { term: "MoT", definition: "Ministry of Transportation" },
    { term: "MSR", definition: "Main Supply Route" },
    { term: "NGO", definition: "Non-Governmental Organization" },
  ],
  [
    { term: "OCG", definition: "Organized Crime Group" },
    { term: "OPF", definition: "Oil Protection Force" },
    { term: "PBIED", definition: "Person-Borne Improvised Explosive Device" },
    { term: "PMF", definition: "Popular Mobilization Forces" },
    { term: "PoI", definition: "Point of Impact" },
    { term: "PoO", definition: "Point of Origin" },
    { term: "PSC", definition: "Private Security Company" },
    { term: "PSD", definition: "Private Security Detail" },
    { term: "PJAK", definition: "Party of Free Life in Kurdistan" },
    { term: "PKK", definition: "Kurdistan Workers Party" },
    { term: "RPG", definition: "Rocket Propelled Grenade" },
    { term: "RTA", definition: "Road Traffic Accident" },
    { term: "SAF", definition: "Small Arms Fire" },
    { term: "SAFIRE", definition: "Surface to Air Fire" },
    { term: "SF", definition: "Special Forces" },
    { term: "SVBIED", definition: "Suicide Vehicle Borne IED" },
    { term: "SVEST", definition: "Suicide Explosive Worn Vest" },
    { term: "TCP", definition: "Traffic Control Point" },
    { term: "UVIED", definition: "Under Vehicle IED" },
    { term: "VCP", definition: "Vehicle Checkpoint" },
  ],
];
