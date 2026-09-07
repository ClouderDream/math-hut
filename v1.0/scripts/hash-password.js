/**
 * 生成后台管理口令的哈希
 * 用法：npm run hash-password 你的口令
 * 然后把输出的 passHash / passSalt 两行复制进 site.config.js
 */
const crypto = require('crypto');

const pw = process.argv[2];
if (!pw) {
  console.error('\n用法：npm run hash-password 你的口令\n');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.createHash('sha256').update(salt + pw).digest('hex');

console.log('\n把下面两行填进 site.config.js 的 admin 配置里：\n');
console.log(`    passHash: '${hash}',`);
console.log(`    passSalt: '${salt}',`);
console.log('\n⚠️ 提醒：这个哈希写在公开的 JS 里，只能防止误操作，不是安全措施。');
console.log('   真正的安全边界是你登录后台时填的 GitHub Token。\n');
