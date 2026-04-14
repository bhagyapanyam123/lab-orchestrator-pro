const express = require('express');
const provision = require('./routes/provision');
const app = express();

app.use(express.json());
app.use('/api/provision', provision);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Orchestrator running on port ${PORT}`));