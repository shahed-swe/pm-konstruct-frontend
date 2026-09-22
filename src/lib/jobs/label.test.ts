import { describe, expect, it } from "vitest";
import { labelJob } from "./label";

const job = { jobNumber: "J-101", jobName: "Weston House", jobAddress: "12 Rae St" };

describe("labelJob", () => {
  it("uses the company's chosen field", () => {
    expect(labelJob(job, "job_number")).toBe("J-101");
    expect(labelJob(job, "job_name")).toBe("Weston House");
    expect(labelJob(job, "job_address")).toBe("12 Rae St");
  });

  it("falls back in the legacy's order when the chosen field is missing", () => {
    expect(labelJob({ ...job, jobName: null }, "job_name")).toBe("J-101");
    expect(labelJob({ jobName: null, jobNumber: null, jobAddress: "12 Rae St" }, "job_name")).toBe("12 Rae St");
  });

  it("treats an empty string as missing", () => {
    // The legacy used `||`, so a job saved with a blank name fell through
    // rather than rendering as nothing. Keeping that.
    expect(labelJob({ ...job, jobName: "" }, "job_name")).toBe("J-101");
  });

  it("returns an empty string when a job has no identifying field at all", () => {
    expect(labelJob({}, "job_number")).toBe("");
  });

  it("falls back to the job number for a mode it does not recognise", () => {
    // The API constrains the column, but branding arrives over HTTP and a
    // stale client should show something rather than nothing.
    expect(labelJob(job, "something-else")).toBe("J-101");
  });
});
