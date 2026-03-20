# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

# 🎛️ Boss SL-2 TSL Editor Pro

Une application web avancée construite avec React pour créer, éditer, prévisualiser et exporter des patches personnalisés (fichiers `.tsl`) pour la pédale d'effet **Boss SL-2 Slicer**.

L'application intègre un moteur de synthèse audio (Web Audio API) qui permet de prévisualiser vos séquences rythmiques directement dans le navigateur avant de les envoyer dans votre pédale via Boss Tone Studio.

---

## ✨ Fonctionnalités Principales

* **🔁 Import / Export natif `.tsl` :** Lisez et générez des fichiers parfaitement compatibles avec le logiciel officiel Boss Tone Studio.
* **🎹 Moteur Audio Intégré :** Écoutez vos patterns en temps réel. Le moteur inclut un synthétiseur basique avec Sub/Up Octaves, Distortion, Bitcrusher, LFO, Delay et Reverb pour simuler au mieux le rendu final.
* **🎚️ Séquenceur 24-Pas Avancé :** * Édition indépendante des Canaux 1 (L) et 2 (R).
  * Contrôle précis par pas : Volume, Pitch (-12/+12), Filtre/Montant d'effet, et Longueur (Duty).
  * Interface épurée : Cliquez sur un pas de la grille pour révéler ses paramètres.
* **🎛️ Paramètres Exhaustifs de la SL-2 :**
  * **Slicer Header :** Choix du Pattern, de la longueur de séquence (8, 12, 16, 24) et du Type d'Effet (Pitch, Flanger, Phaser, Sweep, Filter, Ring).
  * **Advanced Channel FX :** Paramétrage profond des sous-effets (Phaser, Flanger, Tremolo, Overtone).
  * **Global Routing :** Accès total aux réglages globaux souvent cachés (Mixer, Divider, Compressor, Parametric EQ, Noise Suppressor).
* **⚡ Outils de Workflow :**
  * **Bouton Randomize (🎲) :** Génération algorithmique et musicale de patterns aléatoires pour l'inspiration immédiate.
  * **Copy to Channel (📋) :** Clonez instantanément un canal vers l'autre pour créer rapidement une base stéréo cohérente.

---

## 🚀 Installation & Lancement

Ce projet est construit avec **React**. Pour le faire tourner en local sur votre machine :

### Prérequis
* [Node.js](https://nodejs.org/) installé sur votre machine.

### Étapes
1. Clonez ce dépôt :
   ```bash
   git clone [https://github.com/votre-nom-utilisateur/sl2-tsl-editor-pro.git](https://github.com/votre-nom-utilisateur/sl2-tsl-editor-pro.git)
   cd sl2-tsl-editor-pro