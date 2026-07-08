const fs = require('fs');
const path = require('path');

function replaceInDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      replaceInDirectory(fullPath);
    } else if (fullPath.match(/\.(tsx|ts|css|html|md|json)$/)) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      const original = content;
      
      content = content.replace(/TRUF GAMING/g, 'TURF GAMING');
      content = content.replace(/TRUF Gaming/g, 'TURF Gaming');
      content = content.replace(/Truf Gaming/g, 'Turf Gaming');
      content = content.replace(/TRUF/g, 'TURF');
      content = content.replace(/Truf/g, 'Turf');
      content = content.replace(/truf/g, 'turf');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log('Updated:', fullPath);
      }
    }
  });
}

replaceInDirectory(path.join(__dirname, 'apps', 'web'));
console.log('Done replacing.');
