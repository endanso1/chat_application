import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const storage = getStorage();

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  document.getElementById("editFullName").value = data.fullName;
  document.getElementById("editDOB").value = data.dob;
  document.getElementById("profilePreview").src =
    data.photoURL || "https://via.placeholder.com/120";
});

window.updateProfile = async function () {
  const user = auth.currentUser;
  const fullName = editFullName.value;
  const dob = editDOB.value;
  const file = profileImage.files[0];

  let photoURL = null;

  if (file) {
    const imgRef = ref(storage, `profiles/${user.uid}`);
    await uploadBytes(imgRef, file);
    photoURL = await getDownloadURL(imgRef);
  }

  await updateDoc(doc(db, "users", user.uid), {
    fullName,
    dob,
    ...(photoURL && { photoURL })
  });

  alert("Profile updated successfully");
  window.location = "index.html";
};
