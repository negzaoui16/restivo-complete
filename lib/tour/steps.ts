/**
 * Visites guidées : texte statique, aucun appel LLM.
 * `selector` désigne un attribut data-tour (ex. "client-nav-explore").
 * Sans selector (ou si l'élément est masqué, par exemple sur mobile),
 * la bulle s'affiche au centre de l'écran.
 */

export type TourRole = "client" | "manager" | "staff";

export interface TourStep {
  id: string;
  /** Valeur de l'attribut data-tour ciblé ; vide = bulle centrée. */
  selector?: string;
  titre: string;
  texte: string;
  /** Variante pour la page publique (hors connexion) ; sinon `texte`. */
  publicText?: string;
  /** Page à ouvrir avant d'afficher l'étape. */
  route?: string;
}

const CLIENT: TourStep[] = [
  {
    id: "client-bienvenue",
    titre: "Bienvenue sur Restivo",
    texte:
      "Cette visite de quelques étapes vous montre comment réserver une table et précommander vos plats.",
    route: "/mainpage",
  },
  {
    id: "client-recherche",
    publicText:
      "Une fois connecté, une barre de recherche vous permet de trouver un restaurant par son nom ou sa ville.",
    selector: "client-search",
    titre: "Chercher un restaurant",
    texte: "Tapez le nom ou la ville du restaurant que vous cherchez.",
  },
  {
    id: "client-explorer",
    selector: "client-nav-explore",
    titre: "Choisir et réserver",
    texte:
      "Dans Explore, ouvrez un restaurant. Choisissez la date, l'heure et le nombre d'invités, puis une table libre sur le plan. Vous pouvez ensuite ouvrir le menu, choisir vos plats et tout confirmer en une seule fois.",
    route: "/mainpage/explore",
  },
  {
    id: "client-3d",
    titre: "Salle en 3D et plats en réalité augmentée",
    texte:
      "Le plan de la salle s'affiche en 2D ou en vue 3D pour choisir votre table. Les plats qui ont un modèle 3D s'ouvrent en réalité augmentée : posez-les virtuellement sur votre table, à leur taille réelle, avant de commander.",
    route: "/mainpage/explore",
  },
  {
    id: "client-reservations",
    publicText:
      "Dans Reservations, vous retrouvez vos réservations. Vous pouvez les modifier, les annuler, précommander vos repas avec le bouton Pre-order meals, et laisser un avis après votre repas.",
    selector: "client-nav-reservations",
    titre: "Mes réservations",
    texte:
      "Retrouvez ici vos réservations. Vous pouvez les modifier, les annuler, précommander vos repas avec le bouton Pre-order meals, et laisser un avis après votre repas.",
    route: "/mainpage/reservations",
  },
  {
    id: "client-commandes",
    publicText: "Dans Orders, vous suivez l'état de vos précommandes de plats.",
    selector: "client-nav-orders",
    titre: "Mes précommandes",
    texte: "Suivez ici l'état de vos précommandes de plats.",
    route: "/mainpage/orders",
  },
  {
    id: "client-notifications",
    publicText:
      "Une fois connecté, la cloche en haut de l'écran vous prévient quand le restaurant confirme, modifie ou annule votre réservation.",
    selector: "client-bell",
    titre: "Notifications",
    texte:
      "La cloche vous prévient quand le restaurant confirme, modifie ou annule votre réservation.",
  },
  {
    id: "client-hors-ligne",
    titre: "Installez Restivo sur votre téléphone",
    texte:
      "Restivo s'installe comme une application depuis votre navigateur. Une fois chargés, la carte et les modèles 3D des plats restent consultables même sans connexion.",
  },
  {
    id: "client-aide",
    publicText:
      "Une fois connecté, le bouton d'aide en haut de l'écran relance cette visite guidée à tout moment.",
    selector: "tour-help",
    titre: "Besoin d'aide ?",
    texte: "Ce bouton relance la visite guidée à tout moment.",
  },
];

