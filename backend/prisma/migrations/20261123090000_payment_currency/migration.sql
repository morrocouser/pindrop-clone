-- Devise du lien de paiement (USD, EUR ou MAD)
ALTER TABLE "payment_links" ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'USD';
