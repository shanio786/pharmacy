import bcrypt from "bcryptjs";
import * as schema from "@workspace/db";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // 1. Admin user
  const existingUsers = await db.select().from(schema.usersTable).limit(1);
  if (!existingUsers.length) {
    const { randomBytes } = await import("node:crypto");
    const genPassword = () => randomBytes(12).toString("base64url").slice(0, 16);
    const adminPassword = process.env["ADMIN_PASSWORD"] ?? genPassword();
    const managerPassword = process.env["MANAGER_PASSWORD"] ?? genPassword();
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(schema.usersTable).values({
      username: "admin",
      passwordHash,
      fullName: "System Administrator",
      role: "admin",
      isActive: true,
    });
    const mgrHash = await bcrypt.hash(managerPassword, 10);
    await db.insert(schema.usersTable).values({
      username: "manager",
      passwordHash: mgrHash,
      fullName: "Ahmed Khan",
      role: "manager",
      isActive: true,
    });
    if (!process.env["ADMIN_PASSWORD"]) {
      console.log("=".repeat(60));
      console.log("INITIAL CREDENTIALS (save these — shown only once):");
      console.log(`  admin    password: ${adminPassword}`);
      console.log(`  manager  password: ${managerPassword}`);
      console.log("Set ADMIN_PASSWORD / MANAGER_PASSWORD env vars to control these.");
      console.log("=".repeat(60));
    } else {
      console.log("Created admin and manager users from environment variables.");
    }
  }

  // 2. Settings
  const existingSettings = await db.select().from(schema.settingsTable).limit(1);
  if (!existingSettings.length) {
    await db.insert(schema.settingsTable).values({
      pharmacyName: "Al-Shifa Pharmacy",
      address: "Shop #12, Saddar Bazaar, Karachi",
      phone: "021-35678901",
      email: "alshifa@pharmacy.pk",
      currency: "PKR",
      expiryAlertDays: 90,
      lowStockThreshold: 10,
    });
  }

  // 3. Categories
  const existingCats = await db.select().from(schema.categoriesTable).limit(1);
  if (!existingCats.length) {
    await db.insert(schema.categoriesTable).values([
      { name: "Analgesics & Antipyretics", description: "Pain killers and fever reducers" },
      { name: "Antibiotics", description: "Bacterial infection treatments" },
      { name: "Antifungals", description: "Fungal infection treatments" },
      { name: "Antivirals", description: "Viral infection treatments" },
      { name: "Antihistamines", description: "Allergy treatments" },
      { name: "Antacids & GI", description: "Gastrointestinal medicines" },
      { name: "Cardiovascular", description: "Heart and blood pressure medicines" },
      { name: "Diabetes", description: "Antidiabetic medicines" },
      { name: "Respiratory", description: "Asthma and lung medicines" },
      { name: "Vitamins & Supplements", description: "Nutritional supplements" },
      { name: "Dermatology", description: "Skin medicines" },
      { name: "Ophthalmology", description: "Eye medicines" },
      { name: "Neurology", description: "Nervous system medicines" },
      { name: "Controlled Substances", description: "Controlled drugs requiring prescription" },
      { name: "ORS & Hydration", description: "Oral rehydration therapy" },
    ]);
  }

  // 4. Companies
  const existingCos = await db.select().from(schema.companiesTable).limit(1);
  if (!existingCos.length) {
    await db.insert(schema.companiesTable).values([
      { name: "Abbott Pakistan", contact: "021-111-222-311" },
      { name: "Getz Pharma", contact: "021-111-222-332" },
      { name: "Searle Pakistan", contact: "021-111-222-444" },
      { name: "Sami Pharmaceuticals", contact: "021-111-222-555" },
      { name: "Hilton Pharma", contact: "021-111-222-666" },
      { name: "Ferozsons Laboratories", contact: "042-111-222-777" },
      { name: "GSK Pakistan", contact: "021-111-222-888" },
      { name: "Novartis Pakistan", contact: "021-111-222-999" },
      { name: "Pfizer Pakistan", contact: "021-111-222-000" },
      { name: "AGP Limited", contact: "021-111-222-123" },
      { name: "Reckitt Pakistan", contact: "021-111-222-234" },
      { name: "OBS Pakistan", contact: "021-111-222-345" },
    ]);
  }

  // 5. Units
  const existingUnits = await db.select().from(schema.unitsTable).limit(1);
  if (!existingUnits.length) {
    await db.insert(schema.unitsTable).values([
      { name: "Tablet" },
      { name: "Capsule" },
      { name: "Syrup (mL)" },
      { name: "Injection (mL)" },
      { name: "Sachet" },
      { name: "Cream (g)" },
      { name: "Drops" },
      { name: "Inhaler (puff)" },
      { name: "Patch" },
      { name: "Suppository" },
    ]);
  }

  // 6. Racks
  const existingRacks = await db.select().from(schema.racksTable).limit(1);
  if (!existingRacks.length) {
    await db.insert(schema.racksTable).values([
      { name: "A1", description: "Analgesics shelf 1" },
      { name: "A2", description: "Analgesics shelf 2" },
      { name: "B1", description: "Antibiotics shelf 1" },
      { name: "B2", description: "Antibiotics shelf 2" },
      { name: "C1", description: "Cardiovascular" },
      { name: "D1", description: "Diabetes" },
      { name: "E1", description: "Respiratory" },
      { name: "F1", description: "Vitamins & Supplements" },
      { name: "G1", description: "GI medicines" },
      { name: "H1", description: "Dermatology" },
      { name: "COLD", description: "Refrigerated storage" },
    ]);
  }

  // 7. Generic Names
  const existingGN = await db.select().from(schema.genericNamesTable).limit(1);
  if (!existingGN.length) {
    await db.insert(schema.genericNamesTable).values([
      { name: "Paracetamol" },
      { name: "Ibuprofen" },
      { name: "Aspirin" },
      { name: "Diclofenac Sodium" },
      { name: "Mefenamic Acid" },
      { name: "Amoxicillin" },
      { name: "Amoxicillin + Clavulanate" },
      { name: "Azithromycin" },
      { name: "Ciprofloxacin" },
      { name: "Levofloxacin" },
      { name: "Metronidazole" },
      { name: "Clindamycin" },
      { name: "Cefixime" },
      { name: "Ceftriaxone" },
      { name: "Doxycycline" },
      { name: "Clarithromycin" },
      { name: "Fluconazole" },
      { name: "Clotrimazole" },
      { name: "Oseltamivir" },
      { name: "Cetirizine" },
      { name: "Loratadine" },
      { name: "Fexofenadine" },
      { name: "Chlorphenamine" },
      { name: "Omeprazole" },
      { name: "Pantoprazole" },
      { name: "Ranitidine" },
      { name: "Metoclopramide" },
      { name: "Domperidone" },
      { name: "Lactulose" },
      { name: "Bisacodyl" },
      { name: "Amlodipine" },
      { name: "Atenolol" },
      { name: "Lisinopril" },
      { name: "Losartan" },
      { name: "Valsartan" },
      { name: "Atorvastatin" },
      { name: "Rosuvastatin" },
      { name: "Metformin" },
      { name: "Glibenclamide" },
      { name: "Glimepiride" },
      { name: "Insulin (Human Regular)" },
      { name: "Salbutamol" },
      { name: "Ipratropium Bromide" },
      { name: "Budesonide" },
      { name: "Theophylline" },
      { name: "Vitamin C" },
      { name: "Vitamin D3" },
      { name: "Vitamin B Complex" },
      { name: "Calcium + Vitamin D" },
      { name: "Iron (Ferrous Sulfate)" },
      { name: "Folic Acid" },
      { name: "Zinc" },
      { name: "Betamethasone" },
      { name: "Hydrocortisone" },
      { name: "Mupirocin" },
      { name: "Ciprofloxacin Eye Drops" },
      { name: "Timolol" },
      { name: "Diazepam" },
      { name: "Alprazolam" },
      { name: "Tramadol" },
      { name: "Codeine" },
      { name: "ORS" },
    ]);
  }

  // Fetch IDs for medicines
  const cats = await db.select().from(schema.categoriesTable);
  const cos = await db.select().from(schema.companiesTable);
  const units = await db.select().from(schema.unitsTable);
  const racks = await db.select().from(schema.racksTable);
  const gns = await db.select().from(schema.genericNamesTable);

  const catId = (name: string) => cats.find((c) => c.name.startsWith(name))?.id;
  const coId = (name: string) => cos.find((c) => c.name.startsWith(name))?.id;
  const unitId = (name: string) => units.find((u) => u.name.startsWith(name))?.id;
  const rackId = (name: string) => racks.find((r) => r.name === name)?.id;
  const gnId = (name: string) => gns.find((g) => g.name === name)?.id;

  // 8. Medicines (100+)
  const existingMeds = await db.select().from(schema.medicinesTable).limit(1);
  if (!existingMeds.length) {
    const medicines = [
      // Analgesics
      { name: "Panadol 500mg Tablet", genericNameId: gnId("Paracetamol"), categoryId: catId("Analgesics"), companyId: coId("GSK"), unitId: unitId("Tablet"), rackId: rackId("A1"), strength: "500mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "3.50", salePriceUnit: "5.00", salePricePack: "50.00", minStock: 100 },
      { name: "Panadol Extra 500mg+65mg", genericNameId: gnId("Paracetamol"), categoryId: catId("Analgesics"), companyId: coId("GSK"), unitId: unitId("Tablet"), rackId: rackId("A1"), strength: "500mg+65mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "5.00", salePriceUnit: "7.00", salePricePack: "70.00", minStock: 50 },
      { name: "Brufen 400mg Tablet", genericNameId: gnId("Ibuprofen"), categoryId: catId("Analgesics"), companyId: coId("Abbott"), unitId: unitId("Tablet"), rackId: rackId("A1"), strength: "400mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "4.00", salePriceUnit: "6.00", salePricePack: "120.00", minStock: 50 },
      { name: "Brufen Syrup 100mg/5mL", genericNameId: gnId("Ibuprofen"), categoryId: catId("Analgesics"), companyId: coId("Abbott"), unitId: unitId("Syrup"), rackId: rackId("A1"), strength: "100mg/5mL", packingLabel: "60mL Bottle", unitsPerPack: 60, purchasePriceUnit: "3.00", salePriceUnit: "4.50", salePricePack: "270.00", minStock: 30 },
      { name: "Voltaren 50mg Tablet", genericNameId: gnId("Diclofenac"), categoryId: catId("Analgesics"), companyId: coId("Novartis"), unitId: unitId("Tablet"), rackId: rackId("A1"), strength: "50mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "6.00", salePriceUnit: "9.00", salePricePack: "90.00", minStock: 30 },
      { name: "Ponstan 250mg Capsule", genericNameId: gnId("Mefenamic"), categoryId: catId("Analgesics"), companyId: coId("Pfizer"), unitId: unitId("Capsule"), rackId: rackId("A1"), strength: "250mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "5.50", salePriceUnit: "8.00", salePricePack: "80.00", minStock: 30 },
      // Antibiotics
      { name: "Amoxil 500mg Capsule", genericNameId: gnId("Amoxicillin"), categoryId: catId("Antibiotics"), companyId: coId("GSK"), unitId: unitId("Capsule"), rackId: rackId("B1"), strength: "500mg", packingLabel: "Strip of 6", unitsPerPack: 6, purchasePriceUnit: "10.00", salePriceUnit: "15.00", salePricePack: "90.00", minStock: 50 },
      { name: "Amoxil 250mg Syrup", genericNameId: gnId("Amoxicillin"), categoryId: catId("Antibiotics"), companyId: coId("GSK"), unitId: unitId("Syrup"), rackId: rackId("B1"), strength: "250mg/5mL", packingLabel: "60mL Bottle", unitsPerPack: 60, purchasePriceUnit: "5.00", salePriceUnit: "8.00", salePricePack: "480.00", minStock: 20 },
      { name: "Augmentin 625mg Tablet", genericNameId: gnId("Amoxicillin + Clavulanate"), categoryId: catId("Antibiotics"), companyId: coId("GSK"), unitId: unitId("Tablet"), rackId: rackId("B1"), strength: "625mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "30.00", salePriceUnit: "45.00", salePricePack: "630.00", minStock: 20 },
      { name: "Zithromax 250mg Capsule", genericNameId: gnId("Azithromycin"), categoryId: catId("Antibiotics"), companyId: coId("Pfizer"), unitId: unitId("Capsule"), rackId: rackId("B1"), strength: "250mg", packingLabel: "Strip of 6", unitsPerPack: 6, purchasePriceUnit: "45.00", salePriceUnit: "65.00", salePricePack: "390.00", minStock: 20 },
      { name: "Cipro 500mg Tablet", genericNameId: gnId("Ciprofloxacin"), categoryId: catId("Antibiotics"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("B1"), strength: "500mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "15.00", salePriceUnit: "22.00", salePricePack: "220.00", minStock: 30 },
      { name: "Levoflox 500mg Tablet", genericNameId: gnId("Levofloxacin"), categoryId: catId("Antibiotics"), companyId: coId("Getz"), unitId: unitId("Tablet"), rackId: rackId("B1"), strength: "500mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "25.00", salePriceUnit: "38.00", salePricePack: "380.00", minStock: 20 },
      { name: "Flagyl 400mg Tablet", genericNameId: gnId("Metronidazole"), categoryId: catId("Antibiotics"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("B1"), strength: "400mg", packingLabel: "Strip of 21", unitsPerPack: 21, purchasePriceUnit: "3.50", salePriceUnit: "5.50", salePricePack: "115.50", minStock: 30 },
      { name: "Dalacin C 300mg Capsule", genericNameId: gnId("Clindamycin"), categoryId: catId("Antibiotics"), companyId: coId("Pfizer"), unitId: unitId("Capsule"), rackId: rackId("B2"), strength: "300mg", packingLabel: "Strip of 16", unitsPerPack: 16, purchasePriceUnit: "35.00", salePriceUnit: "52.00", salePricePack: "832.00", minStock: 10 },
      { name: "Suprax 400mg Capsule", genericNameId: gnId("Cefixime"), categoryId: catId("Antibiotics"), companyId: coId("Searle"), unitId: unitId("Capsule"), rackId: rackId("B2"), strength: "400mg", packingLabel: "Strip of 5", unitsPerPack: 5, purchasePriceUnit: "55.00", salePriceUnit: "82.00", salePricePack: "410.00", minStock: 15 },
      { name: "Vibramycin 100mg Capsule", genericNameId: gnId("Doxycycline"), categoryId: catId("Antibiotics"), companyId: coId("Pfizer"), unitId: unitId("Capsule"), rackId: rackId("B2"), strength: "100mg", packingLabel: "Strip of 8", unitsPerPack: 8, purchasePriceUnit: "18.00", salePriceUnit: "28.00", salePricePack: "224.00", minStock: 15 },
      { name: "Klaricid 500mg Tablet", genericNameId: gnId("Clarithromycin"), categoryId: catId("Antibiotics"), companyId: coId("Abbott"), unitId: unitId("Tablet"), rackId: rackId("B2"), strength: "500mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "50.00", salePriceUnit: "75.00", salePricePack: "1050.00", minStock: 10 },
      // Antifungals
      { name: "Diflucan 150mg Capsule", genericNameId: gnId("Fluconazole"), categoryId: catId("Antifungals"), companyId: coId("Pfizer"), unitId: unitId("Capsule"), rackId: rackId("H1"), strength: "150mg", packingLabel: "Single Capsule", unitsPerPack: 1, purchasePriceUnit: "120.00", salePriceUnit: "180.00", salePricePack: "180.00", minStock: 20 },
      { name: "Canesten 1% Cream", genericNameId: gnId("Clotrimazole"), categoryId: catId("Antifungals"), companyId: coId("Reckitt"), unitId: unitId("Cream"), rackId: rackId("H1"), strength: "1%", packingLabel: "20g Tube", unitsPerPack: 20, purchasePriceUnit: "4.00", salePriceUnit: "6.00", salePricePack: "120.00", minStock: 10 },
      // Antivirals
      { name: "Tamiflu 75mg Capsule", genericNameId: gnId("Oseltamivir"), categoryId: catId("Antivirals"), companyId: coId("AGP"), unitId: unitId("Capsule"), rackId: rackId("B2"), strength: "75mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "180.00", salePriceUnit: "260.00", salePricePack: "2600.00", minStock: 5 },
      // Antihistamines
      { name: "Zyrtec 10mg Tablet", genericNameId: gnId("Cetirizine"), categoryId: catId("Antihistamines"), companyId: coId("GSK"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "10mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "5.00", salePriceUnit: "8.00", salePricePack: "80.00", minStock: 40 },
      { name: "Claritine 10mg Tablet", genericNameId: gnId("Loratadine"), categoryId: catId("Antihistamines"), companyId: coId("OBS"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "10mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "8.00", salePriceUnit: "12.00", salePricePack: "120.00", minStock: 30 },
      { name: "Allegra 120mg Tablet", genericNameId: gnId("Fexofenadine"), categoryId: catId("Antihistamines"), companyId: coId("AGP"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "120mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "18.00", salePriceUnit: "26.00", salePricePack: "260.00", minStock: 20 },
      { name: "Piriton 4mg Tablet", genericNameId: gnId("Chlorphenamine"), categoryId: catId("Antihistamines"), companyId: coId("GSK"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "4mg", packingLabel: "Strip of 25", unitsPerPack: 25, purchasePriceUnit: "2.00", salePriceUnit: "3.50", salePricePack: "87.50", minStock: 30 },
      // GI medicines
      { name: "Losec 20mg Capsule", genericNameId: gnId("Omeprazole"), categoryId: catId("Antacids"), companyId: coId("Abbott"), unitId: unitId("Capsule"), rackId: rackId("G1"), strength: "20mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "12.00", salePriceUnit: "18.00", salePricePack: "252.00", minStock: 40 },
      { name: "Pantoloc 40mg Tablet", genericNameId: gnId("Pantoprazole"), categoryId: catId("Antacids"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("G1"), strength: "40mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "15.00", salePriceUnit: "22.00", salePricePack: "308.00", minStock: 30 },
      { name: "Motilium 10mg Tablet", genericNameId: gnId("Domperidone"), categoryId: catId("Antacids"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("G1"), strength: "10mg", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "4.50", salePriceUnit: "7.00", salePricePack: "210.00", minStock: 30 },
      { name: "Maxolon 10mg Tablet", genericNameId: gnId("Metoclopramide"), categoryId: catId("Antacids"), companyId: coId("Getz"), unitId: unitId("Tablet"), rackId: rackId("G1"), strength: "10mg", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "3.00", salePriceUnit: "5.00", salePricePack: "150.00", minStock: 20 },
      { name: "Duphalac 667mg/mL Syrup", genericNameId: gnId("Lactulose"), categoryId: catId("Antacids"), companyId: coId("Abbott"), unitId: unitId("Syrup"), rackId: rackId("G1"), strength: "667mg/mL", packingLabel: "200mL Bottle", unitsPerPack: 200, purchasePriceUnit: "2.50", salePriceUnit: "4.00", salePricePack: "800.00", minStock: 15 },
      { name: "Dulcolax 5mg Tablet", genericNameId: gnId("Bisacodyl"), categoryId: catId("Antacids"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("G1"), strength: "5mg", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "3.50", salePriceUnit: "5.50", salePricePack: "165.00", minStock: 20 },
      // Cardiovascular
      { name: "Norvasc 5mg Tablet", genericNameId: gnId("Amlodipine"), categoryId: catId("Cardiovascular"), companyId: coId("Pfizer"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "5mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "20.00", salePriceUnit: "30.00", salePricePack: "420.00", minStock: 30 },
      { name: "Tenormin 50mg Tablet", genericNameId: gnId("Atenolol"), categoryId: catId("Cardiovascular"), companyId: coId("Abbott"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "50mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "8.00", salePriceUnit: "12.00", salePricePack: "168.00", minStock: 30 },
      { name: "Zestril 10mg Tablet", genericNameId: gnId("Lisinopril"), categoryId: catId("Cardiovascular"), companyId: coId("Abbott"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "10mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "12.00", salePriceUnit: "18.00", salePricePack: "252.00", minStock: 25 },
      { name: "Cozaar 50mg Tablet", genericNameId: gnId("Losartan"), categoryId: catId("Cardiovascular"), companyId: coId("OBS"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "50mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "22.00", salePriceUnit: "33.00", salePricePack: "462.00", minStock: 20 },
      { name: "Diovan 80mg Tablet", genericNameId: gnId("Valsartan"), categoryId: catId("Cardiovascular"), companyId: coId("Novartis"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "80mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "28.00", salePriceUnit: "42.00", salePricePack: "588.00", minStock: 15 },
      { name: "Lipitor 10mg Tablet", genericNameId: gnId("Atorvastatin"), categoryId: catId("Cardiovascular"), companyId: coId("Pfizer"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "10mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "25.00", salePriceUnit: "38.00", salePricePack: "532.00", minStock: 25 },
      { name: "Crestor 10mg Tablet", genericNameId: gnId("Rosuvastatin"), categoryId: catId("Cardiovascular"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "10mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "35.00", salePriceUnit: "52.00", salePricePack: "728.00", minStock: 20 },
      // Diabetes
      { name: "Glucophage 500mg Tablet", genericNameId: gnId("Metformin"), categoryId: catId("Diabetes"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("D1"), strength: "500mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "4.00", salePriceUnit: "6.00", salePricePack: "120.00", minStock: 50 },
      { name: "Glucophage 1000mg Tablet", genericNameId: gnId("Metformin"), categoryId: catId("Diabetes"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("D1"), strength: "1000mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "7.00", salePriceUnit: "10.00", salePricePack: "200.00", minStock: 30 },
      { name: "Daonil 5mg Tablet", genericNameId: gnId("Glibenclamide"), categoryId: catId("Diabetes"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("D1"), strength: "5mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "3.00", salePriceUnit: "5.00", salePricePack: "100.00", minStock: 30 },
      { name: "Amaryl 2mg Tablet", genericNameId: gnId("Glimepiride"), categoryId: catId("Diabetes"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("D1"), strength: "2mg", packingLabel: "Strip of 15", unitsPerPack: 15, purchasePriceUnit: "12.00", salePriceUnit: "18.00", salePricePack: "270.00", minStock: 20 },
      { name: "Actrapid 100IU/mL Injection", genericNameId: gnId("Insulin"), categoryId: catId("Diabetes"), companyId: coId("Novartis"), unitId: unitId("Injection"), rackId: rackId("COLD"), strength: "100IU/mL", packingLabel: "10mL Vial", unitsPerPack: 10, purchasePriceUnit: "60.00", salePriceUnit: "90.00", salePricePack: "900.00", minStock: 10 },
      // Respiratory
      { name: "Ventolin 100mcg Inhaler", genericNameId: gnId("Salbutamol"), categoryId: catId("Respiratory"), companyId: coId("GSK"), unitId: unitId("Inhaler"), rackId: rackId("E1"), strength: "100mcg/puff", packingLabel: "200 puffs", unitsPerPack: 200, purchasePriceUnit: "1.20", salePriceUnit: "1.80", salePricePack: "360.00", minStock: 15 },
      { name: "Ventolin Nebules 2.5mg", genericNameId: gnId("Salbutamol"), categoryId: catId("Respiratory"), companyId: coId("GSK"), unitId: unitId("Syrup"), rackId: rackId("E1"), strength: "2.5mg/2.5mL", packingLabel: "Box of 20", unitsPerPack: 20, purchasePriceUnit: "18.00", salePriceUnit: "28.00", salePricePack: "560.00", minStock: 10 },
      { name: "Pulmicort 100mcg Inhaler", genericNameId: gnId("Budesonide"), categoryId: catId("Respiratory"), companyId: coId("Novartis"), unitId: unitId("Inhaler"), rackId: rackId("E1"), strength: "100mcg/puff", packingLabel: "200 puffs", unitsPerPack: 200, purchasePriceUnit: "4.00", salePriceUnit: "6.00", salePricePack: "1200.00", minStock: 10 },
      // Vitamins & Supplements
      { name: "Vitamin C 500mg Tablet", genericNameId: gnId("Vitamin C"), categoryId: catId("Vitamins"), companyId: coId("Getz"), unitId: unitId("Tablet"), rackId: rackId("F1"), strength: "500mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "4.00", salePriceUnit: "6.00", salePricePack: "60.00", minStock: 50 },
      { name: "Vitamin D3 1000IU Capsule", genericNameId: gnId("Vitamin D3"), categoryId: catId("Vitamins"), companyId: coId("AGP"), unitId: unitId("Capsule"), rackId: rackId("F1"), strength: "1000IU", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "8.00", salePriceUnit: "12.00", salePricePack: "120.00", minStock: 30 },
      { name: "Neurobion Forte Tablet", genericNameId: gnId("Vitamin B Complex"), categoryId: catId("Vitamins"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("F1"), strength: "B1+B6+B12", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "5.00", salePriceUnit: "7.50", salePricePack: "225.00", minStock: 40 },
      { name: "Calcivit D Tablet", genericNameId: gnId("Calcium + Vitamin D"), categoryId: catId("Vitamins"), companyId: coId("Abbott"), unitId: unitId("Tablet"), rackId: rackId("F1"), strength: "500mg+200IU", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "10.00", salePriceUnit: "15.00", salePricePack: "150.00", minStock: 30 },
      { name: "Ferrous Sulfate 200mg Tablet", genericNameId: gnId("Iron"), categoryId: catId("Vitamins"), companyId: coId("Getz"), unitId: unitId("Tablet"), rackId: rackId("F1"), strength: "200mg", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "2.50", salePriceUnit: "4.00", salePricePack: "120.00", minStock: 30 },
      { name: "Folic Acid 5mg Tablet", genericNameId: gnId("Folic Acid"), categoryId: catId("Vitamins"), companyId: coId("Hilton"), unitId: unitId("Tablet"), rackId: rackId("F1"), strength: "5mg", packingLabel: "Strip of 28", unitsPerPack: 28, purchasePriceUnit: "2.00", salePriceUnit: "3.50", salePricePack: "98.00", minStock: 30 },
      { name: "Zincovit Syrup", genericNameId: gnId("Zinc"), categoryId: catId("Vitamins"), companyId: coId("Hilton"), unitId: unitId("Syrup"), rackId: rackId("F1"), strength: "5mg/5mL", packingLabel: "120mL Bottle", unitsPerPack: 120, purchasePriceUnit: "2.00", salePriceUnit: "3.00", salePricePack: "360.00", minStock: 20 },
      // Dermatology
      { name: "Betnovate Cream 0.1%", genericNameId: gnId("Betamethasone"), categoryId: catId("Dermatology"), companyId: coId("GSK"), unitId: unitId("Cream"), rackId: rackId("H1"), strength: "0.1%", packingLabel: "15g Tube", unitsPerPack: 15, purchasePriceUnit: "5.00", salePriceUnit: "8.00", salePricePack: "120.00", minStock: 20 },
      { name: "Hydrocortisone 1% Cream", genericNameId: gnId("Hydrocortisone"), categoryId: catId("Dermatology"), companyId: coId("Hilton"), unitId: unitId("Cream"), rackId: rackId("H1"), strength: "1%", packingLabel: "15g Tube", unitsPerPack: 15, purchasePriceUnit: "6.00", salePriceUnit: "9.00", salePricePack: "135.00", minStock: 15 },
      { name: "Bactroban 2% Cream", genericNameId: gnId("Mupirocin"), categoryId: catId("Dermatology"), companyId: coId("GSK"), unitId: unitId("Cream"), rackId: rackId("H1"), strength: "2%", packingLabel: "15g Tube", unitsPerPack: 15, purchasePriceUnit: "40.00", salePriceUnit: "60.00", salePricePack: "900.00", minStock: 10 },
      // Ophthalmology
      { name: "Ciloxan 0.3% Eye Drops", genericNameId: gnId("Ciprofloxacin Eye"), categoryId: catId("Ophthalmology"), companyId: coId("Novartis"), unitId: unitId("Drops"), rackId: rackId("H1"), strength: "0.3%", packingLabel: "5mL Bottle", unitsPerPack: 5, purchasePriceUnit: "30.00", salePriceUnit: "45.00", salePricePack: "225.00", minStock: 10 },
      { name: "Timoptol 0.5% Eye Drops", genericNameId: gnId("Timolol"), categoryId: catId("Ophthalmology"), companyId: coId("Novartis"), unitId: unitId("Drops"), rackId: rackId("H1"), strength: "0.5%", packingLabel: "5mL Bottle", unitsPerPack: 5, purchasePriceUnit: "35.00", salePriceUnit: "52.00", salePricePack: "260.00", minStock: 8 },
      // Controlled Substances
      { name: "Valium 5mg Tablet", genericNameId: gnId("Diazepam"), categoryId: catId("Controlled"), companyId: coId("Reckitt"), unitId: unitId("Tablet"), rackId: rackId("B2"), strength: "5mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "8.00", salePriceUnit: "12.00", salePricePack: "120.00", minStock: 10, isControlled: true, requiresPrescription: true },
      { name: "Xanax 0.25mg Tablet", genericNameId: gnId("Alprazolam"), categoryId: catId("Controlled"), companyId: coId("Pfizer"), unitId: unitId("Tablet"), rackId: rackId("B2"), strength: "0.25mg", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "7.00", salePriceUnit: "10.00", salePricePack: "300.00", minStock: 10, isControlled: true, requiresPrescription: true },
      { name: "Tramol 50mg Capsule", genericNameId: gnId("Tramadol"), categoryId: catId("Controlled"), companyId: coId("AGP"), unitId: unitId("Capsule"), rackId: rackId("B2"), strength: "50mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "12.00", salePriceUnit: "18.00", salePricePack: "180.00", minStock: 10, isControlled: true, requiresPrescription: true },
      // ORS
      { name: "ORS Sachet (Orange)", genericNameId: gnId("ORS"), categoryId: catId("ORS"), companyId: coId("Getz"), unitId: unitId("Sachet"), rackId: rackId("G1"), strength: "Oral Rehydration Salts", packingLabel: "Sachet 20.5g", unitsPerPack: 1, purchasePriceUnit: "12.00", salePriceUnit: "18.00", salePricePack: "18.00", minStock: 50 },
      { name: "ORS Sachet (Glucose)", genericNameId: gnId("ORS"), categoryId: catId("ORS"), companyId: coId("Hilton"), unitId: unitId("Sachet"), rackId: rackId("G1"), strength: "Oral Rehydration Salts", packingLabel: "Sachet 20.5g", unitsPerPack: 1, purchasePriceUnit: "10.00", salePriceUnit: "15.00", salePricePack: "15.00", minStock: 50 },
      // Additional medicines
      { name: "Panadol CF Tablet", genericNameId: gnId("Paracetamol"), categoryId: catId("Analgesics"), companyId: coId("GSK"), unitId: unitId("Tablet"), rackId: rackId("A1"), strength: "500mg+30mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "6.00", salePriceUnit: "9.00", salePricePack: "90.00", minStock: 30 },
      { name: "Panadol Syrup 120mg/5mL", genericNameId: gnId("Paracetamol"), categoryId: catId("Analgesics"), companyId: coId("GSK"), unitId: unitId("Syrup"), rackId: rackId("A1"), strength: "120mg/5mL", packingLabel: "90mL Bottle", unitsPerPack: 90, purchasePriceUnit: "2.00", salePriceUnit: "3.50", salePricePack: "315.00", minStock: 30 },
      { name: "Brufen 200mg Tablet", genericNameId: gnId("Ibuprofen"), categoryId: catId("Analgesics"), companyId: coId("Abbott"), unitId: unitId("Tablet"), rackId: rackId("A1"), strength: "200mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "3.00", salePriceUnit: "5.00", salePricePack: "100.00", minStock: 30 },
      { name: "Disprin 300mg Tablet", genericNameId: gnId("Aspirin"), categoryId: catId("Analgesics"), companyId: coId("Reckitt"), unitId: unitId("Tablet"), rackId: rackId("A1"), strength: "300mg", packingLabel: "Strip of 24", unitsPerPack: 24, purchasePriceUnit: "2.00", salePriceUnit: "3.50", salePricePack: "84.00", minStock: 30 },
      { name: "Calpol 120mg/5mL Syrup", genericNameId: gnId("Paracetamol"), categoryId: catId("Analgesics"), companyId: coId("GSK"), unitId: unitId("Syrup"), rackId: rackId("A1"), strength: "120mg/5mL", packingLabel: "60mL Bottle", unitsPerPack: 60, purchasePriceUnit: "1.80", salePriceUnit: "3.00", salePricePack: "180.00", minStock: 30 },
      { name: "Augmentin 1g Tablet", genericNameId: gnId("Amoxicillin + Clavulanate"), categoryId: catId("Antibiotics"), companyId: coId("GSK"), unitId: unitId("Tablet"), rackId: rackId("B1"), strength: "1g", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "45.00", salePriceUnit: "68.00", salePricePack: "952.00", minStock: 10 },
      { name: "Zithromax 500mg Tablet", genericNameId: gnId("Azithromycin"), categoryId: catId("Antibiotics"), companyId: coId("Pfizer"), unitId: unitId("Tablet"), rackId: rackId("B1"), strength: "500mg", packingLabel: "Strip of 3", unitsPerPack: 3, purchasePriceUnit: "90.00", salePriceUnit: "135.00", salePricePack: "405.00", minStock: 15 },
      { name: "Norfloxacin 400mg Tablet", genericNameId: gnId("Ciprofloxacin"), categoryId: catId("Antibiotics"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("B1"), strength: "400mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "10.00", salePriceUnit: "15.00", salePricePack: "150.00", minStock: 20 },
      { name: "Metronidazole 200mg/5mL Syrup", genericNameId: gnId("Metronidazole"), categoryId: catId("Antibiotics"), companyId: coId("Getz"), unitId: unitId("Syrup"), rackId: rackId("B1"), strength: "200mg/5mL", packingLabel: "60mL Bottle", unitsPerPack: 60, purchasePriceUnit: "3.00", salePriceUnit: "5.00", salePricePack: "300.00", minStock: 15 },
      { name: "Norvasc 10mg Tablet", genericNameId: gnId("Amlodipine"), categoryId: catId("Cardiovascular"), companyId: coId("Pfizer"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "10mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "30.00", salePriceUnit: "45.00", salePricePack: "630.00", minStock: 20 },
      { name: "Atenolol 100mg Tablet", genericNameId: gnId("Atenolol"), categoryId: catId("Cardiovascular"), companyId: coId("Hilton"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "100mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "12.00", salePriceUnit: "18.00", salePricePack: "252.00", minStock: 20 },
      { name: "Lisinopril 5mg Tablet", genericNameId: gnId("Lisinopril"), categoryId: catId("Cardiovascular"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "5mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "8.00", salePriceUnit: "12.00", salePricePack: "168.00", minStock: 20 },
      { name: "Losartan 100mg Tablet", genericNameId: gnId("Losartan"), categoryId: catId("Cardiovascular"), companyId: coId("OBS"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "100mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "30.00", salePriceUnit: "45.00", salePricePack: "630.00", minStock: 15 },
      { name: "Lipitor 20mg Tablet", genericNameId: gnId("Atorvastatin"), categoryId: catId("Cardiovascular"), companyId: coId("Pfizer"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "20mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "35.00", salePriceUnit: "52.00", salePricePack: "728.00", minStock: 20 },
      { name: "Glucophage 850mg Tablet", genericNameId: gnId("Metformin"), categoryId: catId("Diabetes"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("D1"), strength: "850mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "5.50", salePriceUnit: "8.00", salePricePack: "160.00", minStock: 30 },
      { name: "Glimepiride 4mg Tablet", genericNameId: gnId("Glimepiride"), categoryId: catId("Diabetes"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("D1"), strength: "4mg", packingLabel: "Strip of 15", unitsPerPack: 15, purchasePriceUnit: "20.00", salePriceUnit: "30.00", salePricePack: "450.00", minStock: 15 },
      { name: "Omeprazole 40mg Capsule", genericNameId: gnId("Omeprazole"), categoryId: catId("Antacids"), companyId: coId("Getz"), unitId: unitId("Capsule"), rackId: rackId("G1"), strength: "40mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "15.00", salePriceUnit: "22.00", salePricePack: "308.00", minStock: 25 },
      { name: "Ranitidine 150mg Tablet", genericNameId: gnId("Ranitidine"), categoryId: catId("Antacids"), companyId: coId("Hilton"), unitId: unitId("Tablet"), rackId: rackId("G1"), strength: "150mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "4.00", salePriceUnit: "6.00", salePricePack: "120.00", minStock: 25 },
      { name: "Vitamin C 250mg Syrup", genericNameId: gnId("Vitamin C"), categoryId: catId("Vitamins"), companyId: coId("Getz"), unitId: unitId("Syrup"), rackId: rackId("F1"), strength: "250mg/5mL", packingLabel: "120mL Bottle", unitsPerPack: 120, purchasePriceUnit: "1.50", salePriceUnit: "2.50", salePricePack: "300.00", minStock: 20 },
      { name: "Zinc Sulfate Sachet", genericNameId: gnId("Zinc"), categoryId: catId("Vitamins"), companyId: coId("Ferozsons"), unitId: unitId("Sachet"), rackId: rackId("F1"), strength: "20mg", packingLabel: "Sachet", unitsPerPack: 1, purchasePriceUnit: "8.00", salePriceUnit: "12.00", salePricePack: "12.00", minStock: 30 },
      { name: "Tamiflu 30mg Syrup", genericNameId: gnId("Oseltamivir"), categoryId: catId("Antivirals"), companyId: coId("AGP"), unitId: unitId("Syrup"), rackId: rackId("B2"), strength: "30mg/5mL", packingLabel: "45mL Bottle", unitsPerPack: 45, purchasePriceUnit: "55.00", salePriceUnit: "80.00", salePricePack: "3600.00", minStock: 5 },
      { name: "Clotrimazole Vaginal Tablet", genericNameId: gnId("Clotrimazole"), categoryId: catId("Antifungals"), companyId: coId("Reckitt"), unitId: unitId("Tablet"), rackId: rackId("H1"), strength: "100mg", packingLabel: "Strip of 6", unitsPerPack: 6, purchasePriceUnit: "25.00", salePriceUnit: "38.00", salePricePack: "228.00", minStock: 8 },
      { name: "Cetirizine 5mg/5mL Syrup", genericNameId: gnId("Cetirizine"), categoryId: catId("Antihistamines"), companyId: coId("GSK"), unitId: unitId("Syrup"), rackId: rackId("A2"), strength: "5mg/5mL", packingLabel: "60mL Bottle", unitsPerPack: 60, purchasePriceUnit: "4.50", salePriceUnit: "7.00", salePricePack: "420.00", minStock: 20 },
      { name: "Theophylline 100mg Tablet", genericNameId: gnId("Theophylline"), categoryId: catId("Respiratory"), companyId: coId("Ferozsons"), unitId: unitId("Tablet"), rackId: rackId("E1"), strength: "100mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "5.00", salePriceUnit: "8.00", salePricePack: "160.00", minStock: 15 },
      { name: "Diclofenac Gel 1%", genericNameId: gnId("Diclofenac"), categoryId: catId("Analgesics"), companyId: coId("Novartis"), unitId: unitId("Cream"), rackId: rackId("A2"), strength: "1%", packingLabel: "30g Tube", unitsPerPack: 30, purchasePriceUnit: "5.00", salePriceUnit: "8.00", salePricePack: "240.00", minStock: 15 },
      // Additional medicines to reach 100+
      { name: "Pantoprazole 40mg Tablet", genericNameId: gnId("Omeprazole"), categoryId: catId("Antacids"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("G1"), strength: "40mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "18.00", salePriceUnit: "27.00", salePricePack: "378.00", minStock: 20 },
      { name: "Dexamethasone 0.5mg Tablet", genericNameId: gnId("Prednisolone"), categoryId: catId("Analgesics"), companyId: coId("AGP"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "0.5mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "3.00", salePriceUnit: "4.50", salePricePack: "90.00", minStock: 20 },
      { name: "Ondansetron 4mg Tablet", genericNameId: gnId("Metoclopramide"), categoryId: catId("Antacids"), companyId: coId("Getz"), unitId: unitId("Tablet"), rackId: rackId("G1"), strength: "4mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "20.00", salePriceUnit: "30.00", salePricePack: "300.00", minStock: 15 },
      { name: "Famotidine 20mg Tablet", genericNameId: gnId("Ranitidine"), categoryId: catId("Antacids"), companyId: coId("OBS"), unitId: unitId("Tablet"), rackId: rackId("G1"), strength: "20mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "5.00", salePriceUnit: "8.00", salePricePack: "112.00", minStock: 20 },
      { name: "Ferrous Sulfate 200mg Tablet", genericNameId: gnId("Ferrous Sulfate"), categoryId: catId("Vitamins"), companyId: coId("Hilton"), unitId: unitId("Tablet"), rackId: rackId("F1"), strength: "200mg", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "2.50", salePriceUnit: "4.00", salePricePack: "120.00", minStock: 25 },
      { name: "Calcium + Vitamin D3 Tablet", genericNameId: gnId("Calcium"), categoryId: catId("Vitamins"), companyId: coId("GSK"), unitId: unitId("Tablet"), rackId: rackId("F1"), strength: "500mg+400IU", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "5.00", salePriceUnit: "8.00", salePricePack: "240.00", minStock: 20 },
      { name: "Montelukast 10mg Tablet", genericNameId: gnId("Montelukast"), categoryId: catId("Respiratory"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("E1"), strength: "10mg", packingLabel: "Strip of 14", unitsPerPack: 14, purchasePriceUnit: "35.00", salePriceUnit: "52.00", salePricePack: "728.00", minStock: 15 },
      { name: "Hydroxychloroquine 200mg Tablet", genericNameId: gnId("Hydroxychloroquine"), categoryId: catId("Analgesics"), companyId: coId("Abbott"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "200mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "40.00", salePriceUnit: "60.00", salePricePack: "600.00", minStock: 10 },
      { name: "Levofloxacin 500mg Tablet", genericNameId: gnId("Ciprofloxacin"), categoryId: catId("Antibiotics"), companyId: coId("Searle"), unitId: unitId("Tablet"), rackId: rackId("B1"), strength: "500mg", packingLabel: "Strip of 7", unitsPerPack: 7, purchasePriceUnit: "60.00", salePriceUnit: "90.00", salePricePack: "630.00", minStock: 10 },
      { name: "Nystatin 100000IU Oral Drops", genericNameId: gnId("Clotrimazole"), categoryId: catId("Antifungals"), companyId: coId("Getz"), unitId: unitId("Syrup"), rackId: rackId("H1"), strength: "100000IU/mL", packingLabel: "30mL Bottle", unitsPerPack: 30, purchasePriceUnit: "10.00", salePriceUnit: "15.00", salePricePack: "450.00", minStock: 10 },
      { name: "Diazepam 5mg Tablet", genericNameId: gnId("Diazepam"), categoryId: catId("Analgesics"), companyId: coId("Roche"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "5mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "5.00", salePriceUnit: "8.00", salePricePack: "80.00", minStock: 20, isControlled: true, requiresPrescription: true },
      { name: "Tramadol 50mg Capsule", genericNameId: gnId("Tramadol"), categoryId: catId("Analgesics"), companyId: coId("AGP"), unitId: unitId("Capsule"), rackId: rackId("A2"), strength: "50mg", packingLabel: "Strip of 10", unitsPerPack: 10, purchasePriceUnit: "15.00", salePriceUnit: "22.00", salePricePack: "220.00", minStock: 10, isControlled: true, requiresPrescription: true },
      { name: "Amitriptyline 25mg Tablet", genericNameId: gnId("Amitriptyline"), categoryId: catId("Analgesics"), companyId: coId("Sami"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "25mg", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "3.00", salePriceUnit: "4.50", salePricePack: "135.00", minStock: 20, isControlled: true, requiresPrescription: true },
      { name: "Phenobarbitone 30mg Tablet", genericNameId: gnId("Phenobarbitone"), categoryId: catId("Analgesics"), companyId: coId("Ferozsons"), unitId: unitId("Tablet"), rackId: rackId("A2"), strength: "30mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "2.00", salePriceUnit: "3.00", salePricePack: "60.00", minStock: 20, isControlled: true, requiresPrescription: true },
      { name: "Spironolactone 25mg Tablet", genericNameId: gnId("Losartan"), categoryId: catId("Cardiovascular"), companyId: coId("OBS"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "25mg", packingLabel: "Strip of 20", unitsPerPack: 20, purchasePriceUnit: "6.00", salePriceUnit: "9.00", salePricePack: "180.00", minStock: 15 },
      { name: "Digoxin 0.25mg Tablet", genericNameId: gnId("Atenolol"), categoryId: catId("Cardiovascular"), companyId: coId("Abbott"), unitId: unitId("Tablet"), rackId: rackId("C1"), strength: "0.25mg", packingLabel: "Strip of 30", unitsPerPack: 30, purchasePriceUnit: "4.00", salePriceUnit: "6.00", salePricePack: "180.00", minStock: 15 },
    ];

    for (const med of medicines) {
      await db.insert(schema.medicinesTable).values({
        name: med.name,
        genericNameId: med.genericNameId ?? null,
        categoryId: med.categoryId ?? null,
        companyId: med.companyId ?? null,
        unitId: med.unitId ?? null,
        rackId: med.rackId ?? null,
        strength: med.strength ?? null,
        packingLabel: med.packingLabel ?? null,
        unitsPerPack: med.unitsPerPack ?? 1,
        purchasePriceUnit: med.purchasePriceUnit ?? "0",
        salePriceUnit: med.salePriceUnit ?? "0",
        salePricePack: med.salePricePack ?? "0",
        minStock: med.minStock ?? 0,
        isControlled: med.isControlled ?? false,
        requiresPrescription: med.requiresPrescription ?? false,
        isActive: true,
      }).onConflictDoNothing();
    }

    console.log(`Seeded ${medicines.length} medicines`);
  }

  // 9. Seed some batches for stock
  const medsList = await db.select().from(schema.medicinesTable).limit(50);
  const existingBatches = await db.select().from(schema.batchesTable).limit(1);

  if (!existingBatches.length && medsList.length > 0) {
    const today = new Date();
    const getExpiry = (monthsAhead: number) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() + monthsAhead);
      return d.toISOString().slice(0, 10);
    };

    const batchRows = medsList.slice(0, 40).map((med, i) => ({
      medicineId: med.id,
      batchNo: `BN${String(i + 1001).padStart(5, "0")}`,
      expiryDate: getExpiry(6 + (i % 24)),
      quantityUnits: 100 + (i * 13) % 400,
      purchasePrice: med.purchasePriceUnit,
      salePrice: med.salePriceUnit,
    }));

    await db.insert(schema.batchesTable).values(batchRows);
    console.log(`Seeded ${batchRows.length} batches`);
  }

  // 10. Seed suppliers and customers
  const existingSuppliers = await db.select().from(schema.suppliersTable).limit(1);
  if (!existingSuppliers.length) {
    await db.insert(schema.suppliersTable).values([
      { name: "Medway Distributors", contact: "021-35241234", address: "M.A. Jinnah Road, Karachi" },
      { name: "PharmaCo Wholesale", contact: "042-37891234", address: "Shadman, Lahore" },
      { name: "National Pharma Supply", contact: "051-44512345", address: "G-8 Markaz, Islamabad" },
      { name: "Karachi Drug House", contact: "021-32345678", address: "Bolton Market, Karachi" },
      { name: "Punjab Pharma Traders", contact: "042-35671234", address: "Anarkali, Lahore" },
    ]);
  }

  const existingCustomers = await db.select().from(schema.customersTable).limit(1);
  if (!existingCustomers.length) {
    await db.insert(schema.customersTable).values([
      { name: "Walk-In Customer", phone: "0000-0000000" },
      { name: "Dr. Ahmed Clinic", phone: "021-35001234", address: "Clifton, Karachi" },
      { name: "Fatima Memorial Hospital", phone: "021-36891234", address: "PECHS, Karachi" },
      { name: "Muhammad Ali", phone: "0300-1234567" },
      { name: "Ayesha Bibi", phone: "0312-9876543" },
    ]);
  }

  console.log("Seeding complete!");
  await pool.end();
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
