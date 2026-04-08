import * as E2EE from './crypto.js';

const joinView = document.getElementById('join-view');
const chatView = document.getElementById('chat-view');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
const currentRoomSpan = document.getElementById('current-room');
const messagesList = document.getElementById('messages-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const connStatus = document.getElementById('conn-status');
const copyRoomBtn = document.getElementById('copy-room-btn');

let socket;
let currentRoom = '';
let myKeyPair = null;
let sharedSecrets = new Map();
let myId = '';

// Backend server connection config
const backendUrl = "http://localhost:3000"; // adjust for deployment if necessary

async function init() {
  myKeyPair = await E2EE.generateKeyPair();
  
  socket = io(backendUrl);

  socket.on('connect', () => {
    myId = socket.id;
    connStatus.classList.add('connected');
    addSystemMessage("Connected to secure server.");
  });

  copyRoomBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoom).then(() => {
        const originalTitle = copyRoomBtn.title;
        copyRoomBtn.title = "Copied!";
        setTimeout(() => copyRoomBtn.title = originalTitle, 2000);
    });
  });

  socket.on('disconnect', () => {
    connStatus.classList.remove('connected');
    addSystemMessage("Disconnected from server.");
  });

  socket.on('user_joined', (userId) => {
    addSystemMessage("Anonymous user joined the channel. Exchanging keys...");
    E2EE.exportPublicKey(myKeyPair.publicKey).then(myPubBase64 => {
      socket.emit('public_key_exchange', {
        roomId: currentRoom,
        targetId: userId,
        publicKey: myPubBase64
      });
    });
  });

  socket.on('public_key_exchange', async (data) => {
    const importedKey = await E2EE.importPublicKey(data.publicKey);
    const sharedSecret = await E2EE.deriveSharedSecret(myKeyPair.privateKey, importedKey);
    sharedSecrets.set(data.senderId, sharedSecret);
    
    // Reply with our key if we haven't sent it directly yet
    if (!sharedSecrets.has("sent_to_" + data.senderId)) {
        const myPubBase64 = await E2EE.exportPublicKey(myKeyPair.publicKey);
        socket.emit('public_key_exchange', {
            roomId: currentRoom,
            targetId: data.senderId,
            publicKey: myPubBase64
        });
        sharedSecrets.set("sent_to_" + data.senderId, true);
    }
    
    addSystemMessage("Encrypted channel established with a peer.");
  });

  socket.on('receive_message', async (data) => {
    if (data.payloads && data.payloads[myId]) {
      const payload = data.payloads[myId];
      const sharedSecret = sharedSecrets.get(data.senderId);
      if (sharedSecret) {
        const decrypted = await E2EE.decryptMessage(sharedSecret, payload.ciphertext, payload.iv);
        addMessage(decrypted, 'incoming');
      }
    }
  });

  socket.on('user_disconnected', (userId) => {
    if (sharedSecrets.has(userId)) {
      sharedSecrets.delete(userId);
      addSystemMessage("A peer securely disconnected from the channel.");
    }
  });
}

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `message-bubble ${type}`;
  
  const senderSpan = document.createElement('span');
  senderSpan.className = 'message-sender';
  senderSpan.textContent = type === 'incoming' ? 'Anonymous' : 'You';
  
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  
  div.appendChild(senderSpan);
  div.appendChild(textSpan);
  
  messagesList.appendChild(div);
  messagesList.scrollTop = messagesList.scrollHeight;
}

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'system-message';
  div.textContent = text;
  messagesList.appendChild(div);
  messagesList.scrollTop = messagesList.scrollHeight;
}

joinBtn.addEventListener('click', () => {
  const room = roomInput.value.trim();
  if (!room) return;
  
  if (!socket) {
      init().then(() => joinChannel(room));
  } else {
      joinChannel(room);
  }
});

roomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinBtn.click();
});

async function joinChannel(room) {
  currentRoom = room;
  currentRoomSpan.textContent = room;
  joinView.classList.remove('active');
  joinView.classList.add('hidden');
  chatView.classList.remove('hidden');
  chatView.classList.add('active');
  
  messagesList.innerHTML = '';
  sharedSecrets.clear();
  
  const connectAndJoin = async () => {
    socket.emit('join_room', room);
    const myPubBase64 = await E2EE.exportPublicKey(myKeyPair.publicKey);
    socket.emit('public_key_exchange', {
      roomId: room,
      publicKey: myPubBase64
    });
    addSystemMessage(`Joined channel: ${room}. Broadcasting public key...`);
  };

  if (socket && socket.connected) {
    connectAndJoin();
  } else {
    addSystemMessage("Authenticating secure connection key ring...");
    const checkConn = setInterval(() => {
      if (socket && socket.connected) {
        clearInterval(checkConn);
        connectAndJoin();
      }
    }, 500);
  }
}

leaveBtn.addEventListener('click', () => {
  if (socket) {
      socket.disconnect();
      socket = null;
  }
  chatView.classList.remove('active');
  chatView.classList.add('hidden');
  joinView.classList.remove('hidden');
  joinView.classList.add('active');
  roomInput.value = '';
});

messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  
  messageInput.value = '';
  addMessage(text, 'outgoing');
  
  const payloads = {};
  for (const [peerId, secret] of sharedSecrets.entries()) {
    if (peerId.startsWith("sent_to_")) continue;
    const encrypted = await E2EE.encryptMessage(secret, text);
    payloads[peerId] = encrypted;
  }
  
  if (Object.keys(payloads).length > 0) {
    socket.emit('send_message', {
      roomId: currentRoom,
      senderId: myId,
      payloads: payloads
    });
  } else {
    // Graceful fallback display if no one is in room
    addSystemMessage("Message delivered, but no one is currently in the channel to decrypt it.");
  }
});
