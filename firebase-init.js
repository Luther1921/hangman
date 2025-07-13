import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBoVbOfEfzsXrykvU_O7pT5stLRWby6JnQ",
  authDomain: "hangman-289d1.firebaseapp.com",
  projectId: "hangman-289d1",
  storageBucket: "hangman-289d1.firebasestorage.app",
  messagingSenderId: "569189339491",
  appId: "1:569189339491:web:3ef11dc84b61de396cc356",
  measurementId: "G-11KFXR66B4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, query, orderBy, limit };
