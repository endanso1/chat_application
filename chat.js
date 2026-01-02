import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");
const userList = document.getElementById("userList");
const messageInput = document.getElementById("messageInput");

let currentUser = null;
let mode = null;
let activeGroup = null;
let activeUser = null;
let unsubscribe = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();
  document.getElementById("navUserName").textContent = data.fullName || data.email;

  if (data.photoURL) {
    document.getElementById("navProfilePic").src = data.photoURL;
  }

  loadUsers();
});

/* ================= SEND MESSAGE ================= */
window.sendMessage = async function () {
  if (!messageInput.value || !mode) return;

  await addDoc(collection(db, "messages"), {
    sender: currentUser.uid,
    receiver: mode === "group" ? activeGroup : activeUser,
    type: mode,
    text: messageInput.value,
    timestamp: serverTimestamp()
  });

  messageInput.value = "";
};

/* ================= GROUP ================= */
window.selectGroup = function (id, name) {
  mode = "group";
  activeGroup = id;
  activeUser = null;
  chatTitle.textContent = "Group: " + name;
  listen();
};

/* ================= PRIVATE ================= */
window.openPrivateChat = function (uid, name) {
  mode = "private";
  activeUser = uid;
  activeGroup = null;
  chatTitle.textContent = "Chat with " + name;
  listen();
};

/* ================= LISTENER ================= */
function listen() {
  chatBox.innerHTML = "";
  if (unsubscribe) unsubscribe();

  let q = query(
    collection(db, "messages"),
    where("type", "==", mode),
    orderBy("timestamp")
  );

  unsubscribe = onSnapshot(q, (snap) => {
    chatBox.innerHTML = "";

    snap.forEach((d) => {
      const m = d.data();

      if (mode === "group" && m.receiver !== activeGroup) return;

      if (
        mode === "private" &&
        !(
          (m.sender === currentUser.uid && m.receiver === activeUser) ||
          (m.sender === activeUser && m.receiver === currentUser.uid)
        )
      ) return;

      display(m);
    });
  });
}

/* ================= DISPLAY ================= */
function display(m) {
  const div = document.createElement("div");
  div.className = "message " + (m.sender === currentUser.uid ? "you" : "other");

  const time = m.timestamp ? m.timestamp.toDate().toLocaleTimeString() : "";

  div.innerHTML = `<small>${time}</small><br>${m.text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ================= USERS ================= */
function loadUsers() {
  onSnapshot(collection(db, "users"), (snap) => {
    userList.innerHTML = "";

    snap.forEach((d) => {
      if (d.id === currentUser.uid) return;

      const u = d.data();
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";

      li.innerHTML = `
        <span>${u.fullName || u.email}</span>
        <span class="status ${u.online ? "online" : "offline"}"></span>
      `;

      li.onclick = () => openPrivateChat(d.id, u.fullName || u.email);
      userList.appendChild(li);
    });
  });
}
