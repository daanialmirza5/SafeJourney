import { db } from "@/lib/db";
import { storageService } from "@/lib/storage/storageService";
import { ocrService, classifyDocument, type DocumentTypeKey } from "@/lib/ocr/ocrService";
import { recordAuditEvent } from "@/lib/audit";
import { NotFoundError, ConflictError } from "@/lib/apiError";
import type { User } from "@prisma/client";

export async function uploadDocument(
  referralId: string,
  actor: User,
  file: { buffer: Buffer; originalName: string; mimeType: string },
  typeHint?: DocumentTypeKey
) {
  const storageKey = await storageService.save(file.buffer, file.originalName, file.mimeType);
  const documentType = typeHint ?? classifyDocument(file.originalName);
  const document = await db.document.create({
    data: {
      referralId,
      uploadedById: actor.id,
      type: documentType,
      storageKey,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.buffer.byteLength,
      status: "UPLOADED",
    },
  });
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "Document",
    entityId: document.id,
    action: "DOCUMENT_UPLOADED",
    newValue: { type: documentType, originalName: file.originalName },
  });
  return document;
}

export async function extractDocument(documentId: string, actor: User) {
  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) throw new NotFoundError("Document not found.");

  const result = await ocrService.extractDocument(document.originalName, document.type as DocumentTypeKey);

  const extraction = await db.$transaction(async (tx) => {
    const created = await tx.documentExtraction.upsert({
      where: { documentId },
      create: {
        documentId,
        documentType: result.documentType,
        fields: JSON.stringify(result.fields),
        confidence: result.confidence,
        warnings: JSON.stringify(result.warnings),
      },
      update: {
        documentType: result.documentType,
        fields: JSON.stringify(result.fields),
        confidence: result.confidence,
        warnings: JSON.stringify(result.warnings),
      },
    });
    await tx.document.update({ where: { id: documentId }, data: { status: "EXTRACTED", type: result.documentType } });
    return created;
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "Document",
    entityId: documentId,
    action: "DOCUMENT_EXTRACTED",
    newValue: { documentType: result.documentType, confidence: result.confidence },
  });

  return extraction;
}

export async function confirmDocument(
  documentId: string,
  actor: User,
  input: { confirmedFields?: Record<string, string>; documentType?: DocumentTypeKey }
) {
  const document = await db.document.findUnique({ where: { id: documentId }, include: { extraction: true } });
  if (!document) throw new NotFoundError("Document not found.");
  if (!document.extraction) throw new ConflictError("Document has not been extracted yet.");

  await db.$transaction(async (tx) => {
    if (input.confirmedFields) {
      await tx.documentExtraction.update({
        where: { documentId },
        data: { fields: JSON.stringify(input.confirmedFields) },
      });
    }
    await tx.document.update({
      where: { id: documentId },
      data: { status: "CONFIRMED", type: input.documentType ?? document.type },
    });
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "Document",
    entityId: documentId,
    action: "DOCUMENT_CONFIRMED",
  });

  return db.document.findUnique({ where: { id: documentId }, include: { extraction: true } });
}

export async function rejectDocument(documentId: string, actor: User, reason: string) {
  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) throw new NotFoundError("Document not found.");
  await db.document.update({ where: { id: documentId }, data: { status: "REJECTED" } });
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "Document",
    entityId: documentId,
    action: "DOCUMENT_REJECTED",
    metadata: { reason },
  });
  return db.document.findUnique({ where: { id: documentId } });
}
