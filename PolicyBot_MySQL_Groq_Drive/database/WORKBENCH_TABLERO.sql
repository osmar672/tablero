-- SOLO si ejecutas SQL manualmente en MySQL Workbench.
-- Crea exclusivamente tablas pb_*; no borra nada de tablero.
CREATE DATABASE IF NOT EXISTS `tablero` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tablero`;

CREATE TABLE IF NOT EXISTS pb_plans (
  id VARCHAR(20) PRIMARY KEY,
  max_documents INT NOT NULL,
  max_questions_month INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pb_companies (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  plan_id VARCHAR(20) NOT NULL DEFAULT 'gratis',
  drive_folder_id VARCHAR(120) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (plan_id) REFERENCES pb_plans(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pb_users (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  email VARCHAR(190) NOT NULL,
  name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','colaborador') NOT NULL DEFAULT 'colaborador',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_user_tenant (id,company_id),
  INDEX ix_user_company (company_id),
  FOREIGN KEY (company_id) REFERENCES pb_companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pb_documents (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  source ENUM('upload','drive') NOT NULL,
  mime_type VARCHAR(130) NOT NULL,
  drive_file_id VARCHAR(200) NULL,
  drive_modified_at DATETIME(3) NULL,
  drive_url VARCHAR(600) NULL,
  state ENUM('pendiente','indexando','indexado','error') NOT NULL DEFAULT 'pendiente',
  error_message VARCHAR(350) NULL,
  chunk_count INT NOT NULL DEFAULT 0,
  indexed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_docs_tenant_drive (company_id,drive_file_id),
  UNIQUE KEY uq_doc_tenant (id,company_id),
  INDEX ix_doc_tenant_state (company_id,state),
  FOREIGN KEY (company_id) REFERENCES pb_companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pb_chunks (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding JSON NOT NULL,
  embedding_model VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_doc_chunk (document_id,chunk_index),
  INDEX ix_chunks_company (company_id),
  FOREIGN KEY (document_id,company_id) REFERENCES pb_documents(id,company_id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES pb_companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pb_messages (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer MEDIUMTEXT NULL,
  sources JSON NULL,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  state ENUM('processing','ok','error') NOT NULL DEFAULT 'processing',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX ix_msg_company_time (company_id,created_at),
  FOREIGN KEY (user_id,company_id) REFERENCES pb_users(id,company_id),
  FOREIGN KEY (company_id) REFERENCES pb_companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pb_sync_runs (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  state ENUM('running','ok','error') NOT NULL,
  scanned INT NOT NULL DEFAULT 0,
  indexed INT NOT NULL DEFAULT 0,
  message VARCHAR(500) NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  finished_at DATETIME(3) NULL,
  INDEX ix_sync_company_time (company_id,started_at),
  FOREIGN KEY (company_id) REFERENCES pb_companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO pb_plans(id,max_documents,max_questions_month) VALUES ('gratis',10,200),('pro',500,10000);

