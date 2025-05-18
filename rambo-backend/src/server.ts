import express from 'express';
import { MockDatabaseService } from './modules/database/mock-database.service';

const app = express();
app.use(express.json());
const db = new MockDatabaseService();

// Users API
app.get('/users', async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
});

app.post('/users', async (req, res) => {
  const user = await db.createUser(req.body);
  res.status(201).json(user);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
