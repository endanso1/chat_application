import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.login = function () {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .then(async (cred) => {
      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        online: true,
      });
      window.location = "index.html";
    })
    .catch((err) => alert(err.message));
};

window.signup = function () {
  const fullName = document.getElementById("fullName").value;
  const dob = document.getElementById("dob").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  if (!fullName || !dob || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (cred) => {
      // Save user profile to Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        fullName: fullName,
        dob: dob,
        email: email,
        online: true,
        createdAt: new Date(),
      });

      // 🔁 AUTO-LOGIN REDIRECT
      window.location = "index.html";
    })
    .catch((err) => alert(err.message));
};

window.logout = async function () {
  if (auth.currentUser) {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { online: false });
    await signOut(auth);
  }
  window.location = "login.html";
};

onAuthStateChanged(auth, (user) => {
  if (!user && location.pathname.includes("index.html")) {
    window.location = "login.html";
  }
});
