export default async function globalTeardown() {
  const pg = globalThis.__PINDROP_PG__;
  if (pg) await pg.stop();
}
