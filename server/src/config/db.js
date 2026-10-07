import mongoose from 'mongoose';
export async function connectDB(){
    await mongoose.connect(process.env.Mongo_URI);
    console.log('MongoDB connected');
}