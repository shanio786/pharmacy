// Bulk Pakistani medicines generator.
// Combines top Pakistani manufacturers x real brand names x strengths x forms
// to produce 20,000+ realistic medicine entries.

import * as schema from "@workspace/db";
import type { db as DbType } from "./db.js";

type Variant = {
  strength: string;
  form: string;
  unitsPerPack: number;
  packLabel: string;
};

type GenericDef = {
  generic: string;
  category: string;
  rack: string;
  isControlled?: boolean;
  variants: Variant[];
  brands: string[];
};

const MANUFACTURERS: Array<{ name: string; code: string }> = [
  { name: "GSK Pakistan", code: "GSK" },
  { name: "Searle Pakistan", code: "SRL" },
  { name: "Getz Pharma", code: "GTZ" },
  { name: "Hilton Pharma", code: "HLT" },
  { name: "Sami Pharmaceuticals", code: "SMI" },
  { name: "Abbott Pakistan", code: "ABT" },
  { name: "Pfizer Pakistan", code: "PFZ" },
  { name: "Novartis Pakistan", code: "NVS" },
  { name: "Reckitt Pakistan", code: "RKT" },
  { name: "OBS Pakistan", code: "OBS" },
  { name: "Ferozsons Laboratories", code: "FRZ" },
  { name: "AGP Limited", code: "AGP" },
  { name: "Highnoon Laboratories", code: "HNL" },
  { name: "Pharmevo", code: "PHE" },
  { name: "Atco Laboratories", code: "ATC" },
  { name: "Bosch Pharmaceuticals", code: "BSH" },
  { name: "Martin Dow", code: "MTD" },
  { name: "Pacific Pharmaceuticals", code: "PCF" },
  { name: "Wilshire Laboratories", code: "WLS" },
  { name: "Macter International", code: "MCT" },
  { name: "Indus Pharma", code: "IDP" },
  { name: "Schazoo Zaka", code: "SCZ" },
  { name: "Tabros Pharma", code: "TBR" },
  { name: "Adamjee Pharmaceuticals", code: "ADJ" },
  { name: "Friends Pharma", code: "FRP" },
  { name: "Saffron Pharmaceuticals", code: "SAF" },
  { name: "Hudson Pharma", code: "HUD" },
  { name: "Brookes Pharma", code: "BRK" },
  { name: "Don Valley Pharma", code: "DVP" },
  { name: "Genix Pharma", code: "GNX" },
  { name: "ICI Pakistan", code: "ICI" },
  { name: "Hovid Pharma", code: "HVD" },
  { name: "Helix Pharma", code: "HLX" },
  { name: "Mass Pharma", code: "MSP" },
  { name: "NovaMed Pharmaceuticals", code: "NMD" },
  { name: "Werrick Pharmaceuticals", code: "WRK" },
  { name: "Maple Pharmaceuticals", code: "MPL" },
  { name: "Neo-Pharma", code: "NEO" },
  { name: "CCL Pharmaceuticals", code: "CCL" },
  { name: "Continental Pharmaceuticals", code: "CNT" },
  { name: "Wilson's Pharmaceuticals", code: "WSN" },
  { name: "Nabiqasim Industries", code: "NQI" },
  { name: "Polyfine ChemPharma", code: "PFC" },
  { name: "Standpharm Pakistan", code: "STD" },
  { name: "Saydon Pharmaceuticals", code: "SYD" },
  { name: "Vega Pharmaceuticals", code: "VEG" },
  { name: "Maxitech Pharmaceuticals", code: "MXT" },
  { name: "Genome Pharmaceuticals", code: "GNM" },
  { name: "Caraway Pharmaceuticals", code: "CRW" },
  { name: "Global Pharmaceuticals", code: "GLB" },
  { name: "Star Laboratories", code: "STR" },
  { name: "Bryon Pharmaceuticals", code: "BRY" },
  { name: "Asian Continental Pharma", code: "ACP" },
  { name: "Crescent Pharmaceutical", code: "CSP" },
  { name: "Paramount Pharmaceuticals", code: "PRM" },
  { name: "Genesis Pharmaceuticals", code: "GNS" },
  { name: "Pulse Pharmaceuticals", code: "PLS" },
  { name: "Hansel Pharmaceuticals", code: "HNS" },
  { name: "Chiesi Pakistan", code: "CHS" },
  { name: "Hatim Pharmaceuticals", code: "HTM" },
  { name: "Fynk Pharmaceutical", code: "FNK" },
  { name: "Ray Pharma", code: "RAY" },
  { name: "Nimrall Labs", code: "NML" },
  { name: "Roomi Enterprises", code: "RMI" },
  { name: "Maple Leaf Pharma", code: "MLP" },
  { name: "Pharmagen", code: "PMG" },
  { name: "Schazoo Pharmaceuticals", code: "SHZ" },
  { name: "ZAFA Pharmaceuticals", code: "ZAF" },
  { name: "Hiranis Pharmaceuticals", code: "HRN" },
  { name: "Genix Healthcare", code: "GNH" },
  { name: "Maxwell Pharma", code: "MXW" },
  { name: "Werrick Healthcare", code: "WRH" },
  { name: "Biogenics", code: "BGN" },
  { name: "Citi Pharma", code: "CTP" },
  { name: "Wimits Pharmaceuticals", code: "WMT" },
  { name: "PharmEvo Healthcare", code: "PEH" },
  { name: "Tagma Pakistan", code: "TGM" },
  { name: "Silver Crescent Lab", code: "SCL" },
  { name: "Rotex Medica Pakistan", code: "RTX" },
  { name: "Sante Pharma", code: "SNT" },
  { name: "Asia Pharma", code: "ASA" },
];

// Common form definitions with default pack sizes
const FORM_TABLET = (strength: string, packSize = 10): Variant => ({
  strength, form: "Tablet", unitsPerPack: packSize, packLabel: `Strip of ${packSize}`,
});
const FORM_CAPSULE = (strength: string, packSize = 10): Variant => ({
  strength, form: "Capsule", unitsPerPack: packSize, packLabel: `Strip of ${packSize}`,
});
const FORM_SYRUP = (strength: string, mL = 60): Variant => ({
  strength, form: "Syrup (mL)", unitsPerPack: mL, packLabel: `${mL}mL Bottle`,
});
const FORM_SUSP = (strength: string, mL = 60): Variant => ({
  strength, form: "Syrup (mL)", unitsPerPack: mL, packLabel: `${mL}mL Suspension`,
});
const FORM_INJ = (strength: string, mL = 1): Variant => ({
  strength, form: "Injection (mL)", unitsPerPack: mL, packLabel: `${mL}mL Vial`,
});
const FORM_DROPS = (strength: string, mL = 10): Variant => ({
  strength, form: "Drops", unitsPerPack: mL, packLabel: `${mL}mL Drops`,
});
const FORM_CREAM = (strength: string, g = 15): Variant => ({
  strength, form: "Cream (g)", unitsPerPack: g, packLabel: `${g}g Tube`,
});
const FORM_INHALER = (strength: string, puffs = 200): Variant => ({
  strength, form: "Inhaler (puff)", unitsPerPack: puffs, packLabel: `${puffs} puffs`,
});
const FORM_SACHET = (strength: string): Variant => ({
  strength, form: "Sachet", unitsPerPack: 1, packLabel: "Single Sachet",
});
const FORM_SUPP = (strength: string, count = 6): Variant => ({
  strength, form: "Suppository", unitsPerPack: count, packLabel: `Box of ${count}`,
});