const MANAGER: TourStep[] = [
  {
    id: "manager-tableau",
    selector: "manager-nav-overview",
    titre: "Tableau de bord",
    texte:
      "Voici la vue d'ensemble : réservations du jour, couverts, commandes à traiter et activité récente. Les chiffres se rafraîchissent toutes les 30 secondes.",
    route: "/mainpage/restaurants",
  },
  {
    id: "manager-reservations",
    publicText:
      "Dans Reservations & orders, vous traitez les réservations et les commandes du jour. Vous pouvez installer les clients, terminer, déclarer un no-show ou annuler.",
    selector: "manager-nav-reservations",
    titre: "Réservations et commandes",
    texte:
      "Ici, vous traitez les réservations et les commandes du jour. Vous pouvez installer les clients, terminer, déclarer un no-show ou annuler.",
    route: "/mainpage/restaurants/reservations",
  },
  {
    id: "manager-salle",
    selector: "manager-nav-live",
    titre: "Salle en direct",
    texte:
      "Le plan de salle, en 2D ou en 3D, est coloré selon l'état de chaque table. Cliquez sur une table pour voir sa réservation et agir. Les alertes d'arrivée et de retard arrivent dans la cloche.",
    route: "/mainpage/restaurants/live",
  },
  {
    id: "manager-menu",
    selector: "manager-nav-menu",
    titre: "Menu et promotions",
    texte:
      "Créez vos catégories et vos plats, avec des étiquettes (halal, végétarien, épicé…). Générez un modèle 3D de chaque plat à partir d'une photo, puis publiez le menu : vos clients pourront précommander et voir les plats en réalité augmentée.",
    route: "/mainpage/restaurants/menu",
  },
  {
    id: "manager-tables",
    selector: "manager-nav-tables",
    titre: "Plan de salle",
    texte:
      "Dessinez vos tables et vos étages en 2D ou en 3D. Vous pouvez même générer le plan avec l'IA à partir de deux photos de la salle. Publiez le restaurant quand il a au moins une table active : il devient alors visible aux clients.",
    route: "/mainpage/restaurants/tables",
  },
  {
    id: "manager-ia",
    selector: "manager-nav-ai",
    titre: "Assistant IA",
    texte:
      "Posez vos questions sur votre restaurant : l'assistant lit vos vraies données, sans rien modifier.",
    route: "/mainpage/restaurants/ai",
  },
  {
    id: "manager-analytics",
    selector: "manager-nav-analytics",
    titre: "Analytics",
    texte:
      "Pilotez votre restaurant : vue d'ensemble, stock, comptabilité, rentabilité de chaque plat et prévisions d'achats par intelligence artificielle. La page reste utilisable hors connexion.",
    route: "/mainpage/restaurants/analytics",
  },
  {
    id: "manager-aide",
    publicText:
      "Une fois connecté, le bouton d'aide en haut de l'écran relance cette visite guidée à tout moment.",
    selector: "tour-help",
    titre: "Besoin d'aide ?",
    texte: "Ce bouton relance la visite guidée à tout moment.",
  },
];

const STAFF: TourStep[] = [
  {
    id: "staff-accueil",
    publicText:
      "À votre première connexion, choisissez votre restaurant et envoyez une demande d'adhésion. Le gérant doit l'accepter.",
    selector: "staff-nav-overview",
    titre: "Votre espace de service",
    texte:
      "Si vous n'avez pas encore de restaurant, choisissez-en un et envoyez une demande d'adhésion. Le gérant doit l'accepter.",
    route: "/mainpage/staff",
  },
  {
    id: "staff-reservations",
    selector: "staff-nav-reservations",
    titre: "Réservations du jour",
    texte: "Installez les clients à leur arrivée, puis terminez la réservation à leur départ.",
  },
  {
    id: "staff-tables",
    selector: "staff-nav-tables",
    titre: "Les tables",
    texte:
      "Voyez l'état de chaque table : libre, réservée ou occupée. Installez un client en un geste, puis libérez la table quand il part.",
  },
  {
    id: "staff-commandes",
    selector: "staff-nav-orders",
    titre: "Commandes",
    texte: "Faites avancer chaque commande : en préparation, prête, puis livrée.",
  },
  {
    id: "staff-menu",
    selector: "staff-nav-menu",
    titre: "La carte",
    texte:
      "Consultez la carte du restaurant avec les photos des plats et leur disponibilité, pour renseigner les clients sans quitter la salle.",
  },
  {
    id: "staff-aide",
    publicText:
      "Une fois connecté, le bouton d'aide en haut de l'écran relance cette visite guidée à tout moment.",
    selector: "tour-help",
    titre: "Besoin d'aide ?",
    texte: "Ce bouton relance la visite guidée à tout moment.",
  },
];

