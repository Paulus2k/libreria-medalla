const b = require('bcryptjs')
const fs = require('fs')
b.hash('admin123', 10).then(h => {
  fs.writeFileSync('hash.txt', h)
  console.log('Longitud:', h.length)
})