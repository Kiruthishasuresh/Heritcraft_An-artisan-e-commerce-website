package com.heritcraft.userservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import javax.crypto.Cipher;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

@Service
public class PasswordCryptoService {

    @Value("${rsa.private.key}")
    private String privateKeyString;

    private PrivateKey privateKey;

    @PostConstruct
    public void init() {
        try {
            // Remove any potential whitespace or PEM headers if they exist
            String privateKeyPEM = privateKeyString
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");

            byte[] keyBytes = Base64.getDecoder().decode(privateKeyPEM);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            this.privateKey = kf.generatePrivate(spec);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize RSA private key", e);
        }
    }

    public String decrypt(String encryptedPassword) {
        try {
            Cipher cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
            cipher.init(Cipher.DECRYPT_MODE, privateKey);
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedPassword));
            return new String(decryptedBytes, "UTF-8");
        } catch (Exception e) {
            // Decryption failed. We return null so the caller can handle it gracefully.
            return null;
        }
    }
}
