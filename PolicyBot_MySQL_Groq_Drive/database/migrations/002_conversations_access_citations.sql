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
