import { db } from "./firebase.js";
import { collection, addDoc, onSnapshot } from "firebase/firestore";

const groupList = document.getElementById("groupList");
const groupNameInput = document.getElementById("groupName");

window.createGroup = async function () {
  if (!groupNameInput.value) return;

  await addDoc(collection(db, "groups"), {
    name: groupNameInput.value
  });

  groupNameInput.value = "";
};

onSnapshot(collection(db, "groups"), snapshot => {
  groupList.innerHTML = "";
  snapshot.forEach(doc => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = doc.data().name;
    li.onclick = () => selectGroup(doc.id, doc.data().name);
    groupList.appendChild(li);
  });
});
