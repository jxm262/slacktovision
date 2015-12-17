'use strict';

const Hapi = require('hapi');
const Vision = require('vision');
const HapiReactViews = require('hapi-react-views');
const config = require('../config');
const google = require('googleapis');
const frontendRoutes = require('./frontend/routes');
const backendRoutes = require('./backend/routes');
const OAuth2Client = google.auth.OAuth2;
const oauth2Client = new OAuth2Client(config.google.CLIENT_ID, config.google.CLIENT_SECRET, config.google.REDIRECT_URL);
const server = new Hapi.Server();
const _ = require('lodash');
const jwt = require('hapi-auth-jwt2');
const validateJwt = require('./backend/jwt/validate');

require('babel-core/register')({
    presets: ['react', 'es2015']
});

const frontend = server.connection({
    host: config.server.hostname,
    port: config.server.port,
    labels: 'frontend'
});

const backend = server.connection({
    host: config.server.hostname,
    port: config.server.port + 1,
    labels: 'backend'
});

frontend.register([require('hapi-auth-cookie'), require('vision')], function (err) {
    if (err) {
        throw err;
    }

    // Set our strategy
    frontend.auth.strategy('session', 'cookie', {
        password: 'worldofwalmart', // cookie secret
        cookie: 'session', // Cookie name
        isSecure: false, // required for non-https applications
        ttl: 24 * 60 * 60 * 1000 // Set session to 1 day
    });

    frontend.views({
        engines: {
            jsx: HapiReactViews
        },
        relativeTo: __dirname,
        path: 'views',
        compileOptions: {
            doctype: '<!DOCTYPE html>',
            renderMethod: 'renderToString'
        }
    });
});


backend.register(jwt, function (err) {
    if (err) {
        throw err;
    }

    // Set our strategy
    backend.auth.strategy('jwt', 'jwt', {
        key: config.jwt.key,
        validateFunc: validateJwt,
        verifyOptions: {algorithms: ['HS256']}
    });

});


frontend.route(frontendRoutes);
backend.route(backendRoutes);


// Print some information about the incoming request for debugging purposes
frontend.ext('onRequest', function (request, reply) {
    console.log(request.path, request.query);
    return reply.continue();
});


// Start the server
server.start(function () {
    _.forEach(server.connections, connection => console.log("The server has started on port: " + connection.info.port));
});
