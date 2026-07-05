const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'apps/api/src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('import express, { Router }')) {
    content = content.replace("import { Router } from 'express';", "import express, { Router } from 'express';");
  }
  
  content = content.replace("const router = Router();", "const router: express.Router = Router();");
  
  fs.writeFileSync(filePath, content);
}
console.log('Fixed router types.');
