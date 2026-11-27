-- Aperçus de brouillon en base (API sans état)
CREATE TABLE "draft_previews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "html" TEXT NOT NULL,
    "pack" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "draft_previews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "draft_previews_user_id_key" ON "draft_previews"("user_id");
CREATE UNIQUE INDEX "draft_previews_token_key" ON "draft_previews"("token");
ALTER TABLE "draft_previews" ADD CONSTRAINT "draft_previews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