// Generic definitions: each maps to category, rack, common variants and brand-name pool.
// Brand pool = real top Pakistani brands + generated variations.
const GENERICS: GenericDef[] = [
  {
    generic: "Paracetamol", category: "Analgesics", rack: "A1",
    variants: [
      FORM_TABLET("500mg", 10), FORM_TABLET("500mg", 20), FORM_TABLET("650mg", 10),
      FORM_TABLET("1g", 8), FORM_SYRUP("120mg/5mL", 60), FORM_SYRUP("120mg/5mL", 90),
      FORM_SYRUP("250mg/5mL", 90), FORM_DROPS("100mg/mL", 15), FORM_SUPP("125mg", 6),
      FORM_SUPP("250mg", 6), FORM_INJ("150mg/mL", 2),
    ],
    brands: ["Panadol", "Calpol", "Disprol", "Tylex", "Paracip", "Pyrigesic", "Pyronol",
      "Provas", "Acetal", "Febrol", "Painex", "Paracin", "Pyramol", "Tempra", "Adol",
      "Crocin", "Pacimol", "Pyremol"],
  },
  {
    generic: "Ibuprofen", category: "Analgesics", rack: "A1",
    variants: [
      FORM_TABLET("200mg", 20), FORM_TABLET("400mg", 20), FORM_TABLET("600mg", 10),
      FORM_SYRUP("100mg/5mL", 60), FORM_SYRUP("100mg/5mL", 90), FORM_DROPS("40mg/mL", 15),
    ],
    brands: ["Brufen", "Inflam", "Profen", "Ibumax", "Ibex", "Rofen", "Dolofen",
      "Junifen", "Algofen", "Megafen", "Ibupain", "Ibupro", "Ibrol", "Ibulgan"],
  },
  {
    generic: "Aspirin", category: "Analgesics", rack: "A1",
    variants: [
      FORM_TABLET("75mg", 30), FORM_TABLET("150mg", 30), FORM_TABLET("300mg", 24),
      FORM_TABLET("325mg", 30),
    ],
    brands: ["Disprin", "Loprin", "Ascard", "Aspirin-EC", "Cardisprin", "Asprol",
      "Ecosprin", "Aspilet", "Acard", "Aspee", "Lopirin"],
  },
  {
    generic: "Diclofenac Sodium", category: "Analgesics", rack: "A1",
    variants: [
      FORM_TABLET("25mg", 20), FORM_TABLET("50mg", 20), FORM_TABLET("75mg SR", 10),
      FORM_TABLET("100mg SR", 10), FORM_INJ("75mg/3mL", 3), FORM_SUPP("100mg", 5),
      FORM_CREAM("1%", 30), FORM_DROPS("0.1% Eye", 5),
    ],
    brands: ["Voltral", "Voltaren", "Dyclo", "Dicloran", "Diclomax", "Diclofen",
      "Reactin", "Dynapar", "Olfen", "Artifen", "Diclosaid", "Diclofar", "Catafast"],
  },
  {
    generic: "Mefenamic Acid", category: "Analgesics", rack: "A1",
    variants: [
      FORM_CAPSULE("250mg", 10), FORM_CAPSULE("500mg", 10), FORM_TABLET("500mg", 10),
      FORM_SYRUP("50mg/5mL", 60),
    ],
    brands: ["Ponstan", "Mefenix", "Megafen", "Pontan", "Mefen", "Apex", "Painol",
      "Mefac", "Mefenor", "Dolfenal"],
  },
  {
    generic: "Naproxen Sodium", category: "Analgesics", rack: "A1",
    variants: [
      FORM_TABLET("250mg", 10), FORM_TABLET("500mg", 10), FORM_TABLET("550mg", 10),
    ],
    brands: ["Synflex", "Naprosyn", "Naprex", "Naprid", "Naproxin", "Provil"],
  },
  {
    generic: "Tramadol HCl", category: "Controlled", rack: "B2", isControlled: true,
    variants: [
      FORM_CAPSULE("50mg", 10), FORM_TABLET("100mg SR", 10), FORM_INJ("100mg/2mL", 2),
      FORM_SYRUP("100mg/mL", 10),
    ],
    brands: ["Tramol", "Tramadex", "Ultram", "Tramal", "Triject", "Toplab", "Tramaket"],
  },
  {
    generic: "Ketorolac", category: "Analgesics", rack: "A1",
    variants: [
      FORM_TABLET("10mg", 10), FORM_INJ("30mg/mL", 1), FORM_DROPS("0.5% Eye", 5),
    ],
    brands: ["Toradol", "Ketrol", "Ketolac", "Trovas", "Acular", "Ketovial"],
  },
  {
    generic: "Amoxicillin", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_CAPSULE("250mg", 10), FORM_CAPSULE("500mg", 6), FORM_CAPSULE("500mg", 10),
      FORM_SYRUP("125mg/5mL", 60), FORM_SYRUP("250mg/5mL", 60), FORM_SYRUP("250mg/5mL", 90),
      FORM_DROPS("100mg/mL", 15),
    ],
    brands: ["Amoxil", "Moxikind", "Amoclan", "Servamox", "Amox", "Amoxipen",
      "Amoxitabs", "Penamox", "Amoxidal", "Trimox", "Maxamox"],
  },
  {
    generic: "Amoxicillin + Clavulanate", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("375mg", 14), FORM_TABLET("625mg", 14), FORM_TABLET("1g", 14),
      FORM_SYRUP("156mg/5mL", 60), FORM_SYRUP("312mg/5mL", 70), FORM_SYRUP("457mg/5mL", 70),
      FORM_INJ("1.2g", 1),
    ],
    brands: ["Augmentin", "Calamox", "Clavix", "Augmex", "Amoclav", "Clavomox",
      "Amoxiclav", "Klavox", "Curam", "Bioclavid"],
  },
  {
    generic: "Ampicillin", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_CAPSULE("250mg", 10), FORM_CAPSULE("500mg", 10), FORM_INJ("500mg", 1),
      FORM_INJ("1g", 1),
    ],
    brands: ["Ampicin", "Ampilin", "Ampexin", "Ampicline", "Ampikat", "Ampelox"],
  },
  {
    generic: "Azithromycin", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("250mg", 6), FORM_TABLET("500mg", 3), FORM_CAPSULE("250mg", 6),
      FORM_SYRUP("200mg/5mL", 15), FORM_SYRUP("200mg/5mL", 30),
    ],
    brands: ["Zithromax", "Azomax", "Azinix", "Azitma", "Azitral", "Azitrocin",
      "Azith", "Azi-once", "Aziwok", "Atizor", "Azinor"],
  },
  {
    generic: "Clarithromycin", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("250mg", 14), FORM_TABLET("500mg", 14), FORM_TABLET("500mg SR", 7),
      FORM_SYRUP("125mg/5mL", 60),
    ],
    brands: ["Klaricid", "Klacid", "Claribid", "Clarinex", "Macrobac", "Clarimycin",
      "Clari", "Klaron"],
  },
  {
    generic: "Erythromycin", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("250mg", 14), FORM_TABLET("500mg", 14), FORM_SYRUP("125mg/5mL", 60),
      FORM_SYRUP("250mg/5mL", 60),
    ],
    brands: ["Erythrocin", "Eryacne", "Erysol", "Erythromax", "Erinox", "Stiemycin"],
  },
  {
    generic: "Ciprofloxacin", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("250mg", 10), FORM_TABLET("500mg", 10), FORM_TABLET("750mg", 10),
      FORM_INJ("100mg/10mL", 100), FORM_DROPS("0.3% Eye", 5), FORM_DROPS("0.3% Ear", 10),
    ],
    brands: ["Cipro", "Ciprobid", "Ciproxin", "Cifran", "Quintor", "Ciplox",
      "Cipromed", "Ciprolet", "Cipiderm", "Ciproflox"],
  },
  {
    generic: "Levofloxacin", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("250mg", 10), FORM_TABLET("500mg", 10), FORM_TABLET("750mg", 5),
      FORM_INJ("500mg/100mL", 100), FORM_DROPS("0.5% Eye", 5),
    ],
    brands: ["Levoflox", "Levaquin", "Levocin", "Tavanic", "Lebact", "Levomac",
      "Lefumax", "Levogen", "Levogard"],
  },
  {
    generic: "Moxifloxacin", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("400mg", 5), FORM_TABLET("400mg", 7), FORM_DROPS("0.5% Eye", 5),
    ],
    brands: ["Avelox", "Vigamox", "Moxiget", "Moxiflox", "Mflox", "Moxicip"],
  },
  {
    generic: "Ofloxacin", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("200mg", 10), FORM_TABLET("400mg", 10), FORM_DROPS("0.3% Eye", 5),
    ],
    brands: ["Ofloxin", "Tarivid", "Oflin", "Quinox", "Zanocin"],
  },
  {
    generic: "Norfloxacin", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("400mg", 10), FORM_TABLET("400mg", 14),
    ],
    brands: ["Noroxin", "Norflox", "Floxin", "Norbactin"],
  },
  {
    generic: "Doxycycline", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_CAPSULE("100mg", 8), FORM_CAPSULE("100mg", 10), FORM_TABLET("100mg", 10),
    ],
    brands: ["Vibramycin", "Doxin", "Doxylin", "Doxypal", "Doxitab", "Doxycyl"],
  },
  {
    generic: "Tetracycline", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_CAPSULE("250mg", 10), FORM_CAPSULE("500mg", 10),
    ],
    brands: ["Tetracyn", "Hostacyclin", "Tetlong", "Resteclin"],
  },
  {
    generic: "Metronidazole", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("200mg", 21), FORM_TABLET("400mg", 21), FORM_TABLET("500mg", 14),
      FORM_SYRUP("200mg/5mL", 60), FORM_INJ("500mg/100mL", 100), FORM_SUPP("500mg", 10),
    ],
    brands: ["Flagyl", "Metrozine", "Metro", "Metronix", "Metroken", "Metrogel",
      "Metrol", "Metrolife"],
  },
  {
    generic: "Tinidazole", category: "Antibiotics", rack: "B1",
    variants: [
      FORM_TABLET("300mg", 4), FORM_TABLET("500mg", 4), FORM_TABLET("1g", 2),
    ],
    brands: ["Tindamax", "Fasigyn", "Tinidaz", "Tiniba"],
  },
  {
    generic: "Cephalexin", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_CAPSULE("250mg", 10), FORM_CAPSULE("500mg", 10), FORM_SYRUP("125mg/5mL", 60),
      FORM_SYRUP("250mg/5mL", 60),
    ],
    brands: ["Keflex", "Cefax", "Cephoral", "Sporidex", "Velosef", "Ceporex"],
  },
  {
    generic: "Cefadroxil", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_CAPSULE("500mg", 10), FORM_TABLET("1g", 6), FORM_SYRUP("125mg/5mL", 60),
      FORM_SYRUP("250mg/5mL", 60), FORM_SYRUP("500mg/5mL", 60),
    ],
    brands: ["Duricef", "Cefadrox", "Drocef", "Bidocef", "Maxicef"],
  },
  {
    generic: "Cefuroxime", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("125mg", 10), FORM_TABLET("250mg", 10), FORM_TABLET("500mg", 10),
      FORM_SYRUP("125mg/5mL", 50), FORM_INJ("750mg", 1), FORM_INJ("1.5g", 1),
    ],
    brands: ["Zinacef", "Zinnat", "Cefurox", "Cefogen", "Servex"],
  },
  {
    generic: "Cefixime", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_CAPSULE("200mg", 5), FORM_CAPSULE("400mg", 5), FORM_TABLET("400mg DT", 5),
      FORM_SYRUP("100mg/5mL", 30), FORM_SYRUP("100mg/5mL", 60),
    ],
    brands: ["Suprax", "Cefspan", "Cefiget", "Cefirad", "Tergecef", "Cefix"],
  },
  {
    generic: "Ceftriaxone", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_INJ("250mg", 1), FORM_INJ("500mg", 1), FORM_INJ("1g", 1), FORM_INJ("2g", 1),
    ],
    brands: ["Rocephin", "Ceftrax", "Triaxone", "Cefiget IV", "Oframax", "Trizo"],
  },
  {
    generic: "Cefotaxime", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_INJ("500mg", 1), FORM_INJ("1g", 1), FORM_INJ("2g", 1),
    ],
    brands: ["Claforan", "Cefotax", "Taxim", "Omnatax"],
  },
  {
    generic: "Clindamycin", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_CAPSULE("150mg", 16), FORM_CAPSULE("300mg", 16), FORM_INJ("300mg/2mL", 2),
      FORM_INJ("600mg/4mL", 4), FORM_CREAM("1% Gel", 30),
    ],
    brands: ["Dalacin C", "Cleocin", "Clindex", "Clinmas", "Clinacin"],
  },
  {
    generic: "Vancomycin", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_INJ("500mg", 1), FORM_INJ("1g", 1),
    ],
    brands: ["Vancocin", "Vancol", "Vanmycin"],
  },
  {
    generic: "Linezolid", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("600mg", 10), FORM_INJ("600mg/300mL", 300),
    ],
    brands: ["Zyvox", "Linospan", "Lizolid"],
  },
  {
    generic: "Meropenem", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_INJ("500mg", 1), FORM_INJ("1g", 1),
    ],
    brands: ["Meronem", "Meropen", "Penem"],
  },
  {
    generic: "Imipenem + Cilastatin", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_INJ("500mg + 500mg", 1),
    ],
    brands: ["Tienam", "Primaxin", "Cilanem"],
  },
  {
    generic: "Piperacillin + Tazobactam", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_INJ("4g + 0.5g", 1), FORM_INJ("2g + 0.25g", 1),
    ],
    brands: ["Tazocin", "Pipecil", "Tazolyn"],
  },
  {
    generic: "Sulfamethoxazole + Trimethoprim", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("400mg + 80mg", 20), FORM_TABLET("800mg + 160mg DS", 20),
      FORM_SYRUP("200mg + 40mg/5mL", 60),
    ],
    brands: ["Septran", "Bactrim", "Cotrim", "Trimax", "Sulpra"],
  },
  {
    generic: "Nitrofurantoin", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_CAPSULE("50mg", 20), FORM_CAPSULE("100mg", 14),
    ],
    brands: ["Macrobid", "Nitrofur", "Furadantin"],
  },
  {
    generic: "Fluconazole", category: "Antifungals", rack: "H1",
    variants: [
      FORM_CAPSULE("50mg", 7), FORM_CAPSULE("150mg", 1), FORM_CAPSULE("200mg", 7),
      FORM_TABLET("400mg", 4), FORM_INJ("200mg/100mL", 100),
    ],
    brands: ["Diflucan", "Flucos", "Forcan", "Zocon", "Fungus", "Fungifluc"],
  },
  {
    generic: "Itraconazole", category: "Antifungals", rack: "H1",
    variants: [
      FORM_CAPSULE("100mg", 4), FORM_CAPSULE("100mg", 28), FORM_TABLET("200mg", 7),
    ],
    brands: ["Sporanox", "Itrazol", "Itracept", "Canditral"],
  },
  {
    generic: "Ketoconazole", category: "Antifungals", rack: "H1",
    variants: [
      FORM_TABLET("200mg", 10), FORM_CREAM("2%", 30), FORM_CREAM("2% Shampoo", 100),
    ],
    brands: ["Nizoral", "Ketozo", "Ketovate", "Funzol"],
  },
  {
    generic: "Clotrimazole", category: "Antifungals", rack: "H1",
    variants: [
      FORM_CREAM("1%", 20), FORM_CREAM("1%", 30), FORM_DROPS("1% Drops", 10),
      FORM_TABLET("100mg Vaginal", 6),
    ],
    brands: ["Canesten", "Candid", "Clotrim", "Lotremin", "Clotrol", "Mycelex"],
  },
  {
    generic: "Miconazole", category: "Antifungals", rack: "H1",
    variants: [
      FORM_CREAM("2%", 20), FORM_CREAM("2%", 30),
    ],
    brands: ["Daktarin", "Monistat", "Miconaz", "Miconal"],
  },
  {
    generic: "Terbinafine", category: "Antifungals", rack: "H1",
    variants: [
      FORM_TABLET("250mg", 14), FORM_TABLET("250mg", 28), FORM_CREAM("1%", 15),
    ],
    brands: ["Lamisil", "Terbinox", "Tinofin", "Daskil"],
  },
  {
    generic: "Nystatin", category: "Antifungals", rack: "H1",
    variants: [
      FORM_DROPS("100,000IU/mL", 30), FORM_TABLET("500,000IU", 50),
    ],
    brands: ["Mycostatin", "Nilstat", "Nystop"],
  },
  {
    generic: "Acyclovir", category: "Antivirals", rack: "B2",
    variants: [
      FORM_TABLET("200mg", 25), FORM_TABLET("400mg", 35), FORM_TABLET("800mg", 35),
      FORM_CREAM("5%", 5), FORM_INJ("250mg", 1),
    ],
    brands: ["Zovirax", "Acivir", "Herpex", "Cycloral", "Aciclo"],
  },
  {
    generic: "Valacyclovir", category: "Antivirals", rack: "B2",
    variants: [
      FORM_TABLET("500mg", 10), FORM_TABLET("1g", 7),
    ],
    brands: ["Valtrex", "Valclovir", "Valacir"],
  },
  {
    generic: "Oseltamivir", category: "Antivirals", rack: "B2",
    variants: [
      FORM_CAPSULE("30mg", 10), FORM_CAPSULE("45mg", 10), FORM_CAPSULE("75mg", 10),
      FORM_SYRUP("12mg/mL", 75),
    ],
    brands: ["Tamiflu", "Fluvir", "Antiflu"],
  },
  {
    generic: "Remdesivir", category: "Antivirals", rack: "B2",
    variants: [
      FORM_INJ("100mg", 1),
    ],
    brands: ["Veklury", "Remdac", "Cipremi"],
  },
  {
    generic: "Cetirizine", category: "Antihistamines", rack: "A2",
    variants: [
      FORM_TABLET("10mg", 10), FORM_TABLET("10mg", 30), FORM_SYRUP("5mg/5mL", 60),
      FORM_SYRUP("5mg/5mL", 120), FORM_DROPS("10mg/mL", 10),
    ],
    brands: ["Zyrtec", "Rigix", "Cetrine", "Setral", "Cetzine", "Cetrizet",
      "Alercet", "Histacet", "Cetrocin"],
  },
  {
    generic: "Loratadine", category: "Antihistamines", rack: "A2",
    variants: [
      FORM_TABLET("10mg", 10), FORM_SYRUP("5mg/5mL", 60), FORM_SYRUP("5mg/5mL", 120),
    ],
    brands: ["Claritine", "Lorfast", "Loratin", "Lorano", "Alavert"],
  },
  {
    generic: "Fexofenadine", category: "Antihistamines", rack: "A2",
    variants: [
      FORM_TABLET("60mg", 10), FORM_TABLET("120mg", 10), FORM_TABLET("180mg", 10),
      FORM_SYRUP("30mg/5mL", 60),
    ],
    brands: ["Allegra", "Fexet", "Telfast", "Fexova", "Histafree"],
  },
  {
    generic: "Desloratadine", category: "Antihistamines", rack: "A2",
    variants: [
      FORM_TABLET("5mg", 10), FORM_SYRUP("0.5mg/mL", 60),
    ],
    brands: ["Aerius", "Desorad", "Deslorin"],
  },
  {
    generic: "Levocetirizine", category: "Antihistamines", rack: "A2",
    variants: [
      FORM_TABLET("5mg", 10), FORM_SYRUP("2.5mg/5mL", 60),
    ],
    brands: ["Xyzal", "Levozet", "Lewohist", "Lekoklar"],
  },
  {
    generic: "Chlorphenamine", category: "Antihistamines", rack: "A2",
    variants: [
      FORM_TABLET("4mg", 25), FORM_SYRUP("2mg/5mL", 60),
    ],
    brands: ["Piriton", "Chlorpine", "Histablock"],
  },
  {
    generic: "Diphenhydramine", category: "Antihistamines", rack: "A2",
    variants: [
      FORM_CAPSULE("25mg", 10), FORM_CAPSULE("50mg", 10), FORM_SYRUP("12.5mg/5mL", 60),
    ],
    brands: ["Benadryl", "Diphen", "Dimen", "Histabloc"],
  },
  {
    generic: "Hydroxyzine", category: "Antihistamines", rack: "A2",
    variants: [
      FORM_TABLET("10mg", 30), FORM_TABLET("25mg", 30), FORM_SYRUP("10mg/5mL", 60),
    ],
    brands: ["Atarax", "Hyderm", "Hydroxyz"],
  },
  {
    generic: "Omeprazole", category: "Antacids", rack: "G1",
    variants: [
      FORM_CAPSULE("20mg", 14), FORM_CAPSULE("20mg", 30), FORM_CAPSULE("40mg", 14),
      FORM_INJ("40mg", 1),
    ],
    brands: ["Losec", "Risek", "Omes", "Ome", "Omezol", "Prilosec", "Acizole",
      "Lomac", "Omepral", "Omeprex"],
  },
  {
    generic: "Esomeprazole", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("20mg", 14), FORM_TABLET("40mg", 14), FORM_TABLET("40mg", 30),
      FORM_INJ("40mg", 1),
    ],
    brands: ["Nexium", "Esso", "Esozol", "Esomac", "Pumpitor"],
  },
  {
    generic: "Pantoprazole", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("20mg", 14), FORM_TABLET("40mg", 14), FORM_TABLET("40mg", 30),
      FORM_INJ("40mg", 1),
    ],
    brands: ["Pantoloc", "Pantac", "Pantop", "Protium", "Pansec", "Pantogut"],
  },
  {
    generic: "Lansoprazole", category: "Antacids", rack: "G1",
    variants: [
      FORM_CAPSULE("15mg", 14), FORM_CAPSULE("30mg", 14),
    ],
    brands: ["Prevacid", "Lanzole", "Lanson", "Lasoprol"],
  },
  {
    generic: "Rabeprazole", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("10mg", 14), FORM_TABLET("20mg", 14),
    ],
    brands: ["Pariet", "Rabikind", "Rabezol", "Rablet"],
  },
  {
    generic: "Ranitidine", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("75mg", 30), FORM_TABLET("150mg", 30), FORM_TABLET("300mg", 10),
      FORM_INJ("50mg/2mL", 2), FORM_SYRUP("75mg/5mL", 60),
    ],
    brands: ["Zantac", "Ranidin", "Histac", "Aciloc", "Ranitin", "Zinetac"],
  },
  {
    generic: "Famotidine", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("20mg", 10), FORM_TABLET("40mg", 10),
    ],
    brands: ["Pepcid", "Famtac", "Famocid", "Famotin"],
  },
  {
    generic: "Domperidone", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("10mg", 30), FORM_SYRUP("1mg/mL", 60), FORM_SYRUP("1mg/mL", 100),
    ],
    brands: ["Motilium", "Domel", "Domstal", "Domperi", "Vomistop"],
  },
  {
    generic: "Metoclopramide", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("10mg", 30), FORM_INJ("10mg/2mL", 2), FORM_SYRUP("5mg/5mL", 60),
    ],
    brands: ["Maxolon", "Reglan", "Metolon", "Pernov"],
  },
  {
    generic: "Ondansetron", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("4mg", 10), FORM_TABLET("8mg", 10), FORM_INJ("4mg/2mL", 2),
      FORM_INJ("8mg/4mL", 4), FORM_SYRUP("4mg/5mL", 50),
    ],
    brands: ["Zofran", "Onda", "Ondem", "Emeset", "Vomiof"],
  },
  {
    generic: "Lactulose", category: "Antacids", rack: "G1",
    variants: [
      FORM_SYRUP("667mg/mL", 200), FORM_SYRUP("667mg/mL", 500),
    ],
    brands: ["Duphalac", "Laxoberon", "Lactol", "Cephulac"],
  },
  {
    generic: "Bisacodyl", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("5mg", 30), FORM_SUPP("10mg", 5),
    ],
    brands: ["Dulcolax", "Bisalax", "Bisacod"],
  },
  {
    generic: "Loperamide", category: "Antacids", rack: "G1",
    variants: [
      FORM_CAPSULE("2mg", 10), FORM_TABLET("2mg", 30),
    ],
    brands: ["Imodium", "Loperin", "Lopinex", "Diatabs"],
  },
  {
    generic: "Hyoscine Butylbromide", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("10mg", 20), FORM_INJ("20mg/mL", 1),
    ],
    brands: ["Buscopan", "Hyospan", "Hyobid", "Spasmonil"],
  },
  {
    generic: "Mebeverine", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("135mg", 15), FORM_CAPSULE("200mg SR", 30),
    ],
    brands: ["Colofac", "Duspatalin", "Meboline"],
  },
  {
    generic: "Simethicone", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("80mg", 30), FORM_DROPS("40mg/mL", 30),
    ],
    brands: ["Disflatyl", "Mylicon", "Simco", "Aerogut"],
  },
  {
    generic: "Sucralfate", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("1g", 30), FORM_SYRUP("1g/5mL", 200),
    ],
    brands: ["Carafate", "Sucral", "Sufrate", "Iselpin"],
  },
  {
    generic: "Mesalazine", category: "Antacids", rack: "G1",
    variants: [
      FORM_TABLET("400mg", 30), FORM_TABLET("800mg", 30),
    ],
    brands: ["Pentasa", "Asacol", "Salofalk"],
  },
  {
    generic: "Amlodipine", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("2.5mg", 14), FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 14),
    ],
    brands: ["Norvasc", "Amlocard", "Amlodac", "Amlovas", "Amgenic", "Amlosafe",
      "Amlozaar", "Amlode", "Cardilop"],
  },
  {
    generic: "Nifedipine", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("10mg", 30), FORM_TABLET("20mg SR", 30), FORM_TABLET("30mg SR", 30),
    ],
    brands: ["Adalat", "Nifedical", "Nife", "Nifedip"],
  },
  {
    generic: "Diltiazem", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("30mg", 30), FORM_TABLET("60mg", 30), FORM_CAPSULE("90mg SR", 30),
      FORM_CAPSULE("120mg SR", 30),
    ],
    brands: ["Cardizem", "Dilzem", "Tildiem", "Diltime"],
  },
  {
    generic: "Verapamil", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("40mg", 30), FORM_TABLET("80mg", 30), FORM_TABLET("120mg SR", 30),
    ],
    brands: ["Calan", "Isoptin", "Vasolan"],
  },
  {
    generic: "Atenolol", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("25mg", 14), FORM_TABLET("50mg", 14), FORM_TABLET("100mg", 14),
    ],
    brands: ["Tenormin", "Atelol", "Atenil", "Tenolin", "Beta-Card", "Atecard"],
  },
  {
    generic: "Bisoprolol", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("2.5mg", 14), FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 14),
    ],
    brands: ["Concor", "Bisocor", "Cardicor", "Bisoprol"],
  },
  {
    generic: "Metoprolol", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("25mg", 14), FORM_TABLET("50mg", 14), FORM_TABLET("100mg", 14),
    ],
    brands: ["Lopresor", "Betaloc", "Metolol", "Toprol-XL"],
  },
  {
    generic: "Carvedilol", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("3.125mg", 14), FORM_TABLET("6.25mg", 14), FORM_TABLET("12.5mg", 14),
      FORM_TABLET("25mg", 14),
    ],
    brands: ["Coreg", "Dilatrend", "Carca", "Cardivas"],
  },
  {
    generic: "Propranolol", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("10mg", 30), FORM_TABLET("40mg", 30), FORM_TABLET("80mg SR", 30),
    ],
    brands: ["Inderal", "Propranol", "Probeta", "Ciplar"],
  },
  {
    generic: "Lisinopril", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("2.5mg", 14), FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 14),
      FORM_TABLET("20mg", 14),
    ],
    brands: ["Zestril", "Lisitec", "Sinopril", "Listril"],
  },
  {
    generic: "Enalapril", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 14), FORM_TABLET("20mg", 14),
    ],
    brands: ["Renitec", "Vasotec", "Enapril", "Envas"],
  },
  {
    generic: "Captopril", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("12.5mg", 30), FORM_TABLET("25mg", 30), FORM_TABLET("50mg", 30),
    ],
    brands: ["Capoten", "Captol", "Captomet"],
  },
  {
    generic: "Ramipril", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("2.5mg", 14), FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 14),
    ],
    brands: ["Tritace", "Ramace", "Ramicard", "Cardace"],
  },
  {
    generic: "Losartan", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("25mg", 14), FORM_TABLET("50mg", 14), FORM_TABLET("100mg", 14),
    ],
    brands: ["Cozaar", "Losar", "Losarbest", "Tozaar", "Hyzaar"],
  },
  {
    generic: "Valsartan", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("40mg", 14), FORM_TABLET("80mg", 14), FORM_TABLET("160mg", 14),
      FORM_TABLET("320mg", 14),
    ],
    brands: ["Diovan", "Valsabest", "Valpression", "Valsacor"],
  },
  {
    generic: "Telmisartan", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("20mg", 14), FORM_TABLET("40mg", 14), FORM_TABLET("80mg", 14),
    ],
    brands: ["Micardis", "Telma", "Telpres", "Tibis"],
  },
  {
    generic: "Olmesartan", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("10mg", 14), FORM_TABLET("20mg", 14), FORM_TABLET("40mg", 14),
    ],
    brands: ["Olmetec", "Olmecip", "Olmin"],
  },
  {
    generic: "Atorvastatin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("10mg", 14), FORM_TABLET("20mg", 14), FORM_TABLET("40mg", 14),
      FORM_TABLET("80mg", 14),
    ],
    brands: ["Lipitor", "Atorva", "Atorlip", "Atorsave", "Caduet", "Storvas"],
  },
  {
    generic: "Rosuvastatin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 14), FORM_TABLET("20mg", 14),
      FORM_TABLET("40mg", 14),
    ],
    brands: ["Crestor", "Rosuvas", "Rovista", "Rozavel"],
  },
  {
    generic: "Simvastatin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("10mg", 14), FORM_TABLET("20mg", 14), FORM_TABLET("40mg", 14),
    ],
    brands: ["Zocor", "Simvas", "Simlo", "Simva"],
  },
  {
    generic: "Pravastatin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("20mg", 14), FORM_TABLET("40mg", 14),
    ],
    brands: ["Pravachol", "Pravator", "Pravachol-Pak"],
  },
  {
    generic: "Furosemide", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("20mg", 30), FORM_TABLET("40mg", 30), FORM_INJ("20mg/2mL", 2),
    ],
    brands: ["Lasix", "Frusemide", "Frusid", "Furo"],
  },
  {
    generic: "Hydrochlorothiazide", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("12.5mg", 30), FORM_TABLET("25mg", 30), FORM_TABLET("50mg", 30),
    ],
    brands: ["HCTZ", "Esidrex", "Hydrochlor"],
  },
  {
    generic: "Spironolactone", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("25mg", 30), FORM_TABLET("50mg", 30), FORM_TABLET("100mg", 30),
    ],
    brands: ["Aldactone", "Spironol", "Spirobest"],
  },
  {
    generic: "Indapamide", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("1.5mg SR", 30), FORM_TABLET("2.5mg", 30),
    ],
    brands: ["Natrilix", "Indap", "Indabest"],
  },
  {
    generic: "Clopidogrel", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("75mg", 14), FORM_TABLET("75mg", 30), FORM_TABLET("300mg", 4),
    ],
    brands: ["Plavix", "Clovix", "Clopilet", "Noklot"],
  },
  {
    generic: "Warfarin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("1mg", 30), FORM_TABLET("3mg", 30), FORM_TABLET("5mg", 30),
    ],
    brands: ["Coumadin", "Warf", "Warfin"],
  },
  {
    generic: "Enoxaparin", category: "Cardiovascular", rack: "COLD",
    variants: [
      FORM_INJ("20mg/0.2mL", 1), FORM_INJ("40mg/0.4mL", 1), FORM_INJ("60mg/0.6mL", 1),
      FORM_INJ("80mg/0.8mL", 1),
    ],
    brands: ["Clexane", "Lovenox", "Enoxabest"],
  },
  {
    generic: "Heparin", category: "Cardiovascular", rack: "COLD",
    variants: [
      FORM_INJ("5,000 IU/mL", 5), FORM_INJ("25,000 IU/5mL", 5),
    ],
    brands: ["Heparin Sodium", "Heparinex"],
  },
  {
    generic: "Isosorbide Mononitrate", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("20mg", 30), FORM_TABLET("40mg SR", 30), FORM_TABLET("60mg SR", 30),
    ],
    brands: ["Imdur", "Monitrate", "Monit", "Iso-Mon"],
  },
  {
    generic: "Isosorbide Dinitrate", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("5mg", 30), FORM_TABLET("10mg", 30), FORM_TABLET("20mg", 30),
    ],
    brands: ["Isordil", "Sorbitrate", "Isodil"],
  },
  {
    generic: "Glyceryl Trinitrate", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("0.5mg SL", 100), FORM_INJ("5mg/10mL", 10),
    ],
    brands: ["Nitrostat", "GTN", "Angised"],
  },
  {
    generic: "Digoxin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("0.25mg", 30), FORM_INJ("0.5mg/2mL", 2),
    ],
    brands: ["Lanoxin", "Digoxin", "Digix"],
  },
  {
    generic: "Metformin", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("500mg", 20), FORM_TABLET("850mg", 20), FORM_TABLET("1000mg", 20),
      FORM_TABLET("1000mg SR", 20), FORM_TABLET("500mg SR", 30),
    ],
    brands: ["Glucophage", "Glucomet", "Diaformin", "Metformex", "Cetapin",
      "Diafat", "Riomet", "Glycomet", "Bigsens"],
  },
  {
    generic: "Glibenclamide", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("2.5mg", 30), FORM_TABLET("5mg", 30),
    ],
    brands: ["Daonil", "Glynase", "Glyform", "Euglucon"],
  },
  {
    generic: "Glimepiride", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("1mg", 15), FORM_TABLET("2mg", 15), FORM_TABLET("3mg", 15),
      FORM_TABLET("4mg", 15),
    ],
    brands: ["Amaryl", "Glimer", "Glimisave", "Glimy"],
  },
  {
    generic: "Gliclazide", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("30mg MR", 30), FORM_TABLET("60mg MR", 30), FORM_TABLET("80mg", 30),
    ],
    brands: ["Diamicron", "Glycid", "Glicla", "Reclide"],
  },
  {
    generic: "Sitagliptin", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("25mg", 14), FORM_TABLET("50mg", 14), FORM_TABLET("100mg", 14),
    ],
    brands: ["Januvia", "Sitagen", "Sitazit", "Trajenta"],
  },
  {
    generic: "Vildagliptin", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("50mg", 28), FORM_TABLET("50mg + 1000mg Met", 28),
    ],
    brands: ["Galvus", "Vilda", "Galvusmet"],
  },
  {
    generic: "Linagliptin", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("5mg", 14),
    ],
    brands: ["Trajenta", "Trajentamet"],
  },
  {
    generic: "Empagliflozin", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("10mg", 14), FORM_TABLET("25mg", 14),
    ],
    brands: ["Jardiance", "Empabest", "Glyxambi"],
  },
  {
    generic: "Dapagliflozin", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 14),
    ],
    brands: ["Forxiga", "Dapaglim", "Xigduo"],
  },
  {
    generic: "Pioglitazone", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("15mg", 30), FORM_TABLET("30mg", 30),
    ],
    brands: ["Actos", "Piozone", "Glita"],
  },
  {
    generic: "Insulin Human (Regular)", category: "Diabetes", rack: "COLD",
    variants: [
      FORM_INJ("100IU/mL", 10), FORM_INJ("100IU/mL", 3),
    ],
    brands: ["Actrapid", "Humulin R", "Insuget R", "Insulin R"],
  },
  {
    generic: "Insulin Isophane (NPH)", category: "Diabetes", rack: "COLD",
    variants: [
      FORM_INJ("100IU/mL", 10), FORM_INJ("100IU/mL", 3),
    ],
    brands: ["Insulatard", "Humulin N", "Insuget N"],
  },
  {
    generic: "Insulin Glargine", category: "Diabetes", rack: "COLD",
    variants: [
      FORM_INJ("100IU/mL", 10), FORM_INJ("100IU/mL", 3),
    ],
    brands: ["Lantus", "Basaglar", "Glaritus"],
  },
  {
    generic: "Insulin Aspart", category: "Diabetes", rack: "COLD",
    variants: [
      FORM_INJ("100IU/mL", 10), FORM_INJ("100IU/mL", 3),
    ],
    brands: ["NovoRapid", "Fiasp"],
  },
  {
    generic: "Insulin Lispro", category: "Diabetes", rack: "COLD",
    variants: [
      FORM_INJ("100IU/mL", 10), FORM_INJ("100IU/mL", 3),
    ],
    brands: ["Humalog", "Admelog"],
  },
  {
    generic: "Insulin Mix 70/30", category: "Diabetes", rack: "COLD",
    variants: [
      FORM_INJ("100IU/mL", 10), FORM_INJ("100IU/mL", 3),
    ],
    brands: ["Mixtard 30", "Humulin 70/30", "Insuget 70/30"],
  },
  {
    generic: "Salbutamol", category: "Respiratory", rack: "E1",
    variants: [
      FORM_INHALER("100mcg/puff", 200), FORM_TABLET("2mg", 30), FORM_TABLET("4mg", 30),
      FORM_SYRUP("2mg/5mL", 60), FORM_SYRUP("2mg/5mL", 120),
    ],
    brands: ["Ventolin", "Asthalin", "Salair", "Salbuair", "Albuterol", "Salbid"],
  },
  {
    generic: "Ipratropium Bromide", category: "Respiratory", rack: "E1",
    variants: [
      FORM_INHALER("20mcg/puff", 200), FORM_DROPS("250mcg/mL Nebule", 20),
    ],
    brands: ["Atrovent", "Iprasol", "Ipratrop"],
  },
  {
    generic: "Salmeterol", category: "Respiratory", rack: "E1",
    variants: [
      FORM_INHALER("25mcg/puff", 120),
    ],
    brands: ["Serevent", "Salmair"],
  },
  {
    generic: "Salmeterol + Fluticasone", category: "Respiratory", rack: "E1",
    variants: [
      FORM_INHALER("25/125 mcg/puff", 120), FORM_INHALER("25/250 mcg/puff", 120),
      FORM_INHALER("50/250 mcg Discus", 60), FORM_INHALER("50/500 mcg Discus", 60),
    ],
    brands: ["Seretide", "Adoair", "Combair", "Foracort"],
  },
  {
    generic: "Formoterol + Budesonide", category: "Respiratory", rack: "E1",
    variants: [
      FORM_INHALER("4.5/160 mcg/puff", 120), FORM_INHALER("9/320 mcg/puff", 120),
    ],
    brands: ["Symbicort", "Foracort", "Formobid"],
  },
  {
    generic: "Budesonide", category: "Respiratory", rack: "E1",
    variants: [
      FORM_INHALER("100mcg/puff", 200), FORM_INHALER("200mcg/puff", 200),
      FORM_DROPS("0.5mg/2mL Nebule", 20),
    ],
    brands: ["Pulmicort", "Budicort", "Budenase"],
  },
  {
    generic: "Beclomethasone", category: "Respiratory", rack: "E1",
    variants: [
      FORM_INHALER("100mcg/puff", 200), FORM_INHALER("250mcg/puff", 200),
    ],
    brands: ["Becotide", "Beconase", "Beclate"],
  },
  {
    generic: "Montelukast", category: "Respiratory", rack: "E1",
    variants: [
      FORM_TABLET("4mg", 14), FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 14),
    ],
    brands: ["Singulair", "Montik", "Montair", "Lukast"],
  },
  {
    generic: "Theophylline", category: "Respiratory", rack: "E1",
    variants: [
      FORM_TABLET("100mg", 30), FORM_TABLET("200mg SR", 30), FORM_TABLET("400mg SR", 30),
      FORM_SYRUP("50mg/5mL", 60),
    ],
    brands: ["Theo-24", "Quibron-T", "Theophyl", "Theobid"],
  },
  {
    generic: "Acetylcysteine", category: "Respiratory", rack: "E1",
    variants: [
      FORM_TABLET("600mg Eff", 10), FORM_SACHET("600mg"), FORM_SACHET("200mg"),
      FORM_SYRUP("100mg/5mL", 100),
    ],
    brands: ["Mucomyst", "Acetyl", "Mucinac"],
  },
  {
    generic: "Bromhexine", category: "Respiratory", rack: "E1",
    variants: [
      FORM_TABLET("8mg", 30), FORM_SYRUP("4mg/5mL", 60), FORM_SYRUP("4mg/5mL", 120),
    ],
    brands: ["Bisolvon", "Solvin", "Bromhex"],
  },
  {
    generic: "Ambroxol", category: "Respiratory", rack: "E1",
    variants: [
      FORM_TABLET("30mg", 30), FORM_TABLET("75mg SR", 10), FORM_SYRUP("15mg/5mL", 60),
      FORM_SYRUP("30mg/5mL", 60),
    ],
    brands: ["Mucosolvan", "Mucolyte", "Ambrolitic", "Ambrolex"],
  },
  {
    generic: "Guaifenesin", category: "Respiratory", rack: "E1",
    variants: [
      FORM_SYRUP("100mg/5mL", 60), FORM_SYRUP("100mg/5mL", 120),
    ],
    brands: ["Robitussin", "Guafil", "Guaifen"],
  },
  {
    generic: "Dextromethorphan", category: "Respiratory", rack: "E1",
    variants: [
      FORM_SYRUP("15mg/5mL", 60), FORM_SYRUP("15mg/5mL", 120),
    ],
    brands: ["Tussidex", "DM", "Coscopin"],
  },
  {
    generic: "Codeine + Promethazine", category: "Respiratory", rack: "B2", isControlled: true,
    variants: [
      FORM_SYRUP("10mg + 6.25mg/5mL", 60), FORM_SYRUP("10mg + 6.25mg/5mL", 120),
    ],
    brands: ["Phenergan with Codeine", "Codex", "Coderyl"],
  },
  {
    generic: "Vitamin C", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("250mg", 10), FORM_TABLET("500mg", 10), FORM_TABLET("1000mg Eff", 20),
      FORM_INJ("500mg/5mL", 5), FORM_SYRUP("100mg/5mL", 60),
    ],
    brands: ["Cecon", "Celin", "C-Vit", "Limcee", "Ascorbic Acid", "Vital-C"],
  },
  {
    generic: "Vitamin D3", category: "Vitamins", rack: "F1",
    variants: [
      FORM_CAPSULE("1000IU", 10), FORM_CAPSULE("5000IU", 10), FORM_CAPSULE("50,000IU", 4),
      FORM_INJ("200,000IU", 1), FORM_INJ("600,000IU", 1), FORM_DROPS("400IU/drop", 10),
    ],
    brands: ["Sunny-D", "D-Cure", "Calcipot", "Daily-D", "Ostiwax", "Indrop-D"],
  },
  {
    generic: "Vitamin B Complex", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("B1+B6+B12", 30), FORM_INJ("Multi-B", 3), FORM_SYRUP("Multi-B", 120),
    ],
    brands: ["Neurobion", "Becosules", "Bolinox", "B-Plex", "Beco-Plex", "Numel"],
  },
  {
    generic: "Vitamin B12 (Methylcobalamin)", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("500mcg", 10), FORM_TABLET("1500mcg", 10), FORM_INJ("1000mcg/mL", 1),
    ],
    brands: ["Methycobal", "Mecobal", "Nervimax", "Neuromet"],
  },
  {
    generic: "Vitamin B6 (Pyridoxine)", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("10mg", 30), FORM_TABLET("40mg", 30),
    ],
    brands: ["Beesix", "Pyridoxin", "B6"],
  },
  {
    generic: "Folic Acid", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("400mcg", 28), FORM_TABLET("5mg", 28), FORM_SYRUP("1mg/mL", 60),
    ],
    brands: ["Folvite", "Folic Acid", "Folder", "Fol-5"],
  },
  {
    generic: "Iron (Ferrous Sulfate)", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("200mg", 30), FORM_SYRUP("125mg/5mL", 100), FORM_SYRUP("220mg/5mL", 200),
    ],
    brands: ["Feosol", "Iberet", "Sangobion", "Ferrosan"],
  },
  {
    generic: "Iron Polymaltose", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("100mg", 30), FORM_SYRUP("50mg/5mL", 100), FORM_INJ("100mg/2mL", 2),
    ],
    brands: ["Maltofer", "Ferro-Vit", "Ferium", "Sutron"],
  },
  {
    generic: "Calcium + Vitamin D", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("500mg + 200IU", 10), FORM_TABLET("500mg + 400IU", 30),
      FORM_TABLET("600mg + 400IU", 30), FORM_SYRUP("Suspension", 100),
    ],
    brands: ["Calcivit", "Calcimax", "Caltrate", "Os-Cal", "Cal-D", "Calcimin"],
  },
  {
    generic: "Calcium Citrate", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("250mg", 30), FORM_TABLET("500mg", 30),
    ],
    brands: ["Citracal", "Calcicit"],
  },
  {
    generic: "Magnesium", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("100mg", 30), FORM_TABLET("250mg", 30), FORM_TABLET("500mg", 30),
    ],
    brands: ["Magnesia", "Mag-Plus", "Magnabid"],
  },
  {
    generic: "Zinc Sulfate", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("20mg DT", 14), FORM_TABLET("50mg", 30), FORM_SYRUP("5mg/5mL", 120),
    ],
    brands: ["Zincovit", "Zincus", "Zincat", "Zegen"],
  },
  {
    generic: "Multivitamin", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("Adult", 30), FORM_CAPSULE("Adult", 30), FORM_SYRUP("Pediatric", 120),
      FORM_DROPS("Pediatric", 30),
    ],
    brands: ["Surbex-Z", "Centrum", "Pharmaton", "Revital", "Vitabiotics", "Polybion"],
  },
  {
    generic: "Omega-3 Fish Oil", category: "Vitamins", rack: "F1",
    variants: [
      FORM_CAPSULE("1000mg", 30), FORM_CAPSULE("1200mg", 30),
    ],
    brands: ["Seven Seas", "Omega-3", "Omacor", "Omega-Cap"],
  },
  {
    generic: "Glucosamine + Chondroitin", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("500mg + 400mg", 30), FORM_SACHET("1500mg + 1200mg"),
    ],
    brands: ["Cosamin", "Glucosamax", "Jointace"],
  },
  {
    generic: "Coenzyme Q10", category: "Vitamins", rack: "F1",
    variants: [
      FORM_CAPSULE("30mg", 30), FORM_CAPSULE("100mg", 30),
    ],
    brands: ["Q10-Vital", "Co-Q10", "Coenzyme-Q"],
  },
  {
    generic: "Folic Acid + Iron + Vit", category: "Vitamins", rack: "F1",
    variants: [
      FORM_TABLET("Pregnancy Formula", 30), FORM_CAPSULE("Pregnancy Formula", 30),
    ],
    brands: ["Folvite Plus", "Sangobion", "Materna", "Pregnacare"],
  },
  {
    generic: "Betamethasone", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("0.05%", 15), FORM_CREAM("0.1%", 15), FORM_CREAM("0.1%", 30),
      FORM_TABLET("0.5mg", 30), FORM_INJ("4mg/mL", 1),
    ],
    brands: ["Betnovate", "Betaderm", "Diprosone", "Betatrex", "Beprosone"],
  },
  {
    generic: "Hydrocortisone", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("1%", 15), FORM_CREAM("2.5%", 15), FORM_TABLET("10mg", 30),
      FORM_TABLET("20mg", 30), FORM_INJ("100mg", 1), FORM_INJ("250mg", 1),
    ],
    brands: ["Cortizone", "Hydrocort", "Cortef", "Solu-Cortef"],
  },
  {
    generic: "Clobetasol", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("0.05%", 15), FORM_CREAM("0.05%", 30), FORM_DROPS("0.05% Scalp", 30),
    ],
    brands: ["Dermovate", "Clobex", "Clobetasol", "Tenovate"],
  },
  {
    generic: "Mometasone", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("0.1%", 15), FORM_CREAM("0.1%", 30), FORM_DROPS("0.05% Nasal", 18),
    ],
    brands: ["Elocom", "Nasonex", "Momate"],
  },
  {
    generic: "Fluticasone Propionate (Nasal)", category: "Dermatology", rack: "H1",
    variants: [
      FORM_DROPS("50mcg/spray", 18), FORM_CREAM("0.05%", 15),
    ],
    brands: ["Flixonase", "Flonase", "Flixoderm"],
  },
  {
    generic: "Mupirocin", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("2%", 5), FORM_CREAM("2%", 15),
    ],
    brands: ["Bactroban", "Mupiderm", "Mupimax"],
  },
  {
    generic: "Fusidic Acid", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("2%", 15), FORM_CREAM("2%", 30),
    ],
    brands: ["Fucidin", "Fusiderm", "Fucibet"],
  },
  {
    generic: "Permethrin", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("5%", 30), FORM_CREAM("5%", 60),
    ],
    brands: ["Elimite", "Lyclear", "Permite"],
  },
  {
    generic: "Benzyl Benzoate", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("25% Lotion", 100),
    ],
    brands: ["Ascabiol", "Benzo Lotion"],
  },
  {
    generic: "Calamine Lotion", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("Lotion", 100), FORM_CREAM("Lotion", 200),
    ],
    brands: ["Calamine", "Cala-Lotion", "Calatone"],
  },
  {
    generic: "Tretinoin", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("0.025%", 20), FORM_CREAM("0.05%", 20), FORM_CREAM("0.1%", 20),
    ],
    brands: ["Retin-A", "Aknetin", "Renova"],
  },
  {
    generic: "Adapalene", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("0.1%", 15), FORM_CREAM("0.1%", 30),
    ],
    brands: ["Differin", "Adaferin", "Adapen"],
  },
  {
    generic: "Benzoyl Peroxide", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("2.5%", 30), FORM_CREAM("5%", 30), FORM_CREAM("10%", 30),
    ],
    brands: ["Brevoxyl", "Benzac", "Benoxyl"],
  },
  {
    generic: "Salicylic Acid", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("3% Ointment", 25), FORM_CREAM("5% Ointment", 25),
    ],
    brands: ["Duofilm", "Salactol", "Acnex"],
  },
  {
    generic: "Calcipotriol + Betamethasone", category: "Dermatology", rack: "H1",
    variants: [
      FORM_CREAM("Ointment", 30),
    ],
    brands: ["Daivobet", "Dovobet", "Xamiol"],
  },
  {
    generic: "Ciprofloxacin Eye", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("0.3% Eye", 5), FORM_CREAM("0.3% Eye Ointment", 4),
    ],
    brands: ["Ciloxan", "Ciplox", "Cipro Eye"],
  },
  {
    generic: "Ofloxacin Eye", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("0.3% Eye", 5),
    ],
    brands: ["Exocin", "Floxin Eye"],
  },
  {
    generic: "Tobramycin Eye", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("0.3% Eye", 5),
    ],
    brands: ["Tobrex", "Tobasone"],
  },
  {
    generic: "Timolol", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("0.25% Eye", 5), FORM_DROPS("0.5% Eye", 5),
    ],
    brands: ["Timoptol", "Timolol", "Glaucotensil"],
  },
  {
    generic: "Latanoprost", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("0.005% Eye", 3),
    ],
    brands: ["Xalatan", "Glautan", "Latanost"],
  },
  {
    generic: "Brimonidine", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("0.2% Eye", 5),
    ],
    brands: ["Alphagan", "Brimoglau"],
  },
  {
    generic: "Dorzolamide + Timolol", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("Eye Drops", 5),
    ],
    brands: ["Cosopt", "Dorzox-T"],
  },
  {
    generic: "Carboxymethylcellulose Eye", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("0.5% Lubricant", 10), FORM_DROPS("1% Lubricant", 10),
    ],
    brands: ["Refresh Tears", "Tear Naturale", "Optive"],
  },
  {
    generic: "Diazepam", category: "Controlled", rack: "B2", isControlled: true,
    variants: [
      FORM_TABLET("2mg", 30), FORM_TABLET("5mg", 10), FORM_TABLET("10mg", 30),
      FORM_INJ("10mg/2mL", 2),
    ],
    brands: ["Valium", "Diazenil", "Calmpose"],
  },
  {
    generic: "Lorazepam", category: "Controlled", rack: "B2", isControlled: true,
    variants: [
      FORM_TABLET("0.5mg", 30), FORM_TABLET("1mg", 30), FORM_TABLET("2mg", 30),
    ],
    brands: ["Ativan", "Loraz"],
  },
  {
    generic: "Alprazolam", category: "Controlled", rack: "B2", isControlled: true,
    variants: [
      FORM_TABLET("0.25mg", 30), FORM_TABLET("0.5mg", 30), FORM_TABLET("1mg", 30),
    ],
    brands: ["Xanax", "Alprax", "Xanor"],
  },
  {
    generic: "Clonazepam", category: "Controlled", rack: "B2", isControlled: true,
    variants: [
      FORM_TABLET("0.5mg", 30), FORM_TABLET("1mg", 30), FORM_TABLET("2mg", 30),
    ],
    brands: ["Rivotril", "Klonopin", "Clonotril"],
  },
  {
    generic: "Bromazepam", category: "Controlled", rack: "B2", isControlled: true,
    variants: [
      FORM_TABLET("1.5mg", 30), FORM_TABLET("3mg", 30), FORM_TABLET("6mg", 30),
    ],
    brands: ["Lexotanil", "Lectopam"],
  },
  {
    generic: "Zolpidem", category: "Controlled", rack: "B2", isControlled: true,
    variants: [
      FORM_TABLET("5mg", 10), FORM_TABLET("10mg", 10),
    ],
    brands: ["Stilnox", "Ambien", "Zolpid"],
  },
  {
    generic: "Sertraline", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("25mg", 30), FORM_TABLET("50mg", 30), FORM_TABLET("100mg", 30),
    ],
    brands: ["Zoloft", "Lustral", "Sertima"],
  },
  {
    generic: "Fluoxetine", category: "Neurology", rack: "B2",
    variants: [
      FORM_CAPSULE("10mg", 30), FORM_CAPSULE("20mg", 30), FORM_CAPSULE("40mg", 30),
    ],
    brands: ["Prozac", "Flunil", "Floxet", "Fluoxin"],
  },
  {
    generic: "Citalopram", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("10mg", 28), FORM_TABLET("20mg", 28), FORM_TABLET("40mg", 28),
    ],
    brands: ["Cipramil", "Celexa", "Citalin"],
  },
  {
    generic: "Escitalopram", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("5mg", 30), FORM_TABLET("10mg", 30), FORM_TABLET("20mg", 30),
    ],
    brands: ["Lexapro", "Cipralex", "Escimax"],
  },
  {
    generic: "Paroxetine", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("10mg", 30), FORM_TABLET("20mg", 30),
    ],
    brands: ["Paxil", "Seroxat", "Paroxin"],
  },
  {
    generic: "Venlafaxine", category: "Neurology", rack: "B2",
    variants: [
      FORM_CAPSULE("37.5mg SR", 30), FORM_CAPSULE("75mg SR", 30), FORM_CAPSULE("150mg SR", 30),
    ],
    brands: ["Effexor", "Venlor", "Venlafax"],
  },
  {
    generic: "Duloxetine", category: "Neurology", rack: "B2",
    variants: [
      FORM_CAPSULE("30mg", 30), FORM_CAPSULE("60mg", 30),
    ],
    brands: ["Cymbalta", "Duzela", "Dulonex"],
  },
  {
    generic: "Mirtazapine", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("15mg", 30), FORM_TABLET("30mg", 30), FORM_TABLET("45mg", 30),
    ],
    brands: ["Remeron", "Mirta", "Avanza"],
  },
  {
    generic: "Amitriptyline", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("10mg", 30), FORM_TABLET("25mg", 30), FORM_TABLET("75mg", 30),
    ],
    brands: ["Elavil", "Tryptanol", "Amitril"],
  },
  {
    generic: "Nortriptyline", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("10mg", 30), FORM_TABLET("25mg", 30),
    ],
    brands: ["Nortrip", "Pamelor"],
  },
  {
    generic: "Risperidone", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("0.5mg", 30), FORM_TABLET("1mg", 30), FORM_TABLET("2mg", 30),
      FORM_TABLET("4mg", 30),
    ],
    brands: ["Risperdal", "Sizodon", "Riscord"],
  },
  {
    generic: "Olanzapine", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("2.5mg", 30), FORM_TABLET("5mg", 30), FORM_TABLET("10mg", 30),
    ],
    brands: ["Zyprexa", "Olanzol", "Olapin"],
  },
  {
    generic: "Quetiapine", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("25mg", 30), FORM_TABLET("100mg", 30), FORM_TABLET("200mg", 30),
      FORM_TABLET("300mg", 30),
    ],
    brands: ["Seroquel", "Quetia", "Qutipin"],
  },
  {
    generic: "Aripiprazole", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("5mg", 30), FORM_TABLET("10mg", 30), FORM_TABLET("15mg", 30),
    ],
    brands: ["Abilify", "Aripip", "Arpizol"],
  },
  {
    generic: "Haloperidol", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("1.5mg", 30), FORM_TABLET("5mg", 30), FORM_INJ("5mg/mL", 1),
    ],
    brands: ["Haldol", "Halopin", "Serenace"],
  },
  {
    generic: "Carbamazepine", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("200mg", 30), FORM_TABLET("400mg CR", 30), FORM_SYRUP("100mg/5mL", 100),
    ],
    brands: ["Tegretol", "Carbazep", "Mazetol"],
  },
  {
    generic: "Phenytoin", category: "Neurology", rack: "B2",
    variants: [
      FORM_CAPSULE("100mg", 30), FORM_TABLET("100mg", 30), FORM_INJ("250mg/5mL", 5),
    ],
    brands: ["Dilantin", "Epanutin", "Eptoin"],
  },
  {
    generic: "Sodium Valproate", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("200mg EC", 30), FORM_TABLET("500mg EC", 30), FORM_TABLET("500mg CR", 30),
      FORM_SYRUP("200mg/5mL", 100),
    ],
    brands: ["Epilim", "Depakine", "Valpro", "Valparin"],
  },
  {
    generic: "Levetiracetam", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("250mg", 30), FORM_TABLET("500mg", 30), FORM_TABLET("1000mg", 30),
      FORM_SYRUP("100mg/mL", 150),
    ],
    brands: ["Keppra", "Levroxa", "Lerace"],
  },
  {
    generic: "Lamotrigine", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("25mg", 30), FORM_TABLET("50mg", 30), FORM_TABLET("100mg", 30),
    ],
    brands: ["Lamictal", "Lamez", "Lametec"],
  },
  {
    generic: "Gabapentin", category: "Neurology", rack: "B2",
    variants: [
      FORM_CAPSULE("100mg", 30), FORM_CAPSULE("300mg", 30), FORM_CAPSULE("400mg", 30),
    ],
    brands: ["Neurontin", "Gaba", "Gabaten"],
  },
  {
    generic: "Pregabalin", category: "Neurology", rack: "B2",
    variants: [
      FORM_CAPSULE("25mg", 30), FORM_CAPSULE("50mg", 30), FORM_CAPSULE("75mg", 30),
      FORM_CAPSULE("150mg", 30), FORM_CAPSULE("300mg", 30),
    ],
    brands: ["Lyrica", "Pregeb", "Pregbal"],
  },
  {
    generic: "Donepezil", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("5mg", 30), FORM_TABLET("10mg", 30),
    ],
    brands: ["Aricept", "Donep", "Donecept"],
  },
  {
    generic: "Levodopa + Carbidopa", category: "Neurology", rack: "B2",
    variants: [
      FORM_TABLET("100mg + 25mg", 30), FORM_TABLET("250mg + 25mg", 30),
    ],
    brands: ["Sinemet", "Syndopa", "Levocar"],
  },
  {
    generic: "ORS", category: "ORS", rack: "G1",
    variants: [
      FORM_SACHET("Orange 20.5g"), FORM_SACHET("Lemon 20.5g"), FORM_SACHET("Glucose 20.5g"),
      FORM_SACHET("Fruit Punch"),
    ],
    brands: ["Peditral", "Electral", "ORS-Lite", "Walyte", "Rehydral", "Hydration Plus"],
  },
  {
    generic: "Zinc + ORS", category: "ORS", rack: "G1",
    variants: [
      FORM_SACHET("Combo"),
    ],
    brands: ["ORS-Z", "Hydral-Z"],
  },
  {
    generic: "Furazolidone", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("100mg", 30), FORM_SYRUP("25mg/5mL", 60),
    ],
    brands: ["Furoxone", "Furazone"],
  },
  {
    generic: "Albendazole", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("400mg", 1), FORM_TABLET("400mg", 6), FORM_SYRUP("200mg/5mL", 10),
    ],
    brands: ["Zentel", "Albazole", "Bandy"],
  },
  {
    generic: "Mebendazole", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("100mg", 6), FORM_SYRUP("100mg/5mL", 30),
    ],
    brands: ["Vermox", "Mebex", "Mebendin"],
  },
  {
    generic: "Pyrantel Pamoate", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("250mg", 3), FORM_SYRUP("250mg/5mL", 15),
    ],
    brands: ["Combantrin", "Antiminth", "Pyrantel"],
  },
  {
    generic: "Praziquantel", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("600mg", 4),
    ],
    brands: ["Biltricide", "Cesol"],
  },
  {
    generic: "Diethylcarbamazine", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("50mg", 30), FORM_TABLET("100mg", 30),
    ],
    brands: ["Hetrazan", "Banocide"],
  },
  {
    generic: "Chloroquine", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("250mg", 10), FORM_SYRUP("50mg/5mL", 60),
    ],
    brands: ["Resochin", "Aralen", "Nivaquine"],
  },
  {
    generic: "Hydroxychloroquine", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("200mg", 10), FORM_TABLET("400mg", 10),
    ],
    brands: ["Plaquenil", "Quensyl", "HCQ"],
  },
  {
    generic: "Artemether + Lumefantrine", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("20mg + 120mg", 24), FORM_SYRUP("Suspension", 60),
    ],
    brands: ["Coartem", "Artequin", "Lumartem"],
  },
  {
    generic: "Sodium Chloride 0.9%", category: "ORS", rack: "F1",
    variants: [
      FORM_INJ("100mL Bag", 100), FORM_INJ("250mL Bag", 250), FORM_INJ("500mL Bag", 500),
      FORM_INJ("1000mL Bag", 1000),
    ],
    brands: ["Normal Saline", "NS", "Sodium Chloride"],
  },
  {
    generic: "Dextrose 5%", category: "ORS", rack: "F1",
    variants: [
      FORM_INJ("250mL", 250), FORM_INJ("500mL", 500), FORM_INJ("1000mL", 1000),
    ],
    brands: ["D5W", "Dextrose 5%", "Glucose 5%"],
  },
  {
    generic: "Dextrose Saline", category: "ORS", rack: "F1",
    variants: [
      FORM_INJ("500mL", 500), FORM_INJ("1000mL", 1000),
    ],
    brands: ["DNS", "Dextrose Saline"],
  },
  {
    generic: "Ringer Lactate", category: "ORS", rack: "F1",
    variants: [
      FORM_INJ("500mL", 500), FORM_INJ("1000mL", 1000),
    ],
    brands: ["Ringer's Lactate", "RL", "Hartmann's"],
  },
  {
    generic: "Levothyroxine", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("25mcg", 100), FORM_TABLET("50mcg", 100), FORM_TABLET("75mcg", 100),
      FORM_TABLET("100mcg", 100), FORM_TABLET("125mcg", 100), FORM_TABLET("150mcg", 100),
    ],
    brands: ["Eltroxin", "Synthroid", "Thyroxin", "Thyrox"],
  },
  {
    generic: "Methimazole", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("5mg", 30), FORM_TABLET("10mg", 30),
    ],
    brands: ["Tapazole", "Methizol", "Carbimazole"],
  },
  {
    generic: "Carbimazole", category: "Diabetes", rack: "D1",
    variants: [
      FORM_TABLET("5mg", 100), FORM_TABLET("10mg", 100),
    ],
    brands: ["Neo-Mercazole", "Carbozole"],
  },
  {
    generic: "Prednisolone", category: "Analgesics", rack: "F1",
    variants: [
      FORM_TABLET("5mg", 30), FORM_TABLET("10mg", 30), FORM_TABLET("20mg", 30),
      FORM_DROPS("1% Eye", 5), FORM_SYRUP("5mg/5mL", 60),
    ],
    brands: ["Predfoam", "Deltacortril", "Predmix", "Pred-Forte"],
  },
  {
    generic: "Methylprednisolone", category: "Analgesics", rack: "F1",
    variants: [
      FORM_TABLET("4mg", 30), FORM_TABLET("16mg", 30), FORM_INJ("125mg", 1),
      FORM_INJ("500mg", 1),
    ],
    brands: ["Medrol", "Solu-Medrol", "Methpred"],
  },
  {
    generic: "Dexamethasone", category: "Analgesics", rack: "F1",
    variants: [
      FORM_TABLET("0.5mg", 30), FORM_TABLET("4mg", 30), FORM_INJ("4mg/mL", 1),
      FORM_INJ("8mg/2mL", 2), FORM_DROPS("0.1% Eye", 5),
    ],
    brands: ["Decadron", "Dexa", "Dexamax", "Decdan"],
  },
  {
    generic: "Cromolyn Sodium Eye", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("2% Eye", 5),
    ],
    brands: ["Opticrom", "Crolom"],
  },
  {
    generic: "Olopatadine Eye", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("0.1% Eye", 5), FORM_DROPS("0.2% Eye", 5),
    ],
    brands: ["Patanol", "Opatanol", "Olopat"],
  },
  {
    generic: "Pheniramine + Naphazoline Eye", category: "Ophthalmology", rack: "H1",
    variants: [
      FORM_DROPS("Eye", 5), FORM_DROPS("Eye", 10),
    ],
    brands: ["Naphcon-A", "Visine-A"],
  },
  {
    generic: "Esomeprazole + Domperidone", category: "Antacids", rack: "G1",
    variants: [
      FORM_CAPSULE("20mg + 30mg", 14), FORM_CAPSULE("40mg + 30mg", 14),
    ],
    brands: ["Esmpra-D", "Esoz-D"],
  },
  {
    generic: "Pantoprazole + Domperidone", category: "Antacids", rack: "G1",
    variants: [
      FORM_CAPSULE("40mg + 30mg", 14),
    ],
    brands: ["Pantop-D", "Pantosec-D"],
  },
  {
    generic: "Norfloxacin + Tinidazole", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("400mg + 600mg", 10),
    ],
    brands: ["Norflox-TZ", "Notinid"],
  },
  {
    generic: "Ofloxacin + Ornidazole", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("200mg + 500mg", 10), FORM_SYRUP("Suspension", 60),
    ],
    brands: ["Ofloz", "Zenflox-OZ"],
  },
  {
    generic: "Cefixime + Ofloxacin", category: "Antibiotics", rack: "B2",
    variants: [
      FORM_TABLET("200mg + 200mg", 10),
    ],
    brands: ["Zifi-O", "Cefolac-O"],
  },
  {
    generic: "Sildenafil", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("25mg", 4), FORM_TABLET("50mg", 4), FORM_TABLET("100mg", 4),
    ],
    brands: ["Viagra", "Suhagra", "Manforce"],
  },
  {
    generic: "Tadalafil", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("5mg", 14), FORM_TABLET("10mg", 4), FORM_TABLET("20mg", 4),
    ],
    brands: ["Cialis", "Tadacip", "Megalis"],
  },
  {
    generic: "Finasteride", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("1mg", 30), FORM_TABLET("5mg", 30),
    ],
    brands: ["Proscar", "Propecia", "Finpecia"],
  },
  {
    generic: "Tamsulosin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_CAPSULE("0.4mg", 30),
    ],
    brands: ["Flomax", "Urimax", "Tamlosin"],
  },
  {
    generic: "Solifenacin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("5mg", 30), FORM_TABLET("10mg", 30),
    ],
    brands: ["Vesicare", "Solifin"],
  },
  {
    generic: "Oxybutynin", category: "Cardiovascular", rack: "C1",
    variants: [
      FORM_TABLET("5mg", 30),
    ],
    brands: ["Ditropan", "Oxytrol"],
  },
];

