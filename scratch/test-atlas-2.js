const tls = require('tls');

const hosts = [
  'ac-vlqcaok-shard-00-00.f8diqn6.mongodb.net',
  'ac-vlqcaok-shard-00-01.f8diqn6.mongodb.net',
  'ac-vlqcaok-shard-00-02.f8diqn6.mongodb.net',
  'kvj-analytics.f8diqn6.mongodb.net'
];

for (const host of hosts) {
  console.log(`Testing TLS to ${host}...`);
  const socket = tls.connect(27017, host, { servername: host }, () => {
    console.log(`SUCCESS: Connected to ${host}`);
    socket.end();
  });
  socket.on('error', (err) => {
    console.error(`FAILED ${host}:`, err.message);
  });
}
