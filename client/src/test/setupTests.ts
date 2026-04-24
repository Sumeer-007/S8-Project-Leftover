import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Cloudflare Turnstile widget in tests to avoid real network and act() warnings
vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => null,
}));

