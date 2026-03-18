// E2E Encryption using Web Crypto API

export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256", // standard curve
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
}

export async function exportPublicKey(key) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  const exportedArray = new Uint8Array(exported);
  return btoa(String.fromCharCode.apply(null, exportedArray));
}

export async function importPublicKey(base64Key) {
  const binaryString = atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    "raw",
    bytes.buffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

export async function deriveSharedSecret(privateKey, publicKey) {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(sharedSecret, text) {
  const enc = new TextEncoder();
  const encodedText = enc.encode(text);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedSecret,
    encodedText
  );
  
  const ciphertextArray = new Uint8Array(ciphertext);
  
  return {
    ciphertext: btoa(String.fromCharCode.apply(null, ciphertextArray)),
    iv: btoa(String.fromCharCode.apply(null, iv))
  };
}

export async function decryptMessage(sharedSecret, ciphertextBase64, ivBase64) {
  const ciphertextBinary = atob(ciphertextBase64);
  const ciphertextArray = new Uint8Array(ciphertextBinary.length);
  for (let i = 0; i < ciphertextBinary.length; i++) {
    ciphertextArray[i] = ciphertextBinary.charCodeAt(i);
  }
  
  const ivBinary = atob(ivBase64);
  const ivArray = new Uint8Array(ivBinary.length);
  for (let i = 0; i < ivBinary.length; i++) {
    ivArray[i] = ivBinary.charCodeAt(i);
  }
  
  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivArray,
      },
      sharedSecret,
      ciphertextArray.buffer
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    return "[Decryption Failed - Keys may not match or message was tampered with]";
  }
}
