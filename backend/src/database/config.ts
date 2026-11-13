import mongoose from 'mongoose';

export const dbConnection = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('Configura MONGO_URI en backend/.env');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
};
