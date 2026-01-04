import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= DOM ================= */
const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");
const userList = document.getElementById("userList");
const groupList = document.getElementById("groupList");
const groupNameInput = document.getElementById("groupName");
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
    document.getElementById("navUserName").textContent =
      snap.data().fullName || user.email;
  }

  loadUsers();
  loadGroups();
});

/* ================= CREATE GROUP ================= */
window.createGroup = async function () {
  const name = groupNameInput.value.trim();
  if (!name) return;

  await addDoc(collection(db, "groups"), {
    name,
    admin: currentUser.uid, // 👈 REQUIRED
    members: [currentUser.uid], // 👈 REQUIRED
    createdAt: serverTimestamp(),
  });

  groupNameInput.value = "";
};

/* ================= LOAD GROUPS ================= */
function loadGroups() {
  onSnapshot(collection(db, "groups"), (snapshot) => {
    groupList.innerHTML = "";

    snapshot.forEach((docu) => {
      const g = docu.data();
      const groupId = docu.id;

      const isMember = g.members?.includes(currentUser.uid);
      const isAdmin = g.admin === currentUser.uid;

      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";

      li.innerHTML = `
        <span class="fw-semibold">${g.name}</span>

        <div class="btn-group btn-group-sm">
          ${
            isMember
              ? `<button class="btn btn-outline-danger">Leave</button>`
              : `<button class="btn btn-outline-success">Join</button>`
          }
          ${
            isAdmin
              ? `<button class="btn btn-outline-secondary">Edit</button>
                 <button class="btn btn-outline-dark">Delete</button>`
              : ``
          }
        </div>
      `;

      const buttons = li.querySelectorAll("button");

      // Join / Leave
      buttons[0].onclick = () =>
        isMember ? leaveGroup(groupId) : joinGroup(groupId);

      // Edit / Delete (Admin only)
      if (isAdmin) {
        buttons[1].onclick = () => editGroup(groupId, g.name);
        buttons[2].onclick = () => deleteGroup(groupId);
      }

      // Open chat only if member
      li.querySelector("span").onclick = () => {
        if (!isMember) {
          alert("Join the group to access messages");
          return;
        }
        selectGroup(groupId, g.name);
      };

      groupList.appendChild(li);
    });
  });
}

/* ================= JOIN / LEAVE / EDIT / DELETE ================= */
// async function joinGroup(groupId) {
//   await updateDoc(doc(db, "groups", groupId), {
//     members: arrayUnion(currentUser.uid)
//   });
// }
async function joinGroup(groupId) {
  const ref = doc(db, "groups", groupId);
  await updateDoc(ref, {
    members: arrayUnion(currentUser.uid),
  });
}

async function leaveGroup(groupId) {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayRemove(currentUser.uid),
  });

  if (activeGroup === groupId) {
    chatBox.innerHTML = "";
    chatTitle.textContent = "Select a chat";
    mode = null;
  }
}

async function editGroup(groupId, oldName) {
  const newName = prompt("Edit group name:", oldName);
  if (!newName) return;

  await updateDoc(doc(db, "groups", groupId), {
    name: newName.trim(),
  });
}

async function deleteGroup(groupId) {
  if (!confirm("Delete this group permanently?")) return;

  await deleteDoc(doc(db, "groups", groupId));

  if (activeGroup === groupId) {
    chatBox.innerHTML = "";
    chatTitle.textContent = "Select a chat";
    mode = null;
  }
}

/* ================= SEND MESSAGE ================= */
window.sendMessage = async function () {
  if (!messageInput.value.trim() || !mode) return;

  const msg = {
    sender: currentUser.uid,
    text: messageInput.value.trim(),
    timestamp: serverTimestamp(),
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

/* ================= SELECT GROUP ================= */
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

/* ================= MESSAGE LISTENER ================= */
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

    const messages = snapshot.docs
      .map((d) => d.data())
      .sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return a.timestamp.seconds - b.timestamp.seconds;
      });

    messages.forEach((m) => {
      if (
        mode === "private" &&
        !(
          (m.sender === currentUser.uid && m.receiver === activeUser) ||
          (m.sender === activeUser && m.receiver === currentUser.uid)
        )
      )
        return;

      displayMessage(m);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

/* ================= DISPLAY MESSAGE ================= */
function displayMessage(m) {
  const div = document.createElement("div");
  div.className = "message " + (m.sender === currentUser.uid ? "you" : "other");

  div.innerHTML = `
    <div>${m.text}</div>
    <small class="opacity-75 d-block text-end">
      ${m.timestamp ? m.timestamp.toDate().toLocaleTimeString() : ""}
    </small>
  `;

  chatBox.appendChild(div);
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
        <span>${u.fullName || "User"}</span>
        <span class="badge bg-success rounded-circle">&nbsp;</span>
      `;

      li.onclick = () => openPrivateChat(d.id, u.fullName || "User");

      userList.appendChild(li);
    });
  });
}
