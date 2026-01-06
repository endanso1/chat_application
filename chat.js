
// import { auth, db } from "./firebase.js";
// import {
//   collection,
//   addDoc,
//   query,
//   where,
//   onSnapshot,
//   serverTimestamp,
//   doc,
//   getDoc
// } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// import { onAuthStateChanged }
//   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// /* ================= DOM ================= */
// const chatBox = document.getElementById("chatBox");
// const chatTitle = document.getElementById("chatTitle");
// const userList = document.getElementById("userList");
// const messageInput = document.getElementById("messageInput");

// /* ================= STATE ================= */
// let currentUser = null;
// let mode = null; // "group" | "private"
// let activeUser = null;
// let activeGroup = null;
// let unsubscribeMessages = null;

// /* ================= HELPERS ================= */
// function getPrivateChatId(uid1, uid2) {
//   return [uid1, uid2].sort().join("_");
// }

// /* ================= AUTH ================= */
// onAuthStateChanged(auth, async (user) => {
//   if (!user) {
//     window.location.href = "login.html";
//     return;
//   }

//   currentUser = user;

//   const snap = await getDoc(doc(db, "users", user.uid));
//   if (snap.exists()) {
//     document.getElementById("navUserName").textContent =
//       snap.data().fullName || user.email;
//   }

//   loadUsers();
// });

// /* ================= SEND MESSAGE ================= */
// window.sendMessage = async () => {
//   if (!messageInput.value.trim() || !mode) return;

//   const msg = {
//     sender: currentUser.uid,
//     text: messageInput.value.trim(),
//     timestamp: serverTimestamp()
//   };

//   if (mode === "group") {
//     msg.type = "group";
//     msg.receiver = activeGroup;
//   } else {
//     msg.type = "private";
//     msg.chatId = getPrivateChatId(currentUser.uid, activeUser);
//     msg.participants = [currentUser.uid, activeUser];
//   }

//   await addDoc(collection(db, "messages"), msg);
//   messageInput.value = "";
// };

// /* ================= OPEN GROUP ================= */
// window.selectGroup = (groupId, groupName) => {
//   mode = "group";
//   activeGroup = groupId;
//   activeUser = null;

//   chatTitle.textContent = "Group: " + groupName;
//   listenForMessages();
// };

// /* ================= OPEN PRIVATE CHAT ================= */
// window.openPrivateChat = (uid, name) => {
//   mode = "private";
//   activeUser = uid;
//   activeGroup = null;

//   chatTitle.textContent = "Chat with " + name;
//   listenForMessages();
// };

// /* ================= LISTEN ================= */
// function listenForMessages() {
//   chatBox.innerHTML = "";
//   if (unsubscribeMessages) unsubscribeMessages();

//   let q;

//   if (mode === "group") {
//     q = query(
//       collection(db, "messages"),
//       where("type", "==", "group"),
//       where("receiver", "==", activeGroup)
//     );
//   } else {
//     const chatId = getPrivateChatId(currentUser.uid, activeUser);

//     q = query(
//       collection(db, "messages"),
//       where("type", "==", "private"),
//       where("chatId", "==", chatId)
//     );
//   }

//   unsubscribeMessages = onSnapshot(q, (snapshot) => {
//     chatBox.innerHTML = "";

//     const messages = snapshot.docs
//       .map(d => d.data())
//       .sort((a, b) =>
//         (a.timestamp?.seconds || 0) -
//         (b.timestamp?.seconds || 0)
//       );

//     messages.forEach(renderMessage);
//     chatBox.scrollTop = chatBox.scrollHeight;
//   });
// }

// /* ================= RENDER ================= */
// function renderMessage(m) {
//   const div = document.createElement("div");
//   const isMe = m.sender === currentUser.uid;

//   div.className = "message " + (isMe ? "you" : "other");

//   div.innerHTML = `
//     <div>${m.text}</div>
//     <small class="opacity-75 d-block text-end">
//       ${m.timestamp ? m.timestamp.toDate().toLocaleTimeString() : ""}
//     </small>
//   `;

//   chatBox.appendChild(div);
// }

// /* ================= USERS ================= */
// function loadUsers() {
//   onSnapshot(collection(db, "users"), (snap) => {
//     userList.innerHTML = "";

//     snap.forEach((d) => {
//       if (d.id === currentUser.uid) return;

//       const u = d.data();
//       const li = document.createElement("li");

//       li.className =
//         "list-group-item d-flex justify-content-between align-items-center";

//       li.innerHTML = `
//         <span>${u.fullName || "User"}</span>
//         <span class="badge bg-success rounded-circle">&nbsp;</span>
//       `;

//       li.onclick = () =>
//         openPrivateChat(d.id, u.fullName || "User");

//       userList.appendChild(li);
//     });
//   });
// }
