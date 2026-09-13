import { z } from "zod";

export const createReferralSchema = z.object({
  patient: z.object({
    name: z.string().min(1).max(200),
    sex: z.enum(["Female", "Male", "Other"]),
    dateOfBirth: z.string().optional(),
  }),
  includeNewborn: z
    .object({
      name: z.string().min(1).max(200),
      sex: z.enum(["Female", "Male", "Other"]).optional(),
      birthDate: z.string().optional(),
    })
    .optional(),
  receivingFacilityId: z.string().min(1),
  priority: z.enum(["ROUTINE", "URGENT", "EMERGENCY"]),
  transportRequired: z.boolean(),
  doctorNote: z.string().min(1).max(4000),
  adminNotes: z.string().max(4000).optional(),
});

export const clarificationSchema = z.object({ note: z.string().min(1).max(1000) });
export const declineSchema = z.object({ reason: z.string().min(1).max(1000) });
export const assignTransportSchema = z.object({
  vehiclePseudo: z.string().min(1).max(60),
  etaMinutes: z.number().int().min(1).max(600),
});
export const transportProgressSchema = z.object({
  status: z.enum(["EN_ROUTE_TO_PICKUP", "PICKED_UP", "IN_TRANSIT"]),
});
export const dischargeSchema = z.object({
  destination: z.string().min(1).max(200),
  note: z.string().max(2000).optional(),
});
export const backReferralSchema = z.object({
  dischargeSummary: z.string().min(1).max(4000),
});
export const acknowledgeBackReferralSchema = z.object({
  followUpAssigneeId: z.string().optional(),
});
export const completeFollowUpSchema = z.object({ note: z.string().max(1000).optional() });
export const adminOverrideSchema = z.object({
  toStatus: z.string().min(1),
  reason: z.string().min(1).max(1000),
  confirmOutstanding: z.boolean().optional(),
});

export const closeCaseSchema = z.object({
  reason: z.string().min(1).max(1000),
  confirmOutstanding: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const documentConfirmSchema = z.object({
  confirmedFields: z.record(z.string(), z.string()).optional(),
  documentType: z.string().optional(),
});

export const documentRejectSchema = z.object({ reason: z.string().min(1).max(500) });

export const addCaregiverSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  permission: z.enum(["VIEW_ONLY", "DOCUMENT_HELP", "FULL_ADMINISTRATIVE_ASSISTANCE"]),
});

export const aiQuestionSchema = z.object({ question: z.string().min(1).max(1000) });

export const rescueActionSchema = z.object({
  action: z.enum(["CONTACT_FACILITY", "ESCALATE_COORDINATOR", "ALTERNATE_FACILITY", "RETRY_NOTIFICATION"]),
  note: z.string().max(500).optional(),
});

// Shape/type parsing only -- category enum membership, title/description
// length bounds, and the offset-day range are all validated by the single
// source of truth, validateMilestoneTemplateInput() in newbornContinuity.ts,
// so those business rules aren't duplicated (and can't drift) between the
// wire-format schema and the pure validation function.
export const createMilestoneTemplateSchema = z.object({
  category: z.string(),
  title: z.string(),
  description: z.string(),
  offsetDays: z.number(),
});

export const updateMilestoneTemplateSchema = z.object({
  category: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  offsetDays: z.number().optional(),
  active: z.boolean().optional(),
});

export const skipFollowUpSchema = z.object({ reason: z.string().min(1).max(1000) });

export const createTaskSchema = z.object({
  referralId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  assignedToId: z.string().optional(),
  dueDate: z.string(),
  source: z.string().default("manual"),
});
