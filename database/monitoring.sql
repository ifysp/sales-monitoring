-- SWIT Sales Monitoring v2 — database awal (skema + master data + 2 akun Admin)
-- Cara import: buat database kosong "monitoring" di pgAdmin, buka Query Tool, jalankan seluruh file ini.
-- Setelah itu JANGAN jalankan "prisma migrate deploy" lagi untuk migration init (sudah tercatat di _prisma_migrations).

BEGIN;

CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "Product" AS ENUM ('VIEWPOINT', 'TRICEFY');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RUMAH_SAKIT', 'KLINIK', 'DOKTER', 'LAINNYA');

-- CreateEnum
CREATE TYPE "PcSource" AS ENUM ('COMPANY_RECOMMENDED', 'CUSTOMER_OWNED');

-- CreateEnum
CREATE TYPE "PcRole" AS ENUM ('SERVER_CLIENT', 'SERVER', 'CLIENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CICILAN');

-- CreateEnum
CREATE TYPE "TechNoteKind" AS ENUM ('INTEGRASI', 'PREFERENSI_DOKTER', 'QUICK_REPORT', 'JURNAL_GRAFIK', 'LAINNYA');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('PO', 'BERITA_ACARA', 'FAKTUR', 'INVOICE', 'BUKTI_BAYAR', 'ERROR', 'LAINNYA');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "product" "Product" NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "listPrice" DECIMAL(15,2),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_models" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "machine_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isPayment" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "geSiteId" TEXT,
    "city" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "machineModelId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pcs" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "hostname" TEXT,
    "source" "PcSource" NOT NULL,
    "role" "PcRole" NOT NULL,
    "cpu" TEXT,
    "ram" TEXT,
    "storage" TEXT,
    "vga" TEXT,
    "os" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poDate" DATE NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "amount" DECIMAL(15,2) NOT NULL,
    "ppnPercent" DECIMAL(5,2),
    "specialNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" DATE,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_stages" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "stageId" INTEGER NOT NULL,
    "completedAt" DATE,
    "note" TEXT,

    CONSTRAINT "po_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vp6_installations" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "packageId" INTEGER,
    "licenseQty" INTEGER,
    "installDate" DATE NOT NULL,
    "currentVersion" TEXT NOT NULL,
    "apps" TEXT,
    "specialConfig" TEXT,
    "price" DECIMAL(15,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vp6_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vp6_installation_devices" (
    "installationId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,

    CONSTRAINT "vp6_installation_devices_pkey" PRIMARY KEY ("installationId", "deviceId")
);

-- CreateTable
CREATE TABLE "vp6_installation_pcs" (
    "installationId" INTEGER NOT NULL,
    "pcId" INTEGER NOT NULL,

    CONSTRAINT "vp6_installation_pcs_pkey" PRIMARY KEY ("installationId", "pcId")
);

