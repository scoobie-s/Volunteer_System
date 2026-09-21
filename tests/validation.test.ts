import test from "node:test";
import assert from "node:assert/strict";
import { userSchema, volunteerSchema } from "../lib/validation";

test("userSchema accepts empty login code for update flows", () => {
  const result = userSchema.safeParse({
    name: "Platform Admin",
    email: "admin@example.com",
    userType: "PLATFORM_ADMIN",
    loginCode: "",
    campusIds: [],
    departmentIds: [],
    sectionIds: [],
    pageAccess: [],
    actionAccess: [],
  });

  assert.equal(result.success, true);
});

test("userSchema rejects non-digit login codes", () => {
  const result = userSchema.safeParse({
    name: "Platform Admin",
    email: "admin@example.com",
    userType: "PLATFORM_ADMIN",
    loginCode: "12ab",
    campusIds: [],
    departmentIds: [],
    sectionIds: [],
    pageAccess: [],
    actionAccess: [],
  });

  assert.equal(result.success, false);
});

const volunteer = {
  fullName: "Test Volunteer",
  phone: "+27820000000",
  membershipStatus: "MEMBER",
  role: "VOLUNTEER",
  availability: "BOTH",
  sectionId: "section-1",
  sectionIds: ["section-1"],
};

test("volunteer email is optional and blank values are normalized", () => {
  for (const email of [undefined, null, "", "   "]) {
    assert.equal(volunteerSchema.parse({ ...volunteer, email }).email, "");
  }
});

test("volunteer email must be valid when supplied", () => {
  assert.equal(volunteerSchema.parse({ ...volunteer, email: " volunteer@example.com " }).email, "volunteer@example.com");
  assert.equal(volunteerSchema.safeParse({ ...volunteer, email: "invalid" }).success, false);
});

test("volunteer required fields remain required", () => {
  for (const field of ["fullName", "phone", "membershipStatus", "role", "availability", "sectionId"]) {
    assert.equal(volunteerSchema.safeParse({ ...volunteer, [field]: "" }).success, false);
  }
  assert.equal(volunteerSchema.safeParse({ ...volunteer, sectionIds: [] }).success, false);
});
