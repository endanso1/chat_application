import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ========================= LOGIN ========================= */
window.login = async function () {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("loginError");
  const btn = event.target;

  errorBox.textContent = "";
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Logging in...`;

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    await updateDoc(doc(db, "users", cred.user.uid), {
      online: true
    });

    window.location.href = "index.html";
  } catch (err) {
    errorBox.textContent = err.message;
    btn.disabled = false;
    btn.innerHTML = "Login";
  }
};

/* ========================= SIGNUP ========================= */
window.signup = async function () {
  const fullName = document.getElementById("fullName").value.trim();
  const dob = document.getElementById("dob").value;
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const errorBox = document.getElementById("signupError");
  const btn = event.target;

  errorBox.textContent = "";

  if (!fullName || !dob || !email || !password) {
    errorBox.textContent = "All fields are required.";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Creating account...`;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      fullName,
      dob,
      email,
      online: true,
      createdAt: new Date()
    });

    window.location.href = "index.html";
  } catch (err) {
    errorBox.textContent = err.message;
    btn.disabled = false;
    btn.innerHTML = "Sign Up";
  }
};

/* ========================= LOGOUT ========================= */
window.logout = async function () {
  if (auth.currentUser) {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      online: false
    });
    await signOut(auth);
  }
  window.location.href = "login.html";
};

/* ========================= AUTH GUARD ========================= */
onAuthStateChanged(auth, (user) => {
  if (!user && location.pathname.includes("index.html")) {
    window.location.href = "login.html";
  }
});
