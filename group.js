import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= DOM ================= */
const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");
const userList = document.getElementById("userList");
const messageInput = document.getElementById("messageInput");

/* ================= STATE ================= */
let currentUser = null;
let mode = null; // "group" | "private"
let activeGroup = null;
let activeUser = null;
let unsubscribeMessages = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("navUserName").textContent =
      data.fullName || user.email;
  }

  loadUsers();
});

/* ================= SEND MESSAGE ================= */
window.sendMessage = async function () {
  if (!messageInput.value.trim()) return;
  if (!mode) return;

  const msg = {
    sender: currentUser.uid,
    text: messageInput.value.trim(),
    timestamp: serverTimestamp()
  };

  if (mode === "group") {
    msg.type = "group";
    msg.receiver = activeGroup;
  } else {
    msg.type = "private";
    msg.receiver = activeUser;
    msg.participants = [currentUser.uid, activeUser];
  }

  await addDoc(collection(db, "messages"), msg);
  messageInput.value = "";
};

/* ================= GROUP CHAT ================= */
window.selectGroup = function (groupId, groupName) {
  mode = "group";
  activeGroup = groupId;
  activeUser = null;
  chatTitle.textContent = "Group: " + groupName;
  listenForMessages();
};

/* ================= PRIVATE CHAT ================= */
window.openPrivateChat = function (uid, name) {
  mode = "private";
  activeUser = uid;
  activeGroup = null;
  chatTitle.textContent = "Chat with " + name;
  listenForMessages();
};

/* ================= LISTENER ================= */
function listenForMessages() {
  chatBox.innerHTML = "";
  if (unsubscribeMessages) unsubscribeMessages();

  let q;

  if (mode === "group") {
    q = query(
      collection(db, "messages"),
      where("type", "==", "group"),
      where("receiver", "==", activeGroup)
    );
  } else {
    q = query(
      collection(db, "messages"),
      where("type", "==", "private"),
      where("participants", "array-contains", currentUser.uid)
    );
  }

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = "";

    snapshot.forEach((docu) => {
      const m = docu.data();

      if (
        mode === "private" &&
        !(
          (m.sender === currentUser.uid && m.receiver === activeUser) ||
          (m.sender === activeUser && m.receiver === currentUser.uid)
        )
      ) return;

      displayMessage(m);
    });
  });
}

/* ================= DISPLAY ================= */
function displayMessage(m) {
  const div = document.createElement("div");
  div.className =
    "message mb-2 p-2 rounded " +
    (m.sender === currentUser.uid ? "bg-primary text-white text-end" : "bg-light");

  div.innerHTML = `
    <div>${m.text}</div>
    <small class="opacity-75">
      ${m.timestamp ? m.timestamp.toDate().toLocaleTimeString() : ""}
    </small>
  `;

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
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";

      li.innerHTML = `
        <span>${u.fullName || "Unnamed User"}</span>
        <span class="badge bg-success rounded-circle">&nbsp;</span>
      `;

      li.onclick = () =>
        openPrivateChat(d.id, u.fullName || "User");

      userList.appendChild(li);
    });
  });
}