export const TOUR_STEPS: Record<TourRole, TourStep[]> = {
  client: CLIENT,
  manager: MANAGER,
  staff: STAFF,
};

export const TOUR_STORAGE_PREFIX = "restivo_tour_";

/**
 * Étapes réservées à la démo automatique (parcours complet d'un profil).
 * Elles ne font pas partie des visites courtes : TOUR_STEPS ne les contient pas.
 */
export const DEMO_EXTRA_STEPS: TourStep[] = [
  {
    id: "manager-demo-intro",
    titre: "Votre restaurant est déjà prêt",
    texte:
      "Vous êtes connecté en tant que gérant de Dar Restivo, un restaurant déjà créé et publié. Nous allons parcourir toute l'expérience gérant : tableau de bord, réservations, salle en direct, menu en 3D, plan de salle, équipe, assistant et analytics.",
  },
  {
    id: "manager-demo-profile",
    selector: "manager-profile",
    titre: "La fiche du restaurant",
    texte:
      "Le nom du restaurant, en haut, ouvre sa fiche : contact, adresse, devise, fuseau horaire, type de cuisine, niveau de prix, logo et horaires d'ouverture, y compris de nuit.",
  },
  {
    id: "manager-demo-stats",
    selector: "manager-stats",
    titre: "Les chiffres du jour",
    texte:
      "Voici le tableau de bord. Quatre chiffres : les réservations du jour, les couverts attendus, les commandes à traiter et le chiffre d'affaires. Ils se rafraîchissent toutes les 30 secondes.",
  },
  {
    id: "manager-demo-ov-reservations",
    selector: "manager-overview-reservations",
    titre: "Les réservations du jour",
    texte: "Ici, les réservations de la journée, avec l'heure, la table et le nombre d'invités.",
  },
  {
    id: "manager-demo-ov-orders",
    selector: "manager-overview-orders",
    titre: "Les précommandes en cours",
    texte: "Dessous, les précommandes des clients, à suivre jusqu'à la livraison.",
  },
  {
    id: "manager-demo-ov-activity",
    selector: "manager-overview-activity",
    titre: "L'activité récente",
    texte:
      "Chaque réservation ou commande créée, modifiée ou annulée apparaît ici, pour savoir ce qui vient de se passer.",
  },
  {
    id: "manager-demo-bell",
    selector: "manager-bell",
    titre: "Les alertes en direct",
    texte:
      "La cloche vous prévient : client attendu, no-show possible, ou table qui dépasse son créneau.",
  },
  {
    id: "manager-demo-sidebar",
    selector: "manager-sidebar-toggle",
    titre: "Un menu qui se replie",
    texte:
      "Ce bouton replie la barre latérale pour gagner de la place sur les écrans moyens. Un second clic la rouvre.",
  },
  {
    id: "manager-demo-reservations",
    selector: "manager-page-reservations",
    titre: "Réservations",
    texte:
      "Choisissez le jour et filtrez par statut. Pour chaque réservation, seuls les boutons permis apparaissent : installer le client, terminer, déclarer un no-show ou annuler. Annuler une réservation annule aussi ses précommandes, et le client est prévenu.",
  },
  {
    id: "manager-demo-orders",
    selector: "manager-page-reservations",
    titre: "Commandes",
    texte:
      "Dans l'onglet Orders, faites avancer chaque commande : confirmée, en préparation, prête, puis livrée. Le client reçoit une notification à chaque étape.",
  },
  {
    id: "manager-demo-live",
    selector: "manager-page-live",
    titre: "La salle en direct",
    texte:
      "Chaque table est colorée selon son état : libre, bientôt réservée, occupée ou en dépassement. Basculez entre la vue 2D et la vue 3D de la salle. Cliquez sur une table pour voir sa réservation, installer le client, terminer ou déclarer un no-show. Les chronomètres suivent l'heure du serveur.",
  },
  {
    id: "manager-demo-menu",
    selector: "manager-page-menu",
    titre: "Menu et promotions",
    texte:
      "Créez des catégories et des plats avec des prix à trois décimales en dinar. Un assistant culinaire intégré, qui fonctionne sans connexion, propose la description, les étiquettes (halal, végétarien, épicé…) et un prix indicatif. Réordonnez les plats, rendez-en un indisponible, créez des promotions, puis publiez le menu.",
  },
  {
    id: "manager-demo-menu-3d",
    selector: "manager-page-menu",
    titre: "Des plats en 3D et en réalité augmentée",
    texte:
      "Ajoutez la photo d'un plat et générez son modèle 3D en un clic. Le plat garde sa taille réelle en centimètres. L'aperçu du menu s'ouvre en grand écran ou en format smartphone, en grille avec la vue 3D ou en liste, et vos clients peuvent poser le plat sur leur table en réalité augmentée.",
  },
  {
    id: "manager-demo-tables",
    selector: "manager-page-tables",
    titre: "Le plan de salle",
    texte:
      "Dessinez vos étages : tables, chaises, murs, bar. Ces tables sont celles que vos clients réservent. Le restaurant n'est visible que s'il a au moins une table active.",
  },
  {
    id: "manager-demo-tables-3d",
    selector: "manager-tables-3d",
    titre: "2D ou 3D",
    texte:
      "Passez du plan 2D à la vue 3D de la salle d'un clic. Vos clients voient eux aussi cette vue 3D au moment de choisir leur table.",
  },
  {
    id: "manager-demo-tables-walls",
    selector: "manager-tables-walls",
    titre: "Les murs en un clic",
    texte:
      "Room Walls trace automatiquement les murs du pourtour de la salle, à partir de ses dimensions.",
  },
  {
    id: "manager-demo-tables-ai",
    selector: "manager-tables-ai",
    titre: "Le plan généré par l'IA",
    texte:
      "Prenez deux photos de la salle, face avant puis face arrière. L'intelligence artificielle détecte les tables, les chaises et les éléments, puis les place sur le plan en 2D.",
  },
  {
    id: "manager-demo-staff",
    selector: "manager-page-staff",
    titre: "L'équipe",
    texte:
      "Acceptez ou refusez les demandes d'adhésion du personnel, et nommez ou retirez un manager.",
  },
  {
    id: "manager-demo-ai",
    selector: "manager-page-ai",
    titre: "L'assistant IA",
    texte:
      "Posez une question sur votre restaurant, par exemple les réservations du jour ou l'état des tables. L'assistant lit vos vraies données, sans rien modifier.",
  },
  {
    id: "manager-demo-analytics",
    selector: "manager-page-analytics",
    titre: "Analytics : piloter son restaurant",
    texte:
      "Une page de pilotage complète : suivi du stock et des dépenses, comptabilité et revenus, et export du bilan. Elle continue de fonctionner hors connexion et se synchronise au retour du réseau.",
  },
  {
    id: "manager-demo-analytics-tabs",
    selector: "manager-analytics-tabs",
    titre: "Cinq vues, cinq décisions",
    texte:
      "La vue d'ensemble, la gestion de stock, l'IA prédictive qui calcule vos achats à prévoir, la comptabilité, et la rentabilité du menu : une matrice qui classe vos plats en stars, vaches à lait, dilemmes et poids morts.",
  },
  {
    id: "manager-demo-fin",
    titre: "Fin du parcours gérant",
    texte:
      "Vous avez vu tout le parcours gérant, de la fiche du restaurant jusqu'aux analytics. Merci de votre attention.",
  },
];
