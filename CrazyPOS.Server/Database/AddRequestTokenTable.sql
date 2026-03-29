-- ============================================================================
-- Migration: Add request_tokens table
-- Run once against crazypos_dev to enable per-request single-use tokens.
-- ============================================================================

CREATE TABLE request_tokens (
    request_token_id BIGINT        PRIMARY KEY IDENTITY(1,1),
    session_id       BIGINT        NOT NULL,
    token_hash       NVARCHAR(64)  NOT NULL UNIQUE,   -- SHA-256 base64 of plaintext
    issued_at_utc    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    expires_at_utc   DATETIME2     NOT NULL,
    used_at_utc      DATETIME2     NULL,              -- NULL = available; set on first use
    CONSTRAINT FK_request_tokens_sessions
        FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
);

-- Fast lookup by hash (primary access pattern)
CREATE UNIQUE INDEX IX_request_tokens_token_hash
    ON request_tokens (token_hash);

-- Efficient cleanup / session-scoped queries
CREATE INDEX IX_request_tokens_session_expires
    ON request_tokens (session_id, expires_at_utc);

-- Optional: scheduled cleanup job — remove consumed or expired tokens older than 1 hour
-- DELETE FROM request_tokens WHERE used_at_utc IS NOT NULL OR expires_at_utc < DATEADD(HOUR, -1, SYSUTCDATETIME());

SELECT 'request_tokens table created successfully.' AS Status;
