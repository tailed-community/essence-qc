// Script to run bubblewrap init non-interactively using expect-like approach
const { spawn } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname);
const child = spawn('bubblewrap', [
  'init',
  '--manifest=https://essence-qc-19129.web.app/manifest.webmanifest'
], {
  cwd,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
});

let buffer = '';
let answered = new Set();

const ANSWERS = [
  // Q1: Install JDK? - Already installed, say No
  { pattern: /install the JDK/i, answer: 'No\n' },
  // Q1b: Install Android SDK?
  { pattern: /install the Android SDK/i, answer: 'No\n' },
  // Q1c: Android SDK terms
  { pattern: /agree to the Android SDK/i, answer: 'Yes\n' },
  // Q2: Host
  { pattern: /Domain being opened/i, answer: '\n' },  // accept default
  // Q3: Start URL
  { pattern: /LaunchUrl/i, answer: '\n' },
  // Q4: App name
  { pattern: /Application name/i, answer: '\n' },
  // Q5: Short name / launcher name
  { pattern: /Short name/i, answer: '\n' },
  // Q6: Package ID
  { pattern: /Application ID/i, answer: 'com.tailedcommunity.essenceqc\n' },
  // Q7: Version code
  { pattern: /Version code/i, answer: '1\n' },
  // Q8: Display mode
  { pattern: /Display mode/i, answer: '\n' },
  // Q9: Orientation
  { pattern: /Orientation/i, answer: '\n' },
  // Q10: Status bar color / theme color
  { pattern: /Status bar color/i, answer: '\n' },
  // Q11: Background color / splash
  { pattern: /Splash screen color/i, answer: '\n' },
  // Q12: Icon URL
  { pattern: /Icon URL/i, answer: '\n' },
  // Q13: Maskable icon
  { pattern: /Maskable icon/i, answer: '\n' },
  // Q14: Shortcuts
  { pattern: /include.*shortcuts/i, answer: 'Yes\n' },
  // Q15: Notification delegation
  { pattern: /notification/i, answer: 'No\n' },
  // Q16: Signing key
  { pattern: /signing key/i, answer: '\n' },
  // Q17: Key alias
  { pattern: /alias/i, answer: '\n' },
  // Q18: Key passwords
  { pattern: /password/i, answer: '\n' },
  // Q19: Family policy
  { pattern: /family\s*policy/i, answer: '\n' },
  // Q20: ChromeOS only
  { pattern: /chrome\s*os/i, answer: '\n' },
  // Generic: Accept any yes/no with default
  { pattern: /\? .+\(Y\/n\)/i, answer: 'Yes\n' },
  { pattern: /\? .+\(y\/N\)/i, answer: 'No\n' },
];

function tryAnswer(text) {
  for (const { pattern, answer } of ANSWERS) {
    const key = pattern.toString();
    if (!answered.has(key) && pattern.test(text)) {
      console.log(`[AUTO] Matched: ${pattern} -> sending: ${JSON.stringify(answer.trim())}`);
      child.stdin.write(answer);
      answered.add(key);
      buffer = ''; // Reset buffer after answering
      return true;
    }
  }
  return false;
}

child.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  buffer += str;
  
  // Try to answer after each chunk, with slight delay for prompt rendering
  setTimeout(() => tryAnswer(buffer), 100);
});

child.stderr.on('data', (data) => {
  const str = data.toString();
  process.stderr.write(str);
  buffer += str;
  setTimeout(() => tryAnswer(buffer), 100);
});

child.on('close', (code) => {
  console.log(`\n[DONE] Bubblewrap exited with code: ${code}`);
  process.exit(code);
});

// Timeout after 10 minutes
setTimeout(() => {
  console.log('\n[TIMEOUT] Killing bubblewrap after 10 minutes');
  child.kill();
  process.exit(1);
}, 10 * 60 * 1000);
