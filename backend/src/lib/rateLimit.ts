import { Request } from 'express';
import rateLimit, { ClientRateLimitInfo, Options, RateLimitRequestHandler, Store } from 'express-rate-limit';
import { config } from '../config';
import { prisma } from '../database';

/**
 * Adresse du client servant de clé de limitation.
 * Seul un en-tête posé par l'hébergeur fait foi (voir config.clientIpHeader) ; sinon l'adresse TCP.
 * X-Forwarded-For est ignoré : un client qui en change à chaque requête contournerait la limite.
 */
export function clientKey(req: Request): string {
  if (config.clientIpHeader) {
    const value = req.headers[config.clientIpHeader];
    const ip = (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim();
    if (ip) return ip;
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Compteurs stockés en base : l'API tourne en fonctions sans état (plusieurs instances à la fois),
 * un compteur en mémoire ne serait vu que par une seule d'entre elles.
 * L'incrément est atomique (un seul INSERT … ON CONFLICT), donc sûr avec des requêtes simultanées.
 */
export class PgStore implements Store {
  localKeys = false;
  private windowMs = 60_000;

  constructor(public prefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(key: string): string {
    return `${this.prefix}:${key}`.slice(0, 200);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const secs = this.windowMs / 1000;
    const rows = await prisma.$queryRaw<{ hits: number; reset_at: Date }[]>`
      INSERT INTO "rate_limits" ("key", "hits", "reset_at")
      VALUES (${this.key(key)}, 1, now() + make_interval(secs => ${secs}::double precision))
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE WHEN "rate_limits"."reset_at" <= now() THEN 1 ELSE "rate_limits"."hits" + 1 END,
        "reset_at" = CASE WHEN "rate_limits"."reset_at" <= now() THEN EXCLUDED."reset_at" ELSE "rate_limits"."reset_at" END
      RETURNING "hits", "reset_at"`;
    // Ménage occasionnel des compteurs expirés depuis longtemps. Attendu (pas lancé en tâche de fond) :
    // une fonction Netlify est gelée dès sa réponse envoyée, une requête orpheline n'aboutirait pas.
    if (Math.random() < 0.01) {
      await prisma.$executeRaw`DELETE FROM "rate_limits" WHERE "reset_at" < now() - interval '1 hour'`.catch(() => undefined);
    }
    return { totalHits: Number(rows[0].hits), resetTime: rows[0].reset_at };
  }

  async decrement(key: string): Promise<void> {
    await prisma.$executeRaw`UPDATE "rate_limits" SET "hits" = GREATEST("hits" - 1, 0) WHERE "key" = ${this.key(key)}`;
  }

  async resetKey(key: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM "rate_limits" WHERE "key" = ${this.key(key)}`;
  }
}

/** Limiteur par adresse client, partagé entre toutes les instances de l'API. */
export function limiter(prefix: string, windowMs: number, limit: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientKey,
    store: new PgStore(prefix),
    // La clé ne dépend pas de X-Forwarded-For (voir clientKey) : l'avertissement de la bibliothèque est sans objet
    validate: { xForwardedForHeader: false }
  });
}
