-- Create asset_configurations table for multi-asset payment gateway
CREATE TABLE IF NOT EXISTS asset_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    asset_code VARCHAR(12) NOT NULL,
    asset_issuer VARCHAR(56),
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    min_amount DECIMAL(20, 7) DEFAULT '0' NOT NULL,
    max_amount DECIMAL(20, 7),
    priority INTEGER DEFAULT 0 NOT NULL,
    auto_convert BOOLEAN DEFAULT false NOT NULL,
    settlement_asset_code VARCHAR(12),
    settlement_asset_issuer VARCHAR(56),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_config_merchant 
ON asset_configurations(merchant_id);

CREATE INDEX IF NOT EXISTS idx_asset_config_enabled 
ON asset_configurations(merchant_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_asset_config_priority 
ON asset_configurations(merchant_id, priority DESC);

-- Unique constraint to prevent duplicate asset configs
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_config_unique 
ON asset_configurations(merchant_id, asset_code, COALESCE(asset_issuer, ''));

-- Add foreign key constraint to merchants table if it exists
ALTER TABLE asset_configurations 
ADD CONSTRAINT fk_asset_config_merchant 
FOREIGN KEY (merchant_id) 
REFERENCES merchants(id) 
ON DELETE CASCADE;

-- Add check constraints
ALTER TABLE asset_configurations
ADD CONSTRAINT chk_min_amount_positive 
CHECK (min_amount::numeric >= 0);

ALTER TABLE asset_configurations
ADD CONSTRAINT chk_max_amount_greater_than_min 
CHECK (max_amount IS NULL OR max_amount::numeric > min_amount::numeric);

ALTER TABLE asset_configurations
ADD CONSTRAINT chk_priority_range 
CHECK (priority >= 0 AND priority <= 100);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_asset_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asset_config_timestamp
BEFORE UPDATE ON asset_configurations
FOR EACH ROW
EXECUTE FUNCTION update_asset_config_timestamp();

-- Insert default configurations for testing (optional)
-- Uncomment the following lines for development/testing

-- INSERT INTO asset_configurations (merchant_id, asset_code, asset_issuer, min_amount, max_amount, priority) 
-- VALUES 
-- ('your-merchant-uuid', 'XLM', NULL, '10', '100000', 1),
-- ('your-merchant-uuid', 'USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', '1', '50000', 2);

-- Grant permissions (adjust based on your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON asset_configurations TO your_app_user;