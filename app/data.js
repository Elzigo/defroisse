/* ---------- Routines ---------- */
const ROUTINES = {
  matin:{nom:"Dégonfler", quand:"Chaque matin", pression:"Effleurage", couleur:"var(--drain)",
    intro:"Au réveil, avant le café. Peau sèche ou très peu de produit. Pression d'effleurage partout.",
    steps:[{id:"respiration",s:50},{id:"terminus",s:30},{id:"cou-lateral",s:45},{id:"menton-dessous",s:30},{id:"machoire-drain",s:45},{id:"pommettes-drain",s:45},{id:"yeux-drain",s:40},{id:"front-drain",s:30},{id:"cou-lateral",s:30,note:"Retour : on évacue ce qui vient d'être déplacé."},{id:"froid",s:40,note:"Optionnel, si le gonflement est marqué."}]},
  soir:{nom:"Relâcher", quand:"Lun · mer · ven", pression:"Effleurage à tenue profonde", couleur:"var(--release)",
    intro:"Tenues sur peau sèche d'abord, puis un peu d'huile pour les lissages de fin.",
    steps:[{id:"terminus",s:30},{id:"cuir-chevelu",s:75},{id:"temporal",s:80},{id:"masseter",s:120,note:"Côté le plus tendu : garde-le 20 s de plus."},{id:"froncement",s:60},{id:"nasogenien",s:75},{id:"sterno",s:60,half:true},{id:"menton-dessous",s:30},{id:"pommettes-drain",s:40},{id:"machoire-drain",s:40},{id:"cou-lateral",s:40}]},
  tonif:{nom:"Tonifier", quand:"Lun · mer · ven", pression:"Exercices", couleur:"var(--tone)",
    intro:"Devant un miroir, front détendu. L'étude de référence utilisait 30 min par séance : cette version courte est une base à allonger.",
    steps:[{id:"joues-lift",s:90},{id:"joues-sculpt",s:75},{id:"langue-palais",s:100},{id:"chin-tuck",s:75},{id:"joues-lift",s:90,note:"Deuxième série."},{id:"posture-repos",s:30,note:"Termine en posture de repos."}]},
  lisser:{nom:"Lisser", quand:"Mar · sam", pression:"Légère à modérée", couleur:"var(--posture)",
    intro:"Les rides du bas du visage en priorité, puis le front et les yeux. Peau sèche pour les pincés, une goutte d'huile pour les lissages.",
    steps:[{id:"terminus",s:30},{id:"platysma",s:60,half:true},{id:"ovale",s:60},{id:"mentonnier",s:50},{id:"amertume",s:70,half:true,note:"Commence par le côté où le coin tombe le plus."},{id:"modiolus",s:60},{id:"coins-lift",s:60},{id:"levres",s:50},{id:"aile-nez",s:45},{id:"nasogenien",s:60},{id:"pommettes-lift",s:60},{id:"front-lignes",s:60},{id:"pattes-oie",s:60,half:true},{id:"cou-lateral",s:40,note:"Retour : on évacue vers le cou."}]},
  profonde:{nom:"Séance profonde", quand:"Jeu · dim", pression:"Effleurage à tenue profonde", couleur:"var(--tool)",
    intro:"La séance longue. Intra-buccal en premier avec le gant, puis huile pour le gua sha.",
    steps:[{id:"respiration",s:50},{id:"terminus",s:30},{id:"cou-lateral",s:45},{id:"cuir-chevelu",s:60},{id:"temporal",s:90},{id:"masseter",s:150},{id:"buccal",s:420,half:true},{id:"gua-sha",s:600},{id:"machoire-drain",s:45},{id:"cou-lateral",s:45}]},
  sillon:{nom:"Sillon et coins", quand:"3 fois par semaine", pression:"Légère à tenue profonde", couleur:"var(--release)",
    intro:"Le cou d'abord pour ouvrir la sortie, puis le muscle qui tire le coin de la bouche vers le bas, le sillon par l'intérieur avec le gant, et des exercices pour finir. Commence chaque geste par le côté où le sillon est le plus marqué.",
    steps:[{id:"terminus",s:30},{id:"cou-lateral",s:30},{id:"platysma",s:60,half:true},{id:"abaisseur",s:120,half:true,note:"Côté où le coin tombe le plus en premier."},{id:"masseter",s:60,note:"Version courte : tenue et ouvertures, les deux côtés ensemble."},{id:"abaisseur-int",s:90,half:true,note:"Enfile le gant pour les deux gestes intra-buccaux."},{id:"sillon-int",s:180,half:true},{id:"aile-nez",s:45,note:"Gant retiré, peau sèche."},{id:"joues-lift",s:90},{id:"coins-lift",s:60},{id:"air-sillon",s:40},{id:"machoire-drain",s:40},{id:"cou-lateral",s:30,note:"Retour : on évacue vers le cou."}]}
};
const WEEK = {0:["matin","profonde"],1:["matin","soir","tonif"],2:["matin","lisser"],3:["matin","soir","tonif"],4:["matin","profonde"],5:["matin","soir","tonif"],6:["matin","lisser"]};
const DOW = ["dim","lun","mar","mer","jeu","ven","sam"];

