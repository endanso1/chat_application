import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const groupList = document.getElementById("groupList");
const groupNameInput = document.getElementById("groupName");

window.createGroup = async function () {
  if (!groupNameInput.value.trim()) return;

  await addDoc(collection(db, "groups"), {
    name: groupNameInput.value.trim(),
    createdAt: serverTimestamp()
  });

  groupNameInput.value = "";
};

onSnapshot(collection(db, "groups"), (snap) => {
  groupList.innerHTML = "";

  snap.forEach((d) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    li.textContent = d.data().name;

    li.onclick = () => selectGroup(d.id, d.data().name);
    groupList.appendChild(li);
  });
});
