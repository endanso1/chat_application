import { db, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  document.getElementById("navUserName").textContent = data.fullName;
  document.getElementById("dashboardUserName").textContent = data.fullName;
});

const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");
const userList = document.getElementById("userList");
const messageInput = document.getElementById("messageInput");

let mode = "group";
let activeGroup = null;
let activeUser = null;

/* GROUP CHAT */
window.selectGroup = function (id, name) {
  mode = "group";
  activeGroup = id;
  chatTitle.textContent = "Group: " + name;
};

/* PRIVATE CHAT */
window.openPrivateChat = function (uid, email) {
  mode = "private";
  activeUser = uid;
  chatTitle.textContent = "Private chat with " + email;
};

/* SEND MESSAGE */
window.sendMessage = async function () {
  if (!messageInput.value) return;

  await addDoc(collection(db, "messages"), {
    sender: auth.currentUser.uid,
    receiver: mode === "group" ? activeGroup : activeUser,
    type: mode,
    text: messageInput.value,
    timestamp: serverTimestamp(),
  });

  messageInput.value = "";
};

/* LISTEN FOR MESSAGES */
onSnapshot(collection(db, "messages"), (snapshot) => {
  chatBox.innerHTML = "";
  snapshot.forEach((doc) => {
    const m = doc.data();

    const valid =
      (m.type === "group" && m.receiver === activeGroup) ||
      (m.type === "private" &&
        ((m.sender === auth.currentUser.uid && m.receiver === activeUser) ||
          (m.sender === activeUser && m.receiver === auth.currentUser.uid)));

    if (valid) {
      const div = document.createElement("div");
      div.className =
        "message " + (m.sender === auth.currentUser.uid ? "you" : "other");

      const time = m.timestamp?.toDate().toLocaleTimeString();
      div.innerHTML = `<small>${time}</small><br>${m.text}`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
});

/* USERS LIST */
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  onSnapshot(collection(db, "users"), (snapshot) => {
    userList.innerHTML = "";
    snapshot.forEach((doc) => {
      if (doc.id !== user.uid) {
        const u = doc.data();
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between";
        li.innerHTML = `
          <span>${u.email}</span>
          <span class="status ${u.online ? "online" : "offline"}"></span>
        `;
        li.onclick = () => openPrivateChat(doc.id, u.email);
        userList.appendChild(li);
      }
    });
  });
});