// Generate ~60 additional manufacturer suffix brand names per generic so each
// generic gets 50+ brand variations across the catalog.
function manufacturerBrandsFor(genericShort: string): string[] {
  return MANUFACTURERS.map((m) => `${genericShort}-${m.code}`);
}

function shortName(generic: string): string {
  // First word, max 6 chars
  const w = generic.split(/[\s+(]/)[0]?.trim() ?? generic;
  return w.slice(0, 6);
}

export async function seedBulkMedicines(
  db: typeof DbType,
  log: (msg: string) => void,
): Promise<void> {
  // Ensure manufacturers exist
  const existingCos = await db.select().from(schema.companiesTable);
  const existingCoNames = new Set(existingCos.map((c) => c.name));
  const newCos = MANUFACTURERS.filter((m) => !existingCoNames.has(m.name));
  if (newCos.length) {
    await db.insert(schema.companiesTable).values(
      newCos.map((m) => ({ name: m.name })),
    );
  }

  // Ensure categories from generics exist
  const allCats = Array.from(new Set(GENERICS.map((g) => g.category)));
  const existingCats = await db.select().from(schema.categoriesTable);
  const existingCatNames = new Set(existingCats.map((c) => c.name));
  const newCats = allCats.filter(
    (c) => ![...existingCatNames].some((ec) => ec.startsWith(c)),
  );
  if (newCats.length) {
    await db.insert(schema.categoriesTable).values(
      newCats.map((c) => ({ name: c })),
    );
  }

  // Ensure units exist (forms used)
  const allForms = Array.from(
    new Set(GENERICS.flatMap((g) => g.variants.map((v) => v.form))),
  );
  const existingUnits = await db.select().from(schema.unitsTable);
  const existingUnitNames = new Set(existingUnits.map((u) => u.name));
  const newUnits = allForms.filter((f) => !existingUnitNames.has(f));
  if (newUnits.length) {
    await db.insert(schema.unitsTable).values(newUnits.map((n) => ({ name: n })));
  }

  // Ensure racks exist
  const allRacks = Array.from(new Set(GENERICS.map((g) => g.rack)));
  const existingRacks = await db.select().from(schema.racksTable);
  const existingRackNames = new Set(existingRacks.map((r) => r.name));
  const newRacks = allRacks.filter((r) => !existingRackNames.has(r));
  if (newRacks.length) {
    await db.insert(schema.racksTable).values(newRacks.map((n) => ({ name: n })));
  }

  // Ensure generics exist
  const existingGN = await db.select().from(schema.genericNamesTable);
  const existingGNames = new Set(existingGN.map((g) => g.name));
  const newGN = GENERICS.filter((g) => !existingGNames.has(g.generic));
  if (newGN.length) {
    await db.insert(schema.genericNamesTable).values(
      newGN.map((g) => ({ name: g.generic })),
    );
  }

  // Refetch reference IDs
  const cats = await db.select().from(schema.categoriesTable);
  const cos = await db.select().from(schema.companiesTable);
  const units = await db.select().from(schema.unitsTable);
  const racks = await db.select().from(schema.racksTable);
  const gns = await db.select().from(schema.genericNamesTable);

  const catId = (n: string) => cats.find((c) => c.name === n || c.name.startsWith(n))?.id;
  const coId = (n: string) => cos.find((c) => c.name === n)?.id;
  const unitId = (n: string) => units.find((u) => u.name === n)?.id;
  const rackId = (n: string) => racks.find((r) => r.name === n)?.id;
  const gnId = (n: string) => gns.find((g) => g.name === n)?.id;

  // Manufacturer rotation
  const manufacturerNames = MANUFACTURERS.map((m) => m.name);
  let mIdx = 0;
  const nextManufacturer = (): number | undefined => {
    const name = manufacturerNames[mIdx % manufacturerNames.length] ?? manufacturerNames[0];
    mIdx++;
    return name ? coId(name) : undefined;
  };

  const rows: Array<typeof schema.medicinesTable.$inferInsert> = [];
  const seenNames = new Set<string>();

  for (const g of GENERICS) {
    const allBrands = [
      ...g.brands,
      ...manufacturerBrandsFor(shortName(g.generic)),
    ];

    for (const v of g.variants) {
      for (const brand of allBrands) {
        const formShort = v.form
          .replace(/\s*\(.*\)/, "")
          .replace(/Syrup$/, "Syrup")
          .replace(/Injection$/, "Injection");
        const name = `${brand} ${v.strength} ${formShort}`;
        if (seenNames.has(name)) continue;
        seenNames.add(name);
        rows.push({
          name,
          genericNameId: gnId(g.generic) ?? null,
          categoryId: catId(g.category) ?? null,
          companyId: nextManufacturer() ?? null,
          unitId: unitId(v.form) ?? null,
          rackId: rackId(g.rack) ?? null,
          strength: v.strength,
          packingLabel: v.packLabel,
          unitsPerPack: Math.max(1, Math.round(v.unitsPerPack)),
          purchasePriceUnit: "0",
          salePriceUnit: "0",
          salePricePack: "0",
          minStock: 10,
          isControlled: g.isControlled ?? false,
          requiresPrescription: g.isControlled ?? false,
          isActive: true,
        });
      }
    }
  }

  // De-dupe vs existing DB names
  const existingMeds = await db.select({ name: schema.medicinesTable.name }).from(schema.medicinesTable);
  const existingMedNames = new Set(existingMeds.map((m) => m.name));
  const fresh = rows.filter((r) => !existingMedNames.has(r.name));

  log(`Bulk seed: generated ${rows.length} candidates, ${fresh.length} new to insert`);

  // Batch insert (DB driver limits parameter count)
  const BATCH = 500;
  for (let i = 0; i < fresh.length; i += BATCH) {
    const slice = fresh.slice(i, i + BATCH);
    await db.insert(schema.medicinesTable).values(slice);
    if (i % 5000 === 0) log(`  Inserted ${Math.min(i + BATCH, fresh.length)}/${fresh.length}`);
  }
  log(`Bulk seed complete. Total medicines now in DB.`);
}
