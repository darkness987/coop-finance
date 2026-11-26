import test from "node:test";
import assert from "node:assert/strict";
import {
  runDatabaseRequest,
  loadDatabase,
  withDatabase,
} from "../database/remote";
import {
  readDatabase,
  updateDatabase,
  encode,
  decode,
  type Database,
} from "../database/store";
import type { DatabaseTransport } from "../database/cloud-transport";
function fixture(): Database {
  return {
    version: 1,
    members: { records: [], applications: [] },
    shares: { rules: [], accounts: [], payments: [], changeRequests: [] },
    returns: { allocations: [], dividends: [], rebates: [] },
    deposits: { accounts: [], transactions: [] },
    loans: {
      products: [],
      applications: [],
      documents: [],
      handoffs: [],
      decisions: [],
      contracts: [],
      payments: [],
      schedules: [],
    },
    auth: { users: [], auditLogs: [] },
  };
}
function backend() {
  let text = encode(fixture()),
    version = 1,
    saves = 0;
  const transport: DatabaseTransport = {
    async load() {
      return { text, etag: String(version) };
    },
    async save(next, etag) {
      if (etag !== String(version))
        throw Object.assign(Error("conflict"), { status: 409 });
      text = next;
      version++;
      saves++;
    },
  };
  return { transport, data: () => decode(text), saves: () => saves };
}
test("cloud requests persist changes and read the latest shared data without modifying the local file", async () => {
  const b = backend();
  await runDatabaseRequest(
    () =>
      updateDatabase((db) => {
        db.members.records.push({ id: "m", name: "Cloud member" });
      }),
    b.transport,
  );
  const next = await runDatabaseRequest(
    async () => await loadDatabase(),
    b.transport,
  );
  assert.equal(next.members.records[0].name, "Cloud member");
  assert.equal(b.saves(), 1);
});
test("read snapshots cannot mutate shared data; nested work shares one request", async () => {
  const b = backend();
  await runDatabaseRequest(async () => {
    readDatabase().auth.auditLogs.push({ unexpected: true });
    await withDatabase(() =>
      updateDatabase((db) => db.auth.auditLogs.push({ valid: true })),
    );
    assert.equal(readDatabase().auth.auditLogs.length, 1);
  }, b.transport);
  assert.deepEqual(b.data().auth.auditLogs, [{ valid: true }]);
  assert.equal(b.saves(), 1);
});
test("failed service update rolls back its mutation and read-only requests perform no writes", async () => {
  const b = backend();
  await runDatabaseRequest(() => {
    assert.throws(() =>
      updateDatabase((db) => {
        db.auth.auditLogs.push({ bad: true });
        throw Error("invalid");
      }),
    );
    assert.equal(readDatabase().auth.auditLogs.length, 0);
  }, b.transport);
  assert.equal(b.saves(), 0);
  await assert.rejects(
    runDatabaseRequest(() => {
      updateDatabase((db) => db.auth.auditLogs.push({ bad: true }));
      throw Error("request failed");
    }, b.transport),
  );
  assert.equal(b.saves(), 0);
});
test("concurrent instances cannot overwrite a newer snapshot and conflicts are returned", async () => {
  const b = backend();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let loaded = 0;
  let both!: () => void;
  const ready = new Promise<void>((resolve) => (both = resolve));
  const transport: DatabaseTransport = {
    ...b.transport,
    async load() {
      const result = await b.transport.load();
      if (++loaded === 2) both();
      return result;
    },
  };
  const first = runDatabaseRequest(async () => {
    await gate;
    updateDatabase((db) => db.auth.auditLogs.push({ actor: "first" }));
  }, transport);
  const second = runDatabaseRequest(async () => {
    await gate;
    updateDatabase((db) => db.auth.auditLogs.push({ actor: "second" }));
  }, transport);
  await ready;
  release();
  const result = await Promise.allSettled([first, second]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = result.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.equal(rejected.reason.status, 409);
  assert.equal(b.saves(), 1);
  assert.equal(b.data().auth.auditLogs.length, 1);
});
test("a response is not successful until the remote write has completed", async () => {
  const b = backend();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let saving!: () => void;
  const started = new Promise<void>((resolve) => (saving = resolve));
  let finished = false;
  const request = runDatabaseRequest(
    () => {
      updateDatabase((db) => db.auth.auditLogs.push({ saved: true }));
      return Response.json({ ok: true });
    },
    {
      ...b.transport,
      async save(text, etag) {
        saving();
        await gate;
        await b.transport.save(text, etag);
      },
    },
  ).then((result) => {
    finished = true;
    return result;
  });
  await started;
  assert.equal(finished, false);
  assert.equal(b.saves(), 0);
  release();
  assert.equal((await request).status, 200);
  assert.equal(b.saves(), 1);
});
test("returned OTP errors still persist failed attempts while transport failures prevent success", async () => {
  const b = backend();
  const result = await runDatabaseRequest(() => {
    updateDatabase((db) => db.auth.auditLogs.push({ attempt: 1 }));
    return Response.json({ error: "OTP incorrect" }, { status: 400 });
  }, b.transport);
  assert.equal(result.status, 400);
  assert.equal(b.saves(), 1);
  await assert.rejects(
    runDatabaseRequest(
      () => updateDatabase((db) => db.auth.auditLogs.push({ bad: true })),
      {
        ...b.transport,
        async save() {
          throw Error("offline");
        },
      },
    ),
    /offline/,
  );
  assert.equal(b.saves(), 1);
});
test("invalid remote data is rejected and never overwritten", async () => {
  const b = backend();
  await assert.rejects(
    runDatabaseRequest(
      () => updateDatabase((db) => db.auth.auditLogs.push({ bad: true })),
      {
        ...b.transport,
        async load() {
          return { text: "invalid", etag: "x" };
        },
      },
    ),
  );
  assert.equal(b.saves(), 0);
});
