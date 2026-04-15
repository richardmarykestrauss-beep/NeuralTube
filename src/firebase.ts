import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBzIOnDY_6tcPUNwjhnmkUWjhtXQJRHF40",
  authDomain: "neuraltube-app.firebaseapp.com",
  projectId: "neuraltube-app",
  storageBucket: "neuraltube-app.firebasestorage.app",
  messagingSenderId: "562764282076",
  appId: "1:562764282076:web:0c9e988b1a250958669c19",
  measurementId: "G-99KW61B498"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
