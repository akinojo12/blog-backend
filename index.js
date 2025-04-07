const express = require ('express');
const dotenv = require ('dotenv')
const connectDB = require ('./config/db')
const cors = require('cors')

dotenv.config();

connectDB();

const authRoutes = require ('./routes/authRoutes');
const userRoutes = require ('./routes/userRoutes');
const postRoutes = require ('./routes/postRoutes');
const commentRoutes = require ('./routes/commentRoutes');

const app = express()

app.use(express.json());

app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));