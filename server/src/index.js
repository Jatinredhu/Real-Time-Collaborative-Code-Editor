import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import {Server} from 'socket.io';
import {connectDB} from './config/db.js';
import authRoutes from './routes/auth.js';

const app = express();
app.use(cors({origin: process.env.CLIENT_URL}));
app.use(express.json());
app.use('/api/auth',authRoutes);

app.get('/api/health',(req,res) => {
    res.json({ok:true});
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {origin:process.env.CLIENT_URL},
});

io.on('connection',(socket)=>{
    console.log('socket connected:', socket.id);
});

await connectDB();
server.listen(process.env.PORT,()=>{
    console.log(`Server running on port ${process.env.PORT}`);
});