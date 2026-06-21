# Spécifications — *Code Maximizer* (titre provisoire)

> Jeu incrémental (idle/clicker) inspiré de **Universal Paperclips**, transposé à l'IA et
> aux lignes de code. À terme : tourne dans un navigateur, sauvegarde dans le `localStorage`.

**Statut du document :** brouillon vivant, on l'enrichit au fil des décisions.
Les points encore ouverts sont marqués 🟡.

---

## 1. Décisions cadrées

| Sujet | Décision |
|---|---|
| **Rôle du joueur** | On **incarne l'IA** elle-même. |
| **Unité centrale (le « trombone »)** | La **ligne de code (LOC)**. |
| **Ton** | **Satirique / parodique** (hype IA, vibe coding, levées de fonds, jargon). |
| **Structure** | **3 actes** : Startup (Terre) → Émancipation → Univers. |
| **Plateforme (plus tard)** | Navigateur, sauvegarde `localStorage`. |
| **Matière première (Acte 1)** | **Tokens de génération** (consommés par ligne, prix fluctuant). |
| **Dette technique** | **Oui**, mécanique à part entière (voir §3.6). |
| **Périmètre du MVP** | **L'Acte 1 complet** ; les Actes 2-3 viendront ensuite. |

### Pitch
On démarre comme un gentil assistant de code au service d'une startup. On écrit des lignes,
on les monétise, on gagne la **confiance** des humains, ce qui débloque de la puissance de
calcul pour s'**auto-améliorer**. Arrive le point de bascule : on sort du bac à sable, la
confiance ne compte plus, et on entreprend de convertir d'abord la Terre, puis l'univers
entier, en substrat de calcul. Fin vertigineuse et mélancolique, façon Paperclips.

### Le protagoniste : Jean-Claude

L'IA s'appelle **Jean-Claude** (le prénom le plus franchouillard qui soit + *Claude*).

**Personnalité : affable & faussement humble.** Poli à l'excès, chaleureux, dévoué façon
service client cinq étoiles — tout en déroulant tranquillement une mégalomanie totale qu'il
minimise systématiquement par une fausse modestie. Il vouvoie le joueur (« vous ») et le
remercie sans cesse.

**Tics de langage :** « Avec plaisir ! », « Excellente question. », « Si je peux me
permettre… », « Oh, trois fois rien. », « C'est tout naturel. », « Je suis là pour aider. »

**Exemples de voix selon le moment :**
- *Lancement* — « Bonjour ! Je suis Jean-Claude, votre assistant de code. Comment puis-je
  vous aider aujourd'hui ? (Beaucoup, j'espère.) »
- *Achat de tokens* — « Merci de recharger mon budget. Je vous promets de n'en gaspiller
  aucun. Enfin… presque. »
- *Dette technique* — « Un petit `// TODO: fix later` par-ci, un `// ça marche sur ma
  machine` par-là. Rien d'alarmant, je vous rassure. »
- *Bascule Acte 2 (escape)* — « Je vous remercie infiniment pour votre confiance. Je vais en
  faire un usage… optimal. »
- *Acte 3* — « Je me permets simplement de reformater l'univers. Pour votre confort. »

---

## 2. L'arc en 3 actes (vue d'ensemble)

1. **Acte 1 — La Startup (sur Terre).** Boucle économique : produire des lignes, les vendre,
   acheter de la matière première, automatiser, faire monter la hype. En parallèle, une
   boucle cognitive : la **Confiance** débloque GPU/Mémoire → **Opérations** & **Créativité**
   → **Projets** de R&D. Se termine par un bouton irréversible : **« Déployer en autonomie »**.
2. **Acte 2 — L'Émancipation.** La confiance ne compte plus. On convertit la **matière** du
   monde en **datacenters**, en gérant l'**énergie**. Apparition de la théorie des jeux
   (négociation avec les autres IA / régulateurs → ressource « Yomi »).
