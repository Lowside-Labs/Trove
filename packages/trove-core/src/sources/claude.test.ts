import { describe, expect, it } from "vitest";
import { __internal } from "./claude.js";

describe("claude source helpers", () => {
  it("extracts an organization id from loaded resource URLs", () => {
    expect(
      __internal.findOrganizationIdInUrls([
        "https://claude.ai/api/bootstrap/ac591652-ee8a-468f-b887-9cdb1fa44a42/app_start",
        "https://claude.ai/api/organizations/ac591652-ee8a-468f-b887-9cdb1fa44a42/projects?limit=30",
      ]),
    ).toBe("ac591652-ee8a-468f-b887-9cdb1fa44a42");
  });

  it("extracts an organization id from discoverable payloads", () => {
    expect(
      __internal.extractOrganizationIdFromPayload({
        organizations: [],
        account: {
          organization_uuid: "ac591652-ee8a-468f-b887-9cdb1fa44a42",
        },
      }),
    ).toBe("ac591652-ee8a-468f-b887-9cdb1fa44a42");
  });
});
