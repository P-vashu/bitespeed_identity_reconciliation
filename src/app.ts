import express from 'express';
import identifyRoute from './routes/Route';

const app = express();

app.use(express.json());
app.use('/identify', identifyRoute);

app.get("/", (req, res) => {
  res.send("Bitespeed Identity Reconciliation API is running ✅");
});

export default app;
