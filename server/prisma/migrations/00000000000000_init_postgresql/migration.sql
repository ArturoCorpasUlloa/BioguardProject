-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "location" TEXT,
    "responsible" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "serial_number" TEXT NOT NULL,
    "inventory_code" TEXT,
    "area_id" INTEGER,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "risk_classification" TEXT,
    "manufacturer" TEXT,
    "importer" TEXT,
    "manufacturing_year" INTEGER,
    "acquisition_date" TIMESTAMP(3),
    "provider" TEXT,
    "warranty_expiration" TIMESTAMP(3),
    "technical_responsible" TEXT,
    "maintenance_frequency" TEXT,
    "installation_date" TIMESTAMP(3),
    "useful_life_years" INTEGER,
    "equipment_type" TEXT,
    "technology" TEXT,
    "power_supply" TEXT,
    "voltage" TEXT,
    "power" TEXT,
    "invima_registration" TEXT,
    "invima_expiration" TIMESTAMP(3),
    "photo_path" TEXT,
    "observations" TEXT,
    "modality" TEXT,
    "provider_phone" TEXT,
    "provider_email" TEXT,
    "provider_contact_person" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_documents" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "document_type" TEXT NOT NULL DEFAULT 'OTHER',
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" BIGINT,
    "uploaded_by" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "contract_number" TEXT,
    "company" TEXT NOT NULL,
    "contract_type" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "automatic_renewal" BOOLEAN,
    "with_parts" BOOLEAN,
    "cost" DOUBLE PRECISION,
    "coverage" TEXT,
    "observations" TEXT,
    "document_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "license_type" TEXT,
    "registration_number" TEXT,
    "initial_date" TIMESTAMP(3),
    "issue_date" TIMESTAMP(3),
    "tramit_date" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "document_path" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibrations" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "last_calibration_date" TIMESTAMP(3),
    "next_calibration_date" TIMESTAMP(3),
    "result" TEXT,
    "company" TEXT,
    "responsible" TEXT,
    "certificate_number" TEXT,
    "document_path" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_controls" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "control_date" TIMESTAMP(3) NOT NULL,
    "next_control_date" TIMESTAMP(3),
    "result" TEXT,
    "responsible" TEXT,
    "cost" DOUBLE PRECISION,
    "observations" TEXT,
    "document_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_date" TIMESTAMP(3),
    "execution_date" TIMESTAMP(3),
    "technician_id" INTEGER,
    "responsible" TEXT,
    "company" TEXT,
    "description" TEXT,
    "work_performed" TEXT,
    "spare_parts" TEXT,
    "cost" DOUBLE PRECISION,
    "next_maintenance_date" TIMESTAMP(3),
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_documents" (
    "id" SERIAL NOT NULL,
    "maintenance_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "uploaded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "reported_by" INTEGER,
    "reporter_name" TEXT,
    "assigned_to" INTEGER,
    "report_number" TEXT,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "description" TEXT,
    "solution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedule" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "rescheduled_date" TIMESTAMP(3),
    "change_justification" TEXT,
    "responsible_id" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dicom_configs" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "ae_title" TEXT,
    "ris_ae_title" TEXT,
    "pacs_ae_title" TEXT,
    "ip_address" TEXT,
    "ris_ip_address" TEXT,
    "pacs_ip_address" TEXT,
    "port" INTEGER,
    "ris_port" INTEGER,
    "pacs_port" INTEGER,
    "anidesk" TEXT,
    "username" TEXT,
    "encrypted_password" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dicom_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" INTEGER,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER,
    "old_data" TEXT,
    "new_data" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_audits" (
    "id" SERIAL NOT NULL,
    "period" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "equipment_id" INTEGER,
    "service" TEXT,
    "invoice_number" TEXT,
    "invoice_date" TIMESTAMP(3),
    "fixed_monthly_cost" DOUBLE PRECISION NOT NULL,
    "additional_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expected_value" DOUBLE PRECISION NOT NULL,
    "invoiced_value" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "variation_percent" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REVIEWED',
    "comment" TEXT,
    "threshold_percent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "recurrence_key" TEXT,
    "recurrence_months" INTEGER,
    "recurrence_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_audit_items" (
    "id" SERIAL NOT NULL,
    "audit_id" INTEGER NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_audit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_serial_number_key" ON "equipment"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_inventory_code_key" ON "equipment"("inventory_code");

-- CreateIndex
CREATE INDEX "equipment_name_idx" ON "equipment"("name");

-- CreateIndex
CREATE INDEX "equipment_brand_idx" ON "equipment"("brand");

-- CreateIndex
CREATE INDEX "equipment_area_id_idx" ON "equipment"("area_id");

-- CreateIndex
CREATE INDEX "equipment_documents_equipment_id_idx" ON "equipment_documents"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_documents_document_type_idx" ON "equipment_documents"("document_type");

-- CreateIndex
CREATE INDEX "equipment_documents_expiration_date_idx" ON "equipment_documents"("expiration_date");

-- CreateIndex
CREATE INDEX "licenses_expiration_date_idx" ON "licenses"("expiration_date");

-- CreateIndex
CREATE INDEX "calibrations_next_calibration_date_idx" ON "calibrations"("next_calibration_date");

-- CreateIndex
CREATE INDEX "maintenance_equipment_id_idx" ON "maintenance"("equipment_id");

-- CreateIndex
CREATE INDEX "maintenance_scheduled_date_idx" ON "maintenance"("scheduled_date");

-- CreateIndex
CREATE INDEX "incidents_equipment_id_idx" ON "incidents"("equipment_id");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dicom_configs_equipment_id_key" ON "dicom_configs"("equipment_id");

-- CreateIndex
CREATE INDEX "invoice_audits_period_idx" ON "invoice_audits"("period");

-- CreateIndex
CREATE INDEX "invoice_audits_status_idx" ON "invoice_audits"("status");

-- CreateIndex
CREATE INDEX "invoice_audit_items_audit_id_idx" ON "invoice_audit_items"("audit_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_documents" ADD CONSTRAINT "equipment_documents_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_documents" ADD CONSTRAINT "equipment_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibrations" ADD CONSTRAINT "calibrations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_documents" ADD CONSTRAINT "maintenance_documents_maintenance_id_fkey" FOREIGN KEY ("maintenance_id") REFERENCES "maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_documents" ADD CONSTRAINT "maintenance_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_schedule" ADD CONSTRAINT "maintenance_schedule_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedule" ADD CONSTRAINT "maintenance_schedule_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dicom_configs" ADD CONSTRAINT "dicom_configs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_audit_items" ADD CONSTRAINT "invoice_audit_items_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "invoice_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

