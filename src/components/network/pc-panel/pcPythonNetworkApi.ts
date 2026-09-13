export function createPythonNetworkApi(): Record<string, unknown> {
  return {
    socket: {
      AF_INET: 2,
      SOCK_STREAM: 1,
      SOCK_DGRAM: 2,
      socket: (family?: unknown, type?: unknown) => {
        let connected = false;
        let peerHost = '';
        let peerPort = 0;
        const buffer: string[] = [];
        return {
          family: Number(family || 2),
          type: Number(type || 1),
          connect: (address: unknown) => {
            connected = true;
            if (Array.isArray(address)) {
              peerHost = String(address[0] || '127.0.0.1');
              peerPort = Number(address[1] || 80);
            }
            buffer.push(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nConnected to ${peerHost}:${peerPort}`);
          },
          bind: () => null,
          listen: () => null,
          accept: () => [
            {
              recv: () => 'GET / HTTP/1.1\r\n\r\n',
              send: (d: unknown) => String(d || '').length,
              close: () => null,
            },
            ['192.168.1.100', 49152],
          ],
          send: (data: unknown) => String(data || '').length,
          sendall: (data: unknown) => String(data || '').length,
          recv: (bufsize?: unknown) => {
            const size = Number(bufsize || 1024);
            if (buffer.length > 0) {
              return (buffer.shift() || '').slice(0, size);
            }
            return connected ? 'ACK' : '';
          },
          close: () => {
            connected = false;
          },
          settimeout: () => null,
        };
      },
      gethostbyname: (hostname: unknown) => {
        const name = String(hostname || '');
        if (name === 'localhost') return '127.0.0.1';
        return '192.168.1.1';
      },
    },
    requests: {
      get: (urlVal: unknown) => {
        const url = String(urlVal || '');
        return {
          status_code: 200,
          text: `<html><body>Mock response from ${url}</body></html>`,
          json: () => ({ status: 'ok', url, message: 'Mock response' }),
          ok: true,
          headers: { 'content-type': 'application/json' },
        };
      },
      post: (urlVal: unknown, data?: unknown) => {
        const url = String(urlVal || '');
        return {
          status_code: 201,
          text: `{"created": true, "url": "${url}"}`,
          json: () => ({ created: true, url, data }),
          ok: true,
          headers: { 'content-type': 'application/json' },
        };
      },
    },
    urllib: {
      request: {
        urlopen: (urlVal: unknown) => {
          const url = String(urlVal || '');
          return {
            read: () => `Mock data from ${url}`,
            getcode: () => 200,
            close: () => null,
          };
        },
      },
    },
  };
}
