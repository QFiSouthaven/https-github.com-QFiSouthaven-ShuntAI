
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.route';

const app = express();
const port = process.env.PORT || 3001;

// Allow requests from a typical frontend development server
// FIX: Swapped cors and express.json middleware. Cors should be applied first.
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Anthropic Prompt Caching Backend is running!');
});

app.use('/api/chat', chatRoutes);

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
