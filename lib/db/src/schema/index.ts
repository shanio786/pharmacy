import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "cashier",
]);
export const saleStatusEnum = pgEnum("sale_status", [
  "completed",
  "credit",
  "partial",
]);
export const purchaseStatusEnum = pgEnum("purchase_status", [
  "received",
  "partial",
  "pending",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "dispatched",
  "delivered",
  "cancelled",
]);
export const ledgerTypeEnum = pgEnum("ledger_type", [
  "purchase",
  "payment",
  "return",
]);
export const customerLedgerTypeEnum = pgEnum("customer_ledger_type", [
  "sale",
  "payment",
  "return",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("cashier"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;

// ─── Companies ────────────────────────────────────────────────────────────────

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;

// ─── Units ────────────────────────────────────────────────────────────────────

export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUnitSchema = createInsertSchema(unitsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;

// ─── Racks ────────────────────────────────────────────────────────────────────

export const racksTable = pgTable("racks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRackSchema = createInsertSchema(racksTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRack = z.infer<typeof insertRackSchema>;
export type Rack = typeof racksTable.$inferSelect;

// ─── Generic Names ────────────────────────────────────────────────────────────

export const genericNamesTable = pgTable("generic_names", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGenericNameSchema = createInsertSchema(
  genericNamesTable
).omit({ id: true, createdAt: true });
export type InsertGenericName = z.infer<typeof insertGenericNameSchema>;
export type GenericName = typeof genericNamesTable.$inferSelect;

// ─── Medicines ────────────────────────────────────────────────────────────────

export const medicinesTable = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genericNameId: integer("generic_name_id").references(
    () => genericNamesTable.id
  ),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  companyId: integer("company_id").references(() => companiesTable.id),
  unitId: integer("unit_id").references(() => unitsTable.id),
  rackId: integer("rack_id").references(() => racksTable.id),
  strength: text("strength"),
  packingLabel: text("packing_label"),
  unitsPerPack: integer("units_per_pack").notNull().default(1),
  purchasePriceUnit: numeric("purchase_price_unit", {
    precision: 12,
    scale: 4,
  })
    .notNull()
    .default("0"),
  salePriceUnit: numeric("sale_price_unit", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  salePricePack: numeric("sale_price_pack", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  minStock: integer("min_stock").notNull().default(0),
  isControlled: boolean("is_controlled").notNull().default(false),
  requiresPrescription: boolean("requires_prescription")
    .notNull()
    .default(false),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMedicineSchema = createInsertSchema(medicinesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicinesTable.$inferSelect;

// ─── Batches ──────────────────────────────────────────────────────────────────

export const batchesTable = pgTable("batches", {
  id: serial("id").primaryKey(),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  batchNo: text("batch_no").notNull(),
  expiryDate: date("expiry_date").notNull(),
  quantityUnits: integer("quantity_units").notNull().default(0),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  salePrice: numeric("sale_price", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBatchSchema = createInsertSchema(batchesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batchesTable.$inferSelect;

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
  address: text("address"),
  email: text("email"),
  ntn: text("ntn"),
  balance: numeric("balance", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;

// ─── Supplier Ledger ──────────────────────────────────────────────────────────

export const supplierLedgerTable = pgTable("supplier_ledger", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliersTable.id),
  type: ledgerTypeEnum("type").notNull(),
  referenceId: integer("reference_id"),
  amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
  balance: numeric("balance", { precision: 14, scale: 4 }).notNull(),
  notes: text("notes"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SupplierLedgerEntry = typeof supplierLedgerTable.$inferSelect;

// ─── Customers ────────────────────────────────────────────────────────────────

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  balance: numeric("balance", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;

// ─── Customer Ledger ──────────────────────────────────────────────────────────

export const customerLedgerTable = pgTable("customer_ledger", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id),
  type: customerLedgerTypeEnum("type").notNull(),
  referenceId: integer("reference_id"),
  amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
  balance: numeric("balance", { precision: 14, scale: 4 }).notNull(),
  notes: text("notes"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CustomerLedgerEntry = typeof customerLedgerTable.$inferSelect;

// ─── Purchases ────────────────────────────────────────────────────────────────

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  invoiceNo: text("invoice_no"),
  date: date("date").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  status: purchaseStatusEnum("status").notNull().default("received"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;

// ─── Purchase Items ───────────────────────────────────────────────────────────

export const purchaseItemsTable = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchasesTable.id),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  batchNo: text("batch_no").notNull(),
  expiryDate: date("expiry_date").notNull(),
  quantityPacks: integer("quantity_packs").notNull().default(0),
  bonusPacks: integer("bonus_packs").notNull().default(0),
  quantityUnits: integer("quantity_units").notNull().default(0),
  purchasePriceUnit: numeric("purchase_price_unit", {
    precision: 12,
    scale: 4,
  }).notNull(),
  salePriceUnit: numeric("sale_price_unit", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseItemSchema = createInsertSchema(
  purchaseItemsTable
).omit({ id: true, createdAt: true });
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type PurchaseItem = typeof purchaseItemsTable.$inferSelect;

// ─── Purchase Returns ─────────────────────────────────────────────────────────

export const purchaseReturnsTable = pgTable("purchase_returns", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").references(() => purchasesTable.id),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  date: date("date").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseReturnSchema = createInsertSchema(
  purchaseReturnsTable
).omit({ id: true, createdAt: true });
export type InsertPurchaseReturn = z.infer<typeof insertPurchaseReturnSchema>;
export type PurchaseReturn = typeof purchaseReturnsTable.$inferSelect;

// ─── Purchase Return Items ────────────────────────────────────────────────────

export const purchaseReturnItemsTable = pgTable("purchase_return_items", {
  id: serial("id").primaryKey(),
  purchaseReturnId: integer("purchase_return_id")
    .notNull()
    .references(() => purchaseReturnsTable.id),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  batchId: integer("batch_id").references(() => batchesTable.id),
  batchNo: text("batch_no"),
  quantityUnits: integer("quantity_units").notNull().default(0),
  purchasePriceUnit: numeric("purchase_price_unit", {
    precision: 12,
    scale: 4,
  }).notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PurchaseReturnItem = typeof purchaseReturnItemsTable.$inferSelect;

// ─── Sales ────────────────────────────────────────────────────────────────────

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull(),
  customerId: integer("customer_id").references(() => customersTable.id),
  date: date("date").notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  status: saleStatusEnum("status").notNull().default("completed"),
  paymentMode: text("payment_mode").notNull().default("cash"),
  notes: text("notes"),
  prescribedBy: text("prescribed_by"),
  patientName: text("patient_name"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;

// ─── Prescriptions (for controlled drug sales) ────────────────────────────────

export const prescriptionsTable = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => salesTable.id),
  doctorName: text("doctor_name").notNull(),
  doctorLicense: text("doctor_license"),
  prescriptionDate: date("prescription_date").notNull(),
  patientName: text("patient_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrescriptionSchema = createInsertSchema(
  prescriptionsTable
).omit({ id: true, createdAt: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptionsTable.$inferSelect;

// ─── Sale Items ───────────────────────────────────────────────────────────────

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => salesTable.id),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  batchId: integer("batch_id").references(() => batchesTable.id),
  batchNo: text("batch_no"),
  saleUnit: text("sale_unit").notNull().default("unit"),
  quantityPacks: numeric("quantity_packs", { precision: 10, scale: 3 })
    .notNull()
    .default("0"),
  quantityUnits: integer("quantity_units").notNull().default(0),
  conversionFactor: integer("conversion_factor").notNull().default(1),
  salePricePack: numeric("sale_price_pack", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  salePriceUnit: numeric("sale_price_unit", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItemsTable.$inferSelect;

// ─── Sale Returns ─────────────────────────────────────────────────────────────

export const saleReturnsTable = pgTable("sale_returns", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => salesTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  date: date("date").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSaleReturnSchema = createInsertSchema(
  saleReturnsTable
).omit({ id: true, createdAt: true });
export type InsertSaleReturn = z.infer<typeof insertSaleReturnSchema>;
export type SaleReturn = typeof saleReturnsTable.$inferSelect;

// ─── Sale Return Items ────────────────────────────────────────────────────────

export const saleReturnItemsTable = pgTable("sale_return_items", {
  id: serial("id").primaryKey(),
  saleReturnId: integer("sale_return_id")
    .notNull()
    .references(() => saleReturnsTable.id),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  batchId: integer("batch_id").references(() => batchesTable.id),
  batchNo: text("batch_no"),
  saleUnit: text("sale_unit").notNull().default("unit"),
  quantityPacks: numeric("quantity_packs", { precision: 10, scale: 3 })
    .notNull()
    .default("0"),
  quantityUnits: integer("quantity_units").notNull().default(0),
  conversionFactor: integer("conversion_factor").notNull().default(1),
  salePricePack: numeric("sale_price_pack", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  salePriceUnit: numeric("sale_price_unit", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SaleReturnItem = typeof saleReturnItemsTable.$inferSelect;

// ─── Missed Sales ─────────────────────────────────────────────────────────────

export const missedSalesTable = pgTable("missed_sales", {
  id: serial("id").primaryKey(),
  medicineName: text("medicine_name").notNull(),
  medicineId: integer("medicine_id").references(() => medicinesTable.id),
  quantity: integer("quantity").notNull().default(1),
  reason: text("reason"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMissedSaleSchema = createInsertSchema(
  missedSalesTable
).omit({ id: true, createdAt: true });
export type InsertMissedSale = z.infer<typeof insertMissedSaleSchema>;
export type MissedSale = typeof missedSalesTable.$inferSelect;

// ─── Deliveries ───────────────────────────────────────────────────────────────

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id),
  customerName: text("customer_name"),
  phone: text("phone"),
  address: text("address").notNull(),
  date: date("date").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  saleId: integer("sale_id").references(() => salesTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;

// ─── Stock Audits ─────────────────────────────────────────────────────────────

export const stockAuditsTable = pgTable("stock_audits", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  notes: text("notes"),
  conductedBy: integer("conducted_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStockAuditSchema = createInsertSchema(
  stockAuditsTable
).omit({ id: true, createdAt: true });
export type InsertStockAudit = z.infer<typeof insertStockAuditSchema>;
export type StockAudit = typeof stockAuditsTable.$inferSelect;

// ─── Stock Audit Items ────────────────────────────────────────────────────────

export const stockAuditItemsTable = pgTable("stock_audit_items", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id")
    .notNull()
    .references(() => stockAuditsTable.id),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  batchId: integer("batch_id").references(() => batchesTable.id),
  conversionFactor: integer("conversion_factor").notNull().default(1),
  systemCountUnits: integer("system_count_units").notNull().default(0),
  physicalCountPacks: numeric("physical_count_packs", { precision: 10, scale: 3 })
    .notNull()
    .default("0"),
  physicalCountUnits: integer("physical_count_units").notNull().default(0),
  physicalTotalUnits: integer("physical_total_units").notNull().default(0),
  variance: integer("variance").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStockAuditItemSchema = createInsertSchema(
  stockAuditItemsTable
).omit({ id: true, createdAt: true });
export type InsertStockAuditItem = z.infer<typeof insertStockAuditItemSchema>;
export type StockAuditItem = typeof stockAuditItemsTable.$inferSelect;

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "sent",
  "received",
  "cancelled",
]);

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  status: purchaseOrderStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id")
    .notNull()
    .references(() => purchaseOrdersTable.id),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  quantityPacks: integer("quantity_packs").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;

// ─── Activity Log ─────────────────────────────────────────────────────────────

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogsTable.$inferSelect;

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  pharmacyName: text("pharmacy_name").notNull().default("PharmaCare"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  ntn: text("ntn"),
  licenseNo: text("license_no"),
  drugLicense: text("drug_license"),
  taxPercent: numeric("tax_percent").notNull().default("0"),
  receiptFooter: text("receipt_footer"),
  defaultSaleUnit: text("default_sale_unit").notNull().default("unit"),
  batchExpiryRequired: boolean("batch_expiry_required").notNull().default(true),
  showPackQtyInReports: boolean("show_pack_qty_in_reports").notNull().default(false),
  lowStockDays: integer("low_stock_days").notNull().default(30),
  fbrEnabled: boolean("fbr_enabled").notNull().default(false),
  fbrPosId: text("fbr_pos_id"),
  currency: text("currency").notNull().default("PKR"),
  expiryAlertDays: integer("expiry_alert_days").notNull().default(90),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;