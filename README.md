# 🌿 Oracle du Jardinier

## Ce que fait l'application, en pratique

L'**Oracle du Jardinier** regroupe en une interface **météo, calendrier de culture, gestion des jardins, semences, tâches, rappels, journal de terrain et statistiques**. Il présente également des parcours de diagnostic photo, de comparaison et de conseils générés par IA lorsqu'un fournisseur est configuré.

**Statut :** assistant de jardin expérimental ; vérifier les informations botaniques, météorologiques et les dosages de produits avant application. Les repères biodynamiques restent interprétatifs.

**Studio Niko Design** — Assistant agronomique IA · Permaculture Loire-Atlantique 44 · v17

🔗 [oracle-du-jardinier.vercel.app](https://oracle-du-jardinier.vercel.app)

## ✨ Fonctionnalités
- Diagnostic photo des plantes et analyse du sol (Mistral Vision · Ministral 3 / Mistral)
- Base 60+ plantes locales
- Météo live Open-Meteo
- Calendrier biodynamique

## 🛠 Stack
`HTML` · `Mistral AI` · `Ministral 3` · `Open-Meteo` · `IndexedDB` · `PWA`

## 👤 Auteur
**Nicolas Julienne** — Permaculteur · La Meilleraye-de-Bretagne (44)
📧 nicolasjulienne.nj@gmail.com

---

## Démarrage, usage et limites

**Thème :** Jardin, environnement & permaculture.

La page `index.html` se consulte sur un serveur web statique ; pour tester localement, utiliser `python3 -m http.server 8000`. L'application combine, selon sa documentation, des données météorologiques, des informations de jardinage et des services d'IA tiers.

**Qualité des conseils :** vérifier séparément les prévisions récentes, les espèces et les risques locaux. Les calendriers biodynamiques et les correspondances lunaires ne disposent pas du même niveau de preuve agronomique que des mesures de sol ou des prévisions météorologiques. Ne pas publier de clés API personnelles dans le dépôt.

**Statut :** projet de démonstration, sans validation fonctionnelle ou expertise indépendante revendiquée dans cette mise à jour.

[Voir le catalogue des projets](https://github.com/Nikoju1977).
