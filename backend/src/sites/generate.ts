import { SiteContent } from './content';
import { SiteStyle } from './styles';

export interface GenerateInput {
  name: string;
  kind?: string; // valeur OSM : "restaurant", "hairdresser", "bakery"…
  address?: string;
  phone?: string;
  email?: string;
  lang: 'fr' | 'en';
}

type Category = 'food' | 'beauty' | 'auto' | 'health' | 'retail' | 'craft' | 'realestate';

const CATEGORY_OF: Record<string, Category> = {
  restaurant: 'food', cafe: 'food', fast_food: 'food', bar: 'food', pub: 'food', bakery: 'food', pastry: 'food',
  butcher: 'food', deli: 'food', confectionery: 'food', coffee: 'food',
  hairdresser: 'beauty', beauty: 'beauty', barber: 'beauty', cosmetics: 'beauty', massage: 'beauty', tattoo: 'beauty',
  car_repair: 'auto', car_wash: 'auto', car: 'auto', tyres: 'auto', motorcycle: 'auto',
  dentist: 'health', clinic: 'health', doctors: 'health', pharmacy: 'health', optician: 'health',
  estate_agent: 'realestate', lawyer: 'realestate', notary: 'realestate', insurance: 'realestate', accountant: 'realestate',
  plumber: 'craft', electrician: 'craft', carpenter: 'craft', painter: 'craft', hvac: 'craft', locksmith: 'craft'
};

interface Copy {
  headline: (n: string) => string;
  tagline: string;
  about: (n: string) => string;
  services: string[];
  cta: string;
}

const COPY: Record<'fr' | 'en', Record<Category, Copy>> = {
  fr: {
    food: {
      headline: (n) => `${n}, à table`,
      tagline: 'Une cuisine faite maison, dans votre quartier.',
      about: (n) => `${n} vous accueille pour partager un bon moment autour de plats préparés avec soin. Passez nous voir ou appelez-nous pour réserver.`,
      services: ['Sur place', 'À emporter', 'Réservations'],
      cta: 'Réserver'
    },
    beauty: {
      headline: (n) => `${n}, prenez soin de vous`,
      tagline: 'Un moment pour vous, près de chez vous.',
      about: (n) => `Chez ${n}, chaque visite est pensée pour vous détendre et vous sentir bien. Prenez rendez-vous en quelques secondes.`,
      services: ['Sur rendez-vous', 'Conseils personnalisés'],
      cta: 'Prendre rendez-vous'
    },
    auto: {
      headline: (n) => `${n}, votre véhicule entre de bonnes mains`,
      tagline: 'Entretien et réparation, avec un devis clair.',
      about: (n) => `${n} s'occupe de votre véhicule avec sérieux et transparence. Contactez-nous pour un devis ou un rendez-vous.`,
      services: ['Entretien', 'Réparation', 'Devis gratuit'],
      cta: 'Demander un devis'
    },
    health: {
      headline: (n) => `${n}, votre santé près de chez vous`,
      tagline: 'Un accueil à l’écoute, des soins de confiance.',
      about: (n) => `${n} vous accueille dans un cadre rassurant. Retrouvez ici nos coordonnées pour nous joindre ou prendre rendez-vous.`,
      services: ['Sur rendez-vous', 'Accueil à l’écoute'],
      cta: 'Prendre rendez-vous'
    },
    retail: {
      headline: (n) => `${n}, votre commerce de proximité`,
      tagline: 'Venez découvrir la boutique, on vous attend.',
      about: (n) => `${n} est un commerce de quartier où l'on prend le temps de vous conseiller. Passez nous voir en boutique.`,
      services: ['Conseils en boutique', 'Produits sélectionnés'],
      cta: 'Nous contacter'
    },
    realestate: {
      headline: (n) => `${n}, un conseil sur lequel compter`,
      tagline: 'Un accompagnement clair, de la première visite à la signature.',
      about: (n) => `${n} vous accompagne dans vos projets avec écoute et transparence. Contactez-nous pour en parler.`,
      services: ['Conseil personnalisé', 'Rendez-vous sur demande'],
      cta: 'Nous contacter'
    },
    craft: {
      headline: (n) => `${n}, du travail bien fait`,
      tagline: 'Intervention rapide et devis gratuit.',
      about: (n) => `${n} réalise vos travaux avec sérieux et dans les délais. Décrivez-nous votre besoin, nous revenons vers vous rapidement.`,
      services: ['Intervention rapide', 'Devis gratuit'],
      cta: 'Demander un devis'
    }
  },
  en: {
    food: {
      headline: (n) => `${n}, come hungry`,
      tagline: 'Homemade food, right in your neighborhood.',
      about: (n) => `${n} welcomes you to share a good meal made with care. Drop by or call us to book a table.`,
      services: ['Dine in', 'Takeaway', 'Reservations'],
      cta: 'Book a table'
    },
    beauty: {
      headline: (n) => `${n}, time for you`,
      tagline: 'A moment just for you, close to home.',
      about: (n) => `At ${n}, every visit is designed to help you unwind and feel your best. Book in seconds.`,
      services: ['By appointment', 'Personal advice'],
      cta: 'Book now'
    },
    auto: {
      headline: (n) => `${n}, your vehicle in good hands`,
      tagline: 'Maintenance and repairs with a clear quote.',
      about: (n) => `${n} looks after your vehicle with care and transparency. Get in touch for a quote or an appointment.`,
      services: ['Maintenance', 'Repairs', 'Free quote'],
      cta: 'Get a quote'
    },
    health: {
      headline: (n) => `${n}, care close to home`,
      tagline: 'A welcoming practice you can trust.',
      about: (n) => `${n} welcomes you in a reassuring setting. Find our details here to reach us or book a visit.`,
      services: ['By appointment', 'Attentive reception'],
      cta: 'Book a visit'
    },
    retail: {
      headline: (n) => `${n}, your local shop`,
      tagline: 'Come and see the shop, we are waiting for you.',
      about: (n) => `${n} is a neighborhood shop where we take the time to help you choose. Come and visit us in store.`,
      services: ['In-store advice', 'Selected products'],
      cta: 'Contact us'
    },
    realestate: {
      headline: (n) => `${n}, advice you can rely on`,
      tagline: 'Clear guidance, from the first visit to the signature.',
      about: (n) => `${n} supports your projects with care and transparency. Get in touch to talk it through.`,
      services: ['Personal advice', 'Appointments on request'],
      cta: 'Contact us'
    },
    craft: {
      headline: (n) => `${n}, work done right`,
      tagline: 'Fast response and free quotes.',
      about: (n) => `${n} carries out your work with care and on schedule. Tell us what you need and we will get back to you quickly.`,
      services: ['Fast response', 'Free quote'],
      cta: 'Get a quote'
    }
  }
};

function categoryOf(kind?: string): Category {
  if (kind && CATEGORY_OF[kind]) return CATEGORY_OF[kind];
  return 'retail';
}

/**
 * Génère le contenu initial d'un site à partir des données du commerce.
 * Textes de départ génériques à relire : les horaires ne sont jamais inventés.
 */
export function generateContent(input: GenerateInput, style: SiteStyle): SiteContent {
  const copy = COPY[input.lang][categoryOf(input.kind)];
  return {
    headline: copy.headline(input.name).slice(0, 120),
    tagline: copy.tagline,
    about: copy.about(input.name).slice(0, 1500),
    services: copy.services,
    hours: [],
    phone: input.phone ?? '',
    email: input.email ?? '',
    address: input.address ?? '',
    cta: copy.cta,
    photos: [],
    colors: { primary: style.primary, accent: style.accent }
  };
}
