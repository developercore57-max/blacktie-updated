import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "reseller"]),
});

export const resellerSignupSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const createResellerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  unitStreetNumber: z.string().optional(),
  buildingComplex: z.string().optional(),
  streetName: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});

export const updateResellerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  unitStreetNumber: z.string().optional(),
  buildingComplex: z.string().optional(),
  streetName: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  status: z.enum(["active", "suspended", "pending"]).optional(),
});

export const createClientSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  unitStreetNumber: z.string().optional(),
  buildingComplex: z.string().optional(),
  streetName: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  sipExtensions: z.coerce.number().min(1).optional().default(1),
  monthlyFee: z.coerce.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

export const updateClientSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  unitStreetNumber: z.string().optional(),
  buildingComplex: z.string().optional(),
  streetName: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  sipExtensions: z.coerce.number().min(1),
  status: z.enum(["active", "suspended", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export const updateProfileSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  unitStreetNumber: z.string().optional(),
  buildingComplex: z.string().optional(),
  streetName: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});
