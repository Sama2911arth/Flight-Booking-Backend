const http = require('http');

// Define the API endpoint
const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/flights/search?from=DEL&to=BOM&date=2025-05-29',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('Testing API endpoint:', `http://${options.hostname}:${options.port}${options.path}`);

// Make the request
const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let data = '';

    // A chunk of data has been received
    res.on('data', (chunk) => {
        data += chunk;
    });

    // The whole response has been received
    res.on('end', () => {
        console.log('RESPONSE BODY:');
        try {
            const parsedData = JSON.parse(data);
            console.log(JSON.stringify(parsedData, null, 2));
        } catch (e) {
            console.log('Raw response:', data);
            console.error('Error parsing JSON:', e.message);
        }
    });
});

// Handle errors
req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

// End the request
req.end(); 