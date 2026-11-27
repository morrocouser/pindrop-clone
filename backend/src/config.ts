import dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error('JWT_SECRET est obligatoire (16 caractères minimum). Voir .env.example.');
}

const isProd = process.env.NODE_ENV === 'production';
const paymentsMode = process.env.PAYMENTS_MODE || 'test';

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProd,
  jwtSecret,
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  // URL publique de l'API : sert à construire les liens des sites publiés
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, ''),
  // "test" : les paiements sont simulés (aucun débit réel). Un vrai mode Stripe reste à brancher.
  paymentsMode,
  // Le paiement simulé met un site en ligne sans aucun débit : n'importe qui (le propriétaire compris)
  // peut le confirmer. Il est donc coupé en production, sauf activation explicite (démonstration).
  allowTestPayments: paymentsMode === 'test' && (!isProd || process.env.ALLOW_TEST_PAYMENTS === 'true'),
  platformFeeRate: 0.1,
  // En-tête qui porte l'adresse réelle du client, posé par l'hébergeur et impossible à falsifier.
  // Sur Netlify : x-nf-client-connection-ip. Vide = adresse de la connexion TCP (aucun proxy devant).
  // X-Forwarded-For n'est jamais utilisé : le client peut y écrire ce qu'il veut.
  clientIpHeader: (process.env.CLIENT_IP_HEADER ?? (process.env.LAMBDA_TASK_ROOT ? 'x-nf-client-connection-ip' : '')).toLowerCase(),
  // Passerelle IA OmniRoute (compatible OpenAI) : https://github.com/cheaper-inference/OmniRoute
  omniroute: {
    baseUrl: (process.env.OMNIROUTE_URL || 'http://127.0.0.1:20128/v1').replace(/\/$/, ''),
    apiKey: process.env.OMNIROUTE_API_KEY || '',
    model: process.env.OMNIROUTE_MODEL || 'auto'
  },
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
};
