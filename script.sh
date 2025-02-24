#!/bin/bash

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Création de la structure du projet messaging-app...${NC}"

# Création du dossier principal
mkdir messaging-app
cd messaging-app

# Création du projet React Native
echo -e "${BLUE}📱 Initialisation du projet React Native...${NC}"
npx react-native init MobileApp
mv MobileApp mobile-app

# Création du projet Backend
echo -e "${BLUE}🖥️  Création de la structure backend...${NC}"
mkdir -p backend/src/{controllers,models,services,middlewares,routes,config,utils}

# Structure du backend
cd backend
npm init -y

# Installation des dépendances backend
echo -e "${BLUE}📦 Installation des dépendances backend...${NC}"
npm install express mongoose dotenv cors socket.io jsonwebtoken bcryptjs multer

# Création des fichiers backend
touch src/app.js
touch .env
touch .gitignore

# Création des fichiers de base
cat > src/app.js << EOF
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
EOF

cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/messaging-app
JWT_SECRET=your_jwt_secret
EOF

cat > .gitignore << EOF
node_modules
.env
dist
build
coverage
EOF

# Retour au dossier principal
cd ..

# Configuration du projet React Native
cd mobile-app

# Installation des dépendances React Native
echo -e "${BLUE}📦 Installation des dépendances React Native...${NC}"
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install @react-native-async-storage/async-storage
npm install socket.io-client
npm install @react-native-community/netinfo
npm install react-native-gesture-handler
npm install react-native-safe-area-context
npm install react-native-screens
npm install react-native-vector-icons
npm install @react-native-community/masked-view
npm install react-native-image-picker
npm install react-native-fast-image

# Création de la structure des dossiers React Native
mkdir -p src/{screens,components,navigation,services,utils,assets,hooks,context}

# Création des fichiers de base pour React Native
cat > src/navigation/AppNavigator.js << EOF
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Add your screens here */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
EOF

# Création des écrans de base
echo -e "${BLUE}📱 Création des écrans de base...${NC}"
mkdir -p src/screens/{Auth,Chat,Profile}
touch src/screens/Auth/{LoginScreen.js,RegisterScreen.js}
touch src/screens/Chat/{ChatListScreen.js,ChatScreen.js,GroupChatScreen.js}
touch src/screens/Profile/ProfileScreen.js

# Création des composants de base
mkdir -p src/components/{Auth,Chat,Common}
touch src/components/Chat/{MessageBubble.js,ChatInput.js}
touch src/components/Common/{Header.js,Loading.js}

# Services de base
touch src/services/{api.js,socket.js,auth.js}

# Context
touch src/context/{AuthContext.js,ChatContext.js}

# Retour au dossier principal
cd ..

# Création du fichier README principal
cat > README.md << EOF
# Messaging App

Application de messagerie développée avec React Native et Node.js.

## Structure du projet

- \`/backend\` - API Node.js/Express
- \`/mobile-app\` - Application React Native

## Installation

### Backend
1. cd backend
2. npm install
3. npm start

### Mobile App
1. cd mobile-app
2. npm install
3. npx react-native run-android # ou run-ios

## Configuration requise

- Node.js
- MongoDB
- React Native environment
EOF

echo -e "${GREEN}✅ Structure du projet créée avec succès!${NC}"
echo -e "${BLUE}📘 Consultez le README.md pour les instructions d'installation et d'utilisation${NC}"