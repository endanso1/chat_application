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

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= DOM ================= */
const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");
const userList = document.getElementById("userList");
const groupList = document.getElementById("groupList");
const groupNameInput = document.getElementById("groupName");
const messageInput = document.getElementById("messageInput");
const groupMembersList = document.getElementById("groupMembers");

/* ================= STATE ================= */
let currentUser = null;
let mode = null; // "group" | "private"
let activeGroup = null;
let activeUser = null;
let activeChatId = null;

let unsubscribeMessages = null;
let unsubscribeGroupMembers = null;

const userCache = {};

/* ================= HELPERS ================= */
function getPrivateChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

async function getSenderName(uid) {
  if (userCache[uid]) return userCache[uid];

  const snap = await getDoc(doc(db, "users", uid));
  const name = snap.exists() ? snap.data().fullName || "User" : "Unknown";
  userCache[uid] = name;
  return name;
}

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
window.createGroup = async () => {
  const name = groupNameInput.value.trim();
  if (!name) return;

  const ref = await addDoc(collection(db, "groups"), {
    name,
    admin: currentUser.uid,
    members: [currentUser.uid],
    createdAt: serverTimestamp(),
  });

  groupNameInput.value = "";
  selectGroup(ref.id, name);
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

      buttons[0].onclick = () =>
        isMember ? leaveGroup(groupId, g.name) : joinGroup(groupId, g.name);

      if (isAdmin) {
        buttons[1].onclick = () => editGroup(groupId, g.name);
        buttons[2].onclick = () => deleteGroup(groupId);
      }

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

/* ================= JOIN / LEAVE (ALERT ONLY) ================= */
async function joinGroup(groupId, groupName) {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayUnion(currentUser.uid),
  });

  alert(`You joined "${groupName}"`);
}

async function leaveGroup(groupId, groupName) {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayRemove(currentUser.uid),
  });

  alert(`You left "${groupName}"`);

  if (activeGroup === groupId) resetChatUI();
}

/* ================= EDIT / DELETE ================= */
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
  if (activeGroup === groupId) resetChatUI();
}

/* ================= SELECT GROUP ================= */
window.selectGroup = (groupId, groupName) => {
  mode = "group";
  activeGroup = groupId;
  activeUser = null;
  activeChatId = null;

  chatTitle.textContent = "Group: " + groupName;

  listenForMessages();
  listenForGroupMembers(groupId);
};

/* ================= GROUP MEMBERS ================= */
function listenForGroupMembers(groupId) {
  if (unsubscribeGroupMembers) unsubscribeGroupMembers();

  unsubscribeGroupMembers = onSnapshot(doc(db, "groups", groupId), async (snap) => {
    if (!snap.exists()) return;

    groupMembersList.innerHTML = "";
    const g = snap.data();

    for (const uid of g.members) {
      const uSnap = await getDoc(doc(db, "users", uid));
      if (!uSnap.exists()) continue;

      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";

      li.innerHTML = `
        <span>${uSnap.data().fullName || "User"}</span>
        <span class="badge ${
          uid === g.admin ? "bg-warning text-dark" : "bg-secondary"
        }">
          ${uid === g.admin ? "Admin" : "Member"}
        </span>
      `;

      if (uid !== currentUser.uid) {
        li.style.cursor = "pointer";
        li.onclick = () =>
          openPrivateChat(uid, uSnap.data().fullName || "User");
      }

      groupMembersList.appendChild(li);
    }
  });
}

/* ================= SEND MESSAGE ================= */
window.sendMessage = async () => {
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
    msg.chatId = activeChatId;
    msg.participants = [currentUser.uid, activeUser];
  }

  await addDoc(collection(db, "messages"), msg);
  messageInput.value = "";
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
      where("participants", "array-contains", currentUser.uid),
      where("chatId", "==", activeChatId)
    );
  }

  unsubscribeMessages = onSnapshot(q, async (snapshot) => {
    chatBox.innerHTML = "";

    const messages = snapshot.docs
      .map((d) => d.data())
      .sort(
        (a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)
      );

    for (const m of messages) {
      await displayMessage(m);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

/* ================= DISPLAY MESSAGE ================= */
async function displayMessage(m) {
  const isMe = m.sender === currentUser.uid;
  const div = document.createElement("div");
  div.className = "message " + (isMe ? "you" : "other");

  let senderLine = "";
  if (mode === "group" && !isMe) {
    senderLine = `<div class="small fw-semibold mb-1">
      ${await getSenderName(m.sender)}
    </div>`;
  }

  div.innerHTML = `
    ${senderLine}
    <div>${m.text}</div>
    <small class="opacity-75 d-block text-end">
      ${m.timestamp ? m.timestamp.toDate().toLocaleString() : ""}
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

      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = d.data().fullName || "User";
      li.onclick = () =>
        openPrivateChat(d.id, d.data().fullName || "User");

      userList.appendChild(li);
    });
  });
}

/* ================= PRIVATE CHAT ================= */
window.openPrivateChat = (uid, name) => {
  activeChatId = getPrivateChatId(currentUser.uid, uid);
  activeUser = uid;
  activeGroup = null;
  mode = "private";

  chatTitle.textContent = "Chat with " + name;

  if (unsubscribeGroupMembers) unsubscribeGroupMembers();
  groupMembersList.innerHTML =
    `<li class="list-group-item text-center text-muted">Private chat</li>`;

  listenForMessages();
};

/* ================= RESET ================= */
function resetChatUI() {
  chatBox.innerHTML = "";
  chatTitle.textContent = "Select a Group or User";
  groupMembersList.innerHTML =
    `<li class="list-group-item text-center text-muted">Select a group</li>`;

  mode = null;
  activeGroup = null;
  activeUser = null;
  activeChatId = null;
}
