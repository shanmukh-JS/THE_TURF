const fs = require('fs');
const path = require('path');

const packages = ['types', 'config', 'validation', 'utils'];

packages.forEach(pkg => {
  const dir = path.join(__dirname, 'packages', pkg);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    
    // Create src directory
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    
    // Create index.ts
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), `export {};\n`);
    
    // Create package.json
    const packageJson = {
      name: `@repo/${pkg}`,
      version: "0.0.0",
      private: true,
      main: "src/index.ts",
      types: "src/index.ts",
      scripts: {
        lint: "eslint . --max-warnings 0",
        typecheck: "tsc --noEmit"
      },
      devDependencies: {
        "@repo/eslint-config": "workspace:*",
        "@repo/typescript-config": "workspace:*",
        "@types/node": "^22.15.3",
        "eslint": "^9.39.1",
        "typescript": "5.9.2"
      }
    };
    
    if (pkg === 'validation' || pkg === 'config') {
        packageJson.dependencies = {
            "zod": "^3.25.67"
        };
    }
    
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create tsconfig.json
    const tsconfig = {
      extends: "@repo/typescript-config/base.json",
      compilerOptions: {
        outDir: "dist"
      },
      include: ["src"],
      exclude: ["node_modules", "dist"]
    };
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  }
});

console.log('Packages scaffolded successfully!');
