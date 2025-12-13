-- Create Receipts table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[receipts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[receipts]
    (
        [receipt_id] BIGINT PRIMARY KEY IDENTITY(1,1) NOT NULL,
        [transaction_id] BIGINT NOT NULL,
        [receipt_number] NVARCHAR(50) NOT NULL,
        [recipient_email] NVARCHAR(100),
        [recipient_phone] NVARCHAR(20),
        [delivery_method] INT NOT NULL, -- 0=Print, 1=Email, 2=SMS, 3=WhatsApp
        [created_at] DATETIME DEFAULT GETUTCDATE(),
        [sent_at] DATETIME,
        [status] NVARCHAR(20) DEFAULT 'Pending', -- Pending, Sent, Failed
        [notes] NVARCHAR(MAX),
        CONSTRAINT FK_receipts_sales_transactions FOREIGN KEY ([transaction_id]) 
            REFERENCES [dbo].[sales_transactions]([transaction_id])
    );

    -- Create indexes
    CREATE INDEX [IX_receipts_transaction] ON [dbo].[receipts]([transaction_id]);
    CREATE INDEX [IX_receipts_status] ON [dbo].[receipts]([status]);
    CREATE INDEX [IX_receipts_created_at] ON [dbo].[receipts]([created_at]);
END

SELECT 'Receipts table created successfully' AS Message;
