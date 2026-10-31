-- Brightloop Extra DB Constraints & Partial Indexes (DATABASE.md §5)

-- Case-insensitive unique email (belt and braces; app also lower-cases)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

-- Domain checks
ALTER TABLE products          ADD CONSTRAINT chk_products_prices  CHECK (sales_price >= 0 AND cost_price >= 0);
ALTER TABLE product_variants  ADD CONSTRAINT chk_variant_surcharge CHECK (price_surcharge >= 0);
ALTER TABLE taxes             ADD CONSTRAINT chk_tax_rate         CHECK (rate_percent BETWEEN 0 AND 100);
ALTER TABLE payment_terms     ADD CONSTRAINT chk_term_days        CHECK (days >= 0);
ALTER TABLE plans             ADD CONSTRAINT chk_plan_price       CHECK (price >= 0);
ALTER TABLE plans             ADD CONSTRAINT chk_plan_minqty      CHECK (min_quantity >= 1);
ALTER TABLE plans             ADD CONSTRAINT chk_plan_dates       CHECK (valid_to IS NULL OR valid_to >= valid_from);
ALTER TABLE discounts         ADD CONSTRAINT chk_discount_value   CHECK (value > 0 AND (type <> 'PERCENT' OR value <= 100));
ALTER TABLE discounts         ADD CONSTRAINT chk_discount_dates   CHECK (end_date IS NULL OR end_date >= start_date);
ALTER TABLE discounts         ADD CONSTRAINT chk_discount_uses    CHECK (current_uses >= 0 AND (max_uses IS NULL OR current_uses <= max_uses));
ALTER TABLE subscriptions     ADD CONSTRAINT chk_sub_dates        CHECK (expiry_date > start_date);
ALTER TABLE subscription_lines ADD CONSTRAINT chk_sl_amounts      CHECK (quantity >= 1 AND unit_price >= 0);
ALTER TABLE invoices          ADD CONSTRAINT chk_inv_amounts      CHECK (
  total_amount >= 0 AND amount_paid >= 0 AND amount_paid <= total_amount
  AND amount_due = total_amount - amount_paid);
ALTER TABLE payments          ADD CONSTRAINT chk_payment_amount   CHECK (amount > 0);

-- Dashboard / overdue acceleration (partial index: only open receivables)
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices (due_date)
  WHERE status = 'CONFIRMED' AND amount_due > 0;

-- Billing Day picker (only live subscriptions)
CREATE INDEX IF NOT EXISTS idx_subscriptions_billable ON subscriptions (next_billing_date)
  WHERE status = 'ACTIVE';
