import { auth, db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const fullNameInput = document.getElementById("fullName");
const dobInput = document.getElementById("dob");
const errorBox = document.getElementById("profileError");
const previewImg = document.getElementById("profilePreview");
const fileInput = document.getElementById("profilePicInput");

let currentUserId = null;

/* ================= AUTH CHECK ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUserId = user.uid;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();
  fullNameInput.value = data.fullName || "";
  dobInput.value = data.dob || "";
  if (data.photoURL) previewImg.src = data.photoURL;
});

/* ================= IMAGE PREVIEW ================= */
window.previewProfilePic = function (e) {
  const file = e.target.files[0];
  if (file) previewImg.src = URL.createObjectURL(file);
};

/* ================= SAVE PROFILE ================= */
window.saveProfile = async function () {
  errorBox.textContent = "";

  if (!fullNameInput.value || !dobInput.value) {
    errorBox.textContent = "Full name and date of birth are required.";
    return;
  }

  try {
    const updates = {
      fullName: fullNameInput.value,
      dob: dobInput.value,
      updatedAt: new Date()
    };

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const imageRef = ref(storage, `profile_pics/${currentUserId}`);
      await uploadBytes(imageRef, file);
      updates.photoURL = await getDownloadURL(imageRef);
    }

    await setDoc(
      doc(db, "users", currentUserId),
      updates,
      { merge: true }
    );

    window.location.href = "index.html";
  } catch (err) {
    errorBox.textContent = err.message;
  }
};
