require('dotenv').config();
console.log('DB_USER =', process.env.DB_USER);
console.log('DB_PASSWORD =', process.env.DB_PASSWORD);
console.log('DB_NAME =', process.env.DB_NAME);
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));