import JSEncrypt from "jsencrypt";

let publicKeyCache = null;

/**
 * Initializes the public key from the backend.
 * Should be called on app load.
 */
export const initEncryption = async (fetchPublicKeyFn) => {
  if (publicKeyCache) return publicKeyCache;
  try {
    const res = await fetchPublicKeyFn();
    publicKeyCache = res.data.publicKey;
    return publicKeyCache;
  } catch (error) {
    console.error("Failed to load public key for encryption", error);
    return null;
  }
};

/**
 * Encrypts a raw password using the cached public key.
 */
export const encryptPassword = (rawPassword) => {
  if (!publicKeyCache) {
    throw new Error("Public key is not initialized. Cannot encrypt.");
  }
  
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(publicKeyCache);
  const encrypted = encryptor.encrypt(rawPassword);
  
  if (!encrypted) {
    throw new Error("Encryption failed");
  }
  
  return encrypted;
};
