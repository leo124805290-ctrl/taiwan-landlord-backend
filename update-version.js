const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.version = '1.0.1';
packageJson.deployTrigger = new Date().toISOString();
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ 更新 package.json 版本號為 1.0.1');
