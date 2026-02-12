let token = "";

async function login() {
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value
    })
  });

  const data = await res.json();
  if (!data.token) return alert("Login failed");

  token = data.token;
  model.value = data.model;
  auth.style.display = "none";
  chat.style.display = "block";
}

async function switchModel() {
  await fetch("/set-model", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ model: model.value })
  });
}

async function send() {
  const text = prompt.value.trim();
  if (!text) return;
  prompt.value = "";

  messages.innerHTML += `<div>You: ${text}</div>`;

  const res = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();
  messages.innerHTML += `<div>Intelix (${data.model}): ${data.reply}</div>`;
}

function logout() {
  token = "";
  messages.innerHTML = "";
  chat.style.display = "none";
  auth.style.display = "block";
}

async function clearMemory() {
  await fetch("/clear-memory", {
    method: "POST",
    headers: { Authorization: token }
  });
  messages.innerHTML = "";
}