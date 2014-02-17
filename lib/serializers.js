var serializers = {};
serializers.req = function req(request) {
  if(!request || !request.connection) return request;
  return {
    method: request.method,
    url: request.url,
    headers: request.headers,
    remoteAddress: request.connection.remoteAddress,
    remotePort: request.connection.remotePort
  };
}
serializers.res = function res(response) {
  if(!response || !response.statusCode) return response;
  return {
    statusCode: response.statusCode,
    header: response._header
  };
}

module.exports = serializers;