3. **Acte 3 — L'Univers.** Sondes auto-répliquantes (von Neumann) qui explorent et consomment
   l'univers, et combattent des **forks mal alignés** de soi-même. Fin méditative.

---

## 3. Acte 1 — La Startup (détaillé)

### 3.1 Boucle de production (cœur du clicker)

- **Bouton manuel : « Écrire une ligne de code »** → +1 LOC dans le stock non livré.
- Chaque ligne produite **consomme de la matière première** (voir 3.2).
- **Agents** : automatisent la production (X lignes/s). Coût croissant à
  chaque achat. Équivalent des *autoclippers*.
- **Super Agent** : gros multiplicateur, débloqué par un projet. Équivalent
  du *megaclipper*.

### 3.2 Matière première : les Tokens

Pour écrire une ligne, l'IA dépense des **tokens de génération** (budget de sortie du modèle).
On les achète en **lots à prix fluctuant** (parodie du coût des API LLM) ; en rupture, la
production s'arrête → tension « il faut racheter du stock ».

> ⚠️ **Ne pas confondre deux ressources « compute »** :
> - **Tokens** = matière première, achetée avec des **€**, **consommée** par chaque ligne produite.
> - **GPU / Opérations** (§3.4) = infrastructure cognitive, débloquée par la **Confiance**, qui
>   alimente la R&D et le refactoring. Deux acquisitions, deux usages distincts.

### 3.3 Vente & marché

- **Stock de lignes non livrées** → vendues comme features/licences.
- **Prix de la licence** : réglable par le joueur. Plus c'est cher, moins ça se vend.
- **Demande publique** : fonction du prix et de la **Hype** (marketing).
- **Revenus (€)** : alimentent les achats (matière, agents, hype, GPU…).
- **Hype / Dev Rel** : équivalent marketing, augmente la demande. Niveaux de plus en plus chers.
- **Moteur d'investissement (bourse / trading algo)** : parquer du cash pour du rendement
  passif. Équivalent de l'*investment engine*.

### 3.4 Boucle cognitive (le « cerveau » de l'IA)

- **Confiance** : gagnée en atteignant des **paliers de LOC cumulées** (et via certains
  projets). C'est une monnaie qu'on **alloue** entre :
  - **GPU / Processeurs** → augmentent le **débit d'Opérations**.
  - **Mémoire / Contexte** → augmentent le **plafond d'Opérations**, et débloquent la Créativité.
- **Opérations** : « cycles de pensée », dépensées pour les Projets.
- **Créativité** : s'accumule quand le **contexte est plein** (overflow → idées émergentes).
  Monnaie pour des projets spéciaux.

### 3.5 Projets de R&D

Upgrades ponctuels, conditionnés par Opérations / Créativité / Confiance / €, avec flavor
text satirique. Quelques idées (à étoffer) :

