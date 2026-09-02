const net = require('net');
const tls = require('tls');

const host = 'ac-vlqcaok-shard-00-00.f8diqn6.mongodb.net';
const port = 27017;

console.log(`Testing TCP connection to ${host}:${port}...`);
const socket = net.createConnection(port, host, () => {
  console.log(`TCP connection successful to ${host}:${port}! Testing TLS...`);
  const tlsSocket = tls.connect({
    socket: socket,
    servername: host,
    rejectUnauthorized: false
  }, () => {
    console.log(`TLS connection successful to ${host}:${port}!`);
    tlsSocket.end();
  });

  tlsSocket.on('error', (err) => {
    console.error('TLS Handshake error:', err.message);
  });
});

socket.on('error', (err) => {
  console.error('TCP Connection error:', err.message);
});
