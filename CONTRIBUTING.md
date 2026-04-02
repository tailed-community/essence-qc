# Contribuer à Essence QC

Merci de votre intérêt pour Essence QC ! 🎉

## Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé dans les [Issues](../../issues)
2. Créez une nouvelle issue avec le template **Bug Report**
3. Incluez : description, étapes pour reproduire, comportement attendu vs observé, captures d'écran si pertinent

### Proposer une fonctionnalité

1. Ouvrez une issue avec le template **Feature Request**
2. Décrivez le besoin utilisateur et la solution proposée
3. Attendez l'approbation d'un mainteneur avant de commencer le développement

### Soumettre du code

1. **Fork** le projet
2. Créez une branche depuis `main` :
   ```bash
   git checkout -b feature/ma-fonctionnalite
   ```
3. Faites vos changements
4. Vérifiez que le build passe :
   ```bash
   npm run lint
   npm run build
   ```
5. Commitez avec un message clair :
   ```bash
   git commit -m "feat: ajouter filtre par marque"
   ```
6. Poussez et ouvrez une **Pull Request**

## Conventions

### Commits

Utilisez le format [Conventional Commits](https://www.conventionalcommits.org/) :

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `docs:` | Documentation |
| `style:` | Formatage (pas de changement de logique) |
| `refactor:` | Refactoring |
| `perf:` | Amélioration de performance |
| `chore:` | Maintenance (dépendances, CI, etc.) |

### Code

- TypeScript strict — pas de `any`
- Composants React fonctionnels avec hooks
- Tailwind CSS pour le styling (pas de CSS custom)
- Nommage en français pour l'UI, en anglais pour le code

### Structure

```
src/
├── components/     # Composants React (un fichier par composant)
│   └── ui/         # Composants shadcn/ui (ne pas modifier manuellement)
├── lib/            # Logique métier et utilitaires
├── store.tsx       # État global
└── types.ts        # Types partagés
```

## Développement local

```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Ajoutez votre clé API Google Maps dans .env

# Lancer en mode développement
npm run dev
```

### Prérequis

- Node.js 20+
- npm 10+
- Clé API Google Maps (voir [README](README.md#prérequis))

## Licence

En contribuant, vous acceptez que vos contributions soient soumises à la licence [AGPL-3.0 avec Commons Clause](LICENSE) du projet.
