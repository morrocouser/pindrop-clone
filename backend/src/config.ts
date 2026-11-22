import dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error('JWT_SECRET est obligatoire (16 caractères minimum). Voir .env.example.');
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProd: process.env.NODE_ENV === 'production',
  jwtSecret,
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  // URL publique de l'API : sert à construire les liens des sites publiés
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, ''),
  // "test" : les paiements sont simulés (aucun débit réel). Un vrai mode Stripe reste à brancher.
  paymentsMode: process.env.PAYMENTS_MODE || 'test',
  platformFeeRate: 0.1,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
};
