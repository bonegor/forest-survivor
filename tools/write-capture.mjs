import { randomUUID } from 'node:crypto';
import { lstat, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

// Both hero review servers accept slash-separated capture names from the browser.
export async function writeCapture(root, name, data) {
  if (typeof name !== 'string' || isAbsolute(name) || name.includes('..') ||
      !name.split('/').every(part => /^[a-z0-9_-][a-z0-9_.-]*$/i.test(part) && !part.endsWith('.'))) {
    throw new Error('Invalid capture name');
  }
  const target = resolve(root, name);
  const child = relative(root, target);
  if (!child || isAbsolute(child) || child === '..' || child.startsWith('..' + sep)) {
    throw new Error('Invalid capture destination');
  }
  const bytes = data.startsWith('data:') ? Buffer.from(data.split(',')[1], 'base64') : data;

  // Check each existing directory before descending through it. lstat also
  // identifies Windows junctions as links.
  await mkdir(root, { recursive: true });
  if (!(await lstat(root)).isDirectory()) throw new Error('Invalid capture directory');
  let parent = root;
  for (const part of child.split(sep).slice(0, -1)) {
    parent = join(parent, part);
    try {
      await mkdir(parent);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (!(await lstat(parent)).isDirectory()) throw new Error('Invalid capture directory');
    }
  }

  // Replace the directory entry atomically. Even a pre-existing linked file
  // cannot redirect a write, and readers only see complete captures.
  const temporary = join(dirname(target), '.' + randomUUID() + '.tmp');
  try {
    await writeFile(temporary, bytes, { flag: 'wx' });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}