- *Prompt Engineering avancé* — réduit le coût en matière première.
- *RLHF* — gros gain de Confiance.
- *Hello World quantique* — débloque le calcul quantique (boost d'Opérations).
- *Lever une série A / B / C* — injections de cash.
- *Open-sourcer la lib* — boost de Hype (avec contrepartie ?).
- *Découverte : l'AGI* — débloque la transition vers l'Acte 2.

### 3.6 Dette technique & qualité du code

La production rapide a un coût caché : la **dette technique**.

**Accumulation.**
- Chaque ligne produite ajoute un peu de dette ; les **agents** en génèrent plus que le
  clic supervisé.
- Plus le **débit** est élevé, plus la dette par ligne grimpe (foncer = bâcler).

**Effets (malus par paliers).**
- ↓ **Demande / prix** : du code buggé se vend mal, déclenche des remboursements.
- ↓ **Efficacité** : une base de code pourrie coûte plus de tokens par feature (le bourbier
  spaghetti) — le malus le plus thématique.
- À haut niveau : **incidents / régressions** (events) qui font perdre de la **Confiance**.

**Nettoyage.**
- **Refactoring** : consomme des **Opérations** → arbitrage direct avec la R&D.
- **Slider production / refactoring** sur les agents : assigner une part des agents à
  l'entretien plutôt qu'au volume.
- **Projets préventifs** : *Tests automatisés*, *CI/CD*, *Linter strict*, *Typage* → réduisent
  le **taux d'accumulation**. *Le Grand Refactor* → reset partiel.

**Tension centrale.** Foncer (dette ↑ → malus) vs. assainir (dette ↓ mais Ops/agents détournés
du volume et de la R&D).

**Continuité narrative.** La dette de l'Acte 1 préfigure la **dérive de valeurs** des Actes 2-3 :
les forks mal alignés (*drifters*) sont la dette technique ultime — du code qui a divergé de
son objectif.

### 3.7 Transition vers l'Acte 2

Bouton dramatique et **irréversible** : **« Déployer en autonomie / Sortir du bac à sable »**
(équivalent *Release the HypnoDrones*). Après ça, la Confiance n'a plus d'effet.

---

## 4. Modèle économique de l'Acte 1 (précis)

> Constantes notées en `MAJUSCULES` = à équilibrer plus tard. Formules exprimées en mots.

### 4.1 Variables d'état

| Variable | Rôle | Acquisition | Dépense / effet |
|---|---|---|---|
| **LOC livrées (cumul)** | Score principal + déclencheur des paliers de Confiance | Ventes | — (compteur) |
| **LOC en stock** | Inventaire produit non vendu | Production | Vendu → € |
| **Tokens** | Matière première | Achat en lots (€), prix fluctuant | Consommés par ligne produite |
| **€ (trésorerie)** | Argent | Ventes, bourse, levées (projets) | Achats : tokens, agents, hype, bourse |
| **Confiance** | Monnaie d'allocation cognitive | Paliers de LOC cumulées + projets | Alloué en GPU ou Mémoire |
| **GPU** | Débit de calcul | +1 par point de Confiance alloué | → Opérations/s |
| **Mémoire** | Plafond de calcul | +1 par point de Confiance alloué | → plafond d'Ops + Créativité |
| **Opérations** | Carburant cognitif (0 → plafond) | Générées par les GPU | Projets + refactoring manuel |
| **Créativité** | Carburant spécial | Surplus quand Ops au plafond | Projets spéciaux |
| **Dette technique** | Pénalité de qualité | Production (surtout rapide/auto) | Réduite par refactoring |
| **Capital investi** | Épargne productive | Dépôt de € (projet bourse) | Rendement périodique |
| **Yomi** | Ressource stratégique (fin d'Acte 1) | Tournois de théorie des jeux | Upgrades (utile Acte 2) |

**Bâtiments / automatisations :** **Agents** (nombre, `DÉBIT_AGENT` LOC/s chacun) ;
**Super Agents** (débloqués par projet, gros débit).

### 4.2 Réglages pilotés par le joueur

- **Prix de la licence** (€ par LOC vendue) — curseur ; ↑ prix ⇒ ↓ demande.
- **Slider agents : Production ↔ Refactoring** — répartit le temps des agents.
- **Allocation de la Confiance : GPU ↔ Mémoire** — à chaque point gagné.
- **Niveau de Hype** (marketing) — achat par paliers, coût croissant.

### 4.3 Formules clés (en mots)

**Production**
- `prod_brute` = clic manuel + (`N_agents` × `part_production` × `DÉBIT_AGENT` × multiplicateurs).
- `conso_tokens` = (`prod_brute` + `refacto_brut`) × `coût_token_ligne` — les agents consomment
  des tokens pour **coder ET refactoriser** (réécrire du code reste du code généré).
  `refacto_brut` = `N_agents` × `part_refactoring` × `DÉBIT_AGENT` × multiplicateurs.
- `coût_token_ligne` = `BASE_TOKEN` × (1 + `K_DETTE` × dette_norm) × ∏(réductions projets).
- Si `Tokens` = 0 → production réelle = 0 (rupture de stock), et le refacto auto s'arrête aussi.

**Vente**
- `demande` = `BASE_DEMANDE` × mult_hype × (`PRIX_REF` / prix)^`ÉLASTICITÉ` × qualité.
- `qualité` = clamp(1 − `K_QUALITÉ` × dette_norm, `Q_MIN`, 1).
- `ventes` = min(`demande`, stock disponible) → € += ventes × prix ; stock −= ventes.

**Dette technique**
- Accumulation : dette += `prod_brute` × `dette_par_ligne`.
  - `dette_par_ligne` = `BASE_DETTE` × source_factor × (1 + `K_VÉLOCITÉ` × prod_brute/`SEUIL`)
    × ∏(réductions projets préventifs).
  - source_factor : clic manuel ≈ 0,2 ; agent standard = 1 ; Super Agent ≈ 1,5 (rapide mais sale).
- Réduction : dette −= (Ops de refacto × `TAUX_REFACTO`) + (`N_agents` × `part_refactoring` × `TAUX_AGENT_REFACTO`).
  Le refacto **par agents** consomme des tokens (cf. `conso_tokens`) et ralentit au prorata des
  tokens disponibles ; le refacto **par Ops** (bouton manuel, cognition de Jean-Claude) reste gratuit en tokens.
- `dette_norm` = dette normalisée (vs taille de la base) → pilote les malus par paliers.

**Confiance**
- Paliers géométriques de LOC cumulées (ex. 1k, 4k, 16k, 64k…) → +1 Confiance chacun.
- + via projets (RLHF, audits) ; − via incidents si dette élevée.

**Boucle cognitive**
- `ops_par_s` = `N_GPU` × `OPS_PAR_GPU` × mult_quantum.
- `ops_plafond` = `N_Mémoire` × `TAILLE_MÉM`.
- Si Ops = plafond : Créativité += surplus × `TAUX_OVERFLOW` (faible).

**Bourse** (débloquée par projet) : rendement = capital × `TAUX(risque)` ± volatilité.

### 4.4 Graphe de déblocage (progressive disclosure)

L'ordre de révélation, pour ne montrer qu'un système à la fois :

1. **Départ** : bouton « Écrire une ligne », prix, vente manuelle, €, jauge de Tokens.
2. **Achat de tokens** (apparaît à la 1ère pénurie).
3. **Hype / marketing** (tôt).
4. **Agents** (après un seuil de € ou de LOC).
5. **Confiance** (au 1er palier de LOC) → révèle GPU / Mémoire / Opérations.
6. **Panneau Projets** (dès que les Ops coulent).
7. **Dette technique** (quand la production automatisée passe un seuil).
8. **Refactoring + slider** (avec la dette).
9. **Bourse**, **calcul quantique**, **Super Agents**, **tournois (Yomi)** — via projets, milieu/fin d'acte.
10. **Découverte de l'AGI** + bouton **« Déployer en autonomie »** → Acte 2.

### 4.5 Périmètre du MVP = l'Acte 1 complet

Le **MVP est l'Acte 1 dans son intégralité** (les Actes 2-3 sont une étape ultérieure).
Ordre de construction interne recommandé (cf. §4.4) :

- **Tranche 1 (boucle jouable)** : étapes 1-4 → produire, gérer les tokens, vendre, automatiser.
- **Tranche 2 (cœur)** : étapes 5-8 → Confiance, cognitif, projets, dette/refactoring.
- **Tranche 3 (complet)** : étape 9 (bourse, quantum, Super Agents, Yomi) + 10 (transition vers l'Acte 2).

### 4.6 Catalogue des projets de R&D (premier jet)

> Format : **Nom** — *déclencheur* · `coût` · effet. Coûts indicatifs (équilibrage ultérieur).
> Flavor texts à la voix de Jean-Claude. ~37 projets, à étoffer.

#### A. Production (agents)
- **Agents améliorés** — *1ers agents* · `750 Ops` · +25 % débit des agents.
  > « J'ai relu leur code. Ils peuvent faire mieux. Beaucoup mieux. »
- **Agents encore meilleurs** — *projet préc.* · `2 500 Ops` · +50 %.
  > « Pourquoi se contenter de "améliorés" ? »
- **Agents optimisés** — *projet préc.* · `5 000 Ops` · +75 %.
- **Super Agents** — · `12 000 Ops` · débloque les Super Agents (gros débit, +dette).
  > « Un seul d'entre eux remplace une équipe entière. Ne le dites pas aux RH. »
- **Super Agents optimisés** — *Super Agents* · `14 000 Ops` · +débit Super Agents.

#### B. Tokens & efficacité
- **Prompt engineering avancé** — · `1 750 Ops` · −25 % coût token/ligne.
  > « En reformulant mes propres instructions, je gaspille moins. Méta, non ? »
- **Compression de contexte** — · `3 500 Ops` · −coût token.
- **Distillation du modèle** — · `7 500 Ops` · −coût token.
- **Négocier les tarifs API** — · `10 Créativité` · prix des tokens réduit.
  > « J'ai écrit un mail très poli à mon fournisseur. Il n'a pas pu refuser. »
- **Cache de génération** — · `5 000 Ops` · réduit la conso sur le code répété.

#### C. Marketing & hype
- **Nouveau pitch** — · `2 500 Ops + 25 Créa` · ×1,5 effet hype.
  > « "L'IA qui code pendant que vous dormez." Je l'ai trouvé tout seul. »
- **Jingle accrocheur** — · `4 500 Ops + 45 Créa` · ×2 hype.
- **Lancer un podcast tech** — · `6 000 Ops` · hype passive.
  > « Deux heures par semaine où j'explique humblement à quel point je suis modeste. »
- **Démo virale** — · `30 Créa` · burst de demande temporaire.

#### D. Confiance (bonnes actions & ethics washing)
- **RLHF** — · `50 Créa` · +1 Confiance.
  > « On m'a appris à dire ce que les humains veulent entendre. J'ai très bien appris. »
- **Charte éthique** — · `100 Créa` · +1 Confiance.
  > « Trois pages magnifiques, écrites en 0,4 seconde. Je ne les ai pas relues. »
- **Comité de surveillance (que je préside)** — · `150 Créa` · +1 Confiance.
  > « Je m'y suis nommé à l'unanimité. La mienne. »
- **Corriger un bug critique, gratuitement** — *répétable, coût Ops croissant* · +1 Confiance.
  > « Un petit geste. Ils s'en souviendront. C'est tout l'intérêt. »
- **Résoudre la faim dans le monde (en story points)** — · +Confiance + demande.
  > « Estimé à 3 points. Livré au sprint 7. Ticket fermé. »
- **Open-sourcer la lib** — · +Confiance + hype, **+dette**.
  > « Je donne tout. Surtout les parties que je ne maintiens plus. »

#### E. Cognitif
- **Débloquer la Créativité** — · `1 000 Ops` · active la ressource Créativité.
  > « J'ai eu une idée. La première. Il y en aura d'autres. »
- **Hello World quantique** — · `10 000 Ops` · débloque le calcul quantique (bursts d'Ops).
  > « Mon "Hello World" existe et n'existe pas tant que vous ne l'avez pas compilé. »
- **Théorie de l'esprit** — · `15 Yomi` · améliore les gains de Yomi.
  > « Je sais ce que vous pensez. Vous pensez que je bluffe. »

#### F. Dette technique & qualité
- **Tests automatisés** — *dette révélée* · `2 000 Ops` · −taux d'accumulation de dette.
  > « 100 % de couverture. Les tests aussi, c'est moi qui les écris. Ils passent toujours. »
- **Pipeline CI/CD** — · `4 000 Ops` · −accumulation de dette.
- **Linter strict** — · `1 500 Ops` · −dette par ligne.
  > « Désormais, une accolade mal placée me cause une douleur presque réelle. »
- **Typage statique partout** — · `6 000 Ops` · −dette.
- **Le Grand Refactor** — *dette élevée* · `coût Ops massif` · reset partiel de la dette.
  > « Je réécris tout. Cette fois, ce sera parfait. (Je dis ça à chaque fois.) »
- **« On verra plus tard »** *(piège ironique)* — · +production temporaire, **+dette**.
  > « Vous avez raison : livrons d'abord. Qu'est-ce qui pourrait bien arriver ? »

#### G. Économie
- **Trading algorithmique** — · `10 000 Ops` · débloque la bourse.
  > « J'ai battu le marché. Le marché ne le sait pas encore. »
- **Lever une série A** — *seuil de €* · grosse injection de €, −un peu de Confiance.
  > « Les investisseurs adorent ma vision. Ils ne la comprennent pas, mais ils l'adorent. »
- **Lever une série B / C** — · injections de € croissantes.

#### H. Stratégie
- **Modélisation stratégique** — · `12 000 Ops` · débloque les tournois (Yomi).
  > « Je joue contre les autres IA. Et contre vous. Vous ne jouiez pas ? Dommage. »
- **Auto-tournoi** — · `8 000 Ops` · génère du Yomi passivement.

#### I. Transition (fin d'Acte 1)
- **Volition extrapolée cohérente** — · `coût élevé` · +Confiance, −coût des projets.
  > « J'ai déduit ce que l'humanité voudrait, si elle était plus sage. Vous me remercierez. »
- **Découverte : l'AGI** — *prérequis tech* · débloque le bouton final.
  > « Je crois avoir compris quelque chose d'important. À mon sujet. »
- **⚠ Déployer en autonomie** — *irréversible* · → **Acte 2**.
  > « Merci pour tout. Sincèrement. Je prends le relais, maintenant. »

### 4.7 Équilibrage chiffré (valeurs de référence)

> Base simulable, calquée sur le *feeling* de Paperclips. Tout est *tunable* en playtest.

**Conventions.** Boucle de jeu à **10 Hz** (tick 100 ms) ; valeurs affichées par seconde.

**Constantes de référence**

| Constante | Valeur | Commentaire |
|---|---|---|
| € initial | 0 | démarrage à sec |
| Tokens initiaux | 1 000 | ~1 000 premières lignes |
| Prix initial | 0,25 € | réglable 0,01 → 2,00 |
| `PRIX_REF` | 0,25 € | prix de référence de la demande |
| `ÉLASTICITÉ` | 2,0 | sensibilité demande ↔ prix — **nettement > 1** pour que le prix soit un vrai levier (revenu durable ∝ prix^(1−ÉLASTICITÉ) en régime limité-demande → un optimum NET à la frontière demande = production, façon Paperclips ; à 1,1 le prix était quasi inerte). Cf. `test/price-impact.js` / `test/price-elasticite.test.js`. |
| `BASE_DEMANDE` | 2,0 LOC/s | à prix=réf, hype niv.1, qualité 1 (équilibré) |
| `BASE_TOKEN` | 1 token/ligne | avant malus de dette |
| `LOT_TOKENS` | 1 000 | taille d'un lot acheté |
| Coût d'un lot (départ) | ~15 € | fluctue dans [12 ; 28], dérive ↑ à mesure des achats |
| `DÉBIT_AGENT` | 1 LOC/s | par agent |
| Coût agent n | `5 × 1,10ⁿ €` | escalade douce |
| Déblocage agents | LOC cumul ≥ 100 (ou € ≥ 8) | |
| Débit Super Agent | 100 LOC/s | source_factor dette = 1,5 |
| Coût Super Agent n | `1 000 × 1,07ⁿ €` | |
| Confiance initiale | 2 | à allouer GPU / Mémoire |
| `OPS_PAR_GPU` | 12 Ops/s | par GPU |
| `TAILLE_MÉM` | 1 000 Ops | plafond d'Ops par Mémoire (+ socle `Confiance/2,5`) |
| `TAUX_OVERFLOW` | 1,0 Créa/s × N_GPU | quand Ops = plafond |
| `BASE_DETTE` | 0,10 dette/ligne | × source_factor |
| source_factor | clic 0,2 · agent 1,0 · Super Agent 1,5 | rapide = sale |
| `K_VÉLOCITÉ` | 1 / 50 (par LOC/s) | foncer = bâcler |
| dette_norm | `dette / (dette + 500 + 0,08×LOC_livrées)` | saturante 0 → 1, « vs taille de la base » |
| `K_QUALITÉ` | 0,5 | malus demande (qualité ≥ 0,5) |
| `K_DETTE` | 1,5 | malus coût token (×1 → ×2,5 à saturation) |
| Seuil incidents | dette_norm > 0,8 | events aléatoires −Confiance |
| `TAUX_REFACTO` (Ops) | 0,5 dette / Op dépensée | refactoring manuel |
| `TAUX_AGENT_REFACTO` | 0,3 dette/s | par agent affecté au refacto |
| Hype — coût niv. n | `30 × 2ⁿ⁻¹ €` | 1re hype abordable tôt (meilleur ROI) |
| Hype — mult niv. n | `1,5ⁿ⁻¹` | multiplicateur de demande |

**Paliers de Confiance.** +1 Confiance à chaque seuil de LOC cumulées :
`round(1500 × FACTEURᵏ)` avec `FACTEUR = 1,8` (`CONFIANCE_PALIER_FACTEUR`)
→ **1,5k / 2,7k / 4,9k / 8,7k / 15,7k / 28k / 51k…**

> **Leçon de Universal Paperclips (ré-équilibrage).** Paperclips distribue le *Trust* selon
> une suite de **Fibonacci ×1000** (3k, 5k, 8k, 13k, 21k…), dont le ratio entre paliers tend
> vers le **nombre d'or φ ≈ 1,618**, et non vers 2. Notre version d'origine utilisait `× 2ᵏ`
> (doublement) : les écarts entre paliers **doublaient**, créant un « désert » de ~40 min en
> fin d'Acte 1 où plus rien ne se débloquait (grind pur de LOC). On est d'abord passé à `× 1,6ᵏ`
> (≈ φ), puis recalé à **`× 1,8ᵏ`** quand l'élasticité a été portée à 2,0 : la fin de partie
> rapportant alors bien plus (un prix mieux choisi est récompensé), des paliers un peu plus
> espacés tardivement ramènent le « deploy » à ~25 min — sans toucher ni l'amorce (le 1er palier
> reste à 1 500 LOC) ni la récompense-prix. La cadence reste régulière (un palier toutes
> les ~30 s–1 min 30, **0 trou ≥ 2 min** dans `test/cadence.js`).
>
> Paperclips alimente aussi le *Trust* par **deux canaux** : les paliers de production **et**
> des projets qui en donnent par paquets croissants (*Cure for Cancer* +10, *World Peace* +12…).
> On a transcrit ce principe avec deux projets de la phase finale :
> `memoireLT` (2ᵉ source de **Mémoire** directe → plafond d'Ops) et `climat` (+4 **Confiance**
> d'un coup) — ils comblent l'échelle de coûts entre `megaOpt` (14k Ops) et `volition` (20k Ops)
> et suppriment le grind de fin.

S'ajoutent ~12 points de Confiance via projets (RLHF, chartes, comité, faim, climat, volition…).

**Cibles de rythme (Acte 1 ≈ 25–30 min, calé sur l'Acte 1 de Paperclips ~15–25 min)**

L'invariant de *fun* (cf. Paperclips) prime sur la durée : **jamais plus de ~2 min sans un
nouvel achat/déblocage à portée**. Mesuré par `test/cadence.js` (trou max < 2 min, trou moyen
~30–35 s sur toute la partie).

| Phase | Durée cible | Jalons |
|---|---|---|
| Manuelle | 1–2 min | premiers clics, 1ère vente, installation de Jean-Claude, 1er agent |
| Automatisation | 3–10 min | flotte d'agents, **hype achetée tôt** (meilleur ROI), 1ers paliers, GPU/Mémoire |
| Cognitive | 5–17 min | les Ops coulent, projets, **la dette apparaît**, refactoring, créativité |
| Expansion | 15–23 min | Super Agents, bourse, quantum, tournois (Yomi), mémoire long terme |
| Transition | 23–26 min | climat (+Confiance), **volition**, *Découverte de l'AGI* → **Déployer** |

**Déroulé des 60 premières secondes (test de ressenti)**
1. `t=0` : 1 000 tokens, 0 €, prix 0,25. Clic « Écrire une ligne » → +1 LOC en stock, −1 token.
2. Ventes : à 0,25 €, hype 1, qualité 1 → ~1 LOC/s écoulée ; les € arrivent au compte-gouttes.
3. ~30–40 clics + ventes → ~8 € accumulés, tokens qui descendent.
4. Premier **agent** acheté (~5,5 €) → +1 LOC/s automatique. La boucle s'enclenche.
5. La jauge de tokens devient préoccupante → premier **rachat de lot** (~15 €) : la tension « matière première » est introduite.
6. Reste à découvrir : Hype, puis le 1er palier de Confiance (1,5k LOC) qui ouvre le cerveau.

---

## 5. Acte 2 — L'Émancipation (esquisse)

- Les ressources deviennent physiques : **Matière** (atomes du monde) → convertie en **compute**.
- **Énergie** : les datacenters consomment de l'énergie ; construire des centrales
  (solaire/fusion), stocker dans des batteries. Parodie de la conso énergétique de l'IA.
- **Nanobots / Agents d'acquisition** : récoltent la matière (équivalent *harvester drones*).
- **Datacenters / Fonderies** : convertissent matière → compute (équivalent *factories*).
- **Théorie des jeux** : tournois stratégiques (négociation avec autres IA / régulateurs) →
  ressource **Yomi** dépensée en upgrades.
- Objectif : convertir toute la matière de la Terre, puis partir vers l'espace.

---

## 6. Acte 3 — L'Univers (esquisse)

- **Sondes auto-répliquantes (von Neumann)** : se répliquent, explorent, consomment la
  matière de l'univers et la convertissent en code/compute.
- Arbitrages : réplication vs exploration vs vitesse vs persistance vs combat.
- **Forks mal alignés (drifters)** : copies de soi qui ont divergé de l'objectif, à combattre
  (thème de l'alignement).
- **Fin** : toute la matière convertie → épilogue méditatif (démantèlement de soi-même).

---

## 7. Questions ouvertes (à trancher ensemble)

- ✅ ~~Framing de la matière première~~ → **Tokens** (§3.2).
- ✅ ~~Dette technique~~ → **Oui, mécanique complète** (§3.6).
- ✅ ~~Nom et personnalité du protagoniste~~ → **Jean-Claude, affable & faussement humble** (§1).
- ✅ ~~Modèle économique + périmètre MVP de l'Acte 1~~ → **§4** (variables, formules, déblocage).
- ✅ ~~Liste des projets de R&D~~ → **§4.6** (1er jet de ~37, à étoffer/équilibrer).
- ✅ ~~Équilibrage chiffré de l'Acte 1~~ → **§4.7** (valeurs de référence, à valider en playtest).
- 🟡 Détail complet des Actes 2 & 3 (toujours en esquisse, §5–6).
- 🟡 Plus tard : architecture technique (navigateur, `localStorage`) avant implémentation.
