-- Esquema actual de PolicyBot. Se recomienda npm run db:migrate.
-- Para una base dedicada; no ejecutar sobre tablas ajenas. Se puede repetir.
CREATE DATABASE IF NOT EXISTS `tablero` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tablero`;
CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(200) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(20) PRIMARY KEY,
  max_documents INT NOT NULL,
  max_questions_month INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS companies (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  plan_id VARCHAR(20) NOT NULL DEFAULT 'gratis',
  drive_folder_id VARCHAR(120) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
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
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documents (
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
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chunks (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding JSON NOT NULL,
  embedding_model VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_doc_chunk (document_id,chunk_index),
  INDEX ix_chunks_company (company_id),
  FOREIGN KEY (document_id,company_id) REFERENCES documents(id,company_id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
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
  FOREIGN KEY (user_id,company_id) REFERENCES users(id,company_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sync_runs (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  state ENUM('running','ok','error') NOT NULL,
  scanned INT NOT NULL DEFAULT 0,
  indexed INT NOT NULL DEFAULT 0,
  message VARCHAR(500) NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  finished_at DATETIME(3) NULL,
  INDEX ix_sync_company_time (company_id,started_at),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO plans(id,max_documents,max_questions_month) VALUES ('gratis',10,200),('pro',500,10000)
ON DUPLICATE KEY UPDATE id=VALUES(id);

-- Reanudable: MySQL confirma los cambios DDL individualmente.
SET @policybot_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='session_version'), 'SELECT 1', 'ALTER TABLE users ADD COLUMN session_version INT NOT NULL DEFAULT 0');
PREPARE policybot_stmt FROM @policybot_ddl;
EXECUTE policybot_stmt;
DEALLOCATE PREPARE policybot_stmt;
SET @policybot_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chunks' AND COLUMN_NAME='page_number'), 'SELECT 1', 'ALTER TABLE chunks ADD COLUMN page_number INT NULL');
PREPARE policybot_stmt FROM @policybot_ddl;
EXECUTE policybot_stmt;
DEALLOCATE PREPARE policybot_stmt;
CREATE TABLE IF NOT EXISTS conversations (
 id CHAR(36) PRIMARY KEY,
 company_id CHAR(36) NOT NULL,
 user_id CHAR(36) NOT NULL,
 title VARCHAR(150) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_conversation_owner (id,company_id,user_id),
 INDEX ix_conversation_owner (company_id,user_id,updated_at),
 FOREIGN KEY (user_id,company_id) REFERENCES users(id,company_id) ON DELETE CASCADE
) ENGINE=InnoDB;
SET @policybot_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='messages' AND COLUMN_NAME='conversation_id'), 'SELECT 1', 'ALTER TABLE messages ADD COLUMN conversation_id CHAR(36) NULL');
PREPARE policybot_stmt FROM @policybot_ddl;
EXECUTE policybot_stmt;
DEALLOCATE PREPARE policybot_stmt;
SET @policybot_ddl = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='messages' AND INDEX_NAME='ix_message_conversation'), 'SELECT 1', 'ALTER TABLE messages ADD INDEX ix_message_conversation (conversation_id,company_id,user_id,created_at)');
PREPARE policybot_stmt FROM @policybot_ddl;
EXECUTE policybot_stmt;
DEALLOCATE PREPARE policybot_stmt;
SET @policybot_ddl = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='messages' AND CONSTRAINT_NAME='fk_message_conversation'), 'SELECT 1', 'ALTER TABLE messages ADD CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id,company_id,user_id) REFERENCES conversations(id,company_id,user_id)');
PREPARE policybot_stmt FROM @policybot_ddl;
EXECUTE policybot_stmt;
DEALLOCATE PREPARE policybot_stmt;
INSERT INTO conversations(id,company_id,user_id,title,created_at,updated_at)
 SELECT UUID(),company_id,user_id,'Consultas anteriores',MIN(created_at),MAX(created_at)
 FROM messages m WHERE m.conversation_id IS NULL AND NOT EXISTS (SELECT 1 FROM conversations c WHERE c.company_id=m.company_id AND c.user_id=m.user_id) GROUP BY company_id,user_id;
UPDATE messages m JOIN (SELECT company_id,user_id,MIN(id) AS id FROM conversations GROUP BY company_id,user_id) c ON c.company_id=m.company_id AND c.user_id=m.user_id
 SET m.conversation_id=c.id WHERE m.conversation_id IS NULL;
CREATE TABLE IF NOT EXISTS auth_tokens (
 token_hash CHAR(64) PRIMARY KEY,
 purpose ENUM('reset','invite') NOT NULL,
 company_id CHAR(36) NOT NULL,
 user_id CHAR(36) NULL,
 email VARCHAR(190) NOT NULL,
 name VARCHAR(120) NULL,
 role ENUM('admin','colaborador') NULL,
 expires_at DATETIME(3) NOT NULL,
 used_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX ix_token_expiration (expires_at),
 FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id,company_id) REFERENCES users(id,company_id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO schema_migrations(filename) VALUES ('001_init.sql'),('002_conversations_access_citations.sql');
