import fs from 'fs'

try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  console.log("env.local contents:")
  console.log(envContent.split('\n').filter(line => !line.includes('KEY') && !line.includes('PASSWORD')).join('\n'))
} catch (e) {
  console.log("No .env.local")
}
try {
  const envContent = fs.readFileSync('.env', 'utf8')
  console.log("env contents:")
  console.log(envContent.split('\n').filter(line => !line.includes('KEY') && !line.includes('PASSWORD')).join('\n'))
} catch (e) {
  console.log("No .env")
}
