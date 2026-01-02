import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyB7y-QVvDQyg9giIsGGiUyP3NigYPGZpAk",
  authDomain: "chatapp-badc7.firebaseapp.com",
  projectId: "chatapp-badc7",
  storageBucket: "chatapp-badc7.appspot.com",
  messagingSenderId: "457660968570",
  appId: "1:457660968570:web:3f4b975e91c71f15b9d5c3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


