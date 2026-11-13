import 'dotenv/config';
import mongoose from 'mongoose';

import { dbConnection } from './config.js';
import { ResourceModel } from '../models/resource.model.js';

async function seed(): Promise<void> {
  await dbConnection();

  const resources = [
    {
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org/en-US/',
      description: 'HTML, CSS and JavaScript documentation with examples.',
      category: 'Development',
      resourceType: 'Documentation',
      tags: ['Web', 'Tutorials'],
      imageUrl: '/images/mdn.svg',
      author: { name: 'Demo user' },
      createdAt: '2026-10-19',
    },
    {
      title: 'Excalidraw',
      url: 'https://excalidraw.com/',
      description: 'A tool for drawing diagrams and organizing ideas.',
      category: 'Design',
      resourceType: 'Tool',
      tags: ['Open source'],
      imageUrl: '/images/excalidraw.svg',
      author: { name: 'Demo admin' },
      createdAt: '2026-10-18',
    },
    {
      title: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org/',
      description: 'Courses and exercises to practice programming and web development.',
      category: 'Learning',
      resourceType: 'Course',
      tags: ['Tutorials', 'Web'],
      imageUrl: '/images/freecodecamp.svg',
      author: { name: 'Demo user' },
      createdAt: '2026-10-17',
    },
  ];

  // Solo inserta ejemplos ausentes; conserva documentos que ya existen.
  for (const resource of resources) {
    await ResourceModel.updateOne(
      { url: resource.url },
      { $setOnInsert: resource },
      { upsert: true, runValidators: true },
    );
  }

  console.log('Las tres publicaciones de ejemplo están preparadas en MongoDB.');
}

seed().catch((error) => {
  console.error('No se pudieron cargar los ejemplos:', error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