-- CreateTable
CREATE TABLE "vp6_version_history" (
    "id" SERIAL NOT NULL,
    "installationId" INTEGER NOT NULL,
    "fromVersion" TEXT,
    "toVersion" TEXT NOT NULL,
    "changedDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vp6_version_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tricefy_accounts" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "tricefyId" TEXT NOT NULL,
    "accountEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tricefy_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tricefy_subscriptions" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "packageId" INTEGER,
    "quantity" INTEGER,
    "installDate" DATE,
    "contractDate" DATE,
    "activationDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "price" DECIMAL(15,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tricefy_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tricefy_subscription_devices" (
    "subscriptionId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,

    CONSTRAINT "tricefy_subscription_devices_pkey" PRIMARY KEY ("subscriptionId", "deviceId")
);

-- CreateTable
CREATE TABLE "tech_notes" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "kind" "TechNoteKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tech_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "deviceId" INTEGER,
    "occurredAt" DATE NOT NULL,
    "symptom" TEXT NOT NULL,
    "cause" TEXT,
    "solution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER,
    "invoiceId" INTEGER,
    "errorLogId" INTEGER,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'LAINNYA',
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customers_geSiteId_key" ON "customers"("geSiteId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_serialNumber_key" ON "devices"("serialNumber");

-- CreateIndex
CREATE INDEX "devices_customerId_idx" ON "devices"("customerId");

-- CreateIndex
CREATE INDEX "pcs_customerId_idx" ON "pcs"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_customerId_idx" ON "purchase_orders"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_sequence_key" ON "invoices"("orderId", "sequence");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "po_stages_orderId_stageId_key" ON "po_stages"("orderId", "stageId");

-- CreateIndex
CREATE INDEX "vp6_installations_customerId_idx" ON "vp6_installations"("customerId");

-- CreateIndex
CREATE INDEX "vp6_installations_installDate_idx" ON "vp6_installations"("installDate");

-- CreateIndex
CREATE INDEX "vp6_version_history_installationId_idx" ON "vp6_version_history"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "tricefy_accounts_tricefyId_key" ON "tricefy_accounts"("tricefyId");

-- CreateIndex
CREATE INDEX "tricefy_accounts_customerId_idx" ON "tricefy_accounts"("customerId");

-- CreateIndex
CREATE INDEX "tricefy_subscriptions_accountId_idx" ON "tricefy_subscriptions"("accountId");

-- CreateIndex
CREATE INDEX "tricefy_subscriptions_endDate_idx" ON "tricefy_subscriptions"("endDate");

-- CreateIndex
CREATE INDEX "tech_notes_customerId_idx" ON "tech_notes"("customerId");

-- CreateIndex
CREATE INDEX "error_logs_customerId_idx" ON "error_logs"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storedName_key" ON "attachments"("storedName");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_machineModelId_fkey" FOREIGN KEY ("machineModelId") REFERENCES "machine_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pcs" ADD CONSTRAINT "pcs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_stages" ADD CONSTRAINT "po_stages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_stages" ADD CONSTRAINT "po_stages_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp6_installations" ADD CONSTRAINT "vp6_installations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp6_installations" ADD CONSTRAINT "vp6_installations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp6_installations" ADD CONSTRAINT "vp6_installations_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp6_installation_devices" ADD CONSTRAINT "vp6_installation_devices_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "vp6_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp6_installation_devices" ADD CONSTRAINT "vp6_installation_devices_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp6_installation_pcs" ADD CONSTRAINT "vp6_installation_pcs_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "vp6_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp6_installation_pcs" ADD CONSTRAINT "vp6_installation_pcs_pcId_fkey" FOREIGN KEY ("pcId") REFERENCES "pcs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp6_version_history" ADD CONSTRAINT "vp6_version_history_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "vp6_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tricefy_accounts" ADD CONSTRAINT "tricefy_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tricefy_subscriptions" ADD CONSTRAINT "tricefy_subscriptions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "tricefy_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tricefy_subscriptions" ADD CONSTRAINT "tricefy_subscriptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tricefy_subscriptions" ADD CONSTRAINT "tricefy_subscriptions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tricefy_subscription_devices" ADD CONSTRAINT "tricefy_subscription_devices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tricefy_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tricefy_subscription_devices" ADD CONSTRAINT "tricefy_subscription_devices_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_notes" ADD CONSTRAINT "tech_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_errorLogId_fkey" FOREIGN KEY ("errorLogId") REFERENCES "error_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Data: users
INSERT INTO "users" ("id", "name", "email", "passwordHash", "role", "createdAt", "updatedAt") VALUES (1, 'Kak Sara', 'sara@swit.local', '$2b$10$8crvdhP17FGoP7syjZvvYuqnS8txQUg53nzAoz5PlzwT/0beABMFK', 'ADMIN', '2026-11-08T23:22:52.868Z', '2026-11-08T23:22:52.868Z');
INSERT INTO "users" ("id", "name", "email", "passwordHash", "role", "createdAt", "updatedAt") VALUES (2, 'Minnie', 'minnie@swit.local', '$2b$10$BrgMLVNFSL2wDIdo9DrdRuffh.h8ZaH7qfxeSsSUms161UoiexpeO', 'ADMIN', '2026-11-08T23:22:52.965Z', '2026-11-08T23:22:52.965Z');
SELECT setval(pg_get_serial_sequence('"users"', 'id'), (SELECT MAX("id") FROM "users"));

-- Data: packages
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (1, 'TRICEFY', 'Scanner license', 'scanner', NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (2, 'TRICEFY', 'Basic license', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (3, 'TRICEFY', 'Studies 1000', 'studies', NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (4, 'TRICEFY', 'Unlimited', NULL, NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (5, 'TRICEFY', 'Custom', NULL, NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (6, 'VIEWPOINT', 'Obgyn Basic', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (7, 'VIEWPOINT', 'Obgyn Analytic', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (8, 'VIEWPOINT', 'Radiologi Basic', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (9, 'VIEWPOINT', 'Radiologi Analytic', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (10, 'VIEWPOINT', 'Cardio', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "product", "name", "unit", "listPrice", "active") VALUES (11, 'VIEWPOINT', 'Custom', 'lisensi', NULL, true);
SELECT setval(pg_get_serial_sequence('"packages"', 'id'), (SELECT MAX("id") FROM "packages"));

-- Data: stages
INSERT INTO "stages" ("id", "name", "sortOrder", "isPayment", "active") VALUES (1, 'PO masuk', 1, false, true);
INSERT INTO "stages" ("id", "name", "sortOrder", "isPayment", "active") VALUES (2, 'Berita acara', 2, false, true);
INSERT INTO "stages" ("id", "name", "sortOrder", "isPayment", "active") VALUES (3, 'Aktivasi', 3, false, true);
INSERT INTO "stages" ("id", "name", "sortOrder", "isPayment", "active") VALUES (4, 'Tukar faktur', 4, false, true);
INSERT INTO "stages" ("id", "name", "sortOrder", "isPayment", "active") VALUES (5, 'Payment', 5, true, true);
INSERT INTO "stages" ("id", "name", "sortOrder", "isPayment", "active") VALUES (6, 'Clear', 6, false, true);
SELECT setval(pg_get_serial_sequence('"stages"', 'id'), (SELECT MAX("id") FROM "stages"));

-- Data: machine_models
INSERT INTO "machine_models" ("id", "brand", "model", "active") VALUES (1, 'GE', 'Voluson P18', true);
INSERT INTO "machine_models" ("id", "brand", "model", "active") VALUES (2, 'GE', 'Voluson E10', true);
INSERT INTO "machine_models" ("id", "brand", "model", "active") VALUES (3, 'GE', 'Voluson Expert 22', true);
INSERT INTO "machine_models" ("id", "brand", "model", "active") VALUES (4, 'GE', 'Voluson Signature 20', true);
INSERT INTO "machine_models" ("id", "brand", "model", "active") VALUES (5, 'GE', 'Logiq E10s', true);
INSERT INTO "machine_models" ("id", "brand", "model", "active") VALUES (6, 'GE', 'Logiq P9', true);
INSERT INTO "machine_models" ("id", "brand", "model", "active") VALUES (7, 'GE', 'Vivid E95', true);
SELECT setval(pg_get_serial_sequence('"machine_models"', 'id'), (SELECT MAX("id") FROM "machine_models"));

-- Data: _prisma_migrations
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES ('470c46a1-80a5-48d6-aeac-2094468b92d5', 'bec46b34f4befb2546b2333f7169324fd85ed1475dc18cb7c62924585c1f10b2', '2026-11-09T06:22:52.183Z', '20261109120000_init_v2', NULL, NULL, '2026-11-09T06:22:52.183Z', 1);

COMMIT;
