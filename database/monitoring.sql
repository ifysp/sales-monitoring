-- SWIT Monitoring — database awal (skema + master data + 2 akun)
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
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RUMAH_SAKIT', 'KLINIK', 'DOKTER', 'LAINNYA');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CICILAN');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('PO', 'BERITA_ACARA', 'FAKTUR', 'BUKTI_BAYAR', 'ERROR', 'LAINNYA');

-- CreateEnum
CREATE TYPE "ConfigKind" AS ENUM ('INTEGRASI', 'PREFERENSI_DOKTER', 'QUICK_REPORT', 'JURNAL_GRAFIK', 'LAINNYA');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
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
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
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
    "city" TEXT,
    "address" TEXT,
    "picName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "poNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "poDate" DATE NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "price" DECIMAL(15,2) NOT NULL,
    "ppnPercent" DECIMAL(5,2),
    "amountReceived" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "specialNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "packageId" INTEGER,
    "quantity" INTEGER,
    "machineModelId" INTEGER,
    "serialNumber" TEXT,
    "triceId" TEXT,
    "siteCode" TEXT,
    "installDate" DATE,
    "contractStart" DATE,
    "contractEnd" DATE,
    "notes" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "installments" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAt" DATE,
    "note" TEXT,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER,
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

-- CreateTable
CREATE TABLE "sites" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "siteCode" TEXT,
    "pcInfo" TEXT,
    "applications" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_configs" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "kind" "ConfigKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "occurredAt" DATE NOT NULL,
    "symptom" TEXT NOT NULL,
    "cause" TEXT,
    "solution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "purchase_orders_customerId_idx" ON "purchase_orders"("customerId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "po_stages_orderId_stageId_key" ON "po_stages"("orderId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "installments_orderId_number_key" ON "installments"("orderId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storedName_key" ON "attachments"("storedName");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_machineModelId_fkey" FOREIGN KEY ("machineModelId") REFERENCES "machine_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_stages" ADD CONSTRAINT "po_stages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_stages" ADD CONSTRAINT "po_stages_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_errorLogId_fkey" FOREIGN KEY ("errorLogId") REFERENCES "error_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_configs" ADD CONSTRAINT "site_configs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data: users
INSERT INTO "users" ("id", "name", "email", "passwordHash", "role", "createdAt", "updatedAt") VALUES (1, 'Lead SWIT', 'lead@swit.local', '$2b$10$/HajgNCkkJRcJOGQEEibf.XLdXgnoju73G7zPGrUVHogSK6zxHl1u', 'ADMIN', '2026-11-08T21:42:34.526Z', '2026-11-08T21:42:34.526Z');
INSERT INTO "users" ("id", "name", "email", "passwordHash", "role", "createdAt", "updatedAt") VALUES (2, 'Minnie', 'minnie@swit.local', '$2b$10$Yzwf4T4SesJoBEDu3QW4gu8o7sS.WMrbIatFqeXQvZCTh9dDW.rD2', 'USER', '2026-11-08T21:42:34.638Z', '2026-11-08T21:42:34.638Z');
SELECT setval(pg_get_serial_sequence('"users"', 'id'), (SELECT MAX("id") FROM "users"));

-- Data: products
INSERT INTO "products" ("id", "code", "name") VALUES (1, 'TRICEFY', 'Tricefy');
INSERT INTO "products" ("id", "code", "name") VALUES (2, 'VIEWPOINT', 'Viewpoint 6');
SELECT setval(pg_get_serial_sequence('"products"', 'id'), (SELECT MAX("id") FROM "products"));

-- Data: packages
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (1, 1, 'Scanner license', 'scanner', NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (2, 1, 'Basic license', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (3, 1, 'Studies 1000', 'studies', NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (4, 1, 'Unlimited', NULL, NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (5, 1, 'Custom', NULL, NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (6, 2, 'Obgyn Basic', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (7, 2, 'Obgyn Analytic', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (8, 2, 'Radiologi Basic', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (9, 2, 'Radiologi Analytic', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (10, 2, 'Cardio', 'lisensi', NULL, true);
INSERT INTO "packages" ("id", "productId", "name", "unit", "listPrice", "active") VALUES (11, 2, 'Custom', 'lisensi', NULL, true);
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
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES ('486dfa24-ce65-4e11-a08e-41152e4c9689', 'f04aa9cc5abf3c144751109b1a504bfe0ff7101d5b87ae4fddebd125c04d84ed', '2026-11-09T04:42:33.822Z', '20261109000000_init', NULL, NULL, '2026-11-09T04:42:33.822Z', 1);

COMMIT;
