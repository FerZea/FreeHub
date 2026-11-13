import { Schema, model } from 'mongoose';

const resourceSchema = new Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  resourceType: { type: String, required: true },
  tags: [String],
  imageUrl: { type: String, default: '' },
  author: {
    name: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

export const ResourceModel = model('Resource', resourceSchema, 'resources');
