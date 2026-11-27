import "dotenv/config";
import { createDecipheriv } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { db } from "../app/lib/db";
import { encryptBuffer, encryptText, sha256 } from "../app/lib/security/crypto";

/**
 * Rotação anual/imediata de chaves (11.2.4): executar com
 * DATA_ENCRYPTION_KEY = chave nova e DATA_ENCRYPTION_KEY_PREVIOUS = chave antiga
 * (aceita-se uma lista separada por vírgulas para rotacionar várias gerações).
 *
 * Recriptografa dados sensíveis E todos os arquivos de backup; o timestamp da
 * rotação vive no ambiente/cofre, não no banco, então este script apenas o
 * emite na saída para ser aplicado pelo operador (nunca altera .env).
 */
function parseKey(name: string, value: string): Buffer {
  const key = value.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(`${name} deve ter 32 bytes em hexadecimal (64 caracteres)`);
  }
  return Buffer.from(key, "hex");
}

function activeKey(): Buffer {
  const value = process.env.DATA_ENCRYPTION_KEY;
  if (!value) throw new Error("Defina DATA_ENCRYPTION_KEY com a chave nova");
  return parseKey("DATA_ENCRYPTION_KEY", value);
}

function previousKeys(): Buffer[] {
  const raw = process.env.DATA_ENCRYPTION_KEY_PREVIOUS?.trim();
  if (!raw) throw new Error("Defina DATA_ENCRYPTION_KEY_PREVIOUS com a chave antiga");
  const keys = raw
    .split(",")
    .map((item, index) => parseKey(`DATA_ENCRYPTION_KEY_PREVIOUS[${index}]`, item))
    .filter((key, index, all) => all.findIndex((other) => other.equals(key)) === index);
  return keys.filter((key) => !key.equals(activeKey()));
}

function destinations(): string[] {
  return [
    process.env.BACKUP_LOCAL_DIR?.trim() || "/tmp/opencode/backups/local",
    process.env.BACKUP_CLOUD_DIR?.trim() || "/tmp/opencode/backups/cloud",
  ];
}

function decryptWith(
  keys: Buffer[],
  cipherText: Buffer,
  iv: Buffer,
  authTag: Buffer,
): Buffer | null {
  for (const key of keys) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(cipherText), decipher.final()]);
    } catch {
      // Próxima chave candidata.
    }
  }
  return null;
}

async function main() {
  const newKey = activeKey();
  const oldKeys = previousKeys();
  if (oldKeys.length === 0) {
    throw new Error("DATA_ENCRYPTION_KEY_PREVIOUS deve ser diferente da chave nova");
  }

  const records = await db.sensitiveData.findMany();
  let sensitiveRotated = 0;
  for (const record of records) {
    const cipherText = Buffer.from(record.cipherText, "base64");
    const iv = Buffer.from(record.iv, "base64");
    const authTag = Buffer.from(record.authTag, "base64");
    const decrypted = decryptWith(oldKeys, cipherText, iv, authTag);
    if (!decrypted) {
      if (decryptWith([newKey], cipherText, iv, authTag)) continue; // já rotacionado
      throw new Error(
        `Registro sensível ${record.id} não descriptografável com as chaves conhecidas`,
      );
    }
    const encrypted = encryptText(decrypted.toString("utf8"));
    await db.sensitiveData.update({
      where: { id: record.id },
      data: {
        cipherText: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });
    sensitiveRotated += 1;
  }

  const backups = await db.backupRecord.findMany();
  let rotated = 0;
  let alreadyCurrent = 0;
  let failed = 0;
  const [localDir, cloudDir] = destinations();
  for (const backup of backups) {
    const fileName = path.basename(backup.filePath);
    let cipherText: Buffer | null = null;
    for (const candidate of [backup.filePath, path.join(cloudDir, fileName)]) {
      try {
        cipherText = await readFile(candidate);
        break;
      } catch {
        // Tenta o outro destino (3-2-1).
      }
    }
    if (!cipherText) {
      failed += 1;
      console.error(`[backup ${backup.id}] arquivo não encontrado nos destinos`);
      continue;
    }
    const iv = Buffer.from(backup.iv, "base64");
    const authTag = Buffer.from(backup.authTag, "base64");
    const compressed = decryptWith(oldKeys, cipherText, iv, authTag);
    if (!compressed) {
      if (decryptWith([newKey], cipherText, iv, authTag)) {
        alreadyCurrent += 1;
        continue;
      }
      failed += 1;
      console.error(`[backup ${backup.id}] não descriptografável com as chaves conhecidas`);
      continue;
    }
    try {
      if (sha256(gunzipSync(compressed)) !== backup.checksum) {
        throw new Error("checksum do backup não confere");
      }
    } catch (error) {
      failed += 1;
      console.error(`[backup ${backup.id}] ${error instanceof Error ? error.message : error}`);
      continue;
    }

    const encrypted = encryptBuffer(compressed);
    const files = [path.join(localDir, fileName), path.join(cloudDir, fileName)];
    try {
      await Promise.all(
        destinations().map((dir) =>
          mkdir(dir, { recursive: true }).then(() =>
            writeFile(path.join(dir, fileName), encrypted.cipherText),
          ),
        ),
      );
      // Confere as duas cópias com a chave nova antes de atualizar o registro.
      for (const file of files) {
        const written = await readFile(file);
        if (!decryptWith([newKey], written, encrypted.iv, encrypted.authTag)) {
          throw new Error(`[backup ${backup.id}] falha ao verificar a recriptografia`);
        }
      }
    } catch (error) {
      // Nunca deixa o arquivo local com a chave nova e o registro com a antiga.
      await Promise.all(files.map((file) => writeFile(file, cipherText)));
      throw error;
    }
    await db.backupRecord.update({
      where: { id: backup.id },
      data: {
        iv: encrypted.iv.toString("base64"),
        authTag: encrypted.authTag.toString("base64"),
        sizeBytes: encrypted.cipherText.length,
      },
    });
    rotated += 1;
  }

  console.log(
    `Chave rotacionada: ${sensitiveRotated} registro(s) sensível(is) e ${rotated} backup(s) recriptografado(s).`,
  );
  console.log(
    `${alreadyCurrent} backup(s) já usavam a chave nova; ${failed} falha(s) preservaram o arquivo original.`,
  );
  console.log(
    `DATA_ENCRYPTION_KEY_ROTATED_AT=${new Date().toISOString()} — defina este valor no cofre/ambiente e reinicie os serviços.`,
  );
  console.log(
    "Este script não altera .env nem o ambiente do processo pai: a atualização de DATA_ENCRYPTION_KEY_ROTATED_AT é manual.",
  );
  console.log(
    "Mantenha DATA_ENCRYPTION_KEY_PREVIOUS até concluir a rotação de todas as cópias (compatibilidade com uma chave anterior).",
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
