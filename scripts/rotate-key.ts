import "dotenv/config";
import { db } from "../app/lib/db";
import { decryptText, encryptText } from "../app/lib/security/crypto";

/**
 * Rotação anual/imediata de chaves (11.2.4): executar com
 * DATA_ENCRYPTION_KEY = chave nova e DATA_ENCRYPTION_KEY_PREVIOUS = chave antiga.
 */
async function main() {
  if (!process.env.DATA_ENCRYPTION_KEY_PREVIOUS) {
    throw new Error("Defina DATA_ENCRYPTION_KEY_PREVIOUS com a chave antiga");
  }
  const records = await db.sensitiveData.findMany();
  for (const record of records) {
    const plaintext = decryptText({
      cipherText: record.cipherText,
      iv: record.iv,
      authTag: record.authTag,
    });
    const encrypted = encryptText(plaintext);
    await db.sensitiveData.update({
      where: { id: record.id },
      data: {
        cipherText: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });
  }
  console.log(`Chave rotacionada: ${records.length} registro(s) sensível(is) recriptografado(s).`);
  console.log(
    "Backups antigos devem ser recriptografados pela Infraestrutura antes do descarte da chave anterior.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
