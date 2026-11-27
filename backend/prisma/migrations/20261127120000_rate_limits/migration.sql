-- Compteurs de limitation de débit partagés entre les instances de l'API (fonctions sans état)
CREATE TABLE "rate_limits" (
    "key" VARCHAR(200) NOT NULL,
    "hits" INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limits_reset_at_idx" ON "rate_limits"("reset_at");
