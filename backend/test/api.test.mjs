import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import mongoose from 'mongoose';

const backend = fileURLToPath(new URL('..', import.meta.url));

// Cada prueba de integración usa su propia base, nunca freehub-db.
async function testDatabase(t) {
  const name = `freehub_test_${randomUUID().replaceAll('-', '')}`;
  const uri = new URL(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017');
  uri.pathname = `/${name}`;

  const connection = await mongoose.createConnection(uri.toString(), {
    serverSelectionTimeoutMS: 2000,
  }).asPromise();

  t.after(async () => {
    assert.equal(connection.name, name);
    await connection.dropDatabase();
    await connection.close();
  });

  return { connection, uri: uri.toString() };
}

async function startApi(t, env) {
  const child = spawn(process.execPath, ['dist/app.js'], {
    cwd: backend,
    env: { ...process.env, ...env, HOST: '127.0.0.1', PORT: '0' },
  });

  let output = '';
  const closed = once(child, 'close');
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await closed;
  });

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ child, output }), 6000);
    const finish = (result) => {
      clearTimeout(timer);
      resolve(result);
    };

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) finish({ child, url: match[0], output });
    });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.once('close', (code) => finish({ child, code, output }));
    child.once('error', (error) => finish({ child, error, output }));
  });
}

test('API: consulta publicaciones reales sin permitir escrituras', async (t) => {
  const { connection, uri } = await testDatabase(t);
  const api = await startApi(t, { MONGO_URI: uri });
  assert.ok(api.url, `La API no inició: ${api.output}`);

  await t.test('una colección vacía devuelve 200 y data vacía', async () => {
    const response = await fetch(`${api.url}/api/resources`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [] });
  });

  await t.test('consulta MongoDB y ordena los recursos del más reciente al más antiguo', async () => {
    await connection.collection('resources').insertMany([
      {
        title: 'Publicación antigua', url: 'https://example.com/antigua',
        description: 'Documento guardado antes de consultar.', category: 'Learning',
        resourceType: 'Course', tags: [], author: { name: 'Autor de prueba' },
        createdAt: new Date('2026-01-01'),
      },
      {
        title: 'Publicación reciente', url: 'https://example.com/reciente',
        description: 'Otro documento real.', category: 'Development',
        resourceType: 'Documentation', tags: ['Web'], author: { name: 'Otro autor' },
        createdAt: new Date('2026-11-01'),
      },
    ]);

    const response = await fetch(`${api.url}/api/resources`);
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.deepEqual(data.map((resource) => resource.title), [
      'Publicación reciente', 'Publicación antigua',
    ]);
    assert.equal(data[0].author.name, 'Otro autor');
    assert.equal(data[0].createdAt, '2026-11-01T00:00:00.000Z');
    assert.match(data[0]._id, /^[a-f0-9]{24}$/);
  });

  await t.test('una ruta no implementada devuelve 404 en JSON', async () => {
    const response = await fetch(`${api.url}/api/no-existe`);
    assert.equal(response.status, 404);
    assert.ok((await response.json()).msg);
  });

  await t.test('POST, PUT y DELETE no modifican publicaciones', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await fetch(`${api.url}/api/resources`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'No debe guardarse' }),
      });
      assert.equal(response.status, 404, method);
    }
    assert.equal(await connection.collection('resources').countDocuments(), 2);
  });
});

test('API: no anuncia éxito si MongoDB no está disponible', async (t) => {
  const api = await startApi(t, { MONGO_URI: 'mongodb://127.0.0.1:1/freehub_test_offline' });
  assert.equal(api.url, undefined);
  assert.equal(api.code, 1, api.output);
});

test('API: exige MONGO_URI en vez de usar otra base por accidente', async (t) => {
  const api = await startApi(t, { MONGO_URI: '' });
  assert.equal(api.url, undefined);
  assert.equal(api.code, 1, api.output);
});

test('Ejemplos: repetir la carga no duplica ni sobrescribe publicaciones', async (t) => {
  const { connection, uri } = await testDatabase(t);
  const runSeed = () => spawnSync(process.execPath, ['dist/database/seed.js'], {
    cwd: backend,
    env: { ...process.env, MONGO_URI: uri },
    encoding: 'utf8',
    timeout: 10000,
  });

  const first = runSeed();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(await connection.collection('resources').countDocuments(), 3);

  await connection.collection('resources').updateOne(
    { url: 'https://developer.mozilla.org/en-US/' },
    { $set: { title: 'Mi título conservado' } },
  );

  const second = runSeed();
  assert.equal(second.status, 0, second.stderr);
  assert.equal(await connection.collection('resources').countDocuments(), 3);

  const mdn = await connection.collection('resources').findOne({
    url: 'https://developer.mozilla.org/en-US/',
  });
  assert.equal(mdn.title, 'Mi título conservado');
});
