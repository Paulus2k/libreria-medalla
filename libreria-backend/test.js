const b = require('bcryptjs')
b.compare('admin123', '$2b$10$lADfqb6REEDQXhV0Qqrmi0rafxp6WVRZoa8hOqHg95aD7sKmHS5HK')
  .then(r => console.log('Match:', r))