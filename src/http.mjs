import { createServer } from 'node:http';

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(data)});
  res.end(data);
}

export function createNexusHttpServer({ system, host='127.0.0.1', port=0 } = {}) {
  if (!system) throw new TypeError('system required');
  const server = createServer((req,res) => {
    if (req.method !== 'GET') return json(res,405,{error:'METHOD_NOT_ALLOWED'});
    const path = new URL(req.url ?? '/', 'http://nexus.local').pathname;
    if (path === '/health') return json(res,200,{status:'ok'});
    if (path === '/status') {
      return json(res,200,{
        schema:'nexus.status.v1',
        boot:system.boot,
        resources:system.resources.list().length,
        relationships:system.relationships.list().length,
        events:system.events.list().length,
        extensions:system.extensions.list().length
      });
    }
    if (path === '/resources') return json(res,200,{resources:system.resources.list()});
    if (path === '/relationships') return json(res,200,{relationships:system.relationships.list()});
    return json(res,404,{error:'NOT_FOUND'});
  });
  return Object.freeze({
    server,
    listen() { return new Promise((resolve,reject) => {
      server.once('error',reject);
      server.listen(port,host,() => { server.off('error',reject); resolve(server.address()); });
    }); },
    close() { return new Promise((resolve,reject) => server.close(error => error ? reject(error) : resolve())); }
  });
}