/* ---------- Données des onglets ---------- */
const EVIDENCE = [
  ["Gua sha","10 min, 5 fois/sem., 8 sem. ; 34 femmes de 20 à 50 ans","4 distances de surface du visage −2,23 à −2,40 mm ; tonus −2,02 Hz ; raideur −56 N/m","Comparé au rouleau, sans groupe sans traitement ; suivi de 8 semaines",4],
  ["Rouleau facial","Même essai","Élasticité globale +8,6 %, biologique +7,5 % ; distances −2,75 à −3,26 mm ; tonus inchangé","Mêmes limites",4],
  ["Exercices faciaux","30 min par jour puis un jour sur deux, 20 sem. ; femmes de 40 à 65 ans","Plénitude du haut et du bas des joues améliorée ; âge estimé 50,8 → 48,1 ans","16 participantes analysées, pas de groupe contrôle, participantes motivées",3],
  ["Face yoga intensif","8 sem. ; femmes d'âge moyen","Tonus et raideur en baisse : frontal, corrugateur, orbiculaires de l'œil et de la bouche","Étude avant/après, sans groupe contrôle",3],
  ["Massage masséter et temporal","41 patients ATM, 5 séances","Efficace chez 70,3 % ; épaisseur du masséter en baisse chez les répondeurs","Patients avec douleur, massage par robot, sans contrôle",3],
  ["Mastication d'un seul côté","75 personnes avec un côté préféré","Moitié de visage plus large du côté de mastication dans 75 % des cas","Transversale : la cause peut être dans l'autre sens",3],
  ["Côté de sommeil","71 patients","Paupière supérieure plus basse du côté de sommeil","Transversale",3],
  ["Gua sha et microcirculation","11 adultes, sur le dos","Microcirculation ×4 environ, élevée pendant les 25 min d'observation","Dos et non visage ; pas de contrôle",2],
  ["Stimulation mécanique cyclique","Peau humaine en laboratoire + 20 femmes de 65 à 75 ans, 8 sem.","Protéines du derme en hausse ; rides améliorées","Appareil associé à une crème anti-âge",2],
  ["Massage intra-buccal esthétique","—","Aucune étude contrôlée","Pratique de facialistes",1],
  ["Posture de langue chez l'adulte","—","Aucune étude contrôlée sur la forme de la mâchoire","Utile pour la respiration et la mâchoire, pas démontré pour l'os",1],
  ["Massage fascial et vieillissement","—","Preuves jugées limitées par les anatomistes","Effets attribuables à toutes les couches, pas au fascia seul",1]
];
const SYMCAUSES = [
  ["Mâcher d'un seul côté","Sur 75 personnes ayant un côté de mastication préféré, la moitié du visage la plus large correspondait au côté de mastication dans 75 % des cas, et 52 % ignoraient leur habitude. Chez des jumeaux, les scores de symétrie étaient meilleurs quand le jumeau mâchait des deux côtés. Une étude de Scientific Reports (2024) relie aussi le côté de mastication à l'asymétrie du visage, plus nettement chez les hommes. Ces études sont transversales : l'asymétrie peut aussi précéder l'habitude.",3],
  ["Dormir sur le côté","Chez 71 patients, ceux qui dormaient surtout d'un côté avaient une paupière supérieure plus basse de ce côté. La compression nocturne crée aussi des rides de sommeil du côté écrasé et un gonflement asymétrique au réveil.",3],
  ["Serrer ou grincer des dents","Le masséter s'épaissit avec le serrage. Quand un côté travaille plus, le bas du visage s'élargit de ce côté. Chez des patients ATM, le massage a réduit l'épaisseur du masséter chez ceux qui répondaient au traitement.",3],
  ["Tête penchée et épaules","Téléphone tenu d'un côté, écran décalé, sac toujours sur la même épaule : le SCM et le trapèze se raccourcissent d'un côté et la tête s'incline.",2]
];
const TOOLS = [
  ["Gua sha","Le seul outil manuel testé dans un essai randomisé sur le visage : contours et tonus musculaire. Voir le geste Gua sha du visage.",4],
  ["Rouleau facial","Même essai : l'élasticité de la peau progresse de 8,6 % en 8 semaines, sans effet sur le tonus des muscles. Utilisable à la place du gua sha les soirs pressés.",4],
  ["Microcourant","Appareils à courant de très faible intensité. Dans une étude sur 30 personnes, les rides du front ont diminué de 18 % juste après la série de séances et de 21 % un mois plus tard, avec un effet plus faible autour du nez et de la bouche. Les revues s'appuient surtout sur de petits essais.",3]
];

